'use client';

import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Download,
  CheckCircle2,
  Share2,
  X,
  Bell,
  Wifi,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InstallAppModal({ isOpen, onClose }: InstallAppModalProps) {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already running in standalone PWA mode
    if (typeof window !== 'undefined') {
      const isPwa =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isPwa);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallPwa = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setInstallPrompt(null);
    } else {
      // Manual instructions for Android & iOS
      alert(
        'To install on your device:\n\n' +
        '• Android (Chrome/Edge): Tap the 3 dots menu (⋮) -> Tap "Install app" or "Add to Home screen"\n\n' +
        '• iPhone (Safari): Tap the Share button -> Tap "Add to Home Screen"'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-md p-6 bg-white rounded-2xl shadow-2xl border border-neutral-200 space-y-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-neutral-950 text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
            S
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold tracking-tight text-neutral-950">
                Download SangamConnect
              </h3>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">
                Official App
              </Badge>
            </div>
            <p className="text-xs text-neutral-500">
              Install to your mobile device for instant push alerts &amp; offline support.
            </p>
          </div>
        </div>

        {/* Key Features Pill */}
        <div className="grid grid-cols-3 gap-2 py-1">
          <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/80 text-center space-y-1">
            <Bell className="w-4 h-4 mx-auto text-neutral-800" />
            <span className="block text-[11px] font-semibold text-neutral-900">Push Alerts</span>
            <span className="block text-[9px] text-neutral-500">Announcements</span>
          </div>

          <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/80 text-center space-y-1">
            <Smartphone className="w-4 h-4 mx-auto text-neutral-800" />
            <span className="block text-[11px] font-semibold text-neutral-900">Full Screen</span>
            <span className="block text-[9px] text-neutral-500">Native Feel</span>
          </div>

          <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/80 text-center space-y-1">
            <Wifi className="w-4 h-4 mx-auto text-neutral-800" />
            <span className="block text-[11px] font-semibold text-neutral-900">Offline Fast</span>
            <span className="block text-[9px] text-neutral-500">Auto Caching</span>
          </div>
        </div>

        {/* Install / Download Options */}
        <div className="space-y-3">
          {/* Option 1: One-Click Install to Phone */}
          <div className="p-4 rounded-xl border-2 border-neutral-950 bg-neutral-950 text-white space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                Recommended for Android &amp; iOS
              </span>
              <span className="px-2 py-0.5 rounded bg-white/20 text-[10px] font-semibold">
                Instant • 0 MB Storage
              </span>
            </div>
            <p className="text-xs text-neutral-300">
              Adds SangamConnect directly to your phone&apos;s home screen. Launches full-screen like any Play Store app with push alerts.
            </p>
            <Button
              onClick={handleInstallPwa}
              className="w-full bg-white text-neutral-950 hover:bg-neutral-100 font-bold text-xs py-2.5"
            >
              <Smartphone className="w-4 h-4 mr-2" />
              <span>{isStandalone ? 'Already Running as App ✓' : 'Install to Home Screen'}</span>
            </Button>
          </div>

          {/* Option 2: Direct APK Download */}
          <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-900">
                Download Standalone Android APK
              </span>
              <span className="text-[11px] font-mono text-neutral-500">v1.0.0</span>
            </div>
            <p className="text-[11px] text-neutral-600">
              Download the raw installer package for sideloading on Android devices.
            </p>
            <a
              href="/api/download/apk"
              download="sangamconnect.apk"
              className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-100 text-xs font-semibold text-neutral-900 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download sangamconnect.apk</span>
            </a>
          </div>
        </div>

        {/* Security / Verification Badge */}
        <div className="flex items-center gap-2 text-[11px] text-neutral-500 justify-center">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>SangamConnect Verified PWA • End-to-End Secure</span>
        </div>
      </div>
    </div>
  );
}
