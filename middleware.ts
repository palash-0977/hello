import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() validates the token with Supabase server — if the user was
  // deleted, it returns an error even if the cookie is still present.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isAuthPage = path.startsWith('/auth')
  const isProtectedPage =
    path.startsWith('/messages') ||
    path.startsWith('/profile') ||
    path.startsWith('/followers') ||
    path.startsWith('/status') ||
    path.startsWith('/search')

  // ── Stale / deleted account ──────────────────────────────────
  // If there's a session error (user deleted, token invalid, etc.)
  // force-clear all auth cookies and send to login.
  if (userError && isProtectedPage) {
    const redirectResponse = NextResponse.redirect(
      new URL('/auth/login', request.url)
    )

    // Clear every Supabase auth cookie so the loop stops
    request.cookies.getAll().forEach(({ name }) => {
      if (
        name.startsWith('sb-') ||
        name.includes('supabase') ||
        name.includes('auth-token')
      ) {
        redirectResponse.cookies.set(name, '', {
          maxAge: 0,
          path: '/',
        })
      }
    })

    return redirectResponse
  }

  // ── Normal auth guards ───────────────────────────────────────
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/messages', request.url))
  }

  if (!user && isProtectedPage) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/auth/:path*',
    '/messages/:path*',
    '/profile/:path*',
    '/followers/:path*',
    '/status/:path*',
    '/search/:path*',
  ],
}