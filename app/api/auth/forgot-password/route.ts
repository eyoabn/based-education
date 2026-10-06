import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isBanned: true,
      },
    });

    if (!user) {
      // Return a safe success message to prevent user email enumeration
      return NextResponse.json({
        success: true,
        email,
        message: 'If an account exists with this email address, a password reset request has been submitted to the administrator.',
      });
    }

    if (user.isBanned) {
      return NextResponse.json(
        { error: 'This account has been suspended. Please contact platform administration.' },
        { status: 403 }
      );
    }

    // Set a pending password reset request on the user record (valid for 24h for admin review)
    const requestId = randomUUID();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: `REQUESTED_${requestId}`,
        passwordResetExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // Notify all system administrators
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', isBanned: false },
      select: { id: true },
    });

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map(admin => ({
          userId: admin.id,
          type: 'PLATFORM_BROADCAST',
          title: '🔑 Password Reset Request',
          message: `${user.name} (${user.email}) requested a password reset. Review and send the reset link.`,
          link: `/dashboard/admin/users?resetEmail=${encodeURIComponent(user.email)}`,
        })),
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      email: user.email,
      name: user.name,
      message: `Your password reset request has been submitted to the administrator. The link to set your new password will be sent to your email (${user.email}) once approved.`,
    });
  } catch (error) {
    console.error('[POST /api/auth/forgot-password]', error);
    return NextResponse.json(
      { error: 'Failed to submit password reset request. Please try again.' },
      { status: 500 }
    );
  }
}
