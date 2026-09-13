'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageCircle, Users, Image as GalleryIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subscribeToChannelMessages } from '@/lib/firebase-db';

export function StudentNav() {
  const pathname = usePathname();

  const isHome = pathname === '/student' || pathname === '/student/dashboard';
  const isChannel = pathname === '/student/channel';
  const isTeam = pathname === '/student/team';
  const isGallery = pathname === '/student/gallery' || pathname.startsWith('/student/gallery');

  const [unreadCount, setUnreadCount] = useState<number>(0);

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

  const navTabs = [
    {
      href: '/student',
      label: 'Home',
      icon: Home,
      isActive: isHome,
    },
    {
      href: '/student/channel',
      label: 'Channel',
      icon: MessageCircle,
      isActive: isChannel,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      href: '/student/team',
      label: 'My Team',
      icon: Users,
      isActive: isTeam,
    },
    {
      href: '/student/gallery',
      label: 'Gallery',
      icon: GalleryIcon,
      isActive: isGallery,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200/90 shadow-[0_-2px_10px_rgba(0,0,0,0.03)] safe-area-bottom">
      <div className="max-w-md mx-auto px-3 h-16 flex items-center justify-around">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-1.5 transition-all select-none relative group',
                tab.isActive
                  ? 'text-neutral-950 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-700'
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    'w-5 h-5 transition-transform group-active:scale-90',
                    tab.isActive ? 'stroke-[2.5] text-neutral-950' : 'text-neutral-500'
                  )}
                />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] px-1 bg-neutral-950 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white shadow-xs">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'text-[11px] tracking-tight mt-1 transition-colors',
                  tab.isActive ? 'text-neutral-950 font-bold' : 'text-neutral-500 font-medium'
                )}
              >
                {tab.label}
              </span>
              {tab.isActive && (
                <span className="absolute bottom-0 w-8 h-[2px] bg-neutral-950 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
