'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Layers,
  GraduationCap,
  Building,
  Bus,
  FileQuestion,
  CalendarCheck,
  Image as GalleryIcon,
  Bell,
  Activity,
  Settings,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';

export const ADMIN_NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/students', label: 'Students', icon: Users },
  { href: '/admin/teams', label: 'Teams', icon: Layers },
  { href: '/admin/mentors', label: 'Mentors', icon: GraduationCap },
  { href: '/admin/teachers', label: 'Teachers', icon: Building },
  { href: '/admin/buses', label: 'Buses', icon: Bus },
  { href: '/admin/rooms', label: 'Rooms', icon: FileQuestion },
  { href: '/admin/attendance', label: 'Attendance', icon: CalendarCheck },
  { href: '/admin/gallery', label: 'Gallery', icon: GalleryIcon },
  { href: '/admin/notifications', label: 'Announcements', icon: Bell },
  { href: '/admin/activity', label: 'Activity Log', icon: Activity },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <aside className="w-64 border-r border-neutral-200 bg-white flex flex-col shrink-0 h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-neutral-200 justify-between">
        <Link href="/admin/dashboard" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-black text-white flex items-center justify-center font-bold text-xs tracking-wider">
            SG
          </div>
          <div>
            <span className="font-semibold text-sm tracking-tight text-neutral-900 block leading-tight">
              SangamConnect
            </span>
            <span className="text-[10px] text-neutral-400 font-mono block">
              COMMAND CENTER
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <div className="px-1 pb-3">
          <Link
            href="/live"
            target="_blank"
            className="flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-indigo-500/10 border border-rose-500/20 text-rose-700 hover:bg-rose-500/20 transition-all font-semibold text-xs group"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>Public Live Link</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-rose-500 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <p className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">
          Management
        </p>
        {ADMIN_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                isActive
                  ? 'bg-neutral-900 text-white font-semibold'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-white' : 'text-neutral-500')} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Profile */}
      <div className="p-3 border-t border-neutral-200 bg-neutral-50/60">
        <div className="flex items-center justify-between p-2 rounded-lg border border-neutral-200 bg-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {user?.fullName?.charAt(0) || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-neutral-900 truncate">
                {user?.fullName || 'Admin'}
              </p>
              <span className="inline-block text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-600 border border-neutral-200">
                {user?.role || 'admin'}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
