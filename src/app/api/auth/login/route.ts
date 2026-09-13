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

    const targetRole = (body.targetRole || '').trim().toLowerCase();
    const cleanDigits = email.replace(/\D/g, '');

    const findMatchingParticipants = (): User[] => {
      return db.getUsers().filter(
        (u) =>
          u.role !== 'admin' &&
          ((u.email && u.email.toLowerCase() === email) ||
            (cleanDigits.length >= 7 &&
              u.phone &&
              u.phone.replace(/\D/g, '').slice(-10) === cleanDigits.slice(-10)))
      );
    };

    // Action: check available roles for this email
    if (body.action === 'checkRoles') {
      const roles: Array<{
        role: 'admin' | 'mentor' | 'student' | 'teacher';
        label: string;
        name?: string;
        requiresPassword?: boolean;
      }> = [];

      if (isMasterAdmin) {
        roles.push({
          role: 'admin',
          label: 'Master Administrator',
          name: 'Master Administrator',
          requiresPassword: true,
        });
      }

      let participants = findMatchingParticipants();

      if (participants.length === 0) {
        try {
          const { fetchUsersFromFirestore } = await import('@/lib/firebase-db');
          const firestoreUsers = await fetchUsersFromFirestore();
          const match = firestoreUsers.find((u) => {
            if (u.role === 'admin') return false;
            if (u.email?.toLowerCase() === email) return true;
            if (cleanDigits.length >= 7 && u.phone) {
              const uDigits = u.phone.replace(/\D/g, '');
              if (uDigits.slice(-10) === cleanDigits.slice(-10)) return true;
            }
            return false;
          });
          if (match) {
            if (match.role === 'student') db.createStudent(match);
            else if (match.role === 'mentor') db.createMentor(match);
            else if (match.role === 'teacher') db.createTeacher(match);
            participants = findMatchingParticipants();
          }
        } catch (e) {
          console.warn('Firestore fallback lookup in checkRoles:', e);
        }
      }

      for (const p of participants) {
        const roleLabel =
          p.role === 'mentor'
            ? 'Summit Mentor'
            : p.role === 'student'
            ? 'Summit Student'
            : 'Faculty / Teacher';
        roles.push({
          role: p.role as any,
          label: roleLabel,
          name: p.fullName,
          requiresPassword: false,
        });
      }

      return NextResponse.json({
        email,
        multipleRoles: roles.length > 1,
        roles,
      });
    }

    let authenticatedUser: User | null = null;

    // Check matching participants
    let matchingParticipants = findMatchingParticipants();

    if (matchingParticipants.length === 0 && !isMasterAdmin) {
      try {
        const { fetchUsersFromFirestore } = await import('@/lib/firebase-db');
        const firestoreUsers = await fetchUsersFromFirestore();
        const match = firestoreUsers.find((u) => {
          if (u.role === 'admin') return false;
          if (u.email?.toLowerCase() === email) return true;
          if (cleanDigits.length >= 7 && u.phone) {
            const uDigits = u.phone.replace(/\D/g, '');
            if (uDigits.slice(-10) === cleanDigits.slice(-10)) return true;
          }
          return false;
        });
        if (match) {
          if (match.role === 'student') db.createStudent(match);
          else if (match.role === 'mentor') db.createMentor(match);
          else if (match.role === 'teacher') db.createTeacher(match);
          matchingParticipants = findMatchingParticipants();
        }
      } catch (e) {
        console.warn('Firestore fallback lookup in login:', e);
      }
    }

    // If email belongs to both admin and a participant (e.g. mentor Abhishek), prompt role selection if not chosen yet
    if (!targetRole && isMasterAdmin && matchingParticipants.length > 0) {
      const roles = [
        {
          role: 'admin',
          label: 'Master Administrator',
          name: 'Master Administrator',
          requiresPassword: true,
        },
        ...matchingParticipants.map((p) => ({
          role: p.role,
          label:
            p.role === 'mentor'
              ? 'Summit Mentor'
              : p.role === 'student'
              ? 'Summit Student'
              : 'Faculty / Teacher',
          name: p.fullName,
          requiresPassword: false,
        })),
      ];

      return NextResponse.json({
        requireRoleSelection: true,
        multipleRoles: true,
        message: 'This email is linked to multiple summit roles. Please choose which portal you want to log into.',
        roles,
      });
    }

    // 1. Admin authentication check
    if (
      targetRole === 'admin' ||
      (isMasterAdmin &&
        targetRole !== 'mentor' &&
        targetRole !== 'student' &&
        targetRole !== 'teacher' &&
        matchingParticipants.length === 0)
    ) {
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
      // 2. Student / Mentor / Teacher participant authentication
      let foundUser: User | undefined = undefined;

      if (targetRole) {
        foundUser = matchingParticipants.find((p) => p.role === targetRole);
      }

      if (!foundUser) {
        foundUser = matchingParticipants[0] || db.getUserByEmailOrPhone(email);
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
