'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { User, Team } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import Link from 'next/link';
import { GraduationCap, Mail, Phone, Plus, Trash2, UserPlus, ExternalLink, Pencil } from 'lucide-react';

import {
  saveUserToFirestore,
  deleteUserFromFirestore,
  fetchUsersFromFirestore,
} from '@/lib/firebase-db';

import { getCachedData, setCachedData } from '@/lib/data-cache';

export default function AdminMentorsPage() {
  const { showToast } = useToast();
  const cached = typeof window !== 'undefined' ? getCachedData() : null;
  const [loading, setLoading] = useState(!cached?.mentors?.length);
  const [mentors, setMentors] = useState<User[]>(cached?.mentors || []);
  const [teams, setTeams] = useState<Team[]>(cached?.teams || []);

  // Add Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [teamId, setTeamId] = useState('');
  const [club, setClub] = useState('Smart City Lab');
  const [branch, setBranch] = useState('CSE');
  const [year, setYear] = useState('4th Year');
  const [mentorType, setMentorType] = useState<'cohort' | 'support'>('cohort');

  // Edit Modal
  const [editingMentor, setEditingMentor] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editTeamId, setEditTeamId] = useState('');
  const [editClub, setEditClub] = useState('');
  const [editBranch, setEditBranch] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editMentorType, setEditMentorType] = useState<'cohort' | 'support'>('cohort');

  const loadData = async () => {
    try {
      const res = await fetch('/api/data');
      let apiMentors: User[] = [];
      let apiTeams: Team[] = [];

      if (res.ok) {
        const data = await res.json();
        apiMentors = data.mentors || [];
        apiTeams = data.teams || [];
        setCachedData({ ...cached, mentors: apiMentors, teams: apiTeams });
      } else {
        apiMentors = db.getMentors();
        apiTeams = db.getTeams();
      }

      try {
        const firestoreMentors = await fetchUsersFromFirestore('mentor');
        if (firestoreMentors && firestoreMentors.length > 0) {
          const map = new Map<string, User>();
          apiMentors.forEach((m) => map.set(m.id, m));
          firestoreMentors.forEach((m) => map.set(m.id, { ...map.get(m.id), ...m }));
          apiMentors = Array.from(map.values());
        }
      } catch {
        // Fallback gracefully
      }

      setMentors(apiMentors);
      setTeams(apiTeams);
    } catch {
      setMentors(db.getMentors());
      setTeams(db.getTeams());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      showToast('Validation Error', 'Full name and email are required.', 'error');
      return;
    }

    const isSupport = mentorType === 'support' || !teamId;
    const finalMentorType = isSupport ? 'support' : 'cohort';
    const finalTeamId = isSupport ? '' : teamId;

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createMentor',
          payload: {
            fullName: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim() || '+1 000 000 0000',
            teamId: finalTeamId,
            club: club.trim(),
            branch: branch.trim(),
            year: year.trim(),
            mentorType: finalMentorType,
          },
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to create mentor');
      }

      showToast('Mentor Created', `${name} registered as ${finalMentorType === 'support' ? 'Support' : 'Cohort'} mentor.`, 'success');
      setIsAddOpen(false);
      setName('');
      setEmail('');
      setPhone('');
      setTeamId('');
      setClub('Smart City Lab');
      setBranch('CSE');
      setYear('4th Year');
      setMentorType('cohort');
      loadData();
    } catch (err: any) {
      showToast('Creation Failed', err.message || 'Could not register mentor.', 'error');
    }
  };

  const handleDeleteMentor = async (mentor: User) => {
    if (confirm(`Are you sure you want to remove ${mentor.fullName}?`)) {
      try {
        const res = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'deleteMentor',
            payload: { id: mentor.id },
          }),
        });
        if (!res.ok) throw new Error('Failed to delete');
        showToast('Mentor Removed', `${mentor.fullName} was removed from the roster.`, 'info');
      } catch (err: any) {
        showToast('Deletion Error', err.message, 'error');
      }
      loadData();
    }
  };

  const handleOpenEdit = (mentor: User) => {
    setEditingMentor(mentor);
    setEditName(mentor.fullName || '');
    setEditEmail(mentor.email || '');
    setEditPhone(mentor.phone || '');
    setEditTeamId(mentor.teamId || '');
    setEditClub(mentor.club || 'Smart City Lab');
    setEditBranch(mentor.branch || 'CSE');
    setEditYear(mentor.year || '4th Year');
    setEditMentorType((mentor.mentorType as 'cohort' | 'support') || (mentor.teamId ? 'cohort' : 'support'));
  };

  const handleUpdateMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMentor) return;
    if (!editName.trim() || !editEmail.trim()) {
      showToast('Validation Error', 'Full name and email are required.', 'error');
      return;
    }

    const isSupport = editMentorType === 'support' || !editTeamId;
    const finalMentorType = isSupport ? 'support' : 'cohort';
    const finalTeamId = isSupport ? '' : editTeamId;

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateMentor',
          payload: {
            id: editingMentor.id,
            updates: {
              fullName: editName.trim(),
              email: editEmail.trim().toLowerCase(),
              phone: editPhone.trim() || '+1 000 000 0000',
              teamId: finalTeamId,
              club: editClub.trim(),
              branch: editBranch.trim(),
              year: editYear.trim(),
              mentorType: finalMentorType,
            },
          },
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to update mentor');
      }

      showToast('Mentor Updated', `${editName} details saved successfully.`, 'success');
      setEditingMentor(null);
      loadData();
    } catch (err: any) {
      showToast('Update Failed', err.message || 'Could not update mentor.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-950">
            Sangam Mentors ({mentors.length})
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Roster of industry mentors assigned to guide teams through technical architecture and presentations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/live" target="_blank">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs bg-white hover:bg-neutral-50 shadow-xs cursor-pointer">
              <ExternalLink className="w-3.5 h-3.5 text-neutral-600" />
              <span>Public Live Link</span>
            </Button>
          </Link>
          <Button onClick={() => setIsAddOpen(true)} className="gap-1.5 text-xs shadow-xs cursor-pointer">
            <UserPlus className="w-4 h-4" />
            <span>Add Mentor</span>
          </Button>
        </div>
      </div>

      {/* Grid or Empty State */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 space-y-3 border-neutral-200 bg-white animate-pulse">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-200 shrink-0" />
                  <div className="space-y-1">
                    <div className="h-4 w-28 bg-neutral-200 rounded" />
                    <div className="h-3 w-20 bg-neutral-100 rounded" />
                  </div>
                </div>
                <div className="h-4 w-8 bg-neutral-100 rounded" />
              </div>
              <div className="space-y-2 pt-2 border-t border-neutral-100">
                <div className="h-3 w-32 bg-neutral-100 rounded" />
                <div className="h-3 w-40 bg-neutral-100 rounded" />
                <div className="h-3 w-24 bg-neutral-100 rounded" />
              </div>
              <div className="pt-2 border-t border-neutral-100">
                <div className="h-6 w-full bg-neutral-100 rounded" />
              </div>
            </Card>
          ))}
        </div>
      ) : mentors.length === 0 ? (
        <Card className="p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900">No mentors registered</h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1">
              Add advisors and mentors to guide teams during project execution.
            </p>
          </div>
          <Button onClick={() => setIsAddOpen(true)} className="text-xs gap-1.5 mx-auto">
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Mentor</span>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {mentors.map((mentor) => {
            const isSupport = mentor.mentorType === 'support' || !mentor.teamId;

            return (
              <Card key={mentor.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden ${
                      mentor.avatarUrl
                        ? 'bg-neutral-100'
                        : isSupport
                        ? 'bg-gradient-to-tr from-amber-600 to-orange-500'
                        : 'bg-gradient-to-tr from-emerald-600 to-teal-600'
                    }`}>
                      {mentor.avatarUrl ? (
                        <img src={mentor.avatarUrl} alt={mentor.fullName} className="w-full h-full object-cover" />
                      ) : (
                        mentor.fullName.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm text-neutral-950 truncate">
                        {mentor.fullName}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                          isSupport
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isSupport ? 'Support Mentor' : 'Cohort Mentor'}
                        </span>
                        {mentor.club && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800">
                            {mentor.club}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(mentor)}
                      title="Edit Mentor"
                      className="p-1.5 text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteMentor(mentor)}
                      title="Delete Mentor"
                      className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-neutral-600 pt-2 border-t border-neutral-100">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400">Branch & Year:</span>
                    <span className="font-mono text-neutral-700">
                      {mentor.branch || 'General'} • {mentor.year || '4th Year'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-0.5">
                    <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span className="truncate">{mentor.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span className="font-mono">{mentor.phone}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-100">
                  <Badge variant={isSupport ? 'warning' : 'outline'} size="sm" className="w-full justify-center">
                    {isSupport ? 'All Teams (Floating Support)' : (mentor.teamName || 'General Mentor')}
                  </Badge>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Mentor Modal */}
      {isAddOpen && (
        <Modal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          title="Add Sangam Mentor"
          description="Register a mentor with their club (e.g. KSCS, Smart City Lab), branch, academic year, and role."
        >
          <form onSubmit={handleCreateMentor} className="space-y-3.5 pt-2">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Mentor Type *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMentorType('cohort')}
                  className={`p-2 rounded-lg border text-left cursor-pointer transition-colors ${
                    mentorType === 'cohort'
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                  }`}
                >
                  <div className="text-xs font-bold">Cohort Mentor</div>
                  <div className="text-[10px] opacity-80">Assigned to a specific team</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMentorType('support');
                    setTeamId('');
                  }}
                  className={`p-2 rounded-lg border text-left cursor-pointer transition-colors ${
                    mentorType === 'support'
                      ? 'border-amber-600 bg-amber-600 text-white'
                      : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                  }`}
                >
                  <div className="text-xs font-bold">Support Mentor</div>
                  <div className="text-[10px] opacity-80">Floating across all teams</div>
                </button>
              </div>
            </div>

            <Input
              label="Full Name *"
              placeholder="e.g. Ram Mohan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Club / Lab Affiliation"
                placeholder="e.g. KSCS or Smart City Lab"
                value={club}
                onChange={(e) => setClub(e.target.value)}
              />

              <Input
                label="Academic Year"
                placeholder="e.g. 4th Year or 3rd Year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Branch / Department"
                placeholder="e.g. CSE or AI & Data Science"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              />

              <Input
                label="Phone Number"
                placeholder="+91 92000 20002"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <Input
              label="Mentor Email Address *"
              type="email"
              placeholder="ram.mohan@sangam.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {mentorType === 'cohort' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-800">
                  Assign Team (Optional)
                </label>
                <select
                  value={teamId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTeamId(val);
                    if (!val) {
                      setMentorType('support');
                    }
                  }}
                  className="w-full h-10 px-3 py-2 text-xs rounded-lg border border-neutral-300 bg-white"
                >
                  <option value="">No Team Assigned (Support Mentor - Floating)</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="pt-3 flex justify-end gap-2 border-t border-neutral-100">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Register Mentor</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Mentor Modal */}
      {editingMentor && (
        <Modal
          isOpen={!!editingMentor}
          onClose={() => setEditingMentor(null)}
          title="Edit Sangam Mentor"
          description="Update mentor details, club affiliation, branch, role, or team assignment."
        >
          <form onSubmit={handleUpdateMentor} className="space-y-3.5 pt-2">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Mentor Type *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditMentorType('cohort')}
                  className={`p-2 rounded-lg border text-left cursor-pointer transition-colors ${
                    editMentorType === 'cohort'
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                  }`}
                >
                  <div className="text-xs font-bold">Cohort Mentor</div>
                  <div className="text-[10px] opacity-80">Assigned to a specific team</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditMentorType('support');
                    setEditTeamId('');
                  }}
                  className={`p-2 rounded-lg border text-left cursor-pointer transition-colors ${
                    editMentorType === 'support'
                      ? 'border-amber-600 bg-amber-600 text-white'
                      : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                  }`}
                >
                  <div className="text-xs font-bold">Support Mentor</div>
                  <div className="text-[10px] opacity-80">Floating across all teams</div>
                </button>
              </div>
            </div>

            <Input
              label="Full Name *"
              placeholder="e.g. Ram Mohan"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
              autoFocus
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Club / Lab Affiliation"
                placeholder="e.g. KSCS or Smart City Lab"
                value={editClub}
                onChange={(e) => setEditClub(e.target.value)}
              />

              <Input
                label="Academic Year"
                placeholder="e.g. 4th Year or 3rd Year"
                value={editYear}
                onChange={(e) => setEditYear(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Branch / Department"
                placeholder="e.g. CSE or AI & Data Science"
                value={editBranch}
                onChange={(e) => setEditBranch(e.target.value)}
              />

              <Input
                label="Phone Number"
                placeholder="+91 92000 20002"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
            </div>

            <Input
              label="Mentor Email Address *"
              type="email"
              placeholder="ram.mohan@sangam.org"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              required
            />

            {editMentorType === 'cohort' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-800">
                  Assign Team (Optional)
                </label>
                <select
                  value={editTeamId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditTeamId(val);
                    if (!val) {
                      setEditMentorType('support');
                    }
                  }}
                  className="w-full h-10 px-3 py-2 text-xs rounded-lg border border-neutral-300 bg-white"
                >
                  <option value="">No Team Assigned (Support Mentor - Floating)</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="pt-3 flex justify-end gap-2 border-t border-neutral-100">
              <Button type="button" variant="outline" onClick={() => setEditingMentor(null)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
