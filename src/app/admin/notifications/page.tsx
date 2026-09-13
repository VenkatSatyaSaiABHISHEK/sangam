'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/db';
import { Announcement, PriorityLevel } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { formatDateTime } from '@/lib/utils';
import {
  Bell,
  Send,
  AlertTriangle,
  Info,
  CheckCircle2,
  FileText,
  Link as LinkIcon,
  Users,
  GraduationCap,
  Building,
  Upload,
  X,
  Trash2,
  FileUp,
} from 'lucide-react';

export default function AdminNotificationsPage() {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('normal');
  const [audience, setAudience] = useState<'all' | 'students' | 'mentors' | 'teachers' | 'team'>('all');
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadAnnouncements = async () => {
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements || []);
        return;
      }
    } catch {
      // fallback
    }
    setAnnouncements(db.getAnnouncements());
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setFileName(data.fileName || file.name);
      setFileUrl(data.url);
      showToast('Document Uploaded', `${file.name} attached successfully!`, 'success');
    } catch (err: any) {
      showToast('Upload Error', err.message || 'Could not upload document', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showToast('Validation Error', 'Title and message are required.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const newAnnouncement: Announcement = {
        id: `ann_${Date.now().toString(36)}`,
        eventId: 'summit-2027',
        title: title.trim(),
        message: message.trim(),
        priority,
        target: { audience },
        fileName: fileName.trim() || undefined,
        fileUrl: fileUrl.trim() || undefined,
        fileType: fileName.trim() ? (fileName.toLowerCase().endsWith('.pdf') ? 'pdf' : 'doc') : undefined,
        actionUrl: actionUrl.trim() || undefined,
        senderId: 'admin-root',
        senderName: 'Sangam Command Center',
        createdAt: new Date().toISOString(),
      };

      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createAnnouncement',
          payload: newAnnouncement,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to broadcast');
      }

      setTitle('');
      setMessage('');
      setFileName('');
      setFileUrl('');
      setActionUrl('');
      loadAnnouncements();
      showToast('Announcement Broadcasted!', `Dispatched to ${audience.toUpperCase()} group.`, 'success');
    } catch (err: any) {
      showToast('Broadcast Failed', err.message || 'Could not dispatch broadcast.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this broadcast?')) return;
    try {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deleteAnnouncement',
          payload: { id },
        }),
      });
      loadAnnouncements();
      showToast('Broadcast Removed', 'Announcement deleted.', 'info');
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-950">
          Sangam Broadcast & Document Publishing
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Push targeted alerts, schedules, guidelines, and PDF documents directly to attendees and advisors.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Broadcast Composer */}
        <Card className="p-6 space-y-4 lg:col-span-1 h-fit">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-neutral-900" />
            <h2 className="text-base font-semibold text-neutral-900 tracking-tight">
              Create Broadcast
            </h2>
          </div>

          <form onSubmit={handleBroadcast} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-800">
                Announcement Title *
              </label>
              <Input
                placeholder="e.g. Schedule Update or Workshop Guide"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-800">
                Message Body *
              </label>
              <textarea
                placeholder="Type your official announcement or instructions..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={4}
                className="w-full p-2.5 text-xs rounded-lg border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-black bg-white leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-800">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                  className="w-full h-9 px-2 text-xs rounded-lg border border-neutral-200 bg-white"
                >
                  <option value="normal">Normal (Notice)</option>
                  <option value="important">Important (Warning)</option>
                  <option value="urgent">Urgent (Alert)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-800">
                  Target Audience
                </label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value as any)}
                  className="w-full h-9 px-2 text-xs rounded-lg border border-neutral-200 bg-white"
                >
                  <option value="all">Everyone</option>
                  <option value="students">Students Only</option>
                  <option value="mentors">Mentors Only</option>
                  <option value="teachers">Teachers Only</option>
                  <option value="team">Team Cohorts</option>
                </select>
              </div>
            </div>

            {/* DIRECT ATTACH DOCUMENT / PDF */}
            <div className="pt-2 border-t border-neutral-100 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">
                Attach Document / PDF (Optional)
              </span>

              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,.doc,.docx,.txt,.png,.jpg"
                onChange={handleFileUpload}
                className="hidden"
              />

              {fileUrl ? (
                <div className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold text-[10px] shrink-0">
                      PDF
                    </div>
                    <span className="font-semibold text-neutral-900 truncate">
                      {fileName}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFileName('');
                      setFileUrl('');
                    }}
                    className="p-1 text-neutral-400 hover:text-red-600 rounded"
                    title="Remove attached document"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full py-3 px-4 border border-dashed border-neutral-300 hover:border-neutral-500 rounded-xl bg-neutral-50 hover:bg-neutral-100/70 transition-colors flex items-center justify-center gap-2 text-xs font-semibold text-neutral-700 cursor-pointer"
                >
                  <FileUp className="w-4 h-4 text-neutral-500" />
                  <span>{isUploading ? 'Uploading document to CDN...' : 'Upload PDF / Document File'}</span>
                </button>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-neutral-500">
                  Or enter File URL manually:
                </label>
                <Input
                  placeholder="https://... or /docs/schedule.pdf"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="w-full gap-2 text-xs cursor-pointer h-9"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Broadcasting...' : 'Broadcast Now'}</span>
            </Button>
          </form>
        </Card>

        {/* Announcements History */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900 tracking-tight">
              Broadcast Log ({announcements.length})
            </h2>
            <span className="text-[10px] text-neutral-400 font-mono">
              REAL-TIME DISPATCH
            </span>
          </div>

          {announcements.length === 0 ? (
            <Card className="p-8 text-center text-xs text-neutral-400">
              No broadcasts dispatched yet. Create an announcement above to publish to attendees.
            </Card>
          ) : (
            <div className="space-y-3">
              {announcements.map((ann) => (
                <Card
                  key={ann.id}
                  className={`p-4 transition-all relative ${
                    ann.priority === 'urgent'
                      ? 'border-l-4 border-l-red-600 bg-red-50/20'
                      : ann.priority === 'important'
                      ? 'border-l-4 border-l-amber-500 bg-amber-50/20'
                      : 'border-l-4 border-l-neutral-900 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-neutral-950">
                          {ann.title}
                        </span>
                        <Badge
                          variant={
                            ann.priority === 'urgent'
                              ? 'danger'
                              : ann.priority === 'important'
                              ? 'warning'
                              : 'neutral'
                          }
                          size="sm"
                          className="capitalize text-[10px]"
                        >
                          {ann.priority}
                        </Badge>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 uppercase font-semibold">
                          To: {ann.target?.audience || 'all'}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-400">
                          By: {ann.senderName || 'Command Center'}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-700 leading-relaxed whitespace-pre-line pt-1">
                        {ann.message}
                      </p>

                      {ann.fileUrl && (
                        <div className="pt-2">
                          <a
                            href={ann.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 text-neutral-600" />
                            <span>{ann.fileName || 'View Attached PDF / Document'}</span>
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {formatDateTime(ann.createdAt)}
                      </span>
                      <button
                        onClick={() => handleDelete(ann.id)}
                        className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Broadcast"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
