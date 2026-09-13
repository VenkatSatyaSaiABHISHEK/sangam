'use client';

import React, { useEffect } from 'react';
import { RefreshCw, Home, ShieldAlert } from 'lucide-react';

export default function GlobalRootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[SummitConnect Root Auto-Recovery]:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 font-sans antialiased text-neutral-900">
        <div className="max-w-md w-full p-8 text-center space-y-5 bg-white border border-neutral-200 rounded-2xl shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-neutral-950 tracking-tight">
              Sangam System Shield Active
            </h2>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
              An unexpected issue was intercepted and isolated. You can reload to restore normal operation.
            </p>
          </div>

          <div className="flex gap-2.5 pt-2 justify-center">
            <button
              onClick={() => reset()}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-white cursor-pointer inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restore Session</span>
            </button>

            <button
              onClick={() => {
                window.location.href = '/';
              }}
              className="px-4 py-2 rounded-lg text-xs font-semibold border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 cursor-pointer inline-flex items-center gap-1.5"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Go Home</span>
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
