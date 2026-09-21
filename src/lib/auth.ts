// ============================================
// BRAHMA JIJÑĀSĀ — Direct Auth & Session Utilities
// ============================================

export interface AuthUser {
  id: string
  email: string
  full_name: string
  avatar_url: string
  role: 'student' | 'teacher' | 'admin'
}

export const SESSION_COOKIE_NAME = 'bj_session'
const SESSION_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'brahma-jijnasa-session-secret-default'

// ——— HMAC-SHA256 helpers using Web Crypto API ———

async function getCryptoKey(): Promise<CryptoKey> {
  const enc = new TextEncoder()
  return await crypto.subtle.importKey(
    'raw',
    enc.encode(SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function signSession(user: AuthUser): Promise<string> {
  const payload = Buffer.from(JSON.stringify(user)).toString('base64url')
  const key = await getCryptoKey()
  const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  const signature = bufferToHex(sigBuffer)
  return `${payload}.${signature}`
}

export async function verifySession(token: string | undefined | null): Promise<AuthUser | null> {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null

  const [payload, signature] = parts
  try {
    const key = await getCryptoKey()
    const expectedSig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
    const expectedHex = bufferToHex(expectedSig)

    if (signature !== expectedHex) {
      return null
    }

    const decoded = Buffer.from(payload, 'base64url').toString('utf-8')
    return JSON.parse(decoded) as AuthUser
  } catch (err) {
    console.error('Failed to verify session token', err)
    return null
  }
}
