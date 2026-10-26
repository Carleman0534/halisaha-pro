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

export async function sendSystemNotification({
  title,
  body,
  icon = '/pwa-192x192.png',
  badge = '/pwa-192x192.png',
  tag = 'halisaha-alert',
}: SystemNotificationOptions): Promise<boolean> {
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
