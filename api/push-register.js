// Oyuncunun telefon bildirim adresini (FCM token) Firestore'a kaydeder.
import { FieldValue } from 'firebase-admin/firestore';
import { getDb, readJsonBody, ID_RE } from './_lib/admin.js';

const MAX_TOKENS_PER_PLAYER = 8;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const { playerId, token } = readJsonBody(req);
  if (
    typeof playerId !== 'string' ||
    !ID_RE.test(playerId) ||
    typeof token !== 'string' ||
    token.length < 20 ||
    token.length > 4096
  ) {
    return res.status(400).json({ ok: false, error: 'invalid_payload' });
  }

  try {
    const ref = getDb().collection('pushTokens').doc(playerId);
    const snap = await ref.get();
    const current = snap.exists && Array.isArray(snap.data().tokens) ? snap.data().tokens : [];
    const next = current.includes(token)
      ? current
      : [...current, token].slice(-MAX_TOKENS_PER_PLAYER);

    await ref.set({ tokens: next, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('push-register error:', err && err.message);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}
