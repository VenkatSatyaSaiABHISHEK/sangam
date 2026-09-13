'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { Room } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShareModal } from '@/components/modules/rooms/share-modal';
import { useToast } from '@/components/ui/toast';
import {
  Plus,
  Share2,
  FileQuestion,
  Users,
  Eye,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { getCachedData, setCachedData } from '@/lib/data-cache';

export default function AdminRoomsPage() {
  const { showToast } = useToast();
  const cached = typeof window !== 'undefined' ? getCachedData() : null;
  const [loading, setLoading] = useState(!cached?.rooms?.length);
  const [rooms, setRooms] = useState<Room[]>(cached?.rooms || []);
  const [selectedRoomForShare, setSelectedRoomForShare] = useState<Room | null>(null);

  const loadData = async () => {
    try {
      const res = await fetch('/api/data');
      let apiRooms: Room[] = [];

      if (res.ok) {
        const data = await res.json();
        apiRooms = data.rooms || [];
      } else {
        apiRooms = db.getRooms();
      }

      try {
        const { fetchRoomsFromFirestore } = await import('@/lib/firebase-db');
        const fsRooms = await fetchRoomsFromFirestore();
        if (fsRooms && fsRooms.length > 0) {
          const map = new Map<string, Room>();
          apiRooms.forEach((r) => map.set(r.id, r));
          fsRooms.forEach((r) => map.set(r.id, { ...map.get(r.id), ...r }));
          apiRooms = Array.from(map.values());
        }
      } catch (err) {
        console.warn('Firestore room sync error in AdminRoomsPage:', err);
      }

      setRooms(apiRooms);
      setCachedData({ ...cached, rooms: apiRooms });
    } catch {
      setRooms(db.getRooms());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteRoom = async (roomId: string, roomTitle: string) => {
    if (!confirm(`Are you sure you want to delete room "${roomTitle}"?`)) return;

    try {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteRoom', payload: { id: roomId } }),
      });

      try {
        const { deleteRoomFromFirestore } = await import('@/lib/firebase-db');
        await deleteRoomFromFirestore(roomId);
      } catch {}

      db.deleteRoom(roomId);
      const updated = rooms.filter((r) => r.id !== roomId);
      setRooms(updated);
      setCachedData({ ...cached, rooms: updated });
      showToast('Room Deleted', `Room "${roomTitle}" has been removed.`, 'info');
    } catch (err: any) {
      showToast('Delete Failed', err.message || 'Could not delete room.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-950">
            Dynamic Information Rooms {loading && rooms.length === 0 ? '' : `(${rooms.length})`}
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Spin up custom attendance, feedback, and registration sessions with instant WhatsApp links.
          </p>
        </div>

        <Link href="/admin/rooms/create">
          <Button className="gap-2 shadow-xs cursor-pointer">
            <Plus className="w-4 h-4" />
            <span>Create New Room</span>
          </Button>
        </Link>
      </div>

      {/* Loading Skeletons */}
      {loading && rooms.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-5 flex flex-col justify-between space-y-4 border-neutral-200 animate-pulse">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-20 bg-neutral-200 rounded" />
                  <div className="h-4 w-14 bg-neutral-100 rounded font-mono" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-4 w-3/4 bg-neutral-200 rounded" />
                  <div className="h-3 w-full bg-neutral-100 rounded" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : rooms.length === 0 ? (
        /* Empty State */
        <Card className="p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
            <FileQuestion className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900">No rooms created yet</h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1">
              Create dynamic sessions for student registration, session attendance, or mentor feedback with zero friction.
            </p>
          </div>
          <Link href="/admin/rooms/create">
            <Button size="sm" className="gap-1.5 text-xs cursor-pointer">
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Room</span>
            </Button>
          </Link>
        </Card>
      ) : (
        /* Rooms Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => {
            const categoryColors: Record<string, 'default' | 'success' | 'warning' | 'info' | 'neutral'> = {
              attendance: 'success',
              registration: 'info',
              feedback: 'warning',
              custom: 'neutral',
            };

            return (
              <Card key={room.id} className="flex flex-col justify-between hover:border-neutral-300 transition-colors p-5 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant={categoryColors[room.category] || 'neutral'} size="sm" className="capitalize">
                      {room.category}
                    </Badge>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono text-neutral-400 font-semibold">
                        #{room.id}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteRoom(room.id, room.title)}
                        className="p-1 rounded text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Room"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
                      <span>{room.fields?.length || 0} fields</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs gap-1.5 cursor-pointer"
                    onClick={() => setSelectedRoomForShare(room)}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share</span>
                  </Button>

                  <Link href={`/admin/rooms/${room.id}`} className="flex-1">
                    <Button size="sm" variant="secondary" className="w-full text-xs gap-1.5 cursor-pointer">
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect</span>
                    </Button>
                  </Link>

                  <Link href={`/rooms/${room.id}`} target="_blank">
                    <Button size="icon" variant="ghost" className="h-8 w-8 cursor-pointer" title="Public Link">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        room={selectedRoomForShare}
        isOpen={Boolean(selectedRoomForShare)}
        onClose={() => setSelectedRoomForShare(null)}
      />
    </div>
  );
}
