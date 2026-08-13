import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { AccessToken } from 'livekit-server-sdk';

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

    // Find or sync the LiveRoom in PostgreSQL
    let liveRoom = await prisma.liveRoom.findFirst({
      where: {
        OR: [
          { id: roomTitle },
          { title: roomTitle }
        ]
      },
      include: {
        course: {
          include: {
            students: { select: { id: true } }
          }
        }
      }
    });

    if (isTeacher) {
      if (!liveRoom) {
        // Teacher is starting a new room
        const course = await prisma.course.findFirst({
          where: { teacherId: session.userId },
          select: { id: true }
        });

        liveRoom = await prisma.liveRoom.create({
          data: {
            title: roomTitle,
            teacherId: session.userId,
            isLive: true,
            scheduledAt: new Date(),
            startedAt: new Date(),
            courseId: course?.id ?? null,
          },
          include: {
            course: {
              include: {
                students: { select: { id: true } }
              }
            }
          }
        });
      } else if (!liveRoom.isLive) {
        // Update room status to LIVE
        liveRoom = await prisma.liveRoom.update({
          where: { id: liveRoom.id },
          data: {
            isLive: true,
            startedAt: new Date(),
          },
          include: {
            course: {
              include: {
                students: { select: { id: true } }
              }
            }
          }
        });

        // Notify enrolled students that the class is starting NOW
        const studentIds = liveRoom.course?.students.map(s => s.id) || [];
        if (studentIds.length > 0) {
          await prisma.notification.createMany({
            data: studentIds.map(studentId => ({
              userId: studentId,
              type: 'LIVE_CLASS_STARTING',
              title: '🔴 Live Class Started!',
              message: `Your instructor has started the live session for "${liveRoom?.title}". Click to join now!`,
            }))
          });
        }
      }
    } else if (session.role === 'STUDENT' && liveRoom) {
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

    // Fallback Mock Token if env vars are missing locally
    if (!apiKey || !apiSecret) {
      console.warn("LiveKit API Keys not found. Returning a mock token for UI testing.");
      return NextResponse.json({ 
        token: `mock-token-for-${session.userId}-${Date.now()}`,
        isMock: true,
        roomId: liveRoom?.id || roomTitle
      });
    }
    
    const at = new AccessToken(apiKey, apiSecret, {
      identity: session.userId,
      name: session.name,
    });

    at.addGrant({
      room: liveRoom?.id || roomTitle,
      roomJoin: true,
      canPublish: isTeacher,
      canSubscribe: true,
      roomAdmin: isTeacher,
      roomCreate: isTeacher,
    });

    return NextResponse.json({ 
      token: await at.toJwt(),
      roomId: liveRoom?.id || roomTitle
    });
  } catch (error) {
    console.error("[GET /api/live/token]", error);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
