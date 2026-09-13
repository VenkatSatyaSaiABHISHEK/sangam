import { NextRequest, NextResponse } from 'next/server';
import { uploadImageFile } from '@/lib/storage';
import { db } from '@/lib/db';
import { savePhotoToFirestore } from '@/lib/firebase-db';
import { Photo, UserRole } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // 1. Check if multiple files were uploaded (Batch Upload, e.g. 10+ photos)
    const batchFiles = formData.getAll('files') as File[];
    const metaStr = formData.get('metadata') as string | null;
    const metadata = metaStr ? JSON.parse(metaStr) : {};

    const uploadedByUser = metadata.uploadedBy || {
      userId: 'guest',
      name: 'Participant',
      role: 'student' as UserRole,
      teamId: undefined,
      teamName: undefined,
      mentorName: undefined,
    };

    // Allowed image formats
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'];
    const MAX_SIZE = 15 * 1024 * 1024; // 15MB per photo

    // --- BATCH UPLOAD HANDLER ---
    if (batchFiles && batchFiles.length > 0) {
      const savedPhotos: Photo[] = [];

      for (let i = 0; i < batchFiles.length; i++) {
        const file = batchFiles[i];

        if (file.size > MAX_SIZE) continue; // Skip oversized

        const buffer = Buffer.from(await file.arrayBuffer());
        const photoId = `PHOTO-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${i + 1}`;
        const mime = file.type || 'image/jpeg';
        const filename = `${photoId}_${file.name || 'image.jpg'}`;

        const uploadResult = await uploadImageFile(buffer, filename, mime);

        const photoRecord: Photo = {
          id: photoId,
          eventId: metadata.eventId || 'summit-2027',
          uploadedBy: uploadedByUser,
          originalUrl: uploadResult.url,
          brandedUrl: uploadResult.url,
          thumbnailUrl: uploadResult.url,
          dimensions: { width: 1200, height: 800 },
          sizeBytes: uploadResult.sizeBytes,
          mimeType: mime,
          capturedAt: new Date().toISOString(),
          uploadedAt: new Date().toISOString(),
          status: 'approved',
          tags: ['summit2027', uploadedByUser.teamName || 'general', 'upload'],
          hasWatermark: false,
          captureType: 'upload',
        };

        db.savePhoto(photoRecord);
        savePhotoToFirestore(photoRecord).catch(() => {});
        savedPhotos.push(photoRecord);
      }

      return NextResponse.json({
        success: true,
        photos: savedPhotos,
        count: savedPhotos.length,
      });
    }

    // --- SINGLE UPLOAD / CAMERA CAPTURE HANDLER ---
    const originalFile = formData.get('original') as File | null;
    const brandedFile = formData.get('branded') as File | null;
    const singleFile = (formData.get('file') as File | null) || originalFile;

    if (!singleFile) {
      return NextResponse.json(
        { error: 'No image file uploaded' },
        { status: 400 }
      );
    }

    if (singleFile.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds maximum limit of 15MB.' },
        { status: 400 }
      );
    }

    const photoId = metadata.id || `PHOTO-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Upload original photo
    const origBuffer = Buffer.from(await singleFile.arrayBuffer());
    const origResult = await uploadImageFile(origBuffer, `orig_${photoId}.jpg`, singleFile.type || 'image/jpeg');

    let brandedUrl = origResult.url;
    let hasWatermark = false;
    let captureType: 'camera' | 'upload' = 'upload';

    // If live camera supplied a branded canvas with watermark
    if (brandedFile && metadata.captureType === 'camera') {
      const brandedBuffer = Buffer.from(await brandedFile.arrayBuffer());
      const brandedResult = await uploadImageFile(brandedBuffer, `branded_${photoId}.jpg`, brandedFile.type);
      brandedUrl = brandedResult.url;
      hasWatermark = true;
      captureType = 'camera';
    }

    const photoRecord: Photo = {
      id: photoId,
      eventId: metadata.eventId || 'summit-2027',
      uploadedBy: uploadedByUser,
      originalUrl: origResult.url,
      brandedUrl,
      thumbnailUrl: brandedUrl,
      verificationCode: hasWatermark ? metadata.verificationCode : undefined,
      gps: metadata.gps,
      dimensions: metadata.dimensions || { width: 1200, height: 800 },
      sizeBytes: origResult.sizeBytes,
      mimeType: singleFile.type || 'image/jpeg',
      capturedAt: metadata.capturedAt || new Date().toISOString(),
      uploadedAt: new Date().toISOString(),
      status: 'approved',
      tags: metadata.tags || ['summit2027', uploadedByUser.teamName || 'general'],
      hasWatermark,
      captureType,
    };

    db.savePhoto(photoRecord);
    savePhotoToFirestore(photoRecord).catch(() => {});

    return NextResponse.json({
      success: true,
      photo: photoRecord,
    });
  } catch (error: any) {
    console.error('Photo upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error during upload.' },
      { status: 500 }
    );
  }
}
