'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Layers, Image as GalleryIcon, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TeacherHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const navItems = [
    { href: '/teacher/dashboard', label: 'Sangam Overview', icon: BookOpen },
    { href: '/teacher/teams', label: 'Teams & Students', icon: Layers },
    { href: '/teacher/gallery', label: 'Sangam Gallery', icon: GalleryIcon },
  ];

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <header className="border-b border-neutral-200 bg-white sticky top-0 z-30 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/teacher/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-black text-white flex items-center justify-center font-bold text-xs">
              T
            </div>
            <div>
              <span className="font-semibold text-sm tracking-tight text-neutral-950 block leading-tight">
                Faculty Portal
              </span>
              <span className="text-[10px] text-neutral-400 block font-mono">
                SANGAM 2027 • FACULTY
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-neutral-900 text-white font-semibold'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-semibold text-neutral-900 block leading-tight">
              {user?.fullName || 'Faculty Member'}
            </span>
            <span className="text-[10px] text-neutral-400 font-mono block">
              TEACHER
            </span>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="text-xs text-neutral-500 hover:text-neutral-950 font-medium px-2.5 py-1.5 rounded-md border border-neutral-200 hover:bg-neutral-50 transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
