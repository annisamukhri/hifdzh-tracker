import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // 1. Update the Supabase session first
  const response = await updateSession(request)

  // 2. Create a new set of headers from the request
  const requestHeaders = new Headers(request.headers)

  // 3. Inject the current pathname into the headers
  requestHeaders.set('x-pathname', request.nextUrl.pathname)

  // 4. Return the response while merging the new headers
  // This ensures the Server Component layout can read 'x-pathname'
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
    // We pass the existing response (with Supabase cookies) back
    ...response
  })
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}