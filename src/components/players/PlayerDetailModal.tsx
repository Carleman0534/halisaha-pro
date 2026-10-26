import React, { useState } from 'react';
import {
  X,
  Award,
  Shield,
  Activity,
  UserCheck,
  AlertOctagon,
  Scale,
  Edit3,
  Sparkles,
  Lock,
} from 'lucide-react';
import { Player, Position } from '../../types';
import { COUNCIL_MEMBERS, CRITERIA_KEYS } from '../../data/initialData';
import { calculatePositionScore } from '../../utils/calculations';
import { FifaCardModal } from './FifaCardModal';
import { useApp } from '../../context/AppContext';

interface PlayerDetailModalProps {
  player: Player;
  onClose: () => void;
  onOpenEvaluation: (player: Player) => void;
}

export const PlayerDetailModal: React.FC<PlayerDetailModalProps> = ({
  player,
  onClose,
  onOpenEvaluation,
}) => {
  const { isAdmin, isCouncil } = useApp();
  const [showFifaModal, setShowFifaModal] = useState(false);
  // Extract primary position score for each evaluator
  const evaluatorScores = COUNCIL_MEMBERS.map(evaluator => {
    const ratings = player.ratings[evaluator.id] || {};
    const score = calculatePositionScore(ratings, player.primaryPosition);
    return {
      evaluator,
      score,
      hasRated: Object.keys(ratings).length > 0,
    };
  });

  const validScores = evaluatorScores.map(e => e.score).filter(s => s > 0);
  const minScore = validScores.length >= 4 ? Math.min(...validScores) : null;
  const maxScore = validScores.length >= 4 ? Math.max(...validScores) : null;

  // Track if min/max already struck through once
  let minStruck = false;
  let maxStruck = false;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col p-5 shadow-2xl animate-in slide-in-from-bottom">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex flex-col items-center justify-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">NİHAİ</span>
                <span className="text-xl font-black text-emerald-400 font-mono leading-none">
                  {isCouncil ? player.finalScore : 'PRO'}
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-black text-white">{player.name}</h3>
                {player.isJoker && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Joker
                  </span>
                )}
                {player.attendanceStats.isSuspended && (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-500 text-white flex items-center space-x-0.5">
                    <AlertOctagon className="w-2.5 h-2.5" />
                    <span>ASKIDA</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Asıl: <strong className="text-white">{player.primaryPosition}</strong>
                {player.secondaryPosition && (
                  <span> • İkincil: <strong className="text-slate-300">{player.secondaryPosition}</strong></span>
                )}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto space-y-4 py-4 pr-1 flex-1">
          {isCouncil ? (
            <>
              {/* Olympic Average & Consistency Penalty Box */}
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                  <span className="flex items-center space-x-1.5">
                    <Scale className="w-4 h-4 text-emerald-400" />
                    <span>Olimpik Ortalama & Komisyon Oyları</span>
                  </span>
                  <span className="text-emerald-400 font-mono">
                    M: {player.trimmedMean} • S: {player.standardDeviation}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Excel Kuralı: $\ge 4$ oylamada en yüksek ve en düşük puan elenir. Tutarsızlık cezası olarak $N = M - 0.5 \times S$ formülü uygulanır.
                </p>

                {/* Evaluator score tags */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {evaluatorScores.map(({ evaluator, score, hasRated }) => {
                    let isEliminated = false;
                    if (validScores.length >= 4) {
                      if (score === minScore && !minStruck) {
                        isEliminated = true;
                        minStruck = true;
                      } else if (score === maxScore && !maxStruck) {
                        isEliminated = true;
                        maxStruck = true;
                      }
                    }

                    return (
                      <div
                        key={evaluator.id}
                        className={`p-2 rounded-lg border text-xs flex items-center justify-between ${
                          isEliminated
                            ? 'bg-slate-900/40 border-slate-700 text-slate-500 line-through'
                            : hasRated
                            ? 'bg-slate-900/90 border-slate-700 text-slate-200'
                            : 'bg-slate-900/30 border-dashed border-slate-700 text-slate-500'
                        }`}
                      >
                        <span className="truncate max-w-[100px]">{evaluator.name}</span>
                        <span className={`font-mono font-bold ${isEliminated ? 'text-slate-500' : 'text-emerald-400'}`}>
                          {hasRated ? score.toFixed(1) : '-'}
                          {isEliminated && ' (E)'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Position Scores (5 Mevki Reytingi) */}
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                  Mevki Uygunluk Puanları
                </h4>
                <div className="grid grid-cols-5 gap-1.5 text-center">
                  {(['Kaleci', 'Defans', 'Orta saha', 'Kanat', 'Forvet'] as Position[]).map(pos => {
                    const score = player.positionScores[pos] || 0;
                    const isPrimary = player.primaryPosition === pos;

                    return (
                      <div
                        key={pos}
                        className={`p-2 rounded-lg border transition-all ${
                          isPrimary
                            ? 'bg-emerald-950/60 border-emerald-500/50 text-white'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400'
                        }`}
                      >
                        <span className="text-[10px] font-bold block truncate">{pos.slice(0, 3)}</span>
                        <span className="text-xs font-mono font-black text-emerald-400">
                          {score > 0 ? score.toFixed(1) : '-'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 12 Skills Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                  12 Yetenek Kriter Dağılımı
                </h4>

                {/* Calculate aggregate skill averages */}
                <div className="space-y-1.5">
                  {CRITERIA_KEYS.map(c => {
                    const scores = Object.values(player.ratings)
                      .map(r => r[c.key])
                      .filter(s => s !== undefined && s > 0);
                    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 5;

                    return (
                      <div key={c.key} className="space-y-0.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300">{c.label}</span>
                          <span className="font-mono font-bold text-emerald-400">{avg.toFixed(1)} / 10</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                            style={{ width: `${(avg / 10) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 text-center space-y-2 py-8">
              <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 mx-auto flex items-center justify-center text-slate-400">
                <Lock className="w-6 h-6 text-amber-400" />
              </div>
              <h4 className="text-sm font-bold text-white">Puanlama ve Değerlendirme Korumalı</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Oyuncu detaylı yetenek kriterleri, mevkisel reytingler ve konsey oyları yalnızca yetkili Konsey Üyelerine açıktır.
              </p>
            </div>
          )}

          {/* Attendance & Balance Summary */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Yoklama Durumu</span>
              <span className="text-white font-bold text-sm block mt-0.5">
                {player.attendanceStats.attended} Maç Geldi
              </span>
              <span className="text-amber-400 text-[11px]">
                {player.attendanceStats.penaltyPoints} Ceza Puanı
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Kasa Bakiyesi</span>
              <span
                className={`font-black text-sm block mt-0.5 ${
                  player.financialBalance < 0
                    ? 'text-rose-400'
                    : player.financialBalance > 0
                    ? 'text-emerald-400'
                    : 'text-slate-300'
                }`}
              >
                {player.financialBalance} ₺
              </span>
              <span className="text-slate-500 text-[11px]">
                {player.financialBalance < 0 ? 'Borçlu' : 'Bakiye Tam'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={`grid ${isCouncil ? 'grid-cols-2' : 'grid-cols-1'} gap-2 mt-2`}>
          <button
            onClick={() => setShowFifaModal(true)}
            className="py-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-all active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>FIFA Kartı</span>
          </button>

          {isCouncil && (
            <button
              onClick={() => {
                onClose();
                onOpenEvaluation(player);
              }}
              className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
            >
              <Edit3 className="w-4 h-4" />
              <span>Konsey Oyu</span>
            </button>
          )}
        </div>

        {/* FIFA CARD MODAL */}
        {showFifaModal && (
          <FifaCardModal
            player={player}
            onClose={() => setShowFifaModal(false)}
          />
        )}
      </div>
    </div>
  );
};
