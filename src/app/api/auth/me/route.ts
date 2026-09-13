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
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({ user, role: user.role });
  } catch {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
