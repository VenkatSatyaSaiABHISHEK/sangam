'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/db';
import { AttendanceRecord } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { formatDateTime } from '@/lib/utils';
import { CheckCircle2, AlertCircle, Bus, Users, Clock, ShieldCheck } from 'lucide-react';

export default function StudentAttendancePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [record, setRecord] = useState<AttendanceRecord | null>(null);

  useEffect(() => {
    if (user?.id) {
      const rec = db.getAttendanceForStudent(user.id);
      if (rec) setRecord(rec);
    }
  }, [user]);

  const handleSelfCheckIn = () => {
    if (!user) return;
    const updated = db.updateAttendance(user.id, 'present', `self:${user.id}`);
    setRecord({ ...updated });
    showToast('Check-in Recorded', 'You have been marked present.', 'success');
  };

  const isPresent = record?.status === 'present';

  return (
    <div className="space-y-4 pt-2">
      <div>
        <h1 className="text-lg font-bold tracking-tight text-neutral-900">
          Attendance Status
        </h1>
        <p className="text-xs text-neutral-500">
          Real-time check-in record for Sangam 2027.
        </p>
      </div>

      <Card className="p-6 text-center space-y-4 border-neutral-200">
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto border ${
            isPresent
              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
              : 'bg-amber-50 text-amber-600 border-amber-200'
          }`}
        >
          {isPresent ? (
            <CheckCircle2 className="w-8 h-8" />
          ) : (
            <AlertCircle className="w-8 h-8" />
          )}
        </div>

        <div>
          <Badge
            variant={isPresent ? 'success' : 'warning'}
            size="md"
            className="capitalize px-3 py-1 font-semibold"
          >
            {record?.status || 'Unknown'}
          </Badge>
          <h2 className="text-base font-bold text-neutral-900 mt-2">
            {isPresent ? 'You are marked Present' : 'Attendance Pending'}
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            {isPresent
              ? `Verified on ${formatDateTime(record?.verifiedAt || '')}`
              : 'Please check in below or respond to your bus attendance link.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-left pt-3 border-t border-neutral-100 text-xs">
          <div className="p-2.5 rounded-lg bg-neutral-50 space-y-0.5">
            <span className="text-[10px] text-neutral-400 font-semibold uppercase">Assigned Bus</span>
            <p className="font-semibold text-neutral-800">{user?.busName || 'Bus A'}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-neutral-50 space-y-0.5">
            <span className="text-[10px] text-neutral-400 font-semibold uppercase">Assigned Team</span>
            <p className="font-semibold text-neutral-800">{user?.teamName || 'Team 01'}</p>
          </div>
        </div>

        {!isPresent && (
          <Button onClick={handleSelfCheckIn} className="w-full">
            Confirm Present Now
          </Button>
        )}
      </Card>
    </div>
  );
}
