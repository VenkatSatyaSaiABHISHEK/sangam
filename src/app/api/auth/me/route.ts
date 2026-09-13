import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedUserFromSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const sessionCookie =
      req.cookies.get('sangam_session') || req.cookies.get('summit_session');
    if (!sessionCookie?.value) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const user = getVerifiedUserFromSession(sessionCookie.value);
    if (!user) {
      const response = NextResponse.json({ user: null }, { status: 200 });
      response.cookies.delete('sangam_session');
      response.cookies.delete('sangam_user_role');
      response.cookies.delete('summit_session');
      response.cookies.delete('summit_user_role');
      return response;
    }

    return NextResponse.json({ user, role: user.role });
  } catch {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
