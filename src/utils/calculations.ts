import { Position, Player, Team, TeamPlayer, AttendanceStatus, Match } from '../types';
import { POSITION_WEIGHTS, COUNCIL_MEMBERS } from '../data/initialData';

/**
 * Calculates a player's rating for a specific position given a criterion score map
 * Matches Excel formula:
 * SUMPRODUCT(Scores, Weights) / SUM(AnsweredWeights) [valid if AnsweredWeights >= 70]
 */
export function calculatePositionScore(
  criterionScores: Record<string, number>,
  position: Position
): number {
  const weights = POSITION_WEIGHTS[position];
  let weightedSum = 0;
  let totalAnsweredWeights = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const score = criterionScores[key];
    if (score !== undefined && score > 0) {
      weightedSum += score * weight;
      totalAnsweredWeights += weight;
    }
  }

  if (totalAnsweredWeights < 70) {
    return 0;
  }

  const result = weightedSum / totalAnsweredWeights;
  return Number(result.toFixed(2));
}

/**
 * Calculates Olympic Average (Trimmed Mean), Standard Deviation, and Final Score
 * Matches Excel formula:
 * If count >= 4: (SUM - MIN - MAX) / (COUNT - 2)
 * If count == 3: SUM / 3
 * Final Score (N) = TrimmedMean - 0.5 * StdDev
 */
export function calculateOlympicAverage(evaluatorScores: number[]): {
  trimmedMean: number;
  stdDev: number;
  finalScore: number;
} {
  const validScores = evaluatorScores.filter(s => s > 0);
  const n = validScores.length;

  if (n === 0) {
    return { trimmedMean: 0, stdDev: 0, finalScore: 0 };
  }

  let trimmedMean = 0;

  if (n >= 4) {
    const minVal = Math.min(...validScores);
    const maxVal = Math.max(...validScores);
    const sum = validScores.reduce((acc, v) => acc + v, 0);
    trimmedMean = (sum - minVal - maxVal) / (n - 2);
  } else if (n === 3) {
    const sum = validScores.reduce((acc, v) => acc + v, 0);
    trimmedMean = sum / 3;
  } else {
    const sum = validScores.reduce((acc, v) => acc + v, 0);
    trimmedMean = sum / n;
  }

  // Population Standard Deviation (STDEV.P)
  const mean = validScores.reduce((acc, v) => acc + v, 0) / n;
  const variance = validScores.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  // Final Score with consistency penalty
  const finalScore = n >= 3 ? Math.max(0, trimmedMean - 0.5 * stdDev) : trimmedMean;

  return {
    trimmedMean: Number(trimmedMean.toFixed(2)),
    stdDev: Number(stdDev.toFixed(2)),
    finalScore: Number(finalScore.toFixed(2)),
  };
}

/**
 * Recomputes all stats, position scores, and suspension for a player
 */
export function recalculatePlayerStats(player: Player): Player {
  // 1. Calculate score for each position across all evaluators
  const positionScoresList: Record<Position, number[]> = {
    'Kaleci': [],
    'Defans': [],
    'Orta saha': [],
    'Kanat': [],
    'Forvet': [],
  };

  const positions: Position[] = ['Kaleci', 'Defans', 'Orta saha', 'Kanat', 'Forvet'];

  // For each evaluator's scores
  Object.values(player.ratings).forEach(critScores => {
    positions.forEach(pos => {
      const score = calculatePositionScore(critScores, pos);
      if (score > 0) {
        positionScoresList[pos].push(score);
      }
    });
  });

  // Calculate positionScores (average per position)
  const positionScores: Record<Position, number> = {
    'Kaleci': 0,
    'Defans': 0,
    'Orta saha': 0,
    'Kanat': 0,
    'Forvet': 0,
  };

  positions.forEach(pos => {
    const scores = positionScoresList[pos];
    if (scores.length > 0) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      positionScores[pos] = Number(avg.toFixed(2));
    }
  });

  // 2. Primary position Olympic Average
  const primaryScores = positionScoresList[player.primaryPosition];
  const { trimmedMean, stdDev, finalScore } = calculateOlympicAverage(primaryScores);

  // 3. Attendance Penalty & Suspension check
  // Formula: Gelmedi * 2 + Son dakika iptal * 1
  const penaltyPoints =
    player.attendanceStats.noShow * 2 + player.attendanceStats.lastMinuteCancel * 1;
  const isSuspended = player.attendanceStats.noShow >= 2;

  return {
    ...player,
    positionScores,
    trimmedMean,
    standardDeviation: stdDev,
    finalScore,
    attendanceStats: {
      ...player.attendanceStats,
      penaltyPoints,
      isSuspended,
    },
  };
}

/**
 * Builds realistic initial player list with calibrated ratings
 */
