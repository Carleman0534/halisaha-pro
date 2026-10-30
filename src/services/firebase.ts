import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  Firestore,
} from 'firebase/firestore';
import { FirebaseConfig, Player, Match, Transaction, ExemptionAuditLog, NotificationDispatchLog, Venue } from '../types';

const STORAGE_KEY_CONFIG = 'halisaha_firebase_config';
const STORAGE_KEY_PLAYERS = 'halisaha_local_players';
const STORAGE_KEY_MATCH = 'halisaha_local_current_match';
const STORAGE_KEY_MATCH_TS = 'halisaha_local_current_match_ts';
const STORAGE_KEY_PAST_MATCHES = 'halisaha_local_past_matches';
const STORAGE_KEY_TRANSACTIONS = 'halisaha_local_transactions';
const STORAGE_KEY_EXEMPTION_LOGS = 'halisaha_local_exemption_audit_logs';
const STORAGE_KEY_NOTIFICATION_LOGS = 'halisaha_local_notification_dispatch_logs';
const STORAGE_KEY_VENUES = 'halisaha_local_venues';
const STORAGE_KEY_INVITES = 'halisaha_local_attendance_requests';
const STORAGE_KEY_INVITES_GLOBAL = 'halisaha_local_attendance_requests_global';

// Zero-config realtime cloud sync channels
const CLIENT_INSTANCE_ID = `cli_${Math.random().toString(36).slice(2, 10)}`;

let firestoreInstance: Firestore | null = null;
let appInstance: FirebaseApp | null = null;
let lastCloudFetchTime = 0;
let pushDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// Strip undefined properties recursively so Firestore setDoc never throws Unsupported field value: undefined
function stripUndefined<T>(obj: T): T {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return obj;
  }
}

function getEffectiveInviteTime(
  req?: NonNullable<Match['attendanceRequests']>[string]
): number {
  if (!req) return 0;
  const reqTs = req.requestedAt ? Date.parse(req.requestedAt) || 0 : 0;
  const respTs = req.respondedAt ? Date.parse(req.respondedAt) || 0 : 0;
  return req.status === 'pending' ? reqTs : Math.max(reqTs, respTs);
}

export function getSavedAttendanceRequests(
  matchId?: string
): NonNullable<Match['attendanceRequests']> {
  try {
    const globalRaw = localStorage.getItem(STORAGE_KEY_INVITES_GLOBAL);
    const globalReqs = globalRaw ? JSON.parse(globalRaw) : {};
    const matchRaw = matchId ? localStorage.getItem(`${STORAGE_KEY_INVITES}_${matchId}`) : null;
    const matchReqs = matchRaw ? JSON.parse(matchRaw) : {};
    // Sadece ilgili maçın davetleri döner; başka maçların davetleri sızmasın.
    return matchId ? matchReqs : globalReqs;
  } catch {
    return {};
  }
}

export function saveAttendanceRequestsLocal(
  matchId: string,
  requests?: Match['attendanceRequests']
): void {
  if (!requests) return;
  try {
    const clean = stripUndefined(requests);
    if (matchId) {
      localStorage.setItem(`${STORAGE_KEY_INVITES}_${matchId}`, JSON.stringify(clean));
    }
    const existingGlobal = getSavedAttendanceRequests();
    const mergedGlobal = { ...existingGlobal };
    Object.entries(clean).forEach(([pid, r]) => {
      if (!r) return;
      const prev = mergedGlobal[pid];
      if (!prev || getEffectiveInviteTime(r) >= getEffectiveInviteTime(prev)) {
        mergedGlobal[pid] = r;
      }
    });
    localStorage.setItem(STORAGE_KEY_INVITES_GLOBAL, JSON.stringify(mergedGlobal));
  } catch {}
}

