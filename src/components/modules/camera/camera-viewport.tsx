'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { createBrandedImageCanvas } from '@/lib/watermark';
import { generatePhotoId, formatDateTime } from '@/lib/utils';
import { Photo } from '@/types';
import {
  Camera,
  RefreshCw,
  Image as ImageIcon,
  CheckCircle2,
  MapPin,
  QrCode,
  ExternalLink,
  Upload,
  ArrowLeft,
  X,
  Plus,
  Send,
  Trash2,
} from 'lucide-react';

interface CameraViewportProps {
  redirectPathAfterUpload?: string;
}

interface SelectedFileItem {
  id: string;
  file: File;
  preview: string;
}

export function CameraViewport({ redirectPathAfterUpload = '/student/gallery' }: CameraViewportProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<'options' | 'camera'>('options');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastUploadedPhoto, setLastUploadedPhoto] = useState<Photo | null>(null);

  // WhatsApp-style batch upload state
  const [selectedFiles, setSelectedFiles] = useState<SelectedFileItem[]>([]);
  const [isUploadingBatch, setIsUploadingBatch] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string>('');

  // Initialize camera stream only when mode is camera
  const startCamera = useCallback(async () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCameraPermission(false);
        return;
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(newStream);
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch {
      setHasCameraPermission(false);
    }
  }, [facingMode, stream]);

  useEffect(() => {
    if (mode === 'camera') {
      startCamera();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode, mode, startCamera]);

  // Clean up object URLs when unmounting or clearing
  useEffect(() => {
    return () => {
      selectedFiles.forEach((item) => URL.revokeObjectURL(item.preview));
    };
  }, [selectedFiles]);

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const dataURItoBlob = (dataURI: string): Blob => {
    const splitIndex = dataURI.indexOf(',');
    const byteString = atob(dataURI.slice(splitIndex + 1));
    const mimeString = dataURI.slice(0, splitIndex).split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  };

  // 1. LIVE CAMERA CAPTURE (With Verified Watermark & QR)
  const processCameraCapture = async (imageSrc: string) => {
    setIsCapturing(true);

    try {
      let gpsCoords: { lat: number; lng: number; accuracy: number; locationName?: string } | undefined;
      try {
        if (navigator.geolocation) {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 4000,
              enableHighAccuracy: true,
            });
          });
          gpsCoords = {
            lat: Number(position.coords.latitude.toFixed(6)),
            lng: Number(position.coords.longitude.toFixed(6)),
            accuracy: Math.round(position.coords.accuracy),
            locationName: 'Sangam Venue',
          };
        }
      } catch {
        gpsCoords = undefined;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageSrc;
      });

      const photoId = generatePhotoId();
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://sangamconnect.org';
      const verificationUrl = `${origin}/photos/${photoId}`;

      // Stamp verification watermark canvas
      const brandedDataUrl = await createBrandedImageCanvas(img, {
        photoId,
        eventName: 'SANGAM 2027',
        userName: user?.fullName || 'Participant',
        teamName: user?.teamName || 'Unassigned',
        mentorName: user?.mentorName || undefined,
        timestamp: formatDateTime(new Date().toISOString()),
        locationName: gpsCoords?.locationName,
        verificationUrl,
      });

      const originalBlob = dataURItoBlob(imageSrc);
      const brandedBlob = dataURItoBlob(brandedDataUrl);

      const metadataPayload = {
        id: photoId,
        eventId: 'sangam-2027',
        captureType: 'camera',
        uploadedBy: {
          userId: user?.id || 'guest',
          name: user?.fullName || 'Participant',
          role: user?.role || 'student',
          teamId: user?.teamId,
          teamName: user?.teamName,
          mentorName: user?.mentorName,
        },
        verificationCode: `VERIFY_${photoId}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        gps: gpsCoords,
        dimensions: { width: img.width, height: img.height },
        capturedAt: new Date().toISOString(),
        tags: ['sangam2027', user?.teamName || 'general', 'camera'],
      };

      const formData = new FormData();
      formData.append('original', originalBlob, `${photoId}_orig.jpg`);
      formData.append('branded', brandedBlob, `${photoId}_branded.jpg`);
      formData.append('metadata', JSON.stringify(metadataPayload));

      const uploadRes = await fetch('/api/photos/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const errJson = await uploadRes.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to upload camera photo.');
      }

      const resData = await uploadRes.json();
      const savedPhoto: Photo = resData.photo;

      setLastUploadedPhoto(savedPhoto);
      showToast('Verified Photo Saved!', `Camera snap #${photoId}`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Capture Error', err.message || 'Could not process photo.', 'error');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleShutter = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    processCameraCapture(dataUrl);
  };

  // 2. WHATSAPP-STYLE MULTI-PHOTO BATCH UPLOAD (No Watermark Tag Delay)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: SelectedFileItem[] = Array.from(files).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      file,
      preview: URL.createObjectURL(file),
    }));

    setSelectedFiles((prev) => [...prev, ...newItems]);
    // Reset file input so same files can be re-selected if desired
    e.target.value = '';
  };

  const removeSelectedFile = (idToRemove: string) => {
    setSelectedFiles((prev) => {
      const item = prev.find((i) => i.id === idToRemove);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((i) => i.id !== idToRemove);
    });
  };

  const clearAllSelectedFiles = () => {
    selectedFiles.forEach((item) => URL.revokeObjectURL(item.preview));
    setSelectedFiles([]);
  };

  const uploadBatchFiles = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploadingBatch(true);
    setUploadProgressText(`Uploading ${selectedFiles.length} photos...`);

    try {
      const formData = new FormData();

      selectedFiles.forEach((item) => {
        formData.append('files', item.file);
      });

      formData.append(
        'metadata',
        JSON.stringify({
          eventId: 'sangam-2027',
          captureType: 'upload',
          uploadedBy: {
            userId: user?.id || 'guest',
            name: user?.fullName || 'Participant',
            role: user?.role || 'student',
            teamId: user?.teamId,
            teamName: user?.teamName,
            mentorName: user?.mentorName,
          },
          tags: ['sangam2027', user?.teamName || 'general', 'upload'],
        })
      );

      const res = await fetch('/api/photos/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to upload photos.');
      }

      const data = await res.json();
      const count = data.count || selectedFiles.length;

      showToast(
        `${count} Photos Shared!`,
        'Uploaded directly to Sangam Gallery without delay.',
        'success'
      );

      clearAllSelectedFiles();
      router.push(redirectPathAfterUpload);
    } catch (err: any) {
      console.error(err);
      showToast('Upload Error', err.message || 'Failed to upload photos.', 'error');
    } finally {
      setIsUploadingBatch(false);
      setUploadProgressText('');
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto space-y-4">
      {/* Hidden Multi-File Input for WhatsApp-Style Upload (Supports 10+ photos) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* WHATSAPP-STYLE PHOTO PREVIEW & BATCH TRAY (When files are chosen) */}
      {selectedFiles.length > 0 && mode === 'options' && (
        <div className="w-full space-y-3 bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-sm font-bold text-neutral-900">
                {selectedFiles.length} {selectedFiles.length === 1 ? 'Photo' : 'Photos'} Selected
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold text-neutral-700 hover:text-black flex items-center gap-1 px-2 py-1 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add More</span>
              </button>
              <button
                type="button"
                onClick={clearAllSelectedFiles}
                className="text-xs text-neutral-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                title="Clear all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Thumbnails Grid (WhatsApp style) */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto p-1 no-scrollbar">
            {selectedFiles.map((item, index) => (
              <div
                key={item.id}
                className="relative aspect-square rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200 group shadow-2xs"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.preview}
                  alt={`Selected photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] font-mono px-1.5 py-0.5 rounded-md">
                  #{index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeSelectedFile(item.id)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 hover:bg-rose-600 text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Remove photo"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Action Button: Send / Upload All */}
          <div className="pt-2 space-y-1.5">
            <Button
              type="button"
              size="lg"
              className="w-full py-3.5 bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold gap-2 shadow-xs cursor-pointer"
              onClick={uploadBatchFiles}
              isLoading={isUploadingBatch}
            >
              <Send className="w-4 h-4" />
              <span>
                {isUploadingBatch
                  ? uploadProgressText
                  : `Upload All (${selectedFiles.length} Photos)`}
              </span>
            </Button>
            <p className="text-[11px] text-center text-neutral-400">
              Instant upload without watermark delay • Visible to mentors, judges & admins
            </p>
          </div>
        </div>
      )}

      {/* MODE 1: TWO CLEAR OPTIONS (Initial / Idle State when no files selected) */}
      {mode === 'options' && selectedFiles.length === 0 && (
        <div className="w-full space-y-4 pt-2">
          <div className="text-center pb-1">
            <h2 className="text-sm font-bold text-neutral-900">Select Photo Mode</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Snap with live camera verification or upload fast WhatsApp-style photos.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Option A: Open Camera */}
            <button
              type="button"
              onClick={() => setMode('camera')}
              className="p-5 rounded-2xl border-2 border-neutral-200 hover:border-neutral-900 bg-white hover:bg-neutral-50 transition-all text-left flex flex-col justify-between group cursor-pointer shadow-xs"
            >
              <div className="w-12 h-12 rounded-xl bg-neutral-100 group-hover:bg-neutral-900 group-hover:text-white text-neutral-800 flex items-center justify-center transition-colors mb-3">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-neutral-900">Open Camera</h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Live snapshot with verified Sangam watermark & scannable QR proof.
                </p>
              </div>
            </button>

            {/* Option B: Upload Photos (Fast WhatsApp Style) */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-5 rounded-2xl border-2 border-neutral-200 hover:border-neutral-900 bg-white hover:bg-neutral-50 transition-all text-left flex flex-col justify-between group cursor-pointer shadow-xs"
            >
              <div className="w-12 h-12 rounded-xl bg-neutral-100 group-hover:bg-neutral-900 group-hover:text-white text-neutral-800 flex items-center justify-center transition-colors mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm text-neutral-900">Upload Photos</h3>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full">
                    10+ at once
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Fast WhatsApp-style batch upload. No watermark delay, instant sharing.
                </p>
              </div>
            </button>
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => router.push(redirectPathAfterUpload)}
              className="text-xs text-neutral-500 hover:text-neutral-900 inline-flex items-center gap-1.5 cursor-pointer py-1 px-2 rounded-md hover:bg-neutral-100 transition-colors"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Browse Sangam Gallery</span>
            </button>
          </div>
        </div>
      )}

      {/* MODE 2: CLEAN LIVE CAMERA (When Camera Option is Selected) */}
      {mode === 'camera' && (
        <>
          {/* Viewfinder Container */}
          <div className="relative w-full aspect-3/4 bg-black rounded-2xl overflow-hidden shadow-xl border border-neutral-800 flex items-center justify-center">
            {hasCameraPermission === false ? (
              /* Fallback when webcam is unavailable */
              <div className="p-6 text-center space-y-4 text-white">
                <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Webcam Not Available</p>
                  <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
                    Camera access was not granted. You can select photos directly from your device.
                  </p>
                </div>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white text-black hover:bg-neutral-200 text-xs"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  <span>Select / Upload Photos</span>
                </Button>
              </div>
            ) : (
              /* Normal Live Camera View — NO LIVE tags or overlays */
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Back to Options button */}
                <button
                  onClick={() => {
                    if (stream) stream.getTracks().forEach((track) => track.stop());
                    setStream(null);
                    setMode('options');
                  }}
                  className="absolute top-4 left-4 bg-black/60 hover:bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full text-xs text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Back to options"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              </>
            )}
          </div>

          {/* Camera Controls Bar */}
          <div className="w-full flex items-center justify-between px-6 py-2">
            {/* Gallery shortcut */}
            <button
              onClick={() => router.push(redirectPathAfterUpload)}
              title="Open Gallery"
              className="w-12 h-12 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-700 transition-colors cursor-pointer"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            {/* Large Normal Shutter Button */}
            <button
              onClick={hasCameraPermission ? handleShutter : () => fileInputRef.current?.click()}
              disabled={isCapturing}
              title="Take Verified Photo"
              className="w-18 h-18 rounded-full border-4 border-black p-1 flex items-center justify-center transition-transform active:scale-90 cursor-pointer disabled:opacity-50"
            >
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-white">
                {isCapturing ? (
                  <RefreshCw className="w-6 h-6 animate-spin text-white" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-white/20" />
                )}
              </div>
            </button>

            {/* Switch lens or File upload fallback */}
            <button
              onClick={hasCameraPermission ? toggleFacingMode : () => fileInputRef.current?.click()}
              title="Switch Camera / Upload"
              className="w-12 h-12 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-700 transition-colors cursor-pointer"
            >
              {hasCameraPermission ? <RefreshCw className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
            </button>
          </div>
        </>
      )}

      {/* Captured Photo Success Pop-up Card */}
      {lastUploadedPhoto && (
        <Card className="w-full p-4 bg-neutral-900 text-white border-neutral-800 space-y-3 mt-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold">
                Photo Stamped with QR & Metadata
              </span>
            </div>
            <span className="text-[10px] font-mono text-neutral-400">
              {lastUploadedPhoto.id}
            </span>
          </div>

          <div className="flex gap-3 items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lastUploadedPhoto.brandedUrl || lastUploadedPhoto.originalUrl}
              alt="Preview"
              className="w-16 h-20 object-cover rounded-lg border border-neutral-700 shrink-0"
            />
            <div className="text-xs text-neutral-300 space-y-1 flex-1">
              <p className="font-semibold text-white">
                {lastUploadedPhoto.uploadedBy.teamName}
              </p>
              <p className="text-[11px] text-neutral-400">
                {lastUploadedPhoto.uploadedBy.name} • {formatDateTime(lastUploadedPhoto.capturedAt)}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                <QrCode className="w-3 h-3" />
                <span>Scannable verification QR embedded</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 bg-neutral-800 text-white border-neutral-700 hover:bg-neutral-700 text-xs"
              onClick={() => router.push(`/photos/${lastUploadedPhoto.id}`)}
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1" />
              <span>Verify Card</span>
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-white text-black hover:bg-neutral-200 text-xs"
              onClick={() => router.push(redirectPathAfterUpload)}
            >
              <span>View Gallery</span>
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
