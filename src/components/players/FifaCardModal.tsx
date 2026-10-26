import React, { useRef, useState } from 'react';
import { X, Download, Share2, Sparkles, Check, Shield } from 'lucide-react';
import { toPng } from 'html-to-image';
import confetti from 'canvas-confetti';
import { Player } from '../../types';
import { useApp } from '../../context/AppContext';

interface FifaCardModalProps {
  player: Player;
  onClose: () => void;
}

export const FifaCardModal: React.FC<FifaCardModalProps> = ({ player, onClose }) => {
  const { currentMatch, isCouncil } = useApp();
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  // Position shorthand
  const posMap: Record<string, string> = {
    'Kaleci': 'KL',
    'Defans': 'DEF',
    'Orta saha': 'OS',
    'Kanat': 'KAN',
    'Forvet': 'FOR',
  };
  const posShort = posMap[player.primaryPosition] || 'OS';

  // OVR rating (scale 0-99)
  const ovr = Math.min(99, Math.round(player.finalScore * 10));

  // Compute 6 FUT attributes from player ratings (average across evaluators)
  const getAvgSkill = (key: string) => {
    const scores = Object.values(player.ratings)
      .map(r => r[key])
      .filter(s => s !== undefined && s > 0);
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 7.5;
    return Math.min(99, Math.round(avg * 10));
  };

  const pac = getAvgSkill('hizCeviklik');
  const sho = getAvgSkill('sut');
  const pas = getAvgSkill('pas');
  const dri = getAvgSkill('dribbling');
  const def = getAvgSkill('defansifKatki');
  const phy = Math.round((getAvgSkill('fizikselGuc') + getAvgSkill('dayaniklilik')) / 2);

  // Download card as PNG image
  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    setDownloading(true);

    try {
      // Trigger small confetti
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.6 },
      });

      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2, // High resolution
      });

      const link = document.createElement('a');
      link.download = `${player.name.replace(/\s+/g, '_')}_FIFA_Karti.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('FIFA card download error:', err);
      alert('Kart görseli indirilirken bir hata oluştu.');
    } finally {
      setDownloading(false);
    }
  };

  // WhatsApp share
  const handleShareWhatsApp = () => {
    const text = isCouncil
      ? `🏆 *${player.name.toUpperCase()} — FIFA KARTI* 🏆\n⭐ *OVR: ${ovr}* [${player.primaryPosition}]\n` +
        `⚡ HIZ: ${pac}  |  ⚽ ŞUT: ${sho}\n` +
        `🎯 PAS: ${pas}  |  🌀 DRI: ${dri}\n` +
        `🛡️ DEF: ${def}  |  💪 FİZ: ${phy}\n` +
        `🎖️ *Konsey Notu:* Olimpik Ortalama: ${player.trimmedMean}p • Sapma: ±${player.standardDeviation}`
      : `🏆 *${player.name.toUpperCase()} — RESMİ OYUNCU KARTI* 🏆\n⭐ Mevki: [${player.primaryPosition}]\n` +
        `⚽ Halı Saha Pro Ligi Aktif Kadro Oyuncusu`;

    navigator.clipboard.writeText(text);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 3000);
  };

  const isGold = ovr >= 78;
  const isJoker = player.isJoker;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      {/* Toast */}
      {copiedToast && (
        <div className="fixed top-12 left-1/2 transform -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2 rounded-full font-bold text-xs shadow-2xl flex items-center space-x-2 animate-in fade-in">
          <Check className="w-4 h-4" />
          <span>FIFA Kart Metni WhatsApp İçin Kopyalandı!</span>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-400">
            <Sparkles className="w-4 h-4" />
            <span>FIFA ULTIMATE TEAM KARTI</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FIFA CARD CONTAINER (Target for html-to-image) */}
        <div className="flex justify-center py-2">
          <div
            ref={cardRef}
            className={`w-[260px] h-[380px] rounded-2xl relative p-4 flex flex-col justify-between shadow-2xl border-2 transition-all select-none overflow-hidden ${
              isJoker
                ? 'bg-gradient-to-b from-purple-900 via-indigo-900 to-slate-950 border-purple-400/80 text-purple-100 shadow-purple-900/50'
                : isGold
                ? 'bg-gradient-to-b from-amber-600 via-amber-700 to-slate-950 border-amber-300 text-amber-100 shadow-amber-900/50'
                : 'bg-gradient-to-b from-slate-600 via-slate-700 to-slate-950 border-slate-400 text-slate-100 shadow-slate-900/50'
            }`}
          >
            {/* Card Background Pattern Sheen */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/20 via-transparent to-black/60 pointer-events-none" />

            {/* Top Row: OVR, Position, Flag, Crest */}
            <div className="relative z-10 flex justify-between items-start">
              {/* OVR & POS */}
              <div className="flex flex-col items-center">
                <span className="text-4xl font-black font-mono leading-none tracking-tighter drop-shadow-md">
                  {isCouncil ? ovr : 'PRO'}
                </span>
                <span className="text-sm font-black uppercase tracking-wider mt-0.5">
                  {posShort}
                </span>

                {/* Country Flag & Crest */}
                <div className="flex flex-col items-center space-y-1 mt-2">
                  <span className="text-lg leading-none" title="Türkiye">🇹🇷</span>
                  <div className="w-5 h-5 rounded-full bg-black/40 border border-white/20 flex items-center justify-center">
                    <Shield className="w-3 h-3 text-amber-400" />
                  </div>
                </div>
              </div>

              {/* Player Silhouette / Badge Graphic */}
              <div className="w-28 h-28 relative flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-white/10 to-white/30 border-2 border-white/30 flex items-center justify-center shadow-inner overflow-hidden">
                  <span className="text-4xl font-black opacity-80">
                    {player.name.charAt(0)}
                  </span>
                </div>
                {isJoker && (
                  <span className="absolute -top-1 -right-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-purple-500 text-white shadow-lg border border-purple-300">
                    Joker
                  </span>
                )}
                {player.id === currentMatch.mvpWinnerId && (
                  <span className="absolute -bottom-1 -left-1 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-black shadow-lg border border-yellow-200 flex items-center space-x-0.5">
                    <span>⭐ MVP</span>
                  </span>
                )}
              </div>
            </div>

            {/* Middle: Player Name */}
            <div className="relative z-10 text-center py-1 border-b border-t border-white/20 bg-black/25 rounded-md backdrop-blur-xs">
              <h3 className="text-base font-black tracking-tight uppercase truncate">
                {player.name}
              </h3>
            </div>

            {/* Bottom: 6 Stats Grid */}
            <div className="relative z-10 grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono font-bold px-2 py-1">
              <div className="flex justify-between items-center">
                <span className="text-[11px] opacity-75">HIZ</span>
                <span className="text-sm font-black">{isCouncil ? pac : 'PRO'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] opacity-75">DRİ</span>
                <span className="text-sm font-black">{isCouncil ? dri : 'PRO'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] opacity-75">ŞUT</span>
                <span className="text-sm font-black">{isCouncil ? sho : 'PRO'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] opacity-75">DEF</span>
                <span className="text-sm font-black">{isCouncil ? def : 'PRO'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] opacity-75">PAS</span>
                <span className="text-sm font-black">{isCouncil ? pas : 'PRO'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] opacity-75">FİZ</span>
                <span className="text-sm font-black">{isCouncil ? phy : 'PRO'}</span>
              </div>
            </div>

            {/* Footer watermark */}
            <div className="relative z-10 text-[9px] text-center opacity-60 font-semibold tracking-widest uppercase">
              Halı Saha Pro • Konsey Sistemi
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleDownloadImage}
            disabled={downloading}
            className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'Hazırlanıyor...' : 'Kartı İndir (PNG)'}</span>
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
          >
            <Share2 className="w-4 h-4" />
            <span>WhatsApp Paylaş</span>
          </button>
        </div>
      </div>
    </div>
  );
};
