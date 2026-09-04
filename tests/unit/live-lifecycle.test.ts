import { describe, it, expect } from 'vitest'
import { GET as getLiveStatus } from '@/app/api/live/status/route'
import { GET as getLiveToken } from '@/app/api/live/token/route'
import { NextRequest } from 'next/server'
import { signToken } from '@/lib/auth'

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
})
