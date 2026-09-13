'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { ActivityLog } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { formatDateTime } from '@/lib/utils';
import { Activity, ShieldCheck } from 'lucide-react';

export default function AdminActivityPage() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/data');
        if (res.ok) {
          const data = await res.json();
          setActivities(data.activities || []);
          return;
        }
      } catch {}
      setActivities(db.getActivityLogs(50));
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-950">
            System Audit & Activity Logs
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Immutable timeline of room submissions, attendance overrides, media uploads, and announcements.
          </p>
        </div>

        <Badge variant="outline" className="gap-1.5 font-mono text-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Audit Active</span>
        </Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Entity</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activities.map((act) => (
            <TableRow key={act.id}>
              <TableCell className="text-xs font-mono text-neutral-500 whitespace-nowrap">
                {formatDateTime(act.timestamp)}
              </TableCell>
              <TableCell className="font-semibold text-neutral-900 text-xs">
                {act.actorName}
              </TableCell>
              <TableCell>
                <Badge variant="neutral" size="sm" className="capitalize text-[10px]">
                  {act.actorRole}
                </Badge>
              </TableCell>
              <TableCell className="text-xs font-mono font-medium text-neutral-800">
                {act.action}
              </TableCell>
              <TableCell className="text-xs font-mono text-neutral-500">
                {act.targetEntity}
              </TableCell>
              <TableCell className="text-xs text-neutral-600">
                {JSON.stringify(act.details)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