// Merge attendanceRequests from local cache and incoming match so a "🔔 Sor" invite is NEVER lost
export function mergeMatchWithSavedInvites(incoming: Match): Match {
  if (!incoming || !incoming.id) return incoming;
  const savedReqs = getSavedAttendanceRequests(incoming.id);
  let currentLocalReqs: NonNullable<Match['attendanceRequests']> = {};
  let currentLocalAttendance: Match['attendance'] = {};
  let currentLocalTimestamps: NonNullable<Match['attendanceTimestamps']> = {};

  try {
    const rawCurrent = localStorage.getItem(STORAGE_KEY_MATCH);
    if (rawCurrent) {
      const parsedCurrent = JSON.parse(rawCurrent) as Match;
      if (parsedCurrent && parsedCurrent.id === incoming.id) {
        currentLocalReqs = parsedCurrent.attendanceRequests || {};
        currentLocalAttendance = parsedCurrent.attendance || {};
        currentLocalTimestamps = parsedCurrent.attendanceTimestamps || {};
      }
    }
  } catch {}

  const mergedRequests: NonNullable<Match['attendanceRequests']> = {
    ...savedReqs,
    ...currentLocalReqs,
    ...(incoming.attendanceRequests || {}),
  };

  const mergedAttendance: Match['attendance'] = {
    ...currentLocalAttendance,
    ...(incoming.attendance || {}),
  };

  const mergedTimestamps: NonNullable<Match['attendanceTimestamps']> = {
    ...currentLocalTimestamps,
    ...(incoming.attendanceTimestamps || {}),
  };

  const allPlayerIds = new Set([
    ...Object.keys(savedReqs),
    ...Object.keys(currentLocalReqs),
    ...Object.keys(incoming.attendanceRequests || {}),
    ...Object.keys(mergedAttendance),
  ]);

  allPlayerIds.forEach(pid => {
    const rSaved = savedReqs[pid];
    const rLocal = currentLocalReqs[pid];
    const rInc = incoming.attendanceRequests?.[pid];

    const candidates = [rSaved, rLocal, rInc].filter(Boolean) as NonNullable<
      Match['attendanceRequests']
    >[string][];

    if (candidates.length > 0) {
      candidates.sort((a, b) => getEffectiveInviteTime(b) - getEffectiveInviteTime(a));
      const winner = { ...candidates[0] };

      // Check if player was explicitly set to 'Haber Bekleniyor' more recently than winner.respondedAt
      const attTsStr = incoming.attendanceTimestamps?.[pid] || currentLocalTimestamps[pid];
      const attTs = attTsStr ? Date.parse(attTsStr) || 0 : 0;
      const respTs = winner.respondedAt ? Date.parse(winner.respondedAt) || 0 : 0;
      const currentStatus = incoming.attendance?.[pid] || currentLocalAttendance[pid];

      if (
        winner.status === 'responded' &&
        (currentStatus === 'Haber Bekleniyor' || currentStatus === 'Beklemede') &&
        attTs > respTs
      ) {
        winner.status = 'pending';
        winner.requestedAt = attTsStr!;
        delete winner.respondedAt;
      }

      mergedRequests[pid] = winner;

      if (winner.status === 'pending') {
        const reqTs = winner.requestedAt ? Date.parse(winner.requestedAt) || 0 : 0;
        if (reqTs >= attTs || !currentStatus || currentStatus === 'Haber Bekleniyor' || currentStatus === 'Beklemede') {
          mergedAttendance[pid] = 'Haber Bekleniyor';
          if (winner.requestedAt) {
            mergedTimestamps[pid] = winner.requestedAt;
          }
        }
      }
    }
  });

  saveAttendanceRequestsLocal(incoming.id, mergedRequests);

  return {
    ...incoming,
    attendance: mergedAttendance,
    attendanceTimestamps: mergedTimestamps,
    attendanceRequests: mergedRequests,
  };
}

