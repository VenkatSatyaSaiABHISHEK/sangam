'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { User } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { Building, Mail, Phone, Plus, Trash2, UserPlus, GraduationCap } from 'lucide-react';

import {
  saveUserToFirestore,
  deleteUserFromFirestore,
  fetchUsersFromFirestore,
} from '@/lib/firebase-db';

export default function AdminTeachersPage() {
  const { showToast } = useToast();
  const [teachers, setTeachers] = useState<User[]>([]);

  // Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');

  const loadData = async () => {
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const data = await res.json();
        setTeachers(data.teachers || []);
      }
    } catch {
      setTeachers(db.getTeachers());
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      showToast('Validation Error', 'Full name and email are required.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createTeacher',
          payload: {
            fullName: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim() || '+1 000 000 0000',
            department: department.trim() || 'General Faculty',
          },
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to register teacher');
      }

      showToast('Teacher Registered', `${name} added to faculty roster & synced to Firebase.`, 'success');
      setIsAddOpen(false);
      setName('');
      setEmail('');
      setPhone('');
      setDepartment('');
      loadData();
    } catch (err: any) {
      showToast('Creation Failed', err.message || 'Could not register teacher.', 'error');
    }
  };

  const handleDeleteTeacher = async (teacher: User) => {
    if (confirm(`Remove teacher ${teacher.fullName} from summit roster?`)) {
      try {
        await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'deleteTeacher',
            payload: { id: teacher.id },
          }),
        });
        showToast('Teacher Removed', `${teacher.fullName} removed from local & Firebase.`, 'info');
      } catch (err: any) {
        showToast('Deletion Error', err.message, 'error');
      }
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-950">
            Teachers & Faculty ({teachers.length})
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Faculty members and teachers overseeing student cohorts, viewing rosters, and supporting summit operations.
          </p>
        </div>

        <Button onClick={() => setIsAddOpen(true)} className="gap-1.5 text-xs shadow-xs cursor-pointer">
          <UserPlus className="w-4 h-4" />
          <span>Add Teacher</span>
        </Button>
      </div>

      {/* Grid or Empty State */}
      {teachers.length === 0 ? (
        <Card className="p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900">No teachers registered</h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1">
              Add teachers and faculty members who will oversee student cohorts and coordinate with summit leadership.
            </p>
          </div>
          <Button onClick={() => setIsAddOpen(true)} size="sm" className="gap-1.5 text-xs cursor-pointer">
            <Plus className="w-3.5 h-3.5" />
            <span>Register First Teacher</span>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teachers.map((teacher) => (
            <Card key={teacher.id} className="p-5 flex flex-col justify-between space-y-4 border-neutral-200">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {teacher.fullName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-neutral-950 truncate">
                        {teacher.fullName}
                      </h3>
                      <span className="text-[10px] font-mono text-neutral-400 block truncate">
                        {teacher.department || 'FACULTY ROSTER'}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTeacher(teacher)}
                    className="p-1 h-auto text-neutral-400 hover:text-red-600 cursor-pointer"
                    title="Remove Teacher"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div className="space-y-1.5 text-xs text-neutral-600 pt-2 border-t border-neutral-100">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span className="truncate">{teacher.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span className="font-mono">{teacher.phone}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                <Badge variant="neutral" size="sm" className="text-[10px]">
                  Teacher / Faculty
                </Badge>
                <span className="text-[10px] text-neutral-400 font-mono">
                  Full Roster Access
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Teacher Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Register Faculty Teacher"
        description="Add a faculty member to oversee student participants and team pods."
      >
        <form onSubmit={handleCreateTeacher} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Full Name *
            </label>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr. Eleanor Vance"
              className="text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Email Address *
            </label>
            <Input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="eleanor.vance@university.edu"
              className="text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Phone Number
            </label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 019 4432"
              className="text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Department / Discipline
            </label>
            <Input
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Computer Science & Engineering"
              className="text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddOpen(false)}
              className="text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="text-xs cursor-pointer">
              Register Teacher
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
