'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Team, User, Bus, AttendanceRecord } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  Users,
  GraduationCap,
  MapPin,
  Bus as BusIcon,
  Phone,
  Mail,
  Search,
  Check,
  X,
  UserPlus,
  Palette,
  ExternalLink,
  Shuffle,
} from 'lucide-react';

const TEAM_COLOR_PALETTE = [
  '#2563EB', // Blue
  '#059669', // Emerald
  '#D97706', // Amber
  '#7C3AED', // Violet
  '#DB2777', // Pink
  '#0D9488', // Teal
  '#DC2626', // Red
  '#4F46E5', // Indigo
  '#0891B2', // Cyan
  '#9333EA', // Purple
  '#EA580C', // Orange
  '#16A34A', // Green
];

function getRandomTeamColor(existingTeams: Team[] = []): string {
  const used = new Set(existingTeams.map((t) => (t.color || '').toUpperCase()));
  const available = TEAM_COLOR_PALETTE.filter((c) => !used.has(c.toUpperCase()));
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)];
  }
  return TEAM_COLOR_PALETTE[Math.floor(Math.random() * TEAM_COLOR_PALETTE.length)];
}

function extractTeamNumber(str: string): number | null {
  const match = str.match(/(?:team|table)\s*(\d+)/i) || str.match(/\b(\d+)\b/);
  return match ? parseInt(match[1], 10) : null;
}

export function sortTeams(teamList: Team[]): Team[] {
  return [...teamList].sort((a, b) => {
    const numA = extractTeamNumber(a.name) ?? extractTeamNumber(a.tableNumber || '');
    const numB = extractTeamNumber(b.name) ?? extractTeamNumber(b.tableNumber || '');

    if (numA !== null && numB !== null) {
      if (numA !== numB) return numA - numB;
    }
    if (numA !== null && numB === null) return -1;
    if (numA === null && numB !== null) return 1;

    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });
}

