'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  ArrowLeft,
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
  Info,
  Users,
  ShieldCheck,
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
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); // A5
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  } catch {}
}

export function OpenChannelView({ backPath, userRoleOverride }: OpenChannelViewProps) {
  const router = useRouter();
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
  const [settings, setSettings] = useState<ChannelSettings>({ studentCanPost: true });
  const [inputText, setInputText] = useState('');
  const [isQuestion, setIsQuestion] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [activeLightboxImg, setActiveLightboxImg] = useState<string | null>(null);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [showChannelInfo, setShowChannelInfo] = useState(false);

  // Scroll stability tracking (Prevents jumping)
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAtBottomRef = useRef<boolean>(true);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [unreadScrolledCount, setUnreadScrolledCount] = useState(0);
  const initialLoadedRef = useRef(false);

  // Scroll to bottom smoothly or instantly
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
      isAtBottomRef.current = true;
      setShowScrollBottomBtn(false);
      setUnreadScrolledCount(0);
    }
  }, []);

  // Track scroll position to prevent abrupt jumping when messages arrive
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

  // Mark channel messages as read
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
          ? 'Discussion Open: Students can now send messages.'
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

    if (!settings.studentCanPost && !isMentorOrFaculty) {
      showToast(
        'Broadcast Mode',
        'Channel is currently in broadcast mode. Only mentors and faculty can post.',
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

  const handleBack = () => {
    if (backPath) {
      router.push(backPath);
    } else if (effectiveRole === 'student') {
      router.push('/student');
    } else if (effectiveRole === 'mentor') {
      router.push('/mentor/dashboard');
    } else if (effectiveRole === 'teacher' || effectiveRole === 'faculty') {
      router.push('/teacher/dashboard');
    } else {
      router.push('/admin/dashboard');
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-2xl mx-auto bg-[#efeae2] text-[#111b21] overflow-hidden font-sans border-x border-neutral-300 shadow-2xl relative select-none">
      {/* 1. WHATSAPP STYLE TOP APP BAR */}
      <header className="shrink-0 bg-[#075e54] text-white px-3 py-2.5 flex items-center justify-between shadow-md z-30">
        <div className="flex items-center gap-2 min-w-0">
          {/* Back Arrow */}
          <button
            onClick={handleBack}
            className="p-1 rounded-full hover:bg-black/15 text-white transition-colors cursor-pointer active:scale-95"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Group Avatar & Channel Identity */}
          <div
            onClick={() => setShowChannelInfo(true)}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-95 transition-opacity min-w-0"
          >
            <div className="w-9 h-9 rounded-full bg-[#128c7e] text-white font-bold flex items-center justify-center text-xs shadow-xs border border-white/20 shrink-0">
              SC
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-semibold tracking-tight text-white leading-tight truncate">
                  Sangam Open Channel
                </h1>
                <span className="w-1.5 h-1.5 rounded-full bg-[#25d366] shrink-0" title="Active" />
              </div>
              <p className="text-[11px] text-white/80 leading-tight truncate">
                Mentors, Faculty & Students Hub
              </p>
            </div>
          </div>
        </div>

        {/* Right side: Lock toggle for mentors / Info button */}
        <div className="flex items-center gap-1.5">
          {isMentorOrFaculty && (
            <button
              onClick={handleTogglePermissions}
              disabled={isUpdatingSettings}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer border',
                settings.studentCanPost
                  ? 'bg-white/15 border-white/25 text-white hover:bg-white/25'
                  : 'bg-white text-[#075e54] border-white hover:bg-neutral-100'
              )}
              title="Toggle student participation mode"
            >
              {settings.studentCanPost ? (
                <>
                  <Unlock className="w-3 h-3" />
                  <span className="hidden sm:inline">Students:</span> Open
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3" />
                  <span className="hidden sm:inline">Students:</span> Read-Only
                </>
              )}
            </button>
          )}

          <button
            onClick={() => setShowChannelInfo(true)}
            className="p-1.5 rounded-full hover:bg-black/15 text-white/90 hover:text-white transition-colors cursor-pointer"
            title="Channel Info"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. WHATSAPP CHAT STREAM (Wallpaper backdrop, zero jumping) */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5 relative overscroll-contain"
        style={{
          backgroundColor: '#efeae2',
          backgroundImage:
            'radial-gradient(#d6cdc4 0.75px, transparent 0.75px), radial-gradient(#d6cdc4 0.75px, #efeae2 0.75px)',
          backgroundSize: '30px 30px',
          backgroundPosition: '0 0, 15px 15px',
        }}
      >
        {/* Centered Date Badge (WhatsApp Style) */}
        <div className="text-center my-1.5">
          <span className="inline-block px-3 py-1 bg-white/90 backdrop-blur-xs text-[#54656f] text-[11px] font-medium rounded-lg shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] border border-neutral-200/60 uppercase tracking-wider">
            Sangam 2027 Community Discussion
          </span>
        </div>

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

          const roleColorClass =
            msg.senderRole === 'mentor'
              ? 'text-[#008069]'
              : msg.senderRole === 'teacher' || msg.senderRole === 'faculty' || msg.senderRole === 'judge'
              ? 'text-[#1e40af]'
              : msg.senderRole === 'admin'
              ? 'text-[#b91c1c]'
              : 'text-[#54656f]';

          const timeStr = new Date(msg.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div
              key={msg.id}
              className={cn(
                'flex flex-col max-w-[85%] sm:max-w-[78%] transition-none',
                isMe ? 'ml-auto items-end' : 'mr-auto items-start'
              )}
            >
              {/* WhatsApp Message Bubble */}
              <div
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm select-text break-words relative shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] transition-none',
                  isMe
                    ? 'bg-[#d9fdd3] text-[#111b21] rounded-tr-none'
                    : 'bg-white text-[#111b21] rounded-tl-none'
                )}
              >
                {/* Sender Header for Received Messages */}
                {!isMe && (
                  <div className="flex items-center gap-1.5 mb-1 text-[11px] font-bold">
                    <span className={roleColorClass}>{msg.senderName}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-mono uppercase bg-neutral-100 text-neutral-600 border border-neutral-200">
                      {roleDisplay}
                    </span>
                    {msg.teamName && (
                      <span className="text-[10px] text-[#667781] font-normal">
                        ({msg.teamName})
                      </span>
                    )}
                  </div>
                )}

                {/* Question Chip */}
                {msg.isQuestion && (
                  <div className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mb-1.5 bg-[#fef3c7] text-[#92400e] border border-[#fde68a]">
                    <HelpCircle className="w-3 h-3 text-[#d97706]" /> Question
                  </div>
                )}

                {/* Image Attachment with Lightbox */}
                {msg.imageUrl && (
                  <div className="mb-1.5 overflow-hidden rounded-md border border-black/10 max-w-sm">
                    <img
                      src={msg.imageUrl}
                      alt="Attachment"
                      onClick={() => setActiveLightboxImg(msg.imageUrl || null)}
                      className="w-full max-h-72 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                      loading="lazy"
                    />
                  </div>
                )}

                {/* Message Text */}
                {msg.content && (
                  <p className="leading-relaxed whitespace-pre-wrap text-[13.5px] pr-1">
                    {msg.content}
                  </p>
                )}

                {/* WhatsApp Timestamp & Double Ticks */}
                <div className="flex items-center justify-end gap-1 mt-0.5 text-[10px] text-[#667781] select-none float-right ml-2 -mb-0.5">
                  <span>{timeStr}</span>
                  {isMe && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* Floating WhatsApp Scroll-To-Bottom Button */}
      {showScrollBottomBtn && (
        <button
          onClick={() => scrollToBottom('smooth')}
          className="absolute bottom-16 right-4 z-30 w-9 h-9 rounded-full bg-white text-neutral-700 shadow-lg border border-neutral-200 flex items-center justify-center hover:bg-neutral-50 active:scale-95 transition-all cursor-pointer"
          title="Scroll to latest messages"
        >
          <ChevronDown className="w-5 h-5 text-neutral-700" />
          {unreadScrolledCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#25d366] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
              {unreadScrolledCount}
            </span>
          )}
        </button>
      )}

      {/* 3. ATTACHMENT PREVIEW TRAY */}
      {imagePreview && (
        <div className="shrink-0 px-3 py-2 bg-[#e9edef] border-t border-neutral-300 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-12 h-12 rounded-lg object-cover border border-neutral-300 shadow-2xs"
            />
            <div className="text-xs">
              <p className="font-semibold text-neutral-800">Photo selected</p>
              <p className="text-[10px] text-neutral-500">Will be sent with your message</p>
            </div>
          </div>
          <button
            onClick={clearSelectedImage}
            className="p-1.5 rounded-full bg-neutral-200 hover:bg-neutral-300 text-neutral-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4. BROADCAST MODE BANNER (When student posting is paused) */}
      {!settings.studentCanPost && !isMentorOrFaculty && (
        <div className="shrink-0 bg-[#f0f2f5] border-t border-neutral-300 px-4 py-2.5 text-center text-xs text-neutral-600 flex items-center justify-center gap-2">
          <Lock className="w-3.5 h-3.5 text-neutral-500" />
          <span>Broadcast Mode: Only Mentors and Faculty can post at this time.</span>
        </div>
      )}

      {/* 5. WHATSAPP BOTTOM INPUT TRAY */}
      {(settings.studentCanPost || isMentorOrFaculty) && (
        <form
          onSubmit={handleSendMessage}
          className="shrink-0 bg-[#f0f2f5] px-2 py-2 border-t border-neutral-200/90 flex items-center gap-1.5 safe-area-bottom"
        >
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          {/* Paperclip / Attachment Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending || isUploading}
            className="p-2 rounded-full text-[#54656f] hover:text-[#111b21] hover:bg-black/5 transition-colors cursor-pointer active:scale-95"
            title="Attach photo"
          >
            <Paperclip className="w-5 h-5 -rotate-45" />
          </button>

          {/* Question Tag Chip */}
          <button
            type="button"
            onClick={() => setIsQuestion(!isQuestion)}
            className={cn(
              'px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 border shrink-0',
              isQuestion
                ? 'bg-[#00a884] text-white border-[#00a884]'
                : 'bg-white text-[#54656f] border-neutral-300 hover:bg-neutral-100'
            )}
            title="Toggle Question mode"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Question</span>
          </button>

          {/* WhatsApp Pill Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isQuestion ? 'Ask mentors a question...' : 'Message'}
              disabled={isSending}
              className="w-full bg-white text-[#111b21] placeholder:text-[#8696a0] text-sm px-4 py-2 rounded-2xl border border-transparent focus:outline-none focus:ring-1 focus:ring-[#00a884] shadow-xs"
            />
          </div>

          {/* WhatsApp Circular Green Send Button */}
          <button
            type="submit"
            disabled={isSending || isUploading || (!inputText.trim() && !selectedImage)}
            className={cn(
              'w-10 h-10 rounded-full bg-[#00a884] text-white flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-90 shrink-0',
              (!inputText.trim() && !selectedImage) || isSending
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:bg-[#008f6f]'
            )}
            title="Send"
          >
            {isSending || isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Send className="w-4 h-4 text-white -ml-0.5" />
            )}
          </button>
        </form>
      )}

      {/* 6. WHATSAPP STYLE CHANNEL INFO MODAL */}
      {showChannelInfo && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowChannelInfo(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-5 space-y-4 text-neutral-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#008069]" />
                Channel Info
              </h2>
              <button
                onClick={() => setShowChannelInfo(false)}
                className="p-1 rounded-full hover:bg-neutral-100 text-neutral-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center space-y-2 py-2">
              <div className="w-16 h-16 rounded-full bg-[#075e54] text-white text-xl font-bold flex items-center justify-center mx-auto shadow-sm">
                SC
              </div>
              <h3 className="font-bold text-base">Sangam Open Channel</h3>
              <p className="text-xs text-neutral-500">Official Community Channel • Summit 2027</p>
            </div>

            <div className="space-y-2 bg-neutral-50 p-3 rounded-xl border text-xs text-neutral-600">
              <div className="flex items-center justify-between">
                <span className="font-medium text-neutral-500">Participants:</span>
                <span className="font-bold text-neutral-800">Mentors, Faculty, Students</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-neutral-500">Current Status:</span>
                <span
                  className={cn(
                    'font-bold',
                    settings.studentCanPost ? 'text-[#008069]' : 'text-amber-600'
                  )}
                >
                  {settings.studentCanPost ? 'Open Discussion' : 'Broadcast Only'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-neutral-500">Total Messages:</span>
                <span className="font-bold text-neutral-800">{messages.length}</span>
              </div>
            </div>

            <div className="text-[11px] text-neutral-500 leading-relaxed">
              Use this channel to ask questions to mentors, receive official announcements, share
              technical updates, and collaborate across teams.
            </div>

            <button
              onClick={() => setShowChannelInfo(false)}
              className="w-full py-2.5 rounded-xl bg-[#075e54] hover:bg-[#008069] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Back to Chat
            </button>
          </div>
        </div>
      )}

      {/* 7. IMAGE LIGHTBOX MODAL */}
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
