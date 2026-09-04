import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

/**
 * Phase 8 — Messaging Conversations
 * GET: List all conversations the user is in (direct chats + course discussion channels)
 * POST: Create or retrieve a direct conversation with a target user or for a course
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Find all conversations where current user is a participant
    const memberships = await prisma.conversationParticipant.findMany({
      where: { userId: session.userId },
      include: {
        conversation: {
          include: {
            course: {
              select: { id: true, title: true, code: true, logoUrl: true },
            },
            participants: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, avatarUrl: true, role: true },
                },
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                sender: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { conversation: { updatedAt: 'desc' } },
    });

    // Also auto-enroll student or teacher into course channels for courses they teach or are enrolled in
    const userCourses = await prisma.course.findMany({
      where: session.role === 'TEACHER'
        ? { teacherId: session.userId }
        : { students: { some: { id: session.userId } } },
      select: { id: true, title: true, code: true, logoUrl: true },
    });

    const existingCourseIds = new Set(
      memberships.map(m => m.conversation.courseId).filter(Boolean)
    );

    // Create course conversations if they don't exist yet for enrolled/taught courses
    for (const course of userCourses) {
      if (!existingCourseIds.has(course.id)) {
        let conv = await prisma.conversation.findFirst({
          where: { courseId: course.id, isDirect: false },
        });

        if (!conv) {
          conv = await prisma.conversation.create({
            data: {
              courseId: course.id,
              isDirect: false,
            },
          });
        }

        // Add user as participant
        await prisma.conversationParticipant.upsert({
          where: {
            conversationId_userId: {
              conversationId: conv.id,
              userId: session.userId,
            },
          },
          update: {},
          create: {
            conversationId: conv.id,
            userId: session.userId,
          },
        });
      }
    }

    // Refetch refreshed memberships if needed
    const allMemberships = await prisma.conversationParticipant.findMany({
      where: { userId: session.userId },
      include: {
        conversation: {
          include: {
            course: {
              select: { id: true, title: true, code: true, logoUrl: true },
            },
            participants: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, avatarUrl: true, role: true },
                },
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                sender: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { conversation: { updatedAt: 'desc' } },
    });

    // Compute unread count for each conversation
    const conversations = await Promise.all(
      allMemberships.map(async m => {
        const lastRead = m.lastReadAt;
        const unreadCount = await prisma.chatMessage.count({
          where: {
            conversationId: m.conversationId,
            senderId: { not: session.userId },
            createdAt: { gt: lastRead },
          },
        });

        const lastMsg = m.conversation.messages[0] || null;
        const otherParticipants = m.conversation.participants
          .filter(p => p.userId !== session.userId)
          .map(p => p.user);

        return {
          id: m.conversation.id,
          isDirect: m.conversation.isDirect,
          courseId: m.conversation.courseId,
          course: m.conversation.course,
          title: m.conversation.isDirect
            ? otherParticipants[0]?.name || 'Direct Message'
            : m.conversation.course?.title || 'Class Channel',
          participants: otherParticipants,
          lastMessage: lastMsg
            ? {
                id: lastMsg.id,
                content: lastMsg.content,
                senderName: lastMsg.sender.name,
                senderId: lastMsg.sender.id,
                createdAt: lastMsg.createdAt.toISOString(),
              }
            : null,
          unreadCount,
          updatedAt: m.conversation.updatedAt.toISOString(),
        };
      })
    );

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('[GET /api/messages/conversations]', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const { targetUserId, courseId } = body;

    // 1. Direct message between two users
    if (targetUserId) {
      if (targetUserId === session.userId) {
        return NextResponse.json({ error: 'Cannot start a conversation with yourself' }, { status: 400 });
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, name: true, role: true },
      });

      if (!targetUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Check if a direct conversation already exists between these two users
      const existingConv = await prisma.conversation.findFirst({
        where: {
          isDirect: true,
          AND: [
            { participants: { some: { userId: session.userId } } },
            { participants: { some: { userId: targetUserId } } },
          ],
        },
      });

      if (existingConv) {
        return NextResponse.json({ conversationId: existingConv.id });
      }

      // Create new direct conversation
      const newConv = await prisma.conversation.create({
        data: {
          isDirect: true,
          participants: {
            create: [
              { userId: session.userId },
              { userId: targetUserId },
            ],
          },
        },
      });

      return NextResponse.json({ conversationId: newConv.id }, { status: 201 });
    }

    // 2. Course Channel
    if (courseId) {
      let conv = await prisma.conversation.findFirst({
        where: { courseId, isDirect: false },
      });

      if (!conv) {
        conv = await prisma.conversation.create({
          data: {
            courseId,
            isDirect: false,
          },
        });
      }

      // Ensure caller is participant
      await prisma.conversationParticipant.upsert({
        where: {
          conversationId_userId: {
            conversationId: conv.id,
            userId: session.userId,
          },
        },
        update: {},
        create: {
          conversationId: conv.id,
          userId: session.userId,
        },
      });

      return NextResponse.json({ conversationId: conv.id });
    }

    return NextResponse.json({ error: 'targetUserId or courseId is required' }, { status: 400 });
  } catch (error) {
    console.error('[POST /api/messages/conversations]', error);
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}
