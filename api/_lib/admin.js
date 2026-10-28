// Firebase Admin başlatma yardımcısı (yalnızca sunucuda çalışır).
// Vercel > Settings > Environment Variables içine FIREBASE_SERVICE_ACCOUNT eklenmelidir.
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

function init() {
  const existing = getApps();
  if (existing.length) return existing[0];

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT tanımlı değil');
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(raw);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT geçerli bir JSON değil');
  }
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }
  return initializeApp({ credential: cert(serviceAccount) });
}

export function getDb() {
  init();
  return getFirestore();
}

export function getFcm() {
  init();
  return getMessaging();
}

export function readJsonBody(req) {
  try {
    if (typeof req.body === 'string') return JSON.parse(req.body);
    return req.body || {};
  } catch {
    return {};
  }
}

export const ID_RE = /^[A-Za-z0-9_-]{1,80}$/;