function shouldAcceptIncomingMatch(incoming: Match, incomingTs: number): boolean {
  try {
    const rawLocal = localStorage.getItem(STORAGE_KEY_MATCH);
    if (!rawLocal) return true;
    const localMatch = JSON.parse(rawLocal) as Match;
    if (!localMatch || !localMatch.id) return true;

    // Aynı maç: sunucudaki sürüm (davetler sunucuda birleştirilir) kabul edilir.
    if (localMatch.id === incoming.id) return true;

    const localIsDefault = localMatch.id === 'match_current' && (localMatch.matchNumber || 44) <= 44;
    const incIsDefault = incoming.id === 'match_current' && (incoming.matchNumber || 44) <= 44;
    if (!localIsDefault && incIsDefault) return false;
    if (localIsDefault && !incIsDefault) return true;

    const ln = localMatch.matchNumber || 0;
    const inn = incoming.matchNumber || 0;
    if (inn > ln) return true;
    if (inn < ln) return false;
    // Aynı numara, farklı maç: daha yeni oluşturulan kazanır (sunucu zaten bunu seçiyor).
    return (incoming.createdAt || 0) >= (localMatch.createdAt || 0);
  } catch {}
  return true;
}

export function getLocalMatchTimestamp(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MATCH_TS);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

export function setLocalMatchTimestamp(ts: number): void {
  try {
    localStorage.setItem(STORAGE_KEY_MATCH_TS, String(ts));
  } catch {}
}

// Create a compact version of Match (< 2.5KB) for instant cloud pub/sub sync
function buildCompactMatchForCloud(match: Match): Match {
  const compactPayments: Match['payments'] = {};
  Object.entries(match.payments || {}).forEach(([k, v]) => {
    if (v.isPaid || v.isExempt) {
      compactPayments[k] = {
        isPaid: v.isPaid,
        amount: v.amount,
        ...(v.isExempt ? { isExempt: true } : {}),
      };
    }
  });

  return stripUndefined({
    id: match.id,
    matchNumber: match.matchNumber,
    createdAt: match.createdAt,
    date: match.date,
    time: match.time,
    venueId: match.venueId,
    venueName: match.venueName,
    venueLocation: match.venueLocation,
    venueMapsUrl: match.venueMapsUrl,
    pitchNo: match.pitchNo || 'Saha 1',
    totalPitchCost: match.totalPitchCost,
    costPerPlayer: match.costPerPlayer,
    matchFormat: match.matchFormat || '7v7',
    targetSquadCount: match.targetSquadCount || 14,
    status: match.status,
    squad: match.squad || [],
    teamA: match.teamA,
    teamB: match.teamB,
    attendance: match.attendance || {},
    attendanceTimestamps: match.attendanceTimestamps || {},
    attendanceRequests: match.attendanceRequests || {},
    payments: compactPayments,
    squadLockStatus: match.squadLockStatus || 'draft',
    mvpWinnerId: match.mvpWinnerId,
    mvpVotes: match.mvpVotes,
    userMvpVotes: match.userMvpVotes,
    notes: match.notes,
  });
}

// Instant dedicated broadcast for "🔔 Sor" player invitations & responses
export async function pushPlayerInviteToCloud(
  match: Match,
  playerId: string,
  requestedBy: string,
  requestedAt: string,
  status: 'pending' | 'responded' = 'pending',
  responseStatus?: string
): Promise<void> {
  const invitePacket = stripUndefined({
    t: 'player_invite',
    sid: CLIENT_INSTANCE_ID,
    ts: Date.now(),
    playerId,
    requestedAt,
    requestedBy,
    status,
    ...(status === 'responded' ? { respondedAt: requestedAt, responseStatus } : {}),
    matchId: match.id,
    matchNumber: match.matchNumber,
    date: match.date,
    time: match.time,
    venueName: match.venueName,
    venueLocation: match.venueLocation || match.venueName,
    venueMapsUrl: match.venueMapsUrl,
    costPerPlayer: match.costPerPlayer,
  });

  // 1. Same-origin Vercel Serverless Sync Store (0 rate limit)
  fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      invite: invitePacket,
      match: buildCompactMatchForCloud(match),
    }),
  }).catch(() => {});

}

