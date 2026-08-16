import { describe, it, expect } from 'vitest'
import { signToken, verifyToken, SessionPayload } from '@/lib/auth'

describe('Authentication Unit Tests', () => {
  it('should sign and verify a valid user token successfully', async () => {
    const payload: SessionPayload = {
      userId: 'user-123',
      name: 'Test Teacher',
      email: 'teacher@test.com',
      role: 'TEACHER',
    }

    const token = await signToken(payload)
    expect(token).toBeDefined()
    expect(typeof token).toBe('string')

    const verified = await verifyToken(token)
    expect(verified).not.toBeNull()
    expect(verified?.userId).toBe('user-123')
    expect(verified?.role).toBe('TEACHER')
    expect(verified?.name).toBe('Test Teacher')
  })

  it('should reject invalid or tampered JWT tokens', async () => {
    const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.signature'
    const verified = await verifyToken(invalidToken)
    expect(verified).toBeNull()
  })
})
