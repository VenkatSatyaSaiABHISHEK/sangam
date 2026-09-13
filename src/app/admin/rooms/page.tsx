'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { Room } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShareModal } from '@/components/modules/rooms/share-modal';
import {
  Plus,
  Share2,
  FileQuestion,
  Users,
  Eye,
  Calendar,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { getCachedData, setCachedData } from '@/lib/data-cache';

export default function AdminRoomsPage() {
  const cached = typeof window !== 'undefined' ? getCachedData() : null;
  const [rooms, setRooms] = useState<Room[]>(cached?.rooms || []);
  const [selectedRoomForShare, setSelectedRoomForShare] = useState<Room | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/data');
        if (res.ok) {
          const data = await res.json();
          const r = data.rooms || [];
          setRooms(r);
          setCachedData({ ...cached, rooms: r });
          return;
        }
      } catch {}
      setRooms(db.getRooms());
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-950">
            Dynamic Information Rooms
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Spin up custom attendance, feedback, and registration sessions with instant WhatsApp links.
          </p>
        </div>

        <Link href="/admin/rooms/create">
          <Button className="gap-2 shadow-xs">
            <Plus className="w-4 h-4" />
            <span>Create New Room</span>
          </Button>
        </Link>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map((room) => {
          const categoryColors: Record<string, 'default' | 'success' | 'warning' | 'info' | 'neutral'> = {
            attendance: 'success',
            registration: 'info',
            feedback: 'warning',
            custom: 'neutral',
          };

          return (
            <Card key={room.id} className="flex flex-col justify-between hover:border-neutral-300 transition-colors">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant={categoryColors[room.category] || 'neutral'} size="sm" className="capitalize">
                    {room.category}
                  </Badge>
                  <span className="text-[11px] font-mono text-neutral-400 font-semibold">
                    #{room.id}
                  </span>
                </div>

                <div>
                  <h3 className="font-semibold text-sm text-neutral-900 line-clamp-1">
                    {room.title}
                  </h3>
                  <p className="text-xs text-neutral-500 line-clamp-2 mt-1">
                    {room.purpose}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs text-neutral-600 pt-1 border-t border-neutral-100">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-neutral-400" />
                    <span className="font-semibold text-neutral-900">
                      {room.submissionCount || 0}
                    </span>
                    <span className="text-neutral-500">responses</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <FileQuestion className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{room.fields.length} fields</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-4 border-t border-neutral-100 flex items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs gap-1.5"
                  onClick={() => setSelectedRoomForShare(room)}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </Button>

                <Link href={`/admin/rooms/${room.id}`} className="flex-1">
                  <Button size="sm" variant="secondary" className="w-full text-xs gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect</span>
                  </Button>
                </Link>

                <Link href={`/rooms/${room.id}`} target="_blank">
                  <Button size="icon" variant="ghost" className="h-8 w-8" title="Public Link">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Share Modal */}
      <ShareModal
        room={selectedRoomForShare}
        isOpen={Boolean(selectedRoomForShare)}
        onClose={() => setSelectedRoomForShare(null)}
      />
    </div>
  );
}
