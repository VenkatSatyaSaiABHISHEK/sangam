'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { AttendanceRecord, AttendanceStatus, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { formatTime } from '@/lib/utils';
import {
  Check,
  X,
  Clock,
  Download,
  Filter,
  Users,
  Bus as BusIcon,
  CheckCircle2,
} from 'lucide-react';

interface AttendanceRosterProps {
  allowFullControl?: boolean;
  filterByTeamIds?: string[];
  filterByBusId?: string;
  verifierId?: string;
}

export function AttendanceRoster({
  allowFullControl = true,
  filterByTeamIds,
  filterByBusId,
  verifierId = 'admin-01',
}: AttendanceRosterProps) {
  const { showToast } = useToast();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [busFilter, setBusFilter] = useState<string>(filterByBusId || 'all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const data = await res.json();
        let attList: AttendanceRecord[] = data.attendance || [];
        if (filterByTeamIds && filterByTeamIds.length > 0) {
          attList = attList.filter((r) => r.teamId && filterByTeamIds.includes(r.teamId));
        }
        setRecords([...attList]);
        return;
      }
    } catch {}

    let data = db.getAttendance();
    if (filterByTeamIds && filterByTeamIds.length > 0) {
      data = data.filter((r) => r.teamId && filterByTeamIds.includes(r.teamId));
    }
    setRecords([...data]);
  };

  useEffect(() => {
    loadData();
  }, [filterByTeamIds, filterByBusId]);

  const handleUpdateStatus = async (studentId: string, status: AttendanceStatus) => {
    try {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'markAttendance',
          payload: { studentId, status, verifiedBy: verifierId },
        }),
      });
    } catch {}

    db.updateAttendance(studentId, status, verifierId);
    loadData();
    showToast('Status Updated', `Recorded as ${status.toUpperCase()}`, 'success');
  };

  const handleBatchMark = (status: AttendanceStatus) => {
    const targetIds = filteredRecords.map((r) => r.studentId);
    db.batchMarkAttendance(targetIds, status, verifierId);
    loadData();
    showToast('Batch Updated', `Marked ${targetIds.length} students as ${status.toUpperCase()}`, 'success');
  };

  const filteredRecords = records.filter((rec) => {
    if (busFilter !== 'all' && rec.busId !== busFilter) return false;
    if (teamFilter !== 'all' && rec.teamId !== teamFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        rec.studentName.toLowerCase().includes(q) ||
        rec.teamName?.toLowerCase().includes(q) ||
        rec.busName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const presentCount = filteredRecords.filter((r) => r.status === 'present').length;
  const absentCount = filteredRecords.filter((r) => r.status === 'absent').length;
  const lateCount = filteredRecords.filter((r) => r.status === 'late').length;
  const totalCount = filteredRecords.length;
  const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Live Statistics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-neutral-500 uppercase">
              Present
            </p>
            <p className="text-xl font-bold text-emerald-600 mt-0.5">{presentCount}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
            {totalCount > 0 ? `${Math.round((presentCount / totalCount) * 100)}%` : '0%'}
          </div>
        </Card>

        <Card className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-neutral-500 uppercase">
              Absent
            </p>
            <p className="text-xl font-bold text-rose-600 mt-0.5">{absentCount}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs">
            {totalCount > 0 ? `${Math.round((absentCount / totalCount) * 100)}%` : '0%'}
          </div>
        </Card>

        <Card className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-neutral-500 uppercase">
              Late / Review
            </p>
            <p className="text-xl font-bold text-amber-600 mt-0.5">{lateCount}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
            {lateCount}
          </div>
        </Card>

        <Card className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-neutral-500 uppercase">
              Overall Rate
            </p>
            <p className="text-xl font-bold text-neutral-900 mt-0.5">{attendanceRate}%</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-800 flex items-center justify-center font-bold text-xs">
            {totalCount}
          </div>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
        <div className="flex flex-wrap items-center gap-2">
          {/* Bus Filter */}
          <select
            value={busFilter}
            onChange={(e) => setBusFilter(e.target.value)}
            className="h-9 px-3 py-1 text-xs rounded-lg border border-neutral-300 bg-white font-medium text-neutral-800 focus:outline-none"
          >
            <option value="all">All Buses</option>
            <option value="bus-a">Bus A — Campus Express</option>
            <option value="bus-b">Bus B — Metro Transit</option>
          </select>

          {/* Team Filter */}
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="h-9 px-3 py-1 text-xs rounded-lg border border-neutral-300 bg-white font-medium text-neutral-800 focus:outline-none"
          >
            <option value="all">All Teams</option>
            {['team-01', 'team-02', 'team-03', 'team-04', 'team-05', 'team-06', 'team-07', 'team-08'].map(
              (tId, idx) => (
                <option key={tId} value={tId}>
                  Team 0{idx + 1}
                </option>
              )
            )}
          </select>

          {/* Search Input */}
          <input
            type="text"
            placeholder="Search student or team..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 px-3 py-1 text-xs rounded-lg border border-neutral-300 bg-white placeholder:text-neutral-400 text-neutral-800 focus:outline-none w-44 sm:w-56"
          />
        </div>

        {/* Batch Actions */}
        {allowFullControl && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBatchMark('present')}
              className="text-xs h-9 bg-white"
            >
              <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              <span>Mark All Present</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBatchMark('absent')}
              className="text-xs h-9 bg-white text-rose-700"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              <span>Mark All Absent</span>
            </Button>
          </div>
        )}
      </div>

      {/* Attendance Roster Table */}
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
          {filteredRecords.map((rec) => (
            <TableRow key={rec.id}>
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
                    rec.status === 'present'
                      ? 'success'
                      : rec.status === 'absent'
                      ? 'danger'
                      : 'warning'
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
                <div className="inline-flex items-center gap-1">
                  <button
                    onClick={() => handleUpdateStatus(rec.studentId, 'present')}
                    title="Mark Present"
                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                      rec.status === 'present'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-emerald-50 hover:text-emerald-700'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(rec.studentId, 'absent')}
                    title="Mark Absent"
                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                      rec.status === 'absent'
                        ? 'bg-rose-600 text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-rose-50 hover:text-rose-700'
                    }`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(rec.studentId, 'late')}
                    title="Mark Late"
                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                      rec.status === 'late'
                        ? 'bg-amber-600 text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-amber-50 hover:text-amber-700'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
