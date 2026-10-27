import { UserRole, AppUser, Match, Player, RolePermissions } from '../types';

/**
 * Returns permissions for the given role
 */
export function getRolePermissions(role: UserRole): RolePermissions {
  switch (role) {
    case 'admin':
      return {
        canRatePlayers: true,
        canViewRatings: true,
        canManageSquad: true,
        canManageAttendance: true,
        canLockSquad: true,
        canManageFinance: true,
        canSetExemption: true,
        canSendNotifications: true,
        canViewAdminSummary: true,
        canRestoreSquadVersions: true,
      };
    case 'council_member':
      return {
        canRatePlayers: true,
        canViewRatings: true,
        canManageSquad: true,
        canManageAttendance: true,
        canLockSquad: false,
        canManageFinance: false,
        canSetExemption: false,
        canSendNotifications: true,
        canViewAdminSummary: true,
        canRestoreSquadVersions: false,
      };
    case 'player':
      return {
        canRatePlayers: false,
        canViewRatings: false,
        canManageSquad: false,
        canManageAttendance: false,
        canLockSquad: false,
        canManageFinance: false,
        canSetExemption: false,
        canSendNotifications: false,
        canViewAdminSummary: false,
        canRestoreSquadVersions: false,
      };
    case 'guest':
    default:
      return {
        canRatePlayers: false,
        canViewRatings: false,
        canManageSquad: false,
        canManageAttendance: false,
        canLockSquad: false,
        canManageFinance: false,
        canSetExemption: false,
        canSendNotifications: false,
        canViewAdminSummary: false,
        canRestoreSquadVersions: false,
      };
  }
}

/**
 * Evaluates whether a user can enter/update attendance for any player
 * (Gelenler, Gelmeyenler, Bekleyenler, Sattı)
 * Council members and admins have full management permissions.
 */
export function canManageAttendance(user: AppUser): boolean {
  return user.role === 'admin' || user.role === 'council_member';
}

/**
 * Evaluates whether a user can view ratings & scores
 * STRICT RULE: Only council members and admins can view ratings and evaluations.
 */
export function canViewRatings(user: AppUser): boolean {
  return user.role === 'admin' || user.role === 'council_member';
}

/**
 * Evaluates whether a user can rate players
 * STRICT RULE: Only council members and admins can rate players.
 */
export function canRatePlayers(user: AppUser): boolean {
  return user.role === 'admin' || user.role === 'council_member';
}

/**
 * Evaluates whether a user is allowed to view match details (date, time, venue, location, squad).
 * STRICT RULE:
 * - Council members and Admins can always view all match details.
 * - Non-council players can ONLY view match details if their status for the match is 'Geliyor' or 'Geldi'.
 */
export function canViewMatchDetails(user: AppUser, match: Match): boolean {
  if (user.role === 'admin' || user.role === 'council_member') {
    return true;
  }
  if (user.playerId) {
    const status = match.attendance?.[user.playerId];
    return status === 'Geliyor' || status === 'Geldi';
  }
  return false;
}

/**
 * Evaluates squad / roster access per requirements:
 * - Council members can view all weeks' squads regardless of participation status
 * - Non-council players can ONLY view the squad if their status is 'Geliyor' or 'Geldi'
 */
export function canViewRoster(
  user: AppUser,
  match: Match
): { allowed: boolean; reason?: string } {
  // Council members and Admins have unrestricted access to all squads
  if (user.role === 'admin' || user.role === 'council_member') {
    return { allowed: true };
  }

  if (user.playerId) {
    const status = match.attendance?.[user.playerId];
    if (status === 'Geliyor' || status === 'Geldi') {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason:
        'Konsey üyesi olmayan oyuncular yalnızca maça "Geliyor" durumunda olduklarında maç ve kadro detaylarını görüntüleyebilir.',
    };
  }

  return {
    allowed: false,
    reason:
      'Maç ve kadro detayları yalnızca maça katılan ("Geliyor") oyunculara ve Konsey üyelerine açıktır.',
  };
}

/**
 * Check if a player is exempt from payment for a specific match
 */
export function isPlayerExemptForMatch(
  player: Player | undefined | null,
  match: Match
): { isExempt: boolean; reason?: string } {
  if (!player || !player.paymentExemption || !player.paymentExemption.isActive) {
    return { isExempt: false };
  }

  const ex = player.paymentExemption;

  if (ex.scope === 'all') {
    return { isExempt: true, reason: ex.reason || 'Kişi Bazlı Muafiyet' };
  }

  if (ex.scope === 'specific_matches') {
    const matchIds = ex.matchIds || [];
    const isMatched =
      matchIds.includes(match.id) || matchIds.includes(String(match.matchNumber));
    if (isMatched) {
      return { isExempt: true, reason: ex.reason || `${match.matchNumber}. Hafta Muafiyeti` };
    }
    return { isExempt: false };
  }

  if (ex.scope === 'date_range') {
    const matchDate = (match.date || '').split('T')[0];
    if (ex.startDate && matchDate < ex.startDate) return { isExempt: false };
    if (ex.endDate && matchDate > ex.endDate) return { isExempt: false };
    return { isExempt: true, reason: ex.reason || 'Dönemsel Muafiyet' };
  }

  return { isExempt: false };
}

/**
 * Comprehensive Match Financials Calculator
 * Separates payment obligations, exemptions, and actual receipts cleanly
 */
export function calculateMatchFinancials(
  match: Match,
  playersMap: Record<string, Player>
) {
  const totalCost = match.totalPitchCost || 0;
  const costPerPlayer = match.costPerPlayer || 0;
  const squad = match.squad || [];

  let exemptCount = 0;
  let totalCollected = 0;
  const exemptPlayerIds: string[] = [];
  const paidPlayerIds: string[] = [];
  const unpaidPlayers: Player[] = [];

  squad.forEach(playerId => {
    const player = playersMap[playerId];
    const exemptionInfo = isPlayerExemptForMatch(player, match);
    const payment = match.payments?.[playerId];
    const isPaid = !!payment?.isPaid;

    if (exemptionInfo.isExempt) {
      exemptCount += 1;
      exemptPlayerIds.push(playerId);
      // Exempt player has 0 TL calculated fee and is NOT debtor
    } else {
      if (isPaid) {
        paidPlayerIds.push(playerId);
        totalCollected += payment.amount || costPerPlayer;
      } else {
        if (player) {
          unpaidPlayers.push(player);
        }
      }
    }
  });

  const effectiveTotalDue = Math.max(0, (squad.length - exemptCount) * costPerPlayer);
  const remainingDebt = Math.max(0, totalCost - totalCollected);
  const collectionPercent =
    totalCost > 0 ? Math.min(100, Math.round((totalCollected / totalCost) * 100)) : 100;

  return {
    totalCost,
    costPerPlayer,
    squadCount: squad.length,
    exemptCount,
    exemptPlayerIds,
    paidCount: paidPlayerIds.length,
    paidPlayerIds,
    unpaidCount: unpaidPlayers.length,
    unpaidPlayers,
    totalCollected,
    remainingDebt,
    effectiveTotalDue,
    collectionPercent,
  };
}
