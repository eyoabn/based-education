import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const session = await verifyToken(token);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description } = await request.json();
    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    const bugReport = await prisma.bugReport.create({
      data: {
        title,
        description,
        userId: session.userId,
      }
    });

    return NextResponse.json({ bugReport }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/feedback]", error);
    return NextResponse.json({ error: 'Failed to submit bug report' }, { status: 500 });
  }
}
