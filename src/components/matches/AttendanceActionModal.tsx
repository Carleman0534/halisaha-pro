import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  MapPin,
  CreditCard,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  X,
  BellRing,
  ShieldCheck,
  RotateCcw,
  Navigation,
  ExternalLink,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import { isPlayerExemptForMatch } from '../../utils/permissions';
import { getMatchMapsUrl } from '../../services/firebase';
import { AppUser } from '../../types';

export const AttendanceActionModal: React.FC = () => {
  const {
    currentUser,
    setCurrentUser,
    currentMatch,
    updateAttendance,
    playersMap,
    players,
  } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'prompt' | 'confirmed' | 'declined'>('prompt');
  const [activePlayerId, setActivePlayerId] = useState<string>('');
  const [copiedIban, setCopiedIban] = useState(false);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;

      const params = new URLSearchParams(window.location.search);
      const playerParam =
        params.get('oyuncu') ||
        params.get('player') ||
        params.get('p');

      const actionParam =
        params.get('durum') ||
        params.get('action') ||
        params.get('d');

      // 1. Direct 1-tap WhatsApp attendance link detection
      if (playerParam) {
        const foundPlayer = playersMap[playerParam] || players.find(p => p.id === playerParam);

        if (foundPlayer) {
          setActivePlayerId(foundPlayer.id);

          // Auto-login session as this player
          const playerUser: AppUser = {
            id: `player_${foundPlayer.id}`,
            name: foundPlayer.name,
            role: 'player',
            playerId: foundPlayer.id,
          };
          setCurrentUser(playerUser);

          const act = actionParam ? actionParam.toLowerCase().trim() : null;
          const isConfirm =
            act === 'geliyorum' ||
            act === 'confirm' ||
            act === 'geldi' ||
            act === 'evet';
          const isDecline =
            act === 'gelmiyorum' ||
            act === 'decline' ||
            act === 'gelemiyor' ||
            act === 'hayir';

          if (isConfirm) {
            updateAttendance(foundPlayer.id, 'Geliyor');
            setModalMode('confirmed');
            setIsOpen(true);
            try {
              confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
            } catch {}
          } else if (isDecline) {
            updateAttendance(foundPlayer.id, 'Gelemiyor');
            setModalMode('declined');
            setIsOpen(true);
          } else {
            // Player link with no explicit action -> open prompt directly
            setModalMode('prompt');
            setIsOpen(true);
          }

          // Clean up URL parameters cleanly
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('oyuncu');
          newUrl.searchParams.delete('player');
          newUrl.searchParams.delete('p');
          newUrl.searchParams.delete('durum');
          newUrl.searchParams.delete('action');
          newUrl.searchParams.delete('d');
          window.history.replaceState({}, '', newUrl.toString());
          return;
        }
      }

      // 2. Action without player param (uses currentUser)
      if (actionParam && currentUser.playerId) {
        const act = actionParam.toLowerCase().trim();
        const isConfirm = act === 'geliyorum' || act === 'confirm' || act === 'geldi';
        setActivePlayerId(currentUser.playerId);

        if (isConfirm) {
          updateAttendance(currentUser.playerId, 'Geliyor');
          setModalMode('confirmed');
          try {
            confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } });
          } catch {}
        } else {
          updateAttendance(currentUser.playerId, 'Gelemiyor');
          setModalMode('declined');
        }
        setIsOpen(true);

        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('durum');
        newUrl.searchParams.delete('action');
        newUrl.searchParams.delete('d');
        window.history.replaceState({}, '', newUrl.toString());
        return;
      }

      // 3. Fallback: If logged in as player and pending confirmation
      if (currentUser.playerId) {
        setActivePlayerId(currentUser.playerId);
        const status = currentMatch.attendance[currentUser.playerId] || 'Haber Bekleniyor';
        const isPending = status === 'Haber Bekleniyor' || status === 'Beklemede';
        const dismissedKey = `halisaha_prompt_dismissed_${currentMatch.id}_${currentUser.playerId}`;

        if (isPending && !sessionStorage.getItem(dismissedKey)) {
          setModalMode('prompt');
          setIsOpen(true);
        }
      }
    } catch (err) {
      console.warn('AttendanceActionModal error:', err);
    }
  }, [currentUser.playerId, currentMatch.id]);

  const targetId = activePlayerId || currentUser.playerId;
  if (!isOpen || !targetId) return null;

  const targetPlayer = playersMap[targetId];
  const playerName = targetPlayer ? targetPlayer.name : currentUser.name || 'Oyuncu';
  const exemptionInfo = isPlayerExemptForMatch(targetPlayer, currentMatch);

  const d = new Date(currentMatch.date);
  const dateFormatted = d.toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const handleConfirmComing = () => {
    updateAttendance(targetId, 'Geliyor');
    setModalMode('confirmed');
    try {
      confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } });
    } catch {}
  };

  const handleConfirmDeclining = () => {
    updateAttendance(targetId, 'Gelemiyor');
    setModalMode('declined');
  };

  const handleClose = () => {
    const dismissedKey = `halisaha_prompt_dismissed_${currentMatch.id}_${targetId}`;
    sessionStorage.setItem(dismissedKey, 'true');
    setIsOpen(false);
  };

  const handleCopyIban = () => {
    const iban = localStorage.getItem('halisaha_iban') || 'TR33 0006 1005 1234 5678 9012 34';
    const receiver = localStorage.getItem('halisaha_receiver') || 'Hadi Hoca';
    navigator.clipboard.writeText(
      `⚽ HALI SAHA MAÇ ÖDEMESİ\n💰 Tutar: ${currentMatch.costPerPlayer} ₺\n🏦 IBAN: ${iban}\n👤 Alıcı: ${receiver}\n📝 Açıklama: ${playerName} Halısaha`
    );
    setCopiedIban(true);
    setTimeout(() => setCopiedIban(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto my-auto">
        {/* Top close button */}
        <div className="flex justify-end">
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ============================================================ */}
        {/* VIEW 1: PROMPT TO CONFIRM (GELİYORUM / GELMİYORUM)           */}
        {/* ============================================================ */}
        {modalMode === 'prompt' && (
          <div className="space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/20">
              <BellRing className="w-7 h-7 animate-bounce" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                MAÇ KATILIM TEYİDİ
              </span>
              <h3 className="text-lg font-black text-white">
                Selam {playerName} ⚽🔥
              </h3>
              <p className="text-xs text-slate-300">
                Bu haftaki halı saha maçımız için katılım durumunuz bekleniyor. Maça geliyor musunuz?
              </p>
            </div>

            {/* Match Info Pill */}
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-left text-xs space-y-2">
              <div className="flex items-center space-x-2 text-slate-200">
                <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-bold capitalize">{dateFormatted}</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-300">
                <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Saat: <strong className="text-white">{currentMatch.time}</strong></span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <div className="flex items-center space-x-2 text-slate-200 min-w-0">
                  <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                  <div className="truncate">
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
                  <span>Konum</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-800 text-[11px]">
                <span className="text-slate-400">Kişi Başı Ücret:</span>
                {exemptionInfo.isExempt ? (
                  <span className="font-bold text-emerald-400">0 ₺ (🛡️ Muafsınız)</span>
                ) : (
                  <span className="font-bold text-amber-400 font-mono">{currentMatch.costPerPlayer} ₺</span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleConfirmComing}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-sm shadow-xl shadow-emerald-500/30 transition-all active:scale-95 flex items-center justify-center space-x-2"
              >
                <CheckCircle2 className="w-5 h-5 text-black" />
                <span>ONAYLIYORUM (MAÇA GELİYORUM)</span>
              </button>

              <button
                onClick={handleConfirmDeclining}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 border border-slate-700 font-bold text-xs transition-all active:scale-95 flex items-center justify-center space-x-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>GELEMİYORUM</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 2: CONFIRMED SUCCESS VIEW                              */}
        {/* ============================================================ */}
        {modalMode === 'confirmed' && (
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                TEYİT ALINDI ✓
              </span>
              <h3 className="text-lg font-black text-white">
                Harika, Kadroya Alındınız! ⚽
              </h3>
              <p className="text-xs text-slate-300">
                <strong>{playerName}</strong>, maça katılımınız onaylandı ve organizatör yöneticilere bildirildi.
              </p>
            </div>

            {/* Exemption Notice if Exempt */}
            {exemptionInfo.isExempt && (
              <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-800/60 text-center space-y-0.5">
                <div className="flex items-center justify-center space-x-1.5 text-purple-300 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  <span>0 ₺ — Ödeme Muafiyetiniz Var</span>
                </div>
                <p className="text-[10px] text-purple-200/80">
                  {exemptionInfo.reason || 'Bu maç için saha ücreti ödemeniz gerekmemektedir.'}
                </p>
              </div>
            )}

            {/* Match summary */}
            <div className="p-3 bg-slate-950/80 border border-emerald-500/30 rounded-2xl text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Tarih:</span>
                <span className="font-bold text-white capitalize">{dateFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Saat:</span>
                <span className="font-bold text-emerald-400">{currentMatch.time}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400 shrink-0">Saha:</span>
                <a
                  href={getMatchMapsUrl(currentMatch)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-blue-300 hover:text-blue-200 flex items-center space-x-1 truncate"
                >
                  <span className="truncate">{currentMatch.venueName}</span>
                  <Navigation className="w-3 h-3 text-blue-400 shrink-0" />
                </a>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-800">
                <span className="text-slate-400">Ücret:</span>
                {exemptionInfo.isExempt ? (
                  <span className="font-bold text-emerald-400 font-mono">0 ₺ (Muaf)</span>
                ) : (
                  <span className="font-bold text-amber-400 font-mono">{currentMatch.costPerPlayer} ₺</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {!exemptionInfo.isExempt && (
                <button
                  onClick={handleCopyIban}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all active:scale-95 flex items-center justify-center space-x-1.5"
                >
                  {copiedIban ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">IBAN Kopyalandı!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-amber-400" />
                      <span>Ödeme İçin IBAN Kopyala</span>
                    </>
                  )}
                </button>
              )}

              <button
                onClick={handleClose}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center space-x-1"
              >
                <span>Kadroyu ve Takımları İncele</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 3: DECLINED VIEW                                       */}
        {/* ============================================================ */}
        {modalMode === 'declined' && (
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 mx-auto flex items-center justify-center shadow-lg shadow-rose-500/20">
              <XCircle className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">
                BİLGİ VERİLDİ
              </span>
              <h3 className="text-lg font-black text-white">
                Gelemiyor Olarak Kaydedildi
              </h3>
              <p className="text-xs text-slate-300">
                <strong>{playerName}</strong>, bu haftaki maça katılamayacağınız sisteme işlendi. Yerinize yedek havuzundan oyuncu çağrılacak.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={handleConfirmComing}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-bold text-xs transition-all active:scale-95 flex items-center justify-center space-x-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Fikrim Değişti, Maça Geliyorum!</span>
              </button>

              <button
                onClick={handleClose}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all active:scale-95"
              >
                Tamam
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
