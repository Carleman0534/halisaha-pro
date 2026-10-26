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
 * Evaluates squad / roster access per requirements:
 * - Council members can view all weeks' squads regardless of participation status
 * - Guests and normal players can only view the squad of weeks they are invited to
 * - "Gelmiyorum" participants CANNOT see the squad
 */
export function canViewRoster(
  user: AppUser,
  match: Match
): { allowed: boolean; reason?: string } {
  // Council members and Admins have unrestricted access to all squads
  if (user.role === 'admin' || user.role === 'council_member') {
    return { allowed: true };
  }

  // If user is a identified player or guest
  if (user.playerId) {
    const status = match.attendance?.[user.playerId];

    // Explicitly declined: ACCESS DENIED
    if (
      status === 'Gelemiyor' ||
      status === 'Gelmedi' ||
      status === 'Son dakika iptal' ||
      status === 'Satış koydu'
    ) {
      return {
        allowed: false,
        reason:
          'Bu haftaki maça katılmayacağınızı bildirdiğiniz için kadro detayları gizlenmiştir. Katılım durumunuzu "Geliyorum" olarak güncelleyerek kadroya yeniden erişebilirsiniz.',
      };
    }

    // Explicitly confirmed coming or awaiting confirmation
    if (
      status === 'Geliyor' ||
      status === 'Geldi' ||
      status === 'Beklemede' ||
      status === 'Haber Bekleniyor'
    ) {
      return { allowed: true };
    }

    // Check if player is already included in squad
    if (match.squad && match.squad.includes(user.playerId)) {
      return { allowed: true };
    }

    // If viewing the current upcoming match, allow pending invitees
    if (match.status === 'teams_formed' || match.status === 'scheduled') {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: 'Yalnızca çağrıldığınız haftanın kadrosuna erişim yetkiniz bulunmaktadır.',
    };
  }

  // General anonymous guest viewer
  return { allowed: true };
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
