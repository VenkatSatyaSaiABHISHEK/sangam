'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function QrRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const photoId = params?.photoId as string;

  useEffect(() => {
    if (photoId) {
      router.replace(`/photos/${photoId}`);
    }
  }, [photoId, router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-bold text-xs animate-pulse">
          SC
        </div>
        <p className="text-xs text-neutral-400 font-mono">RESOLVING PHOTO QR...</p>
      </div>
    </div>
  );
}
