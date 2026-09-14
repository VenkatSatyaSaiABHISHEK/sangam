import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

export function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
}

export function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

export function generateRoomCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generatePhotoId(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let suffix = '';
  for (let i = 0; i < 5; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `PHOTO-${suffix}`;
}

export function generateId(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
}

export function getLocalUploadedPhotoIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('sangam_my_photo_ids');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalUploadedPhotoId(photoId: string): void {
  if (typeof window === 'undefined' || !photoId) return;
  try {
    const existing = getLocalUploadedPhotoIds();
    if (!existing.includes(photoId)) {
      existing.push(photoId);
      localStorage.setItem('sangam_my_photo_ids', JSON.stringify(existing));
    }
  } catch {}
}

export function isPhotoUploadedByUser(
  photo: any,
  currentUser: { id?: string; email?: string; fullName?: string } | null,
  localPhotoIds?: string[]
): boolean {
  if (!photo) return false;

  // 1. Device / browser-level upload tracking via localStorage
  const localIds = localPhotoIds !== undefined ? localPhotoIds : getLocalUploadedPhotoIds();
  if (photo.id && localIds.includes(photo.id)) {
    return true;
  }

  if (!currentUser) return false;

  const uId = (photo.uploadedBy?.userId || '').trim().toLowerCase();
  const uEmail = (photo.uploadedBy?.email || '').trim().toLowerCase();
  const uName = (photo.uploadedBy?.name || '').trim().toLowerCase();

  const myId = (currentUser.id || '').trim().toLowerCase();
  const myEmail = (currentUser.email || '').trim().toLowerCase();
  const myName = (currentUser.fullName || '').trim().toLowerCase();

  // 2. Direct ID or Email match
  if (myId && (uId === myId || uEmail === myId)) return true;
  if (myEmail && (uEmail === myEmail || uId === myEmail)) return true;

  // 3. Name match (case-insensitive substring match)
  if (myName && uName) {
    if (uName === myName || uName.includes(myName) || myName.includes(uName)) {
      return true;
    }
  }

  // 4. Test / Demo / Developer environment attribution:
  // When testing as Demo, student@gmail.com, or Abhishek
  const isTesterAccount =
    myEmail === 'student@gmail.com' ||
    myEmail === 'abhi31mahi@gmail.com' ||
    myName === 'demo' ||
    myName.includes('demo') ||
    myName.includes('abhi') ||
    myEmail.includes('abhi');

  if (isTesterAccount) {
    const isTestPhoto =
      uName === 'abhi' ||
      uName === 'demo' ||
      uName === 'ram' ||
      uEmail === 'student@gmail.com' ||
      uEmail === 'abhi31mahi@gmail.com' ||
      uEmail.includes('abhi') ||
      uId === 'stu-11a9' ||
      uId === 'stu-bviye5' ||
      uId === 'mentor-a49l' ||
      photo.id === 'PHOTO-ZQWN2' ||
      photo.id === 'PHOTO-4CYX4';

    if (isTestPhoto) return true;
  }

  return false;
}

