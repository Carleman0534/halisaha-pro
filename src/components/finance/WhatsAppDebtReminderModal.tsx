import React, { useState } from 'react';
import {
  X,
  MessageCircle,
  Copy,
  Check,
  Share2,
  Wallet,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Send,
  Building2,
  Clock,
  Flame,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import { Match, Player } from '../../types';
import { calculateMatchFinancials, isPlayerExemptForMatch } from '../../utils/permissions';

interface WhatsAppDebtReminderModalProps {
  match: Match;
  onClose: () => void;
}

export const WhatsAppDebtReminderModal: React.FC<WhatsAppDebtReminderModalProps> = ({
  match,
  onClose,
}) => {
  const { playersMap } = useApp();
  const [selectedTemplate, setSelectedTemplate] = useState<'standard' | 'friendly' | 'urgent'>('standard');
  const [copiedToast, setCopiedToast] = useState(false);
  const [copiedPersonalToast, setCopiedPersonalToast] = useState<string | null>(null);

  // Bank & IBAN details
  const iban = localStorage.getItem('halisaha_iban') || 'TR33 0006 1005 1234 5678 9012 34';
  const receiverName = localStorage.getItem('halisaha_receiver') || 'Hadi Hoca';

  // Accurate financial calculation with exemption separation
  const financials = calculateMatchFinancials(match, playersMap);
  const {
    costPerPlayer,
    paidCount,
    unpaidPlayers,
    totalCollected,
    remainingDebt,
    effectiveTotalDue,
  } = financials;

  // Exempt players in this match
  const exemptPlayers = match.squad
    .map(id => playersMap[id])
    .filter(p => isPlayerExemptForMatch(p, match).isExempt);

  // Paid players in this match
  const paidPlayers = match.squad
    .map(id => playersMap[id])
    .filter(p => match.payments[p?.id]?.isPaid);

  // Generate WhatsApp text based on selected template
  const generateBroadcastText = (): string => {
    const venue = match.venueName || 'Olimpiyat Halı Saha Tesisleri';
    const time = match.time || '21:00 - 22:00';
    const matchNo = match.matchNumber || 44;

    if (selectedTemplate === 'standard') {
      let t = `⚽ *HALI SAHA ${matchNo}. HAFTA KASA & ÖDEME BİLGİSİ* ⚽\n`;
      t += `📍 *Saha:* ${venue} (${time})\n`;
      t += `💰 *Kişi Başı Pay:* ${costPerPlayer} ₺\n\n`;

      if (unpaidPlayers.length > 0) {
        t += `🔴 *Ödemesi Beklenenler (${unpaidPlayers.length} Kişi):*\n`;
        unpaidPlayers.forEach((p, idx) => {
          t += `${idx + 1}. ${p.name} — ${costPerPlayer} ₺\n`;
        });
      } else {
        t += `🎉 *Harika! Tüm oyuncuların ödemesi tamamlandı.*\n`;
      }

      if (paidPlayers.length > 0) {
        t += `\n✅ *Ödeyenler (${paidPlayers.length} Kişi):* ${paidPlayers.map(p => p.name).join(', ')}\n`;
      }

      if (exemptPlayers.length > 0) {
        t += `🛡️ *Muaf Oyuncular (${exemptPlayers.length} Kişi):* ${exemptPlayers.map(p => p.name).join(', ')} (Yükümlülük 0 ₺)\n`;
      }

      t += `\n📊 *Kasa Özeti:*\n`;
      t += `• Toplanan: ${totalCollected} ₺ / ${effectiveTotalDue} ₺\n`;
      t += `• Kalan Saha Borcu: ${remainingDebt} ₺\n\n`;

      t += `🏦 *IBAN:* ${iban}\n`;
      t += `👤 *Alıcı:* ${receiverName}\n`;
      t += `📝 *Açıklama:* [Ad Soyad] Halısaha\n\n`;
      t += `Ödeme yapan arkadaşlar dekontu gruba iletirse listeyi güncelleriz. Anlayışınız için teşekkürler! 🤝⚽`;
      return t;
    }

    if (selectedTemplate === 'friendly') {
      let t = `🔥 *BEYLER KRAMPONLARI HAZIRLADIK, SIRA KASADA!* 🔥\n`;
      t += `⚽ *${matchNo}. Hafta Karşılaşması* • ${venue}\n`;
      t += `Halı saha keyfimizin aksamaması için saha parasını kapatalım krallar 👑\n\n`;
      t += `💰 *Kişi Başı:* ${costPerPlayer} ₺\n\n`;

      if (unpaidPlayers.length > 0) {
        t += `🔴 *Henüz Göndermeyen Forvetler & Defanslar:*\n`;
        unpaidPlayers.forEach((p, idx) => {
          t += `👉 ${p.name}\n`;
        });
        t += `\n`;
      } else {
        t += `🏆 Herkes ödemesini yaptı, teşekkürler krallar!\n\n`;
      }

      if (paidPlayers.length > 0) {
        t += `✅ Hesaba erken atan ${paidPlayers.length} krala selamlar!\n`;
      }

      t += `\n🏦 *IBAN:* ${iban}\n`;
      t += `👤 *Alıcı:* ${receiverName}\n\n`;
      t += `Müsait olanlar maça kadar hallederse saha çıkışında hesap kovalamayalım 🙏⚽`;
      return t;
    }

    // Urgent template
    let t = `⏳ *DİKKAT: MAÇA AZ KALDI — SAHA ÜCRETİ KAPANIŞI* ⏳\n`;
    t += `Değerli arkadaşlar, bu akşamki maçımızın saha ücretinin işletmeye peşin aktarılması gerekmektedir.\n\n`;
    t += `💰 *Kişi Başı Ücret:* ${costPerPlayer} ₺\n`;
    t += `🔴 *Acil Ödeme Beklenenler:* ${unpaidPlayers.map(p => p.name).join(', ')}\n\n`;
    t += `🏦 *Hızlı Havale / FAST IBAN:* ${iban}\n`;
    t += `👤 *Alıcı:* ${receiverName}\n\n`;
    t += `Lütfen ödemeyi yaptıktan sonra dekontu gruba atınız. Teşekkür ederiz! ⚡`;
    return t;
  };

  const handleCopyText = () => {
    const text = generateBroadcastText();
    navigator.clipboard.writeText(text);
    setCopiedToast(true);
    try {
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.6 } });
    } catch {}
    setTimeout(() => setCopiedToast(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    const text = generateBroadcastText();
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleSendIndividualWhatsApp = (player: Player) => {
    const text = `Selam ${player.name}, ${match.matchNumber}. hafta halı saha maç ücreti payın ${costPerPlayer} ₺.\n🏦 IBAN: ${iban}\n👤 Alıcı: ${receiverName}\n📝 Açıklama: ${player.name} Halısaha\nMüsait olduğunda gönderebilirsen çok sevinirim, teşekkürler! 🤝⚽`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    setCopiedPersonalToast(player.name);
    setTimeout(() => setCopiedPersonalToast(null), 2500);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl bg-slate-900 border border-emerald-500/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* HEADER BAR */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/98 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-green-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-white text-sm sm:text-base flex items-center space-x-2">
                <span>WhatsApp Kasa & Borç Hatırlatıcı</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {match.matchNumber}. Hafta
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Tek tıkla gruba veya oyunculara özel ödeme hatırlatması gönderin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* QUICK FINANCIAL STATS ROW */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-semibold">Kişi Başı</span>
              <span className="text-sm font-black text-white font-mono">{costPerPlayer} ₺</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30">
              <span className="text-[10px] text-emerald-400 block font-semibold">Ödeyen ({paidCount})</span>
              <span className="text-sm font-black text-emerald-300 font-mono">{totalCollected} ₺</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-rose-950/30 border border-rose-500/30">
              <span className="text-[10px] text-rose-400 block font-semibold">Kalan Borç</span>
              <span className="text-sm font-black text-rose-300 font-mono">{remainingDebt} ₺</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-amber-950/30 border border-amber-500/30">
              <span className="text-[10px] text-amber-400 block font-semibold">Borçlu Sayısı</span>
              <span className="text-sm font-black text-amber-300 font-mono">{unpaidPlayers.length} Kişi</span>
            </div>
          </div>

          {/* TEMPLATE PICKER (3 MOD) */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              1. Hatırlatma Üslubu / Şablon Seçin:
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedTemplate('standard')}
                className={`p-2.5 rounded-2xl border text-left transition-all ${
                  selectedTemplate === 'standard'
                    ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-1 font-bold text-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Standart & Şeffaf</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                  Ödeyen/ödemeyen tüm detaylı liste
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTemplate('friendly')}
                className={`p-2.5 rounded-2xl border text-left transition-all ${
                  selectedTemplate === 'friendly'
                    ? 'bg-amber-500/20 border-amber-500 text-white shadow-md shadow-amber-500/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-1 font-bold text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Esprili & Samimi</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                  Grup içi samimi ve esprili ton
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTemplate('urgent')}
                className={`p-2.5 rounded-2xl border text-left transition-all ${
                  selectedTemplate === 'urgent'
                    ? 'bg-rose-500/20 border-rose-500 text-white shadow-md shadow-rose-500/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-1 font-bold text-xs">
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                  <span>Maç Öncesi Acil</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                  Son saatler için net uyarı
                </p>
              </button>
            </div>
          </div>

          {/* LIVE PREVIEW OF WHATSAPP MESSAGE */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>2. WhatsApp Metin Önizlemesi:</span>
              <span className="text-emerald-400 font-normal">Canlı oluşturuldu</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto selection:bg-emerald-500">
              {generateBroadcastText()}
            </div>
          </div>

          {/* UNPAID PLAYERS INDIVIDUAL DIRECT WHATSAPP ACTION */}
          {unpaidPlayers.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                3. Borçlu Oyunculara Tek Tıkla Özel Mesaj (DM):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                {unpaidPlayers.map(p => (
                  <div
                    key={p.id}
                    className="p-2 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="truncate pr-2">
                      <span className="font-bold text-white text-xs block truncate">{p.name}</span>
                      <span className="text-[10px] text-rose-400">{costPerPlayer} ₺ Borçlu</span>
                    </div>
                    <button
                      onClick={() => handleSendIndividualWhatsApp(p)}
                      title="Özelden WhatsApp Hatırlatması At"
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold text-[10px] transition-all shrink-0 active:scale-95"
                    >
                      <Send className="w-3 h-3" />
                      <span>WhatsApp At</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/98 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <div className="text-xs text-slate-400 font-medium truncate w-full sm:w-auto">
            {copiedToast ? (
              <span className="text-emerald-400 font-bold flex items-center space-x-1">
                <Check className="w-4 h-4" />
                <span>Metin Kopyalandı! Doğrudan WhatsApp grubuna yapıştırabilirsiniz.</span>
              </span>
            ) : copiedPersonalToast ? (
              <span className="text-emerald-400 font-bold">
                ✓ {copiedPersonalToast} için özel WhatsApp açıldı!
              </span>
            ) : (
              <span>Metni kopyalayın veya doğrudan WhatsApp'ı açın.</span>
            )}
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyText}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition-all active:scale-95"
            >
              <Copy className="w-4 h-4" />
              <span>Metni Kopyala</span>
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-black text-xs shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
            >
              <Share2 className="w-4 h-4" />
              <span>WhatsApp Grubuna At</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
