import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  saveTeamToFirestore,
  deleteTeamFromFirestore,
  saveUserToFirestore,
  deleteUserFromFirestore,
  saveBusToFirestore,
  deleteBusFromFirestore,
  saveAnnouncementToFirestore,
  saveAttendanceToFirestore,
} from '@/lib/firebase-db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    db.reload();
    const url = new URL(req.url);
    const includeParam = url.searchParams.get('include');

    if (includeParam) {
      const fields = new Set(includeParam.split(',').map((f) => f.trim().toLowerCase()));
      const partialData: Record<string, any> = {};

      if (fields.has('event')) partialData.event = db.getEvent();
      if (fields.has('students')) partialData.students = db.getStudents();
      if (fields.has('mentors')) partialData.mentors = db.getMentors();
      if (fields.has('supportmentors')) partialData.supportMentors = db.getSupportMentors();
      if (fields.has('cohortmentors')) partialData.cohortMentors = db.getCohortMentors();
      if (fields.has('teachers')) partialData.teachers = db.getTeachers();
      if (fields.has('teams')) partialData.teams = db.getTeams();
      if (fields.has('buses')) partialData.buses = db.getBuses();
      if (fields.has('announcements')) partialData.announcements = db.getAnnouncements();
      if (fields.has('rooms')) partialData.rooms = db.getRooms();
      if (fields.has('attendance')) partialData.attendance = db.getAttendance();

      return NextResponse.json(partialData, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    return NextResponse.json(
      {
        event: db.getEvent(),
        students: db.getStudents(),
        mentors: db.getMentors(),
        supportMentors: db.getSupportMentors(),
        cohortMentors: db.getCohortMentors(),
        teachers: db.getTeachers(),
        teams: db.getTeams(),
        buses: db.getBuses(),
        announcements: db.getAnnouncements(),
        rooms: db.getRooms(),
        attendance: db.getAttendance(),
        photos: db.getPhotos(),
        activities: db.getActivityLogs(50),
      },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    db.reload();

    switch (action) {
      case 'createStudent': {
        const student = db.createStudent(payload);
        saveUserToFirestore(student).catch((e) => console.warn('Firestore sync student:', e));
        return NextResponse.json({ success: true, student });
      }

      case 'bulkCreateStudents': {
        const result = db.bulkCreateStudents(payload.students || []);
        const allToSync = [...result.created, ...result.updated];
        Promise.all(allToSync.map((u) => saveUserToFirestore(u))).catch((e) =>
          console.warn('Firestore bulk sync error:', e)
        );
        const touchedTeamIds = Array.from(new Set(allToSync.map((u) => u.teamId).filter(Boolean) as string[]));
        touchedTeamIds.forEach((tId) => {
          const t = db.getTeamById(tId);
          if (t) saveTeamToFirestore(t).catch((e) => console.warn('Firestore team sync error:', e));
        });
        return NextResponse.json({
          success: true,
          count: result.created.length + result.updated.length,
          createdCount: result.created.length,
          updatedCount: result.updated.length,
          skippedCount: result.skipped,
          students: [...result.created, ...result.updated],
        });
      }

      case 'updateStudent': {
        const student = db.updateStudent(payload.id, payload.updates);
        if (student) {
          saveUserToFirestore(student).catch((e) => console.warn('Firestore sync student update:', e));
        }
        return NextResponse.json({ success: true, student });
      }

      case 'deleteStudent': {
        const ok = db.deleteStudent(payload.id);
        deleteUserFromFirestore(payload.id).catch((e) => console.warn('Firestore delete student:', e));
        return NextResponse.json({ success: ok });
      }

      case 'createTeam': {
        const team = db.createTeam(payload);
        saveTeamToFirestore(team).catch((e) => console.warn('Firestore sync team:', e));
        return NextResponse.json({ success: true, team });
      }

      case 'updateTeam': {
        const team = db.updateTeam(payload.id, payload.updates);
        if (team) {
          saveTeamToFirestore(team).catch((e) => console.warn('Firestore sync team update:', e));
          // Sync affected users
          (team.mentorIds || []).forEach((mId) => {
            const u = db.getUserById(mId);
            if (u) saveUserToFirestore(u).catch((e) => console.warn('Firestore sync user:', e));
          });
          (team.studentIds || []).forEach((sId) => {
            const u = db.getUserById(sId);
            if (u) saveUserToFirestore(u).catch((e) => console.warn('Firestore sync user:', e));
          });
        }
        return NextResponse.json({ success: !!team, team });
      }

      case 'assignStudentToTeam': {
        const { teamId, studentId } = payload;
        const team = db.getTeamById(teamId);
        const student = db.getUserById(studentId);
        if (team && student) {
          const studentIds = Array.from(new Set([...team.studentIds, studentId]));
          const updatedTeam = db.updateTeam(teamId, { studentIds });
          if (updatedTeam) saveTeamToFirestore(updatedTeam).catch((e) => console.warn('Firestore sync team:', e));
          const updatedStudent = db.getUserById(studentId);
          if (updatedStudent) saveUserToFirestore(updatedStudent).catch((e) => console.warn('Firestore sync student:', e));
          return NextResponse.json({ success: true, team: updatedTeam, student: updatedStudent });
        }
        return NextResponse.json({ error: 'Team or student not found' }, { status: 404 });
      }

      case 'removeStudentFromTeam': {
        const { teamId, studentId } = payload;
        const team = db.getTeamById(teamId);
        if (team) {
          const studentIds = team.studentIds.filter((id) => id !== studentId);
          const updatedTeam = db.updateTeam(teamId, { studentIds });
          if (updatedTeam) saveTeamToFirestore(updatedTeam).catch((e) => console.warn('Firestore sync team:', e));
          const updatedStudent = db.getUserById(studentId);
          if (updatedStudent) saveUserToFirestore(updatedStudent).catch((e) => console.warn('Firestore sync student:', e));
          return NextResponse.json({ success: true, team: updatedTeam });
        }
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      }

      case 'assignMentorToTeam': {
        const { teamId, mentorId } = payload;
        const res = db.assignMentorToTeam(teamId, mentorId);
        if (res) {
          saveTeamToFirestore(res.team).catch((e) => console.warn('Firestore sync team:', e));
          saveUserToFirestore(res.mentor).catch((e) => console.warn('Firestore sync mentor:', e));
          return NextResponse.json({ success: true, team: res.team, mentor: res.mentor });
        }
        return NextResponse.json({ error: 'Team or mentor not found' }, { status: 404 });
      }

      case 'removeMentorFromTeam': {
        const { teamId, mentorId } = payload;
        const res = db.removeMentorFromTeam(teamId, mentorId);
        if (res) {
          saveTeamToFirestore(res.team).catch((e) => console.warn('Firestore sync team:', e));
          if (res.mentor?.id) saveUserToFirestore(res.mentor).catch((e) => console.warn('Firestore sync mentor:', e));
          return NextResponse.json({ success: true, team: res.team, mentor: res.mentor });
        }
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      }

      case 'deleteTeam': {
        const ok = db.deleteTeam(payload.id);
        deleteTeamFromFirestore(payload.id).catch((e) => console.warn('Firestore delete team:', e));
        return NextResponse.json({ success: ok });
      }

      case 'createMentor': {
        const mentor = db.createMentor(payload);
        saveUserToFirestore(mentor).catch((e) => console.warn('Firestore sync mentor:', e));
        return NextResponse.json({ success: true, mentor });
      }

      case 'updateMentor': {
        const mentor = db.updateMentor(payload.id, payload.updates);
        if (mentor) {
          saveUserToFirestore(mentor).catch((e) => console.warn('Firestore sync mentor update:', e));
          // Sync teams to ensure unassigned/assigned mentors are reflected in Firestore
          db.getTeams().forEach((team) => {
            saveTeamToFirestore(team).catch((e) => console.warn('Firestore sync team update:', e));
          });
        }
        return NextResponse.json({ success: true, mentor });
      }

      case 'deleteMentor': {
        const ok = db.deleteMentor(payload.id);
        deleteUserFromFirestore(payload.id).catch((e) => console.warn('Firestore delete mentor:', e));
        return NextResponse.json({ success: ok });
      }

      case 'createTeacher': {
        const teacher = db.createTeacher(payload);
        saveUserToFirestore(teacher).catch((e) => console.warn('Firestore sync teacher:', e));
        return NextResponse.json({ success: true, teacher });
      }

      case 'updateTeacher': {
        const teacher = db.updateTeacher(payload.id, payload.updates);
        if (teacher) {
          saveUserToFirestore(teacher).catch((e) => console.warn('Firestore sync teacher update:', e));
        }
        return NextResponse.json({ success: true, teacher });
      }

      case 'deleteTeacher': {
        const ok = db.deleteTeacher(payload.id);
        deleteUserFromFirestore(payload.id).catch((e) => console.warn('Firestore delete teacher:', e));
        return NextResponse.json({ success: ok });
      }

      case 'createBus': {
        const bus = db.createBus(payload);
        saveBusToFirestore(bus).catch((e) => console.warn('Firestore sync bus:', e));
        return NextResponse.json({ success: true, bus });
      }

      case 'deleteBus': {
        const ok = db.deleteBus(payload.id);
        deleteBusFromFirestore(payload.id).catch((e) => console.warn('Firestore delete bus:', e));
        return NextResponse.json({ success: ok });
      }

      case 'createAnnouncement': {
        const ann = db.createAnnouncement(payload);
        saveAnnouncementToFirestore(ann).catch((e) => console.warn('Firestore sync announcement:', e));
        return NextResponse.json({ success: true, announcement: ann });
      }

      case 'deleteAnnouncement': {
        const idx = (db as any).data.announcements.findIndex((a: any) => a.id === payload.id);
        if (idx >= 0) {
          (db as any).data.announcements.splice(idx, 1);
          (db as any).saveToFile();
        }
        return NextResponse.json({ success: true });
      }

      case 'markAttendance': {
        const { studentId, status, verifiedBy } = payload;
        const record = db.markAttendance(studentId, status || 'present', verifiedBy || 'room_submission');
        saveAttendanceToFirestore(record).catch((e) => console.warn('Firestore sync attendance:', e));
        return NextResponse.json({ success: true, record });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    console.error('API Data error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
