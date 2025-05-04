import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth0 } from "./lib/auth0";

export async function middleware(request: NextRequest) {
  // Check if the request is for a protected page
  const isProtectedPage = request.nextUrl.pathname.startsWith('/pages');
  
  const result = await auth0.middleware(request);
  
  // Handle redirects for authenticated users
  if (result instanceof Response && result.status === 307) {
    const redirectUrl = new URL(result.headers.get('Location') || '', request.url);
    
    // If the request is for Auth0 login callback, redirect to dashboard
    if (request.nextUrl.pathname === '/auth/callback') {
      return NextResponse.redirect(new URL('/pages/dashboard', request.url));
    }
  }
  
  return result;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
}; 