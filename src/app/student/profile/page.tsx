'use client';

import React from 'react';
import { useAuth } from '@/context/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, Users, GraduationCap, Bus, LogOut, Shield } from 'lucide-react';

export default function StudentProfilePage() {
  const { user, logout } = useAuth();

  return (
    <div className="space-y-4 pt-1">
      <div>
        <h1 className="text-lg font-bold tracking-tight text-neutral-900">
          Student Profile
        </h1>
        <p className="text-xs text-neutral-500">
          Personal credentials and emergency summit details.
        </p>
      </div>

      <Card className="p-6 text-center space-y-4 border-neutral-200">
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.fullName || 'Student'}
            className="w-20 h-20 rounded-full object-cover border-2 border-neutral-200 shadow-sm mx-auto"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xl mx-auto shadow-sm">
            {user?.fullName?.charAt(0) || 'S'}
          </div>
        )}

        <div>
          <h2 className="text-base font-bold text-neutral-950">
            {user?.fullName || 'Student Participant'}
          </h2>
          <Badge variant="neutral" size="sm" className="mt-1 uppercase font-mono text-[10px]">
            {user?.role || 'student'}
          </Badge>
        </div>

        <div className="space-y-2 text-left pt-3 border-t border-neutral-100 text-xs">
          <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-50">
            <span className="text-neutral-500">Email</span>
            <span className="font-semibold text-neutral-900">{user?.email || '—'}</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-50">
            <span className="text-neutral-500">Phone</span>
            <span className="font-mono font-semibold text-neutral-900">{user?.phone || '—'}</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-50">
            <span className="text-neutral-500">Team</span>
            <span className="font-semibold text-neutral-900">{user?.teamName || 'Unassigned'}</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-50">
            <span className="text-neutral-500">Mentor</span>
            <span className="font-semibold text-neutral-900">{user?.mentorName || 'None Assigned'}</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-50">
            <span className="text-neutral-500">Bus</span>
            <span className="font-semibold text-neutral-900">{user?.busName || 'None Assigned'}</span>
          </div>
        </div>

        <div className="pt-2">
          <Button variant="outline" onClick={logout} className="w-full gap-2 text-xs text-red-600 border-red-200 hover:bg-red-50">
            <LogOut className="w-3.5 h-3.5" />
            <span>Switch User / Log Out</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
