'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Announcement, PriorityLevel } from '@/types';
import { db } from '@/lib/db';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormattedContent } from '@/components/ui/formatted-content';
import {
  Bell,
  ArrowLeft,
  CheckCheck,
  FileText,
  Download,
  ExternalLink,
  AlertTriangle,
  Info,
  Calendar,
  Clock,
  Sparkles,
  Search,
} from 'lucide-react';

export default function StudentNotificationsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'documents' | 'urgent' | 'important' | 'normal'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    try {
      const res = await fetch('/api/data?include=announcements');
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements || []);
      } else {
        setAnnouncements(db.getAnnouncements());
      }
    } catch {
      setAnnouncements(db.getAnnouncements());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (typeof window !== 'undefined') {
      localStorage.setItem('sangam_notifications_last_read', new Date().toISOString());
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'documents') {
        setSelectedFilter('documents');
      }
    }
  }, []);

  const handleMarkAllAsRead = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sangam_notifications_last_read', new Date().toISOString());
    }
    window.dispatchEvent(new Event('storage'));
  };

  const filtered = announcements.filter((a) => {
    if (selectedFilter === 'documents' && !a.fileUrl && !a.fileName && !a.actionUrl) return false;
    if (selectedFilter !== 'all' && selectedFilter !== 'documents' && a.priority !== selectedFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const title = (a.title || '').toLowerCase();
      const msg = (a.message || '').toLowerCase();
      const sender = (a.senderName || '').toLowerCase();
      const fileName = (a.fileName || '').toLowerCase();
      return title.includes(q) || msg.includes(q) || sender.includes(q) || fileName.includes(q);
    }
    return true;
  });

  const docCount = announcements.filter((a) => a.fileUrl || a.fileName || a.actionUrl).length;
  const urgentCount = announcements.filter((a) => a.priority === 'urgent').length;
  const importantCount = announcements.filter((a) => a.priority === 'important').length;

  return (
    <div className="space-y-4 pt-1 pb-8">
      {/* Header & Navigation */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Link
            href="/student"
            className="p-2 rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-bold tracking-tight text-neutral-950 flex items-center gap-2">
              <span>Notifications &amp; Alerts</span>
              <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-xs font-mono font-semibold">
                {announcements.length}
              </span>
            </h1>
            <p className="text-[11px] text-neutral-500">
              Official announcements, broadcast messages, and shared files.
            </p>
          </div>
        </div>

        <button
          onClick={handleMarkAllAsRead}
          className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-950 hover:bg-neutral-100 text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
          title="Mark all as read"
        >
          <CheckCheck className="w-4 h-4 text-emerald-600" />
          <span className="hidden sm:inline text-[11px]">Mark Read</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            selectedFilter === 'all'
              ? 'bg-neutral-950 text-white shadow-2xs'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/80'
          }`}
        >
          All ({announcements.length})
        </button>

        <button
          onClick={() => setSelectedFilter('documents')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            selectedFilter === 'documents'
              ? 'bg-neutral-950 text-white shadow-2xs'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/80'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Documents ({docCount})</span>
        </button>

        {urgentCount > 0 && (
          <button
            onClick={() => setSelectedFilter('urgent')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedFilter === 'urgent'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            <span>Urgent ({urgentCount})</span>
          </button>
        )}

        {importantCount > 0 && (
          <button
            onClick={() => setSelectedFilter('important')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedFilter === 'important'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            Important ({importantCount})
          </button>
        )}

        <button
          onClick={() => setSelectedFilter('normal')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            selectedFilter === 'normal'
              ? 'bg-neutral-950 text-white shadow-2xs'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/80'
          }`}
        >
          General
        </button>
      </div>

      {/* Search Input */}
      {announcements.length > 3 && (
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search announcements by keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-neutral-200 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-950 shadow-2xs"
          />
        </div>
      )}

      {/* Announcements Feed */}
      {loading ? (
        <div className="py-12 text-center space-y-3">
          <div className="w-7 h-7 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-neutral-400 font-mono">Loading announcements...</p>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center space-y-3 border-neutral-200">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900">No Notifications Found</h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
              {searchQuery ? 'No notifications matched your search query.' : 'There are no announcements posted in this category yet.'}
            </p>
          </div>
          {searchQuery && (
            <Button size="sm" variant="outline" onClick={() => setSearchQuery('')} className="text-xs">
              Clear Search
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const isUrgent = item.priority === 'urgent';
            const isImportant = item.priority === 'important';

            return (
              <Card
                key={item.id}
                className={`p-4 space-y-3 transition-all ${
                  isUrgent
                    ? 'border-rose-300 bg-rose-50/40 shadow-xs ring-1 ring-rose-200/50'
                    : isImportant
                    ? 'border-amber-300 bg-amber-50/40 shadow-xs'
                    : 'border-neutral-200 bg-white hover:border-neutral-300'
                }`}
              >
                {/* Meta Row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge
                      variant={isUrgent ? 'danger' : isImportant ? 'warning' : 'neutral'}
                      size="sm"
                      className="capitalize text-[10px]"
                    >
                      {item.priority}
                    </Badge>
                    <span className="text-[11px] font-medium text-neutral-500 truncate max-w-[200px]">
                      {item.senderName ? `From: ${item.senderName}` : 'From: Command Center'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-mono shrink-0">
                    <Clock className="w-3 h-3" />
                    <span>
                      {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-neutral-950 leading-snug">
                    {item.title}
                  </h3>
                  <FormattedContent
                    content={item.message}
                    className="text-xs text-neutral-700 leading-relaxed"
                  />
                </div>

                {/* Attached Document / Action Link */}
                {(item.fileUrl || item.actionUrl) && (
                  <div className="pt-2.5 border-t border-neutral-200/70 flex flex-col sm:flex-row gap-2">
                    {item.fileUrl && (
                      <a
                        href={item.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 p-2.5 rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 flex items-center justify-between text-xs transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                          <span className="font-semibold text-neutral-900 truncate">
                            {item.fileName || 'Attached Document'}
                          </span>
                        </div>
                        <Download className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-900 shrink-0 ml-2" />
                      </a>
                    )}

                    {item.actionUrl && (
                      <a
                        href={item.actionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <span>Open Link</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
