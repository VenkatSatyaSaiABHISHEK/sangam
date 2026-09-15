'use client';

import React, { useState, useEffect } from 'react';
import { Team, User, AttendanceRecord } from '@/types';
import {
  Phone,
  Mail,
  X,
  Users,
  User as UserIcon,
  GraduationCap,
  LayoutGrid,
  List,
  ArrowRight,
  CheckCircle2,
  RotateCw,
  Search,
  MapPin,
  ShieldCheck,
  Bus,
  Sparkles,
} from 'lucide-react';
import {
  fetchTeamsFromFirestore,
  fetchUsersFromFirestore,
  fetchAttendanceFromFirestore,
} from '@/lib/firebase-db';

type DirectoryTab = 'teams' | 'students' | 'mentors' | 'teachers';

function getInitials(name?: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const PASTEL_AVATARS = [
  { bg: 'bg-neutral-200', text: 'text-neutral-700' },
  { bg: 'bg-sky-100', text: 'text-sky-700' },
  { bg: 'bg-pink-100', text: 'text-pink-700' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-amber-100', text: 'text-amber-700' },
  { bg: 'bg-purple-100', text: 'text-purple-700' },
  { bg: 'bg-teal-100', text: 'text-teal-700' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700' },
];

function getAvatarStyle(name?: string, isMentor?: boolean): { bg: string; text: string } {
  if (isMentor) {
    return { bg: 'bg-neutral-200', text: 'text-neutral-700' };
  }
  if (!name) return PASTEL_AVATARS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = (Math.abs(hash) % (PASTEL_AVATARS.length - 1)) + 1;
  return PASTEL_AVATARS[index];
}

function MemberAvatar({
  user,
  size = 'md',
  className = '',
}: {
  user: { fullName?: string; avatarUrl?: string; role?: string };
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    xs: 'w-5 h-5 text-[9px]',
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-11 h-11 text-xs',
  };

  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.fullName || 'Member'}
        className={`${sizeClasses[size]} rounded-full object-cover shrink-0 border border-neutral-200/80 shadow-2xs ${className}`}
      />
    );
  }

  const isMentor = user.role === 'mentor';
  const style = getAvatarStyle(user.fullName, isMentor);

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold shrink-0 shadow-2xs ${style.bg} ${style.text} ${className}`}
    >
      {getInitials(user.fullName)}
    </div>
  );
}

function mergeById<T extends { id: string }>(a: T[], b: T[]): T[] {
  const map = new Map<string, T>();
  a.forEach((item) => map.set(item.id, item));
  b.forEach((item) => {
    const existing = map.get(item.id);
    if (existing) {
      const merged: any = { ...existing, ...item };
      if ((existing as any).avatarUrl && !merged.avatarUrl) {
        merged.avatarUrl = (existing as any).avatarUrl;
      }
      map.set(item.id, merged);
    } else {
      map.set(item.id, item);
    }
  });
  return Array.from(map.values());
}

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default function LivePage() {
  const [activeTab, setActiveTab] = useState<DirectoryTab>('teams');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTable, setSelectedTable] = useState<string>('all');

  // Live Data
  const [teams, setTeams] = useState<Team[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [mentors, setMentors] = useState<User[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals state
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const loadData = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      // 1. Fetch only needed directory fields from API
      const res = await fetch('/api/data?include=teams,students,mentors,teachers,attendance').catch(() => null);
      let apiTeams: Team[] = [];
      let apiStudents: User[] = [];
      let apiMentors: User[] = [];
      let apiTeachers: User[] = [];
      let apiAttendance: AttendanceRecord[] = [];

      if (res && res.ok) {
        const data = await res.json();
        apiTeams = data.teams || [];
        apiStudents = data.students || [];
        apiMentors = data.mentors || [];
        apiTeachers = data.teachers || [];
        apiAttendance = data.attendance || [];
      }

      // 2. Fetch live Firestore records gracefully
      let fireTeams: Team[] = [];
      let fireStudents: User[] = [];
      let fireMentors: User[] = [];
      let fireTeachers: User[] = [];
      let fireAtt: AttendanceRecord[] = [];

      try {
        const [fTeams, fStudents, fMentors, fTeachers, fAtt] = await Promise.allSettled([
          fetchTeamsFromFirestore(),
          fetchUsersFromFirestore('student'),
          fetchUsersFromFirestore('mentor'),
          fetchUsersFromFirestore('teacher'),
          fetchAttendanceFromFirestore(),
        ]);
        fireTeams = fTeams.status === 'fulfilled' ? fTeams.value : [];
        fireStudents = fStudents.status === 'fulfilled' ? fStudents.value : [];
        fireMentors = fMentors.status === 'fulfilled' ? fMentors.value : [];
        fireTeachers = fTeachers.status === 'fulfilled' ? fTeachers.value : [];
        fireAtt = fAtt.status === 'fulfilled' ? fAtt.value : [];
      } catch {
        // Fallback gracefully
      }

      const mergedStudents = fireStudents.length > 0
        ? fireStudents.map((fs) => {
            const local = apiStudents.find((s) => s.id === fs.id);
            return { ...local, ...fs, avatarUrl: fs.avatarUrl || local?.avatarUrl };
          })
        : apiStudents;

      const liveStudentIdSet = new Set(mergedStudents.map((s) => s.id));

      const mergedTeams = (fireTeams.length > 0
        ? fireTeams.map((ft) => {
            const local = apiTeams.find((t) => t.id === ft.id);
            return { ...local, ...ft };
          })
        : mergeById(apiTeams, fireTeams)
      )
        .map((t) => ({
          ...t,
          studentIds: (t.studentIds || []).filter((id) => liveStudentIdSet.has(id)),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

      const mergedMentors = mergeById(apiMentors, fireMentors);
      const mergedTeachers = mergeById(apiTeachers, fireTeachers);
      const mergedAttendance = mergeById(apiAttendance, fireAtt);

      setTeams(mergedTeams);
      setStudents(mergedStudents);
      setMentors(mergedMentors);
      setTeachers(mergedTeachers);
      setAttendance(mergedAttendance);
    } catch (err) {
      console.warn('Failed to load live data:', err);
    } finally {
      setIsLoading(false);
      if (manual) setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    loadData();

    // Gentle polling: only refresh every 45s when browser tab is actively visible
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadData();
      }
    }, 45000);

    const onVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadData();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  // Extract unique table numbers sorted numerically
  const availableTables = Array.from(
    new Set(
      teams
        .map((t) => t.tableNumber?.trim())
        .filter((tbl): tbl is string => Boolean(tbl))
    )
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  // Comprehensive Team Filter: searches team name, table, bus, mentors, and students
  const filteredTeams = teams.filter((team) => {
    // 1. Table filter
    if (selectedTable !== 'all') {
      const teamTableNormalized = (team.tableNumber || '').toLowerCase().replace(/table\s*/i, '').trim();
      const selectedTableNormalized = selectedTable.toLowerCase().replace(/table\s*/i, '').trim();
      if (teamTableNormalized !== selectedTableNormalized) {
        return false;
      }
    }

    // 2. Search query filter
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();

    if (team.name.toLowerCase().includes(q)) return true;
    if (team.tableNumber && team.tableNumber.toLowerCase().includes(q)) return true;
    if (team.busName && team.busName.toLowerCase().includes(q)) return true;

    // Check mentors
    const tMentors = mentors.filter(
      (m) =>
        team.mentorIds?.includes(m.id) ||
        team.supportMentorIds?.includes(m.id) ||
        team.mentors?.some((tm) => tm.id === m.id) ||
        team.supportMentors?.some((tm) => tm.id === m.id) ||
        (m.teamId === team.id && (!team.mentorIds?.length || team.mentorIds.includes(m.id)))
    );
    if (
      tMentors.some(
        (m) =>
          m.fullName.toLowerCase().includes(q) ||
          m.phone?.includes(q) ||
          m.club?.toLowerCase().includes(q) ||
          m.email?.toLowerCase().includes(q)
      )
    ) {
      return true;
    }

    // Check students
    const tStudents = students.filter(
      (s) => s.teamId === team.id || team.studentIds?.includes(s.id)
    );
    if (
      tStudents.some(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.phone?.includes(q) ||
          s.branch?.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q)
      )
    ) {
      return true;
    }

    return false;
  });

  // Filtered lists for directory tabs
  const filteredStudents = students.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.phone?.includes(q) ||
      s.branch?.toLowerCase().includes(q) ||
      s.teamName?.toLowerCase().includes(q)
    );
  });

  const filteredMentors = mentors.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.fullName.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.phone?.includes(q) ||
      m.club?.toLowerCase().includes(q) ||
      m.teamName?.toLowerCase().includes(q)
    );
  });

  const filteredTeachers = teachers.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.fullName.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q) ||
      t.phone?.includes(q) ||
      t.department?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#fafbfc] text-neutral-900 font-sans selection:bg-neutral-200 antialiased w-full max-w-full overflow-x-hidden">
      {/* ================================================================== */}
      {/* 1. DESKTOP TOP NAVIGATION: Minimal Centered Capsule (Hidden on mobile)*/}
      {/* ================================================================== */}
      <header className="hidden sm:flex w-full pt-8 pb-6 px-4 items-center justify-center">
        <div className="inline-flex items-center bg-neutral-100 p-1.5 rounded-full border border-neutral-200/60 shadow-2xs">
          {/* Teams Tab */}
          <button
            onClick={() => {
              setActiveTab('teams');
              setSearchQuery('');
            }}
            className={`inline-flex items-center px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'teams'
                ? 'bg-neutral-950 text-white shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-950'
            }`}
          >
            <span>Teams</span>
            <span
              className={`ml-2 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                activeTab === 'teams'
                  ? 'bg-white text-neutral-950'
                  : 'bg-neutral-200/80 text-neutral-700'
              }`}
            >
              {teams.length}
            </span>
          </button>

          {/* Students Tab */}
          <button
            onClick={() => {
              setActiveTab('students');
              setSearchQuery('');
            }}
            className={`inline-flex items-center px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'students'
                ? 'bg-neutral-950 text-white shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-950'
            }`}
          >
            <span>Students</span>
            <span
              className={`ml-2 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                activeTab === 'students'
                  ? 'bg-white text-neutral-950'
                  : 'bg-neutral-200/80 text-neutral-700'
              }`}
            >
              {students.length}
            </span>
          </button>

          {/* Mentors Tab */}
          <button
            onClick={() => {
              setActiveTab('mentors');
              setSearchQuery('');
            }}
            className={`inline-flex items-center px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'mentors'
                ? 'bg-neutral-950 text-white shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-950'
            }`}
          >
            <span>Mentors</span>
            <span
              className={`ml-2 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                activeTab === 'mentors'
                  ? 'bg-white text-neutral-950'
                  : 'bg-neutral-200/80 text-neutral-700'
              }`}
            >
              {mentors.length}
            </span>
          </button>

          {/* Teachers Tab */}
          <button
            onClick={() => {
              setActiveTab('teachers');
              setSearchQuery('');
            }}
            className={`inline-flex items-center px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'teachers'
                ? 'bg-neutral-950 text-white shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-950'
            }`}
          >
            <span>Teachers</span>
            <span
              className={`ml-2 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                activeTab === 'teachers'
                  ? 'bg-white text-neutral-950'
                  : 'bg-neutral-200/80 text-neutral-700'
              }`}
            >
              {teachers.length}
            </span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 pb-24 sm:py-6 space-y-5 sm:space-y-6">
        {/* ================================================================== */}
        {/* 2. TEAMS TAB (AUTOMATIC LIST ON MOBILE, GRID/LIST ON DESKTOP)      */}
        {/* ================================================================== */}
        {activeTab === 'teams' && (
          <div className="space-y-6">
            {/* Search & Table Filter Header Bar */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Real-time Find My Team Search Bar */}
                <div className="relative flex-1 max-w-lg">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Find your team: type your name, table (e.g. Table 1), mentor..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-9 py-2.5 rounded-full border border-neutral-200/80 bg-white text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-neutral-950 shadow-xs transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-0.5 cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Right: Table filter dropdown */}
                {availableTables.length > 0 && (
                  <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0 hidden sm:inline" />
                    <select
                      value={selectedTable}
                      onChange={(e) => setSelectedTable(e.target.value)}
                      className="py-2.5 px-4 rounded-full border border-neutral-200/80 bg-white text-xs font-semibold text-neutral-800 shadow-xs focus:outline-neutral-950 cursor-pointer"
                    >
                      <option value="all">All Tables ({availableTables.length})</option>
                      {availableTables.map((tbl) => (
                        <option key={tbl} value={tbl}>
                          {tbl.toLowerCase().includes('table') ? tbl : `Table ${tbl}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Status Row */}
              <div className="flex items-center justify-between text-xs text-neutral-500 font-medium px-1">
                <div className="flex items-center gap-2">
                  <span>
                    Showing <strong className="text-neutral-900 font-semibold">{filteredTeams.length}</strong> of {teams.length} teams
                  </span>
                  {(searchQuery || selectedTable !== 'all') && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-[11px] font-medium">
                      Active filter
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedTable('all');
                        }}
                        className="hover:text-neutral-950 font-bold ml-1 cursor-pointer"
                        title="Clear filter"
                      >
                        ×
                      </button>
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-neutral-400 hidden sm:block">
                  Click any student or mentor to view details
                </div>
              </div>
            </div>

            {isLoading && teams.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="h-56 rounded-3xl bg-neutral-100/70 border border-neutral-200/60 animate-pulse shadow-xs" />
                <div className="h-56 rounded-3xl bg-neutral-100/70 border border-neutral-200/60 animate-pulse shadow-xs" />
                <div className="h-56 rounded-3xl bg-neutral-100/70 border border-neutral-200/60 animate-pulse shadow-xs" />
              </div>
            ) : teams.length === 0 ? (
              <div className="text-center py-16 border border-neutral-200/80 rounded-3xl bg-white space-y-2 shadow-xs">
                <Users className="w-8 h-8 text-neutral-400 mx-auto" />
                <h3 className="text-sm font-semibold text-neutral-900">No teams registered</h3>
                <p className="text-xs text-neutral-500">Teams will appear here once allocated.</p>
              </div>
            ) : filteredTeams.length === 0 ? (
              <div className="text-center py-16 border border-neutral-200/80 rounded-3xl bg-white space-y-3 shadow-xs">
                <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400">
                  <Search className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-neutral-900">No matching teams or participants</h3>
                  <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                    No results for &ldquo;{searchQuery || selectedTable}&rdquo;. Try checking spelling or search by student full name.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedTable('all');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 cursor-pointer shadow-xs transition-colors"
                >
                  Clear Search
                </button>
              </div>
            ) : (
              /* Classical Elevated Cards Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTeams.map((team) => {
                  const teamMentors = mentors.filter(
                    (m) =>
                      m.teamId === team.id ||
                      team.mentorIds?.includes(m.id) ||
                      team.supportMentorIds?.includes(m.id) ||
                      team.mentors?.some((tm) => tm.id === m.id) ||
                      team.supportMentors?.some((tm) => tm.id === m.id)
                  );
                  const teamStudents = students.filter(
                    (s) => s.teamId === team.id || team.studentIds?.includes(s.id)
                  );

                  return (
                    <div
                      key={team.id}
                      className="group bg-white rounded-3xl p-5 sm:p-6 border border-neutral-100/90 shadow-[0_10px_30px_-4px_rgba(0,0,0,0.05),0_4px_12px_-2px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_45px_-6px_rgba(0,0,0,0.1),0_8px_20px_-4px_rgba(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                    >
                      <div>
                        {/* Header: Team Name, Table Badge, and Detail Arrow */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-lg sm:text-xl font-bold text-neutral-950 tracking-tight">
                                {team.name}
                              </h3>
                              {/* High-visibility Table Location Badge */}
                              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200/80 shadow-2xs">
                                <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                {team.tableNumber?.toLowerCase().includes('table')
                                  ? team.tableNumber
                                  : `Table ${team.tableNumber || '1'}`}
                              </span>
                              {team.busName && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-600">
                                  <Bus className="w-3 h-3 text-neutral-400" />
                                  {team.busName}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-400 font-medium">
                              {pluralize(teamStudents.length, 'Student', 'Students')} · {pluralize(teamMentors.length, 'Mentor', 'Mentors')}
                            </p>
                          </div>

                          <button
                            onClick={() => setSelectedTeam(team)}
                            className="w-9 h-9 rounded-full bg-neutral-50 hover:bg-neutral-950 text-neutral-400 hover:text-white flex items-center justify-center transition-all shadow-2xs shrink-0 cursor-pointer"
                            title="View full team roster"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Subtle Hairline Divider */}
                        <div className="h-px bg-neutral-100 my-4" />

                        {/* Mentors Section: Refined, un-boxy layout */}
                        <div>
                          <div className="flex items-center justify-between text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2.5">
                            <span className="flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-neutral-500" />
                              Mentor Guide
                            </span>
                            <span className="text-[10px] text-neutral-400 font-normal">
                              {teamMentors.length === 0 ? 'Pending' : pluralize(teamMentors.length, 'Mentor', 'Mentors')}
                            </span>
                          </div>

                          {teamMentors.length === 0 ? (
                            <p className="text-xs text-neutral-400 italic py-1">No mentor assigned yet</p>
                          ) : (
                            <div className="space-y-1.5">
                              {teamMentors.map((m) => {
                                const isMatch = searchQuery.trim() && (
                                  m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  m.phone?.includes(searchQuery) ||
                                  m.club?.toLowerCase().includes(searchQuery.toLowerCase())
                                );
                                return (
                                  <div
                                    key={m.id}
                                    onClick={() => setSelectedMember(m)}
                                    className={`flex items-center justify-between gap-3 p-2.5 rounded-2xl transition-all cursor-pointer ${
                                      isMatch
                                        ? 'bg-amber-50 ring-2 ring-amber-400/60 shadow-xs'
                                        : 'bg-neutral-50/80 hover:bg-neutral-100/90'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                      <MemberAvatar user={m} size="md" />
                                      <div className="min-w-0 flex-1">
                                        <span className="text-xs sm:text-sm font-bold text-neutral-900 block leading-tight break-words">
                                          {m.fullName}
                                        </span>
                                        <span className="text-[11px] text-neutral-500 font-medium block mt-0.5">
                                          {m.club || m.branch || 'Table Mentor'}
                                        </span>
                                      </div>
                                    </div>

                                    {m.phone && (
                                      <a
                                        href={`tel:${m.phone}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-xs transition-transform active:scale-95 shrink-0"
                                        title={`Call ${m.fullName}`}
                                      >
                                        <Phone className="w-3 h-3" />
                                        <span>Call</span>
                                      </a>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Students Roster Section: Fluid list, NO box-in-box */}
                        <div className="mt-5">
                          <div className="flex items-center justify-between text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                            <span className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-neutral-500" />
                              Allocated Students
                            </span>
                            <span className="text-[10px] text-neutral-400 font-medium">
                              {teamStudents.length} Students
                            </span>
                          </div>

                          {teamStudents.length === 0 ? (
                            <div className="p-3 text-center text-xs text-neutral-400 italic bg-neutral-50/40 rounded-2xl">
                              No students allocated yet
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {teamStudents.map((s) => {
                                const isPresent = attendance.some((a) => a.studentId === s.id && a.status === 'present');
                                const isMatch = searchQuery.trim() && (
                                  s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  s.phone?.includes(searchQuery) ||
                                  s.branch?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  s.email?.toLowerCase().includes(searchQuery.toLowerCase())
                                );

                                return (
                                  <div
                                    key={s.id}
                                    onClick={() => setSelectedMember(s)}
                                    className={`flex items-center justify-between p-2.5 rounded-2xl transition-all cursor-pointer group ${
                                      isMatch
                                        ? 'bg-amber-50 ring-2 ring-amber-400/60 shadow-xs'
                                        : 'hover:bg-neutral-50/80'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                      <MemberAvatar user={s} size="md" />
                                      <div className="min-w-0 flex-1">
                                        <span className="text-xs sm:text-sm font-semibold text-neutral-900 block leading-snug break-words group-hover:text-neutral-950">
                                          {s.fullName}
                                        </span>
                                        <span className="text-[11px] text-neutral-400 font-medium block mt-0.5">
                                          {s.branch || 'Student'} {s.year ? `· ${s.year}` : ''}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                      {isPresent && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                                          <CheckCircle2 className="w-2.5 h-2.5" />
                                          <span>Present</span>
                                        </span>
                                      )}
                                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-neutral-300 group-hover:text-neutral-800 transition-colors">
                                        <ArrowRight className="w-3.5 h-3.5" />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Bottom Footer */}
                      <div className="mt-4 pt-3.5 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-400">
                        <span className="font-medium text-neutral-500">
                          {team.tableNumber?.toLowerCase().includes('table')
                            ? team.tableNumber
                            : `Table ${team.tableNumber || '1'}`}
                        </span>
                        <button
                          onClick={() => setSelectedTeam(team)}
                          className="text-xs font-semibold text-neutral-700 hover:text-neutral-950 inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>View full roster</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================================================================== */}
        {/* 3. STUDENTS DIRECTORY TAB: Full, User-Friendly Cards & Search      */}
        {/* ================================================================== */}
        {activeTab === 'students' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Search Bar (Responsive full-width on mobile) */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4">
              <div className="relative w-full sm:max-w-md">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search students by name, branch, email, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-neutral-950 shadow-2xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="text-[11px] sm:text-xs text-neutral-500 font-medium">
                Showing {filteredStudents.length} of {students.length} participants
              </div>
            </div>

            {/* Students Grid: Rich, User-Friendly Cards */}
            {filteredStudents.length === 0 ? (
              <div className="text-center py-16 border border-neutral-200/80 rounded-2xl bg-white space-y-2">
                <Users className="w-8 h-8 text-neutral-400 mx-auto" />
                <h3 className="text-sm font-semibold text-neutral-900">No students found</h3>
                <p className="text-xs text-neutral-500">Try adjusting your search query.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStudents.map((s) => {
                  const style = getAvatarStyle(s.fullName, false);
                  const isPresent = attendance.some(
                    (a) => a.studentId === s.id && a.status === 'present'
                  );

                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelectedMember(s)}
                      className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-2xs hover:border-neutral-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-4 cursor-pointer"
                    >
                      {/* Top Row: Face / Avatar + Name + Attendance Badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <MemberAvatar user={s} size="lg" />
                          <div>
                            <h3 className="text-sm font-bold text-neutral-950">
                              {s.fullName}
                            </h3>
                            <span className="text-[11px] text-neutral-500 font-medium">
                              {s.branch || 'CSE'} {s.year ? `· ${s.year}` : ''}
                            </span>
                          </div>
                        </div>

                        {/* Attendance Tag - Only show Present if verified, NEVER show Pending */}
                        {isPresent && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Present</span>
                          </span>
                        )}
                      </div>

                      {/* Student Details: Team, Email, Phone */}
                      <div className="space-y-2 text-xs pt-3 border-t border-neutral-100">
                        {/* Team */}
                        <div className="flex items-center justify-between text-neutral-600">
                          <span className="text-neutral-400">Team:</span>
                          <span className="font-semibold text-neutral-900 font-mono">
                            {s.teamName || 'Unassigned'}
                          </span>
                        </div>

                        {/* Email */}
                        {s.email && (
                          <div className="flex items-center justify-between text-neutral-600">
                            <span className="text-neutral-400">Email:</span>
                            <a
                              href={`mailto:${s.email}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-neutral-900 hover:underline truncate max-w-[180px] flex items-center gap-1"
                            >
                              <Mail className="w-3 h-3 text-neutral-400 shrink-0" />
                              <span className="truncate">{s.email}</span>
                            </a>
                          </div>
                        )}

                        {/* Phone & Call Button */}
                        {s.phone && (
                          <div className="flex items-center justify-between text-neutral-600">
                            <span className="text-neutral-400">Phone:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-neutral-900">{s.phone}</span>
                              <a
                                href={`tel:${s.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-950 text-white text-[10px] font-medium hover:bg-neutral-800 transition-colors"
                              >
                                <Phone className="w-2.5 h-2.5" />
                                <span>Call</span>
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================================================================== */}
        {/* 4. MENTORS DIRECTORY TAB: Full, User-Friendly Cards & Search       */}
        {/* ================================================================== */}
        {activeTab === 'mentors' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Search Bar (Responsive full-width on mobile) */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4">
              <div className="relative w-full sm:max-w-md">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search mentors by name, club, email, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-neutral-950 shadow-2xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="text-[11px] sm:text-xs text-neutral-500 font-medium">
                Showing {filteredMentors.length} of {mentors.length} mentors
              </div>
            </div>

            {/* Mentors Grid: Rich, User-Friendly Cards */}
            {filteredMentors.length === 0 ? (
              <div className="text-center py-16 border border-neutral-200/80 rounded-2xl bg-white space-y-2">
                <UserIcon className="w-8 h-8 text-neutral-400 mx-auto" />
                <h3 className="text-sm font-semibold text-neutral-900">No mentors found</h3>
                <p className="text-xs text-neutral-500">Try adjusting your search query.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMentors.map((m) => {
                  const style = getAvatarStyle(m.fullName, true);

                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMember(m)}
                      className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-2xs hover:border-neutral-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-4 cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <MemberAvatar user={m} size="lg" />
                          <div>
                            <h3 className="text-sm font-bold text-neutral-950">
                              {m.fullName}
                            </h3>
                            <span className="text-[11px] text-neutral-500 font-medium">
                              {m.club || m.branch || 'Mentor'}
                            </span>
                          </div>
                        </div>

                        <span className="inline-block text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
                          {m.mentorType === 'support' ? 'Support' : 'Lead'}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs pt-3 border-t border-neutral-100">
                        <div className="flex items-center justify-between text-neutral-600">
                          <span className="text-neutral-400">Assigned:</span>
                          <span className="font-semibold text-neutral-900 font-mono">
                            {m.teamName || 'Sangam Mentor'}
                          </span>
                        </div>

                        {m.email && (
                          <div className="flex items-center justify-between text-neutral-600">
                            <span className="text-neutral-400">Email:</span>
                            <a
                              href={`mailto:${m.email}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-neutral-900 hover:underline truncate max-w-[180px] flex items-center gap-1"
                            >
                              <Mail className="w-3 h-3 text-neutral-400 shrink-0" />
                              <span className="truncate">{m.email}</span>
                            </a>
                          </div>
                        )}

                        {m.phone && (
                          <div className="flex items-center justify-between text-neutral-600">
                            <span className="text-neutral-400">Phone:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-neutral-900">{m.phone}</span>
                              <a
                                href={`tel:${m.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-950 text-white text-[10px] font-medium hover:bg-neutral-800 transition-colors"
                              >
                                <Phone className="w-2.5 h-2.5" />
                                <span>Call</span>
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================================================================== */}
        {/* 5. TEACHERS DIRECTORY TAB: Full, User-Friendly Cards & Search      */}
        {/* ================================================================== */}
        {activeTab === 'teachers' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Search Bar (Responsive full-width on mobile) */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4">
              <div className="relative w-full sm:max-w-md">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search faculty by name, department, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-neutral-950 shadow-2xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="text-[11px] sm:text-xs text-neutral-500 font-medium">
                Showing {filteredTeachers.length} of {teachers.length} faculty
              </div>
            </div>

            {/* Teachers Grid: Rich, User-Friendly Cards */}
            {filteredTeachers.length === 0 ? (
              <div className="text-center py-16 border border-neutral-200/80 rounded-2xl bg-white space-y-2">
                <GraduationCap className="w-8 h-8 text-neutral-400 mx-auto" />
                <h3 className="text-sm font-semibold text-neutral-900">No faculty found</h3>
                <p className="text-xs text-neutral-500">Try adjusting your search query.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTeachers.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedMember(t)}
                    className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-2xs hover:border-neutral-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-4 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <MemberAvatar user={t} size="lg" />
                        <div>
                          <h3 className="text-sm font-bold text-neutral-950">
                            {t.fullName}
                          </h3>
                          <span className="text-[11px] text-neutral-500 font-medium">
                            {t.department || 'Faculty Member'}
                          </span>
                        </div>
                      </div>

                      <span className="inline-block text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                        Faculty
                      </span>
                    </div>

                    <div className="space-y-2 text-xs pt-3 border-t border-neutral-100">
                      {t.email && (
                        <div className="flex items-center justify-between text-neutral-600">
                          <span className="text-neutral-400">Email:</span>
                          <a
                            href={`mailto:${t.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-neutral-900 hover:underline truncate max-w-[180px] flex items-center gap-1"
                          >
                            <Mail className="w-3 h-3 text-neutral-400 shrink-0" />
                            <span className="truncate">{t.email}</span>
                          </a>
                        </div>
                      )}

                      {t.phone && (
                        <div className="flex items-center justify-between text-neutral-600">
                          <span className="text-neutral-400">Phone:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-neutral-900">{t.phone}</span>
                            <a
                              href={`tel:${t.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-950 text-white text-[10px] font-medium hover:bg-neutral-800 transition-colors"
                            >
                              <Phone className="w-2.5 h-2.5" />
                              <span>Call</span>
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ================================================================== */}
      {/* MODAL: FULL TEAM ROSTER DRAWER / POPUP                             */}
      {/* ================================================================== */}
      {selectedTeam && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedTeam(null)}
        >
          <div
            className="bg-white border border-neutral-200 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-xl space-y-4 sm:space-y-5 max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-lg text-neutral-950">
                  {selectedTeam.name}
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {selectedTeam.tableNumber || 'Sangam Pod'}
                </p>
              </div>
              <button
                onClick={() => setSelectedTeam(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Team Members List */}
            <div className="space-y-4 text-xs">
              {/* Mentors */}
              <div>
                <h4 className="font-semibold text-neutral-900 mb-2">Mentors</h4>
                <div className="space-y-2">
                  {mentors
                    .filter(
                      (m) =>
                        m.teamId === selectedTeam.id ||
                        selectedTeam.mentorIds?.includes(m.id) ||
                        selectedTeam.supportMentorIds?.includes(m.id) ||
                        selectedTeam.mentors?.some((tm) => tm.id === m.id) ||
                        selectedTeam.supportMentors?.some((tm) => tm.id === m.id)
                    )
                    .map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-neutral-50 border border-neutral-100"
                      >
                        <div className="flex items-center gap-2.5">
                          <MemberAvatar user={m} size="sm" />
                          <div>
                            <span className="font-semibold text-neutral-900 block">
                              {m.fullName}
                            </span>
                            <span className="text-[10px] text-neutral-400">
                              {m.club || 'Mentor'}
                            </span>
                          </div>
                        </div>
                        {m.phone && (
                          <a
                            href={`tel:${m.phone}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-900 text-white text-[11px] font-medium hover:bg-neutral-800"
                          >
                            <Phone className="w-3 h-3" />
                            <span>Call</span>
                          </a>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {/* Students */}
              <div>
                <h4 className="font-semibold text-neutral-900 mb-2">Students</h4>
                <div className="space-y-2">
                  {students
                    .filter(
                      (s) =>
                        s.teamId === selectedTeam.id ||
                        selectedTeam.studentIds?.includes(s.id)
                    )
                    .map((s) => {
                      const isPresent = attendance.some(
                        (a) => a.studentId === s.id && a.status === 'present'
                      );

                      return (
                        <div
                          key={s.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-neutral-50 border border-neutral-100"
                        >
                          <div className="flex items-center gap-2.5">
                            <MemberAvatar user={s} size="sm" />
                            <div>
                              <span className="font-semibold text-neutral-900 block">
                                {s.fullName}
                              </span>
                              <span className="text-[10px] text-neutral-400">
                                {s.branch || 'CSE'}
                              </span>
                            </div>
                          </div>
                          {/* Attendance Tag - Only show Present if verified, NEVER show Pending */}
                          {isPresent && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Present</span>
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-100 flex justify-end">
              <button
                onClick={() => setSelectedTeam(null)}
                className="w-full py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL: MEMBER PROFILE POPUP                                        */}
      {/* ================================================================== */}
      {selectedMember && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedMember(null)}
        >
          <div
            className="bg-white border border-neutral-200 rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-xl space-y-4 sm:space-y-5 max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <MemberAvatar user={selectedMember} size="lg" />
                <div>
                  <h3 className="font-bold text-base text-neutral-950">
                    {selectedMember.fullName}
                  </h3>
                  <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                    {selectedMember.role}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedMember(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs pt-2 border-t border-neutral-100">
              {selectedMember.teamName && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-50">
                  <span className="text-neutral-500">Team:</span>
                  <span className="font-semibold text-neutral-900">
                    {selectedMember.teamName}
                  </span>
                </div>
              )}

              {selectedMember.email && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-50">
                  <span className="text-neutral-500">Email:</span>
                  <a
                    href={`mailto:${selectedMember.email}`}
                    className="font-medium text-neutral-900 hover:underline truncate max-w-[180px]"
                  >
                    {selectedMember.email}
                  </a>
                </div>
              )}

              {selectedMember.phone && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-50">
                  <span className="text-neutral-500">Phone:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-neutral-900">
                      {selectedMember.phone}
                    </span>
                    <a
                      href={`tel:${selectedMember.phone}`}
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
                    >
                      <Phone className="w-3 h-3" />
                      <span>Call</span>
                    </a>
                  </div>
                </div>
              )}

              {selectedMember.branch && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-50">
                  <span className="text-neutral-500">Branch & Year:</span>
                  <span className="font-medium text-neutral-900">
                    {selectedMember.branch} {selectedMember.year ? `· ${selectedMember.year}` : ''}
                  </span>
                </div>
              )}

              {selectedMember.club && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-50">
                  <span className="text-neutral-500">Domain / Club:</span>
                  <span className="font-medium text-neutral-900">
                    {selectedMember.club}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-neutral-100 flex justify-end">
              <button
                onClick={() => setSelectedMember(null)}
                className="w-full py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MOBILE BOTTOM NAVIGATION DOCK (Lower part menu for mobile)         */}
      {/* ================================================================== */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200/80 px-2 py-2 shadow-lg">
        <div className="grid grid-cols-4 gap-1 max-w-md mx-auto">
          {/* Teams */}
          <button
            onClick={() => {
              setActiveTab('teams');
              setSearchQuery('');
            }}
            className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'teams'
                ? 'bg-neutral-950 text-white shadow-2xs font-semibold'
                : 'text-neutral-500 hover:text-neutral-900 font-medium'
            }`}
          >
            <span className="text-xs">Teams</span>
            <span
              className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${
                activeTab === 'teams'
                  ? 'bg-white text-neutral-950'
                  : 'bg-neutral-200 text-neutral-700'
              }`}
            >
              {teams.length}
            </span>
          </button>

          {/* Students */}
          <button
            onClick={() => {
              setActiveTab('students');
              setSearchQuery('');
            }}
            className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'students'
                ? 'bg-neutral-950 text-white shadow-2xs font-semibold'
                : 'text-neutral-500 hover:text-neutral-900 font-medium'
            }`}
          >
            <span className="text-xs">Students</span>
            <span
              className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${
                activeTab === 'students'
                  ? 'bg-white text-neutral-950'
                  : 'bg-neutral-200 text-neutral-700'
              }`}
            >
              {students.length}
            </span>
          </button>

          {/* Mentors */}
          <button
            onClick={() => {
              setActiveTab('mentors');
              setSearchQuery('');
            }}
            className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'mentors'
                ? 'bg-neutral-950 text-white shadow-2xs font-semibold'
                : 'text-neutral-500 hover:text-neutral-900 font-medium'
            }`}
          >
            <span className="text-xs">Mentors</span>
            <span
              className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${
                activeTab === 'mentors'
                  ? 'bg-white text-neutral-950'
                  : 'bg-neutral-200 text-neutral-700'
              }`}
            >
              {mentors.length}
            </span>
          </button>

          {/* Teachers */}
          <button
            onClick={() => {
              setActiveTab('teachers');
              setSearchQuery('');
            }}
            className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'teachers'
                ? 'bg-neutral-950 text-white shadow-2xs font-semibold'
                : 'text-neutral-500 hover:text-neutral-900 font-medium'
            }`}
          >
            <span className="text-xs">Teachers</span>
            <span
              className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${
                activeTab === 'teachers'
                  ? 'bg-white text-neutral-950'
                  : 'bg-neutral-200 text-neutral-700'
              }`}
            >
              {teachers.length}
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
}
