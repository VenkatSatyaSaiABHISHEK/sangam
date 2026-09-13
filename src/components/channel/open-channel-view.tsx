'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Image as ImageIcon,
  Paperclip,
  CheckCheck,
  HelpCircle,
  Lock,
  Unlock,
  X,
  Download,
  Loader2,
  Sparkles,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';

interface OpenChannelViewProps {
  backPath?: string;
  userRoleOverride?: UserRole;
}

// Gentle notification sound using Web Audio API (no external asset needed)
function playMessageSound() {
  if (typeof window === 'undefined') return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialLoadRef = useRef(true);

  // Auto-scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Mark messages as read in localStorage
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
        console.warn('Initial channel fetch failed:', err);
      }
    };
    initFetch();

    // 2. Real-time Firestore subscription
    const unsubscribe = subscribeToChannelMessages((liveMessages) => {
      setMessages(liveMessages);

      // Play sound for incoming messages from others
      if (!initialLoadRef.current && liveMessages.length > 0) {
        const last = liveMessages[liveMessages.length - 1];
        if (last && last.senderId !== user?.id && last.senderEmail !== user?.email) {
          playMessageSound();
        }
      }
      initialLoadRef.current = false;
      markAsRead();
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    scrollToBottom(initialLoadRef.current ? 'auto' : 'smooth');
  }, [messages.length]);

  // Handle image selection
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
          ? 'Students can now participate and send messages in discussion.'
          : 'Channel switched to Broadcast Mode (Mentors & Faculty only).',
        'info'
      );
    } catch {
      showToast('Error', 'Failed to update channel settings.', 'error');
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  // Send message
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

    // If image selected, upload first
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

    try {
      // Direct Firestore save
      await saveChannelMessage(newMsg);

      // Serverless API backup
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
    <div className="flex flex-col h-[100dvh] w-full max-w-2xl mx-auto bg-neutral-100 text-neutral-900 overflow-hidden font-sans border-x border-neutral-300 shadow-2xl relative">
      {/* 1. TOP HEADER (Sleek Monochrome / Black & White) */}
      <header className="shrink-0 bg-neutral-950 text-white px-4 py-3 flex items-center justify-between shadow-md select-none z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Channel Avatar & Info */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-white text-neutral-950 font-black flex items-center justify-center text-sm shadow-inner border border-neutral-200">
              SC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight text-white leading-tight">
                  Sangam Open Channel
                </h1>
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" title="Live" />
              </div>
              <p className="text-[11px] text-neutral-400 leading-tight truncate max-w-[200px] sm:max-w-xs">
                Mentors, Faculty & Students Community Hub
              </p>
            </div>
          </div>
        </div>

        {/* Right side: Permission mode badge & Toggle */}
        <div className="flex items-center gap-2">
          {isMentorOrFaculty && (
            <button
              onClick={handleTogglePermissions}
              disabled={isUpdatingSettings}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border cursor-pointer',
                settings.studentCanPost
                  ? 'bg-neutral-900 border-neutral-700 text-white hover:bg-neutral-800'
                  : 'bg-white border-neutral-300 text-neutral-950 hover:bg-neutral-100'
              )}
              title="Toggle student participation permission"
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

          {!isMentorOrFaculty && (
            <div
              className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1',
                settings.studentCanPost
                  ? 'bg-neutral-900 border-neutral-700 text-neutral-300'
                  : 'bg-white border-neutral-300 text-neutral-900'
              )}
            >
              {settings.studentCanPost ? 'Chat Open' : 'Broadcast Only'}
            </div>
          )}
        </div>
      </header>

      {/* 2. CHAT STREAM (Monochrome / Black & White WhatsApp-style layout) */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-[#f8f9fa] relative">
        {/* Topic Banner */}
        <div className="text-center my-2">
          <span className="inline-block px-3 py-1 bg-white border border-neutral-200/90 rounded-full text-[11px] text-neutral-600 font-medium shadow-xs">
            💬 Summit 2027 Official Open Discussion
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

          const timeStr = new Date(msg.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div
              key={msg.id}
              className={cn(
                'flex flex-col max-w-[85%] sm:max-w-[75%] transition-all duration-200',
                isMe ? 'ml-auto items-end' : 'mr-auto items-start'
              )}
            >
              {/* Sender Name & Role Label (for incoming messages) */}
              {!isMe && (
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] font-semibold text-neutral-700">
                  <span>{msg.senderName}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-md font-mono uppercase bg-neutral-200 text-neutral-800 border border-neutral-300">
                    {roleDisplay}
                  </span>
                  {msg.teamName && (
                    <span className="text-[10px] text-neutral-400 font-normal">
                      • {msg.teamName}
                    </span>
                  )}
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={cn(
                  'rounded-2xl p-3 shadow-xs relative text-sm select-text break-words border',
                  isMe
                    ? 'bg-neutral-950 text-white border-neutral-900 rounded-tr-xs'
                    : 'bg-white text-neutral-950 border-neutral-200 rounded-tl-xs'
                )}
              >
                {/* Question Badge */}
                {msg.isQuestion && (
                  <div
                    className={cn(
                      'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mb-1.5 uppercase tracking-wider',
                      isMe
                        ? 'bg-white/15 text-white border border-white/20'
                        : 'bg-neutral-100 text-neutral-900 border border-neutral-300'
                    )}
                  >
                    <HelpCircle className="w-3 h-3" /> Question
                  </div>
                )}

                {/* Attached Image */}
                {msg.imageUrl && (
                  <div className="mb-2 overflow-hidden rounded-xl border border-black/10">
                    <img
                      src={msg.imageUrl}
                      alt="Channel attachment"
                      onClick={() => setActiveLightboxImg(msg.imageUrl || null)}
                      className="w-full max-h-72 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                      loading="lazy"
                    />
                  </div>
                )}

                {/* Content Text */}
                {msg.content && <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>}

                {/* Footer: Timestamp & Checkmarks */}
                <div
                  className={cn(
                    'flex items-center justify-end gap-1 mt-1 text-[10px]',
                    isMe ? 'text-neutral-400' : 'text-neutral-400'
                  )}
                >
                  <span>{timeStr}</span>
                  {isMe && <CheckCheck className="w-3.5 h-3.5 text-neutral-300" />}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. ATTACHMENT PREVIEW (if image selected) */}
      {imagePreview && (
        <div className="shrink-0 px-4 py-2 bg-neutral-200 border-t border-neutral-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={imagePreview}
              alt="Attachment preview"
              className="w-12 h-12 rounded-lg object-cover border border-neutral-400"
            />
            <div className="text-xs">
              <p className="font-semibold text-neutral-800">Photo attached</p>
              <p className="text-[10px] text-neutral-500">Ready to send with your message</p>
            </div>
          </div>
          <button
            onClick={clearSelectedImage}
            className="p-1 rounded-full bg-neutral-300 hover:bg-neutral-400 text-neutral-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4. READ-ONLY BANNER FOR STUDENTS (When toggled off) */}
      {!settings.studentCanPost && !isMentorOrFaculty && (
        <div className="shrink-0 bg-neutral-200 border-t border-neutral-300 p-3 text-center text-xs text-neutral-700 flex items-center justify-center gap-2">
          <Lock className="w-4 h-4 text-neutral-600" />
          <span>Broadcast Mode: Only Mentors and Faculty can post. Students can read updates.</span>
        </div>
      )}

      {/* 5. BOTTOM INPUT BAR (Sleek Monochrome / Black & White) */}
      {(settings.studentCanPost || isMentorOrFaculty) && (
        <form
          onSubmit={handleSendMessage}
          className="shrink-0 sticky bottom-0 z-20 bg-white border-t border-neutral-300 p-3 flex items-center gap-2 shadow-lg"
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
            className="p-2.5 rounded-full text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 transition-colors cursor-pointer active:scale-95"
            title="Attach a photo"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          {/* Question Tag Toggle Button */}
          <button
            type="button"
            onClick={() => setIsQuestion(!isQuestion)}
            className={cn(
              'p-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border',
              isQuestion
                ? 'bg-neutral-950 text-white border-neutral-950'
                : 'bg-neutral-100 text-neutral-600 border-neutral-200 hover:bg-neutral-200'
            )}
            title="Mark as Question / Q&A"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isQuestion ? 'Type your question for mentors...' : 'Type a message...'}
              disabled={isSending}
              className="w-full bg-neutral-100 text-neutral-900 placeholder:text-neutral-400 text-sm px-4 py-2.5 rounded-full border border-neutral-300 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all"
            />
          </div>

          {/* Send Button (Solid Black Circular Action) */}
          <button
            type="submit"
            disabled={isSending || isUploading || (!inputText.trim() && !selectedImage)}
            className={cn(
              'w-10 h-10 rounded-full bg-neutral-950 text-white flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-90',
              (!inputText.trim() && !selectedImage) || isSending
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:bg-neutral-800'
            )}
            title="Send message"
          >
            {isSending || isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Send className="w-4 h-4 text-white -ml-0.5" />
            )}
          </button>
        </form>
      )}

      {/* 6. IMAGE LIGHTBOX MODAL */}
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
            alt="Enlarged preview"
            className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-white/20"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
