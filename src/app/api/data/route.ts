import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  saveTeamToFirestore,
  deleteTeamFromFirestore,
  fetchTeamsFromFirestore,
  saveUserToFirestore,
  deleteUserFromFirestore,
  fetchUsersFromFirestore,
  saveBusToFirestore,
  deleteBusFromFirestore,
  saveAnnouncementToFirestore,
  deleteAnnouncementFromFirestore,
  saveAttendanceToFirestore,
  fetchAttendanceFromFirestore,
  saveRoomToFirestore,
  deleteRoomFromFirestore,
  fetchRoomsFromFirestore,
  saveSubmissionToFirestore,
} from '@/lib/firebase-db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    db.reload();
    const url = new URL(req.url);
    const includeParam = url.searchParams.get('include');

    let allTeams = db.getTeams();
    let allStudents = db.getStudents();
    let allMentors = db.getMentors();
    let allTeachers = db.getTeachers();
    let allRooms = db.getRooms();
    let allAttendance = db.getAttendance();

    try {
      const [fsTeams, fsUsers, fsRooms, fsAttendance] = await Promise.all([
        fetchTeamsFromFirestore(),
        fetchUsersFromFirestore(),
        fetchRoomsFromFirestore(),
        fetchAttendanceFromFirestore(),
      ]);

      if (fsTeams && fsTeams.length > 0) {
        const map = new Map<string, any>();
        allTeams.forEach((t) => map.set(t.id, t));
        fsTeams.forEach((t) => map.set(t.id, { ...map.get(t.id), ...t }));
        allTeams = Array.from(map.values());
      }

      if (fsUsers && fsUsers.length > 0) {
        const sMap = new Map<string, any>();
        allStudents.forEach((s) => sMap.set(s.id, s));
        const mMap = new Map<string, any>();
        allMentors.forEach((m) => mMap.set(m.id, m));
        const tMap = new Map<string, any>();
        allTeachers.forEach((t) => tMap.set(t.id, t));

        fsUsers.forEach((u) => {
          if (u.role === 'student') sMap.set(u.id, { ...sMap.get(u.id), ...u });
          else if (u.role === 'mentor') mMap.set(u.id, { ...mMap.get(u.id), ...u });
          else if (u.role === 'teacher') tMap.set(u.id, { ...tMap.get(u.id), ...u });
        });

        allStudents = Array.from(sMap.values());
        allMentors = Array.from(mMap.values());
        allTeachers = Array.from(tMap.values());
      }

      if (fsRooms && fsRooms.length > 0) {
        const rMap = new Map<string, any>();
        allRooms.forEach((r) => rMap.set(r.id, r));
        fsRooms.forEach((r) => rMap.set(r.id, { ...rMap.get(r.id), ...r }));
        allRooms = Array.from(rMap.values());
      }

      if (fsAttendance && fsAttendance.length > 0) {
        const aMap = new Map<string, any>();
        allAttendance.forEach((a) => aMap.set(a.studentId, a));
        fsAttendance.forEach((a) => {
          if (a.studentId) {
            aMap.set(a.studentId, { ...aMap.get(a.studentId), ...a });
          }
        });
        allAttendance = Array.from(aMap.values());
      }
    } catch (e) {
      console.warn('Firestore cloud sync in GET /api/data:', e);
    }

    // Ensure every student has an attendance record
    const existingAttStudentIds = new Set(allAttendance.map((a) => a.studentId));
    allStudents.forEach((stu) => {
      if (!existingAttStudentIds.has(stu.id)) {
        allAttendance.push({
          id: `att-${stu.id}`,
          sessionId: 'session-main',
          eventId: stu.eventId || 'summit-2027',
          studentId: stu.id,
          studentName: stu.fullName,
          teamId: stu.teamId,
          teamName: stu.teamName,
          busId: stu.busId,
          busName: stu.busName,
          status: 'absent',
          verifiedBy: 'system',
          verifiedAt: new Date().toISOString(),
          method: 'manual_admin',
        });
      }
    });

    const supportMentors = allMentors.filter((m) => m.mentorType === 'support' || !m.teamId);
    const cohortMentors = allMentors.filter((m) => m.mentorType === 'cohort' && m.teamId);

    if (includeParam) {
      const fields = new Set(includeParam.split(',').map((f) => f.trim().toLowerCase()));
      const partialData: Record<string, any> = {};

      if (fields.has('event')) partialData.event = db.getEvent();
      if (fields.has('students')) partialData.students = allStudents;
      if (fields.has('mentors')) partialData.mentors = allMentors;
      if (fields.has('supportmentors')) partialData.supportMentors = supportMentors;
      if (fields.has('cohortmentors')) partialData.cohortMentors = cohortMentors;
      if (fields.has('teachers')) partialData.teachers = allTeachers;
      if (fields.has('teams')) partialData.teams = allTeams;
      if (fields.has('buses')) partialData.buses = db.getBuses();
      if (fields.has('announcements')) partialData.announcements = db.getAnnouncements();
      if (fields.has('rooms')) partialData.rooms = allRooms;
      if (fields.has('attendance')) partialData.attendance = allAttendance;
      if (fields.has('submissions')) partialData.submissions = db.getSubmissions();

      return NextResponse.json(partialData, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    return NextResponse.json(
      {
        event: db.getEvent(),
        students: allStudents,
        mentors: allMentors,
        supportMentors: supportMentors,
        cohortMentors: cohortMentors,
        teachers: allTeachers,
        teams: allTeams,
        buses: db.getBuses(),
        announcements: db.getAnnouncements(),
        rooms: allRooms,
        attendance: allAttendance,
        submissions: db.getSubmissions(),
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
        try {
          await saveUserToFirestore(student);
        } catch (e) {
          console.warn('Firestore sync student:', e);
        }
        return NextResponse.json({ success: true, student });
      }

      case 'bulkCreateStudents': {
        const result = db.bulkCreateStudents(payload.students || []);
        const allToSync = [...result.created, ...result.updated];
        try {
          await Promise.all(allToSync.map((u) => saveUserToFirestore(u)));
        } catch (e) {
          console.warn('Firestore bulk sync error:', e);
        }
        const touchedTeamIds = Array.from(new Set(allToSync.map((u) => u.teamId).filter(Boolean) as string[]));
        try {
          await Promise.all(
            touchedTeamIds.map((tId) => {
              const t = db.getTeamById(tId);
              return t ? saveTeamToFirestore(t) : Promise.resolve(false);
            })
          );
        } catch (e) {
          console.warn('Firestore team sync error:', e);
        }
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
          try {
            await saveUserToFirestore(student);
            if (student.teamId) {
              const t = db.getTeamById(student.teamId);
              if (t) saveTeamToFirestore(t).catch(() => {});
            }
            if (student.busId) {
              const b = db.getBusById(student.busId);
              if (b) saveBusToFirestore(b).catch(() => {});
            }
          } catch (e) {
            console.warn('Firestore sync student update:', e);
          }
        }
        return NextResponse.json({ success: true, student });
      }

      case 'deleteStudent': {
        const ok = db.deleteStudent(payload.id);
        try {
          await deleteUserFromFirestore(payload.id);
        } catch (e) {
          console.warn('Firestore delete student:', e);
        }
        return NextResponse.json({ success: ok });
      }

      case 'createTeam': {
        const team = db.createTeam(payload);
        try {
          await saveTeamToFirestore(team);
        } catch (e) {
          console.warn('Firestore sync team:', e);
        }
        return NextResponse.json({ success: true, team });
      }

      case 'updateTeam': {
        const team = db.updateTeam(payload.id, payload.updates);
        if (team) {
          try {
            await saveTeamToFirestore(team);
            const userPromises: Promise<any>[] = [];
            (team.mentorIds || []).forEach((mId) => {
              const u = db.getUserById(mId);
              if (u) userPromises.push(saveUserToFirestore(u));
            });
            (team.studentIds || []).forEach((sId) => {
              const u = db.getUserById(sId);
              if (u) userPromises.push(saveUserToFirestore(u));
            });
            await Promise.all(userPromises);
          } catch (e) {
            console.warn('Firestore sync team update:', e);
          }
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
          const updatedStudent = db.getUserById(studentId);
          try {
            if (updatedTeam) await saveTeamToFirestore(updatedTeam);
            if (updatedStudent) await saveUserToFirestore(updatedStudent);
          } catch (e) {
            console.warn('Firestore sync assign student error:', e);
          }
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
          const updatedStudent = db.getUserById(studentId);
          try {
            if (updatedTeam) await saveTeamToFirestore(updatedTeam);
            if (updatedStudent) await saveUserToFirestore(updatedStudent);
          } catch (e) {
            console.warn('Firestore sync remove student error:', e);
          }
          return NextResponse.json({ success: true, team: updatedTeam });
        }
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      }

      case 'assignMentorToTeam': {
        const { teamId, mentorId } = payload;
        const res = db.assignMentorToTeam(teamId, mentorId);
        if (res) {
          try {
            await Promise.all([
              saveTeamToFirestore(res.team),
              saveUserToFirestore(res.mentor),
            ]);
          } catch (e) {
            console.warn('Firestore sync mentor assign:', e);
          }
          return NextResponse.json({ success: true, team: res.team, mentor: res.mentor });
        }
        return NextResponse.json({ error: 'Team or mentor not found' }, { status: 404 });
      }

      case 'removeMentorFromTeam': {
        const { teamId, mentorId } = payload;
        const res = db.removeMentorFromTeam(teamId, mentorId);
        if (res) {
          try {
            await saveTeamToFirestore(res.team);
            if (res.mentor?.id) await saveUserToFirestore(res.mentor);
          } catch (e) {
            console.warn('Firestore sync mentor remove:', e);
          }
          return NextResponse.json({ success: true, team: res.team, mentor: res.mentor });
        }
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      }

      case 'deleteTeam': {
        const ok = db.deleteTeam(payload.id);
        try {
          await deleteTeamFromFirestore(payload.id);
        } catch (e) {
          console.warn('Firestore delete team:', e);
        }
        return NextResponse.json({ success: ok });
      }

      case 'createMentor': {
        const mentor = db.createMentor(payload);
        try {
          await saveUserToFirestore(mentor);
        } catch (e) {
          console.warn('Firestore sync mentor:', e);
        }
        return NextResponse.json({ success: true, mentor });
      }

      case 'updateMentor': {
        const mentor = db.updateMentor(payload.id, payload.updates);
        if (mentor) {
          try {
            await saveUserToFirestore(mentor);
            await Promise.all(
              db.getTeams().map((team) => saveTeamToFirestore(team))
            );
          } catch (e) {
            console.warn('Firestore sync mentor update:', e);
          }
        }
        return NextResponse.json({ success: true, mentor });
      }

      case 'deleteMentor': {
        const ok = db.deleteMentor(payload.id);
        try {
          await deleteUserFromFirestore(payload.id);
        } catch (e) {
          console.warn('Firestore delete mentor:', e);
        }
        return NextResponse.json({ success: ok });
      }

      case 'createTeacher': {
        const teacher = db.createTeacher(payload);
        try {
          await saveUserToFirestore(teacher);
        } catch (e) {
          console.warn('Firestore sync teacher:', e);
        }
        return NextResponse.json({ success: true, teacher });
      }

      case 'updateTeacher': {
        const teacher = db.updateTeacher(payload.id, payload.updates);
        if (teacher) {
          try {
            await saveUserToFirestore(teacher);
          } catch (e) {
            console.warn('Firestore sync teacher update:', e);
          }
        }
        return NextResponse.json({ success: true, teacher });
      }

      case 'deleteTeacher': {
        const ok = db.deleteTeacher(payload.id);
        try {
          await deleteUserFromFirestore(payload.id);
        } catch (e) {
          console.warn('Firestore delete teacher:', e);
        }
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
        deleteAnnouncementFromFirestore(payload.id).catch(() => {});
        return NextResponse.json({ success: true });
      }

      case 'markAttendance': {
        const {
          studentId,
          status,
          verifiedBy,
          studentName,
          teamId,
          teamName,
          busId,
          busName,
        } = payload;
        let record = db.markAttendance(studentId, status || 'present', verifiedBy || 'mentor');
        if (!record || !record.id) {
          record = {
            id: `att-${studentId}`,
            sessionId: 'session-main',
            eventId: 'summit-2027',
            studentId,
            studentName: studentName || 'Student',
            teamId,
            teamName,
            busId,
            busName,
            status: status || 'present',
            verifiedBy: verifiedBy || 'mentor',
            verifiedAt: new Date().toISOString(),
            method: verifiedBy?.startsWith('room:') ? 'dynamic_room' : 'mentor_app',
          };
        }
        saveAttendanceToFirestore(record).catch((e) => console.warn('Firestore sync attendance:', e));
        return NextResponse.json({ success: true, record });
      }

      case 'batchMarkAttendance': {
        const { studentIds, status, verifiedBy, records: clientRecords } = payload;
        const targetIds: string[] = studentIds || [];
        db.batchMarkAttendance(targetIds, status || 'present', verifiedBy || 'mentor');
        const allAtt = db.getAttendance();
        const updated = allAtt.filter((a) => targetIds.includes(a.studentId));
        if (clientRecords && Array.isArray(clientRecords)) {
          clientRecords.forEach((cr: any) => {
            if (!updated.some((u) => u.studentId === cr.studentId)) {
              updated.push({
                ...cr,
                status: status || 'present',
                verifiedBy: verifiedBy || 'mentor',
                verifiedAt: new Date().toISOString(),
              });
            }
          });
        }
        Promise.all(updated.map((rec) => saveAttendanceToFirestore(rec))).catch((e) =>
          console.warn('Firestore batch attendance sync:', e)
        );
        return NextResponse.json({ success: true, count: targetIds.length, records: updated });
      }

      case 'createRoom':
      case 'saveRoom': {
        const room = db.saveRoom(payload);
        saveRoomToFirestore(room).catch((e) => console.warn('Firestore sync room:', e));
        return NextResponse.json({ success: true, room });
      }

      case 'toggleRoomActive': {
        const isActive = db.toggleRoomActive(payload.id);
        const room = db.getRoomById(payload.id);
        if (room) {
          saveRoomToFirestore(room).catch((e) => console.warn('Firestore sync toggleRoomActive:', e));
          return NextResponse.json({ success: true, isActive, room });
        }
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }

      case 'deleteRoom': {
        const ok = db.deleteRoom(payload.id);
        deleteRoomFromFirestore(payload.id).catch((e) => console.warn('Firestore delete room:', e));
        return NextResponse.json({ success: ok });
      }

      case 'submitToRoom': {
        const sub = db.submitToRoom(payload);
        const updatedRoom = db.getRoomById(payload.roomId);
        if (updatedRoom) {
          saveRoomToFirestore(updatedRoom).catch((e) =>
            console.warn('Firestore sync room submission count:', e)
          );
        }
        saveSubmissionToFirestore(sub).catch((e) =>
          console.warn('Firestore sync submission:', e)
        );
        if (sub.submittedBy?.userId) {
          const att = db.getAttendanceForStudent(sub.submittedBy.userId);
          if (att) {
            saveAttendanceToFirestore(att).catch((e) =>
              console.warn('Firestore sync attendance:', e)
            );
          }
        }
        return NextResponse.json({ success: true, submission: sub });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    console.error('API Data error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
