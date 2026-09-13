function getNodeFs(): any {
  try {
    if (typeof window === 'undefined' && typeof process !== 'undefined' && process.versions?.node) {
      return eval('require')('fs');
    }
  } catch {}
  return null;
}

function getNodePath(): any {
  try {
    if (typeof window === 'undefined' && typeof process !== 'undefined' && process.versions?.node) {
      return eval('require')('path');
    }
  } catch {}
  return null;
}

function getDataPaths(): { dataDir: string; dataFile: string } {
  const p = getNodePath();
  if (!p || typeof p.join !== 'function' || typeof process === 'undefined' || typeof process.cwd !== 'function') {
    return { dataDir: '', dataFile: '' };
  }
  try {
    const dataDir = p.join(process.cwd(), 'data');
    const dataFile = p.join(dataDir, 'summit.json');
    return { dataDir, dataFile };
  } catch {
    return { dataDir: '', dataFile: '' };
  }
}

import {
  User,
  Team,
  Bus,
  Room,
  RoomSubmission,
  AttendanceRecord,
  Photo,
  Announcement,
  ActivityLog,
  EventInfo,
  AttendanceStatus,
} from '@/types';
import {
  INITIAL_STUDENTS,
  INITIAL_MENTORS,
  INITIAL_FACULTY,
  INITIAL_JUDGES,
  INITIAL_TEAMS,
  INITIAL_BUSES,
  INITIAL_ROOMS,
  INITIAL_ATTENDANCE,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_PHOTOS,
} from './seed-data';
import summitSeedData from '../../data/summit.json';

interface DatabaseSchema {
  event: EventInfo;
  users: User[];
  teams: Team[];
  buses: Bus[];
  rooms: Room[];
  submissions: RoomSubmission[];
  attendance: AttendanceRecord[];
  photos: Photo[];
  announcements: Announcement[];
  activityLogs: ActivityLog[];
  scores: Record<string, { innovation: number; execution: number; presentation: number }>;
}

