import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session || (session.role !== 'TEACHER' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: courseId } = await params;
    const body = await request.json();
    const { title, description, logoUrl, accessMode } = body;

    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    if (session.role !== 'ADMIN' && course.teacherId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: {
        ...(title && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(logoUrl !== undefined && { logoUrl: logoUrl?.trim() || null }),
        ...(accessMode && { accessMode }),
      }
    });

    return NextResponse.json({ course: updatedCourse });
  } catch (error) {
    console.error("[PATCH /api/courses/[id]]", error);
    return NextResponse.json({ error: 'Failed to update course' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session || (session.role !== 'TEACHER' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: courseId } = await params;
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    if (session.role !== 'ADMIN' && course.teacherId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.course.delete({
      where: { id: courseId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/courses/[id]]", error);
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 });
  }
}
