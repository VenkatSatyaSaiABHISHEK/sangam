'use client';

import React from 'react';
import { GalleryGrid } from '@/components/modules/gallery/gallery-grid';

export default function JudgeGalleryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-900">
          Project Deliverable Media & Proof
        </h1>
        <p className="text-xs text-neutral-500">
          Inspect hardware prototypes, live demos, and verified project milestones submitted by teams.
        </p>
      </div>

      <GalleryGrid />
    </div>
  );
}
