import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { attachSessionCookie, signToken } from '@/lib/auth'
import { verifyPassword } from '@/lib/password'

function publicUser(user: {
  id: string
  name: string
  email: string
  role: string
  teacherStatus: string | null
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    teacherStatus: user.teacherStatus,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = String(body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        role: true,
        teacherStatus: true,
        rejectionReason: true,
        isBanned: true,
        banReason: true,
        sessionEpoch: true,
      },
    })

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      )
    }

    if (user.isBanned) {
      return NextResponse.json(
        {
          error: user.banReason
            ? `Your account has been suspended: ${user.banReason}`
            : 'Your account has been suspended.',
        },
        { status: 403 }
      )
    }

    if (user.role === 'TEACHER' && user.teacherStatus === 'REJECTED') {
      return NextResponse.json(
        {
          error: user.rejectionReason
            ? `Your teacher application was rejected: ${user.rejectionReason}`
            : 'Your teacher application was rejected.',
        },
        { status: 403 }
      )
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    const token = await signToken({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      teacherStatus: user.teacherStatus ?? undefined,
      epoch: user.sessionEpoch,
    })

    const redirect =
      user.role === 'ADMIN'
        ? '/dashboard/admin'
        : user.role === 'TEACHER'
          ? user.teacherStatus === 'PENDING'
            ? '/pending-approval'
            : '/dashboard/teacher'
          : '/dashboard/student'

    const response = NextResponse.json({
      user: publicUser(user),
      redirect,
    })
    return attachSessionCookie(response, token)
  } catch (error) {
    console.error('[auth:login]', error)
    return NextResponse.json(
      { error: 'Unable to sign in right now.' },
      { status: 500 }
    )
  }
}
