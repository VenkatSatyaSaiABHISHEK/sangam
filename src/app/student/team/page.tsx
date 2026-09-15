'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/db';
import { Team, User } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  GraduationCap,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  ArrowLeft,
  LogOut,
  Bus,
} from 'lucide-react';

export default function StudentTeamPage() {
  const { user, logout } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [mentors, setMentors] = useState<User[]>([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const teamId = user?.teamId;
    if (!teamId) {
      setTeam(null);
      setMembers([]);
      setMentors([]);
      return;
    }

    const loadTeam = async () => {
      try {
        const res = await fetch('/api/data');
        if (res.ok) {
          const data = await res.json();
          const teams: Team[] = data.teams || [];
          const foundTeam = teams.find((t) => t.id === teamId);
          if (foundTeam) {
            setTeam(foundTeam);
            const allStudents: User[] = data.students || [];
            const allMentors: User[] = data.mentors || [];
            setMembers(allStudents.filter((s) => s.teamId === foundTeam.id));
            setMentors(allMentors.filter((m) => foundTeam.mentorIds?.includes(m.id)));
            return;
          }
        }
      } catch (e) {
        console.warn('Team fetch warning:', e);
      }

      const foundTeam = db.getTeamById(teamId);
      if (foundTeam) {
        setTeam(foundTeam);
        const allStudents = db.getStudents();
        const allMentors = db.getMentors();
        setMembers(allStudents.filter((s) => s.teamId === foundTeam.id));
        setMentors(allMentors.filter((m) => foundTeam.mentorIds?.includes(m.id)));
      } else {
        setTeam(null);
      }
    };

    loadTeam();
  }, [user]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="space-y-4 pt-1">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold tracking-tight text-neutral-950">
          My Team & Identity
        </h1>
        <p className="text-xs text-neutral-500">
          Participant credentials, cohort roster, and session controls.
        </p>
      </div>

      {/* PROMINENTLY HIGHLIGHTED STUDENT DATA CARD */}
      <Card className="p-4 bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-white border-neutral-800 shadow-md relative overflow-hidden">
        {/* Glow ambient decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-3.5">
          {/* Top Row: User Avatar + Name + Status */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-full bg-white text-neutral-950 flex items-center justify-center font-black text-lg shadow-sm shrink-0 overflow-hidden">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.fullName || 'User'} className="w-full h-full object-cover" />
                ) : (
                  user?.fullName?.charAt(0) || 'A'
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-sm font-bold text-white tracking-tight truncate">
                    {user?.fullName || 'ABHI'}
                  </h2>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    YOU
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 font-mono">
                  {user?.role === 'student' ? 'Sangam Student Participant' : user?.role || 'Student'}
                </p>
              </div>
            </div>

            <Badge variant="outline" size="sm" className="text-[10px] font-mono bg-white/10 text-neutral-200 border-white/15 shrink-0">
              {team ? 'Pod Assigned' : 'Unassigned'}
            </Badge>
          </div>

          {/* Detailed Highlighted Attributes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-neutral-800/80">
            <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
              <span className="text-neutral-400 text-[11px] flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-neutral-400" />
                Email
              </span>
              <span className="font-medium text-neutral-200 text-[11px] truncate max-w-[170px]">
                {user?.email || '—'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
              <span className="text-neutral-400 text-[11px] flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-neutral-400" />
                Phone
              </span>
              <span className="font-mono font-medium text-neutral-200 text-[11px]">
                {user?.phone || '—'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
              <span className="text-neutral-400 text-[11px] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-neutral-400" />
                Assigned Team
              </span>
              <span className="font-medium text-neutral-200 text-[11px] truncate max-w-[170px]">
                {team?.name || user?.teamName || 'Unassigned'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
              <span className="text-neutral-400 text-[11px] flex items-center gap-1.5">
                <Bus className="w-3.5 h-3.5 text-neutral-400" />
                Transit Bus
              </span>
              <span className="font-medium text-neutral-200 text-[11px]">
                {user?.busName || 'None Assigned'}
              </span>
            </div>
          </div>

          {/* LOG OUT BUTTON */}
          <div className="pt-2">
            <Button
              variant="outline"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-red-400 border-red-500/30 bg-red-500/10 hover:bg-red-500/20 hover:text-red-300 transition-colors h-9"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isLoggingOut ? 'Logging out...' : 'Log Out from SangamConnect'}</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* TEAM POD DETAILS */}
      {!team ? (
        <Card className="p-6 text-center space-y-3 border-neutral-200">
          <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
            <Users className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-neutral-900">No Team Pod Assigned Yet</h2>
          <p className="text-xs text-neutral-500 max-w-xs mx-auto">
            You are registered as an active attendee. Sangam administrators are currently organizing cohort teams. Your table and mentors will automatically appear here.
          </p>
          <div className="pt-1">
            <Link href="/student">
              <Button size="sm" variant="outline" className="text-xs">
                Back to Home
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-4 pt-1">
          {/* Team Header Info */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-100 border border-neutral-200">
            <div className="flex items-center gap-2">
              <span
                className="w-3.5 h-3.5 rounded-full shrink-0"
                style={{ backgroundColor: team.color || '#2563EB' }}
              />
              <div>
                <h3 className="text-xs font-bold text-neutral-950 uppercase tracking-wide">
                  {team.name}
                </h3>
              </div>
            </div>
            <Badge variant="outline" size="sm" className="font-mono text-[10px] bg-white">
              {team.tableNumber ? `Table ${team.tableNumber}` : 'Table Assigned'}
            </Badge>
          </div>

          {/* Mentors Section */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-neutral-700" />
              <span>Assigned Mentors ({mentors.length})</span>
            </span>

            {mentors.length === 0 ? (
              <Card className="p-3 text-center text-xs text-neutral-400 italic">
                No mentor linked to this team pod yet.
              </Card>
            ) : (
              <div className="space-y-2">
                {mentors.map((m) => (
                  <Card key={m.id} className="p-3 flex items-center justify-between border-neutral-200">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                        {m.avatarUrl ? (
                          <img src={m.avatarUrl} alt={m.fullName} className="w-full h-full object-cover" />
                        ) : (
                          m.fullName.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-neutral-900 truncate">
                          {m.fullName}
                        </h4>
                        <p className="text-[11px] text-neutral-500 font-mono truncate">
                          {m.phone}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <a
                        href={`tel:${m.phone}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-black text-white text-xs font-semibold transition-colors"
                      >
                        <Phone className="w-3 h-3" />
                        <span>Call</span>
                      </a>
                      {m.email && (
                        <a
                          href={`mailto:${m.email}`}
                          className="p-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:text-black hover:bg-neutral-50 transition-colors"
                          title="Send Email"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Student Cohort Members */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-neutral-700" />
              <span>Team Members ({members.length})</span>
            </span>

            {members.length === 0 ? (
              <Card className="p-3 text-center text-xs text-neutral-400 italic">
                No other students assigned to this team yet.
              </Card>
            ) : (
              <div className="space-y-2">
                {members.map((s) => {
                  const isMe = s.id === user?.id || s.email?.toLowerCase() === user?.email?.toLowerCase();
                  return (
                    <Card
                      key={s.id}
                      className={`p-3 flex items-center justify-between transition-all ${
                        isMe
                          ? 'bg-neutral-950 text-white border-neutral-900 shadow-sm ring-1 ring-neutral-950'
                          : 'bg-white border-neutral-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden ${
                            isMe
                              ? 'bg-white text-neutral-950'
                              : 'bg-neutral-100 border border-neutral-300 text-neutral-800'
                          }`}
                        >
                          {s.avatarUrl ? (
                            <img src={s.avatarUrl} alt={s.fullName} className="w-full h-full object-cover" />
                          ) : (
                            s.fullName.charAt(0)
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4
                              className={`text-xs font-bold truncate ${
                                isMe ? 'text-white' : 'text-neutral-900'
                              }`}
                            >
                              {s.fullName}
                            </h4>
                            {isMe && (
                              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/20 text-white font-bold">
                                YOU
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-[11px] font-mono truncate ${
                              isMe ? 'text-neutral-300' : 'text-neutral-500'
                            }`}
                          >
                            {s.phone}
                          </p>
                        </div>
                      </div>

                      {!isMe && (
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <a
                            href={`tel:${s.phone}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold transition-colors"
                          >
                            <Phone className="w-3 h-3 text-neutral-600" />
                            <span>Call</span>
                          </a>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
