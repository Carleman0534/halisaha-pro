import React, { useState } from 'react';
import { X, QrCode, Copy, Check, MessageSquare, ShieldCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Player } from '../../types';

interface QrPaymentModalProps {
  player?: Player;
  cost: number;
  matchNumber: number;
  onClose: () => void;
  onMarkPaid?: () => void;
}

export const QrPaymentModal: React.FC<QrPaymentModalProps> = ({
  player,
  cost,
  matchNumber,
  onClose,
  onMarkPaid,
}) => {
  const [copiedToast, setCopiedToast] = useState(false);

  const receiverName = 'Hadi Hoca (Saha Sorumlusu)';
  const iban = 'TR33 0006 1005 1234 5678 9012 34';
  const playerName = player ? player.name : 'Halısaha Üyesi';
  const description = `${playerName} ${matchNumber}. Hafta Mac Ucreti`;

  // Standard TR Karekod / EPC QR Code payload
  const qrPayload = `BCD\n002\n1\nSCT\n\n${receiverName}\n${iban.replace(/\s+/g, '')}\nTRY${cost}.00\n\n\n${description}`;

  const handleCopyIban = () => {
    navigator.clipboard.writeText(iban);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2500);
  };

  const handleWhatsAppReceipt = () => {
    const text = `Selam Hadi Hoca, ${matchNumber}. hafta halı saha maç ücretim olan ${cost} ₺ ödemesini IBAN'ına gönderdim. Dekontu iletiyorum, listeyi güncelleyebilirsin. 👍`;
    navigator.clipboard.writeText(text);
    alert('WhatsApp dekont mesajı kopyalandı! WhatsApp konuşmasına yapıştırabilirsiniz.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      {/* Toast */}
      {copiedToast && (
        <div className="fixed top-12 left-1/2 transform -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2 rounded-full font-bold text-xs shadow-2xl flex items-center space-x-2 animate-in fade-in">
          <Check className="w-4 h-4" />
          <span>IBAN Panoya Kopyalandı!</span>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Banka Karekodu ile Öde</h3>
              <p className="text-[10px] text-slate-400">FAST / Kolay Adres Destekli</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-inner">
          <QRCodeSVG
            value={qrPayload}
            size={180}
            level="H"
            includeMargin={true}
          />
          <span className="text-[10px] font-bold text-slate-500 mt-2">
            Banka uygulamasından "Karekod ile Öde"yi açıp okutun
          </span>
        </div>

        {/* Payment Details */}
        <div className="space-y-2 text-xs bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Ödenecek Tutar:</span>
            <span className="text-base font-black text-emerald-400 font-mono">{cost} ₺</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400">Alıcı:</span>
            <span className="font-semibold text-white">{receiverName}</span>
          </div>

          <div className="flex justify-between items-center pt-1 border-t border-slate-700/50">
            <span className="text-slate-400 font-mono text-[11px] truncate max-w-[170px]">{iban}</span>
            <button
              onClick={handleCopyIban}
              className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-emerald-400 rounded-md font-bold text-[10px] flex items-center space-x-1"
            >
              <Copy className="w-3 h-3" />
              <span>Kopyala</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleWhatsAppReceipt}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
          >
            <MessageSquare className="w-4 h-4" />
            <span>WhatsApp Dekont Metni Kopyala</span>
          </button>

          {onMarkPaid && (
            <button
              onClick={() => {
                onMarkPaid();
                onClose();
              }}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 flex items-center justify-center space-x-1"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Ödeme Yapıldı Olarak İşaretle</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
