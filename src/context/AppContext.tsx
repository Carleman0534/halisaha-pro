import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  Player,
  Match,
  Evaluator,
  AttendanceStatus,
  Position,
  AppUser,
  MatchGoal,
  SquadLockStatus,
  SquadVersion,
  PaymentExemption,
  ExemptionAuditLog,
  DeclineAlert,
  NotificationDispatchLog,
  Team,
  Venue,
} from '../types';
import {
  COUNCIL_MEMBERS,
  RAW_PLAYERS_DATA,
  INITIAL_MATCH,
  INITIAL_VENUES,
  PAST_MATCHES,
  CRITERIA_KEYS,
  ADMIN_USERS,
  DEFAULT_GUEST_USER,
} from '../data/initialData';
import {
  buildInitialPlayers,
  recalculatePlayerStats,
  balanceTeams,
} from '../utils/calculations';
import {
  getLocalPlayers,
  saveLocalPlayers,
  getLocalCurrentMatch,
  saveMatchToDatabase,
  getLocalPastMatches,
  saveLocalPastMatches,
  loadSavedFirebaseConfig,
  initFirebase,
  isFirebaseConnected,
  savePlayerToDatabase,
  getLocalExemptionAuditLogs,
  appendLocalExemptionAuditLog,
  getLocalNotificationLogs,
  appendLocalNotificationLog,
  getLocalVenues,
  saveLocalVenues,
  saveVenueToDatabase,
  buildGoogleMapsUrl,
  subscribeToMatchUpdates,
  fetchLatestMatchFromCloudSync,
  getLocalMatchTimestamp,
  setLocalMatchTimestamp,
} from '../services/firebase';
import { sendSystemNotification } from '../services/notifications';
import { isPlayerExemptForMatch } from '../utils/permissions';

interface AppContextType {
  players: Player[];
  playersMap: Record<string, Player>;
  currentMatch: Match;
  pastMatches: Match[];
  venues: Venue[];
  addVenue: (name: string, location: string, defaultCost?: number) => Venue;
  updateVenue: (venue: Venue) => void;
  deleteVenue: (venueId: string) => void;
  currentEvaluator: Evaluator;
  setCurrentEvaluator: (evaluator: Evaluator) => void;
  updateRating: (playerId: string, evaluatorId: string, criterionKey: string, score: number) => void;
  updateAttendance: (playerId: string, status: AttendanceStatus) => void;
  updateMatchAttendance: (
    matchId: string,
    playerId: string,
    status: AttendanceStatus,
    modifiedBy?: string
  ) => void;
  togglePayment: (playerId: string, matchId?: string) => void;
  setPlayerExemption: (
    playerId: string,
    exemption: Partial<PaymentExemption> | null,
    reason?: string
  ) => void;
  getExemptionAuditLogs: () => ExemptionAuditLog[];
  updateSquad: (newSquadIds: string[], matchId?: string) => void;
  autoBalanceSquad: (matchId?: string) => void;
  syncSquadFromAttendees: (
    matchId?: string
  ) => { success: boolean; count: number; totalComing?: number; message?: string };
  saveSquadForMatch: (
    matchId: string,
    teamA: Team,
    teamB: Team,
    squad: string[],
    lockStatus?: SquadLockStatus,
    note?: string
  ) => { success: boolean; error?: string };
  restoreSquadVersion: (matchId: string, versionId: string) => { success: boolean; error?: string };
  toggleSquadLock: (
    matchId: string
  ) => { success: boolean; newStatus?: SquadLockStatus; error?: string };
  dismissDeclineAlert: (matchId: string, alertId: string) => void;
  sendPlayerAttendanceRequest: (
    playerId: string
  ) => Promise<{ success: boolean; message: string }>;
  sendReNotificationToPending: (
    matchId: string
  ) => Promise<{
    success: boolean;
    targetedCount: number;
    successfulCount: number;
    failedCount: number;
    message: string;
    log?: NotificationDispatchLog;
  }>;
  setMatchScores: (scoreA: number, scoreB: number, goals?: MatchGoal[], mvpWinnerId?: string) => void;
  createNewMatch: (
    date: string,
    time: string,
    cost: number,
    venue: string,
    venueLocation?: string,
    venueMapsUrl?: string,
    venueId?: string,
    matchFormat?: '5v5' | '6v6' | '7v7' | '8v8'
  ) => void;
  addPlayer: (
    name: string,
    pos: Position,
    secPos?: Position,
    isJoker?: boolean,
    phone?: string,
    baselineScore?: number,
    addToSquad?: boolean
  ) => void;
  batchAddPlayers: (
    playersToAdd: {
      name: string;
      pos: Position;
      phone?: string;
      baselineScore?: number;
      isJoker?: boolean;
    }[],
    addToSquad?: boolean
  ) => void;
  voteMvp: (playerId: string) => void;
  castMvpVote: (candidatePlayerId: string, voterId: string) => void;
  finalizeMvp: (winnerPlayerId: string) => void;
  setMatchFormat: (format: '5v5' | '6v6' | '7v7' | '8v8', matchId?: string) => void;
  assignPlayerToTeam: (
    playerId: string,
    team: 'teamA' | 'teamB' | 'bench',
    position?: Position,
    matchId?: string
  ) => void;
  updatePlayerPositionInTeam: (
    playerId: string,
    team: 'teamA' | 'teamB',
    newPosition: Position,
    matchId?: string
  ) => void;
  setTeamFormation: (team: 'teamA' | 'teamB', formation: string, matchId?: string) => void;
  updateMatchDetails: (details: Partial<Match>, matchId?: string) => void;
  applyPenalty: (playerId: string, points: number, reason?: string) => void;
  clearPenalties: (playerId: string) => void;
  currentUser: AppUser;
  setCurrentUser: (user: AppUser) => void;
  isAdmin: boolean;
  isCouncil: boolean;
  isPlayer: boolean;
  isGuest: boolean;
  firebaseActive: boolean;
  refreshFirebaseStatus: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Try loading saved config
  const savedConfig = loadSavedFirebaseConfig();
  if (savedConfig) {
    initFirebase(savedConfig);
  }

  // Load initial players or saved (Ensuring all players are preserved with backwards-compatibility)
  const [players, setPlayers] = useState<Player[]>(() => {
    const cached = getLocalPlayers();
    if (cached && cached.length >= RAW_PLAYERS_DATA.length) return cached;

    const initial = buildInitialPlayers(RAW_PLAYERS_DATA);
    if (cached && cached.length > 0) {
      const cachedMap = new Map(cached.map(p => [p.name.toLowerCase().trim(), p]));
      const merged = initial.map(p => {
        const existing = cachedMap.get(p.name.toLowerCase().trim());
        if (existing) {
          return recalculatePlayerStats({
            ...p,
            ratings: { ...p.ratings, ...existing.ratings },
            isJoker: existing.isJoker ?? p.isJoker,
            paymentExemption: existing.paymentExemption ?? p.paymentExemption,
          });
        }
        return p;
      });
      saveLocalPlayers(merged);
      return merged;
    }
    saveLocalPlayers(initial);
    return initial;
  });

  const [currentMatch, setCurrentMatch] = useState<Match>(() => {
    const local = getLocalCurrentMatch(INITIAL_MATCH);
    if (
      !local ||
      !local.squad ||
      !local.squad.length ||
      local.squad.some(id => id === 'p_hadi' || id === 'p_sukru')
    ) {
      saveMatchToDatabase(INITIAL_MATCH, true, false);
      return INITIAL_MATCH;
    }
    return local;
  });

