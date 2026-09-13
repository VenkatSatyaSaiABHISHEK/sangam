'use client';

import React from 'react';
import { CameraViewport } from '@/components/modules/camera/camera-viewport';

export default function StudentCameraPage() {
  return (
    <div className="space-y-4 pt-2">
      <div className="text-center">
        <h1 className="text-lg font-bold tracking-tight text-neutral-900">
          Sangam Camera
        </h1>
        <p className="text-[11px] text-neutral-500">
          Photos automatically receive your verified team info, timestamp, and verification QR code.
        </p>
      </div>

      <CameraViewport redirectPathAfterUpload="/student/gallery" />
    </div>
  );
}
