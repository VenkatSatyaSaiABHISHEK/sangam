'use client';

import React from 'react';
import { GalleryGrid } from '@/components/modules/gallery/gallery-grid';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';

export default function AdminGalleryPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-950">
            Master Event Media Gallery
          </h1>
          <p className="text-xs text-neutral-500">
            Centralized stream of verified summit photos stamped with QR identifiers and GPS telemetry.
          </p>
        </div>

        <Link href="/student/camera">
          <Button size="sm" className="gap-2">
            <Camera className="w-4 h-4" />
            <span>Launch Camera</span>
          </Button>
        </Link>
      </div>

      <GalleryGrid />
    </div>
  );
}