export async function pushMatchToCloudSync(match: Match, ts: number): Promise<void> {
  const compact = buildCompactMatchForCloud(match);

  // 1. Immediate push to same-origin Vercel API (/api/sync) - never rate-limited
  fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ts,
      match: compact,
      invites: compact.attendanceRequests || {},
    }),
  }).catch(() => {});

}

export async function fetchLatestMatchFromCloudSync(
  _force: boolean = false
): Promise<{ match: Match; ts: number } | null> {
  // Tek doğru kaynak: Firestore'a bağlı /api/sync. Başka (herkese açık) kanallardan veri çekilmez.
  try {
    const apiRes = await fetch(`/api/sync?t=${Date.now()}`, { cache: 'no-store' });
    if (!apiRes.ok) return null;
    const apiData = await apiRes.json();
    if (!apiData || !apiData.ok) return null;
    if (apiData.match && apiData.match.id) {
      if (apiData.invites) {
        saveAttendanceRequestsLocal(apiData.match.id, apiData.invites);
      }
      return {
        match: mergeMatchWithSavedInvites(apiData.match as Match),
        ts: Number(apiData.ts) || Date.now(),
      };
    }
  } catch {}
  return null;
}

export function loadSavedFirebaseConfig(): FirebaseConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function initFirebase(config: FirebaseConfig): boolean {
  try {
    if (!config.apiKey || !config.projectId) {
      return false;
    }

    if (getApps().length > 0) {
      appInstance = getApp();
    } else {
      appInstance = initializeApp(config);
    }

    firestoreInstance = getFirestore(appInstance);
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    return true;
  } catch (error) {
    console.error('Firebase initialization error:', error);
    return false;
  }
}

export function isFirebaseConnected(): boolean {
  return firestoreInstance !== null;
}

export function clearFirebaseConfig() {
  localStorage.removeItem(STORAGE_KEY_CONFIG);
  firestoreInstance = null;
  appInstance = null;
}

// ==========================================
// DATA ACCESS & REALTIME SYNC REPOSITORY
// ==========================================

export async function savePlayerToDatabase(player: Player): Promise<void> {
  const cleanPlayer = stripUndefined(player);
  // 1. Save to local storage cache
  const localPlayers = getLocalPlayers();
  const index = localPlayers.findIndex(p => p.id === cleanPlayer.id);
  if (index >= 0) {
    localPlayers[index] = cleanPlayer;
  } else {
    localPlayers.push(cleanPlayer);
  }
  saveLocalPlayers(localPlayers);

  // 2. If Firebase is connected, write to Firestore
  if (firestoreInstance) {
    try {
      const playerRef = doc(firestoreInstance, 'players', cleanPlayer.id);
      await setDoc(playerRef, cleanPlayer, { merge: true });
    } catch (err) {
      console.warn('Firestore player write failed, cached locally:', err);
    }
  }
}