  const [pastMatches, setPastMatches] = useState<Match[]>(() => {
    const cached = getLocalPastMatches(PAST_MATCHES);
    if (!cached || cached.length === 0 || cached.some(m => !m.squad || m.squad.length === 0)) {
      saveLocalPastMatches(PAST_MATCHES);
      return PAST_MATCHES;
    }
    return cached;
  });

  const [venues, setVenues] = useState<Venue[]>(() => {
    const cached = getLocalVenues(INITIAL_VENUES);
    saveLocalVenues(cached);
    return cached;
  });

  const addVenue = (name: string, location: string, defaultCost?: number): Venue => {
    const cleanName = name.trim() || 'Yeni Halı Saha';
    const cleanLoc = location.trim();
    const newVenue: Venue = {
      id: `venue_${Date.now()}`,
      name: cleanName,
      location: cleanLoc || cleanName,
      mapsUrl: buildGoogleMapsUrl(cleanName, cleanLoc),
      defaultCost: defaultCost && defaultCost > 0 ? defaultCost : 2800,
    };
    setVenues(prev => {
      const next = [...prev, newVenue];
      saveVenueToDatabase(newVenue, next);
      return next;
    });
    return newVenue;
  };

  const updateVenue = (updated: Venue) => {
    const withMaps: Venue = {
      ...updated,
      mapsUrl: buildGoogleMapsUrl(updated.name, updated.location),
    };
    setVenues(prev => {
      const next = prev.map(v => (v.id === withMaps.id ? withMaps : v));
      saveVenueToDatabase(withMaps, next);
      return next;
    });
  };

  const deleteVenue = (venueId: string) => {
    setVenues(prev => {
      const next = prev.filter(v => v.id !== venueId);
      saveLocalVenues(next);
      return next;
    });
  };

  const [currentEvaluator, setCurrentEvaluator] = useState<Evaluator>(COUNCIL_MEMBERS[0]);
  const [firebaseActive, setFirebaseActive] = useState<boolean>(isFirebaseConnected());

  // User identity: Admin, Council Member, Registered Player, or Guest
  const [currentUser, setCurrentUser] = useState<AppUser>(() => {
    const isCouncilAuthenticated = () => {
      try {
        return localStorage.getItem('halisaha_admin_authenticated') === 'true';
      } catch {
        return false;
      }
    };

    // 1. Check if URL param exists (e.g. ?player=p_sidar or ?user=eval_hadi)
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const playerParam = params.get('player');
        if (playerParam) {
          const adminMatch = ADMIN_USERS.find(a => a.playerId === playerParam);
          if (adminMatch) {
            if (isCouncilAuthenticated()) {
              return adminMatch;
            }
            return {
              id: `player_${adminMatch.playerId}`,
              name: adminMatch.name,
              role: 'player',
              playerId: adminMatch.playerId,
            };
          }
          const foundPlayer = RAW_PLAYERS_DATA.find(p => p.id === playerParam);
          if (foundPlayer) {
            return {
              id: `player_${foundPlayer.id}`,
              name: foundPlayer.name,
              role: 'player',
              playerId: foundPlayer.id,
            };
          }
        }
        const userParam = params.get('user');
        if (userParam) {
          const adminMatch = ADMIN_USERS.find(a => a.id === userParam);
          if (adminMatch && isCouncilAuthenticated()) {
            return adminMatch;
          }
        }
      }
    } catch {}

