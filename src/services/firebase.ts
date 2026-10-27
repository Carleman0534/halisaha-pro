import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  Firestore,
} from 'firebase/firestore';
import { FirebaseConfig, Player, Match, Transaction, ExemptionAuditLog, NotificationDispatchLog, Venue } from '../types';

const STORAGE_KEY_CONFIG = 'halisaha_firebase_config';
const STORAGE_KEY_PLAYERS = 'halisaha_local_players';
const STORAGE_KEY_MATCH = 'halisaha_local_current_match';
const STORAGE_KEY_PAST_MATCHES = 'halisaha_local_past_matches';
const STORAGE_KEY_TRANSACTIONS = 'halisaha_local_transactions';
const STORAGE_KEY_EXEMPTION_LOGS = 'halisaha_local_exemption_audit_logs';
const STORAGE_KEY_NOTIFICATION_LOGS = 'halisaha_local_notification_dispatch_logs';
const STORAGE_KEY_VENUES = 'halisaha_local_venues';

let firestoreInstance: Firestore | null = null;
let appInstance: FirebaseApp | null = null;

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

export async function saveMatchToDatabase(match: Match): Promise<void> {
  // 1. Determine if current or past match and update local storage
  const currentMatchRaw = localStorage.getItem(STORAGE_KEY_MATCH);
  let isCurrent = true;
  if (currentMatchRaw) {
    try {
      const parsedCurrent = JSON.parse(currentMatchRaw);
      if (parsedCurrent.id && parsedCurrent.id !== match.id) {
        isCurrent = false;
      }
    } catch {}
  }

  if (isCurrent) {
    localStorage.setItem(STORAGE_KEY_MATCH, JSON.stringify(match));
  }

  // Also keep in past matches if present there
  const pastMatches = getLocalPastMatches([]);
  const pastIdx = pastMatches.findIndex(m => m.id === match.id);
  if (pastIdx >= 0) {
    pastMatches[pastIdx] = match;
    saveLocalPastMatches(pastMatches);
  }

  // 2. Write to Firestore if connected
  if (firestoreInstance) {
    try {
      const matchRef = doc(firestoreInstance, 'matches', match.id);
      await setDoc(matchRef, match, { merge: true });
    } catch (err) {
      console.warn('Firestore match write failed, cached locally:', err);
    }
  }
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
    return raw ? JSON.parse(raw) : defaultMatch;
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
