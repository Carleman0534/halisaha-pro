export type Position = 'Kaleci' | 'Defans' | 'Orta saha' | 'Kanat' | 'Forvet';

export type AttendanceStatus = 'Geldi' | 'Son dakika iptal' | 'Gelmedi' | 'Beklemede' | 'Geliyor' | 'Haber Bekleniyor' | 'Gelemiyor';

export interface Evaluator {
  id: string;
  name: string;
  role: 'admin' | 'council_member';
}

export interface CriterionInfo {
  key: string;
  label: string;
  icon?: string;
}

export interface CriterionRubric {
  criterion: string;
  key: string;
  p1: string;
  p3: string;
  p5: string;
  p7: string;
  p9: string;
  p10: string;
}

export interface CouncilRule {
  id: number;
  title: string;
  description: string;
}

export interface Player {
  id: string;
  name: string;
  primaryPosition: Position;
  secondaryPosition?: Position;
  isJoker: boolean;
  avatar?: string;
  phone?: string;
  // evaluatorId -> { pas: 7, sut: 8, ... }
  ratings: Record<string, Record<string, number>>;
  // Calculated per position
  positionScores: Record<Position, number>;
  trimmedMean: number;
  standardDeviation: number;
  finalScore: number; // TrimmedMean - 0.5 * standardDeviation
  attendanceStats: {
    totalMatches: number;
    attended: number;
    lastMinuteCancel: number;
    noShow: number;
    penaltyPoints: number;
    isSuspended: boolean; // >= 2 noShow in recent matches
    recentAttendance: AttendanceStatus[];
  };
  financialBalance: number; // TL (negative means owes money)
}

export interface TeamPlayer {
  playerId: string;
  position: Position;
  score: number;
  tacticalRole?: string; // "Sol Bek", "Sağ Kanat", vb.
  x?: number; // % 0-100 coordinate on field
  y?: number; // % 0-100 coordinate on field
}

export interface Team {
  name: string;
  color: string;
  totalPower: number;
  score?: number;
  formation?: string;
  players: TeamPlayer[];
}

export interface MatchPayment {
  isPaid: boolean;
  paidAt?: string;
  amount: number;
  method?: 'IBAN' | 'Nakit';
}

export interface Match {
  id: string;
  matchNumber: number;
  date: string; // YYYY-MM-DD
  time: string; // "21:00 - 22:00"
  venueName: string;
  pitchNo: string;
  totalPitchCost: number;
  costPerPlayer: number;
  matchFormat?: '5v5' | '6v6' | '7v7' | '8v8';
  targetSquadCount?: number; // e.g. 10, 12, 14, 16
  status: 'scheduled' | 'teams_formed' | 'in_progress' | 'completed' | 'cancelled';
  squad: string[]; // Selected player IDs
  teamA: Team;
  teamB: Team;
  attendance: Record<string, AttendanceStatus>;
  payments: Record<string, MatchPayment>;
  mvpVotes?: Record<string, number>; // playerId -> vote count
  mvpWinnerId?: string;
  notes?: string;
}

export interface Transaction {
  id: string;
  playerId: string;
  matchId?: string;
  amount: number; // positive = paid to pool, negative = fee charged
  type: 'match_fee' | 'payment' | 'adjustment';
  description: string;
  date: string;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}
