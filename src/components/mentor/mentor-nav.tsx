'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Megaphone,
  Image as GalleryIcon,
  MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { subscribeToChannelMessages } from '@/lib/firebase-db';

export function MentorNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const isChannel = pathname === '/mentor/channel';

  useEffect(() => {
    if (isChannel) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('sangam_channel_last_read', new Date().toISOString());
      }
      setUnreadCount(0);
      return;
    }

    const checkUnread = (messages: any[]) => {
      if (typeof window === 'undefined') return;
      const lastReadStr = localStorage.getItem('sangam_channel_last_read');
      const lastReadTime = lastReadStr ? new Date(lastReadStr).getTime() : 0;
      const count = messages.filter(
        (m) => new Date(m.createdAt).getTime() > lastReadTime
      ).length;
      setUnreadCount(count);
    };

    fetch('/api/channel')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.messages) checkUnread(data.messages);
      })
      .catch(() => {});

    const unsubscribe = subscribeToChannelMessages((messages) => {
      checkUnread(messages);
    });

    return () => unsubscribe();
  }, [isChannel]);

  const navItems = [
    { href: '/mentor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/mentor/channel', label: 'Open Channel', icon: MessageCircle, badge: unreadCount },
    { href: '/mentor/teams', label: 'My Teams', icon: Users },
    { href: '/mentor/attendance', label: 'Attendance', icon: CalendarCheck },
    { href: '/mentor/information', label: 'Information', icon: Megaphone },
    { href: '/mentor/gallery', label: 'Gallery', icon: GalleryIcon },
  ];

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <header className="border-b border-neutral-200 bg-white sticky top-0 z-30 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/mentor/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-black text-white flex items-center justify-center font-bold text-xs">
              M
            </div>
            <div>
              <span className="font-semibold text-sm tracking-tight text-neutral-900 block leading-tight">
                Mentor Portal
              </span>
              <span className="text-[10px] text-neutral-400 block font-mono">
                SANGAM 2027
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors relative',
                    isActive
                      ? 'bg-neutral-900 text-white font-semibold'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  {item.badge && item.badge > 0 && !isActive ? (
                    <span className="ml-1 px-1.5 py-0.2 bg-neutral-950 text-white text-[9px] font-bold rounded-full border border-neutral-700">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-semibold text-neutral-900 block leading-tight">
              {user?.fullName || 'Mentor'}
            </span>
            <span className="text-[10px] text-neutral-400 font-mono block">
              ADVISOR
            </span>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="text-xs text-neutral-500 hover:text-neutral-950 font-medium px-2 py-1 rounded-md border border-neutral-200 hover:bg-neutral-50 transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Mobile nav row */}
      <div className="flex md:hidden items-center justify-around py-2 border-t border-neutral-100">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-2 py-1 text-[11px] relative',
                isActive ? 'text-neutral-950 font-semibold' : 'text-neutral-500'
              )}
            >
              <div className="relative">
                <Icon className="w-4 h-4" />
                {item.badge && item.badge > 0 && !isActive ? (
                  <span className="absolute -top-1.5 -right-2 px-1 min-w-[14px] h-[14px] bg-neutral-950 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                ) : null}
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}
