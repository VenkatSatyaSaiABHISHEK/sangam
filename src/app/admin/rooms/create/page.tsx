'use client';

import React from 'react';
import Link from 'next/link';
import { RoomBuilder } from '@/components/modules/rooms/room-builder';
import { ArrowLeft } from 'lucide-react';

export default function CreateRoomPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/rooms"
          className="p-2 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-950">
            Create Dynamic Information Room
          </h1>
          <p className="text-xs text-neutral-500">
            Build a form session in seconds without any database or code adjustments.
          </p>
        </div>
      </div>

      <RoomBuilder />
    </div>
  );
}
