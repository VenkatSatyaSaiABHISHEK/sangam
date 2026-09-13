'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/db';
import { Announcement, PriorityLevel } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { formatDateTime } from '@/lib/utils';
import {
  Info,
  Send,
  FileText,
  Upload,
  X,
  FileUp,
  Megaphone,
  Download,
  ExternalLink,
  BookOpen,
} from 'lucide-react';

export default function MentorInformationPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('normal');
  const [audience, setAudience] = useState<'all' | 'students' | 'team'>('students');
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
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

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showToast('Validation Error', 'Title and message are required.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const newAnnouncement: Announcement = {
        id: `info_${Date.now().toString(36)}`,
        eventId: 'sangam-2027',
        title: title.trim(),
        message: message.trim(),
        priority,
        target: { audience },
        fileName: fileName.trim() || undefined,
        fileUrl: fileUrl.trim() || undefined,
        fileType: fileName.trim() ? (fileName.toLowerCase().endsWith('.pdf') ? 'pdf' : 'doc') : undefined,
        senderId: user?.id || 'mentor',
        senderName: user?.fullName ? `Mentor ${user.fullName}` : 'Sangam Mentor Advisor',
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
        throw new Error(errData.error || 'Failed to publish');
      }

      setTitle('');
      setMessage('');
      setFileName('');
      setFileUrl('');
      loadAnnouncements();
      showToast('Information Shared!', 'Broadcasted to students and Sangam attendees.', 'success');
    } catch (err: any) {
      showToast('Publish Failed', err.message || 'Could not publish information.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-900">
          Share Information & Documents
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Publish guidelines, instructions, resource links, and PDF documents directly for students.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Information Composer */}
        <Card className="p-6 space-y-4 lg:col-span-1 h-fit border-neutral-200">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-neutral-900" />
            <h2 className="text-base font-semibold text-neutral-900 tracking-tight">
              Publish Notice / Resource
            </h2>
          </div>

          <form onSubmit={handlePublish} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-800">
                Information Title *
              </label>
              <Input
                placeholder="e.g. Workshop Materials or Problem Statement"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-800">
                Information Details / Instructions *
              </label>
              <textarea
                placeholder="Type instructions, guidance, or information notes for students..."
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
                  Target Audience
                </label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value as any)}
                  className="w-full h-9 px-2 text-xs rounded-lg border border-neutral-200 bg-white"
                >
                  <option value="students">Students Only</option>
                  <option value="team">My Assigned Teams</option>
                  <option value="all">Everyone</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-800">
                  Notice Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                  className="w-full h-9 px-2 text-xs rounded-lg border border-neutral-200 bg-white"
                >
                  <option value="normal">Normal</option>
                  <option value="important">Important</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* Direct Document Upload */}
            <div className="pt-2 border-t border-neutral-100 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block">
                Attach PDF / Document (Optional)
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
                  <span>{isUploading ? 'Uploading to CDN...' : 'Upload PDF / Document'}</span>
                </button>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="w-full gap-2 text-xs cursor-pointer h-9 bg-neutral-950 hover:bg-black"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Publishing...' : 'Publish Information'}</span>
            </Button>
          </form>
        </Card>

        {/* Live Information Stream */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900 tracking-tight">
              Information & Broadcast Feed ({announcements.length})
            </h2>
            <span className="text-[10px] text-neutral-400 font-mono">
              LIVE UPDATES
            </span>
          </div>

          {announcements.length === 0 ? (
            <Card className="p-8 text-center text-xs text-neutral-400 border-neutral-200">
              No information notices posted yet. Publish an update above to share with students.
            </Card>
          ) : (
            <div className="space-y-3">
              {announcements.map((item) => (
                <Card
                  key={item.id}
                  className={`p-4 transition-all border-neutral-200 ${
                    item.priority === 'urgent'
                      ? 'border-l-4 border-l-red-600 bg-red-50/20'
                      : item.priority === 'important'
                      ? 'border-l-4 border-l-amber-500 bg-amber-50/20'
                      : 'border-l-4 border-l-neutral-900 bg-white'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-neutral-950">
                          {item.title}
                        </span>
                        <Badge
                          variant={
                            item.priority === 'urgent'
                              ? 'danger'
                              : item.priority === 'important'
                              ? 'warning'
                              : 'neutral'
                          }
                          size="sm"
                          className="capitalize text-[10px]"
                        >
                          {item.priority}
                        </Badge>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 uppercase font-semibold">
                          To: {item.target?.audience || 'all'}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {formatDateTime(item.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-700 leading-relaxed whitespace-pre-line">
                      {item.message}
                    </p>

                    <div className="pt-2 flex items-center justify-between flex-wrap gap-2 border-t border-neutral-100 text-[11px]">
                      <span className="text-neutral-500 font-medium">
                        By: <strong className="text-neutral-800">{item.senderName || 'Command Center'}</strong>
                      </span>

                      {item.fileUrl && (
                        <a
                          href={item.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-semibold transition-colors"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-neutral-700" />
                          <span>{item.fileName || 'Read Attached PDF / Document'}</span>
                          <ExternalLink className="w-3 h-3 text-neutral-400 ml-0.5" />
                        </a>
                      )}
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
