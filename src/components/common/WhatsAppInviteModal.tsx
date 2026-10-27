import React, { useState, useMemo } from 'react';
import {
  MessageCircle,
  Copy,
  ExternalLink,
  Check,
  X,
  Sparkles,
  Send,
  Calendar,
  Clock,
  MapPin,
  Flame,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import { isPlayerExemptForMatch } from '../../utils/permissions';
import { getMatchMapsUrl } from '../../services/firebase';
import { Player } from '../../types';

interface WhatsAppInviteModalProps {
  player: Player | null;
  onClose: () => void;
}

export const WhatsAppInviteModal: React.FC<WhatsAppInviteModalProps> = ({ player, onClose }) => {
  const { currentMatch, players } = useApp();

  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(player?.id || players[0]?.id || '');
  const [templateType, setTemplateType] = useState<'onestep' | 'short' | 'oneday' | 'urgent'>('onestep');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const activePlayer = useMemo(() => {
    return players.find(p => p.id === selectedPlayerId) || player || players[0];
  }, [players, selectedPlayerId, player]);

  // Extract day name and time
  const { dayName, timeOnly, fullDate } = useMemo(() => {
    try {
      const d = new Date(currentMatch.date);
      const day = d.toLocaleDateString('tr-TR', { weekday: 'long' });
      const full = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
      const time = currentMatch.time.split('-')[0].trim();
      return { dayName: day, timeOnly: time, fullDate: full };
    } catch {
      return { dayName: 'Çarşamba', timeOnly: '21:00', fullDate: currentMatch.date };
    }
  }, [currentMatch.date, currentMatch.time]);

  // Generate 1-tap participation links for this active player
  const { linkYes, linkNo, linkKadro } = useMemo(() => {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      const base = `${origin}${path}`;
      const pId = activePlayer?.id || '';
      return {
        linkYes: `${base}?oyuncu=${pId}&durum=geliyorum`,
        linkNo: `${base}?oyuncu=${pId}&durum=gelmiyorum`,
        linkKadro: `${base}?oyuncu=${pId}`,
      };
    } catch {
      return { linkYes: '', linkNo: '', linkKadro: '' };
    }
  }, [activePlayer]);

  // Check if player has payment exemption
  const exemption = isPlayerExemptForMatch(activePlayer, currentMatch);
  const feeText = exemption.isExempt
    ? '0 ₺ (🛡️ Sen Muafsın)'
    : `${currentMatch.costPerPlayer} ₺`;

  const mapsUrl = useMemo(() => getMatchMapsUrl(currentMatch), [currentMatch]);

  // Generated templates with 1-tap links
  const generatedText = useMemo(() => {
    const name = activePlayer ? activePlayer.name : 'dostum';
    const pos = activePlayer ? activePlayer.primaryPosition : 'oyuncu';

    // 1. One-step direct response invite (RECOMMENDED)
    if (templateType === 'onestep') {
      return `⚽ *HALI SAHA PRO — MAÇ DAVETİ* ⚽

Selam *${name}*, ${dayName} günü saat ${timeOnly}'de maç kadrosuna çağrıldın! 🔥
📍 *Saha:* ${currentMatch.venueName}
🗺️ *Konum (Google Maps):* ${mapsUrl}
💰 *Ücret:* ${feeText}

Lütfen katılım durumunu aşağıdaki linke dokunarak tek tıkla bildir:

✅ *GELİYORUM:*
${linkYes}

❌ *GELMİYORUM:*
${linkNo}

📋 *Kadro ve Detayları Gör:*
${linkKadro}`;
    }

    // 2. 1 day countdown reminder
    if (templateType === 'oneday') {
      return `⏰ *YARIN HALI SAHA MAÇI VAR!* ⏰

Selam *${name}*, yarın saat ${timeOnly}'de halı saha maçımız var, unutmadın değil mi? ⚽🔥
📍 *Saha:* ${currentMatch.venueName}
🗺️ *Konum (Google Maps):* ${mapsUrl}
💰 *Ücret:* ${feeText}

Kadro netleştiriliyor. Katılımını tek tıkla onayla:
✅ *GELİYORUM:* ${linkYes}
❌ *GELMİYORUM:* ${linkNo}`;
    }

    // 3. Urgent substitute call
    if (templateType === 'urgent') {
      return `🚨 *ACİL YEDEK OYUNCU ÇAĞRISI* 🚨

Selam *${name}*, ${dayName} günü saat ${timeOnly}'deki maçımızda acil ${pos} eksiğimiz var! ⚽🔥
Kurtarıcımız olursun! Kadroya girmek için hemen tıkla:

✅ *GELİYORUM (KADROYA GİR):* ${linkYes}
❌ *GELEMİYORUM:* ${linkNo}

📍 *Saha:* ${currentMatch.venueName}
🗺️ *Konum (Google Maps):* ${mapsUrl}`;
    }

    // 4. Short and sweet
    return `Selam *${name}*, ${dayName} günü saat ${timeOnly}'de maçımız var, gelmek ister misin? ⚽🔥
📍 Saha: ${currentMatch.venueName}
🗺️ Konum: ${mapsUrl}
Tek tıkla onayla: ${linkYes}`;
  }, [templateType, activePlayer, dayName, timeOnly, feeText, linkYes, linkNo, linkKadro, currentMatch, mapsUrl]);

  // Handle active message (custom or generated)
  const messageToSend = customMessage.trim() ? customMessage : generatedText;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageToSend);
    setCopied(true);
    confetti({ particleCount: 25, spread: 50, origin: { y: 0.8 } });
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendWhatsApp = () => {
    const encoded = encodeURIComponent(messageToSend);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-4 sm:p-5 shadow-2xl space-y-3.5 max-h-[88vh] overflow-y-auto my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">WhatsApp Tek Tıkla Katılım Daveti</h3>
              <p className="text-[10px] text-slate-400">Oyuncuya özel doğrudan yanıt linkli mesaj</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Player Selector */}
        <div>
          <label className="text-[11px] font-semibold text-slate-300 block mb-1">Davet Edilecek Oyuncu:</label>
          <select
            value={selectedPlayerId}
            onChange={e => {
              setSelectedPlayerId(e.target.value);
              setCustomMessage('');
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            {players.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.primaryPosition})
              </option>
            ))}
          </select>
        </div>

        {/* Template Style Selector */}
        <div>
          <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">Mesaj Şablonu:</label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => {
                setTemplateType('onestep');
                setCustomMessage('');
              }}
              className={`py-2 px-2 rounded-xl text-center text-xs font-bold transition-all border flex items-center justify-center space-x-1 ${
                templateType === 'onestep'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 border-emerald-300 shadow-md'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>🚀 1-Tıkla Katılım</span>
            </button>

            <button
              onClick={() => {
                setTemplateType('oneday');
                setCustomMessage('');
              }}
              className={`py-2 px-2 rounded-xl text-center text-xs font-bold transition-all border ${
                templateType === 'oneday'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              ⏰ 1 Gün Hatırlatma
            </button>

            <button
              onClick={() => {
                setTemplateType('urgent');
                setCustomMessage('');
              }}
              className={`py-2 px-2 rounded-xl text-center text-xs font-bold transition-all border ${
                templateType === 'urgent'
                  ? 'bg-rose-500 text-white border-rose-400 shadow-md'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              🚨 Acil Yedek
            </button>

            <button
              onClick={() => {
                setTemplateType('short');
                setCustomMessage('');
              }}
              className={`py-2 px-2 rounded-xl text-center text-xs font-bold transition-all border ${
                templateType === 'short'
                  ? 'bg-blue-500 text-white border-blue-400 shadow-md'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              ⚡ Sade / Kısa
            </button>
          </div>
        </div>

        {/* Message Preview & Edit Textarea */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Mesaj Önizleme (Düzenleyebilirsiniz):</span>
            <span className="text-[10px] text-emerald-400 font-semibold">{dayName} • {timeOnly}</span>
          </div>

          <textarea
            rows={6}
            value={messageToSend}
            onChange={e => setCustomMessage(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono leading-relaxed select-all resize-none"
          />
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleCopy}
            className="flex items-center justify-center space-x-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-bold">Kopyalandı!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Metni Kopyala</span>
              </>
            )}
          </button>

          <button
            onClick={handleSendWhatsApp}
            className="flex items-center justify-center space-x-1.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>WhatsApp'ta Aç</span>
          </button>
        </div>
      </div>
    </div>
  );
};
