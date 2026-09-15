'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Menu,
  X,
  Bell,
  ExternalLink,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ADMIN_NAV_ITEMS } from './admin-sidebar';

export function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <>
      <header className="border-b border-neutral-200 bg-white/95 backdrop-blur-xs sticky top-0 z-30 select-none">
        {/* Top Header Row */}
        <div className="h-16 px-4 sm:px-6 flex items-center justify-between">
          {/* Left: Mobile hamburger & Brand */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-1.5 rounded-lg text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link href="/admin/dashboard" className="flex items-center gap-2 lg:hidden">
              <div className="w-7 h-7 rounded-md bg-black text-white flex items-center justify-center font-bold text-xs tracking-wider">
                SG
              </div>
              <span className="font-bold text-sm tracking-tight text-neutral-900">
                Admin
              </span>
            </Link>

            <div className="hidden sm:flex items-center gap-2">
              <Badge variant="outline" className="gap-1.5 py-1 px-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-neutral-900">SANGAM 2027</span>
                <span className="text-neutral-400">|</span>
                <span className="text-neutral-600">Command Center</span>
              </Badge>
            </div>
          </div>

          {/* Right: Quick actions & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-semibold text-neutral-900 block leading-tight">
                {user?.fullName || 'Administrator'}
              </span>
              <span className="text-[10px] text-neutral-400 font-mono block">
                {user?.email || 'admin@sangamconnect.org'}
              </span>
            </div>

            <Link
              href="/admin/notifications"
              className="p-2 rounded-lg text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 transition-colors relative"
              title="Notifications & Broadcasts"
            >
              <Bell className="w-4 h-4" />
            </Link>

            <Link href="/admin/rooms/create">
              <Button size="sm" className="hidden sm:inline-flex gap-1 text-xs cursor-pointer">
                <Plus className="w-3.5 h-3.5" />
                <span>Create Room</span>
              </Button>
            </Link>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="text-xs text-neutral-500 hover:text-neutral-950 font-medium px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Mobile Horizontal Quick-Nav Scrollable Tabs (Always visible on mobile) */}
        <div className="flex lg:hidden items-center gap-1.5 overflow-x-auto py-2 px-3 border-t border-neutral-100 no-scrollbar bg-white">
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer whitespace-nowrap',
                  isActive
                    ? 'bg-neutral-900 text-white shadow-xs font-semibold'
                    : 'text-neutral-600 bg-neutral-100/90 hover:bg-neutral-200/80 hover:text-neutral-900'
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* Mobile Slide-over Drawer Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-72 max-w-[80vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="h-16 px-5 border-b border-neutral-200 flex items-center justify-between">
              <Link
                href="/admin/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5"
              >
                <div className="w-7 h-7 rounded-md bg-black text-white flex items-center justify-center font-bold text-xs">
                  SG
                </div>
                <div>
                  <span className="font-bold text-sm text-neutral-900 block leading-tight">
                    SangamConnect
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono block">
                    ADMIN COMMAND
                  </span>
                </div>
              </Link>

              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation List */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              <div className="px-1 pb-3">
                <Link
                  href="/live"
                  target="_blank"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-rose-500/10 to-indigo-500/10 border border-rose-500/20 text-rose-700 font-semibold text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span>Public Live Link</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              <p className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">
                Admin Portals
              </p>

              {ADMIN_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-neutral-900 text-white font-semibold'
                        : 'text-neutral-700 hover:bg-neutral-100'
                    )}
                  >
                    <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-white' : 'text-neutral-500')} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Drawer Footer Profile */}
            <div className="p-3 border-t border-neutral-200 bg-neutral-50/60">
              <div className="flex items-center justify-between p-2 rounded-lg border border-neutral-200 bg-white">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {user?.fullName?.charAt(0) || 'A'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-neutral-900 truncate">
                      {user?.fullName || 'Administrator'}
                    </p>
                    <span className="inline-block text-[10px] uppercase font-mono text-neutral-400">
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
          </div>
        </div>
      )}
    </>
  );
}
