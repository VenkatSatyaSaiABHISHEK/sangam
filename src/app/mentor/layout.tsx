'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { MentorNav } from '@/components/mentor';

import { cn } from '@/lib/utils';

export default function MentorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Exclude /mentor/login from mentor nav
  if (pathname === '/mentor/login' || pathname === '/login') {
    return <>{children}</>;
  }

  const isChannel = pathname === '/mentor/channel';

  return (
    <div
      className={cn(
        'bg-neutral-50/50 flex flex-col',
        isChannel ? 'h-[100dvh] overflow-hidden' : 'min-h-screen'
      )}
    >
      <MentorNav />
      <main
        className={cn(
          'flex-1 w-full mx-auto flex flex-col min-h-0',
          isChannel
            ? 'p-0 sm:p-2 md:p-4 max-w-4xl h-[calc(100dvh-112px)] md:h-[calc(100dvh-64px)] overflow-hidden'
            : 'max-w-5xl p-4 sm:p-6 lg:p-8'
        )}
      >
        {children}
      </main>
    </div>
  );
}
