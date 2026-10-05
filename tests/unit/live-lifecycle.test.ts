import { describe, it, expect, vi } from 'vitest'
import { GET as getLiveStatus } from '@/app/api/live/status/route'
import { GET as getLiveToken } from '@/app/api/live/token/route'
import { NextRequest } from 'next/server'
import { signToken } from '@/lib/auth'

vi.mock('@/lib/prisma', () => ({
  default: {
    liveRoom: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    course: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    attendance: {
      upsert: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({}),
    },
    notification: {
      createMany: vi.fn().mockResolvedValue({}),
    },
  },
}))

describe('Live Streaming Lifecycle & Security Unit Tests', () => {
  it('status endpoint should require authentication', async () => {
    const req = new NextRequest('http://localhost:3000/api/live/status?room=RoomABC')
    const res = await getLiveStatus(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('status endpoint should return exists: false for non-existent room', async () => {
    const studentToken = await signToken({
      userId: 'student-999',
      name: 'Test Student',
      role: 'STUDENT',
    })

    const req = new NextRequest('http://localhost:3000/api/live/status?room=NonExistentRoom_99999', {
      headers: {
        cookie: `token=${studentToken}`,
      },
    })

    const res = await getLiveStatus(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.exists).toBe(false)
    expect(json.isLive).toBe(false)
  })

  it('token endpoint should return 400 if room parameter is missing', async () => {
    const studentToken = await signToken({
      userId: 'student-999',
      name: 'Test Student',
      role: 'STUDENT',
    })

    const req = new NextRequest('http://localhost:3000/api/live/token', {
      headers: {
        cookie: `token=${studentToken}`,
      },
    })

    const res = await getLiveToken(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/Missing room/i)
  })

  it('token endpoint should reject students from joining inactive/non-existent live stream', async () => {
    const studentToken = await signToken({
      userId: 'student-nonexistent-id',
      name: 'Eager Student',
      role: 'STUDENT',
    })

    const req = new NextRequest('http://localhost:3000/api/live/token?room=FakeStudio_Inactive', {
      headers: {
        cookie: `token=${studentToken}`,
      },
    })

    const res = await getLiveToken(req)
    // Should be rejected with 403 or 404 because stream is not live
    expect([403, 404]).toContain(res.status)
    const json = await res.json()
    expect(json.error).toMatch(/not currently active|Live session not found|not started/i)
  })

  it('teacher reconnecting to an ongoing active live room reuses the existing room instead of creating a new one', async () => {
    const prisma = (await import('@/lib/prisma')).default
    const teacherToken = await signToken({
      userId: 'teacher-reconnect-123',
      name: 'Teacher Reconnector',
      role: 'TEACHER',
    })

    const existingActiveRoom = {
      id: 'existing-room-uuid-1',
      title: 'MainStudio',
      teacherId: 'teacher-reconnect-123',
      isLive: true,
      startedAt: new Date(),
      endedAt: null,
      courseId: null,
      course: null,
    }

    vi.mocked(prisma.liveRoom.findFirst).mockResolvedValueOnce(existingActiveRoom as any)

    const req = new NextRequest('http://localhost:3000/api/live/token?room=MainStudio', {
      headers: {
        cookie: `token=${teacherToken}`,
      },
    })

    const res = await getLiveToken(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.roomId).toBe('existing-room-uuid-1')
    // Ensure create was NOT called because room was safely reused
    expect(prisma.liveRoom.create).not.toHaveBeenCalled()
  })

  it('teacher returning to their room from today reactivates the same room without splitting students', async () => {
    const prisma = (await import('@/lib/prisma')).default
    const teacherToken = await signToken({
      userId: 'teacher-reconnect-456',
      name: 'Teacher Reconnect 2',
      role: 'TEACHER',
    })

    const brieflyDisconnectedRoom = {
      id: 'room-reactivate-uuid',
      title: 'Advanced AI',
      teacherId: 'teacher-reconnect-456',
      isLive: false,
      startedAt: new Date(),
      endedAt: new Date(),
      courseId: 'course-1',
      course: null,
    }

    // 1st findFirst (active check) returns null, 2nd findFirst (general lookup) returns the room
    vi.mocked(prisma.liveRoom.findFirst)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(brieflyDisconnectedRoom as any)

    vi.mocked(prisma.liveRoom.update).mockResolvedValueOnce({
      ...brieflyDisconnectedRoom,
      isLive: true,
      endedAt: null,
    } as any)

    const req = new NextRequest('http://localhost:3000/api/live/token?room=room-reactivate-uuid', {
      headers: {
        cookie: `token=${teacherToken}`,
      },
    })

    const res = await getLiveToken(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.roomId).toBe('room-reactivate-uuid')
    // Verified that update reactivated it rather than create making a new room
    expect(prisma.liveRoom.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'room-reactivate-uuid' },
        data: expect.objectContaining({ isLive: true, endedAt: null }),
      })
    )
    expect(prisma.liveRoom.create).not.toHaveBeenCalled()
  })
})
