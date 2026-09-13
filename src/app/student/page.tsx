'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/db';
import { Announcement, Room, AttendanceRecord, Team } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Bell,
  FileText,
  ExternalLink,
  Download,
  CalendarCheck,
  MessageCircle,
  UploadCloud,
  Loader2,
  Users,
  Image as GalleryIcon,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export default function StudentHomePage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activeRooms, setActiveRooms] = useState<Room[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [myPhotoCount, setMyPhotoCount] = useState<number>(0);
  const [totalPhotoCount, setTotalPhotoCount] = useState<number>(0);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const photoInputRef = React.useRef<HTMLInputElement>(null);

  const handleDirectPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append(
        'metadata',
        JSON.stringify({
          eventId: 'sangam-2027',
          uploadedBy: {
            userId: user?.id || 'anonymous',
            name: user?.fullName || 'Student',
            role: 'student',
            teamName: user?.teamName,
          },
        })
      );
      const res = await fetch('/api/photos/upload', { method: 'POST', body: formData });
      if (res.ok) {
        setMyPhotoCount((c) => c + 1);
        setTotalPhotoCount((c) => c + 1);
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/data');
        if (res.ok) {
          const data = await res.json();
          setAnnouncements(data.announcements || []);
          setActiveRooms((data.rooms || []).filter((r: Room) => r.isActive));
          if (user?.teamId) {
            const team = (data.teams || []).find((t: Team) => t.id === user.teamId);
            if (team) setMyTeam(team);
          }
          const allPhotos = data.photos || [];
          setTotalPhotoCount(allPhotos.length);
          const userPhotos = allPhotos.filter(
            (p: any) =>
              p.uploadedBy?.userId === user?.id ||
              (user?.email && p.uploadedBy?.userId === user.email) ||
              (user?.fullName && p.uploadedBy?.name?.toLowerCase() === user.fullName.toLowerCase())
          );
          setMyPhotoCount(userPhotos.length);
        }
      } catch {
        setAnnouncements(db.getAnnouncements());
        setActiveRooms(db.getRooms().filter((r) => r.isActive));
        if (user?.teamId) {
          const team = db.getTeamById(user.teamId);
          if (team) setMyTeam(team);
        }
        const allPhotos = db.getPhotos();
        setTotalPhotoCount(allPhotos.length);
        const userPhotos = allPhotos.filter(
          (p) =>
            p.uploadedBy?.userId === user?.id ||
            (user?.email && p.uploadedBy?.userId === user.email) ||
            (user?.fullName && p.uploadedBy?.name?.toLowerCase() === user.fullName.toLowerCase())
        );
        setMyPhotoCount(userPhotos.length);
      }

      if (user?.id) {
        const att = db.getAttendanceForStudent(user.id);
        if (att) setAttendance(att);
      }
    };

    load();
  }, [user]);

  const isPresent = attendance?.status === 'present';

  return (
    <div className="space-y-4 pt-1">
      {/* Student Identity Bar */}
      <div className="flex items-center justify-between p-3.5 bg-neutral-950 text-white rounded-2xl shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-sm text-white shrink-0">
            {user?.fullName?.charAt(0) || 'S'}
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-sm tracking-tight text-white truncate">
              {user?.fullName || 'Student Participant'}
            </h1>
            <p className="text-[11px] text-neutral-400 truncate">
              {user?.email || 'Sangam Attendee'}
            </p>
          </div>
        </div>

        {myTeam ? (
          <Link href="/student/team">
            <span
              className="px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-2xs border border-white/20 shrink-0"
              style={{ backgroundColor: myTeam.color || '#2563EB' }}
            >
              {myTeam.name}
            </span>
          </Link>
        ) : (
          <Badge variant="neutral" size="sm" className="shrink-0 text-[10px]">
            Unassigned
          </Badge>
        )}
      </div>

      {/* Sangam Open Channel Card (WhatsApp-Style Group Discussion) */}
      <Link href="/student/channel" className="block">
        <div className="p-3.5 rounded-2xl bg-neutral-950 text-white border border-neutral-900 hover:bg-neutral-900 active:scale-[0.99] transition-all flex items-center justify-between shadow-md cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-neutral-950 flex items-center justify-center font-black group-hover:scale-105 transition-transform shadow-sm">
              <MessageCircle className="w-5 h-5 text-neutral-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-white uppercase tracking-wide">
                  Sangam Open Channel
                </h2>
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              </div>
              <p className="text-[11px] text-neutral-400">
                Live discussion with mentors, faculty & student cohorts
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-white transition-colors" />
        </div>
      </Link>

      {/* Live Action Requests / Dynamic Rooms */}
      {activeRooms.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block">
            Sangam Actions & Forms
          </span>

          {activeRooms.map((room) => (
            <Link key={room.id} href={`/rooms/${room.id}`} className="block">
              <Card className="p-3.5 hover:border-neutral-400 transition-colors flex items-center justify-between bg-emerald-50/50 border-emerald-200">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="success" size="sm" className="text-[9px] font-mono">
                      #{room.id}
                    </Badge>
                    <h3 className="text-xs font-bold text-neutral-950">{room.title}</h3>
                  </div>
                  <p className="text-[11px] text-neutral-600 line-clamp-1">{room.purpose}</p>
                </div>
                <Button size="sm" className="h-8 text-xs shrink-0 ml-2">
                  Open Form
                </Button>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Summit Announcements, Instructions & Shared Documents */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
            Information & Documents
          </span>
          <span className="text-[10px] text-neutral-400 font-mono">
            {announcements.length} Updates
          </span>
        </div>

        {announcements.length === 0 ? (
          <Card className="p-8 text-center space-y-2">
            <Bell className="w-6 h-6 text-neutral-300 mx-auto" />
            <h3 className="text-xs font-semibold text-neutral-700">No Announcements Yet</h3>
            <p className="text-[11px] text-neutral-400 max-w-xs mx-auto">
              Administrator instructions, event schedules, and PDF documents will appear here.
            </p>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {announcements.map((item) => (
              <Card
                key={item.id}
                className={`p-4 space-y-2 transition-all ${
                  item.priority === 'urgent'
                    ? 'border-rose-300 bg-rose-50/60'
                    : item.priority === 'important'
                    ? 'border-amber-300 bg-amber-50/60'
                    : 'border-neutral-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge
                      variant={
                        item.priority === 'urgent'
                          ? 'danger'
                          : item.priority === 'important'
                          ? 'warning'
                          : 'neutral'
                      }
                      size="sm"
                      className="capitalize text-[10px]"
                    >
                      {item.priority}
                    </Badge>
                    <span className="text-[10px] font-medium text-neutral-500 truncate max-w-[180px]">
                      {item.senderName ? `From: ${item.senderName}` : 'From: Command Center'}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 font-mono shrink-0">
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-neutral-950 leading-tight">
                    {item.title}
                  </h3>
                  <p className="text-xs text-neutral-700 mt-1 leading-relaxed whitespace-pre-wrap">
                    {item.message}
                  </p>
                </div>

                {/* PDF Document Attachment */}
                {item.fileUrl && (
                  <div className="pt-2 border-t border-neutral-200/70">
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 hover:border-neutral-300 flex items-center justify-between text-xs transition-all group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 shadow-2xs">
                          PDF
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-neutral-900 truncate block text-[11px]">
                            {item.fileName || 'Attached Document.pdf'}
                          </span>
                          <span className="text-[10px] text-neutral-400">Click to read & download</span>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-neutral-200 text-[10px] font-bold text-neutral-800 group-hover:bg-neutral-950 group-hover:text-white transition-colors shrink-0">
                        <span>Read PDF</span>
                        <ExternalLink className="w-3 h-3" />
                      </span>
                    </a>
                  </div>
                )}

                {/* Optional Action URL Link */}
                {item.actionUrl && (
                  <div className="pt-1">
                    <Link
                      href={item.actionUrl}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-900 hover:underline"
                    >
                      <span>Open link</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Lower Section: Direct Photo Upload & Navigation */}
      <div className="pt-2 space-y-2">
        <input
          type="file"
          ref={photoInputRef}
          onChange={handleDirectPhotoUpload}
          accept="image/*"
          className="hidden"
        />

        {/* Direct Photo Upload Card (Replaces Camera in lower part) */}
        <div
          onClick={() => photoInputRef.current?.click()}
          className="p-3.5 rounded-2xl bg-white border border-neutral-200 hover:border-neutral-950 active:scale-[0.99] transition-all flex items-center justify-between cursor-pointer shadow-xs group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center group-hover:bg-neutral-950 group-hover:text-white transition-colors">
              {isUploadingPhoto ? (
                <Loader2 className="w-5 h-5 animate-spin text-neutral-900 group-hover:text-white" />
              ) : (
                <UploadCloud className="w-5 h-5 text-neutral-800 group-hover:text-white" />
              )}
            </div>
            <div>
              <h3 className="text-xs font-bold text-neutral-950">
                {isUploadingPhoto ? 'Uploading to Gallery...' : 'Upload Photos to Gallery'}
              </h3>
              <p className="text-[11px] text-neutral-500">
                Share team photos & project images directly
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 bg-neutral-100 group-hover:bg-neutral-950 group-hover:text-white rounded-lg text-neutral-800 transition-colors border border-neutral-200">
            Upload
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Link href="/student/team" className="block">
            <Card className="p-3 hover:border-neutral-400 transition-colors space-y-1">
              <Users className="w-4 h-4 text-neutral-700" />
              <p className="text-xs font-bold text-neutral-900">My Team Roster</p>
              <p className="text-[10px] text-neutral-500">Contact mentors & teammates</p>
            </Card>
          </Link>

          <Link href="/student/gallery" className="block">
            <Card className="p-3 hover:border-neutral-400 transition-colors space-y-1 relative">
              <div className="flex items-center justify-between">
                <GalleryIcon className="w-4 h-4 text-neutral-700" />
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-900 border border-neutral-200">
                  {myPhotoCount} shared
                </span>
              </div>
              <p className="text-xs font-bold text-neutral-900">Sangam Memories</p>
              <p className="text-[10px] text-neutral-500">
                {totalPhotoCount > 0 ? `${totalPhotoCount} photos in gallery` : 'View shared photos'}
              </p>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
