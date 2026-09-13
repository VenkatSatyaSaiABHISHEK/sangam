'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Camera, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StudentNav() {
  const pathname = usePathname();

  const isHome = pathname === '/student';
  const isSnap = pathname === '/student/camera';
  const isTeam = pathname === '/student/team';

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

        {/* Middle: SNAP (Floating Camera Button) */}
        <Link
          href="/student/camera"
          className="relative -top-5 flex flex-col items-center group focus:outline-none"
        >
          <div
            className={cn(
              'w-14 h-14 rounded-full bg-neutral-950 text-white flex items-center justify-center shadow-lg border-4 border-white active:scale-95 transition-transform',
              isSnap && 'ring-2 ring-neutral-950'
            )}
          >
            <Camera className="w-6 h-6 text-white" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-900 mt-1">
            Snap
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
