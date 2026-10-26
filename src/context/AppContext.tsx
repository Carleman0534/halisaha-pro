import React, { createContext, useContext, useState, useEffect } from 'react';
import { Player, Match, Evaluator, AttendanceStatus, Position } from '../types';
import {
  COUNCIL_MEMBERS,
  RAW_PLAYERS_DATA,
  INITIAL_MATCH,
  PAST_MATCHES,
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
  addPlayer: (name: string, pos: Position, secPos?: Position, isJoker?: boolean) => void;
  voteMvp: (playerId: string) => void;
  setMatchFormat: (format: '5v5' | '6v6' | '7v7' | '8v8') => void;
  assignPlayerToTeam: (playerId: string, team: 'teamA' | 'teamB' | 'bench', position?: Position) => void;
  updatePlayerPositionInTeam: (playerId: string, team: 'teamA' | 'teamB', newPosition: Position) => void;
  setTeamFormation: (team: 'teamA' | 'teamB', formation: string) => void;
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
      } else if (status === 'Gelemiyor' || status === 'Gelmedi') {
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

    // Also update player's penalty and suspension stats if Gelmedi
    setPlayers(prev => {
      const next = prev.map(p => {
        if (p.id !== playerId) return p;

        let noShowDelta = 0;
        let cancelDelta = 0;
        if (status === 'Gelmedi') noShowDelta = 1;
        if (status === 'Son dakika iptal') cancelDelta = 1;

        const recent = [status, ...(p.attendanceStats.recentAttendance || []).slice(0, 4)];
        const noShowCount = recent.filter(s => s === 'Gelmedi').length;

        const updated = recalculatePlayerStats({
          ...p,
          attendanceStats: {
            ...p.attendanceStats,
            noShow: p.attendanceStats.noShow + noShowDelta,
            lastMinuteCancel: p.attendanceStats.lastMinuteCancel + cancelDelta,
            recentAttendance: recent,
            isSuspended: noShowCount >= 2,
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

  // Add new player to pool
  const addPlayer = (name: string, pos: Position, secPos?: Position, isJoker: boolean = false) => {
    const newId = `p_custom_${Date.now()}`;
    const newP = recalculatePlayerStats({
      id: newId,
      name,
      primaryPosition: pos,
      secondaryPosition: secPos,
      isJoker,
      ratings: {},
      positionScores: { 'Kaleci': 0, 'Defans': 0, 'Orta saha': 0, 'Kanat': 0, 'Forvet': 0 },
      trimmedMean: 7.0,
      standardDeviation: 0.2,
      finalScore: 6.9,
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
        addPlayer,
        voteMvp,
        setMatchFormat,
        assignPlayerToTeam,
        updatePlayerPositionInTeam,
        setTeamFormation,
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
