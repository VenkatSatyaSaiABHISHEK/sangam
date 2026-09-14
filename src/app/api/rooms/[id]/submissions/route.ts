import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  saveSubmissionToFirestore,
  fetchSubmissionsFromFirestore,
  saveAttendanceToFirestore,
  saveRoomToFirestore,
} from '@/lib/firebase-db';
import { RoomSubmission } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;
    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    db.reload();
    let localSubmissions = db.getSubmissions(roomId);

    // Also fetch from Firestore cloud
    try {
      const fsSubmissions = await fetchSubmissionsFromFirestore(roomId);
      if (fsSubmissions && fsSubmissions.length > 0) {
        const map = new Map<string, RoomSubmission>();
        localSubmissions.forEach((s) => map.set(s.id, s));
        fsSubmissions.forEach((s) => map.set(s.id, { ...map.get(s.id), ...s }));
        localSubmissions = Array.from(map.values()).sort(
          (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        );
      }
    } catch (err) {
      console.warn('Firestore fetch submissions error:', err);
    }

    // Enrich submissions with student data if missing
    const allStudents = db.getStudents();
    localSubmissions = localSubmissions.map((s) => {
      const sub = { ...s, submittedBy: { ...s.submittedBy } };
      if ((!sub.submittedBy.fullName || sub.submittedBy.fullName === 'Participant') && sub.answers) {
        for (const [k, v] of Object.entries(sub.answers)) {
          if (typeof v === 'string' && (k.includes('name') || k === 'f_name' || k === 'f1') && v.trim().length > 1) {
            sub.submittedBy.fullName = v.trim();
            break;
          }
        }
      }
      if (!sub.submittedBy.userId) {
        const cleanP = sub.submittedBy.phone?.replace(/\D/g, '').slice(-10);
        if (cleanP) {
          const matched = allStudents.find((st) => st.phone && st.phone.replace(/\D/g, '').slice(-10) === cleanP);
          if (matched) {
            sub.submittedBy.userId = matched.id;
            if (!sub.submittedBy.fullName || sub.submittedBy.fullName === 'Participant') {
              sub.submittedBy.fullName = matched.fullName;
            }
            if (!sub.submittedBy.email) {
              sub.submittedBy.email = matched.email;
            }
          }
        }
      }
      return sub;
    });

    return NextResponse.json({
      success: true,
      roomId,
      submissions: localSubmissions,
      total: localSubmissions.length,
    });
  } catch (err: any) {
    console.error('Error in GET /api/rooms/[id]/submissions:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;
    const body = await req.json();

    const submission: RoomSubmission = {
      id: body.id || `sub_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
      roomId: roomId,
      eventId: body.eventId || 'sangam-2027',
      submittedBy: body.submittedBy || {},
      answers: body.answers || {},
      gpsCoordinates: body.gpsCoordinates,
      submittedAt: body.submittedAt || new Date().toISOString(),
    };

    const currentRoom = db.getRoomById(roomId);
    if (currentRoom && currentRoom.isActive === false) {
      return NextResponse.json(
        { error: 'This room session has been paused by organizers. Submissions are temporarily closed.' },
        { status: 403 }
      );
    }

    // 1. Save to local disk & check attendance
    const saved = db.submitToRoom(submission);

    // 2. Save to Firestore cloud
    saveSubmissionToFirestore(saved).catch((e) =>
      console.warn('Firestore saveSubmissionToFirestore error:', e)
    );

    // 3. If attendance was marked, sync attendance to Firestore
    if (saved.submittedBy?.userId) {
      const attRecord = db.getAttendanceForStudent(saved.submittedBy.userId);
      if (attRecord) {
        saveAttendanceToFirestore(attRecord).catch((e) =>
          console.warn('Firestore sync attendance error:', e)
        );
      }
    }

    // 4. Sync room submission count to Firestore
    const room = db.getRoomById(roomId);
    if (room) {
      saveRoomToFirestore(room).catch((e) =>
        console.warn('Firestore sync room count error:', e)
      );
    }

    return NextResponse.json({ success: true, submission: saved });
  } catch (err: any) {
    console.error('Error in POST /api/rooms/[id]/submissions:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
