'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

export default function RootHomePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/login');
      } else if (user.role === 'student') {
        router.replace('/student');
      } else if (user.role === 'mentor') {
        router.replace('/mentor/dashboard');
      } else if (user.role === 'teacher' || user.role === 'faculty' || user.role === 'judge') {
        router.replace('/teacher/dashboard');
      } else {
        router.replace('/admin/dashboard');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-bold text-xs animate-pulse">
          SG
        </div>
        <p className="text-xs text-neutral-400 font-mono tracking-wider">
          LOADING SANGAMCONNECT...
        </p>
      </div>
    </div>
  );
}
