'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { StudentNav } from '@/components/student';
import { cn } from '@/lib/utils';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Exclude login pages from container & bottom nav
  if (pathname === '/student/login' || pathname === '/login') {
    return <>{children}</>;
  }

  const isChannel = pathname === '/student/channel';

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col items-center">
      <div
        className={cn(
          'w-full max-w-md bg-white flex flex-col shadow-xs border-x border-neutral-200 relative',
          isChannel ? 'h-[100dvh] overflow-hidden' : 'min-h-screen'
        )}
      >
        <main
          className={cn(
            'flex-1 flex flex-col min-h-0',
            isChannel ? 'pb-16' : 'p-4 pb-24 overflow-y-auto'
          )}
        >
          {children}
        </main>
        <StudentNav />
      </div>
    </div>
  );
}
