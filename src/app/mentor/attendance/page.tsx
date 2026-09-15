'use client';

import React from 'react';
import { AttendanceRoster } from '@/components/modules/attendance/attendance-roster';
import { useAuth } from '@/context/auth-context';

export default function MentorAttendancePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            Sangam Attendance Verification
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Mark and review attendance for all Sangam students and cohort teams.
          </p>
        </div>
        <div className="flex items-center gap-1.5 self-start sm:self-auto text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Real-time Live Sync</span>
        </div>
      </div>

      <AttendanceRoster
        allowFullControl={true}
        verifierId={user?.fullName || user?.id || 'mentor'}
      />
    </div>
  );
}
