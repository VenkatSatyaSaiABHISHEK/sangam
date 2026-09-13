// Push Notifications & Service Worker Integration for SangamConnect

export interface DeviceNotificationPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
  data?: Record<string, any>;
}

/**
 * Register Service Worker for PWA and push notifications
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    return registration;
  } catch (err) {
    console.warn('Service Worker registration failed:', err);
    return null;
  }
}

/**
 * Get current notification permission state
 */
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  try {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      await registerServiceWorker();
    }
    return perm;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return 'denied';
  }
}

/**
 * Play gentle notification chime via Web Audio API
 */
export function playNotificationChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch {
    // Ignore audio autoplay restrictions
  }
}

/**
 * Send a device push notification (shows in Android notification shade, Windows/Mac Action Center, lock screen)
 */
export async function sendDevicePushNotification(payload: DeviceNotificationPayload): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  // Play audio chime
  playNotificationChime();

  const title = payload.title || 'SangamConnect';
  const options: NotificationOptions = {
    body: payload.body,
    icon: payload.icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: payload.tag || `sangam-${Date.now()}`,
    data: {
      url: payload.url || '/',
      ...(payload.data || {}),
    },
  };

  // Try via active Service Worker registration first (standard for PWAs and mobile background)
  if ('serviceWorker' in navigator) {
    try {
      let reg: ServiceWorkerRegistration | null | undefined = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await registerServiceWorker();
      }
      if (reg && 'showNotification' in reg) {
        await (reg as any).showNotification(title, {
          ...options,
          vibrate: [200, 100, 200],
        });
        return true;
      }
    } catch (err) {
      console.warn('SW showNotification failed, falling back to window Notification:', err);
    }
  }

  // Fallback to desktop Notification API
  try {
    const notif = new Notification(title, options);
    notif.onclick = () => {
      window.focus();
      if (payload.url) {
        window.location.href = payload.url;
      }
      notif.close();
    };
    return true;
  } catch (err) {
    console.warn('Window Notification failed:', err);
    return false;
  }
}
