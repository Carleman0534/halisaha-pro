import React, { useState } from 'react';
import { X, Check, Award, HelpCircle, Save, Lock } from 'lucide-react';
import { Player } from '../../types';
import { useApp } from '../../context/AppContext';
import { CRITERIA_KEYS, CRITERIA_RUBRICS } from '../../data/initialData';

interface EvaluatorModalProps {
  player: Player;
  onClose: () => void;
}

export const EvaluatorModal: React.FC<EvaluatorModalProps> = ({ player, onClose }) => {
  const { currentEvaluator, updateRating, isCouncil } = useApp();

  // If not council member, deny scoring completely (Rule 4)
  if (!isCouncil) {
    return (
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full text-center space-y-3 shadow-2xl">
          <div className="w-12 h-12 mx-auto rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">Yetkisiz Puanlama Erişimi</h3>
          <p className="text-xs text-slate-400">
            Oyuncu puanlama ve değerlendirme işlemi yalnızca Konsey Üyelerine açıktır. Normal oyuncuların ve misafirlerin oy verme yetkisi yoktur.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
          >
            Kapat
          </button>
        </div>
      </div>
    );
  }

  // Current scores by this evaluator or fallback to default
  const initialScores = player.ratings[currentEvaluator.id] || {};

  const [scores, setScores] = useState<Record<string, number>>(() => {
    const s: Record<string, number> = {};
    CRITERIA_KEYS.forEach(c => {
      s[c.key] = initialScores[c.key] || 7;
    });
    return s;
  });

  const handleScoreChange = (key: string, val: number) => {
    setScores(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = () => {
    Object.entries(scores).forEach(([key, val]) => {
      updateRating(player.id, currentEvaluator.id, key, val);
    });
    onClose();
  };

  // Find rubric description for current score
  const getRubricText = (key: string, score: number): string => {
    const rubric = CRITERIA_RUBRICS.find(r => r.key === key);
    if (!rubric) return '';

    if (score <= 1) return rubric.p1;
    if (score <= 3) return rubric.p3;
    if (score <= 5) return rubric.p5;
    if (score <= 7) return rubric.p7;
    if (score <= 9) return rubric.p9;
    return rubric.p10;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full max-h-[92vh] flex flex-col p-5 shadow-2xl animate-in slide-in-from-bottom">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">
              KONSEY DEĞERLENDİRMESİ • {currentEvaluator.name}
            </span>
            <h3 className="text-lg font-black text-white">{player.name}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="overflow-y-auto space-y-4 py-4 pr-1 flex-1">
          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 flex items-center space-x-2">
            <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Puanı değiştirdikçe alttaki davranış açıklaması Excel kriter rehberine göre güncellenir.
            </span>
          </div>

          <div className="space-y-4">
            {CRITERIA_KEYS.map(c => {
              const currentScore = scores[c.key] || 7;
              const rubricDesc = getRubricText(c.key, currentScore);

              return (
                <div key={c.key} className="p-3 rounded-xl bg-slate-800/40 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{c.label}</span>
                    <span className="font-mono text-sm font-black text-emerald-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                      {currentScore} / 10
                    </span>
                  </div>

                  {/* Slider */}
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={currentScore}
                    onChange={e => handleScoreChange(c.key, parseInt(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />

                  {/* Milestone description */}
                  {rubricDesc && (
                    <div className="text-[11px] text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800 italic">
                      "{rubricDesc}"
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Save Button */}
        <div className="flex space-x-2 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-600/30"
          >
            <Save className="w-4 h-4" />
            <span>Puanları Kaydet</span>
          </button>
        </div>
      </div>
    </div>
  );
};
