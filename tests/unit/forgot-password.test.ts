import { describe, it, expect, vi } from 'vitest'
import { POST as requestForgotPassword } from '@/app/api/auth/forgot-password/route'
import { GET as verifyResetToken, POST as completeResetPassword } from '@/app/api/auth/reset-password/route'
import { NextRequest } from 'next/server'

const mockUser = {
  id: 'user-reset-1',
  name: 'Alex Reset',
  email: 'alex@example.com',
  passwordResetToken: null as string | null,
  passwordResetExpires: null as Date | null,
}

const mockAdmins = [
  { id: 'admin-1', name: 'Super Admin', email: 'admin@example.com' },
]

vi.mock('@/lib/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(({ where }: { where: { email?: string; passwordResetToken?: string } }) => {
        if (where.email && where.email.toLowerCase() === mockUser.email) {
          return Promise.resolve(mockUser)
        }
        if (where.passwordResetToken && mockUser.passwordResetToken === where.passwordResetToken) {
          return Promise.resolve(mockUser)
        }
        return Promise.resolve(null)
      }),
      findMany: vi.fn().mockImplementation(() => Promise.resolve(mockAdmins)),
      update: vi.fn(({ where, data }: { where: { id: string }; data: any }) => {
        if (where.id === mockUser.id) {
          Object.assign(mockUser, data)
          return Promise.resolve(mockUser)
        }
        return Promise.resolve(null)
      }),
    },
    notification: {
      create: vi.fn().mockResolvedValue({ id: 'notif-1' }),
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  },
}))

describe('Forgot & Reset Password Lifecycle Tests', () => {
  it('forgot password rejects invalid email formats', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'not-an-email' }),
    })
    const res = await requestForgotPassword(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/valid email/i)
  })

  it('forgot password successfully creates pending reset request and notifies admins', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'alex@example.com' }),
    })
    const res = await requestForgotPassword(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)

    // User should have a token starting with REQUESTED_
    expect(mockUser.passwordResetToken).toBeDefined()
    expect(mockUser.passwordResetToken?.startsWith('REQUESTED_')).toBe(true)
    expect(mockUser.passwordResetExpires).toBeDefined()
  })

  it('reset password verification explicitly rejects pending REQUESTED_ tokens', async () => {
    // Current mockUser has REQUESTED_ token
    const pendingToken = mockUser.passwordResetToken!
    expect(pendingToken.startsWith('REQUESTED_')).toBe(true)

    const req = new NextRequest(`http://localhost:3000/api/auth/reset-password?token=${pendingToken}`)
    const res = await verifyResetToken(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/awaiting administrator approval/i)
  })

  it('reset password submission blocks pending REQUESTED_ tokens from bypassing approval', async () => {
    const pendingToken = mockUser.passwordResetToken!

    const req = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: pendingToken,
        password: 'NewSecurePassword123!',
      }),
    })
    const res = await completeResetPassword(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/awaiting administrator approval/i)
  })

  it('reset password verifies and completes with genuine approved token', async () => {
    // Simulate admin approval: generates genuine UUID token
    const approvedToken = 'gen-token-abc-123-xyz'
    mockUser.passwordResetToken = approvedToken
    mockUser.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000)

    // GET verify
    const verifyReq = new NextRequest(`http://localhost:3000/api/auth/reset-password?token=${approvedToken}`)
    const verifyRes = await verifyResetToken(verifyReq)
    expect(verifyRes.status).toBe(200)
    const verifyJson = await verifyRes.json()
    expect(verifyJson.valid).toBe(true)
    expect(verifyJson.email).toBe(mockUser.email)

    // POST complete reset
    const resetReq = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: approvedToken,
        password: 'MyBrandNewPassword123',
      }),
    })
    const resetRes = await completeResetPassword(resetReq)
    expect(resetRes.status).toBe(200)
    const resetJson = await resetRes.json()
    expect(resetJson.success).toBe(true)

    // Token must be invalidated afterwards
    expect(mockUser.passwordResetToken).toBeNull()
    expect(mockUser.passwordResetExpires).toBeNull()
  })
})
