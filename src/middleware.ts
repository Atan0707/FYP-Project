import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const userId = request.cookies.get('userId');
  const adminId = request.cookies.get('adminId');
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || 
                     request.nextUrl.pathname.startsWith('/signup');
  const isAdminAuthPage = request.nextUrl.pathname.startsWith('/admin/login');
  const isAdminPage = request.nextUrl.pathname.startsWith('/admin') && !isAdminAuthPage;

  // Handle admin routes
  if (isAdminPage) {
    if (!adminId) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    return NextResponse.next();
  }

  if (adminId && isAdminAuthPage) {
    return NextResponse.redirect(new URL('/admin/pages/dashboard', request.url));
  }

  // Handle user routes
  if (!userId && !isAuthPage && !isAdminAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (userId && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/family/:path*',
    '/login',
    '/signup'
  ],
}; 