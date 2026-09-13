import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow static files, api routes, favicon, public rooms, photo verification
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/rooms/') ||
    pathname.startsWith('/photos/') ||
    pathname.startsWith('/qr/') ||
    pathname.startsWith('/uploads/') ||
    pathname.startsWith('/templates/') ||
    pathname.startsWith('/live') ||
    pathname.startsWith('/public') ||
    pathname === '/login' ||
    pathname.endsWith('/login')
  ) {
    return NextResponse.next();
  }

  const sessionCookie =
    req.cookies.get('sangam_session')?.value || req.cookies.get('summit_session')?.value;

  // Unauthenticated user attempting to access protected portal
  if (!sessionCookie) {
    if (
      pathname.startsWith('/admin') ||
      pathname.startsWith('/mentor') ||
      pathname.startsWith('/student') ||
      pathname.startsWith('/teacher') ||
      pathname.startsWith('/judge')
    ) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Parse session token payload
  try {
    const [payloadStr] = sessionCookie.split('.');
    if (!payloadStr) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    const payload = JSON.parse(
      Buffer.from(payloadStr, 'base64url').toString('utf8')
    );

    if (!payload || payload.exp < Date.now()) {
      const res = NextResponse.redirect(new URL('/login', req.url));
      res.cookies.delete('sangam_session');
      res.cookies.delete('sangam_user_role');
      res.cookies.delete('summit_session');
      res.cookies.delete('summit_user_role');
      return res;
    }

    const userRole = payload.role;

    // Helper to get role home portal
    const getRoleHome = (role: string): string => {
      switch (role) {
        case 'admin':
          return '/admin/dashboard';
        case 'mentor':
          return '/mentor/dashboard';
        case 'teacher':
        case 'judge':
        case 'faculty':
          return '/teacher/dashboard';
        case 'student':
        default:
          return '/student';
      }
    };

    // Alias /judge to /teacher
    if (pathname.startsWith('/judge')) {
      return NextResponse.redirect(new URL('/teacher/dashboard', req.url));
    }

    // Strict Role Enforcement
    if (pathname.startsWith('/admin')) {
      if (userRole !== 'admin') {
        return NextResponse.redirect(new URL(getRoleHome(userRole), req.url));
      }
    } else if (pathname.startsWith('/mentor')) {
      if (userRole !== 'mentor' && userRole !== 'admin') {
        return NextResponse.redirect(new URL(getRoleHome(userRole), req.url));
      }
    } else if (pathname.startsWith('/teacher')) {
      if (userRole !== 'teacher' && userRole !== 'faculty' && userRole !== 'judge' && userRole !== 'admin') {
        return NextResponse.redirect(new URL(getRoleHome(userRole), req.url));
      }
    } else if (pathname.startsWith('/student')) {
      if (userRole !== 'student' && userRole !== 'admin') {
        return NextResponse.redirect(new URL(getRoleHome(userRole), req.url));
      }
    }
  } catch {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/mentor/:path*',
    '/student/:path*',
    '/teacher/:path*',
    '/judge/:path*',
  ],
};
