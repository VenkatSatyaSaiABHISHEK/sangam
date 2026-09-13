import crypto from 'crypto';
import { User, UserRole } from '@/types';
import { db } from './db';

const SESSION_SECRET = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || 'sangamconnect_secure_key_2027';

export interface SessionPayload {
  userId: string;
  email: string;
  role: UserRole;
  fullName: string;
  exp: number;
}

export function signSessionToken(user: User): string {
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadStr)
    .digest('base64url');

  return `${payloadStr}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const [payloadStr, signature] = token.split('.');
    if (!payloadStr || !signature) return null;

    // Try current secret, fallback to legacy key if needed
    const expectedSig = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payloadStr)
      .digest('base64url');

    if (signature !== expectedSig) {
      const legacySig = crypto
        .createHmac('sha256', 'summitconnect_secure_key_2027')
        .update(payloadStr)
        .digest('base64url');
      if (signature !== legacySig) return null;
    }

    const payload: SessionPayload = JSON.parse(
      Buffer.from(payloadStr, 'base64url').toString('utf8')
    );

    if (payload.exp < Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}

export function getVerifiedUserFromSession(token: string): User | null {
  const session = verifySessionToken(token);
  if (!session) return null;

  // If admin
  const configuredAdmin = (process.env.ADMIN_EMAIL || '').toLowerCase();
  const isAdminEmail =
    (configuredAdmin && session.email.toLowerCase() === configuredAdmin) ||
    session.email.toLowerCase() === 'admin@sangamconnect.org' ||
    session.email.toLowerCase() === 'admin@summitconnect.org';

  if (session.role === 'admin' && isAdminEmail) {
    return {
      id: 'admin-root',
      eventId: 'sangam-2027',
      role: 'admin',
      fullName: session.fullName || 'Sangam Administrator',
      email: session.email,
      phone: '+91 000 000 0000',
      status: 'active',
      createdAt: new Date().toISOString(),
    };
  }

  // Lookup in database
  const user = db.getUserByEmail(session.email);
  return user || null;
}
