// Gerçek Web Push (FCM) istemci tarafı.
// Uygulama kapalıyken bile bildirim gelmesi için telefonun bildirim adresi (token)
// sunucuya kaydedilir; "Sor" butonuna basılınca sunucu bu adrese bildirim yollar.
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';

const PUSH_APP_NAME = 'halisaha-push';

const firebaseWebConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

export interface PushSendResult {
  ok: boolean;
  sent: number;
  reason?: 'no_token' | 'rate_limited' | 'delivery_failed' | 'unavailable' | 'error';
}

export function isPushConfigured(): boolean {
  return Boolean(
    firebaseWebConfig.apiKey &&
      firebaseWebConfig.projectId &&
      firebaseWebConfig.messagingSenderId &&
      firebaseWebConfig.appId &&
      VAPID_KEY
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      err => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function getPushApp(): FirebaseApp {
  const existing = getApps().find(app => app.name === PUSH_APP_NAME);
  if (existing) return existing;
  try {
    return initializeApp(firebaseWebConfig, PUSH_APP_NAME);
  } catch {
    return getApp(PUSH_APP_NAME);
  }
}

async function getDeviceToken(): Promise<string | null> {
  if (!isPushConfigured()) return null;
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('Notification' in window) ||
    Notification.permission !== 'granted'
  ) {
    return null;
  }

  const { isSupported, getMessaging, getToken } = await import('firebase/messaging');
  if (!(await isSupported())) return null;

  const registration = await withTimeout(navigator.serviceWorker.ready, 8000);
  const token = await getToken(getMessaging(getPushApp()), {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  return token || null;
}

/**
 * Bildirim izni verilmişse bu cihazın token'ını sunucuya kaydeder.
 * Aynı token 24 saat içinde tekrar gönderilmez.
 */
export async function syncPushRegistration(playerId: string): Promise<boolean> {
  if (!playerId) return false;
  try {
    const token = await getDeviceToken();
    if (!token) return false;

    const storageKey = `halisaha_push_reg_${playerId}`;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (saved && saved.token === token && Date.now() - saved.ts < 24 * 60 * 60 * 1000) {
        return true;
      }
    } catch {}

    const res = await fetch('/api/push-register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, token }),
    });
    if (!res.ok) return false;

    try {
      localStorage.setItem(storageKey, JSON.stringify({ token, ts: Date.now() }));
    } catch {}
    return true;
  } catch (err) {
    console.warn('Push kaydı yapılamadı:', err);
    return false;
  }
}

export interface PushRequest {
  type: 'invite' | 'reminder';
  playerId: string;
  playerName?: string;
  matchId?: string;
  matchNumber?: number;
  requestedBy?: string;
}

/** Sunucudan, ilgili oyuncunun telefonlarına bildirim göndermesini ister. */
export async function sendPushNotification(request: PushRequest): Promise<PushSendResult> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    const res = await fetch('/api/push-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, sent: 0, reason: 'unavailable' };
    const data = await res.json();
    return {
      ok: Boolean(data.ok),
      sent: Number(data.sent) || 0,
      reason: data.reason,
    };
  } catch {
    return { ok: false, sent: 0, reason: 'error' };
  }
}
