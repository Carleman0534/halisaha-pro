import React, { useState } from 'react';
import { Trophy, Star, Heart, Check, X, Share2, Award, Calendar, MapPin, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Match, Player } from '../../types';
import { useApp } from '../../context/AppContext';

interface MatchResultsModalProps {
  onClose: () => void;
}

export const MatchResultsModal: React.FC<MatchResultsModalProps> = ({ onClose }) => {
  const { currentMatch, playersMap, setMatchScores, voteMvp } = useApp();

  const [scoreA, setScoreA] = useState<number>(currentMatch.teamA.score ?? 7);
  const [scoreB, setScoreB] = useState<number>(currentMatch.teamB.score ?? 6);

  const squadPlayers = currentMatch.squad
    .map(id => playersMap[id])
    .filter((p): p is Player => Boolean(p));

  const [selectedMvpId, setSelectedMvpId] = useState<string>(
    currentMatch.mvpWinnerId || squadPlayers[0]?.id || ''
  );
  const [selectedFairPlayId, setSelectedFairPlayId] = useState<string>(
    squadPlayers[1]?.id || squadPlayers[0]?.id || ''
  );
  const [matchNotes, setMatchNotes] = useState<string>('');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const mvpPlayer = playersMap[selectedMvpId];
  const fairPlayPlayer = playersMap[selectedFairPlayId];

  const dateFormatted = new Date(currentMatch.date).toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const generateMatchSummaryText = () => {
    let text = `🏆 *HALI SAHA MAÇ SONUCU & HAFTANIN ENLERİ* 🏆\n`;
    text += `📅 ${dateFormatted} | ${currentMatch.time}\n`;
    text += `📍 ${currentMatch.venueName} (${currentMatch.pitchNo})\n\n`;

    text += `⚽ *SKOR TABLOSU:*\n`;
    text += `🔴 ${currentMatch.teamA.name}: *${scoreA}*\n`;
    text += `🔵 ${currentMatch.teamB.name}: *${scoreB}*\n\n`;

    if (scoreA > scoreB) {
      text += `🎉 *Kazanan:* ${currentMatch.teamA.name} Tebrikler! 🔴🔥\n\n`;
    } else if (scoreB > scoreA) {
      text += `🎉 *Kazanan:* ${currentMatch.teamB.name} Tebrikler! 🔵🔥\n\n`;
    } else {
      text += `🤝 *Dostluk Kazandı:* Berabere bitti! ⚽\n\n`;
    }

    if (mvpPlayer) {
      text += `⭐ *MAÇIN ADAMI (MVP):* ${mvpPlayer.name} (${mvpPlayer.primaryPosition}) 🔥\n`;
    }
    if (fairPlayPlayer) {
      text += `🤝 *FAIR PLAY ÖDÜLÜ:* ${fairPlayPlayer.name} 👏\n`;
    }

    if (matchNotes.trim()) {
      text += `\n📝 *Maç Notu:* ${matchNotes.trim()}\n`;
    }

    text += `\nKatılan tüm arkadaşların ayaklarına sağlık! Haftaya aynı saatte sahada görüşmek üzere. ⚽🔥`;
    return text;
  };

  const handleSaveAndShare = () => {
    // Save scores in AppContext
    setMatchScores(scoreA, scoreB);

    if (selectedMvpId) {
      voteMvp(selectedMvpId);
    }

    try {
      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#10b981', '#3b82f6', '#ef4444'],
      });
    } catch {}

    const text = generateMatchSummaryText();
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    setIsCompleted(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const handleCopyTextOnly = () => {
    setMatchScores(scoreA, scoreB);
    if (selectedMvpId) {
      voteMvp(selectedMvpId);
    }
    const text = generateMatchSummaryText();
    navigator.clipboard.writeText(text);
    setIsCompleted(true);
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Maç Sonu & Ödül Girişi</h3>
              <p className="text-[10px] text-slate-400">Skoru girin, MVP ve Fair Play ödüllerini dağıtın</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. SCORE ENTRY */}
        <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-center">
            Maç Skoru
          </span>

          <div className="grid grid-cols-2 gap-3 items-center">
            {/* Team A */}
            <div className="p-3 bg-rose-950/20 border border-rose-500/30 rounded-xl text-center space-y-1">
              <span className="text-xs font-black text-rose-300 block truncate">
                {currentMatch.teamA.name}
              </span>
              <input
                type="number"
                min="0"
                max="30"
                value={scoreA}
                onChange={e => setScoreA(parseInt(e.target.value) || 0)}
                className="w-full text-center text-3xl font-black font-mono bg-transparent text-white focus:outline-none"
              />
            </div>

            {/* Team B */}
            <div className="p-3 bg-blue-950/20 border border-blue-500/30 rounded-xl text-center space-y-1">
              <span className="text-xs font-black text-blue-300 block truncate">
                {currentMatch.teamB.name}
              </span>
              <input
                type="number"
                min="0"
                max="30"
                value={scoreB}
                onChange={e => setScoreB(parseInt(e.target.value) || 0)}
                className="w-full text-center text-3xl font-black font-mono bg-transparent text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 2. MVP SELECTION */}
        <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center space-x-1.5 text-amber-400">
            <Star className="w-4 h-4 fill-amber-400" />
            <span className="text-xs font-black uppercase tracking-wider">Maçın Adamı (MVP)</span>
          </div>

          <select
            value={selectedMvpId}
            onChange={e => setSelectedMvpId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
          >
            {squadPlayers.map(p => (
              <option key={p.id} value={p.id}>
                ⭐ {p.name} ({p.primaryPosition}) — {p.finalScore} Puan
              </option>
            ))}
          </select>
        </div>

        {/* 3. FAIR PLAY SELECTION */}
        <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center space-x-1.5 text-emerald-400">
            <Heart className="w-4 h-4 fill-emerald-400" />
            <span className="text-xs font-black uppercase tracking-wider">Fair Play & Centilmenlik</span>
          </div>

          <select
            value={selectedFairPlayId}
            onChange={e => setSelectedFairPlayId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
          >
            {squadPlayers.map(p => (
              <option key={p.id} value={p.id}>
                🤝 {p.name} ({p.primaryPosition})
              </option>
            ))}
          </select>
        </div>

        {/* 4. OPTIONAL MATCH NOTE */}
        <div>
          <label className="text-[11px] font-semibold text-slate-300 block mb-1">
            Maçın Unutulmaz Anı / Notu (Opsiyonel)
          </label>
          <input
            type="text"
            placeholder="Örn: 90. dakikada kalecinin inanılmaz kurtarışı..."
            value={matchNotes}
            onChange={e => setMatchNotes(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* ACTIONS */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            onClick={handleCopyTextOnly}
            className="flex items-center justify-center space-x-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all active:scale-95"
          >
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isCompleted ? 'Kaydedildi!' : 'Yalnızca Kaydet'}</span>
          </button>

          <button
            onClick={handleSaveAndShare}
            className="flex items-center justify-center space-x-1.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Kaydet & WhatsApp'a At</span>
          </button>
        </div>
      </div>
    </div>
  );
};