export async function saveMatchToDatabase(
  match: Match,
  isCurrentMatch: boolean = true,
  broadcastToCloud: boolean = true
): Promise<void> {
  const nowTs = Date.now();
  // Strip undefined values so Firestore setDoc NEVER throws "Unsupported field value: undefined"
  const cleanMatch = mergeMatchWithSavedInvites(stripUndefined(match));

  if (cleanMatch.attendanceRequests) {
    saveAttendanceRequestsLocal(cleanMatch.id, cleanMatch.attendanceRequests);
  }

  // 1. Always save current match directly to STORAGE_KEY_MATCH (even when match.id changes via createNewMatch!)
  if (isCurrentMatch) {
    localStorage.setItem(STORAGE_KEY_MATCH, JSON.stringify(cleanMatch));
    if (broadcastToCloud) {
      setLocalMatchTimestamp(nowTs);
    }
  } else {
    const currentMatchRaw = localStorage.getItem(STORAGE_KEY_MATCH);
    if (currentMatchRaw) {
      try {
        const parsedCurrent = JSON.parse(currentMatchRaw);
        if (parsedCurrent.id === cleanMatch.id) {
          localStorage.setItem(STORAGE_KEY_MATCH, JSON.stringify(cleanMatch));
          if (broadcastToCloud) {
            setLocalMatchTimestamp(nowTs);
          }
        }
      } catch {}
    }
  }

  // Also keep in past matches if present there
  const pastMatches = getLocalPastMatches([]);
  const pastIdx = pastMatches.findIndex(m => m.id === cleanMatch.id);
  if (pastIdx >= 0) {
    pastMatches[pastIdx] = cleanMatch;
    saveLocalPastMatches(pastMatches);
  }

  // 2. Broadcast to zero-config cloud sync so all devices/accounts immediately stay in sync
  if (isCurrentMatch && broadcastToCloud) {
    pushMatchToCloudSync(cleanMatch, nowTs);
  }

  // 3. Write to Firestore if connected
  if (firestoreInstance) {
    try {
      const matchRef = doc(firestoreInstance, 'matches', cleanMatch.id);
      await setDoc(matchRef, cleanMatch, { merge: true });

      if (isCurrentMatch) {
        const activeRef = doc(firestoreInstance, 'matches', 'current_active_match');
        await setDoc(activeRef, cleanMatch);
      }
    } catch (err) {
      console.warn('Firestore match write failed, cached locally:', err);
    }
  }
}

