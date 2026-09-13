'use client';

import React from 'react';
import { AttendanceRoster } from '@/components/modules/attendance/attendance-roster';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion, Download } from 'lucide-react';

export default function AdminAttendancePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-950">
            Sangam Attendance Matrix
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Real-time passenger and team check-in status. Synchronized across manual entries, dynamic rooms, and mentor inputs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/rooms/create">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <FileQuestion className="w-3.5 h-3.5" />
              <span>Create Attendance Room</span>
            </Button>
          </Link>
        </div>
      </div>

      <AttendanceRoster allowFullControl={true} />
    </div>
  );
}
