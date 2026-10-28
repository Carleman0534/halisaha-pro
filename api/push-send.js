// Bir oyuncunun kayıtlı telefonlarına (uygulama kapalıyken bile) bildirim gönderir.
import { FieldValue } from 'firebase-admin/firestore';
import { getDb, getFcm, readJsonBody, ID_RE } from './_lib/admin.js';

// Aynı oyuncuya art arda gönderimi sınırla (sıcak sunucu örneği içinde).
const lastSent = new Map();
const MIN_GAP_MS = 5000;

const BAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

function clean(value, max) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, max);
}

function buildMessage({ type, playerName, matchNumber, requestedBy }) {
  const no = Number.isInteger(matchNumber) && matchNumber > 0 && matchNumber < 1000 ? matchNumber : null;
  const matchText = no ? `${no}. Hafta maçına` : 'maça';
  const by = clean(requestedBy, 40) || 'Konsey';
  const name = clean(playerName, 40);

  if (type === 'reminder') {
    return {
      title: `⏰ ${no ? `${no}. Hafta ` : ''}Yoklama Hatırlatması`,
      body: `${by} katılım durumunu bekliyor. Maça geliyor musun?`,
    };
  }
  return {
    title: name ? `⚽ ${name} — Maça Geliyor musun?` : '⚽ Maça Geliyor musun?',
    body: `${by} seni ${matchText} davet etti! Katılım durumunu seçmek için dokun.`,
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const body = readJsonBody(req);
  const { playerId, matchId } = body;
  const type = body.type === 'reminder' ? 'reminder' : 'invite';

  if (typeof playerId !== 'string' || !ID_RE.test(playerId)) {
    return res.status(400).json({ ok: false, error: 'invalid_payload' });
  }

  const rateKey = `${type}:${playerId}`;
  const now = Date.now();
  if (now - (lastSent.get(rateKey) || 0) < MIN_GAP_MS) {
    return res.status(200).json({ ok: true, sent: 0, reason: 'rate_limited' });
  }
  lastSent.set(rateKey, now);

  try {
    const db = getDb();
    const ref = db.collection('pushTokens').doc(playerId);
    const snap = await ref.get();
    const tokens = snap.exists && Array.isArray(snap.data().tokens) ? snap.data().tokens : [];

    if (tokens.length === 0) {
      return res.status(200).json({ ok: true, sent: 0, reason: 'no_token' });
    }

    const { title, body: text } = buildMessage({
      type,
      playerName: body.playerName,
      matchNumber: body.matchNumber,
      requestedBy: body.requestedBy,
    });

    // Uygulama açıkken yerel bildirimle aynı "tag" kullanılır; böylece çift bildirim çıkmaz.
    const tag =
      type === 'invite' && typeof matchId === 'string' && ID_RE.test(matchId)
        ? `invite-req-${matchId}-${playerId}`
        : `${type}-${playerId}`;

    const response = await getFcm().sendEachForMulticast({
      tokens,
      data: { title, body: text, tag, url: '/' },
      webpush: { headers: { Urgency: 'high', TTL: '86400' } },
    });

    // Geçersiz (silinmiş / süresi dolmuş) token'ları temizle.
    const dead = [];
    response.responses.forEach((r, i) => {
      if (!r.success && r.error && BAD_TOKEN_CODES.has(r.error.code)) dead.push(tokens[i]);
    });
    if (dead.length) {
      await ref.update({ tokens: FieldValue.arrayRemove(...dead) }).catch(() => {});
    }

    return res.status(200).json({
      ok: true,
      sent: response.successCount,
      failed: response.failureCount,
      reason: response.successCount === 0 ? 'delivery_failed' : undefined,
    });
  } catch (err) {
    console.error('push-send error:', err && err.message);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}
