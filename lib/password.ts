import { promisify } from 'node:util'
import {
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from 'node:crypto'

const scrypt = promisify(nodeScrypt)
const PASSWORD_PREFIX = 'scrypt'
const KEY_LENGTH = 64

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer
  return `${PASSWORD_PREFIX}:${salt}:${derivedKey.toString('hex')}`
}

export async function verifyPassword(
  password: string,
  encodedHash: string
): Promise<boolean> {
  const [prefix, salt, storedKey] = encodedHash.split(':')
  if (
    prefix !== PASSWORD_PREFIX ||
    !salt ||
    !storedKey ||
    storedKey.length !== KEY_LENGTH * 2
  ) {
    return false
  }

  try {
    const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer
    const storedBuffer = Buffer.from(storedKey, 'hex')
    return (
      storedBuffer.length === derivedKey.length &&
      timingSafeEqual(storedBuffer, derivedKey)
    )
  } catch {
    return false
  }
}
