'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import {
  registerServiceWorker,
  getNotificationPermission,
  requestNotificationPermission,
  sendDevicePushNotification,
} from '@/lib/push-notifications';
import { Announcement, Room } from '@/types';
import { Bell, Check, X, ShieldAlert } from 'lucide-react';

export function NotificationListener() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showPromptBanner, setShowPromptBanner] = useState(false);

  const seenAnnouncementsRef = useRef<Set<string>>(new Set());
  const seenRoomsRef = useRef<Set<string>>(new Set());
  const seenMessagesRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef<boolean>(true);

  // 1. Register service worker and check permission on mount
  useEffect(() => {
    registerServiceWorker();
    const currentPerm = getNotificationPermission();
    setPermission(currentPerm);

    // Show prompt if user hasn't decided yet and hasn't dismissed it
    const dismissed = localStorage.getItem('sangam_notif_prompt_dismissed');
    if (currentPerm === 'default' && !dismissed) {
      // Delay prompt slightly so it feels natural
      const timer = setTimeout(() => setShowPromptBanner(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleEnableNotifications = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
    setShowPromptBanner(false);
    if (res === 'granted') {
      sendDevicePushNotification({
        title: '🔔 Push Notifications Enabled!',
        body: 'You will now receive instant alerts for announcements, messages, and room sessions.',
        url: '/student',
        tag: 'welcome-notification',
      });
    }
  };

  const handleDismissPrompt = () => {
    setShowPromptBanner(false);
    localStorage.setItem('sangam_notif_prompt_dismissed', 'true');
  };

  // 2. Poll for new Announcements and new Rooms periodically (respects tab visibility)
  useEffect(() => {
    const checkUpdates = async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return; // Skip polling when browser tab is inactive/minimized
      }

      try {
        const res = await fetch('/api/data?include=announcements,rooms');
        if (!res.ok) return;
        const data = await res.json();

        const announcements: Announcement[] = data.announcements || [];
        const rooms: Room[] = (data.rooms || []).filter((r: Room) => r.isActive);

        // First load: seed the seen sets so we don't spam old notifications
        if (isInitialLoadRef.current) {
          announcements.forEach((a) => seenAnnouncementsRef.current.add(a.id));
          rooms.forEach((r) => seenRoomsRef.current.add(r.id));
          isInitialLoadRef.current = false;
          return;
        }

        // Check for new announcements
        announcements.forEach((ann) => {
          if (!seenAnnouncementsRef.current.has(ann.id)) {
            seenAnnouncementsRef.current.add(ann.id);
            const msgSnippet = ann.message ? ann.message.substring(0, 120) + (ann.message.length > 120 ? '...' : '') : 'New announcement posted';
            sendDevicePushNotification({
              title: `📢 Announcement: ${ann.title}`,
              body: msgSnippet,
              url: '/student',
              tag: `ann-${ann.id}`,
            });
          }
        });

        // Check for new rooms
        rooms.forEach((room) => {
          if (!seenRoomsRef.current.has(room.id)) {
            seenRoomsRef.current.add(room.id);
            sendDevicePushNotification({
              title: `📝 New Session Live: ${room.title}`,
              body: room.purpose || 'Tap to participate and confirm attendance',
              url: `/rooms/${room.id}`,
              tag: `room-${room.id}`,
            });
          }
        });
      } catch (err) {
        // Silent background check failure
      }
    };

    checkUpdates();
    const interval = setInterval(checkUpdates, 15000);

    const onVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        checkUpdates();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  // 3. Listen to live Channel messages
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    import('@/lib/firebase-db').then(({ subscribeToChannelMessages }) => {
      unsubscribe = subscribeToChannelMessages((messages) => {
        if (!messages || messages.length === 0) return;

        // Seed on first load
        if (seenMessagesRef.current.size === 0) {
          messages.forEach((m) => seenMessagesRef.current.add(m.id));
          return;
        }

        messages.forEach((msg) => {
          if (!seenMessagesRef.current.has(msg.id)) {
            seenMessagesRef.current.add(msg.id);

            // Don't notify the author about their own message
            const isMine =
              user &&
              ((user.id && msg.senderId === user.id) ||
                (user.email && msg.senderEmail?.toLowerCase() === user.email.toLowerCase()));

            if (!isMine) {
              const bodySnippet =
                msg.content || (msg.imageUrl ? '📷 Shared an image' : 'New message received');
              sendDevicePushNotification({
                title: `💬 ${msg.senderName || 'Community Chat'}`,
                body: bodySnippet,
                url: '/student/channels',
                tag: `msg-${msg.id}`,
              });
            }
          }
        });
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  if (!showPromptBanner) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 animate-in fade-in slide-in-from-bottom-5">
      <div className="p-4 rounded-2xl bg-neutral-950 text-white shadow-2xl border border-neutral-800 flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center shrink-0 mt-0.5">
          <Bell className="w-4 h-4 animate-bounce" />
        </div>
        <div className="flex-1 space-y-1">
          <h4 className="text-xs font-bold tracking-tight">Enable Push Notifications</h4>
          <p className="text-[11px] text-neutral-400 leading-relaxed">
            Get real-time alerts for announcements, channel messages, and live attendance rooms.
          </p>
          <div className="pt-2 flex items-center gap-2">
            <button
              onClick={handleEnableNotifications}
              className="px-3 py-1.5 rounded-lg bg-white text-neutral-950 text-xs font-bold hover:bg-neutral-200 transition-colors"
            >
              Turn On Alerts
            </button>
            <button
              onClick={handleDismissPrompt}
              className="px-2.5 py-1.5 rounded-lg text-neutral-400 hover:text-white text-xs transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>
        <button
          onClick={handleDismissPrompt}
          className="text-neutral-400 hover:text-white p-1"
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
