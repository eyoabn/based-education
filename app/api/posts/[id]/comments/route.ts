import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const comments = await prisma.comment.findMany({
      where: { postId: params.id },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: { name: true, avatarUrl: true, role: true }
        }
      }
    });
    return NextResponse.json(comments);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const session = await verifyToken(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { content } = await request.json();
    if (!content) return NextResponse.json({ error: 'Content required' }, { status: 400 });

    const newComment = await prisma.comment.create({
      data: {
        content,
        postId: params.id,
        authorId: session.userId,
      },
      include: {
        author: {
          select: { name: true, avatarUrl: true, role: true }
        }
      }
    });

    // Notify the post author
    const post = await prisma.post.findUnique({ where: { id: params.id }, select: { authorId: true } });
    if (post && post.authorId !== session.userId) {
      await prisma.notification.create({
        data: {
          userId: post.authorId,
          type: 'NEW_POST',
          title: 'New Comment',
          message: `${newComment.author.name} commented on your post.`
        }
      });
    }

    return NextResponse.json(newComment, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }
}
