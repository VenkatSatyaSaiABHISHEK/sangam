'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { ChannelMessage, ChannelSettings, UserRole } from '@/types';
import {
  subscribeToChannelMessages,
  saveChannelMessage,
  fetchChannelMessages,
  saveChannelSettings,
  fetchChannelSettings,
} from '@/lib/firebase-db';
import {
  Send,
  Paperclip,
  CheckCheck,
  HelpCircle,
  Lock,
  Unlock,
  X,
  Download,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';

interface OpenChannelViewProps {
  backPath?: string;
  userRoleOverride?: UserRole;
}

// Gentle notification chime via Web Audio API
function playMessageSound() {
  if (typeof window === 'undefined') return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {}
}

export function OpenChannelView({ userRoleOverride }: OpenChannelViewProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const effectiveRole = userRoleOverride || user?.role || 'student';
  const isMentorOrFaculty =
    effectiveRole === 'mentor' ||
    effectiveRole === 'teacher' ||
    effectiveRole === 'faculty' ||
    effectiveRole === 'judge' ||
    effectiveRole === 'admin';

  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [settings, setSettings] = useState<ChannelSettings>({
    studentCanPost: false,
    studentPermissions: {},
  });
  const [inputText, setInputText] = useState('');
  const [isQuestion, setIsQuestion] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [activeLightboxImg, setActiveLightboxImg] = useState<string | null>(null);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  // Scroll stability tracking (Prevents jumping)
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAtBottomRef = useRef<boolean>(true);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [unreadScrolledCount, setUnreadScrolledCount] = useState(0);
  const initialLoadedRef = useRef(false);

  // Check if current user is allowed to post
  const canUserPost = (): boolean => {
    // Mentors, faculty, judges, and admins can ALWAYS chat freely
    if (isMentorOrFaculty) return true;

    // For students: Check individual permission granted by admin
    const perms = settings.studentPermissions || {};
    const userId = user?.id;
    const userEmail = user?.email?.toLowerCase();

    if (userId && perms[userId] === true) return true;
    if (userEmail && perms[userEmail] === true) return true;
    if (userId && perms[userId] === false) return false;
    if (userEmail && perms[userEmail] === false) return false;

    // If not individually configured:
    return Boolean(settings.studentCanPost);
  };

  // Scroll to bottom smoothly or instantly
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
      isAtBottomRef.current = true;
      setShowScrollBottomBtn(false);
      setUnreadScrolledCount(0);
    }
  }, []);

  // Track scroll position to prevent abrupt jumping
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceToBottom < 80;
    isAtBottomRef.current = atBottom;
    setShowScrollBottomBtn(!atBottom);
    if (atBottom) {
      setUnreadScrolledCount(0);
    }
  }, []);

  // Mark channel messages as read in localStorage
  const markAsRead = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sangam_channel_last_read', new Date().toISOString());
    }
  };

  useEffect(() => {
    markAsRead();

    // 1. Initial fetch from API / Firestore
    const initFetch = async () => {
      try {
        const [apiRes, fsSettings] = await Promise.all([
          fetch('/api/channel').then((r) => (r.ok ? r.json() : null)),
          fetchChannelSettings(),
        ]);
        if (apiRes?.messages) {
          setMessages(apiRes.messages);
        }
        if (fsSettings) {
          setSettings(fsSettings);
        } else if (apiRes?.settings) {
          setSettings(apiRes.settings);
        }
      } catch (err) {
        console.warn('Channel init error:', err);
      } finally {
        setTimeout(() => {
          scrollToBottom('auto');
          initialLoadedRef.current = true;
        }, 100);
      }
    };
    initFetch();

    // 2. Real-time Firestore live listener
    const unsubscribe = subscribeToChannelMessages((liveMessages) => {
      setMessages((prev) => {
        const isNew = liveMessages.length > prev.length;
        if (isNew && initialLoadedRef.current) {
          const latest = liveMessages[liveMessages.length - 1];
          const isMine =
            latest &&
            ((user?.id && latest.senderId === user.id) ||
              (user?.email && latest.senderEmail?.toLowerCase() === user.email.toLowerCase()));

          if (isMine) {
            setTimeout(() => scrollToBottom('smooth'), 50);
          } else {
            playMessageSound();
            if (isAtBottomRef.current) {
              setTimeout(() => scrollToBottom('smooth'), 50);
            } else {
              setUnreadScrolledCount((c) => c + 1);
            }
          }
        }
        return liveMessages;
      });

      markAsRead();
    });

    return () => {
      unsubscribe();
    };
  }, [user, scrollToBottom]);

  // Handle image attachment
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Invalid File', 'Please select an image file (JPG, PNG, WebP).', 'error');
      return;
    }
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Toggle student permissions (Mentors & Admins only)
  const handleTogglePermissions = async () => {
    if (!isMentorOrFaculty) return;
    setIsUpdatingSettings(true);
    const updated = { ...settings, studentCanPost: !settings.studentCanPost };
    setSettings(updated);
    try {
      await saveChannelSettings(updated);
      await fetch('/api/channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateSettings', settings: updated }),
      });
      showToast(
        'Channel Settings Updated',
        updated.studentCanPost
          ? 'Discussion Open: Allowed students can now send messages.'
          : 'Broadcast Mode: Only Mentors and Faculty can post.',
        'info'
      );
    } catch {
      showToast('Error', 'Failed to update channel settings.', 'error');
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  // Dispatch message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = inputText.trim();

    if (!content && !selectedImage) return;

    if (!canUserPost()) {
      showToast(
        'Permission Required',
        'You do not have permission to post in the channel. Contact an administrator.',
        'error'
      );
      return;
    }

    setIsSending(true);
    let uploadedImageUrl: string | undefined = undefined;

    if (selectedImage) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', selectedImage);
        formData.append(
          'metadata',
          JSON.stringify({
            eventId: 'sangam-2027',
            uploadedBy: {
              userId: user?.id || 'anonymous',
              name: user?.fullName || 'Participant',
              role: effectiveRole,
              teamName: user?.teamName,
            },
          })
        );
        const upRes = await fetch('/api/photos/upload', {
          method: 'POST',
          body: formData,
        });
        if (upRes.ok) {
          const upData = await upRes.json();
          uploadedImageUrl = upData.photo?.brandedUrl || upData.photo?.originalUrl;
        }
      } catch (err) {
        console.warn('Image upload error:', err);
      } finally {
        setIsUploading(false);
      }
    }

    const newMsg: ChannelMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      senderId: user?.id || 'guest',
      senderName: user?.fullName || (effectiveRole === 'mentor' ? 'Advisor' : 'Student'),
      senderRole: effectiveRole,
      senderEmail: user?.email,
      teamName: user?.teamName,
      content: content,
      imageUrl: uploadedImageUrl,
      isQuestion: isQuestion,
      createdAt: new Date().toISOString(),
    };

    // Optimistic local update
    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
    setIsQuestion(false);
    clearSelectedImage();

    // Smooth scroll down immediately for own message
    setTimeout(() => scrollToBottom('smooth'), 40);

    try {
      await saveChannelMessage(newMsg);
      await fetch('/api/channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMsg }),
      });
      playMessageSound();
    } catch (err) {
      console.error('Failed to dispatch message:', err);
    } finally {
      setIsSending(false);
      markAsRead();
    }
  };

  const allowedToPost = canUserPost();

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full bg-white relative overflow-hidden select-none">
      {/* 1. SLIM & COMPACT HEADER (Space Efficient) */}
      <header className="shrink-0 px-3.5 py-2 bg-white border-b border-neutral-200 flex items-center justify-between z-20 shadow-2xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-neutral-950 text-white flex items-center justify-center font-bold text-[10px] shadow-xs shrink-0">
            SC
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xs font-bold text-neutral-950 uppercase tracking-wide truncate">
                Sangam Channel
              </h1>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Live" />
            </div>
            <p className="text-[10px] text-neutral-500 leading-none truncate">
              Mentors & Students
            </p>
          </div>
        </div>

        {/* Right side: Mode Status */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isMentorOrFaculty && (
            <button
              onClick={handleTogglePermissions}
              disabled={isUpdatingSettings}
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer',
                settings.studentCanPost
                  ? 'bg-neutral-950 text-white border-neutral-950'
                  : 'bg-neutral-100 text-neutral-700 border-neutral-200 hover:bg-neutral-200'
              )}
              title="Toggle broadcast mode"
            >
              {settings.studentCanPost ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              <span>{settings.studentCanPost ? 'Open' : 'Broadcast'}</span>
            </button>
          )}

          {!isMentorOrFaculty && (
            <span
              className={cn(
                'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                allowedToPost
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-neutral-100 text-neutral-500 border-neutral-200'
              )}
            >
              {allowedToPost ? 'Can Chat' : 'View Only'}
            </span>
          )}
        </div>
      </header>

      {/* 2. CHAT STREAM (Compact Bubbles, Senders on Left, Mine on Right, No Bulky Date Pill) */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 relative bg-neutral-50/50 overscroll-contain"
      >
        {messages.map((msg) => {
          const isMe =
            (user?.id && msg.senderId === user.id) ||
            (user?.email && msg.senderEmail?.toLowerCase() === user.email.toLowerCase());

          const roleDisplay =
            msg.senderRole === 'mentor'
              ? 'MENTOR'
              : msg.senderRole === 'teacher' || msg.senderRole === 'faculty' || msg.senderRole === 'judge'
              ? 'FACULTY'
              : msg.senderRole === 'admin'
              ? 'ADMIN'
              : 'STUDENT';

          const timeStr = new Date(msg.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });

          // Incoming Message from Others (Rendered on LEFT with Profile Avatar)
          if (!isMe) {
            return (
              <div key={msg.id} className="flex items-start gap-2 max-w-[85%] sm:max-w-[78%] mr-auto">
                {/* Profile Avatar on the Left */}
                <div className="w-6 h-6 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-2xs border border-neutral-700 mt-0.5">
                  {msg.senderName?.charAt(0).toUpperCase() || 'U'}
                </div>

                {/* Message Bubble Column */}
                <div className="flex flex-col items-start min-w-0">
                  {/* Sender Name & Role Label */}
                  <div className="flex items-center gap-1 mb-0.5 px-0.5 text-[10px]">
                    <span className="font-bold text-neutral-950">{msg.senderName}</span>
                    <span
                      className={cn(
                        'text-[8.5px] px-1 py-0.2 rounded font-mono uppercase font-semibold',
                        msg.senderRole === 'mentor'
                          ? 'bg-neutral-900 text-white'
                          : 'bg-neutral-200 text-neutral-700'
                      )}
                    >
                      {roleDisplay}
                    </span>
                    {msg.teamName && (
                      <span className="text-[9px] text-neutral-400 truncate">
                        • {msg.teamName}
                      </span>
                    )}
                  </div>

                  {/* Bubble Content (Small & Compact) */}
                  <div className="bg-white border border-neutral-200/90 rounded-xl rounded-tl-xs px-3 py-1.5 text-xs shadow-2xs text-neutral-900 space-y-1 break-words select-text">
                    {msg.isQuestion && (
                      <div className="inline-flex items-center gap-1 text-[8.5px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
                        <HelpCircle className="w-2.5 h-2.5 text-amber-600" /> Question
                      </div>
                    )}

                    {msg.imageUrl && (
                      <div className="rounded-lg overflow-hidden border border-neutral-200 max-w-xs">
                        <img
                          src={msg.imageUrl}
                          alt="Attachment"
                          onClick={() => setActiveLightboxImg(msg.imageUrl || null)}
                          className="w-full max-h-52 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                        />
                      </div>
                    )}

                    {msg.content && (
                      <p className="leading-relaxed whitespace-pre-wrap text-[12px] pr-1">
                        {msg.content}
                      </p>
                    )}

                    <div className="text-[9px] text-neutral-400 text-right -mt-0.5">{timeStr}</div>
                  </div>
                </div>
              </div>
            );
          }

          // Outgoing Message from Current User (Rendered on RIGHT, Compact)
          return (
            <div key={msg.id} className="flex flex-col items-end max-w-[82%] sm:max-w-[75%] ml-auto">
              <div className="bg-neutral-950 text-white rounded-xl rounded-tr-xs px-3 py-1.5 text-xs shadow-xs space-y-1 break-words select-text">
                {msg.isQuestion && (
                  <div className="inline-flex items-center gap-1 text-[8.5px] font-bold px-1.5 py-0.5 rounded bg-white/15 text-white border border-white/20 uppercase tracking-wider">
                    <HelpCircle className="w-2.5 h-2.5 text-amber-400" /> Question
                  </div>
                )}

                {msg.imageUrl && (
                  <div className="rounded-lg overflow-hidden border border-white/20 max-w-xs">
                    <img
                      src={msg.imageUrl}
                      alt="Attachment"
                      onClick={() => setActiveLightboxImg(msg.imageUrl || null)}
                      className="w-full max-h-52 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                    />
                  </div>
                )}

                {msg.content && (
                  <p className="leading-relaxed whitespace-pre-wrap text-[12px] text-white pr-1">
                    {msg.content}
                  </p>
                )}

                <div className="flex items-center justify-end gap-1 text-[9px] text-neutral-400 -mt-0.5">
                  <span>{timeStr}</span>
                  <CheckCheck className="w-3 h-3 text-neutral-300" />
                </div>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* Floating Scroll-To-Bottom Button */}
      {showScrollBottomBtn && (
        <button
          onClick={() => scrollToBottom('smooth')}
          className="absolute bottom-16 right-4 z-30 w-8 h-8 rounded-full bg-white text-neutral-800 shadow-md border border-neutral-200 flex items-center justify-center hover:bg-neutral-100 active:scale-95 transition-all cursor-pointer"
          title="Scroll to latest messages"
        >
          <ChevronDown className="w-4 h-4 text-neutral-700" />
          {unreadScrolledCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-neutral-950 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
              {unreadScrolledCount}
            </span>
          )}
        </button>
      )}

      {/* 3. ATTACHMENT PREVIEW TRAY */}
      {imagePreview && (
        <div className="shrink-0 px-3 py-1.5 bg-neutral-100 border-t border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-9 h-9 rounded-md object-cover border border-neutral-300 shadow-2xs"
            />
            <div className="text-xs">
              <p className="font-semibold text-neutral-800 text-[11px]">Photo ready</p>
              <p className="text-[9px] text-neutral-500">Will be sent with message</p>
            </div>
          </div>
          <button
            onClick={clearSelectedImage}
            className="p-1 rounded-full bg-neutral-200 hover:bg-neutral-300 text-neutral-700 cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* 4. INPUT TRAY OR READ-ONLY STATUS NOTICE */}
      {allowedToPost ? (
        <form
          onSubmit={handleSendMessage}
          className="shrink-0 bg-white border-t border-neutral-200 p-2 flex items-center gap-1.5 shadow-xs"
        >
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          {/* Photo Attachment Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending || isUploading}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-950 hover:bg-neutral-100 transition-colors cursor-pointer active:scale-95"
            title="Attach a photo"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Question Tag Chip */}
          <button
            type="button"
            onClick={() => setIsQuestion(!isQuestion)}
            className={cn(
              'px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 border shrink-0',
              isQuestion
                ? 'bg-neutral-950 text-white border-neutral-950'
                : 'bg-neutral-100 text-neutral-600 border-neutral-200 hover:bg-neutral-200'
            )}
            title="Mark as Question"
          >
            <HelpCircle className="w-3 h-3" />
            <span className="hidden sm:inline">Q&A</span>
          </button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isQuestion ? 'Ask mentors a question...' : 'Type a message...'}
              disabled={isSending}
              className="w-full bg-neutral-100 text-neutral-900 placeholder:text-neutral-400 text-xs px-3 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 transition-all"
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={isSending || isUploading || (!inputText.trim() && !selectedImage)}
            className={cn(
              'w-8 h-8 rounded-xl bg-neutral-950 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-90 shrink-0',
              (!inputText.trim() && !selectedImage) || isSending
                ? 'opacity-30 cursor-not-allowed'
                : 'hover:bg-neutral-800'
            )}
            title="Send message"
          >
            {isSending || isUploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <Send className="w-3.5 h-3.5 text-white -ml-0.5" />
            )}
          </button>
        </form>
      ) : (
        /* Read-Only Status when student does not have chat permission */
        <div className="shrink-0 bg-neutral-50 border-t border-neutral-200 px-3 py-2 text-center text-xs text-neutral-600 flex items-center justify-center gap-2">
          <Lock className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
          <span className="text-[11px]">
            Chat permission is restricted by administration. Mentors and authorized students can post.
          </span>
        </div>
      )}

      {/* 5. IMAGE LIGHTBOX MODAL */}
      {activeLightboxImg && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4"
          onClick={() => setActiveLightboxImg(null)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-3">
            <a
              href={activeLightboxImg}
              download="sangam-image.jpg"
              onClick={(e) => e.stopPropagation()}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
              title="Download image"
            >
              <Download className="w-5 h-5" />
            </a>
            <button
              onClick={() => setActiveLightboxImg(null)}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <img
            src={activeLightboxImg}
            alt="Preview"
            className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-white/20"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
