'use client';

import React from 'react';
import { CameraViewport } from '@/components/modules/camera/camera-viewport';

export default function MentorCameraPage() {
  return (
    <div className="space-y-4 max-w-md mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-900">
          Mentor Photo Capture
        </h1>
        <p className="text-xs text-neutral-500">
          Snap photos with your assigned teams. Automatic branding attaches your name and team attribution.
        </p>
      </div>

      <CameraViewport redirectPathAfterUpload="/mentor/gallery" />
    </div>
  );
}
