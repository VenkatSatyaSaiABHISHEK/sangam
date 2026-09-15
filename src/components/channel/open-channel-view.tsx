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
import Link from 'next/link';
import {
  Send,
  Paperclip,
  CheckCheck,
  HelpCircle,
  Lock,
  X,
  Download,
  Loader2,
  ChevronDown,
  ArrowLeft,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import { sendDevicePushNotification } from '@/lib/push-notifications';
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

export function OpenChannelView({ backPath, userRoleOverride }: OpenChannelViewProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const userRole = user?.role;
  const isActuallyAdmin =
    userRole === 'admin' ||
    user?.email?.toLowerCase().includes('admin') ||
    user?.fullName?.toLowerCase().includes('admin');

  const isActuallyMentor =
    !isActuallyAdmin &&
    (userRole === 'mentor' ||
      user?.email?.toLowerCase().includes('mentor') ||
      user?.fullName?.toLowerCase().includes('mentor'));

  const effectiveRole = isActuallyAdmin
    ? 'admin'
    : isActuallyMentor
    ? 'mentor'
    : userRole === 'teacher' || userRole === 'faculty' || userRole === 'judge'
    ? userRole
    : userRoleOverride || userRole || 'student';

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
            if (typeof document !== 'undefined' && document.hidden) {
              sendDevicePushNotification({
                title: `💬 ${latest.senderName || 'Channel Message'}`,
                body: latest.content || (latest.imageUrl ? '📷 Shared an image' : 'New message in channel'),
                url: '/student/channels',
                tag: `msg-${latest.id}`,
              });
            }
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

    const senderRoleToSave: 'admin' | 'mentor' | 'teacher' | 'student' =
      effectiveRole === 'admin'
        ? 'admin'
        : effectiveRole === 'mentor'
        ? 'mentor'
        : effectiveRole === 'teacher' || effectiveRole === 'faculty' || effectiveRole === 'judge'
        ? 'teacher'
        : 'student';

    const newMsg: ChannelMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      senderId: user?.id || (isActuallyAdmin ? 'admin' : 'guest'),
      senderName:
        user?.fullName ||
        (senderRoleToSave === 'admin'
          ? 'Administrator'
          : senderRoleToSave === 'mentor'
          ? 'Mentor'
          : 'Student'),
      senderRole: senderRoleToSave,
      senderEmail: user?.email,
      senderAvatar: user?.avatarUrl,
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
    <div className="flex-1 flex flex-col min-h-0 w-full bg-white md:rounded-2xl md:border md:border-neutral-200/80 md:shadow-xs relative overflow-hidden select-none">
      {/* 1. CHANNEL HEADER */}
      <div className="shrink-0 bg-white border-b border-neutral-200 px-3.5 py-2.5 flex items-center justify-between shadow-2xs z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          {backPath && (
            <Link
              href={backPath}
              className="p-1.5 -ml-1 rounded-lg text-neutral-500 hover:text-neutral-950 hover:bg-neutral-100 transition-colors cursor-pointer shrink-0"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          )}

          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-800 text-white flex items-center justify-center shadow-2xs">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold text-xs sm:text-sm text-neutral-900 truncate">
                Sangam Open Channel
              </h2>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                LIVE
              </span>
            </div>
            <p className="text-[10.5px] text-neutral-500 truncate">
              Public Summit Broadcast • Mentors, Faculty &amp; Students
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={cn(
              'text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase border tracking-wider',
              isActuallyAdmin
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : isActuallyMentor
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-neutral-100 text-neutral-700 border-neutral-200'
            )}
          >
            {effectiveRole}
          </span>
        </div>
      </div>

      {/* 2. CHAT STREAM (Sleek Modern WhatsApp / Slack Aesthetic) */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3 relative bg-[#F8FAFC] overscroll-contain"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-neutral-400">
            <div className="w-12 h-12 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center shadow-xs text-neutral-600">
              <MessageCircle className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-neutral-700">Welcome to Sangam Open Channel</p>
            <p className="text-[11px] text-neutral-500 max-w-xs">
              No messages yet. Feel free to start the conversation or ask mentors questions!
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe =
              (user?.id && msg.senderId === user.id) ||
              (user?.email && msg.senderEmail && msg.senderEmail.toLowerCase() === user.email.toLowerCase()) ||
              (user?.fullName && msg.senderName && msg.senderName.toLowerCase() === user.fullName.toLowerCase()) ||
              (isActuallyAdmin && (msg.senderRole === 'admin' || msg.senderName === 'Master Administrator'));

            const isMsgAdmin =
              msg.senderRole === 'admin' ||
              msg.senderId === 'admin' ||
              msg.senderName?.toLowerCase().includes('admin') ||
              msg.senderEmail?.toLowerCase().includes('admin');

            const isMsgMentor =
              !isMsgAdmin &&
              (msg.senderRole === 'mentor' ||
                msg.senderName?.toLowerCase().includes('mentor') ||
                (msg.senderEmail && (msg.senderEmail.includes('mentor') || msg.senderEmail.includes('@mentor.'))));

            const isMsgFaculty =
              !isMsgAdmin &&
              !isMsgMentor &&
              (msg.senderRole === 'teacher' || msg.senderRole === 'faculty' || msg.senderRole === 'judge');

            const roleDisplay = isMsgAdmin
              ? 'ADMIN'
              : isMsgMentor
              ? 'MENTOR'
              : isMsgFaculty
              ? 'FACULTY'
              : 'STUDENT';

            const msgDate = new Date(msg.createdAt);
            const now = new Date();
            const isToday =
              msgDate.getDate() === now.getDate() &&
              msgDate.getMonth() === now.getMonth() &&
              msgDate.getFullYear() === now.getFullYear();

            const yesterday = new Date();
            yesterday.setDate(now.getDate() - 1);
            const isYesterday =
              msgDate.getDate() === yesterday.getDate() &&
              msgDate.getMonth() === yesterday.getMonth() &&
              msgDate.getFullYear() === yesterday.getFullYear();

            const dateLabel = isToday
              ? 'Today'
              : isYesterday
              ? 'Yesterday'
              : msgDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

            const timeLabel = msgDate.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            const dateTimeDisplay = `${dateLabel}, ${timeLabel}`;

            // Optional Date Separator between distinct days
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const prevDate = prevMsg ? new Date(prevMsg.createdAt) : null;
            const showDateHeader =
              !prevDate ||
              prevDate.getDate() !== msgDate.getDate() ||
              prevDate.getMonth() !== msgDate.getMonth();

            return (
              <React.Fragment key={msg.id}>
                {showDateHeader && (
                  <div className="flex justify-center my-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-200/80 text-slate-600 text-[9.5px] font-semibold tracking-wider uppercase shadow-2xs select-none">
                      {dateLabel}
                    </span>
                  </div>
                )}

                {/* INCOMING MESSAGE (Others - on the LEFT) */}
                {!isMe ? (
                  <div className="flex items-start gap-2.5 max-w-[88%] sm:max-w-[80%] mr-auto group">
                    {/* Role Gradient Avatar */}
                    <div
                      className={cn(
                        'w-7 h-7 rounded-full text-white flex items-center justify-center text-[10.5px] font-bold shrink-0 shadow-2xs mt-0.5 select-none overflow-hidden',
                        msg.senderAvatar
                          ? 'bg-neutral-100'
                          : isMsgAdmin
                          ? 'bg-gradient-to-br from-rose-500 to-red-600'
                          : isMsgMentor
                          ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
                          : isMsgFaculty
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                          : 'bg-gradient-to-br from-sky-500 to-blue-600'
                      )}
                    >
                      {msg.senderAvatar ? (
                        <img src={msg.senderAvatar} alt={msg.senderName} className="w-full h-full object-cover" />
                      ) : (
                        msg.senderName?.charAt(0).toUpperCase() || 'U'
                      )}
                    </div>

                    {/* Message Bubble Column */}
                    <div className="flex flex-col items-start min-w-0">
                      {/* Sender Header */}
                      <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px]">
                        <span className="font-bold text-neutral-950 tracking-tight">
                          {msg.senderName}
                        </span>
                        <span
                          className={cn(
                            'text-[8.5px] px-1.5 py-0.2 rounded font-mono uppercase font-bold tracking-wider',
                            isMsgAdmin
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : isMsgMentor
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : isMsgFaculty
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          )}
                        >
                          {roleDisplay}
                        </span>
                        {msg.teamName && (
                          <span className="text-[9.5px] text-neutral-400 truncate font-medium">
                            • {msg.teamName}
                          </span>
                        )}
                      </div>

                      {/* White Bubble Card */}
                      <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-xs px-3.5 py-2 text-xs shadow-2xs text-neutral-900 space-y-1.5 break-words select-text">
                        {msg.isQuestion && (
                          <div className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
                            <HelpCircle className="w-3 h-3 text-amber-600" /> Question
                          </div>
                        )}

                        {msg.imageUrl && (
                          <div className="rounded-xl overflow-hidden border border-neutral-200 max-w-xs my-1 shadow-2xs">
                            <img
                              src={msg.imageUrl}
                              alt="Attachment"
                              onClick={() => setActiveLightboxImg(msg.imageUrl || null)}
                              className="w-full max-h-56 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                            />
                          </div>
                        )}

                        {msg.content && (
                          <p className="leading-relaxed whitespace-pre-wrap text-[12.5px] text-neutral-800 font-normal pr-1">
                            {msg.content}
                          </p>
                        )}

                        <div className="text-[9.5px] text-neutral-400 text-right font-mono -mt-0.5 select-none">
                          {dateTimeDisplay}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* OUTGOING MESSAGE (Mine - on the RIGHT) */
                  <div className="flex flex-col items-end max-w-[85%] sm:max-w-[78%] ml-auto group">
                    <div className="bg-neutral-950 text-white rounded-2xl rounded-tr-xs px-3.5 py-2 text-xs shadow-xs space-y-1.5 break-words select-text">
                      {msg.isQuestion && (
                        <div className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/15 text-white border border-white/20 uppercase tracking-wider">
                          <HelpCircle className="w-3 h-3 text-amber-400" /> Question
                        </div>
                      )}

                      {msg.imageUrl && (
                        <div className="rounded-xl overflow-hidden border border-white/20 max-w-xs my-1 shadow-2xs">
                          <img
                            src={msg.imageUrl}
                            alt="Attachment"
                            onClick={() => setActiveLightboxImg(msg.imageUrl || null)}
                            className="w-full max-h-56 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                          />
                        </div>
                      )}

                      {msg.content && (
                        <p className="leading-relaxed whitespace-pre-wrap text-[12.5px] text-neutral-100 font-normal pr-1">
                          {msg.content}
                        </p>
                      )}

                      <div className="flex items-center justify-end gap-1 text-[9.5px] text-neutral-400 -mt-0.5 font-mono select-none">
                        <span>{dateTimeDisplay}</span>
                        <CheckCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      </div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })
        )}

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
        <div className="shrink-0 px-3.5 py-2 bg-neutral-100 border-t border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-9 h-9 rounded-lg object-cover border border-neutral-300 shadow-2xs"
            />
            <div className="text-xs">
              <p className="font-bold text-neutral-800 text-[11px]">Photo Attached</p>
              <p className="text-[9.5px] text-neutral-500">Will be broadcast with message</p>
            </div>
          </div>
          <button
            onClick={clearSelectedImage}
            className="p-1 rounded-full bg-neutral-200 hover:bg-neutral-300 text-neutral-700 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4. PINNED BOTTOM INPUT TRAY */}
      {allowedToPost ? (
        <form
          onSubmit={handleSendMessage}
          className="shrink-0 bg-white border-t border-neutral-200 p-2 sm:p-2.5 flex items-center gap-1.5 sm:gap-2 shadow-xs z-10"
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
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-neutral-500 hover:text-neutral-950 hover:bg-neutral-100 active:scale-95 transition-all flex items-center justify-center cursor-pointer shrink-0"
            title="Attach a photo"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Question Tag Chip */}
          <button
            type="button"
            onClick={() => setIsQuestion(!isQuestion)}
            className={cn(
              'px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 border',
              isQuestion
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                : 'bg-neutral-100 text-neutral-600 border-neutral-200 hover:bg-neutral-200'
            )}
            title="Mark as Question"
          >
            <HelpCircle className={cn('w-3.5 h-3.5', isQuestion ? 'text-white' : 'text-amber-600')} />
            <span className="hidden sm:inline text-[11px]">Question</span>
          </button>

          {/* Text Input */}
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isQuestion ? 'Ask mentors a question...' : 'Type a message...'}
              disabled={isSending}
              className="w-full bg-neutral-100/90 hover:bg-neutral-100 focus:bg-white text-neutral-900 placeholder:text-neutral-400 text-xs sm:text-sm px-3.5 py-2 sm:py-2.5 rounded-xl border border-neutral-200/80 focus:border-neutral-950 focus:outline-none focus:ring-1 focus:ring-neutral-950 transition-all shadow-2xs"
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={isSending || isUploading || (!inputText.trim() && !selectedImage)}
            className={cn(
              'w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-neutral-950 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-90 shrink-0',
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
        <div className="shrink-0 bg-neutral-50 border-t border-neutral-200 px-3 py-2.5 text-center text-xs text-neutral-600 flex items-center justify-center gap-2">
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
