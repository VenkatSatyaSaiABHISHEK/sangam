import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signSessionToken } from '@/lib/auth';
import { User } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || body.identifier || '').trim().toLowerCase();
    const password = body.password || '';

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required.' },
        { status: 400 }
      );
    }

    const configuredAdmin = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'SangamAdmin2027!';
    const isMasterAdmin =
      email === 'admin@sangamconnect.org' ||
      email === 'admin@summitconnect.org' ||
      email === 'abhi31mahi@gmail.com' ||
      (configuredAdmin && email === configuredAdmin);

    let authenticatedUser: User | null = null;

    // 1. Admin authentication check
    if (isMasterAdmin) {
      if (!password) {
        return NextResponse.json(
          { error: 'Administrator password is required.', requirePassword: true },
          { status: 401 }
        );
      }

      const validPasswords = [
        adminPassword,
        'Mahi31Abhi',
        'SangamAdmin2027!',
        'SummitAdmin2027!',
      ].filter(Boolean);

      if (!validPasswords.includes(password)) {
        return NextResponse.json(
          { error: 'Invalid administrator password.', requirePassword: true },
          { status: 401 }
        );
      }

      // Authenticate as Master Admin
      authenticatedUser = {
        id: 'admin-root',
        eventId: 'sangam-2027',
        role: 'admin',
        fullName: 'Master Administrator',
        email: email,
        phone: '+91 000 000 0000',
        status: 'active',
        createdAt: new Date().toISOString(),
      };
    } else {
      // 2. Student / Mentor / Teacher database lookup (supports email or 10-digit mobile number)
      let foundUser = db.getUserByEmailOrPhone(email);

      if (!foundUser) {
        // Fallback check in live Firebase Firestore
        try {
          const { fetchUsersFromFirestore } = await import('@/lib/firebase-db');
          const firestoreUsers = await fetchUsersFromFirestore();
          const cleanPhoneDigits = email.replace(/\D/g, '');
          const match = firestoreUsers.find((u) => {
            if (u.email?.toLowerCase() === email) return true;
            if (cleanPhoneDigits.length >= 7 && u.phone) {
              const uPhoneDigits = u.phone.replace(/\D/g, '');
              if (uPhoneDigits.slice(-10) === cleanPhoneDigits.slice(-10)) return true;
            }
            return false;
          });
          if (match) {
            if (match.role === 'student') {
              db.createStudent(match);
            } else if (match.role === 'mentor') {
              db.createMentor(match);
            } else if (match.role === 'teacher') {
              db.createTeacher(match);
            }
            foundUser = db.getUserByEmailOrPhone(email);
          }
        } catch (e) {
          console.warn('Firestore fallback lookup warning:', e);
        }
      }

      if (!foundUser) {
        return NextResponse.json(
          { error: `No registered account found for ${email}. Contact Sangam administration.` },
          { status: 404 }
        );
      }

      if (foundUser.status === 'inactive') {
        return NextResponse.json(
          { error: 'This account has been deactivated by administration.' },
          { status: 403 }
        );
      }

      authenticatedUser = foundUser;
    }

    // 3. Issue cryptographically signed session token
    const token = signSessionToken(authenticatedUser);

    // 4. Log session activity
    db.addActivityLog({
      actorId: authenticatedUser.id,
      actorName: authenticatedUser.fullName,
      actorRole: authenticatedUser.role,
      action: 'USER_LOGIN',
      targetEntity: 'session',
      details: { email: authenticatedUser.email, role: authenticatedUser.role },
    });

    // 5. Construct response with HTTP-only session cookies
    const response = NextResponse.json({
      success: true,
      user: authenticatedUser,
      role: authenticatedUser.role,
    });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    };

    response.cookies.set('sangam_session', token, cookieOptions);
    response.cookies.set('summit_session', token, cookieOptions);

    response.cookies.set('sangam_user_role', authenticatedUser.role, {
      ...cookieOptions,
      httpOnly: false,
    });
    response.cookies.set('summit_user_role', authenticatedUser.role, {
      ...cookieOptions,
      httpOnly: false,
    });

    return response;
  } catch (err: any) {
    console.error('Authentication error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error during authentication.' },
      { status: 500 }
    );
  }
}
