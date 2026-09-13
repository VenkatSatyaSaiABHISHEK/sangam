'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { Room } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileQuestion, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function StudentRoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    setRooms(db.getRooms().filter((r) => r.isActive));
  }, []);

  return (
    <div className="space-y-4 pt-1">
      <div>
        <h1 className="text-lg font-bold tracking-tight text-neutral-900">
          Action Sessions & Rooms
        </h1>
        <p className="text-xs text-neutral-500">
          Respond to open requests for attendance, catering, and workshops.
        </p>
      </div>

      <div className="space-y-3">
        {rooms.map((room) => (
          <Card key={room.id} className="p-4 space-y-3 border-neutral-200 hover:border-neutral-400 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-semibold text-neutral-400 block">
                  #{room.id}
                </span>
                <h3 className="text-sm font-bold text-neutral-900 mt-0.5">
                  {room.title}
                </h3>
              </div>
              <Badge variant="success" size="sm" className="text-[10px]">
                Open
              </Badge>
            </div>

            <p className="text-xs text-neutral-600">{room.purpose}</p>

            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-[11px] text-neutral-400 font-mono">
                {room.fields.length} Questions
              </span>

              <Link href={`/rooms/${room.id}`}>
                <Button size="sm" className="h-8 text-xs gap-1">
                  <span>Fill Form</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
