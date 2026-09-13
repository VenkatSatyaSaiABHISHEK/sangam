'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { Room, RoomSubmission } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { ShareModal } from '@/components/modules/rooms/share-modal';
import {
  ArrowLeft,
  Share2,
  Download,
  ExternalLink,
  Users,
  MapPin,
  Calendar,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

export default function AdminRoomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const roomId = params?.id as string;

  const [room, setRoom] = useState<Room | null>(null);
  const [submissions, setSubmissions] = useState<RoomSubmission[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRoom = async () => {
      if (!roomId) return;
      try {
        let found = db.getRoomById(roomId);

        if (!found) {
          const res = await fetch('/api/data');
          if (res.ok) {
            const data = await res.json();
            found = (data.rooms || []).find((r: Room) => r.id.toLowerCase() === roomId.toLowerCase());
          }
        }

        if (!found) {
          try {
            const { fetchRoomByIdFromFirestore } = await import('@/lib/firebase-db');
            const fsRoom = await fetchRoomByIdFromFirestore(roomId);
            if (fsRoom) found = fsRoom;
          } catch {}
        }

        if (found) {
          setRoom(found);
          setSubmissions(db.getSubmissions(roomId));
        }
      } catch (err) {
        console.warn('Error loading room inspect:', err);
      } finally {
        setLoading(false);
      }
    };

    loadRoom();
  }, [roomId]);

  if (loading) {
    return (
      <div className="p-12 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-neutral-500 font-mono">Loading room details...</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm text-neutral-500">Room session not found.</p>
        <Link href="/admin/rooms">
          <Button variant="outline" size="sm">
            Back to Rooms
          </Button>
        </Link>
      </div>
    );
  }

  const exportCsv = () => {
    if (submissions.length === 0) {
      showToast('No Data', 'There are no submissions to export yet.', 'error');
      return;
    }
    const headers = ['Submitted At', 'Name', 'Phone', ...room.fields.map((f) => f.label), 'GPS'];
    const rows = submissions.map((sub) => {
      return [
        sub.submittedAt,
        sub.submittedBy?.fullName || '',
        sub.submittedBy?.phone || '',
        ...room.fields.map((f) => JSON.stringify(sub.answers[f.id] || '')),
        sub.gpsCoordinates ? `${sub.gpsCoordinates.lat},${sub.gpsCoordinates.lng}` : '',
      ].join(',');
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${room.id}_submissions.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Export Ready', 'CSV file downloaded.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/rooms"
            className="p-2 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-neutral-950">
                {room.title}
              </h1>
              <Badge variant="outline" className="font-mono text-xs">
                #{room.id}
              </Badge>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">{room.purpose}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShareOpen(true)}
            className="gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={exportCsv}
            className="gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </Button>

          <Link href={`/rooms/${room.id}`} target="_blank">
            <Button size="sm" className="gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Public Form</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-900 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-neutral-500 font-medium">Total Responses</p>
            <p className="text-lg font-bold text-neutral-950">
              {room.submissionCount || submissions.length}
            </p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-900 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-neutral-500 font-medium">Created On</p>
            <p className="text-xs font-semibold text-neutral-900">
              {formatDateTime(room.createdAt)}
            </p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-900 shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-neutral-500 font-medium">Associated Bus</p>
            <p className="text-xs font-semibold text-neutral-900">
              {room.associatedBusId ? room.associatedBusId.toUpperCase() : 'None (Universal)'}
            </p>
          </div>
        </Card>
      </div>

      {/* Submissions Table */}
      <Card className="p-5 space-y-4">
        <h2 className="text-base font-semibold text-neutral-900 tracking-tight">
          Submissions Log ({submissions.length})
        </h2>

        {submissions.length === 0 ? (
          <div className="text-center py-10 text-neutral-400 space-y-2">
            <Users className="w-8 h-8 mx-auto opacity-40" />
            <p className="text-xs">No responses received yet.</p>
            <p className="text-[11px] text-neutral-400">
              Share the room link via WhatsApp to begin collecting data.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Participant</TableHead>
                <TableHead>Submitted At</TableHead>
                {room.fields.slice(0, 3).map((f) => (
                  <TableHead key={f.id}>{f.label}</TableHead>
                ))}
                <TableHead>GPS Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-semibold text-neutral-900">
                    {sub.submittedBy?.fullName || 'Anonymous'}
                  </TableCell>
                  <TableCell className="text-xs text-neutral-500">
                    {formatDateTime(sub.submittedAt)}
                  </TableCell>
                  {room.fields.slice(0, 3).map((f) => (
                    <TableCell key={f.id} className="text-xs">
                      {typeof sub.answers[f.id] === 'object'
                        ? JSON.stringify(sub.answers[f.id])
                        : String(sub.answers[f.id] ?? '—')}
                    </TableCell>
                  ))}
                  <TableCell className="text-xs font-mono text-neutral-600">
                    {sub.gpsCoordinates ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600">
                        <MapPin className="w-3 h-3" />
                        {sub.gpsCoordinates.lat.toFixed(4)}, {sub.gpsCoordinates.lng.toFixed(4)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <ShareModal
        room={room}
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
      />
    </div>
  );
}
