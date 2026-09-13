'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Menu, X } from 'lucide-react';
import { ADMIN_NAV_ITEMS } from './admin-sidebar';

export function AdminHeader() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <header className="h-16 border-b border-neutral-200 bg-white/90 backdrop-blur-xs sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile hamburger & Active Sangam Badge */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 rounded-lg text-neutral-600 hover:bg-neutral-100"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="hidden sm:inline-flex gap-1.5 py-1 px-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-neutral-900">SANGAM 2027</span>
            <span className="text-neutral-400">|</span>
            <span className="text-neutral-600">Grand Tech Pavilion</span>
          </Badge>
        </div>
      </div>

      {/* Right: Admin info, Quick Actions, Sign Out */}
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <span className="text-xs font-semibold text-neutral-900 block leading-tight">
            {user?.fullName || 'Administrator'}
          </span>
          <span className="text-[10px] text-neutral-400 font-mono block">
            {user?.email || 'admin@sangamconnect.org'}
          </span>
        </div>

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

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-40 bg-white border-t border-neutral-200 p-4 lg:hidden overflow-y-auto">
          <nav className="space-y-1">
            {ADMIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                >
                  <Icon className="w-4 h-4 text-neutral-500" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
