import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { getRoomMediaState } from '@/lib/liveMediaState';
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const session = await verifyToken(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const roomParam = searchParams.get('room');

    if (!roomParam) {
      return NextResponse.json({ error: 'Missing room parameter' }, { status: 400 });
    }

    const roomTitle = decodeURIComponent(roomParam);
    const isTeacher = session.role === 'TEACHER' || session.role === 'ADMIN';

    const now = new Date();

    // 1. Look for an existing ACTIVE session for this teacher/course/studio first
    let liveRoom = await prisma.liveRoom.findFirst({
      where: {
        isLive: true,
        endedAt: null,
        ...(isTeacher && session.role !== 'ADMIN' ? { teacherId: session.userId } : {}),
        OR: [
          { id: roomTitle },
          { title: roomTitle },
          { courseId: roomTitle },
          { course: { title: roomTitle } },
          // If accessing default Studio entrypoint, connect to their existing live session
          ...(roomTitle === 'MainStudio' ? [{ title: 'MainStudio' }, { isLive: true }] : []),
        ],
      },
      orderBy: [
        { startedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        course: {
          include: {
            students: { select: { id: true } }
          }
        }
      }
    });

    // 2. If no active room found, look for latest existing room record
    if (!liveRoom) {
      liveRoom = await prisma.liveRoom.findFirst({
        where: {
          OR: [
            { id: roomTitle },
            { title: roomTitle },
            { courseId: roomTitle },
            { course: { title: roomTitle } },
          ],
          ...(isTeacher && session.role !== 'ADMIN' ? { teacherId: session.userId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        include: {
          course: {
            include: {
              students: { select: { id: true } }
            }
          }
        }
      });
    }

    if (isTeacher) {
      const isTodaySession = liveRoom?.startedAt
        ? now.toDateString() === new Date(liveRoom.startedAt).toDateString()
        : false;

      // If the teacher has an active room already (or is reconnecting after a refresh/network drop), reuse it
      if (liveRoom && liveRoom.isLive && liveRoom.endedAt === null) {
        // Active room already exists — teacher safely rejoins same room with their students!
      } else if (
        liveRoom &&
        isTodaySession &&
        (liveRoom.teacherId === session.userId || session.role === 'ADMIN') &&
        (liveRoom.id === roomTitle || roomTitle === liveRoom.title || roomTitle === 'MainStudio')
      ) {
        // Teacher disconnected or refreshed without explicit end: reactivate the existing room instead of splitting into a duplicate
        liveRoom = await prisma.liveRoom.update({
          where: { id: liveRoom.id },
          data: {
            isLive: true,
            endedAt: null,
          },
          include: {
            course: {
              include: {
                students: { select: { id: true } }
              }
            }
          }
        });
      } else {
        // No current active session — create a fresh LiveRoom session
        let course = await prisma.course.findFirst({
          where: {
            teacherId: session.userId,
            OR: [
              { id: roomTitle },
              { title: roomTitle }
            ]
          },
          select: { id: true, title: true }
        });
        if (!course) {
          course = await prisma.course.findFirst({
            where: { teacherId: session.userId },
            select: { id: true, title: true }
          });
        }

        liveRoom = await prisma.liveRoom.create({
          data: {
            title: course?.title || (roomTitle === 'MainStudio' ? 'Main Studio Live' : roomTitle),
            teacherId: session.userId,
            isLive: true,
            scheduledAt: now,
            startedAt: now,
            endedAt: null,
            courseId: liveRoom?.courseId ?? course?.id ?? null,
          },
          include: {
            course: {
              include: {
                students: { select: { id: true } }
              }
            }
          }
        });

        // Notify enrolled students that today's live class has started
        const studentIds = liveRoom.course?.students.map(s => s.id) || [];
        if (studentIds.length > 0) {
          await prisma.notification.createMany({
            data: studentIds.map(studentId => ({
              userId: studentId,
              type: 'LIVE_CLASS_STARTING',
              title: '🔴 Live Class Started!',
              message: `Your instructor has started today's live session for "${liveRoom?.title}". Click to join now!`,
              link: `/dashboard/student/live/${liveRoom?.id}`
            }))
          }).catch(() => {});
        }
      }
    } else {
      // Student verification — check for today's active live session
      if (!liveRoom || !liveRoom.isLive || liveRoom.endedAt !== null) {
        const activeRoom = await prisma.liveRoom.findFirst({
          where: {
            OR: [
              { id: roomTitle },
              { title: roomTitle },
              { courseId: roomTitle },
              { course: { title: roomTitle } },
            ],
            isLive: true,
            endedAt: null,
          },
          orderBy: { startedAt: 'desc' },
          include: {
            course: {
              include: {
                students: { select: { id: true } }
              }
            }
          }
        });
        if (activeRoom) liveRoom = activeRoom;
      }
      if (!liveRoom) {
        return NextResponse.json(
          { error: 'Live session not found. Please wait for your instructor to launch the session.' },
          { status: 404 }
        );
      }

      if (!liveRoom.isLive || liveRoom.endedAt !== null) {
        return NextResponse.json(
          { error: 'This live session is not active. The instructor has not started the stream or it has already ended.' },
          { status: 403 }
        );
      }

      if (liveRoom.courseId && liveRoom.course) {
        const isEnrolled = liveRoom.course.students.some(s => s.id === session.userId);
        if (!isEnrolled) {
          return NextResponse.json(
            { error: 'You must be enrolled in this course to join its live session.' },
            { status: 403 }
          );
        }
      }

      // Check if student was banned from this session by instructor
      const targetRoomId = liveRoom.id;
      const apiKeyCheck = process.env.LIVEKIT_API_KEY;
      const apiSecretCheck = process.env.LIVEKIT_API_SECRET;
      const rawWsUrlCheck = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL;
      if (apiKeyCheck && apiSecretCheck && rawWsUrlCheck) {
        try {
          const apiUrl = rawWsUrlCheck.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');
          const roomService = new RoomServiceClient(apiUrl, apiKeyCheck, apiSecretCheck);
          const rObj = await roomService.listRooms([targetRoomId]).then(res => res[0]).catch(() => null);
          if (rObj?.metadata) {
            const meta = JSON.parse(rObj.metadata);
            if (Array.isArray(meta.banned) && meta.banned.includes(session.userId)) {
              return NextResponse.json(
                { error: 'You have been banned from this live session by the instructor.' },
                { status: 403 }
              );
            }
          }
        } catch (e) {}
      }

      // Record student attendance heartbeat record
      await prisma.attendance.upsert({
        where: {
          roomId_studentId: {
            roomId: liveRoom.id,
            studentId: session.userId,
          }
        },
        update: {
          isActive: true,
          lastPingAt: new Date(),
        },
        create: {
          roomId: liveRoom.id,
          studentId: session.userId,
          joinedAt: new Date(),
          isActive: true,
          lastPingAt: new Date(),
        }
      }).catch(() => {});
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const rawWsUrl = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://placeholder.livekit.cloud";
    const livekitWsUrl = rawWsUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');

    // Fallback Mock Token if env vars are missing locally
    if (!apiKey || !apiSecret) {
      console.warn("LiveKit API Keys not found. Returning a mock token for UI testing.");
      return NextResponse.json({ 
        token: `mock-token-for-${session.userId}-${Date.now()}`,
        isMock: true,
        roomId: liveRoom?.id || roomTitle,
        livekitUrl: livekitWsUrl,
        participantCount: 0
      });
    }

    let participantCount = 0;
    try {
      const apiUrl = rawWsUrl.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');
      const roomService = new RoomServiceClient(apiUrl, apiKey, apiSecret);
      const participants = await roomService.listParticipants(liveRoom?.id || roomTitle);
      participantCount = participants.length;
    } catch (e) {
      // Room might not exist yet, or LiveKit is unreachable
    }
    
    const at = new AccessToken(apiKey, apiSecret, {
      identity: session.userId,
      name: session.name,
      metadata: JSON.stringify({ role: session.role, name: session.name }),
    });

    at.addGrant({
      room: liveRoom?.id || roomTitle,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
      roomAdmin: isTeacher,
      roomCreate: isTeacher,
    });

    const targetRoomId = liveRoom?.id || roomTitle;
    const currentMedia = getRoomMediaState(targetRoomId) || getRoomMediaState(roomTitle) || null;

    return NextResponse.json({ 
      token: await at.toJwt(),
      roomId: targetRoomId,
      livekitUrl: livekitWsUrl,
      participantCount,
      mediaState: currentMedia,
    });
  } catch (error) {
    console.error("[GET /api/live/token]", error);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
