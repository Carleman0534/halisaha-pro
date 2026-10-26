import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Copy,
  Check,
  Trophy,
  Star,
  Crown,
  Flame,
  Wand2,
  BellRing,
  ArrowRight,
  ExternalLink,
  Shield,
  HelpCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import { Player, Match, AttendanceStatus } from '../../types';
import { sendOneDayBeforeReminder } from '../../services/notifications';
import { MatchResultsModal } from './MatchResultsModal';
import { MvpVotingModal } from './MvpVotingModal';

interface WeeklyArchiveManagerProps {
  onNavigateToSquad?: () => void;
}

export const WeeklyArchiveManager: React.FC<WeeklyArchiveManagerProps> = ({ onNavigateToSquad }) => {
  const {
    currentMatch,
    pastMatches,
    players,
    playersMap,
    updateAttendance,
    updateMatchAttendance,
    isAdmin,
  } = useApp();

  // Combine current active match and all archived past matches
  const allMatches: Match[] = useMemo(() => {
    return [currentMatch, ...pastMatches].sort((a, b) => b.matchNumber - a.matchNumber);
  }, [currentMatch, pastMatches]);

  // Selected week match ID (defaults to current active match)
  const [selectedMatchId, setSelectedMatchId] = useState<string>(currentMatch.id);
  const selectedMatch = allMatches.find(m => m.id === selectedMatchId) || currentMatch;
  const isCurrentMatch = selectedMatch.id === currentMatch.id;

  // Active sub-tab for weekly details
  const [detailTab, setDetailTab] = useState<'confirmation' | 'squad' | 'result'>('confirmation');

  // Modals
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showMvpModal, setShowMvpModal] = useState(false);
  const [copiedBroadcastToast, setCopiedBroadcastToast] = useState(false);
  const [pushSentToast, setPushSentToast] = useState(false);

  // Status breakdown of attendees for the selected week
  const attendanceBreakdown = useMemo(() => {
    const confirmedComing: Player[] = [];
    const pendingConfirmation: Player[] = [];
    const declinedOrCancelled: { player: Player; status: AttendanceStatus }[] = [];

    // Check all players
    players.forEach(p => {
      const status = selectedMatch.attendance[p.id];
      if (status === 'Geliyor' || status === 'Geldi') {
        confirmedComing.push(p);
      } else if (status === 'Haber Bekleniyor' || status === 'Beklemede') {
        pendingConfirmation.push(p);
      } else if (
        status === 'Gelemiyor' ||
        status === 'Gelmedi' ||
        status === 'Son dakika iptal' ||
        status === 'Satış koydu'
      ) {
        declinedOrCancelled.push({ player: p, status });
      }
    });

    return { confirmedComing, pendingConfirmation, declinedOrCancelled };
  }, [players, selectedMatch.attendance]);

  const targetCount = selectedMatch.targetSquadCount || 14;
  const comingCount = attendanceBreakdown.confirmedComing.length;
  const pendingCount = attendanceBreakdown.pendingConfirmation.length;
  const declinedCount = attendanceBreakdown.declinedOrCancelled.length;

  const dateFormatted = useMemo(() => {
    try {
      const d = new Date(selectedMatch.date);
      return d.toLocaleDateString('tr-TR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return selectedMatch.date;
    }
  }, [selectedMatch.date]);

  // Helper to generate confirm / decline links for WhatsApp
  const getPlayerConfirmUrls = (playerId: string) => {
    try {
      const origin = window.location.origin + window.location.pathname;
      const base = `${origin}?player=${playerId}&match=${selectedMatch.id}`;
      return {
        confirmUrl: `${base}&action=confirm`,
        declineUrl: `${base}&action=decline`,
      };
    } catch {
      return { confirmUrl: '', declineUrl: '' };
    }
  };

  // 1-Day Before WhatsApp Broadcast Generator
  const generateOneDayBroadcastText = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
    const generalConfirm = `${origin}?match=${selectedMatch.id}&action=confirm`;
    const generalDecline = `${origin}?match=${selectedMatch.id}&action=decline`;

    const gelenlerList = attendanceBreakdown.confirmedComing
      .map((p, idx) => `${idx + 1}. ${p.name} (${p.primaryPosition})`)
      .join('\n');

    return (
      `⏰ *YARIN HALI SAHA MAÇI VAR! (SON KATILIM TEYİDİ)* ⏰\n\n` +
      `📅 *Hafta:* ${selectedMatch.matchNumber}. Hafta\n` +
      `🗓️ *Tarih:* ${dateFormatted}\n` +
      `⏰ *Saat:* ${selectedMatch.time}\n` +
      `📍 *Saha:* ${selectedMatch.venueName} (${selectedMatch.pitchNo})\n` +
      `💰 *Kişi Başı Ücret:* ${selectedMatch.costPerPlayer} ₺\n\n` +
      `👥 *ŞU ANKİ KADRO (${comingCount}/${targetCount}):*\n` +
      `${gelenlerList || 'Henüz teyit bekleniyor'}\n\n` +
      `👇 *Lütfen maça katılıp katılamayacağınızı son kez aşağıdaki linklerden onaylayın:*\n\n` +
      `🟢 *[ONAYLIYORUM (MAÇA GELİYORUM)]:*\n${generalConfirm}\n\n` +
      `🔴 *[GELEMİYORUM (İPTAL)]:*\n${generalDecline}\n\n` +
      `⚠️ *ÖNEMLİ KURAL:* Yarın takımları eksik bırakmamak ve acil yedek ayarlayabilmek adına katılımınızı bu akşamdan teyit etmeniz zorunludur! ⚽🔥`
    );
  };

  // Open 1-Day Broadcast in WhatsApp
  const handleOpenOneDayBroadcast = () => {
    const text = encodeURIComponent(generateOneDayBroadcastText());
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // Copy 1-Day Broadcast Text
  const handleCopyOneDayBroadcast = () => {
    navigator.clipboard.writeText(generateOneDayBroadcastText());
    setCopiedBroadcastToast(true);
    confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 } });
    setTimeout(() => setCopiedBroadcastToast(false), 3000);
  };

  // Send Personal WhatsApp Ping to a single player
  const handleSendPersonalWhatsAppPing = (player: Player) => {
    const { confirmUrl, declineUrl } = getPlayerConfirmUrls(player.id);
    const timeOnly = selectedMatch.time.split('-')[0].trim();

    const text = encodeURIComponent(
      `⏰ *${selectedMatch.matchNumber}. HAFTA HALI SAHA TEYİT BİLDİRİMİ* ⏰\n\n` +
      `Selam ${player.name}, yarın saat ${timeOnly}'de halı saha maçımız var! ⚽🔥\n` +
      `📍 *Saha:* ${selectedMatch.venueName}\n` +
      `💰 *Kişi Başı:* ${selectedMatch.costPerPlayer} ₺\n\n` +
      `Kadro kesinleştiriliyor. Lütfen aşağıdaki buton linklerine tıklayarak durumunu son kez onayla:\n\n` +
      `🟢 *[ONAYLIYORUM (MAÇA GELİYORUM)]:*\n${confirmUrl}\n\n` +
      `🔴 *[GELEMİYORUM (İPTAL)]:*\n${declineUrl}\n\n` +
      `Yanıtın sisteme anında işlenecektir. Teşekkürler! 🤝`
    );

    const phoneParam = player.phone ? `phone=${player.phone.replace(/\D/g, '')}&` : '';
    window.open(`https://api.whatsapp.com/send?${phoneParam}text=${text}`, '_blank');
  };

  // Send Web Push / Service Notification for 1-day reminder
  const handleSendPushReminder = async () => {
    try {
      const d = new Date(selectedMatch.date);
      const day = d.toLocaleDateString('tr-TR', { weekday: 'long' });
      await sendOneDayBeforeReminder(day, selectedMatch.time, selectedMatch.venueName);
      setPushSentToast(true);
      confetti({ particleCount: 35, spread: 70, origin: { y: 0.7 } });
      setTimeout(() => setPushSentToast(false), 3000);
    } catch (err) {
      console.warn('Push error:', err);
    }
  };

  // Format confirmation timestamp nicely
  const formatConfirmationTime = (isoString?: string) => {
    if (!isoString) return 'Sistem kaydı';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Sistem kaydı';
    }
  };

  return (
    <div className="space-y-4 pb-20 animate-in fade-in">
      {/* Toast */}
      {copiedBroadcastToast && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2 rounded-full font-bold text-xs shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-top">
          <Check className="w-4 h-4" />
          <span>Toplu WhatsApp Teyit Metni Kopyalandı!</span>
        </div>
      )}

      {pushSentToast && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-blue-600 text-white px-4 py-2 rounded-full font-bold text-xs shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-top">
          <BellRing className="w-4 h-4" />
          <span>Web Teyit Bildirimi Başarıyla Gönderildi!</span>
        </div>
      )}

      {/* HEADER: HAFTALIK ZAMAN ÇİZELGESİ & MAÇ SEÇİCİ */}
      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-white">
                Haftalık Maç Arşivi & Geçmiş
              </h2>
              <p className="text-[10px] text-slate-400">
                Tüm haftaların kadroları, katılım teyitleri ve maç sonuçları
              </p>
            </div>
          </div>

          <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700">
            Toplam {allMatches.length} Hafta
          </span>
        </div>

        {/* HORIZONTAL WEEK BADGES CAROUSEL */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700">
          {allMatches.map(m => {
            const isSelected = m.id === selectedMatchId;
            const isCurrent = m.id === currentMatch.id;
            const dateStr = new Date(m.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

            return (
              <button
                key={m.id}
                onClick={() => setSelectedMatchId(m.id)}
                className={`px-3 py-2 rounded-xl text-left border transition-all whitespace-nowrap shrink-0 ${
                  isSelected
                    ? isCurrent
                      ? 'bg-emerald-600 border-emerald-400 text-white shadow-md shadow-emerald-600/30'
                      : 'bg-amber-600 border-amber-400 text-white shadow-md shadow-amber-600/30'
                    : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:text-white hover:border-slate-600'
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  {isCurrent && (
                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                  )}
                  <span className="text-xs font-black">
                    {m.matchNumber}. Hafta
                  </span>
                  {m.status === 'completed' && <span className="text-[11px]">🏆</span>}
                </div>
                <div className="text-[10px] opacity-80 mt-0.5">
                  {dateStr} • {isCurrent ? 'Önümüzdeki Maç' : `${m.teamA.score ?? 0}-${m.teamB.score ?? 0}`}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SELECTED WEEK HERO CARD */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 space-y-3.5 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-base font-black text-white">
                {selectedMatch.matchNumber}. Hafta Halı Saha Maçı
              </span>
              {isCurrentMatch ? (
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                  Önümüzdeki Maç
                </span>
              ) : (
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Tamamlandı
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300 capitalize mt-1 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>{dateFormatted} • {selectedMatch.time}</span>
            </p>
          </div>

          {/* Quick Score or Target Pill */}
          <div className="text-right">
            {selectedMatch.status === 'completed' ? (
              <div className="px-3 py-1 rounded-xl bg-slate-950 border border-amber-500/40 text-amber-400 font-mono font-black text-base shadow-inner">
                {selectedMatch.teamA.score ?? 0} - {selectedMatch.teamB.score ?? 0}
              </div>
            ) : (
              <div className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
                {comingCount}/{targetCount} Onaylandı
              </div>
            )}
          </div>
        </div>

        {/* Venue, Cost & Format Info Strip */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
          <div>
            <span className="text-[10px] text-slate-500 block">Saha</span>
            <span className="font-bold text-slate-200 truncate block">
              {selectedMatch.pitchNo || 'Saha 1'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block">Kişi Başı</span>
            <span className="font-black text-emerald-400 font-mono block">
              {selectedMatch.costPerPlayer} ₺
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block">Format</span>
            <span className="font-bold text-slate-200 block">
              {selectedMatch.matchFormat || '7v7'}
            </span>
          </div>
        </div>

        {/* SUB-TABS: 1) Teyit & Bildirim Takibi, 2) Kadro & Saha, 3) Sonuç & Skor */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            onClick={() => setDetailTab('confirmation')}
            className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1 ${
              detailTab === 'confirmation'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>Teyit Takibi</span>
          </button>

          <button
            onClick={() => setDetailTab('squad')}
            className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1 ${
              detailTab === 'squad'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Kadrolar</span>
          </button>

          <button
            onClick={() => setDetailTab('result')}
            className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1 ${
              detailTab === 'result'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Skor & MVP</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: 1 GÜN ÖNCE TEYİT BİLDİRİMİ & CANLI ONAY TABLOSU                    */}
      {/* ========================================================================= */}
      {detailTab === 'confirmation' && (
        <div className="space-y-3.5">
          {/* BROADCAST TOOLS CARD */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-500/30 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <BellRing className="w-4 h-4 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">
                    1 Gün Önce Katılım Teyit Bildirimi (H-24)
                  </h3>
                  <p className="text-[10px] text-slate-300">
                    Gelenlere onay linki gönder, sisteme anında işlenen teyitleri canlı takip et
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
              <p className="leading-relaxed">
                📢 Maçtan 1 gün önce o hafta katılan oyunculara son teyit linki gönderilir. Oyuncular
                <strong> [Geliyorum]</strong> veya <strong>[Gelmiyorum]</strong> butonuna bastıklarında
                durumları aşağıdaki canlı tabloda anında görünür.
              </p>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <button
                  onClick={handleOpenOneDayBroadcast}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/30 active:scale-95 transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp Teyit Çağrısı</span>
                </button>

                <button
                  onClick={handleCopyOneDayBroadcast}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center justify-center space-x-1.5 active:scale-95 transition-all"
                >
                  <Copy className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Metni Kopyala</span>
                </button>

                <button
                  onClick={handleSendPushReminder}
                  className="w-full py-2 px-3 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white font-semibold text-xs flex items-center justify-center space-x-1.5 active:scale-95 transition-all"
                >
                  <BellRing className="w-3.5 h-3.5 text-blue-200" />
                  <span>Web Push Bildir</span>
                </button>
              </div>
            </div>
          </div>

          {/* ATTENDANCE COUNTER PILLS */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
              <span className="text-[10px] text-emerald-400 font-bold block uppercase tracking-wide">
                Teyit Verenler
              </span>
              <span className="text-xl font-black text-emerald-400 font-mono">
                {comingCount}
              </span>
              <span className="text-[10px] text-slate-400 block">Kişi Geliyor</span>
            </div>

            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
              <span className="text-[10px] text-amber-400 font-bold block uppercase tracking-wide">
                Haber Beklenen
              </span>
              <span className="text-xl font-black text-amber-400 font-mono">
                {pendingCount}
              </span>
              <span className="text-[10px] text-slate-400 block">Yanıt Bekleniyor</span>
            </div>

            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
              <span className="text-[10px] text-rose-400 font-bold block uppercase tracking-wide">
                Gelemeyen / İptal
              </span>
              <span className="text-xl font-black text-rose-400 font-mono">
                {declinedCount}
              </span>
              <span className="text-[10px] text-slate-400 block">Eksik / Satış</span>
            </div>
          </div>

          {/* 1. SECTION: ONAYLAYANLAR (TEYİT VERENLER) */}
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Maça Geliyorum Diyenler ({comingCount})</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Katılım Kesinleşti
              </span>
            </div>

            {attendanceBreakdown.confirmedComing.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 text-center">
                Henüz katılım onayı veren oyuncu bulunmuyor.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {attendanceBreakdown.confirmedComing.map(player => {
                  const timestamp = selectedMatch.attendanceTimestamps?.[player.id];
                  const isPaid = selectedMatch.payments[player.id]?.isPaid;

                  return (
                    <div
                      key={player.id}
                      className="p-2.5 rounded-xl bg-slate-800/60 border border-emerald-500/20 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
                          ✓
                        </div>
                        <div>
                          <span className="font-bold text-xs text-white block">
                            {player.name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {player.primaryPosition} • {formatConfirmationTime(timestamp)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        {isPaid && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                            Ödedi ₺
                          </span>
                        )}
                        <button
                          onClick={() => handleSendPersonalWhatsAppPing(player)}
                          title="Özel WhatsApp Teyit Mesajı Aç"
                          className="p-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 transition-all"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. SECTION: HABER BEKLENENLER (YANIT BEKLENİYOR) */}
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Haber Beklenenler ({pendingCount})</span>
              </span>
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Cevap Bekleniyor
              </span>
            </div>

            {attendanceBreakdown.pendingConfirmation.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 text-center">
                Bekleyen oyuncu yok, tüm yoklama tamamlandı!
              </p>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {attendanceBreakdown.pendingConfirmation.map(player => (
                  <div
                    key={player.id}
                    className="p-2.5 rounded-xl bg-slate-800/60 border border-amber-500/20 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-xs text-white block">
                        {player.name}
                      </span>
                      <span className="text-[10px] text-amber-400">
                        {player.primaryPosition} • Yanıt bekleniyor
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => updateMatchAttendance(selectedMatch.id, player.id, 'Geliyor')}
                            className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition-all"
                            title="Yönetici Olarak 'Geliyor' İşaretle"
                          >
                            Geliyor
                          </button>
                          <button
                            onClick={() => updateMatchAttendance(selectedMatch.id, player.id, 'Gelemiyor')}
                            className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] transition-all"
                            title="Yönetici Olarak 'Gelemiyor' İşaretle"
                          >
                            Gelmiyor
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleSendPersonalWhatsAppPing(player)}
                        title="Teyit İste (WhatsApp)"
                        className="py-1 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[10px] flex items-center space-x-1 transition-all"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>Dürt</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. SECTION: GELEMEYENLER & SATIŞ KOYANLAR */}
          {attendanceBreakdown.declinedOrCancelled.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white flex items-center space-x-1.5">
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <span>Gelemeyeceğini Bildirenler / İptaller ({declinedCount})</span>
                </span>
                <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                  Kadro Dışı
                </span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {attendanceBreakdown.declinedOrCancelled.map(({ player, status }) => {
                  const timestamp = selectedMatch.attendanceTimestamps?.[player.id];
                  return (
                    <div
                      key={player.id}
                      className="p-2.5 rounded-xl bg-slate-800/40 border border-rose-500/20 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-xs text-slate-300 block">
                          {player.name}
                        </span>
                        <span className="text-[10px] text-rose-400">
                          {status} • {formatConfirmationTime(timestamp)}
                        </span>
                      </div>

                      {isAdmin && onNavigateToSquad && (
                        <button
                          onClick={onNavigateToSquad}
                          className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-[10px] flex items-center space-x-1"
                        >
                          <Wand2 className="w-3 h-3 text-amber-400" />
                          <span>Yedek Bul</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: O HAFTANIN KADROLARI (KIRMIZI VS BEYAZ)                            */}
      {/* ========================================================================= */}
      {detailTab === 'squad' && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black uppercase text-slate-300 flex items-center space-x-1.5">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>{selectedMatch.matchNumber}. Hafta Takım Kadroları</span>
            </span>

            {onNavigateToSquad && (
              <button
                onClick={onNavigateToSquad}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
              >
                <span>Sahada Görüntüle</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* TEAM A */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-rose-500/30 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-rose-500/20">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
                  <span className="font-black text-xs text-white">
                    {selectedMatch.teamA.name}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-rose-400 font-mono">
                  Güç: {selectedMatch.teamA.totalPower}
                </span>
              </div>

              <div className="space-y-1.5">
                {selectedMatch.teamA.players.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Kadro henüz belirlenmedi.</p>
                ) : (
                  selectedMatch.teamA.players.map(tp => {
                    const player = playersMap[tp.playerId];
                    return (
                      <div
                        key={tp.playerId}
                        className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-white block">
                            {player?.name || tp.playerId}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {tp.position}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-amber-400 text-xs">
                          {tp.score.toFixed(1)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* TEAM B */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-blue-500/30 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-blue-500/20">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
                  <span className="font-black text-xs text-white">
                    {selectedMatch.teamB.name}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-blue-400 font-mono">
                  Güç: {selectedMatch.teamB.totalPower}
                </span>
              </div>

              <div className="space-y-1.5">
                {selectedMatch.teamB.players.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Kadro henüz belirlenmedi.</p>
                ) : (
                  selectedMatch.teamB.players.map(tp => {
                    const player = playersMap[tp.playerId];
                    return (
                      <div
                        key={tp.playerId}
                        className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-white block">
                            {player?.name || tp.playerId}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {tp.position}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-amber-400 text-xs">
                          {tp.score.toFixed(1)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MAÇ SONUCU, SKOR & MVP                                             */}
      {/* ========================================================================= */}
      {detailTab === 'result' && (
        <div className="space-y-3.5">
          {/* SCOREBOARD */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-300">
                Maç Skoru & Durum
              </span>
              <button
                onClick={() => setShowResultsModal(true)}
                className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition-all"
              >
                Skor Düzenle
              </button>
            </div>

            <div className="flex items-center justify-between bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="text-center flex-1">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block mb-1" />
                <span className="font-bold text-xs text-white block">
                  {selectedMatch.teamA.name}
                </span>
              </div>

              <div className="px-4 text-center font-mono font-black text-2xl text-white">
                <span className={selectedMatch.teamA.score! > selectedMatch.teamB.score! ? 'text-emerald-400' : ''}>
                  {selectedMatch.teamA.score ?? 0}
                </span>
                <span className="text-slate-600 mx-2">-</span>
                <span className={selectedMatch.teamB.score! > selectedMatch.teamA.score! ? 'text-emerald-400' : ''}>
                  {selectedMatch.teamB.score ?? 0}
                </span>
              </div>

              <div className="text-center flex-1">
                <span className="w-3 h-3 rounded-full bg-blue-500 inline-block mb-1" />
                <span className="font-bold text-xs text-white block">
                  {selectedMatch.teamB.name}
                </span>
              </div>
            </div>

            {selectedMatch.notes && (
              <p className="text-xs text-slate-400 italic bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                "{selectedMatch.notes}"
              </p>
            )}
          </div>

          {/* MVP CARD */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border border-amber-500/30 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-lg">
                👑
              </div>
              <div>
                <span className="text-[10px] font-bold text-amber-400 block uppercase">
                  Maçın Adamı (MVP)
                </span>
                <span className="text-sm font-black text-white block">
                  {selectedMatch.mvpWinnerId && playersMap[selectedMatch.mvpWinnerId]
                    ? playersMap[selectedMatch.mvpWinnerId].name
                    : 'Henüz Belirlenmedi'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowMvpModal(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs shadow-md shadow-amber-500/20"
            >
              MVP Oyla
            </button>
          </div>

          {/* GOALS BREAKDOWN */}
          {selectedMatch.goals && selectedMatch.goals.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs font-black text-white block">
                Gol Atanlar ({selectedMatch.goals.length} Gol)
              </span>

              <div className="space-y-1">
                {selectedMatch.goals.map(g => {
                  const scorer = playersMap[g.playerId];
                  return (
                    <div
                      key={g.id}
                      className="p-2 rounded-xl bg-slate-800/60 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2">
                        <span>⚽</span>
                        <span className="font-bold text-white">
                          {scorer?.name || g.playerId}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          ({g.team === 'teamA' ? selectedMatch.teamA.name : selectedMatch.teamB.name})
                        </span>
                      </div>
                      {g.minute && (
                        <span className="font-mono text-slate-400 text-[10px]">
                          {g.minute}'
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showResultsModal && (
        <MatchResultsModal onClose={() => setShowResultsModal(false)} />
      )}
      {showMvpModal && (
        <MvpVotingModal onClose={() => setShowMvpModal(false)} />
      )}
    </div>
  );
};