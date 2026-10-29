// Vercel Serverless senkronizasyon endpoint'i.
// Veri artık sunucu belleğinde DEĞİL, Firestore'da (sync/state belgesi) tutulur;
// bu yüzden Vercel örnekleri kapanıp açılsa da veri kaybolmaz ve herkes aynı veriyi görür.
// Gerekli: Vercel > Settings > Environment Variables > FIREBASE_SERVICE_ACCOUNT (push için zaten var).

import { getDb } from './_lib/admin.js';

const STATE_PATH = ['sync', 'state'];
const READ_CACHE_MS = 2000; // Firestore okuma sayısını azaltmak için kısa önbellek

let readCache = { at: 0, state: null };

function emptyState() {
  return { match: null, ts: 0, invites: {} };
}

function getInviteTimestamp(inv) {
  if (!inv) return 0;
  const reqTs = inv.requestedAt ? Date.parse(inv.requestedAt) || 0 : 0;
  const respTs = inv.respondedAt ? Date.parse(inv.respondedAt) || 0 : 0;
  return inv.status === 'pending' ? reqTs : Math.max(reqTs, respTs);
}

function mergeInvitesMap(base = {}, incoming = {}) {
  const merged = { ...base };
  for (const [pid, inc] of Object.entries(incoming || {})) {
    if (!inc || !inc.playerId) continue;
    const existing = merged[pid];
    if (!existing || getInviteTimestamp(inc) >= getInviteTimestamp(existing)) {
      merged[pid] = existing ? { ...existing, ...inc } : inc;
    }
  }
  return merged;
}

function applyInvitesToMatch(match, invites) {
  if (!match || !match.id) return match;
  const attendance = { ...(match.attendance || {}) };
  const requests = { ...(match.attendanceRequests || {}) };
  const timestamps = { ...(match.attendanceTimestamps || {}) };

  for (const [pid, inv] of Object.entries(invites || {})) {
    if (!inv || !inv.playerId) continue;
    const existingReq = requests[pid];
    if (existingReq && getInviteTimestamp(inv) < getInviteTimestamp(existingReq)) continue;

    if (inv.status === 'pending') {
      requests[pid] = {
        playerId: pid,
        requestedAt: inv.requestedAt,
        requestedBy: inv.requestedBy || 'Konsey',
        status: 'pending',
      };
      attendance[pid] = 'Haber Bekleniyor';
      timestamps[pid] = inv.requestedAt;
    } else if (inv.status === 'responded') {
      requests[pid] = {
        playerId: pid,
        requestedAt: inv.requestedAt,
        requestedBy: inv.requestedBy || 'Konsey',
        status: 'responded',
        respondedAt: inv.respondedAt || new Date().toISOString(),
      };
      if (inv.responseStatus) attendance[pid] = inv.responseStatus;
      if (inv.respondedAt) timestamps[pid] = inv.respondedAt;
    }
  }
  return { ...match, attendance, attendanceRequests: requests, attendanceTimestamps: timestamps };
}

// Aynı maç için gelen güncellemede, oyuncu bazında YENİ olan katılım bilgisi kazanır.
// (Eski bir telefon, eski katılım durumlarıyla yeni durumları ezemez.)
function mergeSameMatch(current, incoming) {
  const attendance = { ...(current.attendance || {}) };
  const timestamps = { ...(current.attendanceTimestamps || {}) };
  const incAtt = incoming.attendance || {};
  const incTs = incoming.attendanceTimestamps || {};

  for (const pid of Object.keys(incAtt)) {
    const curT = Date.parse(timestamps[pid] || '') || 0;
    const newT = Date.parse(incTs[pid] || '') || 0;
    if (!(pid in attendance) || newT >= curT) {
      attendance[pid] = incAtt[pid];
      if (incTs[pid]) timestamps[pid] = incTs[pid];
    }
  }
  return {
    ...incoming,
    attendance,
    attendanceTimestamps: timestamps,
    attendanceRequests: {
      ...(current.attendanceRequests || {}),
      ...(incoming.attendanceRequests || {}),
    },
  };
}

