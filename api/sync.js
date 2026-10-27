// Vercel Serverless Realtime Sync & Invitation State Endpoint
// Eliminates browser rate-limits and guarantees instant cross-device sync for "🔔 Sor" invitations

const NTFY_BACKUP_URL = 'https://ntfy.sh/halisaha_pro_srv_backup_v4';

if (!globalThis.__HALISAHA_SYNC_STORE__) {
  globalThis.__HALISAHA_SYNC_STORE__ = {
    match: null,
    ts: 0,
    invites: {},
    hydrated: false,
    lastBackupPush: 0,
  };
}

const store = globalThis.__HALISAHA_SYNC_STORE__;

function getInviteTimestamp(inv) {
  if (!inv) return 0;
  const reqTs = inv.requestedAt ? Date.parse(inv.requestedAt) || 0 : 0;
  const respTs = inv.respondedAt ? Date.parse(inv.respondedAt) || 0 : 0;
  return inv.status === 'pending' ? reqTs : Math.max(reqTs, respTs);
}

function mergeInvitesMap(baseInvites = {}, incomingInvites = {}) {
  const merged = { ...baseInvites };
  for (const [pid, inc] of Object.entries(incomingInvites)) {
    if (!inc || !inc.playerId) continue;
    const existing = merged[pid];
    if (!existing) {
      merged[pid] = inc;
      continue;
    }
    const existingTs = getInviteTimestamp(existing);
    const incTs = getInviteTimestamp(inc);
    if (incTs >= existingTs) {
      merged[pid] = { ...existing, ...inc };
    }
  }
  return merged;
}

function applyInvitesToMatch(match, invites) {
  if (!match || !match.id) return match;
  const nextAttendance = { ...(match.attendance || {}) };
  const nextRequests = { ...(match.attendanceRequests || {}) };
  const nextTimestamps = { ...(match.attendanceTimestamps || {}) };

  for (const [pid, inv] of Object.entries(invites || {})) {
    if (!inv || !inv.playerId) continue;
    const existingReq = nextRequests[pid];
    const existingTs = getInviteTimestamp(existingReq);
    const invTs = getInviteTimestamp(inv);

    if (!existingReq || invTs >= existingTs) {
      if (inv.status === 'pending') {
        nextRequests[pid] = {
          playerId: pid,
          requestedAt: inv.requestedAt,
          requestedBy: inv.requestedBy || 'Konsey',
          status: 'pending',
        };
        nextAttendance[pid] = 'Haber Bekleniyor';
        nextTimestamps[pid] = inv.requestedAt;
      } else if (inv.status === 'responded') {
        nextRequests[pid] = {
          playerId: pid,
          requestedAt: inv.requestedAt,
          requestedBy: inv.requestedBy || 'Konsey',
          status: 'responded',
          respondedAt: inv.respondedAt || new Date().toISOString(),
        };
        if (inv.responseStatus) {
          nextAttendance[pid] = inv.responseStatus;
        }
        if (inv.respondedAt) {
          nextTimestamps[pid] = inv.respondedAt;
        }
      }
    }
  }

  return {
    ...match,
    attendance: nextAttendance,
    attendanceRequests: nextRequests,
    attendanceTimestamps: nextTimestamps,
  };
}

function shouldReplaceMatch(currentMatch, incomingMatch, currentTs, incomingTs) {
  if (!currentMatch || !currentMatch.id) return true;
  if (!incomingMatch || !incomingMatch.id) return false;

  // Never let the default initial match (match_current / week 44) overwrite a newer created match (e.g. match_46)
  const curIsDefault = currentMatch.id === 'match_current' && (currentMatch.matchNumber || 44) <= 44;
  const incIsDefault = incomingMatch.id === 'match_current' && (incomingMatch.matchNumber || 44) <= 44;

  if (!curIsDefault && incIsDefault) {
    return false;
  }
  if (curIsDefault && !incIsDefault) {
    return true;
  }

  if ((incomingMatch.matchNumber || 0) > (currentMatch.matchNumber || 0)) {
    return true;
  }
  if ((incomingMatch.matchNumber || 0) < (currentMatch.matchNumber || 0)) {
    return false;
  }

  return incomingTs >= currentTs;
}

async function hydrateFromBackupIfNeeded() {
  if (store.hydrated) return;
  store.hydrated = true;
  try {
    const res = await fetch(`${NTFY_BACKUP_URL}/json?poll=1&since=24h`);
    if (!res.ok) return;
    const text = await res.text();
    if (!text.trim()) return;
    const lines = text.trim().split('\n');
    for (const line of lines) {
      try {
        const env = JSON.parse(line);
        if (env && typeof env.message === 'string') {
          const data = JSON.parse(env.message);
          if (data.invites) {
            store.invites = mergeInvitesMap(store.invites, data.invites);
          }
          if (data.match && data.match.id) {
            const msgTs = Number(data.ts) || (env.time ? env.time * 1000 : Date.now());
            if (shouldReplaceMatch(store.match, data.match, store.ts, msgTs)) {
              store.match = data.match;
              store.ts = msgTs;
            }
          }
        }
      } catch {}
    }
    if (store.match) {
      store.match = applyInvitesToMatch(store.match, store.invites);
    }
  } catch {}
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  await hydrateFromBackupIfNeeded();

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const now = Date.now();

      if (body.invites && typeof body.invites === 'object') {
        store.invites = mergeInvitesMap(store.invites, body.invites);
      }

      if (body.invite && body.invite.playerId) {
        store.invites = mergeInvitesMap(store.invites, {
          [body.invite.playerId]: body.invite,
        });
      }

      if (body.match && body.match.id) {
        if (body.match.attendanceRequests) {
          store.invites = mergeInvitesMap(store.invites, body.match.attendanceRequests);
        }
        if (shouldReplaceMatch(store.match, body.match, store.ts, now)) {
          store.match = body.match;
          store.ts = now;
        }
      }

      if (store.match) {
        store.match = applyInvitesToMatch(store.match, store.invites);
        store.ts = now;
      }

      // Async backup push (throttled on server side so never rate-limited)
      if (now - store.lastBackupPush > 4000 || body.invite) {
        store.lastBackupPush = now;
        fetch(NTFY_BACKUP_URL, {
          method: 'POST',
          body: JSON.stringify({
            ts: store.ts,
            match: store.match,
            invites: store.invites,
          }),
        }).catch(() => {});
      }

      return res.status(200).json({
        ok: true,
        ts: store.ts,
        match: store.match,
        invites: store.invites,
        serverTime: now,
      });
    } catch (err) {
      return res.status(200).json({
        ok: false,
        ts: store.ts,
        match: store.match,
        invites: store.invites,
      });
    }
  }

  return res.status(200).json({
    ok: true,
    ts: store.ts,
    match: store.match ? applyInvitesToMatch(store.match, store.invites) : null,
    invites: store.invites,
    serverTime: Date.now(),
  });
}
