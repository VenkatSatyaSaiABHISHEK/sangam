'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { User, Team, Bus } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import Link from 'next/link';
import {
  Users,
  Search,
  Plus,
  Trash2,
  Edit2,
  Mail,
  Phone,
  Layers,
  Bus as BusIcon,
  CheckCircle2,
  XCircle,
  Clock,
  UserPlus,
  FileSpreadsheet,
  Download,
  ExternalLink,
} from 'lucide-react';

import {
  saveUserToFirestore,
  deleteUserFromFirestore,
  fetchUsersFromFirestore,
} from '@/lib/firebase-db';
import { StudentExcelModal } from '@/components/admin';
import { exportStudentsToExcel } from '@/lib/excel-utils';

export default function AdminStudentsPage() {
  const { showToast } = useToast();
  const [students, setStudents] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Excel Modal & Export State
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Add Student Modal State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newBranch, setNewBranch] = useState('CSE');
  const [newYear, setNewYear] = useState('1st Year');
  const [newTeamId, setNewTeamId] = useState('');
  const [newBusId, setNewBusId] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Edit Student Modal State
  const [editingStudent, setEditingStudent] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBranch, setEditBranch] = useState('CSE');
  const [editYear, setEditYear] = useState('1st Year');
  const [editTeamId, setEditTeamId] = useState('');
  const [editBusId, setEditBusId] = useState('');

  const loadData = async () => {
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
        setTeams(data.teams || []);
        setBuses(data.buses || []);
      }
    } catch {
      setStudents(db.getStudents());
      setTeams(db.getTeams());
      setBuses(db.getBuses());
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      showToast('Validation Error', 'Full name is required.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createStudent',
          payload: {
            fullName: newName.trim(),
            email: newEmail.trim() ? newEmail.trim().toLowerCase() : undefined,
            phone: newPhone.trim() || '+91 000 000 0000',
            branch: newBranch.trim(),
            year: newYear.trim(),
            teamId: newTeamId || undefined,
            busId: newBusId || undefined,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create student');

      showToast('Student Registered', `${newName} saved to summit database & Firebase.`, 'success');
      setIsAddModalOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewBranch('CSE');
      setNewYear('1st Year');
      setNewTeamId('');
      setNewBusId('');
      loadData();
    } catch (err: any) {
      showToast('Creation Failed', err.message || 'Could not create student record.', 'error');
    }
  };

  const handleOpenEdit = (student: User) => {
    setEditingStudent(student);
    setEditName(student.fullName);
    setEditEmail(student.isProvisionalEmail ? '' : student.email);
    setEditPhone(student.phone);
    setEditBranch(student.branch || 'CSE');
    setEditYear(student.year || '1st Year');
    setEditTeamId(student.teamId || '');
    setEditBusId(student.busId || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateStudent',
          payload: {
            id: editingStudent.id,
            updates: {
              fullName: editName.trim(),
              email: editEmail.trim() ? editEmail.trim().toLowerCase() : undefined,
              phone: editPhone.trim(),
              branch: editBranch.trim(),
              year: editYear.trim(),
              teamId: editTeamId || undefined,
              busId: editBusId || undefined,
            },
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update student');

      showToast('Student Updated', `${editName} updated successfully.`, 'success');
      setEditingStudent(null);
      loadData();
    } catch (err: any) {
      showToast('Update Failed', err.message || 'Could not update student.', 'error');
    }
  };

  const handleDelete = async (student: User) => {
    if (confirm(`Are you sure you want to delete ${student.fullName}?`)) {
      try {
        const res = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'deleteStudent',
            payload: { id: student.id },
          }),
        });
        if (!res.ok) throw new Error('Deletion failed');
        showToast('Student Removed', `${student.fullName} has been removed.`, 'info');
        loadData();
      } catch (err: any) {
        showToast('Delete Failed', err.message || 'Could not delete student.', 'error');
      }
    }
  };

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search);
    const matchesTeam = teamFilter === 'ALL' || s.teamId === teamFilter;
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesTeam && matchesStatus;
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportStudentsToExcel(filteredStudents, teams, buses);
      showToast('Roster Exported', `Exported ${filteredStudents.length} students to Excel.`, 'success');
    } catch (err: any) {
      showToast('Export Failed', err.message || 'Could not export students.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-950">
            Student Management ({students.length})
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Register students, manage cohort teams, assign transit buses, and inspect status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/live" target="_blank">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs bg-white hover:bg-neutral-50 cursor-pointer shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-neutral-600" />
              <span>Public Live Link</span>
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting || students.length === 0}
            className="gap-1.5 text-xs bg-white hover:bg-neutral-50 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-neutral-600" />
            <span>Export Roster</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExcelModalOpen(true)}
            className="gap-1.5 text-xs bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel / CSV Import</span>
          </Button>

          <Button onClick={() => setIsAddModalOpen(true)} className="gap-1.5 text-xs shadow-xs cursor-pointer">
            <UserPlus className="w-4 h-4" />
            <span>Add Student</span>
          </Button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search student by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="h-9 px-2.5 text-xs rounded-lg border border-neutral-200 bg-white text-neutral-700 focus:outline-none focus:ring-1 focus:ring-black"
          >
            <option value="ALL">All Teams ({teams.length})</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-2.5 text-xs rounded-lg border border-neutral-200 bg-white text-neutral-700 focus:outline-none focus:ring-1 focus:ring-black"
          >
            <option value="ALL">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table or Empty State */}
      {filteredStudents.length === 0 ? (
        <Card className="p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900">No students found</h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1">
              {search || teamFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'No student matches your current filter criteria.'
                : 'Your summit cohort has zero registered students. Click below to add the first participant.'}
            </p>
          </div>
          {!search && teamFilter === 'ALL' && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button onClick={() => setIsAddModalOpen(true)} size="sm" className="gap-1.5 text-xs cursor-pointer">
                <Plus className="w-3.5 h-3.5" />
                <span>Register Single Student</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsExcelModalOpen(true)}
                size="sm"
                className="gap-1.5 text-xs cursor-pointer bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Import via Excel / CSV</span>
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden border-neutral-200 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50/75 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Assigned Team</th>
                  <th className="py-3 px-4">Bus Route</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-medium">
                {filteredStudents.map((student) => {
                  const team = teams.find((t) => t.id === student.teamId);
                  const bus = buses.find((b) => b.id === student.busId);

                  return (
                    <tr key={student.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {student.fullName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-semibold text-neutral-900 block">
                              {student.fullName}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono">
                              {student.branch || 'CSE'} • {student.year || '1st Year'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-neutral-600">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-neutral-400 shrink-0" />
                            {student.isProvisionalEmail ? (
                              <span className="inline-flex items-center text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                Pending Email
                              </span>
                            ) : (
                              <span>{student.email}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            <Phone className="w-3 h-3 text-neutral-400 shrink-0" />
                            <span>{student.phone}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {team ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: team.color || '#2563EB' }}
                            />
                            <span className="font-semibold text-neutral-800">{team.name}</span>
                          </div>
                        ) : (
                          <span className="text-neutral-400 italic">Unassigned</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {bus ? (
                          <div className="flex items-center gap-1.5 text-neutral-700">
                            <BusIcon className="w-3.5 h-3.5 text-neutral-400" />
                            <span>{bus.name}</span>
                          </div>
                        ) : (
                          <span className="text-neutral-400 italic">None</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <Badge
                          variant={student.status === 'active' ? 'success' : 'neutral'}
                          size="sm"
                        >
                          {student.status}
                        </Badge>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(student)}
                            className="p-1.5 h-auto text-neutral-500 hover:text-black cursor-pointer"
                            title="Edit Student"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(student)}
                            className="p-1.5 h-auto text-neutral-500 hover:text-red-600 cursor-pointer"
                            title="Delete Student"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Student Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New Student"
        description="Add a participant to the summit cohort with contact details and optional team assignment."
      >
        <form onSubmit={handleCreateStudent} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Full Name *
            </label>
            <Input
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Maya Lin"
              className="text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Email Address <span className="text-neutral-400 font-normal">(Optional — can update later)</span>
            </label>
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="e.g. maya.lin@gmail.com (or leave blank)"
              className="text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Phone Number
            </label>
            <Input
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="+1 555 019 2831"
              className="text-xs font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Branch / Dept
              </label>
              <Input
                value={newBranch}
                onChange={(e) => setNewBranch(e.target.value)}
                placeholder="e.g. CSE or ECE"
                className="text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Academic Year
              </label>
              <select
                value={newYear}
                onChange={(e) => setNewYear(e.target.value)}
                className="w-full h-9 px-2 text-xs rounded-lg border border-neutral-200 bg-white"
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Assign Team
              </label>
              <select
                value={newTeamId}
                onChange={(e) => setNewTeamId(e.target.value)}
                className="w-full h-9 px-2 text-xs rounded-lg border border-neutral-200 bg-white"
              >
                <option value="">No Team Assigned</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Transit Bus
              </label>
              <select
                value={newBusId}
                onChange={(e) => setNewBusId(e.target.value)}
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

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
              className="text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="text-xs cursor-pointer">
              Register Student
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Student Modal */}
      <Modal
        isOpen={!!editingStudent}
        onClose={() => setEditingStudent(null)}
        title="Edit Student Profile"
        description="Update participant contact details, team assignment, or transit bus allocation."
      >
        <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Full Name *
            </label>
            <Input
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Email Address <span className="text-neutral-400 font-normal">(Optional)</span>
            </label>
            <Input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder="e.g. student@gmail.com"
              className="text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Phone Number
            </label>
            <Input
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              className="text-xs font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Branch / Dept
              </label>
              <Input
                value={editBranch}
                onChange={(e) => setEditBranch(e.target.value)}
                className="text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Academic Year
              </label>
              <select
                value={editYear}
                onChange={(e) => setEditYear(e.target.value)}
                className="w-full h-9 px-2 text-xs rounded-lg border border-neutral-200 bg-white"
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Assign Team
              </label>
              <select
                value={editTeamId}
                onChange={(e) => setEditTeamId(e.target.value)}
                className="w-full h-9 px-2 text-xs rounded-lg border border-neutral-200 bg-white"
              >
                <option value="">No Team</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
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
              onClick={() => setEditingStudent(null)}
              className="text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="text-xs cursor-pointer">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Excel / CSV Import Modal */}
      <StudentExcelModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        existingStudents={students}
        teams={teams}
        buses={buses}
        onImportSuccess={loadData}
      />
    </div>
  );
}
