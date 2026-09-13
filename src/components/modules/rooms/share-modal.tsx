'use client';

import React from 'react';
import { Room } from '@/types';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { Copy, Share2, ExternalLink } from 'lucide-react';

interface ShareModalProps {
  room: Room | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareModal({ room, isOpen, onClose }: ShareModalProps) {
  const { showToast } = useToast();

  if (!room) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://sangamconnect.org';
  const shareUrl = `${origin}/rooms/${room.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    showToast('Link Copied', 'Direct room URL copied to clipboard.', 'success');
  };

  const handleWhatsApp = () => {
    const text = `SangamConnect Alert: Please fill out "${room.title}": ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Dynamic Room"
      description={`Share "${room.title}" directly with participants.`}
    >
      <div className="space-y-4 pt-2">
        <div className="p-3.5 rounded-lg bg-neutral-50 border border-neutral-200 space-y-1.5">
          <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block">
            Shareable URL
          </span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 text-xs font-mono bg-white p-2 rounded-md border border-neutral-300 text-neutral-800 select-all"
            />
            <Button size="sm" variant="outline" onClick={handleCopy}>
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Button
            onClick={handleWhatsApp}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
          >
            <Share2 className="w-4 h-4 mr-2" />
            <span>Send to WhatsApp Group or Contact</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => window.open(`/rooms/${room.id}`, '_blank')}
            className="w-full"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            <span>Open Room Preview</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
