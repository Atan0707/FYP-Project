import { type NextRequest, NextResponse } from 'next/server';
import { getSession } from './pages/_lib/auth';

export async function middleware(req: NextRequest) {
  // 1. check if route is protected
  const protectedRoutes = ['/pages/dashboard'];
  const currentPath = req.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.includes(currentPath);

  // 2. Check for valid session
  const session = await getSession();

  // 3. Handle protected routes
  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/pages/login', req.url));
  }

  // 4. Prevent accessing login/signup when already logged in
  if (session && (currentPath === '/pages/login' || currentPath === '/pages/signup')) {
    return NextResponse.redirect(new URL('/pages/dashboard', req.url));
  }

  return NextResponse.next();
}

// This is to prevent the middleware from being applied to API routes
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
