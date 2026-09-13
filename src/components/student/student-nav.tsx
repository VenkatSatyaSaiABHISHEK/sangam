'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageCircle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subscribeToChannelMessages } from '@/lib/firebase-db';

export function StudentNav() {
  const pathname = usePathname();

  const isHome = pathname === '/student' || pathname === '/student/dashboard';
  const isChannel = pathname === '/student/channel';
  const isTeam = pathname === '/student/team';

  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    // If currently on channel page, clear badge
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

    // 1. Initial fetch from API
    fetch('/api/channel')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.messages) checkUnread(data.messages);
      })
      .catch(() => {});

    // 2. Real-time Firestore sync
    const unsubscribe = subscribeToChannelMessages((messages) => {
      checkUnread(messages);
    });

    return () => unsubscribe();
  }, [isChannel]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200 safe-area-bottom">
      <div className="max-w-md mx-auto px-6 h-16 flex items-center justify-between relative">
        {/* Left: HOME */}
        <Link
          href="/student"
          className={cn(
            'flex flex-col items-center justify-center w-20 py-1 transition-colors select-none',
            isHome ? 'text-neutral-950 font-bold' : 'text-neutral-400 hover:text-neutral-700'
          )}
        >
          <Home className={cn('w-5 h-5', isHome && 'stroke-[2.5]')} />
          <span className="text-[11px] tracking-tight mt-1 font-medium">Home</span>
        </Link>

        {/* Middle: OPEN CHANNEL (WhatsApp-Style Group Discussion Button) */}
        <Link
          href="/student/channel"
          className="relative -top-5 flex flex-col items-center group focus:outline-none"
        >
          <div
            className={cn(
              'w-14 h-14 rounded-full bg-neutral-950 text-white flex items-center justify-center shadow-xl border-4 border-white active:scale-95 transition-transform relative',
              isChannel && 'ring-2 ring-neutral-950'
            )}
          >
            <MessageCircle className="w-6 h-6 text-white" />

            {/* Unread Counter Badge (1, 2, 3...) */}
            {unreadCount > 0 && !isChannel && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 bg-white text-neutral-950 border-2 border-neutral-950 text-[10px] font-black rounded-full flex items-center justify-center shadow-md animate-bounce">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-900 mt-1">
            Channel
          </span>
        </Link>

        {/* Right: TEAM */}
        <Link
          href="/student/team"
          className={cn(
            'flex flex-col items-center justify-center w-20 py-1 transition-colors select-none',
            isTeam ? 'text-neutral-950 font-bold' : 'text-neutral-400 hover:text-neutral-700'
          )}
        >
          <Users className={cn('w-5 h-5', isTeam && 'stroke-[2.5]')} />
          <span className="text-[11px] tracking-tight mt-1 font-medium">Team</span>
        </Link>
      </div>
    </div>
  );
}
