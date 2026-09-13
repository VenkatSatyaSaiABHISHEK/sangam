'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { Settings, Save, RefreshCcw, Shield } from 'lucide-react';

export default function AdminSettingsPage() {
  const { showToast } = useToast();
  const [eventName, setEventName] = useState('Sangam 2027');
  const [venue, setVenue] = useState('Grand Tech Convention Pavilion & Innovation Hub');
  const [allowCamera, setAllowCamera] = useState(true);
  const [requireGps, setRequireGps] = useState(false);
  const [publicGallery, setPublicGallery] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Settings Saved', 'Event parameters updated successfully.', 'success');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-950">
          Sangam & Platform Settings
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Configure event branding, security parameters, and permission policies.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-semibold text-neutral-900 tracking-tight">
            Event Branding & Venue
          </h2>

          <div className="space-y-3">
            <Input
              label="Event Name"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
            />
            <Input
              label="Venue Location"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
            />
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-semibold text-neutral-900 tracking-tight">
            Permissions & Policies
          </h2>

          <div className="space-y-3 text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allowCamera}
                onChange={(e) => setAllowCamera(e.target.checked)}
                className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
              <span className="font-medium text-neutral-800">
                Allow participants to capture and upload photos
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={requireGps}
                onChange={(e) => setRequireGps(e.target.checked)}
                className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
              <span className="font-medium text-neutral-800">
                Prompt for GPS verification metadata on photo shutter
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={publicGallery}
                onChange={(e) => setPublicGallery(e.target.checked)}
                className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
              <span className="font-medium text-neutral-800">
                Enable shared summit photo gallery for participants
              </span>
            </label>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" className="gap-2">
            <Save className="w-3.5 h-3.5" />
            <span>Save Configuration</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
