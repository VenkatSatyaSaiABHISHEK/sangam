'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { Team, User, AttendanceRecord } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Bus, CalendarCheck } from 'lucide-react';

export default function MentorTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    // Show Team 01 and Team 02 for mentor
    setTeams(db.getTeams().slice(0, 2));
    setStudents(db.getStudents());
    setAttendance(db.getAttendance());
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-900">
          Assigned Teams Roster
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Detailed breakdown of your assigned student cohorts and project progress.
        </p>
      </div>

      <div className="space-y-6">
        {teams.map((team) => {
          const members = students.filter((s) => s.teamId === team.id);

          return (
            <Card key={team.id} className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: team.color || '#2563EB' }}
                    />
                    <h2 className="text-lg font-bold text-neutral-950">
                      {team.name}
                    </h2>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5 font-mono">
                    Table: <strong>{team.tableNumber || 'Assigned'}</strong>
                  </p>
                </div>
                <Badge variant="outline" size="sm" className="font-mono">
                  {team.busName?.split('—')[0]?.trim() || 'Bus Route'}
                </Badge>
              </div>

              {/* Members Table */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-neutral-900 block">
                  Students ({members.length})
                </span>

                <div className="rounded-xl border border-neutral-200 divide-y divide-neutral-100 overflow-hidden">
                  {members.map((m) => {
                    const isPresent = attendance.some(
                      (a) => a.studentId === m.id && a.status === 'present'
                    );

                    return (
                      <div
                        key={m.id}
                        className="p-3 flex items-center justify-between bg-white text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center font-bold text-neutral-700">
                            {m.fullName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-semibold text-neutral-900 block">
                              {m.fullName}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono">
                              {m.phone}
                            </span>
                          </div>
                        </div>

                        <Badge
                          variant={isPresent ? 'success' : 'danger'}
                          size="sm"
                          className="font-mono text-[10px]"
                        >
                          {isPresent ? 'Present' : 'Absent'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
