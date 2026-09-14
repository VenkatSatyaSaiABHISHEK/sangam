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
    fetch('/api/data?include=rooms')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.rooms) {
          setRooms(data.rooms);
        } else {
          setRooms(db.getRooms());
        }
      })
      .catch(() => {
        setRooms(db.getRooms());
      });
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
        {rooms.length === 0 ? (
          <Card className="p-8 text-center space-y-2 text-neutral-400">
            <FileQuestion className="w-8 h-8 mx-auto text-neutral-300" />
            <p className="text-xs text-neutral-600 font-medium">No sessions currently available</p>
          </Card>
        ) : (
          rooms.map((room) => {
            const isLive = room.isActive !== false;
            return (
              <Card
                key={room.id}
                className={`p-4 space-y-3 transition-colors ${
                  isLive
                    ? 'border-neutral-200 hover:border-neutral-400'
                    : 'border-amber-200 bg-amber-50/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-semibold text-neutral-400 block">
                      #{room.id}
                    </span>
                    <h3 className="text-sm font-bold text-neutral-900 mt-0.5">
                      {room.title}
                    </h3>
                  </div>
                  <Badge variant={isLive ? 'success' : 'warning'} size="sm" className="text-[10px]">
                    {isLive ? 'Open' : 'Paused'}
                  </Badge>
                </div>

                <p className="text-xs text-neutral-600">{room.purpose}</p>

                <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-[11px] text-neutral-400 font-mono">
                    {room.fields.length} Questions
                  </span>

                  {isLive ? (
                    <Link href={`/rooms/${room.id}`}>
                      <Button size="sm" className="h-8 text-xs gap-1 cursor-pointer">
                        <span>Fill Form</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  ) : (
                    <Button size="sm" variant="outline" disabled className="h-8 text-xs opacity-60">
                      <span>Temporarily Paused</span>
                    </Button>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
