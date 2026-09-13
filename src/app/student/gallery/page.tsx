'use client';

import React from 'react';
import { GalleryGrid } from '@/components/modules/gallery/gallery-grid';

export default function StudentGalleryPage() {
  return (
    <div className="space-y-4 pt-1">
      <div>
        <h1 className="text-lg font-bold tracking-tight text-neutral-900">
          Sangam Photo Gallery
        </h1>
        <p className="text-xs text-neutral-500">
          Shared event media. Tap any photo to inspect metadata or download.
        </p>
      </div>

      <GalleryGrid />
    </div>
  );
}
