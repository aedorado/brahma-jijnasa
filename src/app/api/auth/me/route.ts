import { NextRequest, NextResponse } from 'next/server'
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  let user = await verifySession(token)

  if (user) {
    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean)
    const teacherEmails = (process.env.TEACHER_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean)

    const emailLower = user.email.toLowerCase()
    let shouldUpdate = false
    let targetRole = user.role

    if (adminEmails.includes(emailLower)) {
      if (user.role !== 'admin') {
        targetRole = 'admin'
        shouldUpdate = true
      }
    } else if (teacherEmails.includes(emailLower)) {
      if (user.role !== 'teacher' && user.role !== 'admin') {
        targetRole = 'teacher'
        shouldUpdate = true
      }
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(user.id)) {
      const crypto = await import('crypto')
      const hash = crypto.createHash('sha256').update(user.id).digest('hex')
      user.id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`
      shouldUpdate = true
    }

    // Sync profile to Supabase database
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      if (supabaseUrl && supabaseKey) {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(supabaseUrl, supabaseKey)
        await supabase.from('profiles').upsert({
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          role: targetRole,
        }, { onConflict: 'id' })
      }
    } catch {
      // ignore if foreign key constraint is active
    }

    if (shouldUpdate) {
      user = { ...user, role: targetRole }
      const { signSession } = await import('@/lib/auth')
      const newToken = await signSession(user)
      const res = NextResponse.json({ user })
      res.cookies.set(SESSION_COOKIE_NAME, newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      })
      return res
    }
  }

  return NextResponse.json({ user })
}

