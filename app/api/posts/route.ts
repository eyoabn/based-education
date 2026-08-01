import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { notifyUser } from '@/app/api/notifications/stream/route';

export async function GET(request: NextRequest) {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { name: true, avatarUrl: true, role: true }
        },
        _count: {
          select: { comments: true }
        }
      }
    });
    return NextResponse.json(posts);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const session = await verifyToken(token);
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { content, mediaUrls } = await request.json();
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const newPost = await prisma.post.create({
      data: {
        content,
        mediaUrls: mediaUrls || [],
        authorId: session.userId,
      },
      include: {
        author: {
          select: { name: true, avatarUrl: true, role: true }
        }
      }
    });

    // Phase 7 — close the loop: persist an alert for every student, then push
    // it down the SSE stream so anyone currently online sees the toast without
    // waiting for their next page load. Persistence comes first, so a student
    // who is offline right now still finds the alert in their drawer later.
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT', isBanned: false },
      select: { id: true },
    });

    const title = 'New Announcement';
    const message = `${newPost.author.name} posted a new announcement.`;

    if (students.length > 0) {
      await prisma.notification.createMany({
        data: students.map(student => ({
          userId: student.id,
          type: 'NEW_POST' as const,
          title,
          message,
        })),
      });

      const payload = {
        type: 'NEW_POST' as const,
        title,
        message,
        createdAt: newPost.createdAt.toISOString(),
        postId: newPost.id,
      };

      // Best-effort: a dropped socket must never fail the write that succeeded.
      for (const student of students) {
        try {
          notifyUser(student.id, payload);
        } catch {
          // Stale controller — the client will reconnect and refetch.
        }
      }
    }

    return NextResponse.json(
      { post: newPost, notifiedCount: students.length },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
