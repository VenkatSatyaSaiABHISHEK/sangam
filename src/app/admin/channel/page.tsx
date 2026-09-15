'use client';

import React, { useState, useEffect } from 'react';
import { User, ChannelSettings } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Search,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Users,
  GraduationCap,
  Loader2,
  RefreshCw,
  Lock,
  Unlock,
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

export default function AdminChannelPermissionsPage() {
  const { showToast } = useToast();
  const [students, setStudents] = useState<User[]>([]);
  const [settings, setSettings] = useState<ChannelSettings>({
    studentCanPost: false,
    studentPermissions: {},
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dataRes, channelRes] = await Promise.all([
        fetch('/api/data?include=students'),
        fetch('/api/channel'),
      ]);

      if (dataRes.ok) {
        const d = await dataRes.json();
        setStudents(d.students || []);
      }
      if (channelRes.ok) {
        const c = await channelRes.json();
        if (c.settings) {
          setSettings(c.settings);
        }
      }
    } catch {
      showToast('Error', 'Failed to load student permissions.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const perms = settings.studentPermissions || {};

  const isStudentAllowed = (student: User): boolean => {
    const byId = perms[student.id];
    const byEmail = student.email ? perms[student.email.toLowerCase()] : undefined;

    if (byId !== undefined) return byId;
    if (byEmail !== undefined) return byEmail;
    // Default: If not explicitly set, depends on global studentCanPost setting
    return Boolean(settings.studentCanPost);
  };

  const handleToggleStudent = async (student: User) => {
    const currentAllowed = isStudentAllowed(student);
    const newAllowed = !currentAllowed;

    setSavingId(student.id);

    // Optimistic UI update
    const updatedPerms = {
      ...perms,
      [student.id]: newAllowed,
      ...(student.email ? { [student.email.toLowerCase()]: newAllowed } : {}),
    };
    setSettings((prev) => ({
      ...prev,
      studentPermissions: updatedPerms,
    }));

    try {
      const res = await fetch('/api/channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updatePermissions',
          studentId: student.id,
          email: student.email,
          canChat: newAllowed,
        }),
      });

      if (res.ok) {
        showToast(
          newAllowed ? 'Chat Access Granted' : 'Chat Access Revoked',
          `${student.fullName} ${newAllowed ? 'can now' : 'can no longer'} send messages in the channel.`,
          newAllowed ? 'success' : 'info'
        );
      } else {
        throw new Error();
      }
    } catch {
      showToast('Error', 'Failed to update student permission.', 'error');
      // Revert on failure
      loadData();
    } finally {
      setSavingId(null);
    }
  };

  const handleBulkSetAll = async (allowAll: boolean) => {
    setIsBulkUpdating(true);
    const bulkMap: Record<string, boolean> = {};
    students.forEach((s) => {
      bulkMap[s.id] = allowAll;
      if (s.email) bulkMap[s.email.toLowerCase()] = allowAll;
    });

    setSettings((prev) => ({
      ...prev,
      studentCanPost: allowAll,
      studentPermissions: bulkMap,
    }));

    try {
      const res = await fetch('/api/channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updatePermissions',
          bulkPermissions: bulkMap,
          studentCanPost: allowAll,
        }),
      });

      if (res.ok) {
        showToast(
          allowAll ? 'All Students Allowed' : 'All Students Restricted',
          allowAll
            ? 'All registered students can now post in the channel.'
            : 'All students are now restricted to view-only mode.',
          'info'
        );
      }
    } catch {
      showToast('Error', 'Failed to update permissions.', 'error');
      loadData();
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.fullName?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.teamName?.toLowerCase().includes(q)
    );
  });

  const allowedCount = students.filter((s) => isStudentAllowed(s)).length;
  const restrictedCount = students.length - allowedCount;

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-neutral-950 text-white flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-950">
              Student Chat Permissions
            </h1>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Individually control which students are allowed to send messages in the Sangam Open
            Channel. Mentors and faculty always have unrestricted posting access.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={loading}
          className="shrink-0 gap-1.5 h-9"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 space-y-1">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Students</span>
            <Users className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-neutral-950">{students.length}</p>
        </Card>

        <Card className="p-3.5 space-y-1 border-emerald-200 bg-emerald-50/40">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Chat Allowed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700">{allowedCount}</p>
        </Card>

        <Card className="p-3.5 space-y-1 border-neutral-200 bg-neutral-50/60">
          <div className="flex items-center justify-between text-neutral-600">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Restricted</span>
            <XCircle className="w-4 h-4 text-neutral-400" />
          </div>
          <p className="text-2xl font-bold text-neutral-800">{restrictedCount}</p>
        </Card>

        <Card className="p-3.5 space-y-1 border-neutral-200 bg-neutral-950 text-white">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Mentors & Staff</span>
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-sm font-bold text-white">Full Access</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
        </Card>
      </div>

      {/* Action Bar & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search students by name, email, or team..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-neutral-200 bg-white placeholder:text-neutral-400 focus:outline-none focus:border-neutral-950"
          />
        </div>

        {/* Bulk Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkSetAll(true)}
            disabled={isBulkUpdating || loading}
            className="text-xs h-9 gap-1.5"
          >
            <Unlock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Allow All</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkSetAll(false)}
            disabled={isBulkUpdating || loading}
            className="text-xs h-9 gap-1.5 text-rose-700 hover:text-rose-800"
          >
            <Lock className="w-3.5 h-3.5 text-rose-600" />
            <span>Restrict All</span>
          </Button>
        </div>
      </div>

      {/* Student List Table */}
      <Card className="overflow-hidden border border-neutral-200">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-2 text-neutral-400">
            <Loader2 className="w-6 h-6 animate-spin text-neutral-900" />
            <span className="text-xs">Loading student directory...</span>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center space-y-1 text-neutral-400">
            <Users className="w-6 h-6 mx-auto text-neutral-300" />
            <p className="text-xs font-semibold text-neutral-600">No students found</p>
            <p className="text-[11px]">Try adjusting your search terms.</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {filteredStudents.map((student) => {
              const allowed = isStudentAllowed(student);
              const isSavingThis = savingId === student.id;

              return (
                <div
                  key={student.id}
                  className="p-3.5 sm:px-5 flex items-center justify-between hover:bg-neutral-50/80 transition-colors"
                >
                  {/* Student Identity */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs overflow-hidden">
                      {student.avatarUrl ? (
                        <img src={student.avatarUrl} alt={student.fullName} className="w-full h-full object-cover" />
                      ) : (
                        student.fullName?.charAt(0).toUpperCase() || 'S'
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-950 truncate">
                          {student.fullName}
                        </span>
                        {student.teamName && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200 shrink-0 font-medium">
                            {student.teamName}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-400 truncate">
                        {student.email || 'No email registered'}
                      </p>
                    </div>
                  </div>

                  {/* Permission Toggle Switch */}
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span
                      className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full hidden sm:inline-block',
                        allowed
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-neutral-100 text-neutral-500'
                      )}
                    >
                      {allowed ? 'Can Chat' : 'Read-Only'}
                    </span>

                    {/* Toggle Switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={allowed}
                      disabled={isSavingThis || isBulkUpdating}
                      onClick={() => handleToggleStudent(student)}
                      className={cn(
                        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none active:scale-95',
                        allowed ? 'bg-neutral-950' : 'bg-neutral-200'
                      )}
                    >
                      <span
                        className={cn(
                          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
                          allowed ? 'translate-x-5' : 'translate-x-0'
                        )}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
