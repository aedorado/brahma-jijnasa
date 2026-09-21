import { type NextRequest, NextResponse } from 'next/server'
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth'

export async function proxy(request: NextRequest) {
  // Protect /admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
    const user = await verifySession(token)

    if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
      return NextResponse.redirect(new URL('/?error=unauthorized', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
