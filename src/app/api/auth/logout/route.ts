import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('sangam_session', '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
  response.cookies.set('sangam_user_role', '', {
    path: '/',
    maxAge: 0,
  });
  response.cookies.set('summit_session', '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
  response.cookies.set('summit_user_role', '', {
    path: '/',
    maxAge: 0,
  });
  return response;
}
