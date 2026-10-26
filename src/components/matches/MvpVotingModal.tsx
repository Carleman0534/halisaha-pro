import React, { useState } from 'react';
import {
  Trophy,
  Star,
  Crown,
  Check,
  X,
  Share2,
  Sparkles,
  Users,
  Award,
  Vote,
  Flame,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import { Player } from '../../types';

interface MvpVotingModalProps {
  onClose: () => void;
}

export const MvpVotingModal: React.FC<MvpVotingModalProps> = ({ onClose }) => {
  const { currentMatch, playersMap, currentUser, isAdmin, castMvpVote, finalizeMvp } = useApp();

  const squadPlayers = currentMatch.squad
    .map(id => playersMap[id])
    .filter((p): p is Player => Boolean(p));

  const votes: Record<string, number> = currentMatch.mvpVotes || {};
  const userVotes: Record<string, string> = currentMatch.userMvpVotes || {};
  const voterKey = currentUser.playerId || currentUser.id;
  const myVotedPlayerId = userVotes[voterKey];

  const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);

  // Find leader
  let leaderId = currentMatch.mvpWinnerId || '';
  let maxVotes = 0;
  if (!leaderId) {
    Object.entries(votes).forEach(([id, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        leaderId = id;
      }
    });
  }

  const leaderPlayer = playersMap[leaderId];

  const handleVote = (candidateId: string) => {
    castMvpVote(candidateId, voterKey);
    try {
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
    } catch {}
  };

  const handleFinalize = (winnerId: string) => {
    finalizeMvp(winnerId);
    try {
      confetti({ particleCount: 80, spread: 90, origin: { y: 0.5 } });
    } catch {}
  };

  const handleShareWhatsApp = () => {
    const origin = window.location.origin + window.location.pathname;
    const voteLink = `${origin}?action=mvp`;

    let text = `⭐ *HALI SAHA MAÇIN ADAMI (MVP) OYLAMASI* ⭐\n`;
    text += `📅 ${currentMatch.date} | ${currentMatch.venueName}\n\n`;

    if (currentMatch.mvpWinnerId && leaderPlayer) {
      text += `🏆 *KAZANAN (HAFTANIN MVP'Sİ):* ${leaderPlayer.name} (${votes[leaderPlayer.id] || 0} Oy) 🔥\n\n`;
      text += `Tebrik ederiz! Altın FIFA kartı rozeti oyuncunun profiline eklendi.\n`;
    } else {
      text += `Maç bitti, sahanın en iyisini seçiyoruz! Sen de oyunu kullan:\n\n`;
      text += `🗳️ *Oy Vermek İçin Tıkla:*\n${voteLink}\n\n`;

      if (leaderPlayer && maxVotes > 0) {
        text += `📊 *Şu Anki Lider:* ${leaderPlayer.name} (${maxVotes} Oy)\n\n`;
      }
    }

    text += `Herkesin oylarını bekliyoruz! ⚽🤝`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Trophy className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h3 className="font-black text-white text-sm flex items-center space-x-1.5">
                <span>Maçın Adamı (MVP) Oylaması</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h3>
              <p className="text-[10px] text-slate-400">
                {totalVotes} Oy Kullanıldı • Haftanın Yıldızı
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current MVP Leader Banner */}
        {leaderPlayer && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border border-amber-500/40 flex items-center justify-between shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-black flex items-center justify-center font-black text-base shadow-md">
                  {leaderPlayer.name.charAt(0)}
                </div>
                <div className="absolute -top-2 -right-1 bg-amber-400 text-black p-0.5 rounded-full shadow-sm">
                  <Crown className="w-3.5 h-3.5" />
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-amber-400 flex items-center space-x-1">
                  <Flame className="w-3 h-3 text-amber-400" />
                  <span>{currentMatch.mvpWinnerId ? 'MAÇIN ADAMI SEÇİLDİ' : 'ŞU ANKİ LİDER'}</span>
                </span>
                <h4 className="text-sm font-black text-white">{leaderPlayer.name}</h4>
                <span className="text-[10px] text-slate-400">
                  {leaderPlayer.primaryPosition} • {votes[leaderPlayer.id] || 0} Oy (%
                  {totalVotes > 0 ? Math.round(((votes[leaderPlayer.id] || 0) / totalVotes) * 100) : 0})
                </span>
              </div>
            </div>

            {isAdmin && !currentMatch.mvpWinnerId && (
              <button
                onClick={() => handleFinalize(leaderPlayer.id)}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-[11px] shadow-md transition-all active:scale-95"
              >
                Onayla & Bitir
              </button>
            )}
          </div>
        )}

        {/* Voting Instructions */}
        <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
          <span className="flex items-center space-x-1.5">
            <Vote className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              {myVotedPlayerId ? (
                <>Oyunuz: <strong className="text-amber-300">{playersMap[myVotedPlayerId]?.name}</strong></>
              ) : (
                'Sahanın en iyi oyuncusuna dokunarak oy verin:'
              )}
            </span>
          </span>

          <button
            onClick={handleShareWhatsApp}
            className="flex items-center space-x-1 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20"
          >
            <Share2 className="w-3 h-3" />
            <span>WhatsApp Anketi</span>
          </button>
        </div>

        {/* Candidate Players List */}
        <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
          {squadPlayers.map(p => {
            const voteCount = votes[p.id] || 0;
            const percent = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
            const isMyVote = myVotedPlayerId === p.id;
            const isWinner = currentMatch.mvpWinnerId === p.id;

            return (
              <div
                key={p.id}
                onClick={() => handleVote(p.id)}
                className={`relative overflow-hidden p-2.5 rounded-2xl border transition-all cursor-pointer active:scale-[0.98] ${
                  isWinner
                    ? 'bg-amber-950/40 border-amber-500/60 ring-2 ring-amber-500/40'
                    : isMyVote
                    ? 'bg-emerald-950/30 border-emerald-500/50'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Progress bar fill background */}
                <div
                  className={`absolute top-0 bottom-0 left-0 opacity-15 transition-all duration-500 ${
                    isWinner ? 'bg-amber-400' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${percent}%` }}
                />

                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-white">
                      {p.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-xs text-white">{p.name}</span>
                        {isWinner && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400 text-black font-black">
                            MVP 👑
                          </span>
                        )}
                        {isMyVote && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                            Oyunuz ✓
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {p.primaryPosition} • {Math.round(p.finalScore * 10)} OVR
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex items-center space-x-2">
                    <div>
                      <span className="text-xs font-black text-amber-400 font-mono">
                        {voteCount} Oy
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">%{percent}</span>
                    </div>

                    <button
                      type="button"
                      className={`w-7 h-7 rounded-xl flex items-center justify-center border transition-all ${
                        isMyVote
                          ? 'bg-emerald-500 text-black border-emerald-400'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${isMyVote ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[10px] text-slate-400">
            {currentMatch.mvpWinnerId ? '✅ Oylama tamamlandı' : 'Her oyuncu 1 oy kullanabilir'}
          </span>

          <button
            onClick={handleShareWhatsApp}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Gruba Duyur (WhatsApp)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
