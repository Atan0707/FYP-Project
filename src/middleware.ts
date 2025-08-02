import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const userId = request.cookies.get('userId');
  const adminId = request.cookies.get('adminId');
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || 
                     request.nextUrl.pathname.startsWith('/signup');
  const isAdminAuthPage = request.nextUrl.pathname.startsWith('/admin/login');
  const isAdminPage = request.nextUrl.pathname.startsWith('/admin') && !isAdminAuthPage;
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');
  
  // Public routes that don't require authentication
  const isPublicRoute = request.nextUrl.pathname.startsWith('/pages/family/direct-accept');

  // If it's a public route, allow access without authentication
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Handle API routes
  if (isApiRoute) {
    // Admin API routes
    if (request.nextUrl.pathname.startsWith('/api/admin')) {
      if (!adminId) {
        return NextResponse.json(
          { error: 'Not authenticated' },
          { status: 401 }
        );
      }
      return NextResponse.next();
    }
    
    // User API routes that require authentication
    const protectedApiRoutes = [
      '/api/agreement-pdf',
      '/api/agreements',
      '/api/asset',
      '/api/asset-distribution',
      '/api/family',
      '/api/family-assets',
      '/api/pending-asset',
      '/api/user',
      '/api/dashboard'
    ];
    
    const isProtectedApiRoute = protectedApiRoutes.some(route => 
      request.nextUrl.pathname.startsWith(route)
    );
    
    if (isProtectedApiRoute) {
      if (!userId && !adminId) {
        return NextResponse.json(
          { error: 'Not authenticated' },
          { status: 401 }
        );
      }
      return NextResponse.next();
    }
    
    // Allow other API routes to pass through
    return NextResponse.next();
  }

  // Handle admin page routes
  if (isAdminPage) {
    if (!adminId) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    return NextResponse.next();
  }

  if (adminId && isAdminAuthPage) {
    return NextResponse.redirect(new URL('/admin/pages/dashboard', request.url));
  }

  // Handle user page routes
  if (!userId && !isAuthPage && !isAdminAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (userId && isAuthPage) {
    return NextResponse.redirect(new URL('/pages/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/family/:path*',
    '/pages/:path*',
    '/login',
    '/signup',
    '/api/agreement-pdf/:path*',
    '/api/admin/:path*',
    '/api/agreements/:path*',
    '/api/asset/:path*',
    '/api/asset-distribution/:path*',
    '/api/family/:path*',
    '/api/family-assets/:path*',
    '/api/pending-asset/:path*',
    '/api/user/:path*',
    '/api/dashboard/:path*'
  ],
}; 