function getInitials(name?: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AdminTeamsPage() {
  const { showToast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [mentors, setMentors] = useState<User[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [search, setSearch] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  // Form states - Create
  const [teamName, setTeamName] = useState('');
  const [color, setColor] = useState(TEAM_COLOR_PALETTE[0]);
  const [tableNumber, setTableNumber] = useState('');
  const [selectedMentorId, setSelectedMentorId] = useState('');
  const [selectedBusId, setSelectedBusId] = useState('');

  // Form states - Edit
  const [editTeamId, setEditTeamId] = useState('');
  const [editTeamName, setEditTeamName] = useState('');
  const [editTableNumber, setEditTableNumber] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editBusId, setEditBusId] = useState('');
  const [editTab, setEditTab] = useState<'details' | 'mentors' | 'students'>('details');

  // Form states - Assign inside Edit modal
  const [assignStudentId, setAssignStudentId] = useState('');
  const [assignMentorId, setAssignMentorId] = useState('');

  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await fetch('/api/data');
      if (res && res.ok) {
        const data = await res.json();
        if (data.teams) setTeams(sortTeams(data.teams));
        if (data.students) setStudents(data.students || []);
        if (data.mentors) setMentors(data.mentors || []);
        if (data.buses) setBuses(data.buses || []);
        if (data.attendance) setAttendance(data.attendance || []);
      }
    } catch (err) {
      console.warn('Error loading teams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered & naturally sorted Teams
  const filteredTeams = useMemo(() => {
    const sorted = sortTeams(teams);
    const q = search.toLowerCase().trim();
    if (!q) return sorted;

    return sorted.filter((t) => {
      const teamMentors = mentors.filter((m) => m.teamId === t.id || t.mentorIds?.includes(m.id));
      const teamStudents = students.filter((s) => s.teamId === t.id || t.studentIds?.includes(s.id));

      const matchesName = t.name.toLowerCase().includes(q);
      const matchesTable = t.tableNumber?.toLowerCase().includes(q);
      const matchesMentor = teamMentors.some(
        (m) => m.fullName.toLowerCase().includes(q) || m.phone?.includes(q)
      );
      const matchesStudent = teamStudents.some(
        (s) => s.fullName.toLowerCase().includes(q) || s.phone?.includes(q)
      );

      return matchesName || matchesTable || matchesMentor || matchesStudent;
    });
  }, [teams, students, mentors, search]);

  // Open Create with automatic next Team #, Table # and distinct random color
  const handleOpenCreate = () => {
    const nextNum = teams.length + 1;
    setTeamName(`Team ${nextNum}`);
    setTableNumber(`Table ${nextNum}`);
    setColor(getRandomTeamColor(teams));
    setSelectedMentorId('');
    setSelectedBusId('');
    setIsCreateOpen(true);
  };

  // Create Team with instant optimistic UI update
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      showToast('Name Required', 'Please enter a team name.', 'error');
      return;
    }

    const assignedColor = color || getRandomTeamColor(teams);

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createTeam',
          payload: {
            name: teamName.trim(),
            color: assignedColor,
            tableNumber: tableNumber.trim() || `Table ${teams.length + 1}`,
            mentorIds: selectedMentorId ? [selectedMentorId] : [],
            busId: selectedBusId || undefined,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create team');

      // Instant optimistic UI update: immediately show new team without needing a refresh!
      if (data.team) {
        setTeams((prev) => sortTeams([...prev.filter((t) => t.id !== data.team.id), data.team]));
      }

      showToast('Team Created', `${teamName} initialized successfully.`, 'success');
      setIsCreateOpen(false);
      setTeamName('');
      setColor(getRandomTeamColor([...teams, data.team]));
      setTableNumber('');
      setSelectedMentorId('');
      setSelectedBusId('');
      loadData();
    } catch (err: any) {
      showToast('Error', err.message || 'Could not create team.', 'error');
    }
  };

  // Edit Team
  const handleOpenEdit = (team: Team, initialTab: 'details' | 'mentors' | 'students' = 'details') => {
    setSelectedTeam(team);
    setEditTeamId(team.id);
    setEditTeamName(team.name);
    setEditTableNumber(team.tableNumber || '');
    setEditColor(team.color || TEAM_COLOR_PALETTE[0]);
    setEditBusId(team.busId || '');
    setEditTab(initialTab);
    setAssignStudentId('');
    setAssignMentorId('');
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTeamName.trim()) return;

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateTeam',
          payload: {
            id: editTeamId,
            updates: {
              name: editTeamName.trim(),
              tableNumber: editTableNumber.trim(),
              color: editColor,
              busId: editBusId || undefined,
            },
          },
        }),
      });

      if (!res.ok) throw new Error('Update failed');
      showToast('Team Updated', `${editTeamName} updated successfully.`, 'success');
      setIsEditOpen(false);
      loadData();
    } catch (err: any) {
      showToast('Error', err.message || 'Could not update team.', 'error');
    }
  };

  // Delete Team
  const handleDeleteTeam = async (team: Team) => {
    if (confirm(`Delete team "${team.name}"? Assigned members will become unassigned.`)) {
      try {
        const res = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'deleteTeam',
            payload: { id: team.id },
          }),
        });
        if (!res.ok) throw new Error('Deletion failed');
        showToast('Team Deleted', `${team.name} removed.`, 'info');
        loadData();
      } catch (err: any) {
        showToast('Delete Failed', err.message || 'Could not delete team.', 'error');
      }
    }
  };

  const currentEditTeam = teams.find((t) => t.id === editTeamId) || selectedTeam;
  const currentEditMentors = currentEditTeam
    ? mentors.filter((m) => m.teamId === currentEditTeam.id || currentEditTeam.mentorIds?.includes(m.id))
    : [];
  const currentEditStudents = currentEditTeam
    ? students.filter((s) => s.teamId === currentEditTeam.id || currentEditTeam.studentIds?.includes(s.id))
    : [];

  // Assign Student
  const handleAssignStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEditTeam || !assignStudentId) return;

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assignStudentToTeam',
          payload: { teamId: currentEditTeam.id, studentId: assignStudentId },
        }),
      });
      if (!res.ok) throw new Error('Failed to assign student');
      showToast('Student Assigned', 'Participant assigned to team cohort.', 'success');
      setAssignStudentId('');
      loadData();
    } catch (err: any) {
      showToast('Error', err.message || 'Could not assign student.', 'error');
    }
  };

  // Remove Student
  const handleRemoveStudent = async (teamId: string, studentId: string) => {
    try {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'removeStudentFromTeam',
          payload: { teamId, studentId },
        }),
      });
      showToast('Student Removed', 'Participant unassigned from team.', 'info');
      loadData();
    } catch (err: any) {
      showToast('Error', err.message || 'Could not remove student.', 'error');
    }
  };

  // Assign Mentor
  const handleAssignMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEditTeam || !assignMentorId) return;

    const mentorIdToAssign = assignMentorId;
    const targetTeamId = currentEditTeam.id;
    const targetTeamName = currentEditTeam.name;
    const mentorObj = mentors.find((m) => m.id === mentorIdToAssign);

    // Optimistic UI updates
    if (mentorObj) {
      setTeams((prev) =>
        prev.map((t) => {
          if (t.id === targetTeamId) {
            const updatedMentorIds = Array.from(new Set([...(t.mentorIds || []), mentorIdToAssign]));
            const updatedMentors = [
              ...(t.mentors || []).filter((m) => m.id !== mentorIdToAssign),
              {
                id: mentorObj.id,
                name: mentorObj.fullName,
                phone: mentorObj.phone,
                email: mentorObj.email,
                club: mentorObj.club,
                branch: mentorObj.branch,
                year: mentorObj.year,
              },
            ];
            return { ...t, mentorIds: updatedMentorIds, mentors: updatedMentors };
          }
          // Remove from other teams if present
          return {
            ...t,
            mentorIds: (t.mentorIds || []).filter((id) => id !== mentorIdToAssign),
            mentors: (t.mentors || []).filter((m) => m.id !== mentorIdToAssign),
          };
        })
      );

      setMentors((prev) =>
        prev.map((m) =>
          m.id === mentorIdToAssign
            ? { ...m, teamId: targetTeamId, teamName: targetTeamName, mentorType: 'cohort' }
            : m
        )
      );
    }

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assignMentorToTeam',
          payload: { teamId: targetTeamId, mentorId: mentorIdToAssign },
        }),
      });
      if (!res.ok) throw new Error('Failed to assign mentor');
      showToast('Mentor Assigned', 'Mentor added to team cohort.', 'success');
      setAssignMentorId('');
      loadData();
    } catch (err: any) {
      showToast('Error', err.message || 'Could not assign mentor.', 'error');
      loadData();
    }
  };

  // Remove Mentor
  const handleRemoveMentor = async (teamId: string, mentorId: string) => {
    // Instant optimistic removal from UI
    setTeams((prev) =>
      prev.map((t) => {
        if (t.id === teamId) {
          return {
            ...t,
            mentorIds: (t.mentorIds || []).filter((id) => id !== mentorId),
            mentors: (t.mentors || []).filter((m) => m.id !== mentorId),
          };
        }
        return t;
      })
    );

    setMentors((prev) =>
      prev.map((m) =>
        m.id === mentorId
          ? { ...m, teamId: undefined, teamName: undefined, mentorType: 'support' }
          : m
      )
    );

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'removeMentorFromTeam',
          payload: { teamId, mentorId },
        }),
      });
      if (!res.ok) throw new Error('Failed to remove mentor');
      showToast('Mentor Removed', 'Mentor unassigned from team.', 'info');
      loadData();
    } catch (err: any) {
      showToast('Error', err.message || 'Could not remove mentor.', 'error');
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header - Matches the admin style of admin/mentors */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-950">
            Sangam Teams ({teams.length})
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Configure team cohorts: Mentor(s) + Students, color identity, and table allocations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/live" target="_blank">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs bg-white hover:bg-neutral-50 shadow-xs cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-neutral-600" />
              <span>Public Live Link</span>
            </Button>
          </Link>
          <Button
            onClick={handleOpenCreate}
            size="sm"
            className="gap-1.5 text-xs shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Team</span>
          </Button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md w-full">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search teams, students, or mentors..."
          className="pl-9 text-xs"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Full-width 3-Column Teams Grid (Matches admin/mentors layout) */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-5 space-y-4 border-neutral-200 bg-white animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-3.5 h-3.5 rounded-full bg-neutral-200 shrink-0" />
                  <div className="space-y-1">
                    <div className="h-4 w-24 bg-neutral-200 rounded" />
                    <div className="h-3 w-16 bg-neutral-100 rounded" />
                  </div>
                </div>
                <div className="h-4 w-12 bg-neutral-100 rounded" />
              </div>
              <div className="space-y-2 pt-2 border-t border-neutral-100">
                <div className="h-3 w-28 bg-neutral-200 rounded" />
                <div className="h-9 bg-neutral-100 rounded-lg" />
              </div>
              <div className="space-y-2 pt-2 border-t border-neutral-100">
                <div className="h-3 w-20 bg-neutral-200 rounded" />
                <div className="h-6 bg-neutral-100 rounded-md" />
                <div className="h-6 bg-neutral-100 rounded-md" />
              </div>
              <div className="pt-2 border-t border-neutral-100 flex justify-between">
                <div className="h-3 w-24 bg-neutral-100 rounded" />
                <div className="h-3 w-16 bg-neutral-100 rounded" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredTeams.length === 0 ? (
        <Card className="p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900">
              {teams.length === 0 ? 'No teams created' : 'No teams match your search'}
            </h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1">
              {teams.length === 0
                ? 'Organize participants into team pods with assigned mentors, table allocations, and visual colors.'
                : 'Try searching with another team name or member.'}
            </p>
          </div>
          {teams.length === 0 && (
            <Button
              onClick={handleOpenCreate}
              size="sm"
              className="gap-1.5 text-xs cursor-pointer mx-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Team</span>
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeams.map((team) => {
            const teamStudents = students.filter((s) => s.teamId === team.id || team.studentIds?.includes(s.id));
            const teamMentors = mentors.filter((m) => m.teamId === team.id || team.mentorIds?.includes(m.id));
            const bus = buses.find((b) => b.id === team.busId);

            return (
              <Card
                key={team.id}
                className="p-5 flex flex-col justify-between space-y-4 border-neutral-200 hover:border-neutral-300 transition-colors bg-white shadow-2xs"
              >
                {/* Header: Color Indicator + Name + Location + Actions */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: team.color || '#2563EB' }}
                      />
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-neutral-900 truncate">
                          {team.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-700">
                            <MapPin className="w-3 h-3 text-neutral-400" />
                            <span>{team.tableNumber || 'Table TBD'}</span>
                          </span>
                          {bus && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-neutral-100 text-neutral-700">
                              <BusIcon className="w-3 h-3 text-neutral-400" />
                              <span>{bus.name}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Edit and Delete Controls */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(team)}
                        className="p-1 text-neutral-400 hover:text-neutral-900 transition-colors cursor-pointer"
                        title="Edit Team"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(team)}
                        className="p-1 text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Delete Team"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* MENTORS */}
                <div className="space-y-1.5 pt-2 border-t border-neutral-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                      <GraduationCap className="w-3 h-3 text-neutral-500" />
                      <span>Assigned Mentors ({teamMentors.length})</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(team, 'mentors')}
                      className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Assign</span>
                    </button>
                  </div>

                  {teamMentors.length === 0 ? (
                    <div className="flex items-center justify-between py-1 px-2 rounded-md bg-neutral-50 border border-dashed border-neutral-200">
                      <span className="text-[11px] text-neutral-400 italic">No mentor assigned</span>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(team, 'mentors')}
                        className="text-[11px] font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
                      >
                        + Add Mentor
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {teamMentors.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-neutral-50 border border-neutral-100"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-neutral-200 text-neutral-800 flex items-center justify-center font-bold text-[10px] shrink-0">
                              {getInitials(m.fullName)}
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-neutral-900 block truncate">
                                {m.fullName}
                              </span>
                              <span className="text-[10px] text-neutral-500 block truncate">
                                {m.club || m.branch || 'Mentor'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {m.phone && (
                              <a
                                href={`tel:${m.phone}`}
                                className="p-1 rounded text-neutral-400 hover:text-neutral-800 transition-colors"
                                title={`Call: ${m.phone}`}
                              >
                                <Phone className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* STUDENTS */}
                <div className="space-y-1.5 pt-2 border-t border-neutral-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                      <Users className="w-3 h-3 text-neutral-500" />
                      <span>Students ({teamStudents.length})</span>
                    </span>
                  </div>

                  {teamStudents.length === 0 ? (
                    <p className="text-xs text-neutral-400 italic py-1">No students allocated yet</p>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                      {teamStudents.map((s) => {
                        const isPresent = attendance.some(
                          (a) => a.studentId === s.id && a.status === 'present'
                        );

                        return (
                          <div
                            key={s.id}
                            className="flex items-center justify-between text-xs py-1 px-1.5 rounded-md hover:bg-neutral-50 transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-5 h-5 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center font-bold text-[9px] shrink-0">
                                {getInitials(s.fullName)}
                              </div>
                              <div className="min-w-0">
                                <span className="font-medium text-neutral-800 truncate block">
                                  {s.fullName}
                                </span>
                                <span className="text-[10px] text-neutral-400 truncate block">
                                  {s.branch || 'CSE'} {s.phone ? `· ${s.phone}` : ''}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isPresent ? 'bg-emerald-500' : 'bg-neutral-300'
                                }`}
                                title={isPresent ? 'Checked In' : 'Attendance Pending'}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400">
                  <span>{teamStudents.length} Students Allocated</span>
                  <span className="font-mono">Pod Active</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* CREATE TEAM MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Sangam Team"
        description="Initialize a new team pod with visual color identity, table assignment, and mentor."
      >
        <form onSubmit={handleCreateTeam} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Team Name *
            </label>
            <Input
              required
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. TEAM 3"
              className="text-xs"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-neutral-700 flex items-center gap-1">
                <Palette className="w-3.5 h-3.5" />
                <span>Team Color Identity</span>
              </label>
              <button
                type="button"
                onClick={() => setColor(getRandomTeamColor(teams))}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-neutral-600 hover:text-neutral-950 px-2 py-0.5 rounded-md border border-neutral-200 hover:bg-neutral-50 transition-colors cursor-pointer"
                title="Shuffle a new random color for this team"
              >
                <Shuffle className="w-3 h-3 text-neutral-500" />
                <span>Random Color</span>
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {TEAM_COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                    color === c ? 'ring-2 ring-neutral-900 ring-offset-2 scale-110' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Table / Station Allocation
            </label>
            <Input
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder={`e.g. Table ${teams.length + 1}`}
              className="text-xs font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Assign Mentor
              </label>
              <select
                value={selectedMentorId}
                onChange={(e) => setSelectedMentorId(e.target.value)}
                className="w-full h-9 px-2 text-xs rounded-lg border border-neutral-200 bg-white"
              >
                <option value="">No Mentor</option>
                {mentors.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Transit Bus
              </label>
              <select
                value={selectedBusId}
                onChange={(e) => setSelectedBusId(e.target.value)}
                className="w-full h-9 px-2 text-xs rounded-lg border border-neutral-200 bg-white"
              >
                <option value="">No Bus</option>
                {buses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateOpen(false)}
              className="text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="text-xs cursor-pointer">
              Create Team
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT TEAM & ROSTER MODAL */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Team: ${currentEditTeam?.name || editTeamName}`}
        description="Modify team details, manage assigned mentors, and allocate/remove students."
        maxWidth="lg"
      >
        <div className="space-y-4 pt-1">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-lg text-xs font-medium">
            <button
              type="button"
              onClick={() => setEditTab('details')}
              className={`flex-1 py-1.5 px-3 rounded-md transition-all cursor-pointer text-center ${
                editTab === 'details'
                  ? 'bg-white text-neutral-950 font-semibold shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-950'
              }`}
            >
              Team Details
            </button>
            <button
              type="button"
              onClick={() => setEditTab('mentors')}
              className={`flex-1 py-1.5 px-3 rounded-md transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                editTab === 'mentors'
                  ? 'bg-white text-neutral-950 font-semibold shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-950'
              }`}
            >
              <span>Mentors</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-200 text-neutral-800 font-mono">
                {currentEditMentors.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setEditTab('students')}
              className={`flex-1 py-1.5 px-3 rounded-md transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                editTab === 'students'
                  ? 'bg-white text-neutral-950 font-semibold shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-950'
              }`}
            >
              <span>Students</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-200 text-neutral-800 font-mono">
                {currentEditStudents.length}
              </span>
            </button>
          </div>

          {/* TAB 1: DETAILS */}
          {editTab === 'details' && (
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Team Name *
                </label>
                <Input
                  required
                  value={editTeamName}
                  onChange={(e) => setEditTeamName(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Table / Station Allocation
                  </label>
                  <Input
                    value={editTableNumber}
                    onChange={(e) => setEditTableNumber(e.target.value)}
                    className="text-xs font-mono"
                    placeholder="e.g. Table 1"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Transit Bus
                  </label>
                  <select
                    value={editBusId}
                    onChange={(e) => setEditBusId(e.target.value)}
                    className="w-full h-9 px-2 text-xs rounded-lg border border-neutral-200 bg-white"
                  >
                    <option value="">No Bus Assigned</option>
                    {buses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-neutral-700 flex items-center gap-1">
                    <Palette className="w-3.5 h-3.5" />
                    <span>Team Color Identity</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditColor(getRandomTeamColor(teams))}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-neutral-600 hover:text-neutral-950 px-2 py-0.5 rounded-md border border-neutral-200 hover:bg-neutral-50 transition-colors cursor-pointer"
                    title="Shuffle a new random color for this team"
                  >
                    <Shuffle className="w-3 h-3 text-neutral-500" />
                    <span>Random Color</span>
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {TEAM_COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                        editColor === c ? 'ring-2 ring-neutral-900 ring-offset-2 scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {editColor === c && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditOpen(false)}
                  className="text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="text-xs cursor-pointer">
                  Save Changes
                </Button>
              </div>
            </form>
          )}

          {/* TAB 2: MENTORS */}
          {editTab === 'mentors' && (
            <div className="space-y-4">
              {/* Assign Mentor Form */}
              <form onSubmit={handleAssignMentor} className="p-3 bg-neutral-50 rounded-lg border border-neutral-200/70 space-y-2.5">
                <label className="block text-xs font-semibold text-neutral-800">
                  Assign Mentor to this Team
                </label>
                <div className="flex gap-2">
                  <select
                    value={assignMentorId}
                    onChange={(e) => setAssignMentorId(e.target.value)}
                    className="flex-1 h-9 px-2.5 text-xs rounded-lg border border-neutral-200 bg-white"
                  >
                    <option value="">Select a mentor to assign...</option>
                    {mentors
                      .filter((m) => !currentEditMentors.some((em) => em.id === m.id))
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.fullName} ({m.club || m.branch || 'Mentor'}{m.teamName ? ` · in ${m.teamName}` : ''})
                        </option>
                      ))}
                  </select>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!assignMentorId}
                    className="gap-1 text-xs shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Assign</span>
                  </Button>
                </div>
              </form>

              {/* Mentors List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-neutral-700">
                  <span>Assigned Mentors ({currentEditMentors.length})</span>
                  <span className="text-[11px] text-neutral-400 font-normal">
                    Industry & cohort guides
                  </span>
                </div>

                {currentEditMentors.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-neutral-200 rounded-lg text-xs text-neutral-400">
                    No mentors currently assigned to this team. Use the selector above to assign a mentor.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {currentEditMentors.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-200 bg-white"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {getInitials(m.fullName)}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-xs text-neutral-900 block truncate">
                              {m.fullName}
                            </span>
                            <span className="text-[11px] text-neutral-500 block truncate">
                              {m.club || m.branch || 'Mentor'} {m.phone ? `· ${m.phone}` : ''}
                            </span>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => currentEditTeam && handleRemoveMentor(currentEditTeam.id, m.id)}
                          className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 gap-1 h-7 px-2 cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-3 border-t border-neutral-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditOpen(false)}
                  className="text-xs"
                >
                  Done
                </Button>
              </div>
            </div>
          )}

          {/* TAB 3: STUDENTS */}
          {editTab === 'students' && (
            <div className="space-y-4">
              {/* Add Student Form */}
              <form onSubmit={handleAssignStudent} className="p-3 bg-neutral-50 rounded-lg border border-neutral-200/70 space-y-2.5">
                <label className="block text-xs font-semibold text-neutral-800">
                  Add Participant to this Team
                </label>
                <div className="flex gap-2">
                  <select
                    value={assignStudentId}
                    onChange={(e) => setAssignStudentId(e.target.value)}
                    className="flex-1 h-9 px-2.5 text-xs rounded-lg border border-neutral-200 bg-white"
                  >
                    <option value="">Select a student to allocate...</option>
                    {students
                      .filter((s) => s.teamId !== currentEditTeam?.id && !currentEditTeam?.studentIds?.includes(s.id))
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.fullName} ({s.branch || 'Student'}{s.teamName ? ` · in ${s.teamName}` : ' · Unassigned'})
                        </option>
                      ))}
                  </select>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!assignStudentId}
                    className="gap-1 text-xs shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </Button>
                </div>
              </form>

              {/* Students List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-neutral-700">
                  <span>Allocated Students ({currentEditStudents.length})</span>
                  <span className="text-[11px] text-neutral-400 font-normal">
                    Team participant roster
                  </span>
                </div>

                {currentEditStudents.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-neutral-200 rounded-lg text-xs text-neutral-400">
                    No students currently allocated to this team. Use the selector above to add participants.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {currentEditStudents.map((s) => {
                      const isPresent = attendance.some(
                        (a) => a.studentId === s.id && a.status === 'present'
                      );

                      return (
                        <div
                          key={s.id}
                          className="flex items-center justify-between p-2 rounded-lg border border-neutral-200 bg-white"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                              {getInitials(s.fullName)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-xs text-neutral-900 truncate">
                                  {s.fullName}
                                </span>
                                <span
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                    isPresent ? 'bg-emerald-500' : 'bg-neutral-300'
                                  }`}
                                  title={isPresent ? 'Checked In' : 'Attendance Pending'}
                                />
                              </div>
                              <span className="text-[11px] text-neutral-400 block truncate">
                                {s.branch || 'CSE'} {s.phone ? `· ${s.phone}` : ''}
                              </span>
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => currentEditTeam && handleRemoveStudent(currentEditTeam.id, s.id)}
                            className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 gap-1 h-7 px-2 cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-3 border-t border-neutral-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditOpen(false)}
                  className="text-xs"
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
