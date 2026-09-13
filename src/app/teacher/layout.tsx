'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { TeacherHeader } from '@/components/teacher';

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Exclude login pages from teacher navigation shell
  if (pathname === '/teacher/login' || pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-neutral-50/50 flex flex-col">
      <TeacherHeader />
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
