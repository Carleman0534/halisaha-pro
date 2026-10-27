import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Calendar,
  AlertCircle,
  CreditCard,
  Copy,
  Check,
  UserCheck,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  Navigation,
  ExternalLink,
  BellRing,
  Lock,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import { isPlayerExemptForMatch, hasActiveMatchInvitation } from '../../utils/permissions';
import { getMatchMapsUrl } from '../../services/firebase';
import { getNotificationPermission, requestNotificationPermission } from '../../services/notifications';

interface PlayerAttendanceConfirmCardProps {
  onOpenAuthModal?: () => void;
}

export const PlayerAttendanceConfirmCard: React.FC<PlayerAttendanceConfirmCardProps> = ({
  onOpenAuthModal,
}) => {
  const { currentUser, currentMatch, updateAttendance, playersMap, isCouncil } = useApp();

  const [copiedIbanToast, setCopiedIbanToast] = useState(false);
  const [notifPermission, setNotifPermission] = useState<string>(() => getNotificationPermission());

  const handleEnableNotifications = async () => {
    const res = await requestNotificationPermission();
    setNotifPermission(res);
  };

  // If no playerId (e.g. general viewer)
  if (!currentUser.playerId) {
    return (
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border border-blue-500/30 flex items-center justify-between shadow-lg gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-black text-white">Genel Misafir Modundasınız</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
              Maç davetlerinizi görmek ve bildirim almak için yukarıdan kendi oyuncu isminizi seçerek giriş yapın.
            </p>
          </div>
        </div>

        {onOpenAuthModal && (
          <button
            onClick={onOpenAuthModal}
            className="flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 shrink-0"
          >
            <span>İsmini Seç</span>
            <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
          </button>
        )}
      </div>
    );
  }

  const myId = currentUser.playerId;
  const player = playersMap[myId];
  const status = currentMatch.attendance[myId] || 'Haber Bekleniyor';
  const isComing = status === 'Geliyor' || status === 'Geldi';
  const isNotComing = status === 'Gelemiyor' || status === 'Gelmedi';
  const hasPendingInvite = hasActiveMatchInvitation(myId, currentMatch);
  const isPaid = !!currentMatch.payments[myId]?.isPaid;
  const exemptionInfo = isPlayerExemptForMatch(player, currentMatch);
  const isExempt = exemptionInfo.isExempt;

  const handleConfirmComing = () => {
    updateAttendance(myId, 'Geliyor');
    try {
      confetti({ particleCount: 40, spread: 70, origin: { y: 0.7 } });
    } catch {}
  };

  const handleConfirmNotComing = () => {
    updateAttendance(myId, 'Gelemiyor');
  };

  const handleCopyIban = () => {
    const iban = localStorage.getItem('halisaha_iban') || 'TR33 0006 1005 1234 5678 9012 34';
    const receiver = localStorage.getItem('halisaha_receiver') || 'Hadi Hoca';
    navigator.clipboard.writeText(
      `⚽ HALI SAHA MAÇ ÖDEMESİ\n💰 Tutar: ${currentMatch.costPerPlayer} ₺\n🏦 IBAN: ${iban}\n👤 Alıcı: ${receiver}\n📝 Açıklama: ${currentUser.name} Halısaha`
    );
    setCopiedIbanToast(true);
    setTimeout(() => setCopiedIbanToast(false), 2500);
  };

  const responseTimestamp = currentMatch.attendanceTimestamps?.[myId];

  // Restricted card for non-council players who are NOT 'Geliyor' and do NOT have a pending '🔔 Sor' request
  if (!isCouncil && !isComing && !hasPendingInvite) {
    return (
      <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0 ${
                isNotComing
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {isNotComing ? <XCircle className="w-6 h-6" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Oyuncu Hesabı:</span>
                <span className="text-sm font-black text-white">{currentUser.name}</span>
              </div>
              <p className="text-xs font-bold text-slate-300 mt-0.5">
                {isNotComing
                  ? '🔴 Bu haftaki maça katılamayacağınızı bildirdiniz.'
                  : '⏳ Henüz aktif bir maç davetiniz bulunmuyor.'}
              </p>
            </div>
          </div>

          {onOpenAuthModal && (
            <button
              onClick={onOpenAuthModal}
              className="text-[11px] text-slate-300 hover:text-white px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 font-bold transition-all shrink-0"
            >
              Değiştir
            </button>
          )}
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 text-xs text-slate-400 leading-relaxed space-y-1.5">
          <p className="text-slate-300 font-semibold">
            🔒 Maç ve Saha Bilgileri Kısıtlıdır
          </p>
          <p>
            Konsey üyesi olmayan oyuncular, yalnızca kendilerine <strong>"🔔 Sor"</strong> daveti gönderilip maça <strong>"Geliyor"</strong> olarak katıldıklarında maç saatini, saha konumunu ve kadro detaylarını görüntüleyebilirler.
          </p>
        </div>

        {notifPermission !== 'granted' && notifPermission !== 'unsupported' && (
          <button
            onClick={handleEnableNotifications}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-center space-x-2 transition-all active:scale-95"
          >
            <BellRing className="w-4 h-4 text-amber-400 animate-bounce" />
            <span>Maça Çağrıldığımda Telefonuma Bildirim Gelsin (İzin Ver)</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`p-4 rounded-2xl border shadow-xl transition-all space-y-3 ${
        isComing
          ? 'bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 border-emerald-500/50'
          : isNotComing
          ? 'bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-900 border-rose-500/40'
          : 'bg-gradient-to-br from-amber-950/50 via-slate-900 to-slate-900 border-amber-500/40'
      }`}
    >
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs border ${
              isComing
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : isNotComing
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}
          >
            {isComing ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : isNotComing ? (
              <XCircle className="w-5 h-5 text-rose-400" />
            ) : (
              <BellRing className="w-5 h-5 text-amber-400 animate-bounce" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] text-slate-400">Katılım Teyidi:</span>
              <span className="text-xs font-black text-white">{currentUser.name}</span>
              {isExempt && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  Muaf
                </span>
              )}
            </div>
            <p className="text-[11px] font-bold text-slate-300">
              {isComing
                ? '✅ Maça Geliyorsunuz (Kadroya Alındınız)'
                : isNotComing
                ? '🔴 Gelemiyorsunuz Olarak Bildirildi'
                : '🔔 Konsey tarafından bu haftaki maça davet edildiniz! Katılıyor musunuz?'}
            </p>
            {responseTimestamp && (
              <p className="text-[9px] text-slate-400 mt-0.5">
                Son Güncelleme: {new Date(responseTimestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
              </p>
            )}
          </div>
        </div>

        {/* Change Profile button */}
        {onOpenAuthModal && (
          <button
            onClick={onOpenAuthModal}
            className="text-[10px] text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 transition-all"
          >
            Değiştir
          </button>
        )}
      </div>

      {/* Match Date, Time, Venue & Google Maps Bar — Shown to Council, Confirmed ('Geliyor'), OR Invited ('🔔 Sor') Players */}
      {(isCouncil || isComing || hasPendingInvite) && (
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
            <div className="flex items-center space-x-1.5 text-slate-200">
              <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-bold text-white capitalize">
                {new Date(currentMatch.date).toLocaleDateString('tr-TR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="flex items-center space-x-1 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-lg text-emerald-300 font-bold">
              <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{currentMatch.time}</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 min-w-0">
              <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
              <div className="min-w-0">
                <span className="font-bold text-white block truncate">{currentMatch.venueName}</span>
                {currentMatch.venueLocation && currentMatch.venueLocation !== currentMatch.venueName && (
                  <span className="text-[10px] text-slate-400 block truncate">{currentMatch.venueLocation}</span>
                )}
              </div>
            </div>
            <a
              href={getMatchMapsUrl(currentMatch)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-[11px] font-bold flex items-center space-x-1 shrink-0 transition-all active:scale-95"
            >
              <Navigation className="w-3 h-3 text-blue-400" />
              <span>Yol Tarifi (Maps)</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      )}

      {/* Action Buttons (Geliyorum / Gelmiyorum) */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={handleConfirmComing}
          className={`flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl font-black text-xs transition-all active:scale-95 shadow-md ${
            isComing
              ? 'bg-emerald-500 text-black shadow-emerald-500/30 ring-2 ring-emerald-400'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 opacity-80 hover:opacity-100'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{isComing ? 'KADRODASINIZ ✓' : 'MAÇA GELİYORUM'}</span>
        </button>

        <button
          onClick={handleConfirmNotComing}
          className={`flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl font-black text-xs transition-all active:scale-95 shadow-md ${
            isNotComing
              ? 'bg-rose-600 text-white shadow-rose-600/30 ring-2 ring-rose-400'
              : 'bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 border border-slate-700'
          }`}
        >
          <XCircle className="w-4 h-4" />
          <span>{isNotComing ? 'GELMİYORUM ✗' : 'GELMİYORUM'}</span>
        </button>
      </div>

      {/* Match & Payment Quick Status */}
      {isComing && (
        <div className="pt-1 flex items-center justify-between text-[11px] bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
          <div className="flex items-center space-x-1.5 text-slate-300">
            <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
            {isExempt ? (
              <span className="text-emerald-300 font-bold flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Ödeme Yükümlülüğünüz Yoktur (Muaf: 0 ₺)</span>
              </span>
            ) : (
              <>
                <span>
                  Kişi Başı Ücret: <strong>{currentMatch.costPerPlayer} ₺</strong>
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ml-1 ${
                    isPaid
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}
                >
                  {isPaid ? 'Ödediniz ✓' : 'Ödenmedi'}
                </span>
              </>
            )}
          </div>

          {!isExempt && !isPaid && (
            <button
              onClick={handleCopyIban}
              className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-bold transition-all active:scale-95"
            >
              {copiedIbanToast ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Kopyalandı</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>IBAN Kopyala</span>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
