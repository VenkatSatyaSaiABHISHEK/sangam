'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/db';
import { Team, User, AttendanceRecord, Announcement } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FormattedContent } from '@/components/ui/formatted-content';
import {
  Users,
  MessageCircle,
  CalendarCheck,
  Image as GalleryIcon,
  Bell,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export default function MentorDashboardPage() {
  const { user } = useAuth();
  const [assignedTeams, setAssignedTeams] = useState<Team[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/data');
        if (res.ok) {
          const data = await res.json();
          const allTeams: Team[] = data.teams || [];
          setAssignedTeams(allTeams.slice(0, 2));
          setStudents(data.students || []);
          setAttendance(data.attendance || []);
          setAnnouncements((data.announcements || []).slice(0, 2));
          return;
        }
      } catch {}
      const teams = db.getTeams();
      setAssignedTeams(teams.slice(0, 2));
      setStudents(db.getStudents());
      setAttendance(db.getAttendance());
      setAnnouncements(db.getAnnouncements().slice(0, 2));
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-950">
            Welcome back, {user?.fullName || 'Ram Mohan'}
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Mentor Command Portal • Tracking assigned student cohorts and deliverables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/mentor/channel">
            <Button size="sm" className="gap-1.5 text-xs bg-neutral-950 text-white hover:bg-neutral-800">
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Open Channel</span>
            </Button>
          </Link>
          <Link href="/mentor/attendance">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Mark Attendance</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Action Cards (Section 19) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link href="/mentor/channel">
          <Card className="p-4 hover:border-neutral-950 transition-colors space-y-1 bg-neutral-950 text-white border-neutral-950">
            <MessageCircle className="w-5 h-5 text-white" />
            <p className="text-xs font-bold text-white">Open Channel</p>
            <p className="text-[10px] text-neutral-400">Discussion & Q&A</p>
          </Card>
        </Link>

        <Link href="/mentor/attendance">
          <Card className="p-4 hover:border-neutral-400 transition-colors space-y-1">
            <CalendarCheck className="w-5 h-5 text-neutral-800" />
            <p className="text-xs font-bold text-neutral-950">Attendance</p>
            <p className="text-[10px] text-neutral-500">Mark team status</p>
          </Card>
        </Link>

        <Link href="/mentor/teams">
          <Card className="p-4 hover:border-neutral-400 transition-colors space-y-1">
            <Users className="w-5 h-5 text-neutral-800" />
            <p className="text-xs font-bold text-neutral-950">My Teams</p>
            <p className="text-[10px] text-neutral-500">Review rosters</p>
          </Card>
        </Link>

        <Link href="/mentor/gallery">
          <Card className="p-4 hover:border-neutral-400 transition-colors space-y-1">
            <GalleryIcon className="w-5 h-5 text-neutral-800" />
            <p className="text-xs font-bold text-neutral-950">Gallery</p>
            <p className="text-[10px] text-neutral-500">Event media stream</p>
          </Card>
        </Link>
      </div>

      {/* Assigned Teams Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-neutral-900 tracking-tight">
            My Assigned Teams ({assignedTeams.length})
          </h2>
          <Link href="/mentor/teams" className="text-xs text-neutral-500 hover:text-black">
            View Details
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignedTeams.map((team) => {
            const teamMembers = students.filter((s) => s.teamId === team.id);
            const presentCount = attendance.filter(
              (a) => a.teamId === team.id && a.status === 'present'
            ).length;

            return (
              <Card key={team.id} className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-neutral-900">
                      {team.name}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: team.color || '#2563EB' }} />
                      <span>{team.tableNumber || 'Table Assigned'}</span>
                    </p>
                  </div>
                  <Badge variant="outline" size="sm" className="font-mono text-xs">
                    {team.busName?.split('—')[0]?.trim()}
                  </Badge>
                </div>

                <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-between text-xs">
                  <span className="text-neutral-600">Students: {teamMembers.length}</span>
                  <span className="text-emerald-600 font-semibold">
                    {presentCount} of {teamMembers.length} Present
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
                    Student Roster
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {teamMembers.map((m) => {
                      const isPres = attendance.some(
                        (a) => a.studentId === m.id && a.status === 'present'
                      );
                      return (
                        <span
                          key={m.id}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs bg-white"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isPres ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          <span>{m.fullName}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Admin Announcements Stream */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-neutral-900 tracking-tight">
          Admin Announcements
        </h2>
        <div className="space-y-2">
          {announcements.map((ann) => (
            <Card key={ann.id} className="p-3.5 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-900">{ann.title}</span>
                <span className="text-[10px] text-neutral-400 font-mono">Today</span>
              </div>
              <FormattedContent
                content={ann.message}
                className="text-neutral-600 text-xs"
                compact
              />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
