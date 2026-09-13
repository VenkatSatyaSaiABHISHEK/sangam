'use client';

import React from 'react';
import { GalleryGrid } from '@/components/modules/gallery/gallery-grid';

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
      </div>

      <GalleryGrid />
    </div>
  );
}
