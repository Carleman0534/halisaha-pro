import React, { useState, useMemo } from 'react';
import {
  Wallet,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  User,
  QrCode,
  Share2,
  Edit3,
  ExternalLink,
  MessageCircle,
  Building2,
  Calendar,
  X,
  ShieldCheck,
  ShieldAlert,
  History,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import { Player, PaymentExemption, ExemptionAuditLog } from '../../types';
import { QrPaymentModal } from './QrPaymentModal';
import { WhatsAppDebtReminderModal } from './WhatsAppDebtReminderModal';
import { calculateMatchFinancials, isPlayerExemptForMatch } from '../../utils/permissions';

export const FinanceManager: React.FC = () => {
  const {
    currentMatch,
    pastMatches,
    players,
    playersMap,
    togglePayment,
    setPlayerExemption,
    getExemptionAuditLogs,
    isAdmin,
  } = useApp();

  const [copiedIbanToast, setCopiedIbanToast] = useState(false);
  const [copiedDebtToast, setCopiedDebtToast] = useState(false);
  const [exemptionSuccessToast, setExemptionSuccessToast] = useState<string | null>(null);

  // Match selector: view current active match or any past archived match
  const [selectedMatchId, setSelectedMatchId] = useState<string>(currentMatch.id);

  const activeMatch = useMemo(() => {
    if (selectedMatchId === currentMatch.id) return currentMatch;
    return pastMatches.find(m => m.id === selectedMatchId) || currentMatch;
  }, [selectedMatchId, currentMatch, pastMatches]);

  const isCurrentActive = activeMatch.id === currentMatch.id;

  const [selectedPlayerForQr, setSelectedPlayerForQr] = useState<Player | null>(null);
  const [showGeneralQr, setShowGeneralQr] = useState(false);
  const [showEditBankModal, setShowEditBankModal] = useState(false);
  const [showExemptionAuditModal, setShowExemptionAuditModal] = useState(false);
  const [showDebtReminderModal, setShowDebtReminderModal] = useState(false);

  // Exemption Modal State
  const [exemptionPlayer, setExemptionPlayer] = useState<Player | null>(null);
  const [exemptionActive, setExemptionActive] = useState<boolean>(true);
  const [exemptionScope, setExemptionScope] = useState<'all' | 'specific_matches' | 'date_range'>('all');
  const [exemptionReason, setExemptionReason] = useState<string>('Yönetici Muafiyeti');
  const [exemptionSelectedMatches, setExemptionSelectedMatches] = useState<string[]>([]);
  const [exemptionStartDate, setExemptionStartDate] = useState<string>('');
  const [exemptionEndDate, setExemptionEndDate] = useState<string>('');

  // Bank & IBAN details (persisted in localStorage)
  const [iban, setIban] = useState<string>(() => {
    return localStorage.getItem('halisaha_iban') || 'TR33 0006 1005 1234 5678 9012 34';
  });
  const [receiverName, setReceiverName] = useState<string>(() => {
    return localStorage.getItem('halisaha_receiver') || 'Hadi Hoca';
  });

  const [editIbanValue, setEditIbanValue] = useState(iban);
  const [editReceiverValue, setEditReceiverValue] = useState(receiverName);

  // Accurate financial calculations with exemption separation
  const financials = useMemo(() => {
    return calculateMatchFinancials(activeMatch, playersMap);
  }, [activeMatch, playersMap]);

  const {
    totalCost,
    costPerPlayer,
    exemptCount,
    paidCount,
    unpaidPlayers,
    totalCollected,
    remainingDebt,
    collectionPercent,
  } = financials;

  // Open exemption modal for player
  const handleOpenExemptionModal = (player: Player) => {
    setExemptionPlayer(player);
    const existing = player.paymentExemption;
    if (existing && existing.isActive) {
      setExemptionActive(true);
      setExemptionScope(existing.scope || 'all');
      setExemptionReason(existing.reason || 'Yönetici Muafiyeti');
      setExemptionSelectedMatches(existing.matchIds || [activeMatch.id]);
      setExemptionStartDate(existing.startDate || '');
      setExemptionEndDate(existing.endDate || '');
    } else {
      setExemptionActive(true);
      setExemptionScope('all');
      setExemptionReason('Saha Sorumlusu / Yönetici');
      setExemptionSelectedMatches([activeMatch.id]);
      setExemptionStartDate('');
      setExemptionEndDate('');
    }
  };

  // Save exemption
  const handleSaveExemption = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exemptionPlayer) return;

    if (!exemptionActive) {
      setPlayerExemption(exemptionPlayer.id, null, 'Muafiyet yönetici tarafından kaldırıldı');
      setExemptionSuccessToast(`${exemptionPlayer.name} muafiyeti kaldırıldı.`);
    } else {
      const exObj: Partial<PaymentExemption> = {
        isActive: true,
        scope: exemptionScope,
        reason: exemptionReason.trim() || 'Yönetici Muafiyeti',
        matchIds: exemptionScope === 'specific_matches' ? exemptionSelectedMatches : undefined,
        startDate: exemptionScope === 'date_range' ? exemptionStartDate : undefined,
        endDate: exemptionScope === 'date_range' ? exemptionEndDate : undefined,
      };
      setPlayerExemption(exemptionPlayer.id, exObj, exemptionReason.trim());
      setExemptionSuccessToast(`🛡️ ${exemptionPlayer.name} için ödeme muafiyeti başarıyla kaydedildi!`);
      try {
        confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 } });
      } catch {}
    }

    setExemptionPlayer(null);
    setTimeout(() => setExemptionSuccessToast(null), 3500);
  };

  // Save updated IBAN
  const handleSaveBankDetails = (e: React.FormEvent) => {
    e.preventDefault();
    setIban(editIbanValue.trim());
    setReceiverName(editReceiverValue.trim());
    localStorage.setItem('halisaha_iban', editIbanValue.trim());
    localStorage.setItem('halisaha_receiver', editReceiverValue.trim());
    setShowEditBankModal(false);
    confetti({ particleCount: 25, spread: 50, origin: { y: 0.7 } });
  };

  // Copy standard IBAN
  const handleCopyIban = () => {
    navigator.clipboard.writeText(
      `⚽ HALI SAHA MAÇ ÖDEMESİ\n💰 Kişi Başı: ${costPerPlayer} ₺\n🏦 IBAN: ${iban}\n👤 Alıcı: ${receiverName}\n📝 Açıklama: [Ad Soyad] Halısaha`
    );
    setCopiedIbanToast(true);
    setTimeout(() => setCopiedIbanToast(false), 2500);
  };

  // Generate Debt text for WhatsApp (Exempt players are strictly excluded from debtors)
  const generateDebtText = () => {
    let text = `⚽ *HALI SAHA ${activeMatch.matchNumber}. HAFTA ÖDEME HATIRLATMASI* ⚽\n`;
    text += `Değerli arkadaşlar, saha ücretinin kapatılması için ödemesi beklenen üyelerimiz:\n\n`;

    if (unpaidPlayers.length > 0) {
      text += `🔴 *Ödeme Bekleyenler (Kişi Başı: ${costPerPlayer} ₺):*\n`;
      unpaidPlayers.forEach((p, idx) => {
        text += `${idx + 1}. ${p.name} — ${costPerPlayer} ₺\n`;
      });
    } else {
      text += `✅ *Harika! Tüm oyuncuların ödemesi tamamlandı.*\n`;
    }

    if (exemptCount > 0) {
      const exemptNames = activeMatch.squad
        .map(id => playersMap[id])
        .filter(p => isPlayerExemptForMatch(p, activeMatch).isExempt)
        .map(p => p.name)
        .join(', ');
      text += `\n🛡️ *Muaf Oyuncular:* ${exemptNames} (Ödeme yükümlülüğü 0 ₺)\n`;
    }

    text += `\n💰 *Kalan Toplam:* ${remainingDebt} ₺\n`;
    text += `🏦 *IBAN:* ${iban}\n`;
    text += `👤 *Alıcı:* ${receiverName}\n`;
    text += `📝 *Açıklama:* Ad Soyad Halısaha\n\n`;
    text += `Ödeme yapan arkadaşlar dekontu gruba iletirse listeyi güncelleriz. Anlayışınız için teşekkürler! 🤝`;

    return text;
  };

  // Copy Debt broadcast text
  const handleCopyDebtBroadcast = () => {
    const text = generateDebtText();
    navigator.clipboard.writeText(text);
    setCopiedDebtToast(true);
    setTimeout(() => setCopiedDebtToast(false), 3000);
  };

  // Direct open WhatsApp with Debt broadcast
  const handleOpenDebtWhatsApp = () => {
    const text = generateDebtText();
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Direct individual WhatsApp payment reminder
  const handleSendPlayerPersonalDebtWhatsApp = (player: Player) => {
    const text = `Selam ${player.name}, ${activeMatch.venueName} halı saha maç ücreti payın ${costPerPlayer} ₺.\n🏦 IBAN: ${iban}\n👤 Alıcı: ${receiverName}\n📝 Açıklama: ${player.name} Halısaha\nMüsait olduğunda gönderebilirsen çok sevinirim, teşekkürler! 🤝⚽`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Toast Notifications */}
      {copiedIbanToast && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2 rounded-full font-bold text-xs shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-top">
          <Check className="w-4 h-4" />
          <span>IBAN Bilgileri Kopyalandı!</span>
        </div>
      )}

      {copiedDebtToast && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2 rounded-full font-bold text-xs shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-top">
          <Check className="w-4 h-4" />
          <span>WhatsApp Borç Listesi Kopyalandı!</span>
        </div>
      )}

      {exemptionSuccessToast && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl font-bold text-xs shadow-2xl flex items-center space-x-2 border border-emerald-400 animate-in fade-in slide-in-from-top max-w-sm text-center">
          <ShieldCheck className="w-4 h-4 text-emerald-200 shrink-0" />
          <span>{exemptionSuccessToast}</span>
        </div>
      )}

      {/* Financial Overview Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-700/60 shadow-xl space-y-4">
        {/* Match Selector Dropdown */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                HALI SAHA KASASI
              </span>
              <div className="flex items-center space-x-1.5">
                <select
                  value={selectedMatchId}
                  onChange={e => setSelectedMatchId(e.target.value)}
                  className="bg-transparent text-sm font-black text-white focus:outline-none cursor-pointer border-b border-dashed border-slate-600 hover:border-emerald-400 pr-2"
                >
                  <option value={currentMatch.id} className="bg-slate-900 text-white">
                    {currentMatch.matchNumber}. Hafta (Önümüzdeki Maç)
                  </option>
                  {pastMatches.map(m => (
                    <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                      {m.matchNumber}. Hafta ({m.date})
                    </option>
                  ))}
                </select>
                {isCurrentActive && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                    Aktif
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {isAdmin && (
              <button
                onClick={() => setShowExemptionAuditModal(true)}
                title="Muafiyet İşlem Geçmişi"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-amber-400 transition-all active:scale-95"
              >
                <History className="w-4 h-4" />
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => {
                  setEditIbanValue(iban);
                  setEditReceiverValue(receiverName);
                  setShowEditBankModal(true);
                }}
                title="Banka ve IBAN Düzenle"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 transition-all active:scale-95"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setShowGeneralQr(true)}
              title="Karekod ile Ödeme Aç"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-emerald-400 transition-all active:scale-95"
            >
              <QrCode className="w-4 h-4" />
            </button>
            <button
              onClick={handleCopyIban}
              title="IBAN Kopyala"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-emerald-400 transition-all active:scale-95"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bank & IBAN Quick Info Pill */}
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block">Kasa Alıcısı: {receiverName}</span>
              <span className="font-mono text-slate-200 font-bold text-[11px] select-all">{iban}</span>
            </div>
          </div>

          <button
            onClick={handleCopyIban}
            className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-bold"
          >
            Kopyala
          </button>
        </div>

        {/* 4 Financial Metrics Grid (Including Person-based Exemption) */}
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
            <span className="text-[9px] text-slate-400 uppercase font-bold block">Saha Ücreti</span>
            <span className="text-xs sm:text-sm font-black text-white font-mono">{totalCost} ₺</span>
            <span className="text-[9px] text-slate-500 block">Kişi: {costPerPlayer} ₺</span>
          </div>

          <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
            <span className="text-[9px] text-emerald-400 uppercase font-bold block">Toplanan</span>
            <span className="text-xs sm:text-sm font-black text-emerald-400 font-mono">{totalCollected} ₺</span>
            <span className="text-[9px] text-slate-500 block">{paidCount} Kişi</span>
          </div>

          <div className="p-2.5 bg-slate-900/80 rounded-xl border border-amber-500/30">
            <span className="text-[9px] text-amber-400 uppercase font-bold block">Muaf</span>
            <span className="text-xs sm:text-sm font-black text-amber-400 font-mono">{exemptCount} Kişi</span>
            <span className="text-[9px] text-slate-400 block">0 ₺ Yükümlülük</span>
          </div>

          <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
            <span className="text-[9px] text-rose-400 uppercase font-bold block">Kalan Borç</span>
            <span className="text-xs sm:text-sm font-black text-rose-400 font-mono">{remainingDebt} ₺</span>
            <span className="text-[9px] text-slate-500 block">{unpaidPlayers.length} Kişi</span>
          </div>
        </div>

        {/* Collection Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Tahsilat Oranı</span>
            <span className="font-bold text-white">%{collectionPercent}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                collectionPercent === 100 ? 'bg-emerald-500' : 'bg-emerald-600'
              }`}
              style={{ width: `${collectionPercent}%` }}
            />
          </div>
        </div>

        {/* Action Buttons: WhatsApp Debt Broadcast */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
          <button
            onClick={() => setShowDebtReminderModal(true)}
            className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-black text-xs shadow-lg shadow-emerald-600/25 transition-all active:scale-95"
          >
            <MessageCircle className="w-4 h-4" />
            <span>💬 WhatsApp Kasa & Borç Şablonu</span>
          </button>

          <button
            onClick={handleCopyDebtBroadcast}
            className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs transition-all active:scale-95"
          >
            <Copy className="w-3.5 h-3.5 text-emerald-400" />
            <span>Borç Listesi Kopyala</span>
          </button>

          <button
            onClick={handleOpenDebtWhatsApp}
            className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition-all active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Hızlı WP At</span>
          </button>
        </div>
      </div>

      {/* Squad Payment & Exemption Toggles */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-300 px-1">
          <h3 className="font-bold">{activeMatch.matchNumber}. Hafta Oyuncu Ödemeleri & Muafiyet</h3>
          <span className="text-slate-400">Muaf oyuncuların yükümlülüğü 0 ₺'dir</span>
        </div>

        <div className="space-y-1.5">
          {activeMatch.squad.map(playerId => {
            const player = playersMap[playerId];
            if (!player) return null;
            const exemptionInfo = isPlayerExemptForMatch(player, activeMatch);
            const isExempt = exemptionInfo.isExempt;
            const payment = activeMatch.payments[playerId] || {
              isPaid: false,
              amount: isExempt ? 0 : costPerPlayer,
            };

            return (
              <div
                key={playerId}
                className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                  isExempt
                    ? 'bg-amber-950/20 border-amber-500/40'
                    : payment.isPaid
                    ? 'bg-slate-900/60 border-slate-800'
                    : 'bg-rose-950/20 border-rose-900/40 hover:border-rose-700/60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                      isExempt
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : payment.isPaid
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {isExempt ? (
                      <ShieldCheck className="w-5 h-5" />
                    ) : payment.isPaid ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Clock className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-sm font-bold text-white block">{player.name}</span>
                      {isExempt && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                          🛡️ Muaf (0 ₺)
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      Pay: {isExempt ? 0 : costPerPlayer} ₺ •{' '}
                      {isExempt ? (
                        <span className="text-amber-300 font-semibold">
                          Muaf ({exemptionInfo.reason || 'Kayıtlı Muafiyet'})
                        </span>
                      ) : payment.isPaid ? (
                        <span className="text-emerald-400 font-semibold">Ödendi ✓</span>
                      ) : (
                        <span className="text-rose-400 font-semibold">Ödeme Bekliyor</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center space-x-1.5">
                  {/* WhatsApp Reminder (Only for non-exempt and unpaid) */}
                  {!isExempt && !payment.isPaid && (
                    <button
                      onClick={() => handleSendPlayerPersonalDebtWhatsApp(player)}
                      title={`${player.name}'e WhatsApp'tan Özel Ödeme Hatırlatması Gönder`}
                      className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs transition-all active:scale-95"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  )}

                  {/* QR Modal (Only if not exempt) */}
                  {!isExempt && (
                    <button
                      onClick={() => setSelectedPlayerForQr(player)}
                      title={`${player.name} için Banka Karekodu Aç`}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 text-xs transition-all active:scale-95"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                  )}

                  {/* Exemption Config Button (Admin Only) */}
                  {isAdmin && (
                    <button
                      onClick={() => handleOpenExemptionModal(player)}
                      title={isExempt ? 'Muafiyeti Düzenle / Kaldır' : 'Ödeme Muafiyeti Tanımla'}
                      className={`p-2 rounded-lg border text-xs font-bold transition-all active:scale-95 ${
                        isExempt
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                    </button>
                  )}

                  {/* Payment Status Toggle (Only if not exempt) */}
                  {!isExempt && isAdmin && (
                    <button
                      onClick={() => togglePayment(playerId, activeMatch.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        payment.isPaid
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/20'
                      }`}
                    >
                      {payment.isPaid ? 'Ödedi ✓' : 'Ödemedi'}
                    </button>
                  )}

                  {!isExempt && !isAdmin && (
                    <div
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                        payment.isPaid
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {payment.isPaid ? 'Ödedi ✓' : 'Ödemedi'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Kişisel Bakiye & Borç Takibi */}
      <div className="space-y-2 pt-2">
        <h3 className="text-xs font-bold text-slate-300 px-1">Kişisel Bakiye & Borç Takibi</h3>
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
          {players
            .filter(p => p.financialBalance !== 0)
            .map(p => (
              <div
                key={p.id}
                className="flex items-center justify-between py-2 border-b border-slate-800/80 last:border-b-0 text-xs"
              >
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="font-bold text-white">{p.name}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`font-mono font-bold ${
                      p.financialBalance < 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {p.financialBalance} ₺
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    {p.financialBalance < 0 ? 'Borç' : 'Alacak'}
                  </span>
                </div>
              </div>
            ))}

          {players.filter(p => p.financialBalance !== 0).length === 0 && (
            <p className="text-xs text-slate-500 text-center py-2">
              Kişisel borcu veya alacağı olan oyuncu bulunmuyor.
            </p>
          )}
        </div>
      </div>

      {/* PLAYER PAYMENT EXEMPTION CONFIG MODAL (Rule 2) */}
      {exemptionPlayer && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Ödeme Muafiyeti Yönetimi</h3>
                  <p className="text-[10px] text-slate-400">{exemptionPlayer.name}</p>
                </div>
              </div>
              <button
                onClick={() => setExemptionPlayer(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveExemption} className="space-y-3.5">
              {/* Toggle Exemption Active */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Muafiyet Durumu</span>
                  <span className="text-[10px] text-slate-400">
                    {exemptionActive
                      ? 'Bu oyuncu maç ücretinden muaf tutulur (0 ₺)'
                      : 'Muafiyet devre dışı (Normal ücret hesaplanır)'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setExemptionActive(!exemptionActive)}
                  className={`w-12 h-6 rounded-full transition-all relative p-0.5 ${
                    exemptionActive ? 'bg-emerald-600' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-all transform ${
                      exemptionActive ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {exemptionActive && (
                <>
                  {/* Scope Selector */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Muafiyet Kapsamı
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setExemptionScope('all')}
                        className={`py-2 px-1 rounded-xl font-bold border transition-all ${
                          exemptionScope === 'all'
                            ? 'bg-amber-600 border-amber-400 text-white shadow-sm'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        Tüm Maçlar
                      </button>
                      <button
                        type="button"
                        onClick={() => setExemptionScope('specific_matches')}
                        className={`py-2 px-1 rounded-xl font-bold border transition-all ${
                          exemptionScope === 'specific_matches'
                            ? 'bg-amber-600 border-amber-400 text-white shadow-sm'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        Belirli Maçlar
                      </button>
                      <button
                        type="button"
                        onClick={() => setExemptionScope('date_range')}
                        className={`py-2 px-1 rounded-xl font-bold border transition-all ${
                          exemptionScope === 'date_range'
                            ? 'bg-amber-600 border-amber-400 text-white shadow-sm'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        Tarih Aralığı
                      </button>
                    </div>
                  </div>

                  {/* Specific Matches Selector */}
                  {exemptionScope === 'specific_matches' && (
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block">
                        Kapsanan Maçları Seçin
                      </label>
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                        {[currentMatch, ...pastMatches].map(m => {
                          const isSel = exemptionSelectedMatches.includes(m.id);
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                if (isSel) {
                                  setExemptionSelectedMatches(
                                    exemptionSelectedMatches.filter(id => id !== m.id)
                                  );
                                } else {
                                  setExemptionSelectedMatches([...exemptionSelectedMatches, m.id]);
                                }
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                                isSel
                                  ? 'bg-emerald-600 border-emerald-400 text-white'
                                  : 'bg-slate-800 border-slate-700 text-slate-300'
                              }`}
                            >
                              {m.matchNumber}. Hafta ({m.date}) {isSel ? '✓' : ''}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Date Range Selector */}
                  {exemptionScope === 'date_range' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Başlangıç Tarihi</label>
                        <input
                          type="date"
                          value={exemptionStartDate}
                          onChange={e => setExemptionStartDate(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Bitiş Tarihi</label>
                        <input
                          type="date"
                          value={exemptionEndDate}
                          onChange={e => setExemptionEndDate(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* Reason Field */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Muafiyet Nedeni (İsteğe Bağlı)
                    </label>
                    <input
                      type="text"
                      value={exemptionReason}
                      onChange={e => setExemptionReason(e.target.value)}
                      placeholder="Örn: Halı saha organizatörü, kaleci jesti..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </>
              )}

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setExemptionPlayer(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs shadow-lg shadow-amber-600/30"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXEMPTION AUDIT LOGS MODAL */}
      {showExemptionAuditModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Muafiyet Değişiklik Geçmişi</h3>
                  <p className="text-[10px] text-slate-400">Finansal denetim ve muafiyet hareketleri</p>
                </div>
              </div>
              <button
                onClick={() => setShowExemptionAuditModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {getExemptionAuditLogs().length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  Henüz kaydedilmiş bir muafiyet hareketi bulunmuyor.
                </div>
              ) : (
                getExemptionAuditLogs().map(log => (
                  <div
                    key={log.id}
                    className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{log.playerName}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          log.action === 'granted'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {log.action === 'granted' ? 'Tanımlandı' : 'Kaldırıldı'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {log.performedBy} • {new Date(log.timestamp).toLocaleString('tr-TR')}
                    </div>
                    {log.reason && (
                      <div className="text-[10px] text-amber-300 italic">"{log.reason}"</div>
                    )}
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setShowExemptionAuditModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* EDIT BANK & IBAN MODAL */}
      {showEditBankModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Banka & IBAN Bilgileri</h3>
                  <p className="text-[10px] text-slate-400">Gruba gidecek ödeme hesap detayları</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditBankModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBankDetails} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Alıcı Adı Soyadı (Hesap Sahibi)
                </label>
                <input
                  type="text"
                  required
                  value={editReceiverValue}
                  onChange={e => setEditReceiverValue(e.target.value)}
                  placeholder="Örn: Hadi Alizadeh"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  IBAN Numarası
                </label>
                <input
                  type="text"
                  required
                  value={editIbanValue}
                  onChange={e => setEditIbanValue(e.target.value)}
                  placeholder="TR00 0000 0000 0000 0000 0000 00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEditBankModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR CODE PAYMENT MODALS */}
      {showGeneralQr && (
        <QrPaymentModal
          cost={costPerPlayer}
          matchNumber={currentMatch.matchNumber}
          onClose={() => setShowGeneralQr(false)}
        />
      )}

      {selectedPlayerForQr && (
        <QrPaymentModal
          player={selectedPlayerForQr}
          cost={costPerPlayer}
          matchNumber={currentMatch.matchNumber}
          onClose={() => setSelectedPlayerForQr(null)}
          onMarkPaid={() => togglePayment(selectedPlayerForQr.id, activeMatch.id)}
        />
      )}

      {/* WHATSAPP DEBT REMINDER MODAL */}
      {showDebtReminderModal && (
        <WhatsAppDebtReminderModal
          match={activeMatch}
          onClose={() => setShowDebtReminderModal(false)}
        />
      )}
    </div>
  );
};
