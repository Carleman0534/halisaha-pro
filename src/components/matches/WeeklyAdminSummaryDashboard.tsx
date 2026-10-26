import React from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Lock,
  Unlock,
  ShieldCheck,
  Coins,
  CreditCard,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  FileCheck,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { isPlayerExemptForMatch, calculateMatchFinancials } from '../../utils/permissions';
import { getLocalNotificationLogs } from '../../services/firebase';
import { NotificationDispatchLog } from '../../types';

interface WeeklyAdminSummaryDashboardProps {
  onNavigateToSquad: () => void;
}

export const WeeklyAdminSummaryDashboard: React.FC<WeeklyAdminSummaryDashboardProps> = ({
  onNavigateToSquad,
}) => {
  const { currentMatch, players, playersMap, toggleSquadLock, isAdmin } = useApp();

  // 1. Attendance Metrics (Geliyor, Gelemiyor, Haber Bekleniyor)
  const attendanceValues = Object.values(currentMatch.attendance || {});
  const attendingCount = attendanceValues.filter(
    s => s === 'Geliyor' || s === 'Geldi'
  ).length;
  const declinedCount = attendanceValues.filter(
    s => s === 'Gelemiyor' || s === 'Satış koydu' || s === 'Son dakika iptal' || s === 'Gelmedi'
  ).length;
  const pendingCount = attendanceValues.filter(
    s => s === 'Haber Bekleniyor' || s === 'Beklemede'
  ).length;

  // 2. Roster Metrics
  const lockStatus = currentMatch.squadLockStatus || 'draft';
  const assignedCount =
    (currentMatch.teamA?.players?.length || 0) + (currentMatch.teamB?.players?.length || 0);
  const emptySlots = Math.max(0, 14 - assignedCount);

  // 3. Exemption & Financial Metrics
  const exemptCount = players.filter(p => isPlayerExemptForMatch(p, currentMatch).isExempt).length;
  const financials = calculateMatchFinancials(currentMatch, playersMap);

  // 4. Notification Metrics
  let failedDispatchesCount = 0;
  try {
    const logs: NotificationDispatchLog[] = getLocalNotificationLogs();
    failedDispatchesCount = logs
      .filter(log => log.matchId === currentMatch.id)
      .reduce(
        (sum, log) =>
          sum + (log.recipients ? log.recipients.filter(r => r.status === 'failed').length : 0),
        0
      );
  } catch (err) {
    console.error('Failed to parse notification logs:', err);
  }

  const isFinalized = lockStatus === 'finalized';

  return (
    <div className="p-4 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 shadow-2xl space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white flex items-center space-x-1.5">
              <span>Haftalık Akıllı Yönetici Özeti</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {currentMatch.matchNumber}. Hafta
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Katılım, kalıcı kadro, ödeme muafiyeti ve bildirim durumları
            </p>
          </div>
        </div>

        {/* Squad Lock Status Pill */}
        <div className="flex items-center space-x-1.5">
          <span
            className={`text-[10px] font-black px-2.5 py-1 rounded-full border flex items-center space-x-1 ${
              isFinalized
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
            }`}
          >
            {isFinalized ? (
              <>
                <Lock className="w-3 h-3 text-rose-400" />
                <span>KESİNLEŞTİ</span>
              </>
            ) : (
              <>
                <FileCheck className="w-3 h-3 text-amber-400" />
                <span>TASLAK</span>
              </>
            )}
          </span>

          {isAdmin && (
            <button
              onClick={() => toggleSquadLock(currentMatch.id)}
              title={isFinalized ? 'Kilidi Açıp Taslağa Çevir' : 'Kadroyu Kesinleştir ve Kilitle'}
              className={`p-1.5 rounded-lg border text-xs font-bold transition-all active:scale-95 ${
                isFinalized
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
              }`}
            >
              {isFinalized ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* 11 METRICS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {/* Metric 1: Geliyorum */}
        <div className="p-2.5 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 space-y-1">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Geliyorum</span>
            <UserCheck className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-black text-white font-mono">{attendingCount}</div>
          <span className="text-[10px] text-emerald-400/80 block">Onaylanan Katılım</span>
        </div>

        {/* Metric 2: Gelmiyorum */}
        <div className="p-2.5 rounded-2xl bg-rose-950/30 border border-rose-800/40 space-y-1">
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Gelmiyorum</span>
            <UserX className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-black text-white font-mono">{declinedCount}</div>
          <span className="text-[10px] text-rose-400/80 block">Kadro Dışı & Uyarılı</span>
        </div>

        {/* Metric 3: Yanıt Vermeyen */}
        <div className="p-2.5 rounded-2xl bg-amber-950/30 border border-amber-800/40 space-y-1">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Bekleyen</span>
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-black text-white font-mono">{pendingCount}</div>
          <span className="text-[10px] text-amber-400/80 block">Yanıt Vermedi</span>
        </div>

        {/* Metric 4 & 5: Kadro Atanmış */}
        <div className="p-2.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-1">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-[10px] font-bold uppercase tracking-wider">Atanan Kadro</span>
            <Users className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-xl font-black text-white font-mono">
            {assignedCount} <span className="text-xs text-slate-400">/ 14</span>
          </div>
          <span className="text-[10px] text-slate-400 block">7v7 Dağılım</span>
        </div>

        {/* Metric 6: Boş Kalan Yerler */}
        <div className="p-2.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-1">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-[10px] font-bold uppercase tracking-wider">Boş Kontenjan</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div
            className={`text-xl font-black font-mono ${
              emptySlots === 0 ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {emptySlots}
          </div>
          <span className="text-[10px] text-slate-400 block">
            {emptySlots === 0 ? 'Kadro Tam' : 'Oyuncu Gerekiyor'}
          </span>
        </div>

        {/* Metric 7: Muaf Oyuncu */}
        <div className="p-2.5 rounded-2xl bg-purple-950/30 border border-purple-800/40 space-y-1">
          <div className="flex items-center justify-between text-purple-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Muaf Oyuncu</span>
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-black text-white font-mono">{exemptCount}</div>
          <span className="text-[10px] text-purple-300/80 block">0 ₺ Yükümlülük</span>
        </div>

        {/* Metric 8 & 9: Tahsil Edilen & Hesaplanan */}
        <div className="p-2.5 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 space-y-1">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Tahsilat</span>
            <Coins className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-black text-emerald-400 font-mono">
            {financials.totalCollected} ₺
          </div>
          <span className="text-[10px] text-slate-400 block">
            Hedef: {financials.effectiveTotalDue} ₺
          </span>
        </div>

        {/* Metric 10: Kalan Tahsilat (Kasa Borcu) */}
        <div className="p-2.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-1">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-[10px] font-bold uppercase tracking-wider">Kalan Alacak</span>
            <CreditCard className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div
            className={`text-xl font-black font-mono ${
              financials.remainingDebt > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {financials.remainingDebt} ₺
          </div>
          <span className="text-[10px] text-slate-400 block">
            {financials.remainingDebt > 0 ? 'Ödeme Bekleniyor' : 'Kasa Kapandı'}
          </span>
        </div>
      </div>

      {/* Metric 11 (Failed Dispatches Alert if any) */}
      {failedDispatchesCount > 0 && (
        <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              <strong>{failedDispatchesCount}</strong> başarısız bildirim gönderimi tespit edildi.
            </span>
          </div>
          <span className="text-[10px] underline cursor-pointer" onClick={onNavigateToSquad}>
            Detaylar
          </span>
        </div>
      )}

      {/* Quick Action Navigation Bar */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] text-slate-400">
          Kalıcı kadro durumu:{' '}
          <strong className="text-white">
            {isFinalized ? 'Kesinleşti (Kilitli)' : 'Taslak (Düzenlenebilir)'}
          </strong>
        </span>

        <button
          onClick={onNavigateToSquad}
          className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all active:scale-95"
        >
          <span>Kadroyu Görüntüle & Yönet</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
