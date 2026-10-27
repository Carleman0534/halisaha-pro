// Notification Service for Web & PWA Mobile

export interface SystemNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    console.warn('Notifications not supported in this browser environment');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
}

export function playNotificationChimeAndVibrate(): void {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([250, 100, 250]);
    }
  } catch {}

  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Two-tone pleasant alert chime (E5 -> A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    osc1.frequency.setValueAtTime(880, now + 0.14);

    gain1.gain.setValueAtTime(0.22, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.45);
  } catch {}
}

export async function sendSystemNotification({
  title,
  body,
  icon = '/pwa-192x192.png',
  badge = '/pwa-192x192.png',
  tag = 'halisaha-alert',
}: SystemNotificationOptions): Promise<boolean> {
  playNotificationChimeAndVibrate();

  if (!isNotificationSupported()) return false;

  if (Notification.permission !== 'granted') {
    const perm = await requestNotificationPermission();
    if (perm !== 'granted') return false;
  }

  try {
    // If Service Worker is ready, use showNotification (works on Mobile PWA lockscreen)
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          await registration.showNotification(title, {
            body,
            icon,
            badge,
            tag,
          });
          return true;
        }
      } catch (swErr) {
        console.warn('Service worker showNotification fallback to new Notification:', swErr);
      }
    }

    // Direct Browser Notification fallback
    new Notification(title, {
      body,
      icon,
      badge,
      tag,
    });
    return true;
  } catch (err) {
    console.error('Failed to trigger notification:', err);
    return false;
  }
}

// Preset Quick Halı Saha Notifications
export async function sendTestNotification(): Promise<boolean> {
  return sendSystemNotification({
    title: '⚽ Halı Saha Pro Bildirimleri Aktif!',
    body: 'Tebrikler! Maç hatırlatmaları, acil eksik çağrıları ve yoklama bildirimleri artık anında ekranınıza gelecek.',
    tag: 'halisaha-test',
  });
}

export async function sendMatchReminderNotification(
  dayName: string,
  timeStr: string,
  venue: string
): Promise<boolean> {
  return sendSystemNotification({
    title: `⚽ Maç Günü Geldi! (${dayName} ${timeStr})`,
    body: `${venue} sahasında maçınız var. Kramponları hazırlayın ve vaktinde sahada olun!`,
    tag: 'halisaha-match-day',
  });
}

export async function sendMissingPlayerNotification(missingCount: number): Promise<boolean> {
  return sendSystemNotification({
    title: `🚨 Acil ${missingCount} Oyuncu Eksik!`,
    body: `Bu haftaki maç kadromuzu tamamlamak için ${missingCount} kişiye ihtiyaç var. Acil Çağrı aracından WhatsApp daveti atın!`,
    tag: 'halisaha-missing-player',
  });
}

export async function sendPaymentReminderNotification(costPerPlayer: number): Promise<boolean> {
  return sendSystemNotification({
    title: `💳 Halı Saha Ücret Hatırlatması`,
    body: `Kişi başı ${costPerPlayer} ₺ saha ücreti toplanıyor. Ödemenizi IBAN veya FAST Karekod ile yapabilirsiniz.`,
    tag: 'halisaha-payment',
  });
}

export async function sendOneDayBeforeReminder(
  dayName: string,
  timeStr: string,
  venue: string
): Promise<boolean> {
  return sendSystemNotification({
    title: `⏰ YARIN MAÇ GÜNÜ! (${dayName} ${timeStr})`,
    body: `Yarın ${timeStr} saatinde ${venue} sahasında maçınız var! Kadroda yeriniz ayrıldı, çantaları bu akşamdan hazırlayın.`,
    tag: 'halisaha-one-day-before',
  });
}
