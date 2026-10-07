import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { notifyUser } from '@/app/api/notifications/stream/route';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const session = token ? await verifyToken(token) : null;

    let whereClause: any = {};
    if (session?.role === 'STUDENT') {
      const studentWithCourses = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { enrolledIn: { select: { teacherId: true } } }
      });
      const teacherIds = studentWithCourses?.enrolledIn.map(c => c.teacherId) || [];
      whereClause = {
        OR: [
          { authorId: { in: teacherIds } },
          { author: { role: 'ADMIN' } }
        ]
      };
    }

    const posts = await prisma.post.findMany({
      where: whereClause,
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { name: true, avatarUrl: true, role: true }
        },
        _count: {
          select: { comments: true, likes: true }
        },
        ...(session?.userId && {
          likes: {
            where: { userId: session.userId },
            select: { id: true }
          }
        })
      }
    });

    const formattedPosts = posts.map(post => ({
      ...post,
      isLiked: post.likes ? post.likes.length > 0 : false,
      likes: undefined
    }));

    return NextResponse.json(formattedPosts);
  } catch (error) {
    console.error("[GET /api/posts]", error);
    const message = error instanceof Error ? error.message : 'Failed to fetch posts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const session = await verifyToken(token);
    if (!session || (session.role !== 'TEACHER' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (session.role === 'TEACHER' && session.teacherStatus !== 'APPROVED') {
      return NextResponse.json({ error: 'Your teacher account is not yet approved.' }, { status: 403 });
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

    let targetStudentIds: string[] = [];
    if (session.role === 'TEACHER') {
      const courses = await prisma.course.findMany({
        where: { teacherId: session.userId },
        select: { students: { select: { id: true, isBanned: true } } }
      });
      const studentIdsSet = new Set<string>();
      for (const course of courses) {
        for (const student of course.students) {
          if (!student.isBanned) {
            studentIdsSet.add(student.id);
          }
        }
      }
      targetStudentIds = Array.from(studentIdsSet);
    } else if (session.role === 'ADMIN') {
      const students = await prisma.user.findMany({
        where: { role: 'STUDENT', isBanned: false },
        select: { id: true },
      });
      targetStudentIds = students.map(s => s.id);
    }

    const title = 'New Announcement';
    const message = `${newPost.author.name} posted a new announcement.`;

    if (targetStudentIds.length > 0) {
      await prisma.notification.createMany({
        data: targetStudentIds.map(studentId => ({
          userId: studentId,
          type: 'NEW_POST' as const,
          title,
          message,
          link: '/dashboard/student/feed',
        })),
      });

      const payload = {
        type: 'NEW_POST' as const,
        title,
        message,
        createdAt: newPost.createdAt.toISOString(),
        postId: newPost.id,
      };

      for (const studentId of targetStudentIds) {
        try {
          notifyUser(studentId, payload);
        } catch {
          // Stale controller
        }
      }
    }

    return NextResponse.json(
      { post: newPost, notifiedCount: targetStudentIds.length },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
