'use client';

import React, { useEffect, useState, useCallback } from 'react';
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
  RefreshCw,
  Phone,
  Mail,
  CheckCircle2,
  Clock,
  Search,
  FileText,
  Image as ImageIcon,
  Pause,
  Play,
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
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPausing, setIsPausing] = useState(false);

  const togglePauseRoom = async () => {
    if (!room) return;
    setIsPausing(true);
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggleRoomActive', payload: { id: room.id } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle room status');

      const nextActive = data.isActive ?? !room.isActive;
      setRoom((prev) => (prev ? { ...prev, isActive: nextActive } : prev));
      showToast(
        nextActive ? 'Room Resumed' : 'Room Paused',
        nextActive
          ? 'Room is now live and accepting submissions.'
          : 'Room submissions are temporarily locked.',
        nextActive ? 'success' : 'info'
      );
    } catch (err: any) {
      showToast('Error', err.message || 'Could not update room status', 'error');
    } finally {
      setIsPausing(false);
    }
  };

  const loadRoomAndSubmissions = useCallback(async (isSilent = false) => {
    if (!roomId) return;
    if (!isSilent) setRefreshing(true);
    try {
      // 1. Load Room
      let found = db.getRoomById(roomId);
      if (!found) {
        const res = await fetch('/api/data');
        if (res.ok) {
          const data = await res.json();
          found = (data.rooms || []).find(
            (r: Room) => r.id.toLowerCase() === roomId.toLowerCase()
          );
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
      }

      // 2. Fetch submissions directly from the API (merges server DB + Firestore cloud)
      const subRes = await fetch(`/api/rooms/${roomId}/submissions`, {
        cache: 'no-store',
      });
      if (subRes.ok) {
        const subData = await subRes.json();
        if (Array.isArray(subData.submissions)) {
          setSubmissions(subData.submissions);
        }
      } else {
        // Fallback to local DB if available
        setSubmissions(db.getSubmissions(roomId));
      }
    } catch (err) {
      console.warn('Error loading room details and submissions:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [roomId]);

  useEffect(() => {
    loadRoomAndSubmissions();
    // Auto-refresh every 8 seconds for live response updates
    const interval = setInterval(() => {
      loadRoomAndSubmissions(true);
    }, 8000);
    return () => clearInterval(interval);
  }, [loadRoomAndSubmissions]);

  if (loading) {
    return (
      <div className="p-12 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-neutral-500 font-mono">Loading room details & live responses...</p>
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
    const headers = [
      'Submitted At',
      'Name',
      'Phone',
      'Email',
      'Attendance Marked',
      ...room.fields.map((f) => f.label),
      'GPS Coordinates',
    ];
    const rows = submissions.map((sub) => {
      const isPresent = Boolean(
        sub.submittedBy?.userId ||
          room.category === 'attendance' ||
          String(sub.answers['f_present'] || '').toLowerCase().includes('yes')
      );
      return [
        `"${sub.submittedAt}"`,
        `"${sub.submittedBy?.fullName || 'Anonymous'}"`,
        `"${sub.submittedBy?.phone || ''}"`,
        `"${sub.submittedBy?.email || ''}"`,
        `"${isPresent ? 'Present' : 'Submitted'}"`,
        ...room.fields.map((f) => {
          const val = sub.answers[f.id];
          if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
          return `"${String(val ?? '').replace(/"/g, '""')}"`;
        }),
        `"${sub.gpsCoordinates ? `${sub.gpsCoordinates.lat},${sub.gpsCoordinates.lng}` : ''}"`,
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
    showToast('Export Ready', `Downloaded ${submissions.length} submission records.`, 'success');
  };

  const filteredSubmissions = submissions.filter((sub) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (sub.submittedBy?.fullName || '').toLowerCase();
    const phone = (sub.submittedBy?.phone || '').toLowerCase();
    const email = (sub.submittedBy?.email || '').toLowerCase();
    const answersStr = JSON.stringify(sub.answers).toLowerCase();
    return name.includes(q) || phone.includes(q) || email.includes(q) || answersStr.includes(q);
  });

  const presentCount = submissions.filter(
    (s) =>
      s.submittedBy?.userId ||
      room.category === 'attendance' ||
      String(s.answers['f_present'] || '').toLowerCase().includes('yes')
  ).length;

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
              {room.category === 'attendance' && (
                <Badge className="bg-neutral-900 text-white text-[10px]">
                  Attendance Enabled
                </Badge>
              )}
              <Badge
                variant={room.isActive !== false ? 'success' : 'warning'}
                className="text-[10px]"
              >
                {room.isActive !== false ? '● Active' : '⏸ Paused'}
              </Badge>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">{room.purpose}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant={room.isActive !== false ? 'outline' : 'primary'}
            onClick={togglePauseRoom}
            isLoading={isPausing}
            className={
              room.isActive !== false
                ? 'gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-50 cursor-pointer'
                : 'gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 cursor-pointer'
            }
            title={room.isActive !== false ? 'Pause Submissions' : 'Resume Submissions'}
          >
            {room.isActive !== false ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{room.isActive !== false ? 'Pause Room' : 'Resume Room'}</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => loadRoomAndSubmissions(false)}
            isLoading={refreshing}
            className="gap-1.5"
            title="Refresh Live Responses"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

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
            <Button size="sm" className="gap-1.5 bg-neutral-950 text-white hover:bg-neutral-800">
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Public Form</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-900 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-neutral-500 font-medium">Total Responses</p>
            <p className="text-lg font-bold text-neutral-950">
              {submissions.length}
            </p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-neutral-500 font-medium">Marked Present</p>
            <p className="text-lg font-bold text-emerald-700">
              {presentCount}
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

      {/* Submissions Table Card */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 tracking-tight flex items-center gap-2">
              <span>Live Responses Log</span>
              <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-800 text-xs font-mono">
                {filteredSubmissions.length} of {submissions.length}
              </span>
            </h2>
            <p className="text-xs text-neutral-500">
              Real-time feed of participants who opened and submitted this room.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search responses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-neutral-300 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900"
            />
          </div>
        </div>

        {submissions.length === 0 ? (
          <div className="text-center py-14 text-neutral-400 space-y-3">
            <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-800">No responses recorded yet</p>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                Share the public link or QR code with students via WhatsApp to start receiving submissions automatically.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShareOpen(true)}
              className="gap-1.5 text-xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Room Link</span>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50/80">
                  <TableHead className="w-56 font-bold text-xs">Student / Submitter</TableHead>
                  <TableHead className="font-bold text-xs">Contact</TableHead>
                  <TableHead className="font-bold text-xs">Attendance</TableHead>
                  {room.fields.map((f) => (
                    <TableHead key={f.id} className="font-bold text-xs min-w-[140px]">
                      {f.label}
                    </TableHead>
                  ))}
                  <TableHead className="font-bold text-xs">GPS</TableHead>
                  <TableHead className="font-bold text-xs text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubmissions.map((sub) => {
                  const studentName = sub.submittedBy?.fullName || 'Anonymous Participant';
                  const studentPhone = sub.submittedBy?.phone;
                  const studentEmail = sub.submittedBy?.email;
                  const isPresent = Boolean(
                    sub.submittedBy?.userId ||
                      room.category === 'attendance' ||
                      String(sub.answers['f_present'] || '').toLowerCase().includes('yes')
                  );

                  return (
                    <TableRow key={sub.id} className="hover:bg-neutral-50/50">
                      {/* Submitter Name & Avatar */}
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-neutral-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {studentName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-xs text-neutral-900 truncate">
                              {studentName}
                            </p>
                            {sub.submittedBy?.userId ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                Registered Student
                              </span>
                            ) : (
                              <span className="text-[10px] text-neutral-400">Direct Entry</span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Contact */}
                      <TableCell>
                        <div className="space-y-0.5 text-xs text-neutral-700">
                          {studentPhone ? (
                            <a
                              href={`tel:${studentPhone}`}
                              className="inline-flex items-center gap-1 hover:underline font-mono text-[11px] text-neutral-800"
                            >
                              <Phone className="w-3 h-3 text-neutral-400" />
                              <span>{studentPhone}</span>
                            </a>
                          ) : (
                            <span className="text-neutral-400 text-[11px]">—</span>
                          )}
                          {studentEmail && (
                            <div className="text-[11px] text-neutral-500 truncate max-w-[150px]">
                              {studentEmail}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Attendance Badge */}
                      <TableCell>
                        {isPresent ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 text-[11px] font-semibold hover:bg-emerald-50">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Present</span>
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-neutral-500 text-[11px]">
                            Recorded
                          </Badge>
                        )}
                      </TableCell>

                      {/* Dynamic Room Fields */}
                      {room.fields.map((f) => {
                        const val = sub.answers[f.id];
                        if (val === undefined || val === null || val === '') {
                          return (
                            <TableCell key={f.id} className="text-xs text-neutral-400">
                              —
                            </TableCell>
                          );
                        }

                        // File upload
                        if (typeof val === 'object' && val.name && val.size) {
                          return (
                            <TableCell key={f.id} className="text-xs">
                              <span className="inline-flex items-center gap-1 text-blue-600 font-medium text-[11px]">
                                <FileText className="w-3 h-3 shrink-0" />
                                <span className="truncate max-w-[120px]">{val.name}</span>
                              </span>
                            </TableCell>
                          );
                        }

                        // Yes / No pill
                        if (val === 'Yes' || val === 'No') {
                          return (
                            <TableCell key={f.id}>
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                  val === 'Yes'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-neutral-100 text-neutral-700'
                                }`}
                              >
                                {val}
                              </span>
                            </TableCell>
                          );
                        }

                        // Standard text / json
                        const displayStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
                        return (
                          <TableCell key={f.id} className="text-xs text-neutral-800 max-w-[200px] truncate" title={displayStr}>
                            {displayStr}
                          </TableCell>
                        );
                      })}

                      {/* GPS */}
                      <TableCell className="text-xs font-mono">
                        {sub.gpsCoordinates ? (
                          <a
                            href={`https://maps.google.com/?q=${sub.gpsCoordinates.lat},${sub.gpsCoordinates.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-600 hover:underline text-[11px]"
                            title="Open in Google Maps"
                          >
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span>{sub.gpsCoordinates.lat.toFixed(4)}, {sub.gpsCoordinates.lng.toFixed(4)}</span>
                          </a>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </TableCell>

                      {/* Timestamp */}
                      <TableCell className="text-right text-xs text-neutral-500 font-mono whitespace-nowrap">
                        {formatDateTime(sub.submittedAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
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
