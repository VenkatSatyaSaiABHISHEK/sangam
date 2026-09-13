import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
} from 'firebase/firestore';
import { dbFirestore } from './firebase';
import { Team, User, Bus, Room, Announcement, Photo, AttendanceRecord, ChannelMessage, ChannelSettings } from '@/types';

// Collections
const TEAMS_COL = 'teams';
const USERS_COL = 'users';
const BUSES_COL = 'buses';
const ROOMS_COL = 'rooms';
const ANNOUNCEMENTS_COL = 'announcements';
const PHOTOS_COL = 'photos';
const ATTENDANCE_COL = 'attendance';
const MESSAGES_COL = 'channel_messages';
const SETTINGS_COL = 'settings';
const CHANNEL_SETTINGS_DOC = 'channel_settings';

// Helper to check if Firestore is ready
function isFirestoreReady(): boolean {
  return Boolean(dbFirestore);
}

// Helper to sanitize objects for Firestore (removes undefined fields which Firestore rejects)
function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  if (typeof obj === 'object') {
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) {
        clean[k] = sanitizeForFirestore(v);
      }
    }
    return clean;
  }
  return obj;
}

// ----------------- TEAMS -----------------
export async function saveTeamToFirestore(team: Team): Promise<boolean> {
  if (!isFirestoreReady() || !dbFirestore) return false;
  try {
    const docRef = doc(dbFirestore, TEAMS_COL, team.id);
    const data = sanitizeForFirestore({
      ...team,
      mentorIds: team.mentorIds || [],
      mentors: team.mentors || [],
      studentIds: team.studentIds || [],
      updatedAt: new Date().toISOString(),
    });
    await setDoc(docRef, data, { merge: true });
    return true;
  } catch (err: any) {
    console.error(`[Firestore Error] Failed to save team ${team.id}:`, err.message || err);
    return false;
  }
}

export async function deleteTeamFromFirestore(teamId: string): Promise<boolean> {
  if (!isFirestoreReady() || !dbFirestore) return false;
  try {
    await deleteDoc(doc(dbFirestore, TEAMS_COL, teamId));
    return true;
  } catch (err: any) {
    console.error(`[Firestore Error] Failed to delete team ${teamId}:`, err.message || err);
    return false;
  }
}

export async function fetchTeamsFromFirestore(): Promise<Team[]> {
  if (!isFirestoreReady() || !dbFirestore) return [];
  try {
    const snap = await getDocs(collection(dbFirestore, TEAMS_COL));
    const teams: Team[] = [];
    snap.forEach((d) => {
      teams.push(d.data() as Team);
    });
    return teams;
  } catch (err: any) {
    console.warn(`[Firestore Error] Could not fetch teams:`, err.message || err);
    return [];
  }
}

// ----------------- USERS (Students, Mentors, Teachers) -----------------
export async function saveUserToFirestore(user: User): Promise<boolean> {
  if (!isFirestoreReady() || !dbFirestore) return false;
  try {
    const docRef = doc(dbFirestore, USERS_COL, user.id);
    const data = sanitizeForFirestore({
      ...user,
      teamId: user.teamId || null,
      teamName: user.teamName || null,
      mentorType: user.mentorType || (user.role === 'mentor' ? (user.teamId ? 'cohort' : 'support') : undefined),
      updatedAt: new Date().toISOString(),
    });
    await setDoc(docRef, data, { merge: true });
    return true;
  } catch (err: any) {
    console.error(`[Firestore Error] Failed to save user ${user.id}:`, err.message || err);
    return false;
  }
}

export async function deleteUserFromFirestore(userId: string): Promise<boolean> {
  if (!isFirestoreReady() || !dbFirestore) return false;
  try {
    await deleteDoc(doc(dbFirestore, USERS_COL, userId));
    return true;
  } catch (err: any) {
    console.error(`[Firestore Error] Failed to delete user ${userId}:`, err.message || err);
    return false;
  }
}

export async function fetchUsersFromFirestore(role?: string): Promise<User[]> {
  if (!isFirestoreReady() || !dbFirestore) return [];
  try {
    const colRef = collection(dbFirestore, USERS_COL);
    let q = colRef;
    const snap = await getDocs(q);
    const users: User[] = [];
    snap.forEach((d) => {
      const u = d.data() as User;
      if (!role || u.role === role) {
        users.push(u);
      }
    });
    return users;
  } catch (err: any) {
    console.warn(`[Firestore Error] Could not fetch users:`, err.message || err);
    return [];
  }
}

