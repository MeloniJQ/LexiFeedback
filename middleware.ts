import { type NextRequest, NextResponse } from 'next/server'

// Placeholder middleware - authentication will be implemented in separate backend
export async function middleware(_request: NextRequest) {
  // TODO: Implement authentication checks with separate backend
  // For now, allow all routes
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