class PersistentDatabase {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadFromFile();
  }

  private getDefaultAdmin(): User {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@summitconnect.org').trim().toLowerCase();
    return {
      id: 'admin-root',
      eventId: 'summit-2027',
      role: 'admin',
      fullName: 'Master Administrator',
      email: adminEmail,
      phone: '+91 000 000 0000',
      status: 'active',
      createdAt: new Date().toISOString(),
    };
  }

  private syncAdminEmail(schema: DatabaseSchema): void {
    const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    if (!adminEmail) return;
    const adminUser = schema.users.find((u) => u.role === 'admin' || u.id === 'admin-root');
    if (adminUser) {
      adminUser.email = adminEmail;
    }
  }

  private loadFromFile(): DatabaseSchema {
    try {
      const nodeFs = getNodeFs();
      const { dataFile } = getDataPaths();
      if (nodeFs && typeof nodeFs.existsSync === 'function' && dataFile && nodeFs.existsSync(dataFile)) {
        const raw = nodeFs.readFileSync(dataFile, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.users) && parsed.users.length > 0) {
          this.syncAdminEmail(parsed);
          return parsed;
        }
      }
    } catch (err) {
      console.error('Error reading summit.json, initializing fresh database:', err);
    }

    // Cloud / Vercel Serverless Fallback: Use bundled summit.json
    if (summitSeedData && Array.isArray((summitSeedData as any).users)) {
      const cloned = JSON.parse(JSON.stringify(summitSeedData)) as DatabaseSchema;
      this.syncAdminEmail(cloned);
      return cloned;
    }

    // Clean initial state (Zero fake records)
    const adminUser = this.getDefaultAdmin();
    const cleanState: DatabaseSchema = {
      event: {
        id: 'summit-2027',
        name: 'Sangam 2027',
        venue: 'Grand Tech Convention Pavilion & Innovation Hub',
        startDate: '2027-09-12T08:00:00.000Z',
        endDate: '2027-09-14T18:00:00.000Z',
        status: 'active',
        stats: {
          totalStudents: 0,
          totalMentors: 0,
          totalFaculty: 0,
          totalJudges: 0,
          totalTeams: 0,
          totalBuses: 0,
        },
      },
      users: [adminUser],
      teams: [],
      buses: [],
      rooms: [],
      submissions: [],
      attendance: [],
      photos: [],
      announcements: [],
      activityLogs: [
        {
          id: `act_${Date.now()}`,
          eventId: 'summit-2027',
          actorId: adminUser.id,
          actorName: adminUser.fullName,
          actorRole: 'admin',
          action: 'USER_LOGIN',
          targetEntity: 'system',
          details: { message: 'Clean summit workspace initialized' },
          timestamp: new Date().toISOString(),
        },
      ],
      scores: {},
    };

    this.saveToFile(cleanState);
    return cleanState;
  }

  private saveToFile(state?: DatabaseSchema): void {
    const nodeFs = getNodeFs();
    const { dataDir, dataFile } = getDataPaths();
    if (!nodeFs || typeof nodeFs.existsSync !== 'function' || !dataDir || !dataFile) return;
    try {
      if (!nodeFs.existsSync(dataDir)) {
        nodeFs.mkdirSync(dataDir, { recursive: true });
      }
      nodeFs.writeFileSync(dataFile, JSON.stringify(state || this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error persisting summit database to disk:', err);
    }
  }

  reload(): void {
    const nodeFs = getNodeFs();
    const { dataFile } = getDataPaths();
    if (nodeFs && typeof nodeFs.existsSync === 'function' && dataFile && nodeFs.existsSync(dataFile)) {
      try {
        const raw = nodeFs.readFileSync(dataFile, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.users) && parsed.users.length > 0) {
          this.syncAdminEmail(parsed);
          this.data = parsed;
          return;
        }
      } catch (err) {
        // read contention fallback
      }
    }
    if ((!this.data || !this.data.users || this.data.users.length <= 1) && summitSeedData && Array.isArray((summitSeedData as any).users)) {
      const cloned = JSON.parse(JSON.stringify(summitSeedData)) as DatabaseSchema;
      this.syncAdminEmail(cloned);
      this.data = cloned;
    }
  }

  // Event
  getEvent(): EventInfo {
    this.reload();
    const students = this.getStudents();
    const mentors = this.getMentors();
    const teachers = this.getTeachers();

    return {
      ...this.data.event,
      stats: {
        totalStudents: students.length,
        totalMentors: mentors.length,
        totalFaculty: teachers.length,
        totalJudges: teachers.length,
        totalTeams: this.data.teams.length,
        totalBuses: this.data.buses.length,
      },
    };
  }

  // Users & Roles
  getUsers(role?: string): User[] {
    this.reload();
    if (role) {
      if (role === 'teacher' || role === 'faculty' || role === 'judge') {
        return this.data.users.filter((u) => u.role === 'teacher' || u.role === 'faculty' || u.role === 'judge');
      }
      return this.data.users.filter((u) => u.role === role);
    }
    return this.data.users;
  }

  getStudents(): User[] {
    return this.getUsers('student');
  }

  getMentors(): User[] {
    return this.getUsers('mentor');
  }

  getTeachers(): User[] {
    return this.data.users.filter((u) => u.role === 'teacher' || u.role === 'faculty' || u.role === 'judge');
  }

  getFaculty(): User[] {
    return this.getTeachers();
  }

  getJudges(): User[] {
    return this.getTeachers();
  }

  getUserById(id: string): User | undefined {
    this.reload();
    return this.data.users.find((u) => u.id === id);
  }

  getUserByEmail(email: string): User | undefined {
    this.reload();
    const clean = email.trim().toLowerCase();
    return this.data.users.find((u) => u.email.toLowerCase() === clean);
  }

  getUserByEmailOrPhone(identifier: string): User | undefined {
    this.reload();
    const clean = identifier.trim().toLowerCase();
    const cleanDigits = identifier.replace(/\D/g, '');
    return this.data.users.find((u) => {
      if (u.email && u.email.toLowerCase() === clean) return true;
      if (cleanDigits.length >= 7 && u.phone) {
        const uDigits = u.phone.replace(/\D/g, '');
        if (uDigits.slice(-10) === cleanDigits.slice(-10)) return true;
      }
      return false;
    });
  }

  createStudent(data: {
    fullName: string;
    email?: string;
    phone?: string;
    teamId?: string;
    busId?: string;
    branch?: string;
    year?: string;
    isProvisionalEmail?: boolean;
  }): User {
    const id = `stu-${Date.now().toString(36).slice(-4)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const team = data.teamId ? this.getTeamById(data.teamId) : undefined;
    const bus = data.busId ? this.getBusById(data.busId) : undefined;

    const phone = data.phone?.trim() || '+91 000 000 0000';
    const cleanDigits = phone.replace(/\D/g, '');

    let email = (data.email || '').trim().toLowerCase();
    let isProvisional = !!data.isProvisionalEmail;

    if (!email) {
      isProvisional = true;
      if (cleanDigits.length >= 10) {
        email = `${cleanDigits.slice(-10)}@student.sangam.org`;
      } else {
        const slug = data.fullName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || 'student';
        email = `${slug}.${Date.now().toString(36).slice(-4)}@student.sangam.org`;
      }
    }

    const newStudent: User = {
      id,
      eventId: 'summit-2027',
      role: 'student',
      fullName: data.fullName.trim(),
      email,
      isProvisionalEmail: isProvisional,
      phone,
      teamId: data.teamId || undefined,
      teamName: team?.name,
      mentorId: team?.mentorIds[0],
      mentorName: team?.mentors?.[0]?.name,
      busId: data.busId || undefined,
      busName: bus?.name,
      branch: data.branch?.trim() || 'CSE',
      year: data.year?.trim() || '1st Year',
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    this.data.users.push(newStudent);

    // If team assigned, update team members list
    if (data.teamId && team) {
      if (!team.studentIds.includes(id)) {
        team.studentIds.push(id);
      }
    }

    // If bus assigned, update bus passengers list
    if (data.busId && bus) {
      if (!bus.assignedStudentIds.includes(id)) {
        bus.assignedStudentIds.push(id);
      }
    }

    // Initialize attendance record as 'absent' / pending
    this.data.attendance.push({
      id: `att-${id}`,
      sessionId: 'session-main',
      eventId: 'summit-2027',
      studentId: id,
      studentName: newStudent.fullName,
      teamId: newStudent.teamId,
      teamName: newStudent.teamName,
      busId: newStudent.busId,
      busName: newStudent.busName,
      status: 'absent',
      verifiedBy: 'system',
      verifiedAt: new Date().toISOString(),
      method: 'manual_admin',
    });

    this.logActivity({
      id: `act_${Date.now()}`,
      eventId: 'summit-2027',
      actorId: 'admin',
      actorName: 'Administrator',
      actorRole: 'admin',
      action: 'USER_MODIFIED',
      targetEntity: `users/${id}`,
      details: { action: 'CREATED_STUDENT', name: newStudent.fullName },
      timestamp: new Date().toISOString(),
    });

    this.saveToFile();
    return newStudent;
  }

  bulkCreateStudents(items: Array<{
    fullName: string;
    email?: string;
    phone?: string;
    branch?: string;
    year?: string;
    teamNameOrId?: string;
    busNameOrId?: string;
    existingId?: string;
  }>): { created: User[]; updated: User[]; skipped: number } {
    this.reload();
    const created: User[] = [];
    const updated: User[] = [];
    let skipped = 0;

    for (const item of items) {
      const fullName = (item.fullName || '').trim();
      if (!fullName || fullName.length < 2) {
        skipped++;
        continue;
      }

      const rawEmail = (item.email || '').trim().toLowerCase();
      const hasRealEmail =
        rawEmail.length > 0 &&
        rawEmail.includes('@') &&
        rawEmail.includes('.') &&
        !rawEmail.endsWith('@student.sangam.org');
      const cleanPhone = (item.phone || '').trim();
      const phoneDigits = cleanPhone.replace(/\D/g, '');
      const normName = fullName.toLowerCase().replace(/\s+/g, ' ');

      // Find existing student by hierarchy:
      // 1. Explicit existingId
      // 2. Phone match (last 10 digits)
      // 3. Email match (if provided)
      // 4. Full Name match
      let existing: User | undefined = undefined;

      if (item.existingId) {
        existing = this.getUserById(item.existingId);
      }

      if (!existing && phoneDigits.length >= 7) {
        existing = this.data.users.find(
          (u) =>
            u.role === 'student' &&
            u.phone &&
            u.phone.replace(/\D/g, '').slice(-10) === phoneDigits.slice(-10)
        );
      }

      if (!existing && hasRealEmail) {
        existing = this.getUserByEmail(rawEmail);
      }

      if (!existing) {
        existing = this.data.users.find(
          (u) =>
            u.role === 'student' &&
            u.fullName &&
            u.fullName.trim().toLowerCase().replace(/\s+/g, ' ') === normName
        );
      }

      // Resolve team if provided
      let matchedTeamId: string | undefined = undefined;
      if (item.teamNameOrId) {
        const query = item.teamNameOrId.trim().toLowerCase();
        const foundTeam = this.data.teams.find(
          (t) => t.id.toLowerCase() === query || t.name.toLowerCase() === query
        );
        if (foundTeam) {
          matchedTeamId = foundTeam.id;
        }
      }

      // Resolve bus if provided
      let matchedBusId: string | undefined = undefined;
      if (item.busNameOrId) {
        const query = item.busNameOrId.trim().toLowerCase();
        const foundBus = this.data.buses.find(
          (b) => b.id.toLowerCase() === query || b.name.toLowerCase() === query
        );
        if (foundBus) {
          matchedBusId = foundBus.id;
        }
      }

      if (existing) {
        // Update existing student record
        const updates: Partial<User> = {
          fullName: fullName,
        };

        // If newly provided email is real and valid, update it
        if (hasRealEmail) {
          updates.email = rawEmail;
          updates.isProvisionalEmail = false;
        }

        if (cleanPhone && cleanPhone !== '+91 000 000 0000' && cleanPhone !== '+1 000 000 0000') {
          updates.phone = cleanPhone;
        }
        if (item.branch) updates.branch = item.branch.trim();
        if (item.year) updates.year = item.year.trim();
        if (matchedTeamId !== undefined) updates.teamId = matchedTeamId;
        if (matchedBusId !== undefined) updates.busId = matchedBusId;

        const updatedUser = this.updateStudent(existing.id, updates);
        if (updatedUser) updated.push(updatedUser);
      } else {
        // Create new student (email can be empty/omitted — createStudent will assign provisional email)
        const newStudent = this.createStudent({
          fullName: fullName,
          email: hasRealEmail ? rawEmail : undefined,
          phone: cleanPhone || '+91 000 000 0000',
          branch: item.branch?.trim() || 'CSE',
          year: item.year?.trim() || '1st Year',
          teamId: matchedTeamId,
          busId: matchedBusId,
          isProvisionalEmail: !hasRealEmail,
        });
        created.push(newStudent);
      }
    }

    this.saveToFile();
    return { created, updated, skipped };
  }

  updateStudent(
    id: string,
    updates: Partial<Pick<User, 'fullName' | 'email' | 'phone' | 'teamId' | 'busId' | 'branch' | 'year' | 'isProvisionalEmail'>>
  ): User | undefined {
    const student = this.getUserById(id);
    if (!student) return undefined;

    if (updates.fullName) student.fullName = updates.fullName.trim();
    if (updates.email) {
      const cleanEmail = updates.email.trim().toLowerCase();
      if (cleanEmail && !cleanEmail.endsWith('@student.sangam.org')) {
        student.email = cleanEmail;
        student.isProvisionalEmail = false;
      } else if (cleanEmail) {
        student.email = cleanEmail;
      }
    }
    if (updates.isProvisionalEmail !== undefined) {
      student.isProvisionalEmail = updates.isProvisionalEmail;
    }
    if (updates.phone) student.phone = updates.phone.trim();
    if (updates.branch) student.branch = updates.branch.trim();
    if (updates.year) student.year = updates.year.trim();

    if (updates.teamId !== undefined) {
      const oldTeamId = student.teamId;
      const newTeamId = updates.teamId || undefined;
      student.teamId = newTeamId;
      const team = newTeamId ? this.getTeamById(newTeamId) : undefined;
      student.teamName = team?.name;
      student.mentorId = team?.mentorIds[0];
      student.mentorName = team?.mentors?.[0]?.name;

      // Clean from old team and add to new team
      if (oldTeamId && oldTeamId !== newTeamId) {
        const oldTeam = this.getTeamById(oldTeamId);
        if (oldTeam) {
          oldTeam.studentIds = oldTeam.studentIds.filter((sId) => sId !== id);
        }
      }
      if (newTeamId && team) {
        if (!team.studentIds.includes(id)) {
          team.studentIds.push(id);
        }
      }
    }

    if (updates.busId !== undefined) {
      const oldBusId = student.busId;
      const newBusId = updates.busId || undefined;
      student.busId = newBusId;
      const bus = newBusId ? this.getBusById(newBusId) : undefined;
      student.busName = bus?.name;

      // Clean from old bus and add to new bus
      if (oldBusId && oldBusId !== newBusId) {
        const oldBus = this.getBusById(oldBusId);
        if (oldBus) {
          oldBus.assignedStudentIds = oldBus.assignedStudentIds.filter((sId) => sId !== id);
        }
      }
      if (newBusId && bus) {
        if (!bus.assignedStudentIds.includes(id)) {
          bus.assignedStudentIds.push(id);
        }
      }
    }

    student.updatedAt = new Date().toISOString();

    // Sync with attendance record
    const att = this.data.attendance.find((a) => a.studentId === id);
    if (att) {
      att.studentName = student.fullName;
      att.teamId = student.teamId;
      att.teamName = student.teamName;
      att.busId = student.busId;
      att.busName = student.busName;
    }

    this.saveToFile();
    return student;
  }

  deleteStudent(id: string): boolean {
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx >= 0) {
      this.data.users.splice(idx, 1);
      this.data.attendance = this.data.attendance.filter((a) => a.studentId !== id);
      this.data.teams.forEach((t) => {
        t.studentIds = t.studentIds.filter((sId) => sId !== id);
      });
      this.data.buses.forEach((b) => {
        b.assignedStudentIds = b.assignedStudentIds.filter((sId) => sId !== id);
      });
      this.saveToFile();
      return true;
    }
    return false;
  }

  createMentor(data: {
    fullName: string;
    email: string;
    phone: string;
    teamId?: string;
    club?: string;
    branch?: string;
    year?: string;
    mentorType?: 'cohort' | 'support';
  }): User {
    const id = `mentor-${Date.now().toString(36).slice(-4)}`;
    const isSupport = data.mentorType === 'support' || !data.teamId;
    const team = !isSupport && data.teamId ? this.getTeamById(data.teamId) : undefined;

    const newMentor: User = {
      id,
      eventId: 'summit-2027',
      role: 'mentor',
      fullName: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      teamId: isSupport ? undefined : (data.teamId || undefined),
      teamName: isSupport ? undefined : team?.name,
      club: data.club?.trim() || 'Smart City Lab',
      branch: data.branch?.trim() || 'CSE',
      year: data.year?.trim() || '4th Year',
      mentorType: isSupport ? 'support' : 'cohort',
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    this.data.users.push(newMentor);

    if (!isSupport && data.teamId && team) {
      if (!team.mentorIds.includes(id)) {
        team.mentorIds.push(id);
        team.mentors = team.mentors || [];
        team.mentors.push({
          id,
          name: newMentor.fullName,
          phone: newMentor.phone,
          email: newMentor.email,
          club: newMentor.club,
          branch: newMentor.branch,
          year: newMentor.year,
        });
      }
    }

    this.saveToFile();
    return newMentor;
  }

  getSupportMentors(): User[] {
    return this.getMentors().filter((m) => m.mentorType === 'support' || !m.teamId);
  }

  getCohortMentors(): User[] {
    return this.getMentors().filter((m) => m.mentorType === 'cohort' && m.teamId);
  }

  updateMentor(
    id: string,
    updates: Partial<Pick<User, 'fullName' | 'email' | 'phone' | 'club' | 'branch' | 'year' | 'mentorType' | 'teamId'>>
  ): User | undefined {
    const mentor = this.data.users.find((u) => u.id === id && u.role === 'mentor');
    if (!mentor) return undefined;

    if (updates.fullName !== undefined) mentor.fullName = updates.fullName.trim();
    if (updates.email !== undefined) mentor.email = updates.email.trim().toLowerCase();
    if (updates.phone !== undefined) mentor.phone = updates.phone.trim();
    if (updates.club !== undefined) mentor.club = updates.club.trim();
    if (updates.branch !== undefined) mentor.branch = updates.branch.trim();
    if (updates.year !== undefined) mentor.year = updates.year.trim();

    const reqType = updates.mentorType;
    const reqTeamId = updates.teamId;

    if (
      reqType === 'support' ||
      reqTeamId === '' ||
      reqTeamId === null ||
      (reqTeamId === undefined && mentor.mentorType === 'support') ||
      (reqType === 'cohort' && !reqTeamId && reqTeamId !== undefined)
    ) {
      mentor.mentorType = 'support';
      mentor.teamId = undefined;
      mentor.teamName = undefined;
    } else if (reqTeamId) {
      mentor.mentorType = 'cohort';
      mentor.teamId = reqTeamId;
      const team = this.getTeamById(reqTeamId);
      mentor.teamName = team?.name;
    } else if (reqType !== undefined) {
      mentor.mentorType = reqType;
    }

    mentor.updatedAt = new Date().toISOString();

    // Synchronize mentor in teams
    this.data.teams.forEach((t) => {
      t.mentorIds = (t.mentorIds || []).filter((mId) => mId !== id);
      t.mentors = (t.mentors || []).filter((m) => m.id !== id);
    });

    if (mentor.mentorType === 'cohort' && mentor.teamId) {
      const assignedTeam = this.getTeamById(mentor.teamId);
      if (assignedTeam) {
        assignedTeam.mentorIds = assignedTeam.mentorIds || [];
        if (!assignedTeam.mentorIds.includes(id)) {
          assignedTeam.mentorIds.push(id);
        }
        assignedTeam.mentors = assignedTeam.mentors || [];
        assignedTeam.mentors.push({
          id: mentor.id,
          name: mentor.fullName,
          phone: mentor.phone,
          email: mentor.email,
          club: mentor.club,
          branch: mentor.branch,
          year: mentor.year,
        });
      }
    }

    // Update students who reference this mentor
    this.data.users.forEach((u) => {
      if (u.role === 'student' && u.mentorId === id) {
        u.mentorName = mentor.fullName;
      }
    });

    this.saveToFile();
    return mentor;
  }

  deleteMentor(id: string): boolean {
    const idx = this.data.users.findIndex((u) => u.id === id && u.role === 'mentor');
    if (idx >= 0) {
      this.data.users.splice(idx, 1);
      this.data.teams.forEach((t) => {
        t.mentorIds = t.mentorIds.filter((mId) => mId !== id);
        t.mentors = t.mentors?.filter((m) => m.id !== id);
      });
      this.saveToFile();
      return true;
    }
    return false;
  }

  createTeacher(data: { fullName: string; email: string; phone: string; department?: string }): User {
    const id = `tch-${Date.now().toString(36).slice(-4)}`;
    const newTeacher: User = {
      id,
      eventId: 'summit-2027',
      role: 'teacher',
      fullName: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim() || '+1 000 000 0000',
      department: data.department?.trim() || 'General Faculty',
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    this.data.users.push(newTeacher);
    this.saveToFile();
    return newTeacher;
  }

  updateTeacher(
    id: string,
    updates: Partial<Pick<User, 'fullName' | 'email' | 'phone' | 'department'>>
  ): User | undefined {
    const teacher = this.data.users.find(
      (u) => u.id === id && (u.role === 'teacher' || u.role === 'faculty' || u.role === 'judge')
    );
    if (!teacher) return undefined;

    if (updates.fullName !== undefined) teacher.fullName = updates.fullName.trim();
    if (updates.email !== undefined) teacher.email = updates.email.trim().toLowerCase();
    if (updates.phone !== undefined) teacher.phone = updates.phone.trim();
    if (updates.department !== undefined) teacher.department = updates.department.trim();

    teacher.updatedAt = new Date().toISOString();
    this.saveToFile();
    return teacher;
  }

  deleteTeacher(id: string): boolean {
    const idx = this.data.users.findIndex(
      (u) => u.id === id && (u.role === 'teacher' || u.role === 'faculty' || u.role === 'judge')
    );
    if (idx >= 0) {
      this.data.users.splice(idx, 1);
      this.saveToFile();
      return true;
    }
    return false;
  }

  createJudge(data: { fullName: string; email: string; phone: string }): User {
    return this.createTeacher(data);
  }

  deleteJudge(id: string): boolean {
    return this.deleteTeacher(id);
  }

  createFaculty(data: { fullName: string; email: string; phone: string; department?: string }): User {
    return this.createTeacher(data);
  }

  deleteFaculty(id: string): boolean {
    return this.deleteTeacher(id);
  }

  deleteBus(id: string): boolean {
    const idx = this.data.buses.findIndex((b) => b.id === id);
    if (idx >= 0) {
      this.data.buses.splice(idx, 1);
      this.data.users.forEach((u) => {
        if (u.busId === id) {
          u.busId = undefined;
          u.busName = undefined;
        }
      });
      this.saveToFile();
      return true;
    }
    return false;
  }

  // Teams CRUD
  getTeams(): Team[] {
    this.reload();
    return this.data.teams.map((t) => {
      const assignedMentors = this.data.users.filter(
        (u) => u.role === 'mentor' && (u.teamId === t.id || t.mentorIds?.includes(u.id))
      );
      const mentorIds = Array.from(new Set([...(t.mentorIds || []), ...assignedMentors.map((m) => m.id)]));
      const mentors = assignedMentors.map((m) => ({
        id: m.id,
        name: m.fullName,
        phone: m.phone,
        email: m.email,
        club: m.club,
        branch: m.branch,
        year: m.year,
      }));

      const assignedStudents = this.data.users.filter(
        (u) => u.role === 'student' && (u.teamId === t.id || t.studentIds?.includes(u.id))
      );
      const studentIds = Array.from(new Set([...(t.studentIds || []), ...assignedStudents.map((s) => s.id)]));

      return {
        ...t,
        mentorIds,
        mentors,
        studentIds,
      };
    });
  }

  getTeamById(id: string): Team | undefined {
    const t = this.data.teams.find((x) => x.id === id);
    if (!t) return undefined;
    const assignedMentors = this.data.users.filter(
      (u) => u.role === 'mentor' && (u.teamId === t.id || t.mentorIds?.includes(u.id))
    );
    t.mentorIds = Array.from(new Set([...(t.mentorIds || []), ...assignedMentors.map((m) => m.id)]));
    t.mentors = assignedMentors.map((m) => ({
      id: m.id,
      name: m.fullName,
      phone: m.phone,
      email: m.email,
      club: m.club,
      branch: m.branch,
      year: m.year,
    }));
    const assignedStudents = this.data.users.filter(
      (u) => u.role === 'student' && (u.teamId === t.id || t.studentIds?.includes(u.id))
    );
    t.studentIds = Array.from(new Set([...(t.studentIds || []), ...assignedStudents.map((s) => s.id)]));
    return t;
  }

  createTeam(data: {
    name: string;
    color?: string;
    tableNumber?: string;
    mentorIds?: string[];
    studentIds?: string[];
    busId?: string;
  }): Team {
    const id = `team-${Date.now().toString(36).slice(-4)}`;
    const bus = data.busId ? this.getBusById(data.busId) : undefined;
    const mentors = (data.mentorIds || [])
      .map((mId) => {
        const m = this.getUserById(mId);
        return m ? {
          id: m.id,
          name: m.fullName,
          phone: m.phone,
          email: m.email,
          club: m.club,
          branch: m.branch,
          year: m.year,
        } : null;
      })
      .filter(Boolean) as { id: string; name: string; phone?: string; email?: string; club?: string; branch?: string; year?: string }[];

    const newTeam: Team = {
      id,
      eventId: 'summit-2027',
      name: data.name.trim(),
      color: data.color || '#2563EB',
      mentorIds: data.mentorIds || [],
      mentors,
      studentIds: data.studentIds || [],
      busId: data.busId,
      busName: bus?.name,
      tableNumber: data.tableNumber?.trim() || `Table ${this.data.teams.length + 1}`,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    this.data.teams.push(newTeam);

    // Link mentors to team
    if (data.mentorIds) {
      data.mentorIds.forEach((mId) => {
        const m = this.getUserById(mId);
        if (m) {
          m.teamId = id;
          m.teamName = newTeam.name;
        }
      });
    }

    // Link students to team
    if (data.studentIds) {
      data.studentIds.forEach((sId) => {
        const s = this.getUserById(sId);
        if (s) {
          s.teamId = id;
          s.teamName = newTeam.name;
          s.mentorId = mentors[0]?.id;
          s.mentorName = mentors[0]?.name;
        }
      });
    }

    this.saveToFile();
    return newTeam;
  }

  deleteTeam(id: string): boolean {
    const idx = this.data.teams.findIndex((t) => t.id === id);
    if (idx >= 0) {
      this.data.teams.splice(idx, 1);
      // Detach students from this team
      this.data.users.forEach((u) => {
        if (u.teamId === id) {
          u.teamId = undefined;
          u.teamName = undefined;
        }
      });
      // Detach mentors from this team
      this.data.users.forEach((u) => {
        if (u.role === 'mentor' && u.teamId === id) {
          u.teamId = undefined;
          u.teamName = undefined;
        }
      });
      this.saveToFile();
      return true;
    }
    return false;
  }

  updateTeam(
    id: string,
    updates: {
      name?: string;
      color?: string;
      tableNumber?: string;
      mentorIds?: string[];
      studentIds?: string[];
      busId?: string;
    }
  ): Team | undefined {
    const team = this.getTeamById(id);
    if (!team) return undefined;

    if (updates.name !== undefined) team.name = updates.name.trim();
    if (updates.color !== undefined) team.color = updates.color;
    if (updates.tableNumber !== undefined) team.tableNumber = updates.tableNumber.trim();
    if (updates.busId !== undefined) {
      team.busId = updates.busId;
      const bus = updates.busId ? this.getBusById(updates.busId) : undefined;
      team.busName = bus?.name;
    }

    if (updates.mentorIds !== undefined) {
      // Unlink previous mentors not in list
      team.mentorIds.forEach((mId) => {
        if (!updates.mentorIds?.includes(mId)) {
          const m = this.getUserById(mId);
          if (m && m.teamId === id) {
            m.teamId = undefined;
            m.teamName = undefined;
            m.mentorType = 'support';
          }
        }
      });
      team.mentorIds = updates.mentorIds;
      team.mentors = updates.mentorIds
        .map((mId) => {
          const m = this.getUserById(mId);
          if (m) {
            m.teamId = id;
            m.teamName = team.name;
            m.mentorType = 'cohort';
            return {
              id: m.id,
              name: m.fullName,
              phone: m.phone,
              email: m.email,
              club: m.club,
              branch: m.branch,
              year: m.year,
            };
          }
          return null;
        })
        .filter(Boolean) as any[];
    }

    if (updates.studentIds !== undefined) {
      // Unlink removed students
      team.studentIds.forEach((sId) => {
        if (!updates.studentIds?.includes(sId)) {
          const s = this.getUserById(sId);
          if (s && s.teamId === id) {
            s.teamId = undefined;
            s.teamName = undefined;
            s.mentorId = undefined;
            s.mentorName = undefined;
          }
        }
      });
      team.studentIds = updates.studentIds;
      updates.studentIds.forEach((sId) => {
        const s = this.getUserById(sId);
        if (s) {
          s.teamId = id;
          s.teamName = team.name;
          if (team.mentors && team.mentors[0]) {
            s.mentorId = team.mentors[0].id;
            s.mentorName = team.mentors[0].name;
          }
        }
      });
    }

    this.saveToFile();
    return team;
  }

  assignMentorToTeam(teamId: string, mentorId: string): { team: Team; mentor: User } | undefined {
    this.reload();
    const team = this.data.teams.find((t) => t.id === teamId);
    const mentor = this.data.users.find((u) => u.id === mentorId && u.role === 'mentor');
    if (!team || !mentor) return undefined;

    // Remove mentor from any other team first
    this.data.teams.forEach((t) => {
      t.mentorIds = (t.mentorIds || []).filter((mId) => mId !== mentorId);
      t.mentors = (t.mentors || []).filter((m) => m.id !== mentorId);
    });

    // Assign to new team
    team.mentorIds = Array.from(new Set([...(team.mentorIds || []), mentorId]));
    team.mentors = team.mentors || [];
    if (!team.mentors.some((m) => m.id === mentorId)) {
      team.mentors.push({
        id: mentor.id,
        name: mentor.fullName,
        phone: mentor.phone,
        email: mentor.email,
        club: mentor.club,
        branch: mentor.branch,
        year: mentor.year,
      });
    }

    mentor.teamId = teamId;
    mentor.teamName = team.name;
    mentor.mentorType = 'cohort';
    mentor.updatedAt = new Date().toISOString();

    this.saveToFile();
    return { team, mentor };
  }

  removeMentorFromTeam(teamId: string, mentorId: string): { team: Team; mentor: User } | undefined {
    this.reload();
    const team = this.data.teams.find((t) => t.id === teamId);
    const mentor = this.data.users.find((u) => u.id === mentorId);
    if (!team) return undefined;

    // Remove from team
    team.mentorIds = (team.mentorIds || []).filter((mId) => mId !== mentorId);
    team.mentors = (team.mentors || []).filter((m) => m.id !== mentorId);

    // Unassign mentor
    if (mentor) {
      mentor.teamId = undefined;
      mentor.teamName = undefined;
      mentor.mentorType = 'support';
      mentor.updatedAt = new Date().toISOString();
    }

    // Ensure all user instances of this mentor have teamId cleared
    this.data.users.forEach((u) => {
      if (u.id === mentorId) {
        u.teamId = undefined;
        u.teamName = undefined;
        u.mentorType = 'support';
        u.updatedAt = new Date().toISOString();
      }
    });

    this.saveToFile();
    return { team, mentor: mentor || ({} as User) };
  }

  // Buses CRUD
  getBuses(): Bus[] {
    this.reload();
    return this.data.buses;
  }

  getBusById(id: string): Bus | undefined {
    return this.data.buses.find((b) => b.id === id);
  }

  createBus(data: {
    name: string;
    driverName: string;
    driverPhone: string;
    vehicleNumber: string;
    capacity: number;
  }): Bus {
    const id = `bus-${Date.now().toString(36).slice(-4)}`;
    const newBus: Bus = {
      id,
      eventId: 'summit-2027',
      name: data.name.trim(),
      driverName: data.driverName.trim(),
      driverPhone: data.driverPhone.trim(),
      vehicleNumber: data.vehicleNumber.trim().toUpperCase(),
      capacity: data.capacity || 40,
      assignedMentorIds: [],
      assignedStudentIds: [],
      status: 'boarding',
      createdAt: new Date().toISOString(),
    };
    this.data.buses.push(newBus);
    this.saveToFile();
    return newBus;
  }

  updateBusStatus(id: string, status: Bus['status']): Bus | undefined {
    const bus = this.getBusById(id);
    if (bus) {
      bus.status = status;
      this.saveToFile();
    }
    return bus;
  }

  // Dynamic Rooms CRUD
  getRooms(): Room[] {
    this.reload();
    return this.data.rooms;
  }

  getRoomById(id: string): Room | undefined {
    return this.data.rooms.find((r) => r.id === id);
  }

  createRoom(room: Room): Room {
    this.data.rooms.unshift(room);
    this.logActivity({
      id: `act_${Date.now()}`,
      eventId: room.eventId,
      actorId: room.createdBy,
      actorName: 'Administrator',
      actorRole: 'admin',
      action: 'ROOM_CREATED',
      targetEntity: `rooms/${room.id}`,
      details: { title: room.title, category: room.category },
      timestamp: new Date().toISOString(),
    });
    this.saveToFile();
    return room;
  }

  saveRoom(room: Room): Room {
    const idx = this.data.rooms.findIndex((r) => r.id === room.id);
    if (idx >= 0) {
      this.data.rooms[idx] = room;
    } else {
      this.data.rooms.unshift(room);
    }
    this.saveToFile();
    return room;
  }

  toggleRoomActive(id: string): boolean {
    const room = this.getRoomById(id);
    if (room) {
      room.isActive = !room.isActive;
      this.saveToFile();
      return room.isActive;
    }
    return false;
  }

  submitToRoom(submission: RoomSubmission): RoomSubmission {
    this.data.submissions.unshift(submission);
    const room = this.getRoomById(submission.roomId);
    if (room) {
      room.submissionCount = (room.submissionCount || 0) + 1;
      if (room.category === 'attendance' && submission.submittedBy?.userId) {
        this.markAttendance(submission.submittedBy.userId, 'present', `room:${room.id}`);
      }
    }
    this.saveToFile();
    return submission;
  }

  getSubmissions(roomId?: string): RoomSubmission[] {
    if (roomId) {
      return this.data.submissions.filter((s) => s.roomId === roomId);
    }
    return this.data.submissions;
  }

  // Attendance
  getAttendance(): AttendanceRecord[] {
    this.reload();
    return this.data.attendance;
  }

  getAttendanceForStudent(studentId: string): AttendanceRecord | undefined {
    return this.data.attendance.find((a) => a.studentId === studentId);
  }

  markAttendance(
    studentId: string,
    status: AttendanceStatus,
    verifiedBy: string
  ): AttendanceRecord {
    let rec = this.data.attendance.find((a) => a.studentId === studentId);
    const student = this.getUserById(studentId);

    if (rec) {
      rec.status = status;
      rec.verifiedBy = verifiedBy;
      rec.verifiedAt = new Date().toISOString();
    } else if (student) {
      rec = {
        id: `att-${student.id}`,
        sessionId: 'session-main',
        eventId: student.eventId,
        studentId: student.id,
        studentName: student.fullName,
        teamId: student.teamId,
        teamName: student.teamName,
        busId: student.busId,
        busName: student.busName,
        status,
        verifiedBy,
        verifiedAt: new Date().toISOString(),
        method: verifiedBy.startsWith('room:') ? 'dynamic_room' : 'manual_admin',
      };
      this.data.attendance.push(rec);
    }

    this.saveToFile();
    return rec!;
  }

  batchMarkAttendance(studentIds: string[], status: AttendanceStatus, verifiedBy: string): number {
    studentIds.forEach((id) => this.markAttendance(id, status, verifiedBy));
    return studentIds.length;
  }

  updateAttendance(studentId: string, status: AttendanceStatus, verifiedBy = 'admin'): AttendanceRecord {
    return this.markAttendance(studentId, status, verifiedBy);
  }

  // Photos
  getPhotos(filters?: { teamId?: string; uploaderId?: string }): Photo[] {
    this.reload();
    let results = [...this.data.photos];
    if (filters?.teamId) {
      results = results.filter((p) => p.uploadedBy.teamId === filters.teamId);
    }
    if (filters?.uploaderId) {
      results = results.filter((p) => p.uploadedBy.userId === filters.uploaderId);
    }
    return results;
  }

  getPhotoById(id: string): Photo | undefined {
    return this.data.photos.find((p) => p.id === id);
  }

  savePhoto(photo: Photo): Photo {
    const idx = this.data.photos.findIndex((p) => p.id === photo.id);
    if (idx >= 0) {
      this.data.photos[idx] = photo;
    } else {
      this.data.photos.unshift(photo);
    }
    this.saveToFile();
    return photo;
  }

  // Announcements
  getAnnouncements(): Announcement[] {
    this.reload();
    return this.data.announcements;
  }

  createAnnouncement(announcement: Announcement): Announcement {
    this.data.announcements.unshift(announcement);
    this.saveToFile();
    return announcement;
  }

  saveAnnouncement(announcement: Announcement): Announcement {
    return this.createAnnouncement(announcement);
  }

  // Activity Logs
  getActivityLogs(limit = 20): ActivityLog[] {
    this.reload();
    return this.data.activityLogs.slice(0, limit);
  }

  logActivity(log: ActivityLog): void {
    this.data.activityLogs.unshift(log);
    this.saveToFile();
  }

  addActivityLog(log: Partial<ActivityLog> & { actorId: string; actorName: string; actorRole: any; action: any; targetEntity: string; details?: Record<string, any> }): void {
    this.logActivity({
      id: log.id || `act_${Date.now()}`,
      eventId: log.eventId || 'summit-2027',
      actorId: log.actorId,
      actorName: log.actorName,
      actorRole: log.actorRole,
      action: log.action,
      targetEntity: log.targetEntity,
      details: log.details || {},
      timestamp: log.timestamp || new Date().toISOString(),
    });
  }

  // Announcements & Documents
  createAnnouncementDocument(data: {
    title: string;
    message: string;
    priority?: 'normal' | 'important' | 'urgent';
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
    actionUrl?: string;
    targetAudience?: 'all' | 'students' | 'mentors' | 'teachers' | 'team' | 'individual';
  }): Announcement {
    const id = `ann-${Date.now().toString(36)}`;
    const announcement: Announcement = {
      id,
      eventId: 'summit-2027',
      title: data.title.trim(),
      message: data.message.trim(),
      priority: data.priority || 'normal',
      target: {
        audience: data.targetAudience || 'all',
      },
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      fileType: data.fileType || (data.fileName?.endsWith('.pdf') ? 'pdf' : undefined),
      actionUrl: data.actionUrl,
      senderId: 'admin',
      senderName: 'Sangam Administration',
      createdAt: new Date().toISOString(),
    };

    this.data.announcements.unshift(announcement);
    this.saveToFile();
    return announcement;
  }

  // Optional Test Batch Loader (for on-demand evaluation)
  loadSampleBatch(): void {
    const admin = this.getDefaultAdmin();
    this.data = {
      event: {
        id: 'summit-2027',
        name: 'Sangam 2027',
        venue: 'Grand Tech Convention Pavilion & Innovation Hub',
        startDate: '2027-09-12T08:00:00.000Z',
        endDate: '2027-09-14T18:00:00.000Z',
        status: 'active',
        stats: {
          totalStudents: 40,
          totalMentors: 13,
          totalFaculty: 5,
          totalJudges: 3,
          totalTeams: 8,
          totalBuses: 2,
        },
      },
      users: [
        admin,
        ...INITIAL_STUDENTS,
        ...INITIAL_MENTORS,
        ...INITIAL_FACULTY,
        ...INITIAL_JUDGES,
      ],
      teams: [...INITIAL_TEAMS],
      buses: [...INITIAL_BUSES],
      rooms: [...INITIAL_ROOMS],
      submissions: [],
      attendance: [...INITIAL_ATTENDANCE],
      photos: [...INITIAL_PHOTOS],
      announcements: [...INITIAL_ANNOUNCEMENTS],
      activityLogs: [
        {
          id: `act_${Date.now()}`,
          eventId: 'summit-2027',
          actorId: admin.id,
          actorName: admin.fullName,
          actorRole: 'admin',
          action: 'USER_MODIFIED',
          targetEntity: 'system',
          details: { message: 'Loaded Summit 2027 standard sample cohort' },
          timestamp: new Date().toISOString(),
        },
      ],
      scores: {},
    };
    this.saveToFile();
  }

  resetToClean(): void {
    const admin = this.getDefaultAdmin();
    this.data = {
      event: {
        id: 'summit-2027',
        name: 'Sangam 2027',
        venue: 'Grand Tech Convention Pavilion & Innovation Hub',
        startDate: '2027-09-12T08:00:00.000Z',
        endDate: '2027-09-14T18:00:00.000Z',
        status: 'active',
        stats: {
          totalStudents: 0,
          totalMentors: 0,
          totalFaculty: 0,
          totalJudges: 0,
          totalTeams: 0,
          totalBuses: 0,
        },
      },
      users: [admin],
      teams: [],
      buses: [],
      rooms: [],
      submissions: [],
      attendance: [],
      photos: [],
      announcements: [],
      activityLogs: [
        {
          id: `act_${Date.now()}`,
          eventId: 'summit-2027',
          actorId: admin.id,
          actorName: admin.fullName,
          actorRole: 'admin',
          action: 'USER_MODIFIED',
          targetEntity: 'system',
          details: { message: 'Database reset to clean state (0 records)' },
          timestamp: new Date().toISOString(),
        },
      ],
      scores: {},
    };
    this.saveToFile();
  }
}

const globalForDb = globalThis as unknown as { dbInstance?: PersistentDatabase };
export const db = globalForDb.dbInstance ?? new PersistentDatabase();
if (process.env.NODE_ENV !== 'production') globalForDb.dbInstance = db;
