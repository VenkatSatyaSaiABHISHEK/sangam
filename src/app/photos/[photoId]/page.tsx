import React from 'react';
import { db } from '@/lib/db';
import { PhotoVerificationCard } from '@/components/modules/gallery/photo-verification-card';

export default async function PhotoPage({
  params,
}: {
  params: Promise<{ photoId: string }>;
}) {
  const { photoId } = await params;
  const photo = db.getPhotoById(photoId) || null;

  return <PhotoVerificationCard initialPhoto={photo} photoId={photoId} />;
}
