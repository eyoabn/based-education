import { describe, it, expect, vi } from 'vitest'
import { POST } from '@/app/api/live/control/route'
import { NextRequest } from 'next/server'
import { signToken } from '@/lib/auth'

describe('Live Control API Unit Tests', () => {
  it('should return 401 Unauthorized if no token cookie is provided', async () => {
    const req = new NextRequest('http://localhost:3000/api/live/control', {
      method: 'POST',
      body: JSON.stringify({ room: 'Math101', action: 'MUTE_ALL' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('should return 403 Forbidden if user is a student', async () => {
    const studentToken = await signToken({
      userId: 'student-1',
      name: 'Student One',
      role: 'STUDENT',
    })

    const req = new NextRequest('http://localhost:3000/api/live/control', {
      method: 'POST',
      headers: {
        cookie: `token=${studentToken}`,
      },
      body: JSON.stringify({ room: 'Math101', action: 'MUTE_ALL' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toContain('Forbidden')
  })

  it('should allow teacher to execute control actions', async () => {
    const teacherToken = await signToken({
      userId: 'teacher-1',
      name: 'Teacher Lead',
      role: 'TEACHER',
    })

    const req = new NextRequest('http://localhost:3000/api/live/control', {
      method: 'POST',
      headers: {
        cookie: `token=${teacherToken}`,
      },
      body: JSON.stringify({ room: 'Math101', action: 'TOGGLE_CHAT', chatDisabled: true }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})
