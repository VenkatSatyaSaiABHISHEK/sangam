'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/db';
import { Announcement, Room, AttendanceRecord } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Camera,
  Users,
  Bus,
  GraduationCap,
  Bell,
  FileQuestion,
  CalendarCheck,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Image as GalleryIcon,
} from 'lucide-react';

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activeRooms, setActiveRooms] = useState<Room[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [myPhotoCount, setMyPhotoCount] = useState<number>(0);
  const [totalPhotoCount, setTotalPhotoCount] = useState<number>(0);

  useEffect(() => {
    setAnnouncements(db.getAnnouncements());
    setActiveRooms(db.getRooms().filter((r) => r.isActive).slice(0, 2));
    if (user?.id) {
      const rec = db.getAttendanceForStudent(user.id);
      if (rec) setAttendance(rec);
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
  }, [user]);

  const latestUrgent = announcements.find((a) => a.priority === 'urgent' || a.priority === 'important');
  const isPresent = attendance?.status === 'present';

  return (
    <div className="space-y-4 pt-1">
      {/* Student Profile Card (Section 13) */}
      <Card className="p-4 bg-neutral-950 text-white border-neutral-900 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-sm text-white shrink-0">
              {user?.fullName?.charAt(0) || 'S'}
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-tight text-white">
                {user?.fullName || 'Student Participant'}
              </h2>
              <span className="text-[11px] text-neutral-400 font-mono">
                {user?.email || 'Participant'}
              </span>
            </div>
          </div>

          <Badge
            variant={isPresent ? 'success' : 'warning'}
            size="sm"
            className="text-[10px] uppercase font-mono px-2 py-0.5"
          >
            {attendance?.status || 'Pending'}
          </Badge>
        </div>

        {/* Info Grid: Team, Mentor, Bus */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-800 text-[11px]">
          <div className="space-y-0.5">
            <span className="text-[9px] font-semibold text-neutral-500 uppercase block">Team</span>
            <p className="font-medium text-neutral-200 truncate">
              {user?.teamName?.split('—')[0]?.trim() || 'Unassigned'}
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-[9px] font-semibold text-neutral-500 uppercase block">Mentor</span>
            <p className="font-medium text-neutral-200 truncate">
              {user?.mentorName || 'Unassigned'}
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-[9px] font-semibold text-neutral-500 uppercase block">Bus</span>
            <p className="font-medium text-neutral-200 truncate">
              {user?.busName?.split('—')[0]?.trim() || 'Unassigned'}
            </p>
          </div>
        </div>
      </Card>

      {/* Primary Action Button: Large CAMERA CTA */}
      <Link href="/student/camera" className="block">
        <button className="w-full py-3.5 px-4 rounded-xl bg-black text-white hover:bg-neutral-800 active:scale-98 transition-all flex items-center justify-between shadow-sm cursor-pointer border border-black">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-neutral-800 flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold uppercase tracking-wider text-white">
                Snap Sangam Photo
              </p>
              <p className="text-[11px] text-neutral-400">
                Auto-stamps verified QR code & metadata
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-neutral-400" />
        </button>
      </Link>

      {/* Urgent Announcement Alert */}
      {latestUrgent && (
        <Card
          className={`p-3.5 space-y-1.5 border ${
            latestUrgent.priority === 'urgent'
              ? 'bg-rose-50/70 border-rose-200 text-rose-950'
              : 'bg-amber-50/70 border-amber-200 text-amber-950'
          }`}
        >
          <div className="flex items-center justify-between">
            <Badge
              variant={latestUrgent.priority === 'urgent' ? 'danger' : 'warning'}
              size="sm"
              className="text-[10px] capitalize"
            >
              {latestUrgent.priority} Notice
            </Badge>
            <span className="text-[10px] text-neutral-500 font-mono">Just Now</span>
          </div>
          <h3 className="font-bold text-xs leading-tight">{latestUrgent.title}</h3>
          <p className="text-[11px] text-neutral-700 leading-snug">
            {latestUrgent.message}
          </p>
        </Card>
      )}

      {/* Active Requests / Dynamic Rooms */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-neutral-900 tracking-tight">
            Action Requests ({activeRooms.length})
          </span>
          <Link href="/student/rooms" className="text-[11px] text-neutral-500 hover:text-black">
            View All
          </Link>
        </div>

        <div className="space-y-2">
          {activeRooms.map((room) => (
            <Link key={room.id} href={`/rooms/${room.id}`} className="block">
              <Card className="p-3 hover:border-neutral-400 transition-colors flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" size="sm" className="text-[9px] font-mono">
                      #{room.id}
                    </Badge>
                    <h4 className="text-xs font-semibold text-neutral-900">
                      {room.title}
                    </h4>
                  </div>
                  <p className="text-[10px] text-neutral-500 line-clamp-1">
                    {room.purpose}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-[11px] shrink-0 ml-2">
                  Open
                </Button>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        <Link href="/student/team" className="block">
          <Card className="p-3 hover:border-neutral-400 transition-colors space-y-1">
            <Users className="w-4 h-4 text-neutral-700" />
            <p className="text-xs font-bold text-neutral-900">My Team</p>
            <p className="text-[10px] text-neutral-500">Roster & mentor</p>
          </Card>
        </Link>

        <Link href="/student/attendance" className="block">
          <Card className="p-3 hover:border-neutral-400 transition-colors space-y-1">
            <CalendarCheck className="w-4 h-4 text-neutral-700" />
            <p className="text-xs font-bold text-neutral-900">Attendance</p>
            <p className="text-[10px] text-neutral-500">Check-in record</p>
          </Card>
        </Link>

        <Link href="/student/gallery" className="block">
          <Card className="p-3 hover:border-neutral-400 transition-colors space-y-1 relative">
            <div className="flex items-center justify-between">
              <GalleryIcon className="w-4 h-4 text-neutral-700" />
              <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {myPhotoCount}
              </span>
            </div>
            <p className="text-xs font-bold text-neutral-900">Gallery</p>
            <p className="text-[10px] text-neutral-500">{totalPhotoCount} photos</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
