import React, { createContext, useContext, useState, useEffect } from 'react';
import { Player, Match, Evaluator, AttendanceStatus, Position } from '../types';
import {
  COUNCIL_MEMBERS,
  RAW_PLAYERS_DATA,
  INITIAL_MATCH,
  PAST_MATCHES,
  CRITERIA_KEYS,
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
} from '../services/firebase';

interface AppContextType {
  players: Player[];
  playersMap: Record<string, Player>;
  currentMatch: Match;
  pastMatches: Match[];
  currentEvaluator: Evaluator;
  setCurrentEvaluator: (evaluator: Evaluator) => void;
  updateRating: (playerId: string, evaluatorId: string, criterionKey: string, score: number) => void;
  updateAttendance: (playerId: string, status: AttendanceStatus) => void;
  togglePayment: (playerId: string) => void;
  updateSquad: (newSquadIds: string[]) => void;
  autoBalanceSquad: () => void;
  setMatchScores: (scoreA: number, scoreB: number) => void;
  createNewMatch: (date: string, time: string, cost: number, venue: string) => void;
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
  setMatchFormat: (format: '5v5' | '6v6' | '7v7' | '8v8') => void;
  assignPlayerToTeam: (playerId: string, team: 'teamA' | 'teamB' | 'bench', position?: Position) => void;
  updatePlayerPositionInTeam: (playerId: string, team: 'teamA' | 'teamB', newPosition: Position) => void;
  setTeamFormation: (team: 'teamA' | 'teamB', formation: string) => void;
  updateMatchDetails: (details: Partial<Match>) => void;
  applyPenalty: (playerId: string, points: number, reason?: string) => void;
  clearPenalties: (playerId: string) => void;
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

