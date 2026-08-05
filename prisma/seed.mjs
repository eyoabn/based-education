import { PrismaClient } from '@prisma/client'
import { promisify } from 'node:util'
import { randomBytes, scrypt as nodeScrypt } from 'node:crypto'

const prisma = new PrismaClient()
const scrypt = promisify(nodeScrypt)

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = await scrypt(password, salt, 64)
  return `scrypt:${salt}:${Buffer.from(derivedKey).toString('hex')}`
}

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
const password = process.env.ADMIN_PASSWORD
const name = process.env.ADMIN_NAME?.trim()

if (!email || !password || !name) {
  throw new Error(
    'ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_NAME are required to seed the first administrator.'
  )
}

if (password.length < 8) {
  throw new Error('ADMIN_PASSWORD must be at least 8 characters.')
}

try {
  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      role: 'ADMIN',
      teacherStatus: null,
      isBanned: false,
      banReason: null,
      passwordHash: await hashPassword(password),
      sessionEpoch: { increment: 1 },
    },
    create: {
      name,
      email,
      passwordHash: await hashPassword(password),
      role: 'ADMIN',
      teacherStatus: null,
    },
    select: { id: true, email: true },
  })

  await prisma.platformSetting.upsert({
    where: { id: 'platform' },
    update: {},
    create: { id: 'platform' },
  })

  console.log(`Admin ready: ${admin.email} (${admin.id})`)
} finally {
  await prisma.$disconnect()
}