// ----------------- BUSES -----------------
export async function saveBusToFirestore(bus: Bus): Promise<boolean> {
  if (!isFirestoreReady() || !dbFirestore) return false;
  try {
    await setDoc(doc(dbFirestore, BUSES_COL, bus.id), sanitizeForFirestore(bus), { merge: true });
    return true;
  } catch (err: any) {
    console.error(`[Firestore Error] Failed to save bus ${bus.id}:`, err.message || err);
    return false;
  }
}

export async function deleteBusFromFirestore(busId: string): Promise<boolean> {
  if (!isFirestoreReady() || !dbFirestore) return false;
  try {
    await deleteDoc(doc(dbFirestore, BUSES_COL, busId));
    return true;
  } catch (err: any) {
    console.error(`[Firestore Error] Failed to delete bus ${busId}:`, err.message || err);
    return false;
  }
}

export async function fetchBusesFromFirestore(): Promise<Bus[]> {
  if (!isFirestoreReady() || !dbFirestore) return [];
  try {
    const snap = await getDocs(collection(dbFirestore, BUSES_COL));
    const buses: Bus[] = [];
    snap.forEach((d) => buses.push(d.data() as Bus));
    return buses;
  } catch (err: any) {
    console.warn(`[Firestore Error] Could not fetch buses:`, err.message || err);
    return [];
  }
}

// ----------------- ANNOUNCEMENTS -----------------
export async function saveAnnouncementToFirestore(ann: Announcement): Promise<boolean> {
  if (!isFirestoreReady() || !dbFirestore) return false;
  try {
    await setDoc(doc(dbFirestore, ANNOUNCEMENTS_COL, ann.id), sanitizeForFirestore(ann), { merge: true });
    return true;
  } catch (err: any) {
    console.error(`[Firestore Error] Failed to save announcement ${ann.id}:`, err.message || err);
    return false;
  }
}

export async function fetchAnnouncementsFromFirestore(): Promise<Announcement[]> {
  if (!isFirestoreReady() || !dbFirestore) return [];
  try {
    const snap = await getDocs(collection(dbFirestore, ANNOUNCEMENTS_COL));
    const anns: Announcement[] = [];
    snap.forEach((d) => anns.push(d.data() as Announcement));
    return anns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err: any) {
    console.warn(`[Firestore Error] Could not fetch announcements:`, err.message || err);
    return [];
  }
}

// ----------------- PHOTOS -----------------
export async function savePhotoToFirestore(photo: Photo): Promise<boolean> {
  if (!isFirestoreReady() || !dbFirestore) return false;
  try {
    await setDoc(doc(dbFirestore, PHOTOS_COL, photo.id), sanitizeForFirestore(photo), { merge: true });
    return true;
  } catch (err: any) {
    console.error(`[Firestore Error] Failed to save photo ${photo.id}:`, err.message || err);
    return false;
  }
}

export async function fetchPhotosFromFirestore(): Promise<Photo[]> {
  if (!isFirestoreReady() || !dbFirestore) return [];
  try {
    const snap = await getDocs(collection(dbFirestore, PHOTOS_COL));
    const photos: Photo[] = [];
    snap.forEach((d) => photos.push(d.data() as Photo));
    return photos;
  } catch (err: any) {
    console.warn(`[Firestore Error] Could not fetch photos:`, err.message || err);
    return [];
  }
}

// ----------------- ATTENDANCE -----------------
export async function saveAttendanceToFirestore(record: AttendanceRecord): Promise<boolean> {
  if (!isFirestoreReady() || !dbFirestore) return false;
  try {
    await setDoc(doc(dbFirestore, ATTENDANCE_COL, record.id), sanitizeForFirestore(record), { merge: true });
    return true;
  } catch (err: any) {
    console.error(`[Firestore Error] Failed to save attendance ${record.id}:`, err.message || err);
    return false;
  }
}

export async function fetchAttendanceFromFirestore(): Promise<AttendanceRecord[]> {
  if (!isFirestoreReady() || !dbFirestore) return [];
  try {
    const snap = await getDocs(collection(dbFirestore, ATTENDANCE_COL));
    const records: AttendanceRecord[] = [];
    snap.forEach((d) => records.push(d.data() as AttendanceRecord));
    return records;
  } catch (err: any) {
    console.warn(`[Firestore Error] Could not fetch attendance:`, err.message || err);
    return [];
  }
}

// ----------------- ROOMS -----------------
export async function saveRoomToFirestore(room: Room): Promise<boolean> {
  if (!isFirestoreReady() || !dbFirestore) return false;
  try {
    await setDoc(doc(dbFirestore, ROOMS_COL, room.id), sanitizeForFirestore(room), { merge: true });
    return true;
  } catch (err: any) {
    console.error(`[Firestore Error] Failed to save room ${room.id}:`, err.message || err);
    return false;
  }
}

