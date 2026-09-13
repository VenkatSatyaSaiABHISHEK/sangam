'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { Team, User } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Users, GraduationCap, Phone, Mail, Search, Layers, MapPin } from 'lucide-react';

export default function TeacherTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [mentors, setMentors] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'teams' | 'students'>('teams');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setTeams(db.getTeams());
    setStudents(db.getStudents());
    setMentors(db.getMentors());
  }, []);

  const filteredStudents = students.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.phone.includes(q) ||
      s.teamName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-950">
            Teams & Student Directory
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Teacher directory of team pods, assigned advisors, and student participant contacts.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center p-1 bg-neutral-100 rounded-xl">
          <button
            onClick={() => setActiveTab('teams')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'teams' ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-500 hover:text-black'
            }`}
          >
            Teams ({teams.length})
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'students' ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-500 hover:text-black'
            }`}
          >
            All Students ({students.length})
          </button>
        </div>
      </div>

      {activeTab === 'teams' ? (
        /* Teams Grid */
        teams.length === 0 ? (
          <Card className="p-12 text-center space-y-2">
            <Layers className="w-8 h-8 text-neutral-300 mx-auto" />
            <h3 className="text-sm font-semibold text-neutral-700">No teams created yet</h3>
            <p className="text-xs text-neutral-400">Teams configured by the administrator will appear here.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teams.map((team) => {
              const teamStudents = students.filter((s) => s.teamId === team.id);
              const teamMentors = mentors.filter((m) => team.mentorIds.includes(m.id));

              return (
                <Card key={team.id} className="p-5 space-y-4 hover:border-neutral-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: team.color || '#2563EB' }}
                      />
                      <div>
                        <h2 className="text-base font-bold text-neutral-950">{team.name}</h2>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-neutral-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-neutral-400" />
                            <span>{team.tableNumber || 'Table Assigned'}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <Badge variant="outline" size="sm" className="font-mono text-xs">
                      {teamStudents.length} Students
                    </Badge>
                  </div>

                  {/* Mentors */}
                  <div className="space-y-1.5 text-xs pt-1 border-t border-neutral-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                      Assigned Mentor(s)
                    </span>
                    {teamMentors.length === 0 ? (
                      <p className="text-neutral-400 italic">No mentor linked</p>
                    ) : (
                      <div className="space-y-1">
                        {teamMentors.map((m) => (
                          <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-neutral-50 border border-neutral-200">
                            <div>
                              <p className="font-semibold text-neutral-900">{m.fullName}</p>
                              <p className="text-[11px] text-neutral-400 font-mono">{m.phone}</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <a
                                href={`tel:${m.phone}`}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-neutral-300 hover:bg-neutral-100 text-[11px] font-semibold text-neutral-800"
                              >
                                <Phone className="w-3 h-3" />
                                <span>Call</span>
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Students Roster */}
                  <div className="space-y-1.5 text-xs pt-2 border-t border-neutral-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                      Student Members ({teamStudents.length})
                    </span>
                    {teamStudents.length === 0 ? (
                      <p className="text-neutral-400 italic">No students allocated</p>
                    ) : (
                      <div className="space-y-1">
                        {teamStudents.map((s) => (
                          <div key={s.id} className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-neutral-50 transition-colors">
                            <span className="font-medium text-neutral-800">{s.fullName}</span>
                            <a
                              href={`tel:${s.phone}`}
                              className="text-[11px] font-mono text-neutral-500 hover:text-black flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3 text-neutral-400" />
                              <span>{s.phone}</span>
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )
      ) : (
        /* Students Directory Table */
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search students by name, email, or team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pl-8 pr-3 py-1 text-xs rounded-lg border border-neutral-300 bg-white placeholder:text-neutral-400 text-neutral-800 focus:outline-none w-full sm:w-80"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Phone Contact</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-semibold text-neutral-900">
                    {student.fullName}
                  </TableCell>
                  <TableCell className="text-xs text-neutral-600 font-mono">
                    {student.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant={student.teamName ? 'outline' : 'neutral'} size="sm">
                      {student.teamName?.split('—')[0]?.trim() || 'Unassigned'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-neutral-600">
                    {student.phone}
                  </TableCell>
                  <TableCell className="text-right">
                    <a
                      href={`tel:${student.phone}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-xs font-semibold text-neutral-800"
                    >
                      <Phone className="w-3 h-3 text-neutral-600" />
                      <span>Call</span>
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
