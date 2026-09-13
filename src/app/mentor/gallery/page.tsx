'use client';

import React from 'react';
import { GalleryGrid } from '@/components/modules/gallery/gallery-grid';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';

export default function MentorGalleryPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            Mentor Gallery Feed
          </h1>
          <p className="text-xs text-neutral-500">
            View captured team prototype sessions, lab testing, and Sangam memories.
          </p>
        </div>

        <Link href="/mentors/camera">
          <Button size="sm" className="gap-1.5 text-xs">
            <Camera className="w-3.5 h-3.5" />
            <span>Open Camera</span>
          </Button>
        </Link>
      </div>

      <GalleryGrid />
    </div>
  );
}