export function subscribeToMatchUpdates(
  matchId: string,
  onUpdate: (match: Match) => void
): () => void {
  let unsubscribeFirestore: (() => void) | null = null;
  let unsubscribeActiveMatch: (() => void) | null = null;
  let pollInterval: ReturnType<typeof setInterval> | null = null;
  let isActive = true;

  const applyIncomingMatch = (incoming: Match, incomingTs?: number) => {
    let baseMatch = incoming;
    try {
      const rawLocal = localStorage.getItem(STORAGE_KEY_MATCH);
      if (rawLocal) {
        const localMatch = JSON.parse(rawLocal) as Match;
        if (localMatch && localMatch.id) {
          if (!shouldAcceptIncomingMatch(incoming, incomingTs || Date.now())) {
            // Keep the newer local match structure, but merge any new attendanceRequests from incoming!
            baseMatch = {
              ...localMatch,
              attendanceRequests: {
                ...(localMatch.attendanceRequests || {}),
                ...(incoming.attendanceRequests || {}),
              },
            };
          }
        }
      }
    } catch {}

    const merged = mergeMatchWithSavedInvites(baseMatch);
    localStorage.setItem(STORAGE_KEY_MATCH, JSON.stringify(merged));
    if (typeof incomingTs === 'number' && incomingTs > getLocalMatchTimestamp()) {
      setLocalMatchTimestamp(incomingTs);
    }
    onUpdate(merged);
  };

  const applyInvitePacket = (p: Record<string, any>) => {
    if (!p || !p.playerId || !p.requestedAt) return;
    const candidate = {
      playerId: String(p.playerId),
      requestedAt: String(p.requestedAt),
      requestedBy: String(p.requestedBy || 'Konsey'),
      status: (p.status === 'responded' ? 'responded' : 'pending') as 'pending' | 'responded',
      ...(p.respondedAt ? { respondedAt: String(p.respondedAt) } : {}),
    };

    saveAttendanceRequestsLocal(p.matchId || matchId || 'global', {
      [candidate.playerId]: candidate,
    });

    try {
      const rawLocal = localStorage.getItem(STORAGE_KEY_MATCH);
      if (rawLocal) {
        const localMatch = JSON.parse(rawLocal) as Match;
        const updatedMatch: Match = {
          ...localMatch,
          ...(p.date ? { date: p.date } : {}),
          ...(p.time ? { time: p.time } : {}),
          ...(p.venueName ? { venueName: p.venueName } : {}),
          ...(p.venueLocation ? { venueLocation: p.venueLocation } : {}),
          ...(p.venueMapsUrl ? { venueMapsUrl: p.venueMapsUrl } : {}),
          ...(typeof p.costPerPlayer === 'number' ? { costPerPlayer: p.costPerPlayer } : {}),
          ...(typeof p.matchNumber === 'number' && p.matchNumber >= (localMatch.matchNumber || 0)
            ? { matchNumber: p.matchNumber }
            : {}),
          attendance: {
            ...(localMatch.attendance || {}),
            [candidate.playerId]:
              candidate.status === 'pending'
                ? 'Haber Bekleniyor'
                : p.responseStatus || localMatch.attendance?.[candidate.playerId] || 'Haber Bekleniyor',
          },
          attendanceTimestamps: {
            ...(localMatch.attendanceTimestamps || {}),
            [candidate.playerId]: candidate.respondedAt || candidate.requestedAt,
          },
          attendanceRequests: {
            ...(localMatch.attendanceRequests || {}),
            [candidate.playerId]: candidate,
          },
        };
        const merged = mergeMatchWithSavedInvites(updatedMatch);
        localStorage.setItem(STORAGE_KEY_MATCH, JSON.stringify(merged));
        onUpdate(merged);
      }
    } catch {}
  };

  const checkCloudSync = () => {
    if (!isActive) return;
    fetchLatestMatchFromCloudSync().then(cloudData => {
      if (!isActive || !cloudData || !cloudData.match) return;
      applyIncomingMatch(cloudData.match, cloudData.ts);
    });
  };

  const checkCloudSyncForced = () => {
    if (!isActive) return;
    fetchLatestMatchFromCloudSync(true).then(cloudData => {
      if (!isActive || !cloudData || !cloudData.match) return;
      applyIncomingMatch(cloudData.match, cloudData.ts);
    });
  };

  const handleVisibilityChange = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      checkCloudSyncForced();
    }
  };

  // 1. Initial Cloud Sync check on mount / user switch
  fetchLatestMatchFromCloudSync(true).then(cloudData => {
    if (!isActive) return;
    if (cloudData && cloudData.match) {
      applyIncomingMatch(cloudData.match, cloudData.ts);
    }
  });

  // Fast 3.5-second poll via same-origin /api/sync & visibility/focus sync for mobile
  if (typeof window !== 'undefined') {
    pollInterval = setInterval(checkCloudSync, 3500);
    window.addEventListener('focus', checkCloudSyncForced);
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  // 3. Firestore realtime subscription (if configured)
  if (firestoreInstance) {
    try {
      const activeRef = doc(firestoreInstance, 'matches', 'current_active_match');
      unsubscribeActiveMatch = onSnapshot(
        activeRef,
        snapshot => {
          if (snapshot.exists()) {
            const remoteMatch = snapshot.data() as Match;
            if (remoteMatch && remoteMatch.id) {
              applyIncomingMatch(remoteMatch);
            }
          }
        },
        err => {
          console.warn('Firestore active match subscription error:', err);
        }
      );

      if (matchId) {
        const matchRef = doc(firestoreInstance, 'matches', matchId);
        unsubscribeFirestore = onSnapshot(
          matchRef,
          snapshot => {
            if (snapshot.exists()) {
              const remoteMatch = snapshot.data() as Match;
              applyIncomingMatch(remoteMatch);
            }
          },
          err => {
            console.warn('Firestore match subscription error:', err);
          }
        );
      }
    } catch (err) {
      console.warn('Failed to subscribe to Firestore match:', err);
    }
  }

  // 4. Cross-tab & cross-account localStorage sync
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY_MATCH && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue) as Match;
        if (parsed && parsed.id) {
          onUpdate(mergeMatchWithSavedInvites(parsed));
        }
      } catch {}
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorageEvent);
  }

  return () => {
    isActive = false;
    if (pollInterval) {
      clearInterval(pollInterval);
    }
    if (unsubscribeActiveMatch) unsubscribeActiveMatch();
    if (unsubscribeFirestore) unsubscribeFirestore();
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', checkCloudSyncForced);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorageEvent);
    }
  };
}

