import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';

  const path = url.pathname;

  // Rewrite root to /chat for the chat subdomain
  if (hostname.includes('chat.cruxsee.in') || hostname.startsWith('chat.localhost')) {
    if (path === '/') {
      return NextResponse.rewrite(new URL('/chat', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
