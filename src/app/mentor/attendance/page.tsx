'use client';

import React from 'react';
import { AttendanceRoster } from '@/components/modules/attendance/attendance-roster';
import { useAuth } from '@/context/auth-context';

export default function MentorAttendancePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-900">
          Sangam Attendance Verification
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Mark and review attendance for all Sangam students and cohort teams.
        </p>
      </div>

      <AttendanceRoster
        allowFullControl={true}
        verifierId={user?.id || 'mentor'}
      />
    </div>
  );
}