export function buildInitialPlayers(rawList: typeof import('../data/initialData').RAW_PLAYERS_DATA): Player[] {
  return rawList.map(item => {
    const ratings: Record<string, Record<string, number>> = {};

    COUNCIL_MEMBERS.forEach(evaluator => {
      const jitter = (Math.random() - 0.5) * 0.8;
      const baseScore = Math.min(10, Math.max(1, item.base + jitter));
      
      const scores: Record<string, number> = {};
      const criteriaList = [
        'pas', 'topKontrolu', 'sut', 'dribbling', 'hizCeviklik',
        'fizikselGuc', 'dayaniklilik', 'defansifKatki', 'pozisyonBilgisi',
        'oyunGorusu', 'takimOyunu', 'kalecilik'
      ];

      criteriaList.forEach(c => {
        let val = Math.round(baseScore);
        if (item.high.includes(c)) val = Math.min(10, val + 2);
        if (item.low.includes(c)) val = Math.max(2, val - 3);
        if (item.pos === 'Kaleci' && c === 'kalecilik') val = Math.min(10, Math.round(item.base + 1.5));
        if (item.pos !== 'Kaleci' && c === 'kalecilik') val = Math.min(4, Math.max(1, Math.round(item.base - 4)));
        scores[c] = val;
      });

      ratings[evaluator.id] = scores;
    });

    const isOmer = item.name === 'Ömer';
    const noShow = isOmer ? 2 : (Math.random() > 0.8 ? 1 : 0);
    const lastCancel = isOmer ? 1 : (Math.random() > 0.7 ? 1 : 0);

    const basePlayer: Player = {
      id: item.id,
      name: item.name,
      primaryPosition: item.pos,
      secondaryPosition: item.secPos,
      isJoker: item.joker,
      ratings,
      positionScores: {
        'Kaleci': 0,
        'Defans': 0,
        'Orta saha': 0,
        'Kanat': 0,
        'Forvet': 0,
      },
      trimmedMean: 0,
      standardDeviation: 0,
      finalScore: 0,
      attendanceStats: {
        totalMatches: 20,
        attended: 18 - noShow - lastCancel,
        lastMinuteCancel: lastCancel,
        noShow: noShow,
        penaltyPoints: noShow * 2 + lastCancel * 1,
        isSuspended: noShow >= 2,
        recentAttendance: ['Geldi', 'Geldi', isOmer ? 'Gelmedi' : 'Geldi', isOmer ? 'Gelmedi' : 'Geldi', 'Geldi'],
      },
      financialBalance: item.id === 'p_serkan' ? -200 : (item.id === 'p_enes' ? -400 : 0),
    };

    return recalculatePlayerStats(basePlayer);
  });
}

/**
 * 7v7 Team Balancing Algorithm
 * Divides 14 players into Team A and Team B such that:
 * 1. Goalkeepers are split 1 each.
 * 2. Positions (Defans, Orta saha/Kanat, Forvet) are distributed evenly.
 * 3. Difference in Total Power |PowerA - PowerB| is minimized.
 */
