export type Position = 'Kaleci' | 'Defans' | 'Orta saha' | 'Kanat' | 'Forvet';

export type AttendanceStatus = 'Geldi' | 'Son dakika iptal' | 'Satış koydu' | 'Gelmedi' | 'Beklemede' | 'Geliyor' | 'Haber Bekleniyor' | 'Gelemiyor';

export interface Evaluator {
  id: string;
  name: string;
  role: 'admin' | 'council_member';
}

export type UserRole = 'admin' | 'council_member' | 'player' | 'guest';

export interface AppUser {
  id: string;
  name: string;
  role: UserRole;
  playerId?: string;
  evaluatorId?: string;
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

// Payment Exemption Models
export interface PaymentExemption {
  id: string;
  playerId: string;
  isActive: boolean;
  reason?: string;
  scope: 'all' | 'specific_matches' | 'date_range';
  matchIds?: string[]; // e.g. ['match_1', 'match_2']
  startDate?: string;  // YYYY-MM-DD
  endDate?: string;    // YYYY-MM-DD
  createdAt: string;
  createdBy: string;
  revokedAt?: string;
  revokedBy?: string;
}

export interface ExemptionAuditLog {
  id: string;
  timestamp: string;
  action: 'granted' | 'revoked' | 'updated';
  playerId: string;
  playerName: string;
  performedBy: string;
  reason?: string;
  details?: string;
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
  paymentExemption?: PaymentExemption;
  careerStats?: {
    goals: number;
    assists: number;
    matchesWon: number;
    matchesPlayed: number;
    mvpCount: number;
  };
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

export interface MatchGoal {
  id: string;
  playerId: string;
  team: 'teamA' | 'teamB';
  minute?: number;
  assistPlayerId?: string;
}

export interface MatchWeather {
  temperature: number; // e.g. 17 °C
  condition: string; // e.g. "Parçalı Bulutlu"
  icon: string; // e.g. "sun", "cloud", "rain"
  rainProbability: number; // %
  windSpeed: number; // km/h
  recommendation: string; // e.g. "Halı saha kramponu ve termal içlik uygundur"
  city: string;
  isSimulated?: boolean;
}

export interface MatchPaymentHistory {
  timestamp: string;
  action: string;
  amount: number;
  performedBy?: string;
  note?: string;
}

export interface MatchPayment {
  isPaid: boolean;
  paidAt?: string;
  amount: number;
  calculatedDue?: number;
  isExempt?: boolean;
  exemptionReason?: string;
  method?: 'IBAN' | 'Nakit' | 'Muafiyet';
  history?: MatchPaymentHistory[];
}

// Squad Locking & Versioning Models
export type SquadLockStatus = 'draft' | 'finalized';

export interface SquadVersion {
  id: string;
  versionNumber: number;
  savedAt: string;
  savedBy: string;
  teamA: Team;
  teamB: Team;
  squad: string[];
  status: SquadLockStatus;
  note?: string;
}

// Notification & Decline Alerts Models
export interface DeclineAlert {
  id: string;
  playerId: string;
  playerName: string;
  matchId: string;
  matchNumber: number;
  response: AttendanceStatus;
  timestamp: string;
  read: boolean;
  acknowledgedBy?: string;
}

export interface NotificationDispatchRecipient {
  playerId: string;
  playerName: string;
  phone?: string;
  status: 'success' | 'failed' | 'delivered';
  error?: string;
}

export interface NotificationDispatchLog {
  id: string;
  matchId: string;
  matchNumber: number;
  dispatchedAt: string;
  dispatchedBy: string;
  totalTargeted: number;
  successfulCount: number;
  failedCount: number;
  channel: 'web_push' | 'whatsapp' | 'system';
  recipients: NotificationDispatchRecipient[];
  note?: string;
}

export interface Venue {
  id: string;
  name: string;
  location: string; // Açık adres, semt veya Google Maps linki
  mapsUrl: string; // Google Maps yol tarifi / konum bağlantısı
  defaultCost?: number; // Varsayılan saha ücreti (TL)
}

export interface AttendanceRequest {
  playerId: string;
  requestedAt: string;
  requestedBy: string;
  status: 'pending' | 'responded';
  respondedAt?: string;
}

export interface Match {
  id: string;
  matchNumber: number;
  createdAt?: number; // maç oluşturulma zamanı (ms) - aynı numaralı maçlarda hangisi yeni diye bakılır
  date: string; // YYYY-MM-DD
  time: string; // "21:00 - 22:00"
  venueId?: string;
  venueName: string;
  venueLocation?: string;
  venueMapsUrl?: string;
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
  attendanceTimestamps?: Record<string, string>; // playerId -> ISO confirmation timestamp
  attendanceRequests?: Record<string, AttendanceRequest>; // playerId -> notification request status
  attendanceAdminAudits?: Record<string, { modifiedBy: string; modifiedAt: string; prevStatus?: string }>;
  payments: Record<string, MatchPayment>;
  goals?: MatchGoal[];
  mvpVotes?: Record<string, number>; // playerId -> vote count
  userMvpVotes?: Record<string, string>; // voterId -> candidatePlayerId
  mvpWinnerId?: string;
  weather?: MatchWeather;
  notes?: string;

  // New persistent fields:
  squadLockStatus?: SquadLockStatus;
  squadVersions?: SquadVersion[];
  squadFinalizedAt?: string;
  squadFinalizedBy?: string;
  adminDeclineAlerts?: DeclineAlert[];
  notificationLogs?: NotificationDispatchLog[];
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

export interface RolePermissions {
  canRatePlayers: boolean;
  canViewRatings: boolean;
  canManageSquad: boolean;
  canManageAttendance: boolean;
  canLockSquad: boolean;
  canManageFinance: boolean;
  canSetExemption: boolean;
  canSendNotifications: boolean;
  canViewAdminSummary: boolean;
  canRestoreSquadVersions: boolean;
}
