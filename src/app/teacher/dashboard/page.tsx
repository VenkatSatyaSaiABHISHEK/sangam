'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { Team, User, Photo, Announcement } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormattedContent } from '@/components/ui/formatted-content';
import { Users, GraduationCap, Layers, Image as GalleryIcon, Phone, Mail, FileText, ArrowRight, ExternalLink } from 'lucide-react';

export default function TeacherDashboardPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [mentors, setMentors] = useState<User[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/data');
        if (res.ok) {
          const data = await res.json();
          setTeams(data.teams || []);
          setStudents(data.students || []);
          setMentors(data.mentors || []);
          setPhotos(data.photos || []);
          setAnnouncements(data.announcements || []);
          return;
        }
      } catch {}
      setTeams(db.getTeams());
      setStudents(db.getStudents());
      setMentors(db.getMentors());
      setPhotos(db.getPhotos());
      setAnnouncements(db.getAnnouncements());
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-950">
              Teacher & Faculty Overview
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              SANGAM 2027
            </Badge>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Monitor student cohorts, inspect team compositions, contact advisors, and review Sangam documentation.
          </p>
        </div>

        <Link href="/teacher/teams">
          <Button size="sm" className="gap-1.5 text-xs shadow-xs">
            <Users className="w-3.5 h-3.5" />
            <span>View All Teams & Students</span>
          </Button>
        </Link>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link href="/teacher/teams" className="block">
          <Card className="p-4 hover:border-neutral-400 transition-colors space-y-1">
            <div className="flex items-center justify-between text-neutral-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Students</span>
              <Users className="w-4 h-4 text-neutral-400" />
            </div>
            <p className="text-2xl font-bold text-neutral-950">{students.length}</p>
            <span className="text-[10px] text-neutral-400 font-mono block">
              {students.length === 0 ? 'No students yet' : `${students.length} Registered`}
            </span>
          </Card>
        </Link>

        <Link href="/teacher/teams" className="block">
          <Card className="p-4 hover:border-neutral-400 transition-colors space-y-1">
            <div className="flex items-center justify-between text-neutral-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Teams</span>
              <Layers className="w-4 h-4 text-neutral-400" />
            </div>
            <p className="text-2xl font-bold text-neutral-950">{teams.length}</p>
            <span className="text-[10px] text-neutral-400 font-mono block">
              {teams.length === 0 ? 'No teams created' : `${teams.length} Active Pods`}
            </span>
          </Card>
        </Link>

        <Card className="p-4 space-y-1">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Mentors</span>
            <GraduationCap className="w-4 h-4 text-neutral-400" />
          </div>
          <p className="text-2xl font-bold text-neutral-950">{mentors.length}</p>
          <span className="text-[10px] text-neutral-400 font-mono block">
            {mentors.length === 0 ? 'No advisors yet' : `${mentors.length} Cohort Mentors`}
          </span>
        </Card>

        <Link href="/teacher/gallery" className="block">
          <Card className="p-4 hover:border-neutral-400 transition-colors space-y-1">
            <div className="flex items-center justify-between text-neutral-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Gallery</span>
              <GalleryIcon className="w-4 h-4 text-neutral-400" />
            </div>
            <p className="text-2xl font-bold text-neutral-950">{photos.length}</p>
            <span className="text-[10px] text-neutral-400 font-mono block">
              {photos.length === 0 ? 'No photos yet' : `${photos.length} Verified Photos`}
            </span>
          </Card>
        </Link>
      </div>

      {/* Teams Roster Preview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-neutral-900 tracking-tight">
            Sangam Team Cohorts ({teams.length})
          </h2>
          <Link href="/teacher/teams" className="text-xs text-neutral-500 hover:text-black flex items-center gap-1">
            <span>View All Teams</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {teams.length === 0 ? (
          <Card className="p-8 text-center space-y-2">
            <Layers className="w-8 h-8 text-neutral-300 mx-auto" />
            <h3 className="text-xs font-semibold text-neutral-700">No Teams Formed Yet</h3>
            <p className="text-[11px] text-neutral-400">
              The Sangam Administrator has not initialized team cohorts yet.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teams.slice(0, 6).map((team) => {
              const teamStudents = students.filter((s) => s.teamId === team.id);
              const teamMentors = mentors.filter((m) => team.mentorIds.includes(m.id));

              return (
                <Card key={team.id} className="p-5 space-y-4 hover:border-neutral-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: team.color || '#2563EB' }}
                      />
                      <div>
                        <h3 className="text-sm font-bold text-neutral-950">{team.name}</h3>
                        <p className="text-[11px] text-neutral-500">{team.tableNumber || 'Table Assigned'}</p>
                      </div>
                    </div>

                    <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                      {teamStudents.length} Students
                    </Badge>
                  </div>

                  {/* Mentors */}
                  <div className="space-y-1 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                      Mentor(s)
                    </span>
                    {teamMentors.length === 0 ? (
                      <p className="text-neutral-400 italic">No mentor assigned</p>
                    ) : (
                      <div className="space-y-1">
                        {teamMentors.map((m) => (
                          <div key={m.id} className="flex items-center justify-between py-0.5">
                            <span className="font-semibold text-neutral-800">{m.fullName}</span>
                            <a
                              href={`tel:${m.phone}`}
                              className="text-[11px] font-mono text-neutral-600 hover:text-black flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{m.phone}</span>
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Students List */}
                  <div className="pt-2 border-t border-neutral-100 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                      Students ({teamStudents.length})
                    </span>
                    {teamStudents.length === 0 ? (
                      <p className="text-neutral-400 italic">No students allocated</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {teamStudents.map((s) => (
                          <span
                            key={s.id}
                            className="px-2 py-0.5 bg-neutral-100 rounded text-[11px] text-neutral-700 font-medium"
                          >
                            {s.fullName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Shared Sangam Documents & Announcements */}
      {announcements.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-neutral-900 tracking-tight">
            Sangam Documents & Instructions
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {announcements.map((ann) => (
              <Card key={ann.id} className="p-4 space-y-2 bg-white">
                <div className="flex items-center justify-between">
                  <Badge variant={ann.priority === 'urgent' ? 'danger' : 'neutral'} size="sm" className="capitalize text-[10px]">
                    {ann.priority}
                  </Badge>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {new Date(ann.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-neutral-950">{ann.title}</h3>
                <FormattedContent
                  content={ann.message}
                  className="text-xs text-neutral-600"
                  compact
                />

                {ann.fileUrl && (
                  <div className="pt-1">
                    <a
                      href={ann.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-900 hover:underline"
                    >
                      <FileText className="w-3.5 h-3.5 text-rose-600" />
                      <span>{ann.fileName || 'View PDF Document'}</span>
                      <ExternalLink className="w-3 h-3 text-neutral-400" />
                    </a>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
