'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Room } from '@/types';
import { DynamicFormRenderer } from '@/components/modules/rooms/dynamic-form-renderer';
import { Card } from '@/components/ui/card';
import { ShieldCheck, HelpCircle } from 'lucide-react';

interface RoomSubmissionViewProps {
  initialRoom: Room | null;
  roomCode: string;
}

export function RoomSubmissionView({
  initialRoom,
  roomCode,
}: RoomSubmissionViewProps) {
  const [room] = useState<Room | null>(initialRoom);

  if (!room) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
            Room Session Not Found
          </h2>
          <p className="text-xs text-neutral-500">
            The link you opened with code #{roomCode} does not exist or has concluded.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="text-xs font-semibold text-neutral-900 underline"
            >
              Return to Sangam Portal
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4 flex flex-col items-center justify-center">
      <div className="max-w-md w-full space-y-6">
        {/* Branding & Session Context */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-neutral-200 text-xs text-neutral-600 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-semibold text-neutral-900">SangamConnect Verified</span>
            <span className="text-neutral-400">|</span>
            <span className="font-mono text-[11px]">#{room.id}</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-neutral-950">
            {room.title}
          </h1>
          {room.purpose && (
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              {room.purpose}
            </p>
          )}
        </div>

        {/* Dynamic Form Container */}
        <Card className="p-6 sm:p-8 bg-white border-neutral-200 shadow-sm">
          <DynamicFormRenderer room={room} />
        </Card>

        {/* Footer */}
        <div className="text-center">
          <p className="text-[11px] text-neutral-400 font-mono">
            SANGAM 2027 • ZERO-FRICTION PARTICIPATION
          </p>
        </div>
      </div>
    </div>
  );
}
