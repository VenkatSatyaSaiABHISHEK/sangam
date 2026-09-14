'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/db';
import { Photo } from '@/types';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { formatDateTime, isPhotoUploadedByUser, saveLocalUploadedPhotoId } from '@/lib/utils';
import {
  MapPin,
  ExternalLink,
  ShieldCheck,
  Camera,
  Upload,
  Trophy,
  X,
  Plus,
  Send,
  Trash2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface GalleryGridProps {
  initialPhotos?: Photo[];
  teamIdFilter?: string;
}

interface SelectedFileItem {
  id: string;
  file: File;
  preview: string;
}

export function GalleryGrid({ initialPhotos, teamIdFilter }: GalleryGridProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // In-gallery fast WhatsApp-style multi-photo batch upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFileItem[]>([]);
  const [isUploadingBatch, setIsUploadingBatch] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  useEffect(() => {
    if (initialPhotos) {
      setPhotos(initialPhotos);
    } else {
      // Fetch latest photos from API / local db
      fetch('/api/data')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.photos) {
            setPhotos(data.photos);
          } else {
            setPhotos(db.getPhotos());
          }
        })
        .catch(() => {
          setPhotos(db.getPhotos());
        });
    }
  }, [initialPhotos]);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      selectedFiles.forEach((item) => URL.revokeObjectURL(item.preview));
    };
  }, [selectedFiles]);

  // Compute personal uploads & team contributor counts ("who's more photos share the count")
  const myPhotos = photos.filter((p) => isPhotoUploadedByUser(p, user));

  const teamCountsMap = new Map<string, { count: number; teamId?: string }>();
  photos.forEach((p) => {
    const key = p.uploadedBy.teamName || 'General';
    const existing = teamCountsMap.get(key) || { count: 0, teamId: p.uploadedBy.teamId };
    existing.count += 1;
    teamCountsMap.set(key, existing);
  });

  const teamLeaderboard: { teamName: string; count: number; teamId?: string }[] = [];
  teamCountsMap.forEach((val, key) => {
    teamLeaderboard.push({ teamName: key, count: val.count, teamId: val.teamId });
  });
  teamLeaderboard.sort((a, b) => b.count - a.count);

  const filteredPhotos = photos.filter((p) => {
    if (teamIdFilter) return p.uploadedBy.teamId === teamIdFilter;
    if (activeFilter === 'all') return true;
    if (activeFilter === 'my') {
      return isPhotoUploadedByUser(p, user);
    }
    return p.uploadedBy.teamId === activeFilter;
  });

  // Unique team filters from photos
  const availableTeams = Array.from(
    new Set(
      photos
        .map((p) => p.uploadedBy.teamName)
        .filter((name): name is string => Boolean(name && name.trim()))
    )
  ).slice(0, 8);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: SelectedFileItem[] = Array.from(files).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      file,
      preview: URL.createObjectURL(file),
    }));

    setSelectedFiles((prev) => [...prev, ...newItems]);
    setUploadModalOpen(true);
    e.target.value = '';
  };

  const removeSelectedFile = (idToRemove: string) => {
    setSelectedFiles((prev) => {
      const item = prev.find((i) => i.id === idToRemove);
      if (item) URL.revokeObjectURL(item.preview);
      const updated = prev.filter((i) => i.id !== idToRemove);
      if (updated.length === 0) setUploadModalOpen(false);
      return updated;
    });
  };

  const clearAllSelectedFiles = () => {
    selectedFiles.forEach((item) => URL.revokeObjectURL(item.preview));
    setSelectedFiles([]);
    setUploadModalOpen(false);
  };

  const uploadBatchFiles = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploadingBatch(true);

    try {
      const formData = new FormData();
      selectedFiles.forEach((item) => {
        formData.append('files', item.file);
      });

      formData.append(
        'metadata',
        JSON.stringify({
          eventId: 'summit-2027',
          captureType: 'upload',
          uploadedBy: {
            userId: user?.id || 'guest',
            name: user?.fullName || 'Participant',
            email: user?.email || '',
            role: user?.role || 'student',
            teamId: user?.teamId,
            teamName: user?.teamName,
            mentorName: user?.mentorName,
          },
          tags: ['summit2027', user?.teamName || 'general', 'upload'],
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
      const newlyUploaded: Photo[] = data.photos || [];

      if (newlyUploaded.length > 0) {
        newlyUploaded.forEach((np) => {
          if (np.id) saveLocalUploadedPhotoId(np.id);
        });
        setPhotos((prev) => [...newlyUploaded, ...prev]);
      }

      showToast(
        `${newlyUploaded.length || selectedFiles.length} Photos Shared!`,
        'Uploaded directly to Sangam Gallery without delay.',
        'success'
      );

      clearAllSelectedFiles();
    } catch (err: any) {
      console.error(err);
      showToast('Upload Error', err.message || 'Failed to upload photos.', 'error');
    } finally {
      setIsUploadingBatch(false);
    }
  };

  const cameraPath =
    user?.role === 'mentor'
      ? '/mentor/camera'
      : user?.role === 'teacher'
      ? '/teacher/dashboard'
      : user?.role === 'admin'
      ? '/student/camera'
      : '/student/camera';

  return (
    <div className="space-y-4">
      {/* Hidden file input for 10+ multi-photo batch upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Top Banner: Stats Bar, Upload CTA & Live Camera Action */}
      <div className="p-3.5 bg-neutral-900 text-white rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-xs tracking-tight text-white">
              Event Media Stream
            </span>
            <span className="bg-neutral-800 text-neutral-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-neutral-700">
              {photos.length} Total Photos
            </span>
            {user && (
              <span className="bg-emerald-950 text-emerald-300 border border-emerald-800/60 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>You shared {myPhotos.length} {myPhotos.length === 1 ? 'photo' : 'photos'}</span>
              </span>
            )}
          </div>
          <p className="text-[11px] text-neutral-400">
            Upload unbranded photos directly like WhatsApp, or snap with verified camera.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Contributor Leaderboard Button */}
          <button
            type="button"
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              showLeaderboard
                ? 'bg-neutral-800 text-amber-300 border-neutral-700'
                : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:bg-neutral-800'
            }`}
            title="View who shared more photos"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xs:inline">Top Shares</span>
          </button>

          {/* Direct Multi-Upload Button */}
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="bg-white text-black hover:bg-neutral-200 text-xs font-bold gap-1.5 cursor-pointer shadow-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Photos</span>
          </Button>
        </div>
      </div>

      {/* Contributor Stats / Who Shared More Photos Tray */}
      {showLeaderboard && (
        <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-amber-950 font-bold text-xs">
              <Trophy className="w-4 h-4 text-amber-600" />
              <span>Team & Contributor Photo Counts</span>
            </div>
            <span className="text-[10px] text-amber-800 font-mono">
              Live Share Ranking
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {teamLeaderboard.map((item, index) => (
              <div
                key={item.teamName}
                className="p-2 bg-white rounded-xl border border-amber-200/80 flex items-center justify-between shadow-2xs"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>
                  <span className="font-semibold text-neutral-800 truncate text-[11px]">
                    {item.teamName}
                  </span>
                </div>
                <Badge variant="neutral" size="sm" className="font-mono text-[10px] shrink-0 ml-1">
                  {item.count} {item.count === 1 ? 'photo' : 'photos'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Row */}
      {!teamIdFilter && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-neutral-950 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            All Photos ({photos.length})
          </button>

          {user && (
            <button
              type="button"
              onClick={() => setActiveFilter('my')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0 cursor-pointer flex items-center gap-1 ${
                activeFilter === 'my'
                  ? 'bg-emerald-950 text-white'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <span>My Uploads</span>
              <span className="text-[10px] font-mono px-1 rounded-full bg-black/10">
                {myPhotos.length}
              </span>
            </button>
          )}

          {availableTeams.map((tName) => {
            const teamPhotos = photos.filter((p) => p.uploadedBy.teamName === tName);
            const teamId = teamPhotos[0]?.uploadedBy.teamId || tName;
            return (
              <button
                key={tName}
                type="button"
                onClick={() => setActiveFilter(teamId)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
                  activeFilter === teamId
                    ? 'bg-neutral-950 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {tName} ({teamPhotos.length})
              </button>
            );
          })}
        </div>
      )}

      {/* Grid */}
      {filteredPhotos.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-neutral-200 rounded-2xl space-y-3 bg-neutral-50/50">
          <p className="text-xs text-neutral-400">No photos in this category yet.</p>
          <div className="flex items-center justify-center gap-2">
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs bg-neutral-900 text-white hover:bg-neutral-800"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              <span>Upload Photos</span>
            </Button>
            <Link href={cameraPath}>
              <Button size="sm" variant="outline" className="text-xs">
                Open Camera
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filteredPhotos.map((photo) => {
            const isCameraSnap = photo.captureType === 'camera' || photo.hasWatermark === true;
            return (
              <div
                key={photo.id}
                onClick={() => {
                  setSelectedPhoto(photo);
                  setShowOriginal(false);
                }}
                className="group relative aspect-square rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200 hover:border-neutral-400 cursor-pointer transition-all shadow-2xs"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.brandedUrl || photo.originalUrl}
                  alt={photo.id}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Hover Details Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end text-white text-[11px]">
                  <p className="font-semibold truncate">{photo.uploadedBy.name}</p>
                  <p className="text-[10px] text-neutral-300 truncate">
                    {photo.uploadedBy.teamName || 'Sangam Participant'}
                  </p>
                  <span className="text-[9px] font-mono text-neutral-400 mt-0.5">
                    {photo.id}
                  </span>
                </div>

                {/* Only Live Camera captures receive the verified badge */}
                {isCameraSnap && (
                  <div className="absolute top-2 right-2">
                    <span
                      className="w-6 h-6 rounded-full bg-black/70 backdrop-blur-xs text-white flex items-center justify-center shadow-xs"
                      title="Verified Camera Snap with QR"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* WhatsApp-Style Multi-Upload Modal (when files are selected directly from gallery) */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={clearAllSelectedFiles}
        title={`Upload ${selectedFiles.length} ${selectedFiles.length === 1 ? 'Photo' : 'Photos'}`}
        maxWidth="lg"
      >
        <div className="space-y-4 pt-1">
          <div className="flex items-center justify-between">
            <p className="text-xs text-neutral-500">
              WhatsApp-style fast upload. No watermark processing delay.
            </p>
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

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto p-1 no-scrollbar">
            {selectedFiles.map((item, index) => (
              <div
                key={item.id}
                className="relative aspect-square rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200 group shadow-2xs"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.preview}
                  alt={`Selected ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] font-mono px-1.5 py-0.5 rounded-md">
                  #{index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeSelectedFile(item.id)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 hover:bg-rose-600 text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <Button
              type="button"
              size="lg"
              className="w-full py-3 bg-neutral-950 text-white hover:bg-neutral-800 text-xs font-bold gap-2 cursor-pointer"
              onClick={uploadBatchFiles}
              isLoading={isUploadingBatch}
            >
              <Send className="w-4 h-4" />
              <span>
                {isUploadingBatch
                  ? `Uploading ${selectedFiles.length} photos...`
                  : `Upload All (${selectedFiles.length} Photos)`}
              </span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <Modal
          isOpen={Boolean(selectedPhoto)}
          onClose={() => setSelectedPhoto(null)}
          title={`Photo: ${selectedPhoto.id}`}
          maxWidth="xl"
        >
          <div className="space-y-4 pt-2">
            {/* Image Preview */}
            <div className="relative rounded-2xl overflow-hidden border border-neutral-200 bg-black flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={showOriginal ? selectedPhoto.originalUrl : selectedPhoto.brandedUrl || selectedPhoto.originalUrl}
                alt={selectedPhoto.id}
                className="max-h-[60vh] w-auto object-contain mx-auto"
              />

              {/* Only photos with branded watermarks have the toggle */}
              {selectedPhoto.hasWatermark && (
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="text-xs bg-white/90 backdrop-blur-xs border-white/50 text-black hover:bg-white"
                    onClick={() => setShowOriginal(!showOriginal)}
                  >
                    {showOriginal ? 'View Verified Watermark' : 'View Original Photo'}
                  </Button>
                </div>
              )}
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs">
              <div>
                <p className="text-[10px] font-semibold text-neutral-400 uppercase">
                  Captured By
                </p>
                <p className="font-semibold text-neutral-900 mt-0.5">
                  {selectedPhoto.uploadedBy.name}
                </p>
                <p className="text-[10px] text-neutral-500 capitalize">
                  {selectedPhoto.uploadedBy.role}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-semibold text-neutral-400 uppercase">
                  Assigned Team
                </p>
                <p className="font-semibold text-neutral-900 mt-0.5">
                  {selectedPhoto.uploadedBy.teamName || 'General'}
                </p>
                <p className="text-[10px] text-neutral-500">
                  Mentor: {selectedPhoto.uploadedBy.mentorName || 'Unassigned'}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-semibold text-neutral-400 uppercase">
                  Timestamp
                </p>
                <p className="font-semibold text-neutral-900 mt-0.5">
                  {formatDateTime(selectedPhoto.capturedAt)}
                </p>
              </div>

              <div className="col-span-2 sm:col-span-3 pt-2 border-t border-neutral-200/80 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-neutral-600">
                  <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{selectedPhoto.gps?.locationName || 'Sangam Venue'}</span>
                </div>

                {selectedPhoto.hasWatermark && (
                  <Link href={`/photos/${selectedPhoto.id}`} target="_blank">
                    <Button size="sm" variant="outline" className="text-xs gap-1">
                      <ExternalLink className="w-3 h-3" />
                      <span>Public Verification</span>
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
