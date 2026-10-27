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

// Zero-config realtime cloud sync channel (ensures all accounts/devices see the exact same match & venues)
const CLOUD_SYNC_TOPIC = 'halisaha_pro_carleman0534_live_v1';
const CLOUD_SYNC_URL = `https://ntfy.sh/${CLOUD_SYNC_TOPIC}`;
const CLIENT_INSTANCE_ID = `cli_${Math.random().toString(36).slice(2, 10)}`;

let firestoreInstance: Firestore | null = null;
let appInstance: FirebaseApp | null = null;

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

// Create a compact version of Match (< 3KB) for instant cloud pub/sub sync
function buildCompactMatchForCloud(match: Match): Match {
  const compactPayments: Match['payments'] = {};
  Object.entries(match.payments || {}).forEach(([k, v]) => {
    compactPayments[k] = {
      isPaid: v.isPaid,
      amount: v.amount,
      ...(v.isExempt ? { isExempt: true } : {}),
    };
  });

  return {
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
  };
}

export async function pushMatchToCloudSync(match: Match, ts: number): Promise<void> {
  try {
    const payload = JSON.stringify({
      t: 'match_sync',
      ts,
      sid: CLIENT_INSTANCE_ID,
      match: buildCompactMatchForCloud(match),
    });

    await fetch(CLOUD_SYNC_URL, {
      method: 'POST',
      body: payload,
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
        Title: 'HalisahaProSync',
      },
    });
  } catch {
    // Offline or blocked; local storage still works seamlessly
  }
}

export async function fetchLatestMatchFromCloudSync(): Promise<{ match: Match; ts: number } | null> {
  try {
    const res = await fetch(`${CLOUD_SYNC_URL}/json?poll=1&since=all`, {
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
              latest = { match: parsed.match as Match, ts: msgTs };
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
  // 1. Save to local storage cache
  const localPlayers = getLocalPlayers();
  const index = localPlayers.findIndex(p => p.id === player.id);
  if (index >= 0) {
    localPlayers[index] = player;
  } else {
    localPlayers.push(player);
  }
  saveLocalPlayers(localPlayers);

  // 2. If Firebase is connected, write to Firestore
  if (firestoreInstance) {
    try {
      const playerRef = doc(firestoreInstance, 'players', player.id);
      await setDoc(playerRef, player, { merge: true });
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

  // 1. Always save current match directly to STORAGE_KEY_MATCH (even when match.id changes via createNewMatch!)
  if (isCurrentMatch) {
    localStorage.setItem(STORAGE_KEY_MATCH, JSON.stringify(match));
    if (broadcastToCloud) {
      setLocalMatchTimestamp(nowTs);
    }
  } else {
    const currentMatchRaw = localStorage.getItem(STORAGE_KEY_MATCH);
    if (currentMatchRaw) {
      try {
        const parsedCurrent = JSON.parse(currentMatchRaw);
        if (parsedCurrent.id === match.id) {
          localStorage.setItem(STORAGE_KEY_MATCH, JSON.stringify(match));
          if (broadcastToCloud) {
            setLocalMatchTimestamp(nowTs);
          }
        }
      } catch {}
    }
  }

  // Also keep in past matches if present there
  const pastMatches = getLocalPastMatches([]);
  const pastIdx = pastMatches.findIndex(m => m.id === match.id);
  if (pastIdx >= 0) {
    pastMatches[pastIdx] = match;
    saveLocalPastMatches(pastMatches);
  }

  // 2. Broadcast to zero-config cloud sync so all devices/accounts immediately stay in sync
  if (isCurrentMatch && broadcastToCloud) {
    pushMatchToCloudSync(match, nowTs);
  }

  // 3. Write to Firestore if connected
  if (firestoreInstance) {
    try {
      const matchRef = doc(firestoreInstance, 'matches', match.id);
      await setDoc(matchRef, match, { merge: true });

      if (isCurrentMatch) {
        const activeRef = doc(firestoreInstance, 'matches', 'current_active_match');
        await setDoc(activeRef, match);
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

  const checkCloudSync = () => {
    if (!isActive) return;
    fetchLatestMatchFromCloudSync().then(cloudData => {
      if (!isActive || !cloudData || !cloudData.match) return;
      const localTs = getLocalMatchTimestamp();
      if (cloudData.ts > localTs) {
        localStorage.setItem(STORAGE_KEY_MATCH, JSON.stringify(cloudData.match));
        setLocalMatchTimestamp(cloudData.ts);
        onUpdate(cloudData.match);
      }
    });
  };

  // 1. Initial Cloud Sync check on mount / user switch
  fetchLatestMatchFromCloudSync().then(cloudData => {
    if (!isActive) return;
    const localTs = getLocalMatchTimestamp();

    if (cloudData && cloudData.match && cloudData.ts > localTs) {
      localStorage.setItem(STORAGE_KEY_MATCH, JSON.stringify(cloudData.match));
      setLocalMatchTimestamp(cloudData.ts);
      onUpdate(cloudData.match);
    } else {
      // If local browser has a customized match (e.g. 30 Ekim) that isn't on cloud yet, push it to cloud!
      try {
        const rawLocal = localStorage.getItem(STORAGE_KEY_MATCH);
        if (rawLocal) {
          const parsedLocal = JSON.parse(rawLocal) as Match;
          const isCustomized =
            parsedLocal.date !== '2026-10-28' ||
            parsedLocal.id !== 'match_current' ||
            localTs > (cloudData?.ts || 0);
          if (isCustomized && (!cloudData || localTs > cloudData.ts)) {
            const pushTs = localTs > 0 ? localTs : Date.now();
            setLocalMatchTimestamp(pushTs);
            pushMatchToCloudSync(parsedLocal, pushTs);
          }
        }
      } catch {}
    }
  });

  // Periodic poll & focus sync so mobile browsers never miss an incoming "🔔 Sor" notification
  if (typeof window !== 'undefined') {
    pollInterval = setInterval(checkCloudSync, 3500);
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
                localStorage.setItem(STORAGE_KEY_MATCH, JSON.stringify(parsed.match));
                setLocalMatchTimestamp(incomingTs);
                onUpdate(parsed.match as Match);
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
              localStorage.setItem(STORAGE_KEY_MATCH, JSON.stringify(remoteMatch));
              onUpdate(remoteMatch);
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
              localStorage.setItem(STORAGE_KEY_MATCH, JSON.stringify(remoteMatch));
              onUpdate(remoteMatch);
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
          onUpdate(parsed);
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
    if (!raw) return defaultMatch;
    const parsed = JSON.parse(raw) as Match;
    return parsed && parsed.id ? parsed : defaultMatch;
  } catch {
    return defaultMatch;
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
