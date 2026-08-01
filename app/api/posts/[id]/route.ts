import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const session = await verifyToken(token);
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const post = await prisma.post.findUnique({ where: { id: params.id } });
    if (!post || post.authorId !== session.userId) {
      return NextResponse.json({ error: 'Not Found or Forbidden' }, { status: 404 });
    }

    const { content, mediaUrls } = await request.json();
    
    const updatedPost = await prisma.post.update({
      where: { id: params.id },
      data: {
        content,
        mediaUrls: mediaUrls || []
      }
    });

    return NextResponse.json(updatedPost);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const session = await verifyToken(token);
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const post = await prisma.post.findUnique({ where: { id: params.id } });
    if (!post || post.authorId !== session.userId) {
      return NextResponse.json({ error: 'Not Found or Forbidden' }, { status: 404 });
    }

    await prisma.post.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}
