import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/password';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ valid: false, error: 'Reset token is required.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { passwordResetToken: token },
      select: { id: true, email: true, passwordResetExpires: true },
    });

    if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      return NextResponse.json(
        { valid: false, error: 'Password reset link is invalid or has expired.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ valid: true, email: user.email });
  } catch (error) {
    return NextResponse.json(
      { valid: false, error: 'Failed to verify reset token.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!token) {
      return NextResponse.json({ error: 'Reset token is required.' }, { status: 400 });
    }

    if (!password || password.length < 8 || password.length > 128) {
      return NextResponse.json(
        { error: 'Password must be between 8 and 128 characters.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { passwordResetToken: token },
      select: {
        id: true,
        email: true,
        passwordResetExpires: true,
        isBanned: true,
      },
    });

    if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      return NextResponse.json(
        { error: 'Password reset link is invalid or has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    if (user.isBanned) {
      return NextResponse.json(
        { error: 'This account has been suspended. Please contact support.' },
        { status: 403 }
      );
    }

    const passwordHash = await hashPassword(password);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        // Invalidate any existing sessions for security
        sessionEpoch: { increment: 1 },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Your password has been successfully reset. You may now sign in.',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to reset password. Please try again.' },
      { status: 500 }
    );
  }
}
