'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { MentorNav } from '@/components/mentor';

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

  return (
    <div className="min-h-screen bg-neutral-50/50 flex flex-col">
      <MentorNav />
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
