'use client';

import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Download,
  CheckCircle2,
  X,
  Bell,
  Wifi,
  ShieldCheck,
  HelpCircle,
  ArrowRight,
  Info,
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
  const [showGuide, setShowGuide] = useState(false);
  const [apkNotice, setApkNotice] = useState<string | null>(null);
  const [isCheckingApk, setIsCheckingApk] = useState(false);

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
      // Reveal visual step-by-step installation guide
      setShowGuide(true);
    }
  };

  const handleApkDownloadClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsCheckingApk(true);
    setApkNotice(null);

    try {
      const res = await fetch('/api/download/apk', { method: 'HEAD' });
      if (res.ok) {
        // Real APK is available on server -> proceed with real download
        window.location.href = '/api/download/apk';
      } else {
        setApkNotice(
          'Direct WebAPK is the recommended installation method! Tap "Install to Home Screen" above to instantly add SangamConnect with our new glowing icon, push notifications, and 0 MB storage.'
        );
      }
    } catch {
      setApkNotice(
        'Tap "Install to Home Screen" above to add SangamConnect directly to your mobile device.'
      );
    } finally {
      setIsCheckingApk(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-md p-6 bg-white rounded-2xl shadow-2xl border border-neutral-200 space-y-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with Glowing Sangam Icon */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-md shrink-0 bg-neutral-950 border border-neutral-200">
            <img
              src="/icons/icon-192.png"
              alt="SangamConnect Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold tracking-tight text-neutral-950">
                Install SangamConnect
              </h3>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">
                Official App
              </Badge>
            </div>
            <p className="text-xs text-neutral-500">
              Install to your mobile device for official app icon, instant push alerts &amp; offline access.
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
            <span className="block text-[9px] text-neutral-500">Instant Load</span>
          </div>
        </div>

        {/* Install / Download Options */}
        <div className="space-y-3">
          {/* Option 1: One-Click Install to Phone */}
          <div className="p-4 rounded-xl border-2 border-neutral-950 bg-neutral-950 text-white space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                Recommended for Android &amp; iOS
              </span>
              <span className="px-2 py-0.5 rounded bg-white/20 text-[10px] font-semibold">
                Instant • 0 MB
              </span>
            </div>
            <p className="text-xs text-neutral-300">
              Installs SangamConnect with our official glowing icon directly to your home screen &amp; app drawer.
            </p>
            <Button
              onClick={handleInstallPwa}
              className="w-full bg-white text-neutral-950 hover:bg-neutral-100 font-bold text-xs py-2.5 cursor-pointer"
            >
              <Smartphone className="w-4 h-4 mr-2" />
              <span>{isStandalone ? 'Already Running as App ✓' : 'Install to Home Screen'}</span>
            </Button>
          </div>

          {/* Visual Step-by-Step Guide if manual installation needed */}
          {showGuide && (
            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-xs space-y-2.5 animate-in fade-in">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <Info className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Quick 2-Step Installation:</span>
              </div>
              <div className="space-y-2 text-amber-950 text-[11px]">
                <div className="p-2 rounded-lg bg-white/80 border border-amber-200/60">
                  <p className="font-bold text-neutral-900">📱 Android (Chrome / Edge / Brave):</p>
                  <p className="text-neutral-600 mt-0.5">
                    Tap the <strong>three dots menu (⋮)</strong> at top-right &rarr; select <strong>&ldquo;Install app&rdquo;</strong> or <strong>&ldquo;Add to Home screen&rdquo;</strong>.
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-white/80 border border-amber-200/60">
                  <p className="font-bold text-neutral-900">🍎 iPhone / iPad (Safari):</p>
                  <p className="text-neutral-600 mt-0.5">
                    Tap the <strong>Share icon (⎋)</strong> at the bottom &rarr; tap <strong>&ldquo;Add to Home Screen&rdquo;</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Option 2: Standalone APK Check */}
          <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-900">
                Standalone Android APK
              </span>
              <span className="text-[10px] font-mono text-neutral-500">v1.0.0</span>
            </div>
            <p className="text-[11px] text-neutral-600">
              Download raw package or install official WebAPK directly without sideloading.
            </p>

            {apkNotice ? (
              <div className="p-2.5 rounded-lg bg-white border border-neutral-200 text-[11px] text-neutral-700 space-y-1.5 animate-in fade-in">
                <p className="leading-relaxed">{apkNotice}</p>
                <button
                  onClick={handleInstallPwa}
                  className="font-bold text-xs text-neutral-950 underline cursor-pointer inline-flex items-center gap-1"
                >
                  <span>Install to Home Screen</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleApkDownloadClick}
                disabled={isCheckingApk}
                className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-100 text-xs font-semibold text-neutral-900 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isCheckingApk ? 'Checking Package...' : 'Download sangamconnect.apk'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Security / Verification Badge */}
        <div className="flex items-center gap-2 text-[11px] text-neutral-500 justify-center">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>SangamConnect Verified App • End-to-End Secure</span>
        </div>
      </div>
    </div>
  );
}
