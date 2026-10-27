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

// Zero-config realtime cloud sync channel (ensures all accounts/devices see the exact same match & venues)
const CLOUD_SYNC_TOPIC = 'halisaha_pro_carleman0534_sync_v2';
const CLOUD_SYNC_URL = `https://ntfy.sh/${CLOUD_SYNC_TOPIC}`;
const CLIENT_INSTANCE_ID = `cli_${Math.random().toString(36).slice(2, 10)}`;

let firestoreInstance: Firestore | null = null;
let appInstance: FirebaseApp | null = null;
let lastCloudFetchTime = 0;

// Strip undefined properties recursively so Firestore setDoc never throws Unsupported field value: undefined
function stripUndefined<T>(obj: T): T {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return obj;
  }
}

export function getSavedAttendanceRequests(
  matchId: string
): NonNullable<Match['attendanceRequests']> {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_INVITES}_${matchId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveAttendanceRequestsLocal(
  matchId: string,
  requests?: Match['attendanceRequests']
): void {
  if (!matchId || !requests) return;
  try {
    localStorage.setItem(
      `${STORAGE_KEY_INVITES}_${matchId}`,
      JSON.stringify(stripUndefined(requests))
    );
  } catch {}
}

// Merge attendanceRequests from local cache and incoming match so a "🔔 Sor" invite is NEVER lost
export function mergeMatchWithSavedInvites(incoming: Match): Match {
  if (!incoming || !incoming.id) return incoming;
  const savedReqs = getSavedAttendanceRequests(incoming.id);
  let currentLocalReqs: NonNullable<Match['attendanceRequests']> = {};
  try {
    const rawCurrent = localStorage.getItem(STORAGE_KEY_MATCH);
    if (rawCurrent) {
      const parsedCurrent = JSON.parse(rawCurrent) as Match;
      if (parsedCurrent && parsedCurrent.id === incoming.id && parsedCurrent.attendanceRequests) {
        currentLocalReqs = parsedCurrent.attendanceRequests;
      }
    }
  } catch {}

  const mergedRequests: NonNullable<Match['attendanceRequests']> = {
    ...savedReqs,
    ...currentLocalReqs,
    ...(incoming.attendanceRequests || {}),
  };

  const allPlayerIds = new Set([
    ...Object.keys(savedReqs),
    ...Object.keys(currentLocalReqs),
    ...Object.keys(incoming.attendanceRequests || {}),
  ]);

  const mergedAttendance = { ...(incoming.attendance || {}) };

  allPlayerIds.forEach(pid => {
    const rSaved = savedReqs[pid];
    const rLocal = currentLocalReqs[pid];
    const rInc = incoming.attendanceRequests?.[pid];

    const candidates = [rSaved, rLocal, rInc].filter(Boolean) as NonNullable<
      Match['attendanceRequests']
    >[string][];
    if (candidates.length === 0) return;

    // Pick the candidate with the newest activity timestamp (requestedAt or respondedAt)
    candidates.sort((a, b) => {
      const tA = Math.max(
        a.requestedAt ? Date.parse(a.requestedAt) || 0 : 0,
        a.respondedAt ? Date.parse(a.respondedAt) || 0 : 0
      );
      const tB = Math.max(
        b.requestedAt ? Date.parse(b.requestedAt) || 0 : 0,
        b.respondedAt ? Date.parse(b.respondedAt) || 0 : 0
      );
      return tB - tA;
    });

    const winner = candidates[0];
    mergedRequests[pid] = winner;

    // If the newest state for this player is a pending invite, ensure their attendance reflects 'Haber Bekleniyor'
    if (winner.status === 'pending') {
      const incStatus = mergedAttendance[pid];
      const respTs = winner.respondedAt ? Date.parse(winner.respondedAt) || 0 : 0;
      const reqTs = winner.requestedAt ? Date.parse(winner.requestedAt) || 0 : 0;
      if (reqTs > respTs || !incStatus) {
        mergedAttendance[pid] = 'Haber Bekleniyor';
      }
    }
  });

  saveAttendanceRequestsLocal(incoming.id, mergedRequests);

  return {
    ...incoming,
    attendance: mergedAttendance,
    attendanceRequests: mergedRequests,
  };
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

export async function pushMatchToCloudSync(match: Match, ts: number): Promise<void> {
  try {
    const payload = JSON.stringify({
      t: 'match_sync',
      ts,
      sid: CLIENT_INSTANCE_ID,
      match: buildCompactMatchForCloud(match),
    });

    // Use a simple POST without custom headers so browsers send a direct request without CORS preflight
    await fetch(CLOUD_SYNC_URL, {
      method: 'POST',
      body: payload,
    });
  } catch {
    // Offline or blocked; local storage still works seamlessly
  }
}

export async function fetchLatestMatchFromCloudSync(
  force: boolean = false
): Promise<{ match: Match; ts: number } | null> {
  try {
    const now = Date.now();
    if (!force && now - lastCloudFetchTime < 12000) {
      return null;
    }
    lastCloudFetchTime = now;

    const res = await fetch(`${CLOUD_SYNC_URL}/json?poll=1&since=12h`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text.trim()) return null;

    const lines = text.trim().split('\n');
    let latest: { match: Match; ts: number } | null = null;

    for (const line of lines) {
      try {
        const envelope = JSON.parse(line);
        if (envelope && envelope.event === 'message' && typeof envelope.message === 'string') {
          const parsed = JSON.parse(envelope.message);
          if (parsed && parsed.t === 'match_sync' && parsed.match && parsed.match.id) {
            const msgTs = Number(parsed.ts) || (envelope.time ? envelope.time * 1000 : 0);
            if (!latest || msgTs >= latest.ts) {
              latest = { match: mergeMatchWithSavedInvites(parsed.match as Match), ts: msgTs };
            }
          }
        }
      } catch {}
    }

    return latest;
  } catch {
    return null;
  }
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
  let eventSource: EventSource | null = null;
  let pollInterval: ReturnType<typeof setInterval> | null = null;
  let isActive = true;

  const applyIncomingMatch = (incoming: Match, incomingTs?: number) => {
    const merged = mergeMatchWithSavedInvites(incoming);
    localStorage.setItem(STORAGE_KEY_MATCH, JSON.stringify(merged));
    if (typeof incomingTs === 'number' && incomingTs > getLocalMatchTimestamp()) {
      setLocalMatchTimestamp(incomingTs);
    }
    onUpdate(merged);
  };

  const checkCloudSync = () => {
    if (!isActive) return;
    fetchLatestMatchFromCloudSync().then(cloudData => {
      if (!isActive || !cloudData || !cloudData.match) return;
      const localTs = getLocalMatchTimestamp();
      if (cloudData.ts >= localTs) {
        applyIncomingMatch(cloudData.match, cloudData.ts);
      }
    });
  };

  // 1. Initial Cloud Sync check on mount / user switch
  fetchLatestMatchFromCloudSync(true).then(cloudData => {
    if (!isActive) return;
    const localTs = getLocalMatchTimestamp();

    if (cloudData && cloudData.match && cloudData.ts >= localTs) {
      applyIncomingMatch(cloudData.match, cloudData.ts);
    } else if (!cloudData && localTs > 0) {
      // Only push local match if we genuinely have a newer local write timestamp
      try {
        const rawLocal = localStorage.getItem(STORAGE_KEY_MATCH);
        if (rawLocal) {
          const parsedLocal = mergeMatchWithSavedInvites(JSON.parse(rawLocal) as Match);
          pushMatchToCloudSync(parsedLocal, localTs);
        }
      } catch {}
    }
  });

  // Periodic poll & focus sync so mobile browsers never miss an incoming "🔔 Sor" notification
  if (typeof window !== 'undefined') {
    pollInterval = setInterval(checkCloudSync, 15000);
    window.addEventListener('focus', checkCloudSync);
  }

  // 2. Live Server-Sent Events (SSE) subscription for real-time cross-device updates
  if (typeof window !== 'undefined' && typeof EventSource !== 'undefined') {
    try {
      eventSource = new EventSource(`${CLOUD_SYNC_URL}/sse`);
      eventSource.onmessage = event => {
        if (!isActive || !event.data) return;
        try {
          const envelope = JSON.parse(event.data);
          if (envelope && typeof envelope.message === 'string') {
            const parsed = JSON.parse(envelope.message);
            if (
              parsed &&
              parsed.t === 'match_sync' &&
              parsed.sid !== CLIENT_INSTANCE_ID &&
              parsed.match &&
              parsed.match.id
            ) {
              const incomingTs = Number(parsed.ts) || Date.now();
              if (incomingTs >= getLocalMatchTimestamp()) {
                applyIncomingMatch(parsed.match as Match, incomingTs);
              }
            }
          }
        } catch {}
      };
    } catch {}
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
    if (eventSource) {
      try {
        eventSource.close();
      } catch {}
    }
    if (unsubscribeActiveMatch) unsubscribeActiveMatch();
    if (unsubscribeFirestore) unsubscribeFirestore();
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', checkCloudSync);
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
