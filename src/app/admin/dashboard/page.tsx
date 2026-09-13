'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { EventInfo, ActivityLog, Announcement, AttendanceRecord, User, Team, Bus, Room } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';
import {
  Users,
  GraduationCap,
  Scale,
  Building,
  Layers,
  Bus as BusIcon,
  CalendarCheck,
  FileQuestion,
  Image as GalleryIcon,
  Bell,
  Plus,
  ArrowRight,
  Activity,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react';

import { getCachedData, setCachedData } from '@/lib/data-cache';

export default function AdminDashboardPage() {
  const cached = typeof window !== 'undefined' ? getCachedData() : null;
  const [loading, setLoading] = useState(!cached);

  const [event, setEvent] = useState<EventInfo | null>(cached?.event || null);
  const [students, setStudents] = useState<User[]>(cached?.students || []);
  const [mentors, setMentors] = useState<User[]>(cached?.mentors || []);
  const [teachers, setTeachers] = useState<User[]>(cached?.teachers || []);
  const [teams, setTeams] = useState<Team[]>(cached?.teams || []);
  const [buses, setBuses] = useState<Bus[]>(cached?.buses || []);
  const [rooms, setRooms] = useState<Room[]>(cached?.rooms || []);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(cached?.attendance || []);
  const [announcements, setAnnouncements] = useState<Announcement[]>(cached?.announcements || []);
  const [activities, setActivities] = useState<ActivityLog[]>(cached?.activities || []);
  const [photoCount, setPhotoCount] = useState<number>((cached?.photos || []).length);

  const loadData = async () => {
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const data = await res.json();
        setCachedData(data);
        if (data.event) setEvent(data.event);
        setStudents(data.students || []);
        setMentors(data.mentors || []);
        setTeachers(data.teachers || []);
        setTeams(data.teams || []);
        setBuses(data.buses || []);
        setRooms(data.rooms || []);
        setAttendance(data.attendance || []);
        setAnnouncements(data.announcements || []);
        setActivities(data.activities || []);
        setPhotoCount((data.photos || []).length);
      }
    } catch {
      setEvent(db.getEvent());
      setStudents(db.getStudents());
      setMentors(db.getMentors());
      setTeachers(db.getTeachers());
      setTeams(db.getTeams());
      setBuses(db.getBuses());
      setRooms(db.getRooms());
      setAttendance(db.getAttendance());
      setAnnouncements(db.getAnnouncements());
      setActivities(db.getActivityLogs(8));
      setPhotoCount(db.getPhotos().length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalStudents = students.length || event?.stats.totalStudents || 0;
  const totalMentors = mentors.length || event?.stats.totalMentors || 0;
  const totalFaculty = teachers.length || event?.stats.totalFaculty || 0;
  const totalJudges = teachers.length || event?.stats.totalJudges || 0;
  const totalTeams = teams.length || event?.stats.totalTeams || 0;
  const totalBuses = buses.length || event?.stats.totalBuses || 0;

  const presentStudents = attendance.filter((a) => a.status === 'present').length;
  const absentStudents = totalStudents > presentStudents ? totalStudents - presentStudents : attendance.filter((a) => a.status === 'absent').length;

  const attendancePercent = totalStudents > 0 ? Math.round((presentStudents / totalStudents) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-950">
              Command Dashboard
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              SANGAM 2027
            </Badge>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Real-time live operations monitoring for registered participants, fleet transport, dynamic rooms, and verification media.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/students">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <Users className="w-3.5 h-3.5 text-neutral-600" />
              <span>Students</span>
            </Button>
          </Link>
          <Link href="/admin/channel">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <MessageSquare className="w-3.5 h-3.5 text-neutral-600" />
              <span>Chat Permissions</span>
            </Button>
          </Link>
          <Link href="/admin/teams">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <Layers className="w-3.5 h-3.5 text-neutral-600" />
              <span>Teams</span>
            </Button>
          </Link>
          <Link href="/admin/rooms/create">
            <Button size="sm" className="gap-1.5 text-xs shadow-xs">
              <Plus className="w-3.5 h-3.5" />
              <span>Create Room</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid (Directly queried from real records) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Link href="/admin/students" className="block">
          <Card className="p-3.5 hover:border-neutral-400 transition-colors">
            <div className="flex items-center justify-between text-neutral-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Students</span>
              <Users className="w-4 h-4 text-neutral-400" />
            </div>
            {loading ? (
              <div className="space-y-1.5 mt-2">
                <div className="h-7 w-12 bg-neutral-200 rounded animate-pulse" />
                <div className="h-3 w-16 bg-neutral-100 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <p className="text-2xl font-bold text-neutral-950 mt-2">{totalStudents}</p>
                <span className="text-[10px] text-neutral-400 font-mono block mt-0.5">
                  {totalStudents === 0 ? 'No students yet' : `${totalStudents} Registered`}
                </span>
              </>
            )}
          </Card>
        </Link>

        <Link href="/admin/mentors" className="block">
          <Card className="p-3.5 hover:border-neutral-400 transition-colors">
            <div className="flex items-center justify-between text-neutral-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Mentors</span>
              <GraduationCap className="w-4 h-4 text-neutral-400" />
            </div>
            {loading ? (
              <div className="space-y-1.5 mt-2">
                <div className="h-7 w-12 bg-neutral-200 rounded animate-pulse" />
                <div className="h-3 w-16 bg-neutral-100 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <p className="text-2xl font-bold text-neutral-950 mt-2">{totalMentors}</p>
                <span className="text-[10px] text-neutral-400 font-mono block mt-0.5">
                  {totalMentors === 0 ? 'No mentors yet' : `${totalMentors} Active`}
                </span>
              </>
            )}
          </Card>
        </Link>

        <Link href="/admin/faculty" className="block">
          <Card className="p-3.5 hover:border-neutral-400 transition-colors">
            <div className="flex items-center justify-between text-neutral-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Faculty</span>
              <Building className="w-4 h-4 text-neutral-400" />
            </div>
            {loading ? (
              <div className="space-y-1.5 mt-2">
                <div className="h-7 w-12 bg-neutral-200 rounded animate-pulse" />
                <div className="h-3 w-16 bg-neutral-100 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <p className="text-2xl font-bold text-neutral-950 mt-2">{totalFaculty}</p>
                <span className="text-[10px] text-neutral-400 font-mono block mt-0.5">
                  {totalFaculty === 0 ? 'No faculty yet' : `${totalFaculty} Observers`}
                </span>
              </>
            )}
          </Card>
        </Link>

        <Link href="/admin/judges" className="block">
          <Card className="p-3.5 hover:border-neutral-400 transition-colors">
            <div className="flex items-center justify-between text-neutral-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Judges</span>
              <Scale className="w-4 h-4 text-neutral-400" />
            </div>
            {loading ? (
              <div className="space-y-1.5 mt-2">
                <div className="h-7 w-12 bg-neutral-200 rounded animate-pulse" />
                <div className="h-3 w-16 bg-neutral-100 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <p className="text-2xl font-bold text-neutral-950 mt-2">{totalJudges}</p>
                <span className="text-[10px] text-neutral-400 font-mono block mt-0.5">
                  {totalJudges === 0 ? 'No judges yet' : `${totalJudges} Evaluators`}
                </span>
              </>
            )}
          </Card>
        </Link>

        <Link href="/admin/teams" className="block">
          <Card className="p-3.5 hover:border-neutral-400 transition-colors">
            <div className="flex items-center justify-between text-neutral-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Teams</span>
              <Layers className="w-4 h-4 text-neutral-400" />
            </div>
            {loading ? (
              <div className="space-y-1.5 mt-2">
                <div className="h-7 w-12 bg-neutral-200 rounded animate-pulse" />
                <div className="h-3 w-16 bg-neutral-100 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <p className="text-2xl font-bold text-neutral-950 mt-2">{totalTeams}</p>
                <span className="text-[10px] text-neutral-400 font-mono block mt-0.5">
                  {totalTeams === 0 ? 'No teams created' : `${totalTeams} Active Teams`}
                </span>
              </>
            )}
          </Card>
        </Link>

        <Link href="/admin/buses" className="block">
          <Card className="p-3.5 hover:border-neutral-400 transition-colors">
            <div className="flex items-center justify-between text-neutral-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Buses</span>
              <BusIcon className="w-4 h-4 text-neutral-400" />
            </div>
            {loading ? (
              <div className="space-y-1.5 mt-2">
                <div className="h-7 w-12 bg-neutral-200 rounded animate-pulse" />
                <div className="h-3 w-16 bg-neutral-100 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <p className="text-2xl font-bold text-neutral-950 mt-2">{totalBuses}</p>
                <span className="text-[10px] text-neutral-400 font-mono block mt-0.5">
                  {totalBuses === 0 ? 'No fleet buses' : `${totalBuses} Transport Units`}
                </span>
              </>
            )}
          </Card>
        </Link>
      </div>

      {/* Operational Highlights Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Attendance Summary */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-900 tracking-tight">
              Live Attendance Roster
            </h3>
            <Link href="/admin/attendance" className="text-xs text-neutral-500 hover:text-black flex items-center gap-1">
              <span>Inspect</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-800 uppercase">Present</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{presentStudents}</p>
              <span className="text-[10px] text-emerald-600 font-mono">
                {attendancePercent}% Verified
              </span>
            </div>

            <div className="p-3 rounded-lg bg-rose-50/70 border border-rose-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-rose-800 uppercase">Absent</span>
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-2xl font-bold text-rose-700 mt-1">{absentStudents}</p>
              <span className="text-[10px] text-rose-600 font-mono">Follow-up Needed</span>
            </div>
          </div>
        </Card>

        {/* Dynamic Rooms Activity */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-900 tracking-tight">
              Active Dynamic Rooms
            </h3>
            <Link href="/admin/rooms" className="text-xs text-neutral-500 hover:text-black flex items-center gap-1">
              <span>View All ({rooms.length})</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2 pt-1">
            {rooms.length === 0 ? (
              <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200 text-center">
                <p className="text-xs text-neutral-500">No dynamic rooms created yet.</p>
                <Link href="/admin/rooms/create" className="text-xs text-neutral-900 font-semibold underline mt-1 inline-block">
                  + Create First Room
                </Link>
              </div>
            ) : (
              rooms.slice(0, 3).map((r) => (
                <Link key={r.id} href={`/admin/rooms/${r.id}`} className="block">
                  <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-between hover:bg-neutral-100/70 transition-colors">
                    <div>
                      <p className="text-xs font-semibold text-neutral-900">{r.title}</p>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        #{r.id} • {r.submissionCount || 0} submissions
                      </span>
                    </div>
                    <Badge variant={r.isActive ? 'success' : 'neutral'} size="sm">
                      {r.isActive ? 'Active' : 'Closed'}
                    </Badge>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>

        {/* Stamped Media Highlights */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-900 tracking-tight">
              Verified Sangam Photos
            </h3>
            <Link href="/admin/gallery" className="text-xs text-neutral-500 hover:text-black flex items-center gap-1">
              <span>Gallery</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-neutral-900">Total Uploaded</p>
              <span className="text-[10px] text-neutral-500">Stamped with QR & GPS metadata</span>
            </div>
            <p className="text-2xl font-bold text-neutral-950">{photoCount}</p>
          </div>

          <Link href="/admin/gallery">
            <Button size="sm" variant="outline" className="w-full text-xs">
              <GalleryIcon className="w-3.5 h-3.5 mr-1.5" />
              <span>Open Media Stream</span>
            </Button>
          </Link>
        </Card>
      </div>

      {/* Announcements & Real-Time Audit Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Urgent & Important Announcements */}
        <Card className="lg:col-span-2 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-900 tracking-tight">
              Recent Broadcast Announcements
            </h3>
            <Link href="/admin/notifications">
              <Button size="sm" variant="outline" className="text-xs">
                Broadcast New
              </Button>
            </Link>
          </div>

          <div className="space-y-2.5">
            {announcements.length === 0 ? (
              <div className="p-6 rounded-lg bg-neutral-50 border border-neutral-200 text-center">
                <p className="text-xs text-neutral-500">No broadcast announcements published yet.</p>
              </div>
            ) : (
              announcements.slice(0, 3).map((ann) => (
              <div
                key={ann.id}
                className={`p-3.5 rounded-lg border text-xs space-y-1 ${
                  ann.priority === 'urgent'
                    ? 'bg-rose-50/50 border-rose-200 text-rose-950'
                    : ann.priority === 'important'
                    ? 'bg-amber-50/50 border-amber-200 text-amber-950'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Badge
                      variant={
                        ann.priority === 'urgent'
                          ? 'danger'
                          : ann.priority === 'important'
                          ? 'warning'
                          : 'neutral'
                      }
                      size="sm"
                      className="capitalize text-[10px]"
                    >
                      {ann.priority}
                    </Badge>
                    <span>{ann.title}</span>
                  </div>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {formatDateTime(ann.createdAt)}
                  </span>
                </div>
                <p className="text-neutral-600 pl-1">{ann.message}</p>
              </div>
            )))}
          </div>
        </Card>

        {/* Live Activity Audit Feed */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-900 tracking-tight flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-neutral-500" />
              <span>Real-Time Audit Stream</span>
            </h3>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          <div className="space-y-3 text-xs">
            {activities.map((act) => (
              <div key={act.id} className="flex items-start gap-2.5 pb-2 border-b border-neutral-100 last:border-0 last:pb-0">
                <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center font-bold text-[10px] text-neutral-700 shrink-0">
                  {act.actorName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-neutral-900 truncate">
                    {act.actorName}{' '}
                    <span className="font-normal text-neutral-500 text-[11px]">
                      ({act.actorRole})
                    </span>
                  </p>
                  <p className="text-[11px] text-neutral-600 font-mono truncate">
                    {act.action.replace('_', ' ')}
                  </p>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {formatDateTime(act.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
