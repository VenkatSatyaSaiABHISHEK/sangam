'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Photo } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatTime } from '@/lib/utils';
import {
  ShieldCheck,
  User,
  Users,
  GraduationCap,
  MapPin,
  Calendar,
  Clock,
  HelpCircle,
} from 'lucide-react';

interface PhotoVerificationCardProps {
  initialPhoto: Photo | null;
  photoId: string;
}

export function PhotoVerificationCard({
  initialPhoto,
  photoId,
}: PhotoVerificationCardProps) {
  const [photo] = useState<Photo | null>(initialPhoto);
  const [showOriginal, setShowOriginal] = useState(false);

  if (!photo) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
            Unverified Media Asset
          </h2>
          <p className="text-xs text-neutral-500">
            The photo identifier #{photoId} could not be validated against the SangamConnect registry.
          </p>
          <div className="pt-2">
            <Link href="/" className="text-xs font-semibold text-neutral-900 underline">
              Return to Sangam Portal
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4 flex flex-col items-center justify-center">
      <div className="max-w-lg w-full space-y-6">
        {/* Verification Certificate Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3.5 py-1.5 rounded-full text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Cryptographically Verified Sangam Asset</span>
          </div>

          <h1 className="text-xl font-bold tracking-tight text-neutral-950">
            Photo Authentication Card
          </h1>
          <p className="text-xs text-neutral-500 font-mono">
            IDENTIFIER: {photo.id} • {photo.verificationCode}
          </p>
        </div>

        {/* Card */}
        <Card className="overflow-hidden bg-white border-neutral-200 shadow-sm p-0">
          {/* Photo Display */}
          <div className="relative bg-black flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={showOriginal ? photo.originalUrl : photo.brandedUrl}
              alt={photo.id}
              className="max-h-[55vh] w-full object-contain"
            />
            <button
              onClick={() => setShowOriginal(!showOriginal)}
              className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-xs text-white text-xs font-medium border border-white/20 hover:bg-black transition-colors cursor-pointer"
            >
              {showOriginal ? 'Show Branded Version' : 'Show Original Photo'}
            </button>
          </div>

          {/* Clean Metadata Strip */}
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
                  Uploaded By
                </span>
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-neutral-500" />
                  <span className="font-semibold text-neutral-900 text-sm">
                    {photo.uploadedBy.name}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
                  Assigned Team
                </span>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-neutral-500" />
                  <span className="font-semibold text-neutral-900 text-sm">
                    {photo.uploadedBy.teamName}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
                  Mentor in Charge
                </span>
                <div className="flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-neutral-500" />
                  <span className="font-medium text-neutral-800">
                    {photo.uploadedBy.mentorName || 'Ram Mohan'}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
                  Venue Location
                </span>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                  <span className="font-medium text-neutral-800">
                    {photo.gps?.locationName || 'Sangam Pavilion'}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
                  Date
                </span>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                  <span className="font-medium text-neutral-800">
                    {formatDate(photo.capturedAt)}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
                  Time
                </span>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-neutral-500" />
                  <span className="font-medium text-neutral-800">
                    {formatTime(photo.capturedAt)}
                  </span>
                </div>
              </div>
            </div>

            {photo.gps && (
              <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200 text-[11px] text-neutral-600 flex items-center justify-between font-mono">
                <span>
                  GPS: {photo.gps.lat}° N, {photo.gps.lng}° E
                </span>
                <span className="text-neutral-400">
                  Accuracy: ±{photo.gps.accuracy}m
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center">
          <p className="text-[11px] text-neutral-400 font-mono">
            SUMMIT 2027 • OFFICIAL PHOTO VERIFICATION
          </p>
        </div>
      </div>
    </div>
  );
}
