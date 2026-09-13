'use client';

import React from 'react';

export type AdminTab = 'teams' | 'students' | 'mentors' | 'teachers';

interface AdminTopNavProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}

const TABS: { id: AdminTab; label: string }[] = [
  { id: 'teams', label: 'Teams' },
  { id: 'students', label: 'Students' },
  { id: 'mentors', label: 'Mentors' },
  { id: 'teachers', label: 'Teachers' },
];

export function AdminTopNav({ activeTab, onTabChange }: AdminTopNavProps) {
  return (
    <header className="w-full flex justify-center py-4 border-b border-neutral-200/60 bg-white/95 backdrop-blur-xs sticky top-0 z-30 select-none">
      <div className="inline-flex items-center p-1 bg-neutral-100 rounded-full border border-neutral-200/80">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-5 sm:px-6 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-all cursor-pointer ${
                isActive
                  ? 'bg-neutral-950 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/60'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}
