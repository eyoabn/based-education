import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { notifyUser } from '@/app/api/notifications/stream/route';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { conversationId } = await params;

    // Check that user is a participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: session.userId,
        },
      },
    });

    if (!participant) {
      return NextResponse.json({ error: 'Forbidden: Not a participant' }, { status: 403 });
    }

    // Mark as read
    await prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: { lastReadAt: new Date() },
    });

    // Fetch conversation details and messages
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        course: { select: { id: true, title: true, code: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
          },
        },
      },
    });

    const messages = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 200,
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true, role: true },
        },
      },
    });

    const formattedMessages = messages.map(m => ({
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      senderName: m.sender.name,
      senderAvatar: m.sender.avatarUrl,
      senderRole: m.sender.role,
      content: m.content,
      isMe: m.senderId === session.userId,
      createdAt: m.createdAt.toISOString(),
    }));

    return NextResponse.json({
      conversation: {
        id: conversation?.id,
        isDirect: conversation?.isDirect,
        course: conversation?.course,
        participants: conversation?.participants.map(p => p.user),
      },
      messages: formattedMessages,
    });
  } catch (error) {
    console.error('[GET /api/messages/[conversationId]]', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { conversationId } = await params;
    const body = await request.json().catch(() => ({}));
    const { content } = body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // Verify participation
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: session.userId,
        },
      },
    });

    if (!participant) {
      return NextResponse.json({ error: 'Forbidden: You are not in this conversation' }, { status: 403 });
    }

    const now = new Date();

    // Create message and update conversation
    const [message] = await prisma.$transaction([
      prisma.chatMessage.create({
        data: {
          conversationId,
          senderId: session.userId,
          content: content.trim(),
        },
        include: {
          sender: {
            select: { id: true, name: true, avatarUrl: true, role: true },
          },
        },
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: now },
      }),
      prisma.conversationParticipant.update({
        where: { id: participant.id },
        data: { lastReadAt: now },
      }),
    ]);

    // Notify other participants
    const otherParticipants = await prisma.conversationParticipant.findMany({
      where: {
        conversationId,
        userId: { not: session.userId },
      },
      select: { userId: true },
    });

    for (const other of otherParticipants) {
      notifyUser(other.userId, {
        type: 'CHAT_MESSAGE',
        conversationId,
        senderName: session.name,
        content: content.trim().slice(0, 100),
        createdAt: now.toISOString(),
      });
    }

    return NextResponse.json({
      message: {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        senderName: message.sender.name,
        senderAvatar: message.sender.avatarUrl,
        senderRole: message.sender.role,
        content: message.content,
        isMe: true,
        createdAt: message.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/messages/[conversationId]]', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