// Local Storage Accessors
export function getLocalPlayers(): Player[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PLAYERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalPlayers(players: Player[]): void {
  localStorage.setItem(STORAGE_KEY_PLAYERS, JSON.stringify(players));
}

export function getLocalCurrentMatch(defaultMatch: Match): Match {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MATCH);
    if (!raw) return mergeMatchWithSavedInvites(defaultMatch);
    const parsed = JSON.parse(raw) as Match;
    return parsed && parsed.id ? mergeMatchWithSavedInvites(parsed) : mergeMatchWithSavedInvites(defaultMatch);
  } catch {
    return mergeMatchWithSavedInvites(defaultMatch);
  }
}

export function getLocalPastMatches(defaults: Match[]): Match[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PAST_MATCHES);
    return raw ? JSON.parse(raw) : defaults;
  } catch {
    return defaults;
  }
}

export function saveLocalPastMatches(matches: Match[]): void {
  localStorage.setItem(STORAGE_KEY_PAST_MATCHES, JSON.stringify(matches));
}

export function getLocalTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalTransactions(txs: Transaction[]): void {
  localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(txs));
}

export function getLocalExemptionAuditLogs(): ExemptionAuditLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EXEMPTION_LOGS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function appendLocalExemptionAuditLog(log: ExemptionAuditLog): void {
  const logs = getLocalExemptionAuditLogs();
  logs.unshift(log);
  if (logs.length > 100) logs.length = 100;
  localStorage.setItem(STORAGE_KEY_EXEMPTION_LOGS, JSON.stringify(logs));
}

export function getLocalNotificationLogs(): NotificationDispatchLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTIFICATION_LOGS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function appendLocalNotificationLog(log: NotificationDispatchLog): void {
  const logs = getLocalNotificationLogs();
  logs.unshift(log);
  if (logs.length > 50) logs.length = 50;
  localStorage.setItem(STORAGE_KEY_NOTIFICATION_LOGS, JSON.stringify(logs));
}

// ==========================================
// VENUES & GOOGLE MAPS HELPERS
// ==========================================

export function buildGoogleMapsUrl(venueName: string, locationInput?: string): string {
  const loc = (locationInput || '').trim();
  if (/^https?:\/\//i.test(loc)) {
    return loc;
  }
  const searchQuery = loc ? `${venueName} ${loc}` : venueName;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery.trim() || 'Halı Saha')}`;
}

export function getMatchMapsUrl(match: {
  venueName: string;
  venueLocation?: string;
  venueMapsUrl?: string;
}): string {
  if (match.venueMapsUrl && /^https?:\/\//i.test(match.venueMapsUrl.trim())) {
    return match.venueMapsUrl.trim();
  }
  return buildGoogleMapsUrl(match.venueName, match.venueLocation);
}

export function getLocalVenues(defaults: Venue[]): Venue[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VENUES);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaults;
  } catch {
    return defaults;
  }
}

export function saveLocalVenues(venues: Venue[]): void {
  localStorage.setItem(STORAGE_KEY_VENUES, JSON.stringify(venues));
}

export async function saveVenueToDatabase(venue: Venue, allVenues: Venue[]): Promise<void> {
  saveLocalVenues(allVenues);
  if (firestoreInstance) {
    try {
      const venueRef = doc(firestoreInstance, 'venues', venue.id);
      await setDoc(venueRef, venue, { merge: true });
    } catch (err) {
      console.warn('Firestore venue write failed, cached locally:', err);
    }
  }
}
