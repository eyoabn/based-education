import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: courseId } = await params;

    // Verify access
    if (session.role === 'STUDENT') {
      const isEnrolled = await prisma.course.findFirst({
        where: { id: courseId, students: { some: { id: session.userId } } },
      });
      if (!isEnrolled) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    } else if (session.role === 'TEACHER') {
      const isTeacher = await prisma.course.findFirst({
        where: { id: courseId, teacherId: session.userId },
      });
      if (!isTeacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const materials = await prisma.courseMaterial.findMany({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ materials });
  } catch (error) {
    console.error("[GET /api/courses/[id]/materials]", error);
    return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session || (session.role !== 'TEACHER' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: courseId } = await params;
    const body = await request.json();
    const { title, description, fileUrl, fileType } = body;

    if (!title || !fileUrl) {
      return NextResponse.json({ error: 'Title and File URL are required' }, { status: 400 });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course || (course.teacherId !== session.userId && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const material = await prisma.courseMaterial.create({
      data: {
        courseId,
        title,
        description,
        fileUrl,
        fileType: fileType || 'link',
      },
    });

    return NextResponse.json({ material }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/courses/[id]/materials]", error);
    return NextResponse.json({ error: 'Failed to create material' }, { status: 500 });
  }
}
