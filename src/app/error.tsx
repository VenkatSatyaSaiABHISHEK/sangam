'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, Home, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected errors for inspection
    console.error('[SummitConnect Auto-Recovery Handler]:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-5 bg-white border-neutral-200 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-neutral-950 tracking-tight">
            System Auto-Recovery Active
          </h2>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
            An unexpected error occurred while loading this view. The system caught it safely so your data remains protected.
          </p>
          {error?.message && (
            <div className="mt-2 p-2.5 bg-neutral-50 rounded-lg border border-neutral-200 text-[11px] font-mono text-neutral-600 text-left truncate">
              {error.message}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
          <Button
            onClick={() => reset()}
            className="flex-1 gap-1.5 text-xs bg-neutral-900 hover:bg-neutral-800 text-white cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="flex-1 gap-1.5 text-xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Page</span>
          </Button>
        </div>

        <div className="pt-2 border-t border-neutral-100">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-950 font-medium transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return to Sangam Command Portal</span>
          </Link>
        </div>
      </Card>
    </div>
  );
}