export async function fetchRoomsFromFirestore(): Promise<Room[]> {
  if (!isFirestoreReady() || !dbFirestore) return [];
  try {
    const snap = await getDocs(collection(dbFirestore, ROOMS_COL));
    const rooms: Room[] = [];
    snap.forEach((d) => rooms.push(d.data() as Room));
    return rooms;
  } catch (err: any) {
    console.warn(`[Firestore Error] Could not fetch rooms:`, err.message || err);
    return [];
  }
}

export async function fetchRoomByIdFromFirestore(roomId: string): Promise<Room | null> {
  if (!isFirestoreReady() || !dbFirestore) return null;
  try {
    const snap = await getDoc(doc(dbFirestore, ROOMS_COL, roomId));
    if (snap.exists()) {
      return snap.data() as Room;
    }
    // Also try case-insensitive query if not exact match
    const colRef = collection(dbFirestore, ROOMS_COL);
    const allSnap = await getDocs(colRef);
    let found: Room | null = null;
    allSnap.forEach((d) => {
      const r = d.data() as Room;
      if (r.id.toLowerCase() === roomId.toLowerCase()) {
        found = r;
      }
    });
    return found;
  } catch (err: any) {
    console.warn(`[Firestore Error] Could not fetch room ${roomId}:`, err.message || err);
    return null;
  }
}

export async function deleteRoomFromFirestore(roomId: string): Promise<boolean> {
  if (!isFirestoreReady() || !dbFirestore) return false;
  try {
    await deleteDoc(doc(dbFirestore, ROOMS_COL, roomId));
    return true;
  } catch (err: any) {
    console.error(`[Firestore Error] Failed to delete room ${roomId}:`, err.message || err);
    return false;
  }
}

// ----------------- OPEN CHANNEL (WhatsApp-style Group Discussion) -----------------
export async function saveChannelMessage(message: ChannelMessage): Promise<boolean> {
  if (!isFirestoreReady() || !dbFirestore) return false;
  try {
    const docRef = doc(dbFirestore, MESSAGES_COL, message.id);
    const data = sanitizeForFirestore({
      ...message,
      createdAt: message.createdAt || new Date().toISOString(),
    });
    await setDoc(docRef, data, { merge: true });
    return true;
  } catch (err: any) {
    console.error(`[Firestore Error] Failed to save channel message ${message.id}:`, err.message || err);
    return false;
  }
}

export async function fetchChannelMessages(): Promise<ChannelMessage[]> {
  if (!isFirestoreReady() || !dbFirestore) return [];
  try {
    const colRef = collection(dbFirestore, MESSAGES_COL);
    const q = query(colRef, limit(300));
    const snap = await getDocs(q);
    const messages: ChannelMessage[] = [];
    snap.forEach((d) => messages.push(d.data() as ChannelMessage));
    return messages.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  } catch (err: any) {
    console.warn(`[Firestore Error] Could not fetch channel messages:`, err.message || err);
    return [];
  }
}

export function subscribeToChannelMessages(
  callback: (messages: ChannelMessage[]) => void
): () => void {
  if (!isFirestoreReady() || !dbFirestore) {
    return () => {};
  }
  try {
    const colRef = collection(dbFirestore, MESSAGES_COL);
    const q = query(colRef, limit(300));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const messages: ChannelMessage[] = [];
        snap.forEach((d) => messages.push(d.data() as ChannelMessage));
        messages.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        callback(messages);
      },
      (err) => {
        console.warn('[Firestore] Channel snapshot subscription error:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('[Firestore] Error creating channel listener:', err);
    return () => {};
  }
}

export async function saveChannelSettings(settings: ChannelSettings): Promise<boolean> {
  if (!isFirestoreReady() || !dbFirestore) return false;
  try {
    const docRef = doc(dbFirestore, SETTINGS_COL, CHANNEL_SETTINGS_DOC);
    await setDoc(
      docRef,
      sanitizeForFirestore({ ...settings, updatedAt: new Date().toISOString() }),
      { merge: true }
    );
    return true;
  } catch (err: any) {
    console.error(`[Firestore Error] Failed to save channel settings:`, err.message || err);
    return false;
  }
}

export async function fetchChannelSettings(): Promise<ChannelSettings> {
  if (!isFirestoreReady() || !dbFirestore) return { studentCanPost: true };
  try {
    const snap = await getDoc(doc(dbFirestore, SETTINGS_COL, CHANNEL_SETTINGS_DOC));
    if (snap.exists()) {
      return snap.data() as ChannelSettings;
    }
  } catch (err: any) {
    console.warn(`[Firestore Error] Could not fetch channel settings:`, err.message || err);
  }
  return { studentCanPost: true };
}

