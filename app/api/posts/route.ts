import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

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

    // Mock sending notification to all students
    // In a real app, this would queue a job or fetch targeted students
    const students = await prisma.user.findMany({ where: { role: 'STUDENT' } });
    const notifications = students.map(student => ({
      userId: student.id,
      type: 'NEW_POST' as const,
      title: 'New Announcement',
      message: `${newPost.author.name} posted a new announcement.`
    }));
    
    if (notifications.length > 0) {
      await prisma.notification.createMany({ data: notifications });
    }

    return NextResponse.json(newPost, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
