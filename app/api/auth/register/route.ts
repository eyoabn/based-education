import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { attachSessionCookie, signToken } from '@/lib/auth'
import { hashPassword } from '@/lib/password'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const name = String(body.name ?? '').trim()
    const email = String(body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')
    const specialty = String(body.specialty ?? '').trim()
    const role = body.role === 'TEACHER' ? 'TEACHER' : 'STUDENT'

    if (name.length < 2 || name.length > 100) {
      return NextResponse.json(
        { error: 'Enter a name between 2 and 100 characters.' },
        { status: 400 }
      )
    }

    if (!email || !email.includes('@') || email.length > 254) {
      return NextResponse.json(
        { error: 'Enter a valid email address.' },
        { status: 400 }
      )
    }

    if (password.length < 8 || password.length > 128) {
      return NextResponse.json(
        { error: 'Password must be between 8 and 128 characters.' },
        { status: 400 }
      )
    }

    if (role === 'TEACHER' && specialty.length < 2) {
      return NextResponse.json(
        { error: 'Teaching specialty is required for teacher accounts.' },
        { status: 400 }
      )
    }

    const settings = await prisma.platformSetting.findUnique({
      where: { id: 'platform' },
      select: { registrationOpen: true },
    })

    if (settings && !settings.registrationOpen) {
      return NextResponse.json(
        { error: 'Registration is currently closed.' },
        { status: 403 }
      )
    }

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'An account with that email already exists.' },
        { status: 409 }
      )
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await hashPassword(password),
        role,
        teacherStatus: role === 'TEACHER' ? 'PENDING' : null,
        specialty: role === 'TEACHER' ? specialty : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        teacherStatus: true,
        sessionEpoch: true,
      },
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
      role === 'TEACHER' ? '/pending-approval' : '/dashboard/student'
    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          teacherStatus: user.teacherStatus,
        },
        redirect,
      },
      { status: 201 }
    )

    return attachSessionCookie(response, token)
  } catch (error) {
    console.error('[auth:register]', error)
    return NextResponse.json(
      { error: 'Unable to create the account right now.' },
      { status: 500 }
    )
  }
}
