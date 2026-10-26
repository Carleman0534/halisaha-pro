import React, { useState } from 'react';
import {
  Wallet,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  User,
  QrCode,
  Share2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Player } from '../../types';
import { QrPaymentModal } from './QrPaymentModal';

export const FinanceManager: React.FC = () => {
  const { currentMatch, players, playersMap, togglePayment } = useApp();

  const [copiedIbanToast, setCopiedIbanToast] = useState(false);
  const [copiedDebtToast, setCopiedDebtToast] = useState(false);

  const [selectedPlayerForQr, setSelectedPlayerForQr] = useState<Player | null>(null);
  const [showGeneralQr, setShowGeneralQr] = useState(false);

  // Financial calculations
  const totalCost = currentMatch.totalPitchCost;
  const costPerPlayer = currentMatch.costPerPlayer;

  const paidCount = currentMatch.squad.filter(id => currentMatch.payments[id]?.isPaid).length;
  const totalCollected = paidCount * costPerPlayer;
  const remainingDebt = Math.max(0, totalCost - totalCollected);
  const progressPercent = Math.min(100, Math.round((totalCollected / totalCost) * 100));

  const sampleIban = 'TR33 0006 1005 1234 5678 9012 34';
  const receiverName = 'Hadi Hoca';

  // Copy standard IBAN
  const handleCopyIban = () => {
    navigator.clipboard.writeText(
      `⚽ HALI SAHA MAÇ ÖDEMESİ\n💰 Kişi Başı: ${costPerPlayer} ₺\n🏦 IBAN: ${sampleIban}\n👤 Alıcı: ${receiverName}\n📝 Açıklama: Ad Soyad Halısaha`
    );
    setCopiedIbanToast(true);
    setTimeout(() => setCopiedIbanToast(false), 2500);
  };

  // WhatsApp Debt Reminder Broadcast
  const handleCopyDebtBroadcast = () => {
    const unpaidPlayers = currentMatch.squad
      .filter(id => !currentMatch.payments[id]?.isPaid)
      .map(id => playersMap[id])
      .filter(Boolean);

    let text = `⚽ *HALI SAHA ${currentMatch.matchNumber}. HAFTA ÖDEME HATIRLATMASI* ⚽\n`;
    text += `Değerli arkadaşlar, saha ücretinin kapatılması için ödemesi beklenen üyelerimiz:\n\n`;

    if (unpaidPlayers.length > 0) {
      text += `🔴 *Ödeme Bekleyenler (Kişi Başı: ${costPerPlayer} ₺):*\n`;
      unpaidPlayers.forEach((p, idx) => {
        text += `${idx + 1}. ${p.name} — ${costPerPlayer} ₺\n`;
      });
    } else {
      text += `✅ *Harika! Tüm oyuncuların ödemesi tamamlandı.*\n`;
    }

    text += `\n💰 *Kalan Toplam:* ${remainingDebt} ₺\n`;
    text += `🏦 *IBAN:* ${sampleIban}\n`;
    text += `👤 *Alıcı:* ${receiverName}\n`;
    text += `📝 *Açıklama:* Ad Soyad Halısaha\n\n`;
    text += `Ödeme yapan arkadaşlar dekontu gruba iletirse listeyi güncelleriz. Anlayışınız için teşekkürler! 🤝`;

    navigator.clipboard.writeText(text);
    setCopiedDebtToast(true);
    setTimeout(() => setCopiedDebtToast(false), 3000);
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

      {/* Financial Overview Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/60 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Maç Kasa Özeti</h2>
              <p className="text-xs text-slate-400">{currentMatch.matchNumber}. Hafta Masraf & Tahsilat</p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
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

        {/* 3 Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Saha Ücreti</span>
            <span className="text-sm font-black text-white font-mono">{totalCost} ₺</span>
            <span className="text-[10px] text-slate-500 block">Kişi: {costPerPlayer} ₺</span>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
            <span className="text-[10px] text-emerald-400 uppercase font-bold block">Toplanan</span>
            <span className="text-sm font-black text-emerald-400 font-mono">{totalCollected} ₺</span>
            <span className="text-[10px] text-slate-500 block">{paidCount} Kişi</span>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
            <span className="text-[10px] text-rose-400 uppercase font-bold block">Kalan Borç</span>
            <span className="text-sm font-black text-rose-400 font-mono">{remainingDebt} ₺</span>
            <span className="text-[10px] text-slate-500 block">{currentMatch.squad.length - paidCount} Kişi</span>
          </div>
        </div>

        {/* Collection Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Tahsilat Oranı</span>
            <span className="font-bold text-white">%{progressPercent}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progressPercent === 100 ? 'bg-emerald-500' : 'bg-emerald-600'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Top Action: WhatsApp Debt List Broadcast Button */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => setShowGeneralQr(true)}
            className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs transition-all active:scale-95"
          >
            <QrCode className="w-4 h-4 text-emerald-400" />
            <span>Karekod ile Öde</span>
          </button>

          <button
            onClick={handleCopyDebtBroadcast}
            className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
          >
            <Share2 className="w-4 h-4" />
            <span>Borç Listesi (WP)</span>
          </button>
        </div>
      </div>

      {/* Squad Payment Toggles */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-300 px-1">
          <h3 className="font-bold">Bu Haftanın Oyuncu Ödemeleri</h3>
          <span className="text-slate-400">Tek dokunuşla işaretleyin</span>
        </div>

        <div className="space-y-1.5">
          {currentMatch.squad.map(playerId => {
            const player = playersMap[playerId];
            if (!player) return null;
            const payment = currentMatch.payments[playerId] || { isPaid: false, amount: costPerPlayer };

            return (
              <div
                key={playerId}
                onClick={() => togglePayment(playerId)}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  payment.isPaid
                    ? 'bg-slate-900/60 border-slate-800'
                    : 'bg-rose-950/20 border-rose-900/40 hover:border-rose-700/60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                      payment.isPaid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {payment.isPaid ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>

                  <div>
                    <span className="text-sm font-bold text-white block">{player.name}</span>
                    <span className="text-xs text-slate-400 font-mono">
                      Pay: {costPerPlayer} ₺ •{' '}
                      {payment.isPaid ? (
                        <span className="text-emerald-400 font-semibold">Ödendi</span>
                      ) : (
                        <span className="text-rose-400 font-semibold">Ödeme Bekliyor</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Right Buttons: Personal QR Code & Toggle */}
                <div className="flex items-center space-x-1.5" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setSelectedPlayerForQr(player)}
                    title={`${player.name} için Banka Karekodu Aç`}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 text-xs transition-all active:scale-95"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => togglePayment(playerId)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      payment.isPaid
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/20'
                    }`}
                  >
                    {payment.isPaid ? 'Ödedi ✓' : 'Ödemedi'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Overall Player Debt & Credit Ledger */}
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
          onMarkPaid={() => togglePayment(selectedPlayerForQr.id)}
        />
      )}
    </div>
  );
};
