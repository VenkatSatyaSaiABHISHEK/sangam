'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { AttendanceRecord, AttendanceStatus, Team, Bus } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { formatTime } from '@/lib/utils';
import { subscribeToAttendance } from '@/lib/firebase-db';
import {
  Check,
  X,
  Clock,
  Search,
} from 'lucide-react';

interface AttendanceRosterProps {
  allowFullControl?: boolean;
  filterByTeamIds?: string[];
  filterByBusId?: string;
  verifierId?: string;
}

type StatusFilter = 'all' | 'present' | 'absent' | 'late';

export function AttendanceRoster({
  allowFullControl = true,
  filterByTeamIds,
  filterByBusId,
  verifierId = 'mentor',
}: AttendanceRosterProps) {
  const { showToast } = useToast();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [busFilter, setBusFilter] = useState<string>(filterByBusId || 'all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const res = await fetch('/api/data?t=' + Date.now(), {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        let attList: AttendanceRecord[] = data.attendance || [];
        if (filterByTeamIds && filterByTeamIds.length > 0) {
          attList = attList.filter(
            (r) => r.teamId && filterByTeamIds.includes(r.teamId)
          );
        }
        setRecords([...attList]);
        if (Array.isArray(data.teams)) setTeams(data.teams);
        if (Array.isArray(data.buses)) setBuses(data.buses);
        return;
      }
    } catch (err) {
      console.warn('Fallback to local db in AttendanceRoster:', err);
    }

    let data = db.getAttendance();
    if (filterByTeamIds && filterByTeamIds.length > 0) {
      data = data.filter((r) => r.teamId && filterByTeamIds.includes(r.teamId));
    }
    setRecords([...data]);
    setTeams(db.getTeams());
    setBuses(db.getBuses());
  };

  useEffect(() => {
    loadData();

    // Subscribe to real-time attendance changes from Firestore
    const unsubscribe = subscribeToAttendance((liveRecords) => {
      if (liveRecords && liveRecords.length > 0) {
        setRecords((prev) => {
          const map = new Map<string, AttendanceRecord>();
          prev.forEach((r) => map.set(r.studentId, r));
          liveRecords.forEach((lr) => {
            if (lr.studentId) {
              const existing = map.get(lr.studentId);
              map.set(lr.studentId, existing ? { ...existing, ...lr } : lr);
            }
          });
          return Array.from(map.values());
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [filterByTeamIds, filterByBusId]);

  // Instant optimistic update with background persistence
  const handleUpdateStatus = async (
    studentId: string,
    status: AttendanceStatus
  ) => {
    const targetStudent = records.find((r) => r.studentId === studentId);
    const prevRecords = [...records];
    const nowIso = new Date().toISOString();

    // 1. Instant Optimistic UI Update (0ms latency)
    setUpdatingId(studentId);
    setRecords((prev) =>
      prev.map((r) =>
        r.studentId === studentId
          ? {
              ...r,
              status,
              verifiedBy: verifierId,
              verifiedAt: nowIso,
            }
          : r
      )
    );

    // Also update client memory db
    try {
      db.updateAttendance(studentId, status, verifierId);
    } catch {}

    setTimeout(() => {
      setUpdatingId(null);
    }, 400);

    // 2. Persist to API & Firestore
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'markAttendance',
          payload: {
            studentId,
            status,
            verifiedBy: verifierId,
            studentName: targetStudent?.studentName,
            teamId: targetStudent?.teamId,
            teamName: targetStudent?.teamName,
            busId: targetStudent?.busId,
            busName: targetStudent?.busName,
          },
        }),
      });

      if (!res.ok) {
        // Rollback on server error
        setRecords(prevRecords);
        showToast('Save Failed', 'Could not sync attendance with server', 'error');
        return;
      }

      showToast(
        'Status Recorded',
        `${targetStudent?.studentName?.split(' ')[0] || 'Student'} marked as ${status.toUpperCase()}`,
        'success'
      );
    } catch (err) {
      // Rollback on network failure
      setRecords(prevRecords);
      showToast('Network Error', 'Connection failed. Status was not saved.', 'error');
    }
  };

  // Instant optimistic batch update
  const handleBatchMark = async (status: AttendanceStatus) => {
    const targetIds = filteredRecords.map((r) => r.studentId);
    if (targetIds.length === 0) return;

    const prevRecords = [...records];
    const nowIso = new Date().toISOString();

    // 1. Instant Optimistic UI Update
    setRecords((prev) =>
      prev.map((r) =>
        targetIds.includes(r.studentId)
          ? {
              ...r,
              status,
              verifiedBy: verifierId,
              verifiedAt: nowIso,
            }
          : r
      )
    );

    try {
      db.batchMarkAttendance(targetIds, status, verifierId);
    } catch {}

    showToast(
      'Batch Updated',
      `Marked ${targetIds.length} students as ${status.toUpperCase()}`,
      'success'
    );

    // 2. Persist to API & Firestore
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'batchMarkAttendance',
          payload: {
            studentIds: targetIds,
            status,
            verifiedBy: verifierId,
            records: filteredRecords.map((r) => ({
              ...r,
              status,
              verifiedBy: verifierId,
              verifiedAt: nowIso,
            })),
          },
        }),
      });

      if (!res.ok) {
        setRecords(prevRecords);
        showToast('Batch Save Failed', 'Server could not save all records', 'error');
      }
    } catch (err) {
      setRecords(prevRecords);
      showToast('Network Error', 'Batch update could not be saved', 'error');
    }
  };

  const filteredRecords = records.filter((rec) => {
    if (busFilter !== 'all' && rec.busId !== busFilter) return false;
    if (teamFilter !== 'all' && rec.teamId !== teamFilter) return false;
    if (statusFilter !== 'all' && rec.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      return (
        rec.studentName?.toLowerCase().includes(q) ||
        rec.teamName?.toLowerCase().includes(q) ||
        rec.busName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const presentCount = records.filter((r) => r.status === 'present').length;
  const absentCount = records.filter((r) => r.status === 'absent').length;
  const lateCount = records.filter((r) => r.status === 'late').length;
  const totalCount = records.length;
  const attendanceRate =
    totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Live Statistics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <Card
          onClick={() => setStatusFilter(statusFilter === 'present' ? 'all' : 'present')}
          className={`p-3 sm:p-3.5 flex items-center justify-between cursor-pointer transition-all ${
            statusFilter === 'present'
              ? 'ring-2 ring-emerald-500 bg-emerald-50/50'
              : 'hover:border-neutral-300'
          }`}
        >
          <div>
            <p className="text-[10px] sm:text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
              Present
            </p>
            <p className="text-lg sm:text-xl font-bold text-emerald-600 mt-0.5">
              {presentCount}
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
            {totalCount > 0
              ? `${Math.round((presentCount / totalCount) * 100)}%`
              : '0%'}
          </div>
        </Card>

        <Card
          onClick={() => setStatusFilter(statusFilter === 'absent' ? 'all' : 'absent')}
          className={`p-3 sm:p-3.5 flex items-center justify-between cursor-pointer transition-all ${
            statusFilter === 'absent'
              ? 'ring-2 ring-rose-500 bg-rose-50/50'
              : 'hover:border-neutral-300'
          }`}
        >
          <div>
            <p className="text-[10px] sm:text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
              Absent
            </p>
            <p className="text-lg sm:text-xl font-bold text-rose-600 mt-0.5">
              {absentCount}
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs">
            {totalCount > 0
              ? `${Math.round((absentCount / totalCount) * 100)}%`
              : '0%'}
          </div>
        </Card>

        <Card
          onClick={() => setStatusFilter(statusFilter === 'late' ? 'all' : 'late')}
          className={`p-3 sm:p-3.5 flex items-center justify-between cursor-pointer transition-all ${
            statusFilter === 'late'
              ? 'ring-2 ring-amber-500 bg-amber-50/50'
              : 'hover:border-neutral-300'
          }`}
        >
          <div>
            <p className="text-[10px] sm:text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
              Late
            </p>
            <p className="text-lg sm:text-xl font-bold text-amber-600 mt-0.5">
              {lateCount}
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
            {lateCount}
          </div>
        </Card>

        <Card
          onClick={() => setStatusFilter('all')}
          className={`p-3 sm:p-3.5 flex items-center justify-between cursor-pointer transition-all ${
            statusFilter === 'all'
              ? 'ring-2 ring-neutral-900 bg-neutral-50'
              : 'hover:border-neutral-300'
          }`}
        >
          <div>
            <p className="text-[10px] sm:text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
              Rate • Total
            </p>
            <p className="text-lg sm:text-xl font-bold text-neutral-900 mt-0.5">
              {attendanceRate}%
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-800 flex items-center justify-center font-bold text-xs">
            {totalCount}
          </div>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search student name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-8 pr-3 py-1 text-xs rounded-lg border border-neutral-300 bg-white placeholder:text-neutral-400 text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-900 w-full sm:w-52"
              />
            </div>

            {/* Dynamic Team Filter */}
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="h-9 px-2.5 py-1 text-xs rounded-lg border border-neutral-300 bg-white font-medium text-neutral-800 focus:outline-none"
            >
              <option value="all">All Teams ({teams.length || 'All'})</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            {/* Dynamic Bus Filter */}
            {buses.length > 0 && (
              <select
                value={busFilter}
                onChange={(e) => setBusFilter(e.target.value)}
                className="h-9 px-2.5 py-1 text-xs rounded-lg border border-neutral-300 bg-white font-medium text-neutral-800 focus:outline-none"
              >
                <option value="all">All Buses</option>
                {buses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Batch Actions */}
          {allowFullControl && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBatchMark('present')}
                className="text-xs h-8 px-2.5 bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
              >
                <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                <span>Mark All Present</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBatchMark('absent')}
                className="text-xs h-8 px-2.5 bg-white text-rose-700 hover:bg-rose-50 hover:border-rose-200"
              >
                <X className="w-3.5 h-3.5 mr-1 text-rose-600" />
                <span>Mark All Absent</span>
              </Button>
            </div>
          )}
        </div>

        {/* Quick Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-neutral-200/60 no-scrollbar">
          <span className="text-[11px] text-neutral-400 mr-1 font-medium shrink-0">
            Show:
          </span>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-neutral-900 text-white'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter('present')}
            className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-colors cursor-pointer ${
              statusFilter === 'present'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            Present ({presentCount})
          </button>
          <button
            onClick={() => setStatusFilter('absent')}
            className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-colors cursor-pointer ${
              statusFilter === 'absent'
                ? 'bg-rose-600 text-white'
                : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
            }`}
          >
            Absent ({absentCount})
          </button>
          <button
            onClick={() => setStatusFilter('late')}
            className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-colors cursor-pointer ${
              statusFilter === 'late'
                ? 'bg-amber-600 text-white'
                : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
            }`}
          >
            Late ({lateCount})
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE VIEW: Side-by-side Name & Mark buttons (NO HORIZONTAL SWIPING!)    */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-2">
        {filteredRecords.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-neutral-200 text-neutral-500 text-xs">
            No matching student records found.
          </div>
        ) : (
          filteredRecords.map((rec) => {
            const isPresent = rec.status === 'present';
            const isAbsent = rec.status === 'absent';
            const isLate = rec.status === 'late';
            const isUpdating = updatingId === rec.studentId;

            return (
              <div
                key={rec.id || rec.studentId}
                className={`p-3 bg-white rounded-xl border transition-all flex items-center justify-between gap-2.5 ${
                  isPresent
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : isAbsent
                    ? 'border-neutral-200 hover:border-neutral-300'
                    : 'border-amber-200 bg-amber-50/20'
                } ${isUpdating ? 'ring-2 ring-neutral-400 scale-[0.99]' : ''}`}
              >
                {/* Left: Student Name & Team/Status Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-xs sm:text-sm text-neutral-950 leading-tight block">
                      {rec.studentName}
                    </span>
                    <Badge
                      variant={isPresent ? 'success' : isAbsent ? 'danger' : 'warning'}
                      size="sm"
                      className="text-[9px] uppercase font-mono tracking-wider py-0 px-1.5"
                    >
                      {rec.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-500 flex-wrap">
                    <span className="font-medium text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded text-[10px]">
                      {rec.teamName?.split('—')[0]?.trim() || 'Unassigned'}
                    </span>
                    {rec.busName && (
                      <span className="text-neutral-400 font-mono">
                        {rec.busName?.split('—')[0]?.trim()}
                      </span>
                    )}
                    {rec.verifiedAt && (
                      <span className="text-neutral-400 font-mono">
                        • {formatTime(rec.verifiedAt)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Touch-friendly Quick Action Buttons (SIDE BY SIDE WITH NAME!) */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Present / Tick Button */}
                  <button
                    onClick={() => handleUpdateStatus(rec.studentId, 'present')}
                    title="Mark Present"
                    aria-label={`Mark ${rec.studentName} present`}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                      isPresent
                        ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/40 font-bold scale-105'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-emerald-50 hover:text-emerald-700'
                    }`}
                  >
                    <Check className="w-5 h-5 stroke-[2.5]" />
                  </button>

                  {/* Absent / Cross Button */}
                  <button
                    onClick={() => handleUpdateStatus(rec.studentId, 'absent')}
                    title="Mark Absent"
                    aria-label={`Mark ${rec.studentName} absent`}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                      isAbsent
                        ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-400/40 font-bold scale-105'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-rose-50 hover:text-rose-700'
                    }`}
                  >
                    <X className="w-5 h-5 stroke-[2.5]" />
                  </button>

                  {/* Late Button */}
                  <button
                    onClick={() => handleUpdateStatus(rec.studentId, 'late')}
                    title="Mark Late"
                    aria-label={`Mark ${rec.studentName} late`}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                      isLate
                        ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-400/40 font-bold scale-105'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-amber-50 hover:text-amber-700'
                    }`}
                  >
                    <Clock className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP VIEW: Full Structured Table View (Hidden on mobile)               */}
      {/* ========================================================================= */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Bus</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Verified At</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-neutral-500 text-xs">
                  No matching student records found.
                </TableCell>
              </TableRow>
            ) : (
              filteredRecords.map((rec) => {
                const isPresent = rec.status === 'present';
                const isAbsent = rec.status === 'absent';
                const isLate = rec.status === 'late';

                return (
                  <TableRow key={rec.id || rec.studentId}>
                    <TableCell className="font-semibold text-neutral-900">
                      {rec.studentName}
                    </TableCell>
                    <TableCell className="text-xs text-neutral-600">
                      {rec.teamName?.split('—')[0]?.trim() || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-neutral-600">
                      {rec.busName?.split('—')[0]?.trim() || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          isPresent ? 'success' : isAbsent ? 'danger' : 'warning'
                        }
                        size="sm"
                        className="capitalize font-mono"
                      >
                        {rec.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-neutral-500">
                      {rec.verifiedAt ? formatTime(rec.verifiedAt) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => handleUpdateStatus(rec.studentId, 'present')}
                          title="Mark Present"
                          className={`p-2 rounded-lg transition-all cursor-pointer active:scale-95 ${
                            isPresent
                              ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                              : 'bg-neutral-100 text-neutral-600 hover:bg-emerald-50 hover:text-emerald-700'
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(rec.studentId, 'absent')}
                          title="Mark Absent"
                          className={`p-2 rounded-lg transition-all cursor-pointer active:scale-95 ${
                            isAbsent
                              ? 'bg-rose-600 text-white shadow-xs font-semibold'
                              : 'bg-neutral-100 text-neutral-600 hover:bg-rose-50 hover:text-rose-700'
                          }`}
                        >
                          <X className="w-4 h-4 stroke-[2.5]" />
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(rec.studentId, 'late')}
                          title="Mark Late"
                          className={`p-2 rounded-lg transition-all cursor-pointer active:scale-95 ${
                            isLate
                              ? 'bg-amber-600 text-white shadow-xs font-semibold'
                              : 'bg-neutral-100 text-neutral-600 hover:bg-amber-50 hover:text-amber-700'
                          }`}
                        >
                          <Clock className="w-4 h-4 stroke-[2.5]" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
