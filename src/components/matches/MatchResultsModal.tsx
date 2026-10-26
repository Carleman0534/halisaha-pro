import React, { useState } from 'react';
import {
  Trophy,
  Star,
  Heart,
  Check,
  X,
  Share2,
  Award,
  Calendar,
  MapPin,
  Sparkles,
  Plus,
  Trash2,
  Vote,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Match, Player, MatchGoal } from '../../types';
import { useApp } from '../../context/AppContext';

interface MatchResultsModalProps {
  onClose: () => void;
  onOpenMvpVoting?: () => void;
}

export const MatchResultsModal: React.FC<MatchResultsModalProps> = ({
  onClose,
  onOpenMvpVoting,
}) => {
  const { currentMatch, playersMap, setMatchScores, voteMvp } = useApp();

  const [scoreA, setScoreA] = useState<number>(currentMatch.teamA.score ?? 7);
  const [scoreB, setScoreB] = useState<number>(currentMatch.teamB.score ?? 6);

  const squadPlayers = currentMatch.squad
    .map(id => playersMap[id])
    .filter((p): p is Player => Boolean(p));

  // Goal scorers state
  const [goals, setGoals] = useState<MatchGoal[]>(() => {
    return currentMatch.goals || [];
  });

  const [selectedGoalPlayerId, setSelectedGoalPlayerId] = useState<string>(
    squadPlayers[0]?.id || ''
  );
  const [selectedGoalTeam, setSelectedGoalTeam] = useState<'teamA' | 'teamB'>('teamA');

  const [selectedMvpId, setSelectedMvpId] = useState<string>(
    currentMatch.mvpWinnerId || squadPlayers[0]?.id || ''
  );
  const [selectedFairPlayId, setSelectedFairPlayId] = useState<string>(
    squadPlayers[1]?.id || squadPlayers[0]?.id || ''
  );
  const [matchNotes, setMatchNotes] = useState<string>(currentMatch.notes || '');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const mvpPlayer = playersMap[selectedMvpId];
  const fairPlayPlayer = playersMap[selectedFairPlayId];

  const dateFormatted = new Date(currentMatch.date).toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const handleAddGoal = () => {
    if (!selectedGoalPlayerId) return;
    const newGoal: MatchGoal = {
      id: `goal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      playerId: selectedGoalPlayerId,
      team: selectedGoalTeam,
    };
    const nextGoals = [...goals, newGoal];
    setGoals(nextGoals);

    // Increment corresponding team score automatically
    if (selectedGoalTeam === 'teamA') {
      setScoreA(prev => prev + 1);
    } else {
      setScoreB(prev => prev + 1);
    }
    try {
      confetti({ particleCount: 20, spread: 40, origin: { y: 0.7 } });
    } catch {}
  };

  const handleRemoveGoal = (goalId: string, team: 'teamA' | 'teamB') => {
    setGoals(prev => prev.filter(g => g.id !== goalId));
    if (team === 'teamA') {
      setScoreA(prev => Math.max(0, prev - 1));
    } else {
      setScoreB(prev => Math.max(0, prev - 1));
    }
  };

  // Group goals by player
  const playerGoalCounts: Record<string, { count: number; team: 'teamA' | 'teamB' }> = {};
  goals.forEach(g => {
    if (!playerGoalCounts[g.playerId]) {
      playerGoalCounts[g.playerId] = { count: 0, team: g.team };
    }
    playerGoalCounts[g.playerId].count += 1;
  });

  const generateMatchSummaryText = () => {
    let text = `🏆 *HALI SAHA MAÇ KARNESİ & SKORU* 🏆\n`;
    text += `📅 ${dateFormatted} | ${currentMatch.time}\n`;
    text += `📍 ${currentMatch.venueName} (${currentMatch.pitchNo})\n\n`;

    text += `⚽ *MAÇ SONUCU:*\n`;
    text += `🔴 ${currentMatch.teamA.name}: *${scoreA}*\n`;
    text += `🔵 ${currentMatch.teamB.name}: *${scoreB}*\n\n`;

    if (scoreA > scoreB) {
      text += `🎉 *Kazanan:* ${currentMatch.teamA.name} Tebrikler! 🔴🔥\n\n`;
    } else if (scoreB > scoreA) {
      text += `🎉 *Kazanan:* ${currentMatch.teamB.name} Tebrikler! 🔵🔥\n\n`;
    } else {
      text += `🤝 *Dostluk Kazandı:* Berabere bitti! ⚽\n\n`;
    }

    // Gol Atanlar
    const goalEntries = Object.entries(playerGoalCounts);
    if (goalEntries.length > 0) {
      text += `⚽ *GOL ATANLAR:*\n`;
      goalEntries
        .sort((a, b) => b[1].count - a[1].count)
        .forEach(([pId, data]) => {
          const p = playersMap[pId];
          const ballEmoji = '⚽'.repeat(Math.min(5, data.count));
          text += `• ${p ? p.name : 'Oyuncu'}: ${data.count} Gol ${ballEmoji}\n`;
        });
      text += `\n`;
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
    // Save scores and goals in AppContext
    setMatchScores(scoreA, scoreB, goals, selectedMvpId);

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
    setMatchScores(scoreA, scoreB, goals, selectedMvpId);
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
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-md">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Canlı Maç Karnesi & Skor Girişi</h3>
              <p className="text-[10px] text-slate-400">Skor, gol atanlar ve MVP kaydı</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. SCORE ENTRY */}
        <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-center">
            Nihai Maç Skoru
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
                max="40"
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
                max="40"
                value={scoreB}
                onChange={e => setScoreB(parseInt(e.target.value) || 0)}
                className="w-full text-center text-3xl font-black font-mono bg-transparent text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 2. GOAL SCORERS ENTRY */}
        <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-white uppercase tracking-wider flex items-center space-x-1.5">
              <span>⚽ Gol Krallığına Gol Ekle</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {goals.length} Gol Kayıtlı
            </span>
          </div>

          {/* Goal Input form */}
          <div className="grid grid-cols-3 gap-1.5">
            <select
              value={selectedGoalPlayerId}
              onChange={e => setSelectedGoalPlayerId(e.target.value)}
              className="col-span-2 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
            >
              {squadPlayers.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.primaryPosition})
                </option>
              ))}
            </select>

            <select
              value={selectedGoalTeam}
              onChange={e => setSelectedGoalTeam(e.target.value as 'teamA' | 'teamB')}
              className="bg-slate-900 border border-slate-800 rounded-xl px-1.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
            >
              <option value="teamA">🔴 Kırmızı</option>
              <option value="teamB">🔵 Mavi</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleAddGoal}
            className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-1 shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Golü Kaydet (+1)</span>
          </button>

          {/* Goals summary list */}
          {Object.keys(playerGoalCounts).length > 0 && (
            <div className="space-y-1 pt-1 border-t border-slate-800/80 max-h-32 overflow-y-auto pr-1">
              {Object.entries(playerGoalCounts).map(([pId, data]) => {
                const player = playersMap[pId];
                return (
                  <div
                    key={pId}
                    className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span className={`w-2 h-2 rounded-full ${data.team === 'teamA' ? 'bg-rose-500' : 'bg-blue-500'}`} />
                      <span className="font-bold text-white">{player ? player.name : 'Oyuncu'}</span>
                      <span className="text-[10px] text-amber-400 font-bold">⚽ x{data.count}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const matchingGoal = goals.find(g => g.playerId === pId);
                        if (matchingGoal) handleRemoveGoal(matchingGoal.id, data.team);
                      }}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                      title="1 Gol Eksilt"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. MVP & FAIR PLAY SELECTION */}
        <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-amber-400">
              <Star className="w-4 h-4 fill-amber-400" />
              <span className="text-xs font-black uppercase tracking-wider">Maçın Adamı (MVP)</span>
            </div>

            {onOpenMvpVoting && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMvpVoting();
                }}
                className="flex items-center space-x-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 hover:bg-amber-500/20"
              >
                <Vote className="w-3 h-3" />
                <span>Halk Oylaması Aç</span>
              </button>
            )}
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

        {/* 4. OPTIONAL MATCH NOTE */}
        <div>
          <label className="text-[11px] font-semibold text-slate-300 block mb-1">
            Maçın Özeti & Notları
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
            <span>Karnesi WhatsApp'a</span>
          </button>
        </div>
      </div>
    </div>
  );
};
