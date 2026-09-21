import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { signSession, SESSION_COOKIE_NAME, type AuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const stateRaw = searchParams.get('state')

  let nextUrl = '/'
  if (stateRaw) {
    try {
      const decoded = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf-8'))
      if (decoded.next && typeof decoded.next === 'string' && decoded.next.startsWith('/')) {
        nextUrl = decoded.next
      }
    } catch {
      // Ignore state parse error, fall back to /
    }
  }

  if (error || !code) {
    console.error('Google OAuth callback error:', error)
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error || 'missing_code')}`, request.url))
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/?error=oauth_config_missing', request.url))
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`
  const redirectUri = `${appUrl}/api/auth/google/callback`

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text()
      console.error('Failed to exchange token with Google:', errBody)
      return NextResponse.redirect(new URL('/?error=token_exchange_failed', request.url))
    }

    const tokens = await tokenRes.json()

    // 2. Fetch user profile from Google
    const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    if (!userinfoRes.ok) {
      console.error('Failed to fetch userinfo from Google')
      return NextResponse.redirect(new URL('/?error=userinfo_fetch_failed', request.url))
    }

    const googleUser = await userinfoRes.json()

    // 3. Determine role based on ADMIN_EMAILS / TEACHER_EMAILS
    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean)
    const teacherEmails = (process.env.TEACHER_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean)

    const emailLower = googleUser.email.toLowerCase()
    let role: 'student' | 'teacher' | 'admin' = 'student'
    if (adminEmails.includes(emailLower)) {
      role = 'admin'
    } else if (teacherEmails.includes(emailLower)) {
      role = 'teacher'
    }

    // Generate a valid RFC4122 UUID from Google user ID
    const hash = crypto.createHash('sha256').update(googleUser.id).digest('hex')
    const userId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`

    const user: AuthUser = {
      id: userId,
      email: googleUser.email,
      full_name: googleUser.name || googleUser.email.split('@')[0],
      avatar_url: googleUser.picture || '',
      role,
    }

    // 4. Upsert user into Supabase 'profiles' database table
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey)
        const { error: upsertErr } = await supabase.from('profiles').upsert({
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          role: user.role,
        }, { onConflict: 'id' })
        if (upsertErr) {
          console.warn('Note: Could not insert profile to Supabase database table:', upsertErr)
        }
      }
    } catch (dbErr) {
      console.warn('Note: Could not insert profile to Supabase database table:', dbErr)
    }

    // 5. Create signed session token and set secure HTTP-only cookie
    const sessionToken = await signSession(user)

    const response = NextResponse.redirect(new URL(nextUrl, request.url))
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })

    return response
  } catch (err) {
    console.error('Unexpected error in Google OAuth callback:', err)
    return NextResponse.redirect(new URL('/?error=internal_auth_error', request.url))
  }
}
