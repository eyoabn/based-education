import { describe, it, expect } from 'vitest'
import { GET as getConversations, POST as createConversation } from '@/app/api/messages/conversations/route'
import { GET as getMessages, POST as sendMessage } from '@/app/api/messages/[conversationId]/route'
import { GET as searchUsers } from '@/app/api/messages/users/route'
import { NextRequest } from 'next/server'
import { signToken } from '@/lib/auth'

describe('Messaging & Chat System Unit Tests', () => {
  it('conversations list should require authentication', async () => {
    const req = new NextRequest('http://localhost:3000/api/messages/conversations')
    const res = await getConversations(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('users search should require authentication', async () => {
    const req = new NextRequest('http://localhost:3000/api/messages/users')
    const res = await searchUsers(req)
    expect(res.status).toBe(401)
  })

  it('create conversation should require recipient or course', async () => {
    const userToken = await signToken({
      userId: 'user-chat-test',
      name: 'Chat Tester',
      role: 'STUDENT',
    })

    const req = new NextRequest('http://localhost:3000/api/messages/conversations', {
      method: 'POST',
      headers: {
        cookie: `token=${userToken}`,
      },
      body: JSON.stringify({}),
    })

    const res = await createConversation(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/targetUserId or courseId is required/i)
  })

  it('messages thread should require authentication', async () => {
    const req = new NextRequest('http://localhost:3000/api/messages/conv-123')
    const res = await getMessages(req, { params: Promise.resolve({ conversationId: 'conv-123' }) })
    expect(res.status).toBe(401)
  })

  it('send message should reject empty content', async () => {
    const userToken = await signToken({
      userId: 'user-chat-test',
      name: 'Chat Tester',
      role: 'STUDENT',
    })

    const req = new NextRequest('http://localhost:3000/api/messages/conv-123', {
      method: 'POST',
      headers: {
        cookie: `token=${userToken}`,
      },
      body: JSON.stringify({ content: '   ' }),
    })

    const res = await sendMessage(req, { params: Promise.resolve({ conversationId: 'conv-123' }) })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/Message content is required/i)
  })
})