function isDefaultMatch(m) {
  return m && m.id === 'match_current' && (m.matchNumber || 44) <= 44;
}

// Farklı id'li bir maçın mevcut maçın yerine geçip geçemeyeceği.
// "Son yazan kazanır" YOK: sadece daha yüksek maç numarası ya da aynı numarada daha yeni oluşturulmuş maç kazanır.
function canReplaceWithDifferentMatch(cur, inc) {
  if (!cur || !cur.id) return true;
  if (isDefaultMatch(inc) && !isDefaultMatch(cur)) return false;
  if (isDefaultMatch(cur) && !isDefaultMatch(inc)) return true;
  const cn = cur.matchNumber || 0;
  const inn = inc.matchNumber || 0;
  if (inn > cn) return true;
  if (inn < cn) return false;
  return (inc.createdAt || 0) > (cur.createdAt || 0);
}

async function loadState(db) {
  const snap = await db.collection(STATE_PATH[0]).doc(STATE_PATH[1]).get();
  return snap.exists ? { ...emptyState(), ...snap.data() } : emptyState();
}

function respond(res, state, extra = {}) {
  const match = state.match ? applyInvitesToMatch(state.match, state.invites) : null;
  return res.status(200).json({
    ok: true,
    ts: state.ts || 0,
    match,
    invites: state.invites || {},
    serverTime: Date.now(),
    ...extra,
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') return res.status(200).end();

  let db;
  try {
    db = getDb();
  } catch (err) {
    // Asla belleğe geri dönme: sessizce boş/eski veri göstermektense hata ver.
    return res.status(503).json({ ok: false, error: 'storage_unavailable', message: err.message });
  }

  try {
    if (req.method !== 'POST') {
      const now = Date.now();
      if (!readCache.state || now - readCache.at > READ_CACHE_MS) {
        readCache = { at: now, state: await loadState(db) };
      }
      return respond(res, readCache.state);
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const now = Date.now();
    const ref = db.collection(STATE_PATH[0]).doc(STATE_PATH[1]);

    const finalState = await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      let state = snap.exists ? { ...emptyState(), ...snap.data() } : emptyState();
      let changed = false;

      // 1) Maç
      if (body.match && body.match.id) {
        const inc = body.match;
        if (!state.match || !state.match.id) {
          state = { match: inc, ts: now, invites: {} };
          state.invites = mergeInvitesMap({}, inc.attendanceRequests);
          changed = true;
        } else if (state.match.id === inc.id) {
          state.match = mergeSameMatch(state.match, inc);
          state.invites = mergeInvitesMap(state.invites, inc.attendanceRequests);
          changed = true;
        } else if (canReplaceWithDifferentMatch(state.match, inc)) {
          // Yeni maç: eski maçın davetleri yeni maça taşınmaz.
          state.match = inc;
          state.invites = mergeInvitesMap({}, inc.attendanceRequests);
          changed = true;
        }
        // else: eski/bayat bir telefon eski maçı göndermiş -> yok say
      }

      // 2) Davetler (sadece mevcut maça ait olanlar)
      const curId = state.match && state.match.id;
      if (curId) {
        const bodyMatchOk = !body.match || body.match.id === curId;
        const accept = inv => inv && inv.playerId && (!inv.matchId || inv.matchId === curId) && bodyMatchOk;

        if (body.invites && typeof body.invites === 'object' && bodyMatchOk) {
          const ok = {};
          for (const [pid, inv] of Object.entries(body.invites)) if (accept(inv)) ok[pid] = inv;
          state.invites = mergeInvitesMap(state.invites, ok);
          changed = true;
        }
        if (accept(body.invite)) {
          state.invites = mergeInvitesMap(state.invites, { [body.invite.playerId]: body.invite });
          changed = true;
        }
        state.match = applyInvitesToMatch(state.match, state.invites);
      }

      if (changed) {
        state.ts = now;
        tx.set(ref, state);
      }
      return state;
    });

    readCache = { at: Date.now(), state: finalState };
    return respond(res, finalState);
  } catch (err) {
    console.error('sync error:', err && err.message);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}