  // Load initial players or saved (Ensuring all 45 players are present)
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
      local.squad.length === 0 ||
      local.squad.some(id => id === 'p_hadi' || id === 'p_sukru')
    ) {
      saveMatchToDatabase(INITIAL_MATCH);
      return INITIAL_MATCH;
    }
    return local;
  });

  const [pastMatches, setPastMatches] = useState<Match[]>(() => {
    return getLocalPastMatches(PAST_MATCHES);
  });

  const [currentEvaluator, setCurrentEvaluator] = useState<Evaluator>(COUNCIL_MEMBERS[0]);
  const [firebaseActive, setFirebaseActive] = useState<boolean>(isFirebaseConnected());

  const refreshFirebaseStatus = () => {
    setFirebaseActive(isFirebaseConnected());
  };

  // Fast map lookup
  const playersMap = React.useMemo(() => {
    const map: Record<string, Player> = {};
    players.forEach(p => {
      map[p.id] = p;
    });
    return map;
  }, [players]);

  // Update a single rating
  const updateRating = (
    playerId: string,
    evaluatorId: string,
    criterionKey: string,
    score: number
  ) => {
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

        // Async write
        savePlayerToDatabase(updatedPlayer);
        return updatedPlayer;
      });

      saveLocalPlayers(next);
      return next;
    });
  };

  // Update Attendance for Current Match
  const updateAttendance = (playerId: string, status: AttendanceStatus) => {
    setCurrentMatch(prev => {
      const updatedAttendance = {
        ...prev.attendance,
        [playerId]: status,
      };

      let newSquad = [...prev.squad];
      if (status === 'Geliyor' || status === 'Geldi') {
        if (!newSquad.includes(playerId)) {
          newSquad.push(playerId);
        }
      } else if (
        status === 'Gelemiyor' ||
        status === 'Gelmedi' ||
        status === 'Son dakika iptal' ||
        status === 'Satış koydu'
      ) {
        newSquad = newSquad.filter(id => id !== playerId);
      }

      const nextMatch = {
        ...prev,
        squad: newSquad,
        attendance: updatedAttendance,
      };

      saveMatchToDatabase(nextMatch);
      return nextMatch;
    });

    // Also update player's penalty and suspension stats if Gelmedi / Satış koydu
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

  // Toggle Payment for a Player in current match
  const togglePayment = (playerId: string) => {
    setCurrentMatch(prev => {
      const currentPay = prev.payments[playerId] || { isPaid: false, amount: prev.costPerPlayer };
      const newStatus = !currentPay.isPaid;

      const updatedPayments = {
        ...prev.payments,
        [playerId]: {
          ...currentPay,
          isPaid: newStatus,
          paidAt: newStatus ? new Date().toISOString() : undefined,
          amount: prev.costPerPlayer,
        },
      };

      const nextMatch = {
        ...prev,
        payments: updatedPayments,
      };

      saveMatchToDatabase(nextMatch);
      return nextMatch;
    });

    // Update player balance ledger
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
  };

  // Update squad list
  const updateSquad = (newSquadIds: string[]) => {
    const costPerPlayer = newSquadIds.length > 0 ? Math.round(currentMatch.totalPitchCost / newSquadIds.length) : 0;
    const balanced = balanceTeams(newSquadIds, playersMap);

    const nextMatch: Match = {
      ...currentMatch,
      squad: newSquadIds,
      costPerPlayer,
      teamA: balanced.teamA,
      teamB: balanced.teamB,
    };

    setCurrentMatch(nextMatch);
    saveMatchToDatabase(nextMatch);
  };

  // Auto balance squad
  const autoBalanceSquad = () => {
    const balanced = balanceTeams(currentMatch.squad, playersMap);
    const nextMatch: Match = {
      ...currentMatch,
      teamA: balanced.teamA,
      teamB: balanced.teamB,
    };
    setCurrentMatch(nextMatch);
    saveMatchToDatabase(nextMatch);
  };

  // Set match scores and complete
  const setMatchScores = (scoreA: number, scoreB: number) => {
    const completedMatch: Match = {
      ...currentMatch,
      status: 'completed',
      teamA: { ...currentMatch.teamA, score: scoreA },
      teamB: { ...currentMatch.teamB, score: scoreB },
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
  const createNewMatch = (date: string, time: string, cost: number, venue: string) => {
    const nextNumber = currentMatch.matchNumber + 1;
    const defaultSquad = players.slice(0, 14).map(p => p.id);
    const balanced = balanceTeams(defaultSquad, playersMap);

    const newM: Match = {
      id: `match_${nextNumber}`,
      matchNumber: nextNumber,
      date,
      time,
      venueName: venue,
      pitchNo: 'Saha 1',
      totalPitchCost: cost,
      costPerPlayer: Math.round(cost / 14),
      status: 'teams_formed',
      squad: defaultSquad,
      teamA: balanced.teamA,
      teamB: balanced.teamB,
      attendance: {},
      payments: {},
    };

    setCurrentMatch(newM);
    saveMatchToDatabase(newM);
  };

  // Add new player to pool with smart presets and optional squad enrollment
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
        generatedRatings[m.id][c.key] = Math.max(1, Math.min(10, Math.round(baselineScore + delta)));
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
      positionScores: { 'Kaleci': baselineScore, 'Defans': baselineScore, 'Orta saha': baselineScore, 'Kanat': baselineScore, 'Forvet': baselineScore },
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

  // Batch add multiple players at once (e.g. from WhatsApp text list)
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
        positionScores: { 'Kaleci': base, 'Defans': base, 'Orta saha': base, 'Kanat': base, 'Forvet': base },
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

  // Vote for MVP
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

      saveMatchToDatabase(nextMatch);
      return nextMatch;
    });
  };

  // Set match format (5v5, 6v6, 7v7, 8v8)
  const setMatchFormat = (format: '5v5' | '6v6' | '7v7' | '8v8') => {
    const targetMap = { '5v5': 10, '6v6': 12, '7v7': 14, '8v8': 16 };
    const target = targetMap[format] || 14;
    const costPerPlayer = Math.round(currentMatch.totalPitchCost / target);

    const newSquad = currentMatch.squad.length > target
      ? currentMatch.squad.slice(0, target)
      : currentMatch.squad;

    const balanced = balanceTeams(newSquad, playersMap);

    const nextMatch: Match = {
      ...currentMatch,
      matchFormat: format,
      targetSquadCount: target,
      costPerPlayer,
      squad: newSquad,
      teamA: balanced.teamA,
      teamB: balanced.teamB,
    };
    setCurrentMatch(nextMatch);
    saveMatchToDatabase(nextMatch);
  };

  // Assign player directly to a team or bench
  const assignPlayerToTeam = (playerId: string, targetTeam: 'teamA' | 'teamB' | 'bench', position?: Position) => {
    const player = playersMap[playerId];
    if (!player) return;

    let newTeamAPlayers = currentMatch.teamA.players.filter(p => p.playerId !== playerId);
    let newTeamBPlayers = currentMatch.teamB.players.filter(p => p.playerId !== playerId);
    let newSquad = currentMatch.squad.filter(id => id !== playerId);

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

    const nextMatch: Match = {
      ...currentMatch,
      squad: newSquad,
      teamA: { ...currentMatch.teamA, players: newTeamAPlayers, totalPower: powerA },
      teamB: { ...currentMatch.teamB, players: newTeamBPlayers, totalPower: powerB },
    };

    setCurrentMatch(nextMatch);
    saveMatchToDatabase(nextMatch);
  };

  // Update a player's position within their team
  const updatePlayerPositionInTeam = (playerId: string, team: 'teamA' | 'teamB', newPosition: Position) => {
    const player = playersMap[playerId];
    if (!player) return;

    const targetList = team === 'teamA' ? currentMatch.teamA.players : currentMatch.teamB.players;
    const score = player.positionScores[newPosition] || player.finalScore;

    const updatedList = targetList.map(p =>
      p.playerId === playerId ? { ...p, position: newPosition, score } : p
    );

    const power = Number(updatedList.reduce((sum, p) => sum + p.score, 0).toFixed(1));

    const nextMatch: Match = {
      ...currentMatch,
      [team]: {
        ...currentMatch[team],
        players: updatedList,
        totalPower: power,
      },
    };

    setCurrentMatch(nextMatch);
    saveMatchToDatabase(nextMatch);
  };

  // Set team tactical formation
  const setTeamFormation = (team: 'teamA' | 'teamB', formation: string) => {
    const nextMatch: Match = {
      ...currentMatch,
      [team]: {
        ...currentMatch[team],
        formation,
      },
    };
    setCurrentMatch(nextMatch);
    saveMatchToDatabase(nextMatch);
  };

  // Apply penalty points to player
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

  // Clear all penalty points for player
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

  // Update current match details (Date, Time, Venue, Pitch, Cost, Format)
  const updateMatchDetails = (details: Partial<Match>) => {
    setCurrentMatch(prev => {
      const nextMatch: Match = {
        ...prev,
        ...details,
      };

      if (details.totalPitchCost !== undefined || details.targetSquadCount !== undefined) {
        const target = nextMatch.targetSquadCount || 14;
        nextMatch.costPerPlayer = Math.round(nextMatch.totalPitchCost / (target || 14));
      }

      saveMatchToDatabase(nextMatch);
      return nextMatch;
    });
  };

  return (
    <AppContext.Provider
      value={{
        players,
        playersMap,
        currentMatch,
        pastMatches,
        currentEvaluator,
        setCurrentEvaluator,
        updateRating,
        updateAttendance,
        togglePayment,
        updateSquad,
        autoBalanceSquad,
        setMatchScores,
        createNewMatch,
        updateMatchDetails,
        addPlayer,
        batchAddPlayers,
        voteMvp,
        setMatchFormat,
        assignPlayerToTeam,
        updatePlayerPositionInTeam,
        setTeamFormation,
        applyPenalty,
        clearPenalties,
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
