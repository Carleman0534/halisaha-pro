import React, { useRef, useState } from 'react';
import {
  X,
  Camera,
  Download,
  Share2,
  Copy,
  Check,
  Sparkles,
  Shield,
  Layers,
  Calendar,
  Clock,
  MapPin,
  Trophy,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import { Match, Player } from '../../types';
import { generateWhatsAppShareText } from '../../utils/calculations';

interface SquadVisualCardModalProps {
  match: Match;
  onClose: () => void;
}

export const SquadVisualCardModal: React.FC<SquadVisualCardModalProps> = ({
  match,
  onClose,
}) => {
  const { playersMap, isCouncil } = useApp();
  const posterRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [copiedTextToast, setCopiedTextToast] = useState(false);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState(false);
  const [showPowerRatings, setShowPowerRatings] = useState(false);

  const teamAFormation = match.teamA?.formation || '3-2-1';
  const teamBFormation = match.teamB?.formation || '3-2-1';

  // Group players by position
  const getPlayersByRole = (teamKey: 'teamA' | 'teamB', role: string) => {
    const team = match[teamKey];
    if (!team || !team.players) return [];
    return team.players.filter(tp => {
      const pos = tp.position?.toLowerCase() || '';
      if (role === 'Kaleci') return pos.includes('kale') || pos.includes('gk');
      if (role === 'Defans') return pos.includes('def') || pos.includes('stoper') || pos.includes('bek');
      if (role === 'Orta Saha') return pos.includes('orta') || pos.includes('kanat') || pos.includes('mid');
      if (role === 'Forvet') return pos.includes('forvet') || pos.includes('santr') || pos.includes('striker');
      return false;
    });
  };

  // Generate PNG Blob
  const generatePngBlob = async (): Promise<{ dataUrl: string; file: File } | null> => {
    if (!posterRef.current) return null;
    const dataUrl = await toPng(posterRef.current, {
      cacheBust: true,
      pixelRatio: 2, // 2x Retina Quality
      backgroundColor: '#020617',
    });
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const fileName = `Halisaha_Kadro_${match.matchNumber}_Hafta.png`;
    const file = new File([blob], fileName, { type: 'image/png' });
    return { dataUrl, file };
  };

  // 1-Tap Download PNG
  const handleDownloadImage = async () => {
    setIsExporting(true);
    try {
      const result = await generatePngBlob();
      if (!result) return;

      const link = document.createElement('a');
      link.download = `Halisaha_Kadro_${match.matchNumber}_Hafta.png`;
      link.href = result.dataUrl;
      link.click();

      setDownloadSuccessToast(true);
      try {
        confetti({ particleCount: 35, spread: 60, origin: { y: 0.6 } });
      } catch {}
      setTimeout(() => setDownloadSuccessToast(false), 3000);
    } catch (err) {
      console.error('Image export failed:', err);
      alert('Resim oluşturulurken bir hata oluştu.');
    } finally {
      setIsExporting(false);
    }
  };

  // 1-Tap Share to WhatsApp (Direct file share on mobile / fallback to download)
  const handleShareToWhatsApp = async () => {
    setIsExporting(true);
    try {
      const result = await generatePngBlob();
      if (!result) return;

      // Check if native file sharing is supported (Mobile Safari, Mobile Chrome)
      if (navigator.canShare && navigator.canShare({ files: [result.file] })) {
        await navigator.share({
          title: `⚽ Halı Saha ${match.matchNumber}. Hafta Kadro Dizilimi`,
          text: `⚽ *${match.venueName} | ${match.time}*\n${match.teamA.name} vs ${match.teamB.name} Kadroları!`,
          files: [result.file],
        });
        try {
          confetti({ particleCount: 40, spread: 70, origin: { y: 0.5 } });
        } catch {}
        return;
      }

      // If web share with file not available (e.g. desktop browser), download and open WhatsApp
      const link = document.createElement('a');
      link.download = `Halisaha_Kadro_${match.matchNumber}_Hafta.png`;
      link.href = result.dataUrl;
      link.click();

      const text = generateWhatsAppShareText(match, playersMap);
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
      setDownloadSuccessToast(true);
      setTimeout(() => setDownloadSuccessToast(false), 3000);
    } catch (err) {
      console.warn('Share error or canceled:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Copy lineup text
  const handleCopyTextLineup = () => {
    const text = generateWhatsAppShareText(match, playersMap);
    navigator.clipboard.writeText(text);
    setCopiedTextToast(true);
    setTimeout(() => setCopiedTextToast(false), 2500);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-xl bg-slate-900 border border-emerald-500/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* HEADER BAR */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-slate-900/98 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-white text-sm sm:text-base flex items-center space-x-2">
                <span>Görsel Kadro Kartı (WhatsApp)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {match.matchNumber}. Hafta
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Yeşil saha üzerinde diziliş görselini WhatsApp'ta paylaşın veya indirin
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

        {/* SCROLLABLE PREVIEW CONTAINER */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-3 flex flex-col items-center">
          {/* Council options */}
          {isCouncil && (
            <div className="w-full flex items-center justify-between px-2 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-400">
              <span>Gizlilik: Oyuncu Güç Puanlarını Görsele Ekle</span>
              <button
                type="button"
                onClick={() => setShowPowerRatings(!showPowerRatings)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  showPowerRatings
                    ? 'bg-amber-500 text-black border border-amber-400'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {showPowerRatings ? 'Puanlar Açık' : 'Puanlar Gizli (Önerilen)'}
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* THE CAPTURABLE MATCH DAY POSTER CONTAINER (toPng targets this ref)       */}
          {/* ========================================================================= */}
          <div
            ref={posterRef}
            className="w-full max-w-md bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 rounded-3xl border-2 border-emerald-500/40 shadow-2xl flex flex-col space-y-3 select-none text-white"
          >
            {/* POSTER HEADER: MATCH DETAILS */}
            <div className="text-center space-y-1 pb-2 border-b border-emerald-500/30">
              <div className="flex items-center justify-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono text-[10px] uppercase font-black tracking-widest text-emerald-400">
                  HALISAHA PRO • RESMİ MAÇ GÜNÜ KADROSU
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>

              <h2 className="text-base sm:text-lg font-black tracking-tight text-white uppercase drop-shadow-md">
                {match.matchNumber}. Hafta Karşılaşması
              </h2>

              <div className="flex items-center justify-center space-x-3 text-[10px] text-slate-300 font-medium">
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3 text-emerald-400" />
                  <span>{match.date}</span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>{match.time}</span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3 h-3 text-rose-400" />
                  <span className="truncate max-w-[120px]">{match.venueName}</span>
                </span>
              </div>
            </div>

            {/* THE TACTICAL GREEN PITCH */}
            <div
              className="relative w-full aspect-[9/13] rounded-2xl border-2 border-white/20 overflow-hidden shadow-inner p-2.5 flex flex-col justify-between"
              style={{
                backgroundImage: `radial-gradient(ellipse at center, rgba(16, 185, 129, 0.3) 0%, rgba(6, 78, 59, 0.95) 100%), repeating-linear-gradient(0deg, rgba(0,0,0,0.18), rgba(0,0,0,0.18) 32px, transparent 32px, transparent 64px)`,
              }}
            >
              {/* Pitch Markings */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-b border-white/25 z-0" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-white/25 z-0" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/50 z-0" />

              {/* Team A Penalty Box */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-14 border-b border-x border-white/25 rounded-b-xl z-0" />
              {/* Team B Penalty Box */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-36 h-14 border-t border-x border-white/25 rounded-t-xl z-0" />

              {/* ========================================================= */}
              {/* TEAM A (RED) — TOP HALF                                   */}
              {/* ========================================================= */}
              <div className="relative z-10 flex flex-col justify-between h-[48%]">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[9px] font-black uppercase text-rose-200 bg-rose-950/80 px-2 py-0.5 rounded-full border border-rose-500/50 shadow-sm">
                    🔴 {match.teamA.name} ({teamAFormation})
                  </span>
                  {showPowerRatings && isCouncil && (
                    <span className="text-[9px] font-bold text-rose-300 bg-black/60 px-2 py-0.5 rounded-full">
                      {match.teamA.totalPower} P
                    </span>
                  )}
                </div>

                {/* Team A Players by Rows */}
                <div className="flex-1 flex flex-col justify-around py-0.5">
                  {/* GK */}
                  <div className="flex justify-center">
                    {getPlayersByRole('teamA', 'Kaleci').map(tp => (
                      <PosterPlayerChip
                        key={tp.playerId}
                        player={playersMap[tp.playerId]}
                        position="KL"
                        teamColor="red"
                      />
                    ))}
                  </div>
                  {/* DEF */}
                  <div className="flex justify-around px-2">
                    {getPlayersByRole('teamA', 'Defans').map(tp => (
                      <PosterPlayerChip
                        key={tp.playerId}
                        player={playersMap[tp.playerId]}
                        position="DEF"
                        teamColor="red"
                      />
                    ))}
                  </div>
                  {/* MID */}
                  <div className="flex justify-around px-4">
                    {getPlayersByRole('teamA', 'Orta Saha').map(tp => (
                      <PosterPlayerChip
                        key={tp.playerId}
                        player={playersMap[tp.playerId]}
                        position="ORT"
                        teamColor="red"
                      />
                    ))}
                  </div>
                  {/* FWD */}
                  <div className="flex justify-center space-x-3">
                    {getPlayersByRole('teamA', 'Forvet').map(tp => (
                      <PosterPlayerChip
                        key={tp.playerId}
                        player={playersMap[tp.playerId]}
                        position="FOR"
                        teamColor="red"
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* ========================================================= */}
              {/* TEAM B (BLUE) — BOTTOM HALF                                */}
              {/* ========================================================= */}
              <div className="relative z-10 flex flex-col justify-between h-[48%]">
                {/* Team B Players by Rows (Inverted order: FWD -> MID -> DEF -> GK) */}
                <div className="flex-1 flex flex-col justify-around py-0.5">
                  {/* FWD */}
                  <div className="flex justify-center space-x-3">
                    {getPlayersByRole('teamB', 'Forvet').map(tp => (
                      <PosterPlayerChip
                        key={tp.playerId}
                        player={playersMap[tp.playerId]}
                        position="FOR"
                        teamColor="blue"
                      />
                    ))}
                  </div>
                  {/* MID */}
                  <div className="flex justify-around px-4">
                    {getPlayersByRole('teamB', 'Orta Saha').map(tp => (
                      <PosterPlayerChip
                        key={tp.playerId}
                        player={playersMap[tp.playerId]}
                        position="ORT"
                        teamColor="blue"
                      />
                    ))}
                  </div>
                  {/* DEF */}
                  <div className="flex justify-around px-2">
                    {getPlayersByRole('teamB', 'Defans').map(tp => (
                      <PosterPlayerChip
                        key={tp.playerId}
                        player={playersMap[tp.playerId]}
                        position="DEF"
                        teamColor="blue"
                      />
                    ))}
                  </div>
                  {/* GK */}
                  <div className="flex justify-center">
                    {getPlayersByRole('teamB', 'Kaleci').map(tp => (
                      <PosterPlayerChip
                        key={tp.playerId}
                        player={playersMap[tp.playerId]}
                        position="KL"
                        teamColor="blue"
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between px-1">
                  <span className="text-[9px] font-black uppercase text-blue-200 bg-blue-950/80 px-2 py-0.5 rounded-full border border-blue-500/50 shadow-sm">
                    🔵 {match.teamB.name} ({teamBFormation})
                  </span>
                  {showPowerRatings && isCouncil && (
                    <span className="text-[9px] font-bold text-blue-300 bg-black/60 px-2 py-0.5 rounded-full">
                      {match.teamB.totalPower} P
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* POSTER FOOTER */}
            <div className="text-center pt-1 border-t border-emerald-500/30 flex items-center justify-between text-[9px] text-slate-400">
              <span className="font-bold text-emerald-400">Halı Saha Pro Konsey Sistemi</span>
              <span>Fair-Play & Dostluk Kazansın 🏆</span>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-900/98 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 text-xs">
          <div className="text-slate-400 font-medium truncate w-full sm:w-auto">
            {downloadSuccessToast ? (
              <span className="text-emerald-400 font-bold flex items-center space-x-1">
                <Check className="w-4 h-4" />
                <span>Kadro görseli başarıyla oluşturuldu!</span>
              </span>
            ) : copiedTextToast ? (
              <span className="text-emerald-400 font-bold">
                ✓ Kadro metni panoya kopyalandı!
              </span>
            ) : (
              <span>Görseli WhatsApp'ta paylaşabilir veya galeriye indirebilirsiniz.</span>
            )}
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyTextLineup}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold active:scale-95 transition-all"
              title="Kadro Metnini Kopyala"
            >
              <Copy className="w-4 h-4" />
              <span>Metin</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isExporting}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold active:scale-95 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Hazırlanıyor...' : 'Resmi İndir'}</span>
            </button>

            <button
              type="button"
              onClick={handleShareToWhatsApp}
              disabled={isExporting}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-black shadow-lg shadow-emerald-600/30 active:scale-95 transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>WhatsApp'ta Paylaş</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// MINI PLAYER CHIP FOR THE POSTER
interface PosterPlayerChipProps {
  player?: Player;
  position: string;
  teamColor: 'red' | 'blue';
}

const PosterPlayerChip: React.FC<PosterPlayerChipProps> = ({
  player,
  position,
  teamColor,
}) => {
  if (!player) return null;

  const isRed = teamColor === 'red';

  return (
    <div className="flex flex-col items-center justify-center m-0.5 select-none">
      <div
        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-black text-[9px] sm:text-[10px] text-white shadow-md border ${
          isRed
            ? 'bg-gradient-to-tr from-rose-700 to-rose-500 border-rose-300 shadow-rose-950/80'
            : 'bg-gradient-to-tr from-blue-700 to-blue-500 border-blue-300 shadow-blue-950/80'
        }`}
      >
        <span>{position}</span>
      </div>
      <span className="text-[9px] sm:text-[10px] font-bold text-white px-1.5 py-0.2 mt-0.5 rounded bg-black/75 border border-white/20 truncate max-w-[75px] shadow-sm text-center">
        {player.name.split(' ')[0]}
      </span>
    </div>
  );
};