export function balanceTeams(
  squadPlayerIds: string[],
  playersMap: Record<string, Player>
): { teamA: Team; teamB: Team } {
  const squad = squadPlayerIds.map(id => playersMap[id]).filter(Boolean);

  if (squad.length !== 14) {
    // If not exactly 14, simple split
    const mid = Math.ceil(squad.length / 2);
    const aPlayers = squad.slice(0, mid);
    const bPlayers = squad.slice(mid);

    return {
      teamA: {
        name: 'Kırmızı Takım',
        color: '#ef4444',
        totalPower: Number(aPlayers.reduce((sum, p) => sum + p.finalScore, 0).toFixed(1)),
        players: aPlayers.map(p => ({ playerId: p.id, position: p.primaryPosition, score: p.finalScore })),
      },
      teamB: {
        name: 'Beyaz Takım',
        color: '#3b82f6',
        totalPower: Number(bPlayers.reduce((sum, p) => sum + p.finalScore, 0).toFixed(1)),
        players: bPlayers.map(p => ({ playerId: p.id, position: p.primaryPosition, score: p.finalScore })),
      },
    };
  }

  // 1. Separate goalkeepers
  const goalkeepers = squad.filter(p => p.primaryPosition === 'Kaleci');
  let outfield = squad.filter(p => p.primaryPosition !== 'Kaleci');

  let teamAPlayers: TeamPlayer[] = [];
  let teamBPlayers: TeamPlayer[] = [];

  if (goalkeepers.length >= 2) {
    teamAPlayers.push({ playerId: goalkeepers[0].id, position: 'Kaleci', score: goalkeepers[0].finalScore });
    teamBPlayers.push({ playerId: goalkeepers[1].id, position: 'Kaleci', score: goalkeepers[1].finalScore });
    // remaining GKs go to outfield
    outfield = outfield.concat(goalkeepers.slice(2));
  } else if (goalkeepers.length === 1) {
    teamAPlayers.push({ playerId: goalkeepers[0].id, position: 'Kaleci', score: goalkeepers[0].finalScore });
    // Pick best backup GK for Team B
    outfield.sort((a, b) => b.positionScores['Kaleci'] - a.positionScores['Kaleci']);
    const backupGK = outfield.shift()!;
    teamBPlayers.push({ playerId: backupGK.id, position: 'Kaleci', score: backupGK.positionScores['Kaleci'] || backupGK.finalScore });
  }

  // 2. Sort remaining outfield players by position and final score
  outfield.sort((a, b) => b.finalScore - a.finalScore);

  // Group by category: Defans, Orta Saha / Kanat, Forvet
  const defs = outfield.filter(p => p.primaryPosition === 'Defans');
  const mids = outfield.filter(p => p.primaryPosition === 'Orta saha' || p.primaryPosition === 'Kanat');
  const fwds = outfield.filter(p => p.primaryPosition === 'Forvet');

  const distributeGroup = (group: Player[]) => {
    group.forEach(player => {
      const sumA = teamAPlayers.reduce((acc, p) => acc + p.score, 0);
      const sumB = teamBPlayers.reduce((acc, p) => acc + p.score, 0);

      if (teamAPlayers.length < 7 && (sumA <= sumB || teamBPlayers.length >= 7)) {
        teamAPlayers.push({ playerId: player.id, position: player.primaryPosition, score: player.finalScore });
      } else {
        teamBPlayers.push({ playerId: player.id, position: player.primaryPosition, score: player.finalScore });
      }
    });
  };

  distributeGroup(defs);
  distributeGroup(fwds);
  distributeGroup(mids);

  // Fine-tune balance with greedy pairwise swap
  let bestDiff = Math.abs(
    teamAPlayers.reduce((acc, p) => acc + p.score, 0) - teamBPlayers.reduce((acc, p) => acc + p.score, 0)
  );

  for (let i = 1; i < teamAPlayers.length; i++) {
    for (let j = 1; j < teamBPlayers.length; j++) {
      // Don't swap GK
      if (teamAPlayers[i].position === 'Kaleci' || teamBPlayers[j].position === 'Kaleci') continue;

      // Swap test
      const tempA = [...teamAPlayers];
      const tempB = [...teamBPlayers];
      const pA = tempA[i];
      tempA[i] = tempB[j];
      tempB[j] = pA;

      const newSumA = tempA.reduce((acc, p) => acc + p.score, 0);
      const newSumB = tempB.reduce((acc, p) => acc + p.score, 0);
      const newDiff = Math.abs(newSumA - newSumB);

      if (newDiff < bestDiff) {
        bestDiff = newDiff;
        teamAPlayers = tempA;
        teamBPlayers = tempB;
      }
    }
  }

  const totalPowerA = Number(teamAPlayers.reduce((acc, p) => acc + p.score, 0).toFixed(1));
  const totalPowerB = Number(teamBPlayers.reduce((acc, p) => acc + p.score, 0).toFixed(1));

  return {
    teamA: {
      name: 'Kırmızı Takım',
      color: '#ef4444',
      totalPower: totalPowerA,
      players: teamAPlayers,
    },
    teamB: {
      name: 'Beyaz Takım',
      color: '#3b82f6',
      totalPower: totalPowerB,
      players: teamBPlayers,
    },
  };
}

/**
 * Generates formatted WhatsApp broadcast text
 */
export function generateWhatsAppShareText(match: Match, playersMap: Record<string, Player>): string {
  const dateFormatted = new Date(match.date).toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  let text = `⚽ *${match.matchNumber}. HAFTA HALI SAHA MAÇ KADROSU* ⚽\n`;
  text += `📅 Tarih: ${dateFormatted} | ${match.time}\n`;
  text += `📍 Saha: ${match.venueName} (${match.pitchNo})\n`;
  text += `💰 Ücret: ${match.totalPitchCost} ₺ (Kişi Başı: ${match.costPerPlayer} ₺)\n\n`;

  text += `🔴 *${match.teamA.name.toUpperCase()} (Güç: ${match.teamA.totalPower})*\n`;
  match.teamA.players.forEach((p, idx) => {
    const player = playersMap[p.playerId];
    const name = player ? player.name : 'Oyuncu';
    const jokerTag = player?.isJoker ? ' (Joker)' : '';
    text += `${idx + 1}. ${name} [${p.position}] (${p.score}p)${jokerTag}\n`;
  });

  text += `\n🔵 *${match.teamB.name.toUpperCase()} (Güç: ${match.teamB.totalPower})*\n`;
  match.teamB.players.forEach((p, idx) => {
    const player = playersMap[p.playerId];
    const name = player ? player.name : 'Oyuncu';
    const jokerTag = player?.isJoker ? ' (Joker)' : '';
    text += `${idx + 1}. ${name} [${p.position}] (${p.score}p)${jokerTag}\n`;
  });

  text += `\n📌 *Not:* ${match.notes || 'Herkesin maç saatinden 15 dk önce sahada olması rica olunur.'}\n`;
  text += `🤝 *Konsey Kararı:* Denge katsayısı farkı sadece ${Math.abs(
    match.teamA.totalPower - match.teamB.totalPower
  ).toFixed(1)} puandır. Herkese iyi maçlar!`;

  return text;
}