    // 2. Check localStorage
    try {
      const saved = localStorage.getItem('halisaha_current_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.role === 'admin' || parsed.role === 'council_member') {
          if (isCouncilAuthenticated()) {
            return parsed;
          }
          return DEFAULT_GUEST_USER;
        }
        return parsed;
      }
    } catch {}

    // 3. Fallback: if authenticated as council, default to Hadi Hoca; otherwise guest
    if (isCouncilAuthenticated()) {
      return ADMIN_USERS[0];
    }
    return DEFAULT_GUEST_USER;
  });

  const handleSetCurrentUser = (user: AppUser) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('halisaha_current_user', JSON.stringify(user));
      // Ensure active match is always consistent across user switches
      const latestMatch = getLocalCurrentMatch(currentMatch);
      if (latestMatch && latestMatch.id) {
        setCurrentMatch(latestMatch);
      }
      fetchLatestMatchFromCloudSync().then(cloudData => {
        if (cloudData && cloudData.match && cloudData.ts >= getLocalMatchTimestamp()) {
          setLocalMatchTimestamp(cloudData.ts);
          saveMatchToDatabase(cloudData.match, true, false);
          setCurrentMatch(cloudData.match);
        }
      });
    } catch {}

    if (user.evaluatorId) {
      const foundEvaluator = COUNCIL_MEMBERS.find(m => m.id === user.evaluatorId);
      if (foundEvaluator) {
        setCurrentEvaluator(foundEvaluator);
      }
    }
  };

  const isAdmin = currentUser.role === 'admin';
  const isCouncil = currentUser.role === 'admin' || currentUser.role === 'council_member';
  const isPlayer = currentUser.role === 'player';
  const isGuest = currentUser.role === 'guest';

  const refreshFirebaseStatus = () => {
    setFirebaseActive(isFirebaseConnected());
  };

  // Realtime sync subscription for currentMatch (Firestore & Cross-tab storage)
  useEffect(() => {
    const unsubscribe = subscribeToMatchUpdates(currentMatch.id, remoteMatch => {
      setCurrentMatch(remoteMatch);
    });
    return () => unsubscribe();
  }, [currentMatch.id, firebaseActive]);

  // Fast map lookup
  const playersMap = useMemo(() => {
    const map: Record<string, Player> = {};
    players.forEach(p => {
      map[p.id] = p;
    });
    return map;
  }, [players]);

  // Update a single rating (Only allowed if Council Member)
  const updateRating = (
    playerId: string,
    evaluatorId: string,
    criterionKey: string,
    score: number
  ) => {
    if (!isCouncil) {
      console.warn('Unauthorized rating attempt blocked.');
      return;
    }

    setPlayers(prev => {
      const next = prev.map(p => {
        if (p.id !== playerId) return p;

        const currentEvaluatorRatings = p.ratings[evaluatorId] || {};
        const updatedRatings = {
          ...p.ratings,
          [evaluatorId]: {
            ...currentEvaluatorRatings,
            [criterionKey]: score,
          },
        };

        const updatedPlayer = recalculatePlayerStats({
          ...p,
          ratings: updatedRatings,
        });

        savePlayerToDatabase(updatedPlayer);
        return updatedPlayer;
      });

      saveLocalPlayers(next);
      return next;
    });
  };

  // ==========================================
  // PAYMENT EXEMPTION MANAGEMENT
  // ==========================================

  const setPlayerExemption = (
    playerId: string,
    exemption: Partial<PaymentExemption> | null,
    reason?: string
  ) => {
    if (!isAdmin) {
      alert('Yalnızca yöneticiler ödeme muafiyeti belirleyebilir.');
      return;
    }

    const player = playersMap[playerId];
    if (!player) return;

    let updatedExemption: PaymentExemption | undefined = undefined;

    if (exemption && exemption.isActive !== false) {
      updatedExemption = {
        id: player.paymentExemption?.id || `ex_${Date.now()}_${playerId}`,
        playerId,
        isActive: true,
        reason: reason || exemption.reason || 'Yönetici Muafiyeti',
        scope: exemption.scope || 'all',
        matchIds: exemption.matchIds,
        startDate: exemption.startDate,
        endDate: exemption.endDate,
        createdAt: player.paymentExemption?.createdAt || new Date().toISOString(),
        createdBy: player.paymentExemption?.createdBy || currentUser.name,
      };
    } else if (player.paymentExemption) {
      // Deactivating exemption
      updatedExemption = {
        ...player.paymentExemption,
        isActive: false,
        revokedAt: new Date().toISOString(),
        revokedBy: currentUser.name,
      };
    }

    // 1. Update Player Record
    setPlayers(prev => {
      const next = prev.map(p => {
        if (p.id !== playerId) return p;
        const updated = {
          ...p,
          paymentExemption: updatedExemption,
        };
        savePlayerToDatabase(updated);
        return updated;
      });
      saveLocalPlayers(next);
      return next;
    });

    // 2. Audit Log
    const auditLog: ExemptionAuditLog = {
      id: `ex_log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: updatedExemption?.isActive ? 'granted' : 'revoked',
      playerId,
      playerName: player.name,
      performedBy: currentUser.name,
      reason: reason || updatedExemption?.reason,
      details: updatedExemption?.isActive
        ? `Kapsam: ${updatedExemption.scope}`
        : 'Muafiyet kaldırıldı',
    };
    appendLocalExemptionAuditLog(auditLog);

    // 3. Update currentMatch payment record without erasing historical payments
    setCurrentMatch(prev => {
      const currentPay = prev.payments[playerId] || {
        isPaid: false,
        amount: 0,
        calculatedDue: prev.costPerPlayer,
      };
      const isExemptNow = updatedExemption?.isActive ?? false;

      const nextPay = {
        ...currentPay,
        isExempt: isExemptNow,
        calculatedDue: isExemptNow ? 0 : prev.costPerPlayer,
        exemptionReason: isExemptNow ? updatedExemption?.reason : undefined,
      };

      const updatedMatch = {
        ...prev,
        payments: {
          ...prev.payments,
          [playerId]: nextPay,
        },
      };
      saveMatchToDatabase(updatedMatch);
      return updatedMatch;
    });
  };

  const getExemptionAuditLogs = (): ExemptionAuditLog[] => {
    return getLocalExemptionAuditLogs();
  };

  // Toggle Payment for a Player in match
  const togglePayment = (playerId: string, matchId?: string) => {
    const isTargetCurrent = !matchId || matchId === currentMatch.id;

    if (isTargetCurrent) {
      setCurrentMatch(prev => {
        const player = playersMap[playerId];
        const exemptionInfo = isPlayerExemptForMatch(player, prev);
        const currentPay = prev.payments[playerId] || {
          isPaid: false,
          amount: prev.costPerPlayer,
          calculatedDue: exemptionInfo.isExempt ? 0 : prev.costPerPlayer,
        };

        const newStatus = !currentPay.isPaid;
        const effectiveAmount = exemptionInfo.isExempt ? 0 : prev.costPerPlayer;

        const updatedHistory = [
          ...(currentPay.history || []),
          {
            timestamp: new Date().toISOString(),
            action: newStatus ? 'payment_marked' : 'payment_cancelled',
            amount: effectiveAmount,
            performedBy: currentUser.name,
            note: exemptionInfo.isExempt ? 'Muaf oyuncu' : undefined,
          },
        ];

        const updatedPayments = {
          ...prev.payments,
          [playerId]: {
            ...currentPay,
            isPaid: newStatus,
            paidAt: newStatus ? new Date().toISOString() : undefined,
            amount: effectiveAmount,
            calculatedDue: exemptionInfo.isExempt ? 0 : prev.costPerPlayer,
            isExempt: exemptionInfo.isExempt,
            exemptionReason: exemptionInfo.reason,
            history: updatedHistory,
          },
        };

        const nextMatch: Match = {
          ...prev,
          payments: updatedPayments,
        };

        saveMatchToDatabase(nextMatch);
        return nextMatch;
      });

      // Update player ledger if not exempt
      const player = playersMap[playerId];
      const isExempt = isPlayerExemptForMatch(player, currentMatch).isExempt;
      if (!isExempt) {
        setPlayers(prev => {
          const next = prev.map(p => {
            if (p.id !== playerId) return p;
            const currentPay = currentMatch.payments[playerId]?.isPaid;
            const delta = currentPay ? -currentMatch.costPerPlayer : currentMatch.costPerPlayer;
            const updated = {
              ...p,
              financialBalance: p.financialBalance + delta,
            };
            savePlayerToDatabase(updated);
            return updated;
          });
          saveLocalPlayers(next);
          return next;
        });
      }
    } else {
      setPastMatches(prev => {
        const next = prev.map(m => {
          if (m.id !== matchId) return m;
          const player = playersMap[playerId];
          const exemptionInfo = isPlayerExemptForMatch(player, m);
          const currentPay = m.payments[playerId] || {
            isPaid: false,
            amount: m.costPerPlayer,
            calculatedDue: exemptionInfo.isExempt ? 0 : m.costPerPlayer,
          };
          const newStatus = !currentPay.isPaid;
          const effectiveAmount = exemptionInfo.isExempt ? 0 : m.costPerPlayer;

          return {
            ...m,
            payments: {
              ...m.payments,
              [playerId]: {
                ...currentPay,
                isPaid: newStatus,
                paidAt: newStatus ? new Date().toISOString() : undefined,
                amount: effectiveAmount,
                calculatedDue: exemptionInfo.isExempt ? 0 : m.costPerPlayer,
                isExempt: exemptionInfo.isExempt,
              },
            },
          };
        });
        saveLocalPastMatches(next);
        return next;
      });
    }
  };

  // ==========================================
  // SQUAD PERSISTENCE, LOCKING & VERSIONING
  // ==========================================

  const saveSquadForMatch = (
    matchId: string,
    teamA: Team,
    teamB: Team,
    squad: string[],
    lockStatus?: SquadLockStatus,
    note?: string
  ): { success: boolean; error?: string } => {
    try {
      // 1. Data Integrity: Prevent assigning the same player to both teams
      const seenPlayers = new Set<string>();
      const cleanTeamAPlayers = teamA.players.filter(p => {
        if (seenPlayers.has(p.playerId)) return false;
        seenPlayers.add(p.playerId);
        return true;
      });
      const cleanTeamBPlayers = teamB.players.filter(p => {
        if (seenPlayers.has(p.playerId)) return false;
        seenPlayers.add(p.playerId);
        return true;
      });

      const uniqueSquad = Array.from(seenPlayers);
      const powerA = Number(cleanTeamAPlayers.reduce((sum, p) => sum + p.score, 0).toFixed(1));
      const powerB = Number(cleanTeamBPlayers.reduce((sum, p) => sum + p.score, 0).toFixed(1));

      const updatedTeamA: Team = {
        ...teamA,
        players: cleanTeamAPlayers,
        totalPower: powerA,
      };
      const updatedTeamB: Team = {
        ...teamB,
        players: cleanTeamBPlayers,
        totalPower: powerB,
      };

      const isCurrent = matchId === currentMatch.id;
      const targetMatch = isCurrent ? currentMatch : pastMatches.find(m => m.id === matchId);

      if (!targetMatch) {
        return { success: false, error: 'Maç kaydı bulunamadı.' };
      }

      // Check lock protection
      if (targetMatch.squadLockStatus === 'finalized' && lockStatus !== 'draft' && !isAdmin) {
        return {
          success: false,
          error: 'Bu kadro kesinleşmiştir ve kilitlidir. Yalnızca yönetici kilidi açabilir.',
        };
      }

      const effectiveLockStatus: SquadLockStatus =
        lockStatus || targetMatch.squadLockStatus || 'draft';

      // 2. Create Squad Version
      const newVersion: SquadVersion = {
        id: `ver_${Date.now()}`,
        versionNumber: (targetMatch.squadVersions?.length || 0) + 1,
        savedAt: new Date().toISOString(),
        savedBy: currentUser.name || 'Yönetici',
        teamA: updatedTeamA,
        teamB: updatedTeamB,
        squad: uniqueSquad,
        status: effectiveLockStatus,
        note: note || (effectiveLockStatus === 'finalized' ? 'Kadro kesinleştirildi' : 'Kadro kaydedildi'),
      };

      const updatedVersions = [newVersion, ...(targetMatch.squadVersions || []).slice(0, 15)];

      const nextMatch: Match = {
        ...targetMatch,
        squad: uniqueSquad,
        teamA: updatedTeamA,
        teamB: updatedTeamB,
        squadLockStatus: effectiveLockStatus,
        squadVersions: updatedVersions,
        squadFinalizedAt:
          effectiveLockStatus === 'finalized'
            ? targetMatch.squadFinalizedAt || new Date().toISOString()
            : undefined,
        squadFinalizedBy:
          effectiveLockStatus === 'finalized'
            ? targetMatch.squadFinalizedBy || currentUser.name
            : undefined,
      };

      if (isCurrent) {
        setCurrentMatch(nextMatch);
      } else {
        setPastMatches(prev => prev.map(m => (m.id === matchId ? nextMatch : m)));
      }

      saveMatchToDatabase(nextMatch, isCurrent);
      return { success: true };
    } catch (err) {
      console.error('saveSquadForMatch error:', err);
      return { success: false, error: 'Kadro kaydedilirken beklenmeyen bir hata oluştu.' };
    }
  };

  const restoreSquadVersion = (
    matchId: string,
    versionId: string
  ): { success: boolean; error?: string } => {
    if (!isAdmin && !isCouncil) {
      return { success: false, error: 'Yalnızca konsey üyeleri kadro sürümünü geri yükleyebilir.' };
    }

    const isCurrent = matchId === currentMatch.id;
    const targetMatch = isCurrent ? currentMatch : pastMatches.find(m => m.id === matchId);
    if (!targetMatch) return { success: false, error: 'Maç bulunamadı.' };

    const version = targetMatch.squadVersions?.find(v => v.id === versionId);
    if (!version) return { success: false, error: 'Seçilen kadro sürümü bulunamadı.' };

    // Restore squad and record as a new version
    return saveSquadForMatch(
      matchId,
      version.teamA,
      version.teamB,
      version.squad,
      version.status,
      `Sürüm #${version.versionNumber} (${new Date(version.savedAt).toLocaleTimeString('tr-TR')}) geri yüklendi`
    );
  };

  const toggleSquadLock = (
    matchId: string
  ): { success: boolean; newStatus?: SquadLockStatus; error?: string } => {
    if (!isAdmin) {
      return { success: false, error: 'Yalnızca yöneticiler kadroyu kesinleştirebilir veya kilidi açabilir.' };
    }

    const isCurrent = matchId === currentMatch.id;
    const targetMatch = isCurrent ? currentMatch : pastMatches.find(m => m.id === matchId);
    if (!targetMatch) return { success: false, error: 'Maç bulunamadı.' };

    const nextStatus: SquadLockStatus =
      targetMatch.squadLockStatus === 'finalized' ? 'draft' : 'finalized';

    const res = saveSquadForMatch(
      matchId,
      targetMatch.teamA,
      targetMatch.teamB,
      targetMatch.squad,
      nextStatus,
      nextStatus === 'finalized' ? 'Kadro kilitlendi ve kesinleştirildi' : 'Kadro düzenleme için taslağa alındı'
    );

    if (res.success) {
      return { success: true, newStatus: nextStatus };
    }
    return { success: false, error: res.error };
  };

  // ==========================================
  // ATTENDANCE & DECLINE ALERTS & NOTIFICATIONS
  // ==========================================

  const updateMatchAttendance = (
    matchId: string,
    playerId: string,
    status: AttendanceStatus,
    modifiedBy?: string
  ) => {
    const isCurrent = matchId === currentMatch.id;
    const player = playersMap[playerId];
    const operator = modifiedBy || currentUser.name;

    const isDecline =
      status === 'Gelemiyor' ||
      status === 'Gelmedi' ||
      status === 'Son dakika iptal' ||
      status === 'Satış koydu';

    const applyToMatch = (prev: Match): Match => {
      const updatedAttendance = {
        ...prev.attendance,
        [playerId]: status,
      };

      const updatedTimestamps = {
        ...(prev.attendanceTimestamps || {}),
        [playerId]: new Date().toISOString(),
      };

      const updatedAudits = {
        ...(prev.attendanceAdminAudits || {}),
        [playerId]: {
          modifiedBy: operator,
          modifiedAt: new Date().toISOString(),
          prevStatus: prev.attendance[playerId],
        },
      };

      const isPendingNow = status === 'Haber Bekleniyor' || status === 'Beklemede';
      const existingReq = prev.attendanceRequests?.[playerId];
      const updatedRequests = {
        ...(prev.attendanceRequests || {}),
        ...(existingReq
          ? {
              [playerId]: {
                ...existingReq,
                status: isPendingNow ? ('pending' as const) : ('responded' as const),
                respondedAt: isPendingNow ? undefined : new Date().toISOString(),
              },
            }
          : {}),
      };

      let newSquad = [...prev.squad];
      if (status === 'Geliyor' || status === 'Geldi') {
        if (!newSquad.includes(playerId)) {
          newSquad.push(playerId);
        }
      } else if (isDecline) {
        newSquad = newSquad.filter(id => id !== playerId);
      }

      // If declined, append an Admin Decline Alert
      let updatedAlerts = prev.adminDeclineAlerts || [];
      if (isDecline && player) {
        const alert: DeclineAlert = {
          id: `alert_${Date.now()}_${playerId}`,
          playerId,
          playerName: player.name,
          matchId: prev.id,
          matchNumber: prev.matchNumber,
          response: status,
          timestamp: new Date().toISOString(),
          read: false,
        };
        updatedAlerts = [alert, ...updatedAlerts.filter(a => a.playerId !== playerId)];

        // Real system push trigger for admins
        try {
          sendSystemNotification({
            title: `🚨 Katılım Uyarısı: ${player.name} Gelmiyorum Dedi!`,
            body: `${player.name}, ${prev.matchNumber}. Hafta maçı için "${status}" yanıtını bildirdi.`,
            tag: `decline-${playerId}-${prev.id}`,
          });
        } catch {}
      }

      const nextMatch: Match = {
        ...prev,
        squad: newSquad,
        attendance: updatedAttendance,
        attendanceTimestamps: updatedTimestamps,
        attendanceRequests: updatedRequests,
        attendanceAdminAudits: updatedAudits,
        adminDeclineAlerts: updatedAlerts,
      };

      saveMatchToDatabase(nextMatch, isCurrent);
      return nextMatch;
    };

    if (isCurrent) {
      setCurrentMatch(applyToMatch);
    } else {
      setPastMatches(prev => prev.map(m => (m.id === matchId ? applyToMatch(m) : m)));
    }

    // Also update penalty stats for the player if noShow/cancel
    setPlayers(prev => {
      const next = prev.map(p => {
        if (p.id !== playerId) return p;

        let noShowDelta = 0;
        let cancelDelta = 0;
        let penaltyDelta = 0;
        if (status === 'Gelmedi') {
          noShowDelta = 1;
          penaltyDelta = 30;
        }
        if (status === 'Son dakika iptal' || status === 'Satış koydu') {
          cancelDelta = 1;
          penaltyDelta = 15;
        }

        const recent = [status, ...(p.attendanceStats.recentAttendance || []).slice(0, 4)];
        const noShowCount = recent.filter(s => s === 'Gelmedi').length;
        const newPenalty = Math.max(0, p.attendanceStats.penaltyPoints + penaltyDelta);

        const updated = recalculatePlayerStats({
          ...p,
          attendanceStats: {
            ...p.attendanceStats,
            penaltyPoints: newPenalty,
            noShow: p.attendanceStats.noShow + noShowDelta,
            lastMinuteCancel: p.attendanceStats.lastMinuteCancel + cancelDelta,
            recentAttendance: recent,
            isSuspended: noShowCount >= 2 || newPenalty >= 30,
          },
        });

        savePlayerToDatabase(updated);
        return updated;
      });

      saveLocalPlayers(next);
      return next;
    });
  };

  const updateAttendance = (playerId: string, status: AttendanceStatus) => {
    updateMatchAttendance(currentMatch.id, playerId, status);
  };

  const dismissDeclineAlert = (matchId: string, alertId: string) => {
    const isCurrent = matchId === currentMatch.id;
    const filterAlerts = (prev: Match): Match => {
      const nextAlerts = (prev.adminDeclineAlerts || []).map(a =>
        a.id === alertId ? { ...a, read: true, acknowledgedBy: currentUser.name } : a
      );
      const updated = { ...prev, adminDeclineAlerts: nextAlerts };
      saveMatchToDatabase(updated);
      return updated;
    };

    if (isCurrent) {
      setCurrentMatch(filterAlerts);
    } else {
      setPastMatches(prev => prev.map(m => (m.id === matchId ? filterAlerts(m) : m)));
    }
  };

  // Send targeted attendance notification request to a single player
  // Sets their status to "Haber Bekleniyor" (Bekliyor) until they respond
  const sendPlayerAttendanceRequest = async (
    playerId: string
  ): Promise<{ success: boolean; message: string }> => {
    const player = playersMap[playerId];
    if (!player) {
      return { success: false, message: 'Oyuncu bulunamadı.' };
    }

    const nowIso = new Date().toISOString();

    setCurrentMatch(prev => {
      const updatedAttendance = {
        ...prev.attendance,
        [playerId]: 'Haber Bekleniyor' as AttendanceStatus,
      };

      const updatedRequests = {
        ...(prev.attendanceRequests || {}),
        [playerId]: {
          playerId,
          requestedAt: nowIso,
          requestedBy: currentUser.name,
          status: 'pending' as const,
        },
      };

      const dispatchLog: NotificationDispatchLog = {
        id: `disp_${Date.now()}_${playerId}`,
        matchId: prev.id,
        matchNumber: prev.matchNumber,
        dispatchedAt: nowIso,
        dispatchedBy: currentUser.name,
        totalTargeted: 1,
        successfulCount: 1,
        failedCount: 0,
        channel: 'web_push',
        recipients: [
          {
            playerId: player.id,
            playerName: player.name,
            phone: player.phone,
            status: 'delivered',
          },
        ],
        note: `${player.name} için maça katılım bildirimi gönderildi (Haber Bekleniyor).`,
      };

      appendLocalNotificationLog(dispatchLog);

      const nextMatch: Match = {
        ...prev,
        attendance: updatedAttendance,
        attendanceRequests: updatedRequests,
        notificationLogs: [dispatchLog, ...(prev.notificationLogs || []).slice(0, 20)],
      };

      saveMatchToDatabase(nextMatch, true);
      return nextMatch;
    });

    try {
      await sendSystemNotification({
        title: `⚽ ${player.name} — Maça Geliyor musun?`,
        body: `${currentMatch.matchNumber}. Hafta (${currentMatch.venueName}, ${currentMatch.time}) maçı için katılım onayınız bekleniyor!`,
        tag: `invite-req-${currentMatch.id}-${playerId}-${Date.now()}`,
      });
    } catch {}

    return {
      success: true,
      message: `${player.name} adlı oyuncuya katılım bildirimi gönderildi! Cevap verene kadar durumu "Bekliyor" olarak ayarlandı.`,
    };
  };

  // Re-notify pending players with rate-limit and auditing
  const sendReNotificationToPending = async (
    matchId: string
  ): Promise<{
    success: boolean;
    targetedCount: number;
    successfulCount: number;
    failedCount: number;
    message: string;
    log?: NotificationDispatchLog;
  }> => {
    if (!isAdmin && !isCouncil) {
      return {
        success: false,
        targetedCount: 0,
        successfulCount: 0,
        failedCount: 0,
        message: 'Yetkisiz işlem: Bildirim gönderme yetkiniz bulunmamaktadır.',
      };
    }

    const isCurrent = matchId === currentMatch.id;
    const targetMatch = isCurrent ? currentMatch : pastMatches.find(m => m.id === matchId);
    if (!targetMatch) {
      return {
        success: false,
        targetedCount: 0,
        successfulCount: 0,
        failedCount: 0,
        message: 'Maç kaydı bulunamadı.',
      };
    }

    // 1. Filter ONLY players who have not answered (Pending)
    const pendingPlayers = players.filter(p => {
      const st = targetMatch.attendance?.[p.id];
      return (
        !st ||
        st === 'Haber Bekleniyor' ||
        st === 'Beklemede'
      );
    });

    if (pendingPlayers.length === 0) {
      return {
        success: false,
        targetedCount: 0,
        successfulCount: 0,
        failedCount: 0,
        message: 'Bu maç için yanıt vermeyen oyuncu bulunmuyor. Tüm oyuncular katılım durumunu bildirmiştir.',
      };
    }

    // 2. Throttle Protection: Prevent accidental duplicate dispatches within 2 minutes
    const lastLogs = targetMatch.notificationLogs || [];
    if (lastLogs.length > 0) {
      const lastTime = new Date(lastLogs[0].dispatchedAt).getTime();
      const elapsedSec = (Date.now() - lastTime) / 1000;
      if (elapsedSec < 60) {
        return {
          success: false,
          targetedCount: pendingPlayers.length,
          successfulCount: 0,
          failedCount: 0,
          message: `Lütfen bekleyin! Son bildirim ${Math.round(elapsedSec)} saniye önce gönderildi. Spam önleme amacıyla 1 dakika beklenmelidir.`,
        };
      }
    }

    // 3. Dispatch Web Notification
    let pushSuccess = false;
    try {
      pushSuccess = await sendSystemNotification({
        title: `⚽ ${targetMatch.matchNumber}. Hafta Katılım Hatırlatması`,
        body: `${pendingPlayers.length} kişiye yoklama hatırlatması gönderildi. Saha: ${targetMatch.venueName}`,
        tag: `re-notify-${targetMatch.id}-${Date.now()}`,
      });
    } catch {}

    // 4. Construct detailed recipient results
    const recipients = pendingPlayers.map(p => ({
      playerId: p.id,
      playerName: p.name,
      phone: p.phone,
      status: 'success' as const,
    }));

    const dispatchLog: NotificationDispatchLog = {
      id: `disp_${Date.now()}`,
      matchId: targetMatch.id,
      matchNumber: targetMatch.matchNumber,
      dispatchedAt: new Date().toISOString(),
      dispatchedBy: currentUser.name,
      totalTargeted: pendingPlayers.length,
      successfulCount: pendingPlayers.length,
      failedCount: 0,
      channel: 'web_push',
      recipients,
      note: `${pendingPlayers.length} yanıt vermeyen oyuncuya tekrar bildirim iletildi.`,
    };

    appendLocalNotificationLog(dispatchLog);

    const updateLogs = (prev: Match): Match => {
      const updated = {
        ...prev,
        notificationLogs: [dispatchLog, ...(prev.notificationLogs || []).slice(0, 20)],
      };
      saveMatchToDatabase(updated);
      return updated;
    };

    if (isCurrent) {
      setCurrentMatch(updateLogs);
    } else {
      setPastMatches(prev => prev.map(m => (m.id === matchId ? updateLogs(m) : m)));
    }

    return {
      success: true,
      targetedCount: pendingPlayers.length,
      successfulCount: pendingPlayers.length,
      failedCount: 0,
      message: `Tebrikler! Yanıt vermeyen ${pendingPlayers.length} oyuncuya tekrar bildirim başarıyla iletildi.`,
      log: dispatchLog,
    };
  };

  // Update squad list
  const updateSquad = (newSquadIds: string[], matchId?: string) => {
    const isCurrent = !matchId || matchId === currentMatch.id;
    const targetMatch = isCurrent ? currentMatch : pastMatches.find(m => m.id === matchId);
    if (!targetMatch) return;

    const costPerPlayer =
      newSquadIds.length > 0 ? Math.round(targetMatch.totalPitchCost / newSquadIds.length) : 0;
    const balanced = balanceTeams(newSquadIds, playersMap);

    saveSquadForMatch(
      targetMatch.id,
      balanced.teamA,
      balanced.teamB,
      newSquadIds,
      targetMatch.squadLockStatus,
      'Kadro güncellendi'
    );
  };

  // Auto balance squad
  const autoBalanceSquad = (matchId?: string) => {
    const isCurrent = !matchId || matchId === currentMatch.id;
    const targetMatch = isCurrent ? currentMatch : pastMatches.find(m => m.id === matchId);
    if (!targetMatch) return;

    const balanced = balanceTeams(targetMatch.squad, playersMap);
    saveSquadForMatch(
      targetMatch.id,
      balanced.teamA,
      balanced.teamB,
      targetMatch.squad,
      targetMatch.squadLockStatus,
      'Otomatik kadro dengelemesi uygulandı'
    );
  };

  // Synchronize squad from players who confirmed attendance ("Geliyor" or "Geldi")
  const syncSquadFromAttendees = (matchId?: string) => {
    const isCurrent = !matchId || matchId === currentMatch.id;
    const targetMatch = isCurrent ? currentMatch : pastMatches.find(m => m.id === matchId);
    if (!targetMatch) return { success: false, count: 0, message: 'Maç bulunamadı' };

    const comingPlayerIds = Object.entries(targetMatch.attendance)
      .filter(([_, status]) => status === 'Geliyor' || status === 'Geldi')
      .map(([id]) => id);

    if (comingPlayerIds.length === 0) {
      return {
        success: false,
        count: 0,
        totalComing: 0,
        message:
          'Bu hafta için henüz "Geliyor" olarak teyit veren oyuncu bulunmuyor. Önce yoklamadan veya WhatsApp bildiriminden teyit toplayınız.',
      };
    }

    const target = targetMatch.targetSquadCount || 14;
    const newSquad = comingPlayerIds.slice(0, target);
    const balanced = balanceTeams(newSquad, playersMap);

    saveSquadForMatch(
      targetMatch.id,
      balanced.teamA,
      balanced.teamB,
      newSquad,
      targetMatch.squadLockStatus,
      'Kadro gelen oyunculardan senkronize edildi'
    );

    return { success: true, count: newSquad.length, totalComing: comingPlayerIds.length };
  };

  // Set match scores and complete
  const setMatchScores = (
    scoreA: number,
    scoreB: number,
    goals?: MatchGoal[],
    mvpWinnerId?: string
  ) => {
    const completedMatch: Match = {
      ...currentMatch,
      status: 'completed',
      teamA: { ...currentMatch.teamA, score: scoreA },
      teamB: { ...currentMatch.teamB, score: scoreB },
      goals: goals !== undefined ? goals : currentMatch.goals,
      mvpWinnerId: mvpWinnerId !== undefined ? mvpWinnerId : currentMatch.mvpWinnerId,
    };

    setCurrentMatch(completedMatch);
    saveMatchToDatabase(completedMatch);

    setPastMatches(prev => {
      const next = [completedMatch, ...prev.filter(m => m.id !== completedMatch.id)];
      saveLocalPastMatches(next);
      return next;
    });
  };

  // Create next match
  const createNewMatch = (
    date: string,
    time: string,
    cost: number,
    venue: string,
    venueLocation?: string,
    venueMapsUrl?: string,
    venueId?: string,
    matchFormat: '5v5' | '6v6' | '7v7' | '8v8' = '7v7'
  ) => {
    setPastMatches(prev => {
      const next = [currentMatch, ...prev.filter(m => m.id !== currentMatch.id)];
      saveLocalPastMatches(next);
      return next;
    });

    const nextNumber = currentMatch.matchNumber + 1;
    const targetCount =
      matchFormat === '5v5' ? 10 : matchFormat === '6v6' ? 12 : matchFormat === '8v8' ? 16 : 14;
    const defaultSquad = players.slice(0, targetCount).map(p => p.id);
    const balanced = balanceTeams(defaultSquad, playersMap);

    const newM: Match = {
      id: `match_${nextNumber}`,
      matchNumber: nextNumber,
      date,
      time,
      venueId,
      venueName: venue,
      venueLocation: venueLocation || venue,
      venueMapsUrl: venueMapsUrl || buildGoogleMapsUrl(venue, venueLocation),
      pitchNo: 'Saha 1',
      totalPitchCost: cost,
      costPerPlayer: Math.round(cost / targetCount),
      matchFormat,
      targetSquadCount: targetCount,
      status: 'teams_formed',
      squad: defaultSquad,
      teamA: balanced.teamA,
      teamB: balanced.teamB,
      attendance: {},
      payments: {},
      squadLockStatus: 'draft',
      squadVersions: [
        {
          id: `ver_${Date.now()}`,
          versionNumber: 1,
          savedAt: new Date().toISOString(),
          savedBy: currentUser.name,
          teamA: balanced.teamA,
          teamB: balanced.teamB,
          squad: defaultSquad,
          status: 'draft',
          note: 'Yeni maç oluşturuldu',
        },
      ],
    };

    setCurrentMatch(newM);
    saveMatchToDatabase(newM, true);
  };

  const addPlayer = (
    name: string,
    pos: Position,
    secPos?: Position,
    isJoker: boolean = false,
    phone?: string,
    baselineScore: number = 7.5,
    addToSquad: boolean = false
  ) => {
    const newId = `p_custom_${Date.now()}`;
    const generatedRatings: Record<string, Record<string, number>> = {};
    COUNCIL_MEMBERS.forEach(m => {
      generatedRatings[m.id] = {};
      CRITERIA_KEYS.forEach(c => {
        const delta = (Math.random() > 0.5 ? 1 : -1) * (Math.random() > 0.6 ? 1 : 0);
        generatedRatings[m.id][c.key] = Math.max(
          1,
          Math.min(10, Math.round(baselineScore + delta))
        );
      });
    });

    const newP = recalculatePlayerStats({
      id: newId,
      name,
      primaryPosition: pos,
      secondaryPosition: secPos,
      isJoker,
      phone,
      ratings: generatedRatings,
      positionScores: {
        'Kaleci': baselineScore,
        'Defans': baselineScore,
        'Orta saha': baselineScore,
        'Kanat': baselineScore,
        'Forvet': baselineScore,
      },
      trimmedMean: baselineScore,
      standardDeviation: 0.2,
      finalScore: Number((baselineScore - 0.1).toFixed(1)),
      attendanceStats: {
        totalMatches: 0,
        attended: 0,
        lastMinuteCancel: 0,
        noShow: 0,
        penaltyPoints: 0,
        isSuspended: false,
        recentAttendance: [],
      },
      financialBalance: 0,
    });

    setPlayers(prev => {
      const next = [...prev, newP];
      saveLocalPlayers(next);
      savePlayerToDatabase(newP);
      return next;
    });

    if (addToSquad) {
      updateAttendance(newId, 'Geliyor');
    }
  };

  const batchAddPlayers = (
    playersToAdd: {
      name: string;
      pos: Position;
      phone?: string;
      baselineScore?: number;
      isJoker?: boolean;
    }[],
    addToSquad: boolean = false
  ) => {
    const newPlayers: Player[] = [];
    const newIds: string[] = [];

    playersToAdd.forEach((pData, idx) => {
      const newId = `p_custom_${Date.now()}_${idx}`;
      const base = pData.baselineScore || 7.5;
      const generatedRatings: Record<string, Record<string, number>> = {};
      COUNCIL_MEMBERS.forEach(m => {
        generatedRatings[m.id] = {};
        CRITERIA_KEYS.forEach(c => {
          const delta = (Math.random() > 0.5 ? 1 : -1) * (Math.random() > 0.6 ? 1 : 0);
          generatedRatings[m.id][c.key] = Math.max(1, Math.min(10, Math.round(base + delta)));
        });
      });

      const newP = recalculatePlayerStats({
        id: newId,
        name: pData.name,
        primaryPosition: pData.pos,
        secondaryPosition: undefined,
        isJoker: pData.isJoker || false,
        phone: pData.phone,
        ratings: generatedRatings,
        positionScores: {
          'Kaleci': base,
          'Defans': base,
          'Orta saha': base,
          'Kanat': base,
          'Forvet': base,
        },
        trimmedMean: base,
        standardDeviation: 0.2,
        finalScore: Number((base - 0.1).toFixed(1)),
        attendanceStats: {
          totalMatches: 0,
          attended: 0,
          lastMinuteCancel: 0,
          noShow: 0,
          penaltyPoints: 0,
          isSuspended: false,
          recentAttendance: [],
        },
        financialBalance: 0,
      });

      newPlayers.push(newP);
      newIds.push(newId);
    });

    setPlayers(prev => {
      const next = [...prev, ...newPlayers];
      saveLocalPlayers(next);
      newPlayers.forEach(p => savePlayerToDatabase(p));
      return next;
    });

    if (addToSquad) {
      newIds.forEach(id => updateAttendance(id, 'Geliyor'));
    }
  };

  const voteMvp = (playerId: string) => {
    setCurrentMatch(prev => {
      const currentVotes = prev.mvpVotes || {};
      const newVotes = {
        ...currentVotes,
        [playerId]: (currentVotes[playerId] || 0) + 1,
      };

      let maxV = 0;
      let winnerId = prev.mvpWinnerId;
      Object.entries(newVotes).forEach(([pId, vCount]) => {
        if (vCount > maxV) {
          maxV = vCount;
          winnerId = pId;
        }
      });

      const nextMatch: Match = {
        ...prev,
        mvpVotes: newVotes,
        mvpWinnerId: winnerId,
      };

      saveMatchToDatabase(nextMatch, true);
      return nextMatch;
    });
  };

  const castMvpVote = (candidatePlayerId: string, voterId: string) => {
    setCurrentMatch(prev => {
      const currentVotes = { ...(prev.mvpVotes || {}) };
      const currentUserVotes = { ...(prev.userMvpVotes || {}) };

      const prevVoted = currentUserVotes[voterId];
      if (prevVoted && currentVotes[prevVoted]) {
        currentVotes[prevVoted] = Math.max(0, currentVotes[prevVoted] - 1);
      }

      currentVotes[candidatePlayerId] = (currentVotes[candidatePlayerId] || 0) + 1;
      currentUserVotes[voterId] = candidatePlayerId;

      let maxV = 0;
      let winnerId = prev.mvpWinnerId;
      Object.entries(currentVotes).forEach(([pId, vCount]) => {
        if (vCount > maxV) {
          maxV = vCount;
          winnerId = pId;
        }
      });

      const nextMatch: Match = {
        ...prev,
        mvpVotes: currentVotes,
        userMvpVotes: currentUserVotes,
        mvpWinnerId: winnerId,
      };

      saveMatchToDatabase(nextMatch, true);
      return nextMatch;
    });
  };

  const finalizeMvp = (winnerPlayerId: string) => {
    setCurrentMatch(prev => {
      const nextMatch: Match = {
        ...prev,
        mvpWinnerId: winnerPlayerId,
      };
      saveMatchToDatabase(nextMatch, true);
      return nextMatch;
    });
  };

  const setMatchFormat = (format: '5v5' | '6v6' | '7v7' | '8v8', matchId?: string) => {
    const isCurrent = !matchId || matchId === currentMatch.id;
    const targetMatch = isCurrent ? currentMatch : pastMatches.find(m => m.id === matchId);
    if (!targetMatch) return;

    const targetMap = { '5v5': 10, '6v6': 12, '7v7': 14, '8v8': 16 };
    const formationMap: Record<string, string> = { '5v5': '2-1-1', '6v6': '2-2-1', '7v7': '3-2-1', '8v8': '3-3-1' };
    const target = targetMap[format] || 14;
    const nextFormation = formationMap[format] || '3-2-1';
    const costPerPlayer = Math.round(targetMatch.totalPitchCost / target);

    const newSquad =
      targetMatch.squad.length > target
        ? targetMatch.squad.slice(0, target)
        : targetMatch.squad;

    const balanced = balanceTeams(newSquad, playersMap);

    const nextMatch: Match = {
      ...targetMatch,
      matchFormat: format,
      targetSquadCount: target,
      costPerPlayer,
      squad: newSquad,
      teamA: {
        ...balanced.teamA,
        formation: nextFormation,
      },
      teamB: {
        ...balanced.teamB,
        formation: nextFormation,
      },
    };

    if (isCurrent) {
      setCurrentMatch(nextMatch);
    } else {
      setPastMatches(prev => prev.map(m => (m.id === matchId ? nextMatch : m)));
    }
    saveMatchToDatabase(nextMatch);
  };

  const assignPlayerToTeam = (
    playerId: string,
    targetTeam: 'teamA' | 'teamB' | 'bench',
    position?: Position,
    matchId?: string
  ) => {
    const isCurrent = !matchId || matchId === currentMatch.id;
    const targetMatch = isCurrent ? currentMatch : pastMatches.find(m => m.id === matchId);
    if (!targetMatch) return;

    if (targetMatch.squadLockStatus === 'finalized' && !isAdmin) {
      alert('Bu kadro kesinleşmiştir ve kilitlidir. Değişiklik yapmak için yönetici kilidi açmalıdır.');
      return;
    }

    const player = playersMap[playerId];
    if (!player) return;

    // Filter out player from both teams first to prevent duplicate assignment
    let newTeamAPlayers = targetMatch.teamA.players.filter(p => p.playerId !== playerId);
    let newTeamBPlayers = targetMatch.teamB.players.filter(p => p.playerId !== playerId);
    let newSquad = targetMatch.squad.filter(id => id !== playerId);

    if (targetTeam === 'teamA') {
      const pos = position || player.primaryPosition;
      const score = player.positionScores[pos] || player.finalScore;
      newTeamAPlayers.push({ playerId, position: pos, score });
      newSquad.push(playerId);
    } else if (targetTeam === 'teamB') {
      const pos = position || player.primaryPosition;
      const score = player.positionScores[pos] || player.finalScore;
      newTeamBPlayers.push({ playerId, position: pos, score });
      newSquad.push(playerId);
    }

    const powerA = Number(newTeamAPlayers.reduce((sum, p) => sum + p.score, 0).toFixed(1));
    const powerB = Number(newTeamBPlayers.reduce((sum, p) => sum + p.score, 0).toFixed(1));

    saveSquadForMatch(
      targetMatch.id,
      { ...targetMatch.teamA, players: newTeamAPlayers, totalPower: powerA },
      { ...targetMatch.teamB, players: newTeamBPlayers, totalPower: powerB },
      newSquad,
      targetMatch.squadLockStatus,
      `${player.name} ${targetTeam === 'bench' ? 'yedeğe alındı' : targetTeam === 'teamA' ? 'Kırmızı Takıma atandı' : 'Mavi Takıma atandı'}`
    );
  };

  const updatePlayerPositionInTeam = (
    playerId: string,
    team: 'teamA' | 'teamB',
    newPosition: Position,
    matchId?: string
  ) => {
    const isCurrent = !matchId || matchId === currentMatch.id;
    const targetMatch = isCurrent ? currentMatch : pastMatches.find(m => m.id === matchId);
    if (!targetMatch) return;

    if (targetMatch.squadLockStatus === 'finalized' && !isAdmin) {
      alert('Bu kadro kesinleşmiştir ve kilitlidir.');
      return;
    }

    const player = playersMap[playerId];
    if (!player) return;

    const targetList = team === 'teamA' ? targetMatch.teamA.players : targetMatch.teamB.players;
    const score = player.positionScores[newPosition] || player.finalScore;

    const updatedList = targetList.map(p =>
      p.playerId === playerId ? { ...p, position: newPosition, score } : p
    );

    const power = Number(updatedList.reduce((sum, p) => sum + p.score, 0).toFixed(1));

    const updatedTeamA =
      team === 'teamA' ? { ...targetMatch.teamA, players: updatedList, totalPower: power } : targetMatch.teamA;
    const updatedTeamB =
      team === 'teamB' ? { ...targetMatch.teamB, players: updatedList, totalPower: power } : targetMatch.teamB;

    saveSquadForMatch(
      targetMatch.id,
      updatedTeamA,
      updatedTeamB,
      targetMatch.squad,
      targetMatch.squadLockStatus,
      `${player.name} mevkisi ${newPosition} olarak güncellendi`
    );
  };

  const setTeamFormation = (team: 'teamA' | 'teamB', formation: string, matchId?: string) => {
    const isCurrent = !matchId || matchId === currentMatch.id;
    const targetMatch = isCurrent ? currentMatch : pastMatches.find(m => m.id === matchId);
    if (!targetMatch) return;

    const updatedTeam = {
      ...targetMatch[team],
      formation,
    };

    saveSquadForMatch(
      targetMatch.id,
      team === 'teamA' ? updatedTeam : targetMatch.teamA,
      team === 'teamB' ? updatedTeam : targetMatch.teamB,
      targetMatch.squad,
      targetMatch.squadLockStatus,
      `${team === 'teamA' ? 'Kırmızı' : 'Mavi'} Takım dizilişi ${formation} yapıldı`
    );
  };

  const applyPenalty = (playerId: string, points: number, reason?: string) => {
    setPlayers(prev => {
      const next = prev.map(p => {
        if (p.id !== playerId) return p;
        const newPenalty = Math.max(0, p.attendanceStats.penaltyPoints + points);
        const updated = recalculatePlayerStats({
          ...p,
          attendanceStats: {
            ...p.attendanceStats,
            penaltyPoints: newPenalty,
            isSuspended: newPenalty >= 30,
          },
        });
        savePlayerToDatabase(updated);
        return updated;
      });
      saveLocalPlayers(next);
      return next;
    });
  };

  const clearPenalties = (playerId: string) => {
    setPlayers(prev => {
      const next = prev.map(p => {
        if (p.id !== playerId) return p;
        const updated = recalculatePlayerStats({
          ...p,
          attendanceStats: {
            ...p.attendanceStats,
            penaltyPoints: 0,
            isSuspended: false,
          },
        });
        savePlayerToDatabase(updated);
        return updated;
      });
      saveLocalPlayers(next);
      return next;
    });
  };

  const updateMatchDetails = (details: Partial<Match>, matchId?: string) => {
    const isCurrent = !matchId || matchId === currentMatch.id;
    const applyDetails = (prev: Match): Match => {
      const nextMatch: Match = {
        ...prev,
        ...details,
      };

      if (details.totalPitchCost !== undefined || details.targetSquadCount !== undefined) {
        const target = nextMatch.targetSquadCount || 14;
        nextMatch.costPerPlayer = Math.round(nextMatch.totalPitchCost / (target || 14));
      }

      saveMatchToDatabase(nextMatch, isCurrent);
      return nextMatch;
    };

    if (isCurrent) {
      setCurrentMatch(applyDetails);
    } else {
      setPastMatches(prev => prev.map(m => (m.id === matchId ? applyDetails(m) : m)));
    }
  };

  return (
    <AppContext.Provider
      value={{
        players,
        playersMap,
        currentMatch,
        pastMatches,
        venues,
        addVenue,
        updateVenue,
        deleteVenue,
        currentEvaluator,
        setCurrentEvaluator,
        updateRating,
        updateAttendance,
        updateMatchAttendance,
        togglePayment,
        setPlayerExemption,
        getExemptionAuditLogs,
        updateSquad,
        autoBalanceSquad,
        syncSquadFromAttendees,
        saveSquadForMatch,
        restoreSquadVersion,
        toggleSquadLock,
        dismissDeclineAlert,
        sendPlayerAttendanceRequest,
        sendReNotificationToPending,
        setMatchScores,
        createNewMatch,
        updateMatchDetails,
        addPlayer,
        batchAddPlayers,
        voteMvp,
        castMvpVote,
        finalizeMvp,
        setMatchFormat,
        assignPlayerToTeam,
        updatePlayerPositionInTeam,
        setTeamFormation,
        applyPenalty,
        clearPenalties,
        currentUser,
        setCurrentUser: handleSetCurrentUser,
        isAdmin,
        isCouncil,
        isPlayer,
        isGuest,
        firebaseActive,
        refreshFirebaseStatus,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
