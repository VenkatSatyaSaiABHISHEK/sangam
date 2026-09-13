'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { StudentNav } from '@/components/student';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Do not render student bottom nav or constraining padding on login or channel page
  if (pathname === '/student/login' || pathname === '/login' || pathname === '/student/channel') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-neutral-50/60 flex flex-col items-center">
      <div className="w-full max-w-md min-h-screen bg-white flex flex-col shadow-xs border-x border-neutral-200">
        <main className="flex-1 p-4 pb-24 overflow-y-auto">{children}</main>
        <StudentNav />
      </div>
    </div>
  );
}
