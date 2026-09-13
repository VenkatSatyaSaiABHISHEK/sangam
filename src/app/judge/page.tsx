'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function JudgeRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/teacher/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center space-y-2">
        <p className="text-xs font-mono text-neutral-500">Redirecting to Evaluation Portal...</p>
      </div>
    </div>
  );
}
