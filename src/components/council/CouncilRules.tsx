import React, { useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Scale,
  Award,
  AlertCircle,
  Megaphone,
} from 'lucide-react';
import { COUNCIL_RULES, CRITERIA_RUBRICS, POSITION_WEIGHTS } from '../../data/initialData';
import { Position } from '../../types';
import { DisciplineManagerModal } from './DisciplineManagerModal';

export const CouncilRules: React.FC = () => {
  const [openRuleId, setOpenRuleId] = useState<number | null>(1);
  const [selectedRubricKey, setSelectedRubricKey] = useState<string>('pas');
  const [selectedPosition, setSelectedPosition] = useState<Position>('Orta saha');
  const [showDisciplineModal, setShowDisciplineModal] = useState<boolean>(false);

  const selectedRubric = CRITERIA_RUBRICS.find(r => r.key === selectedRubricKey) || CRITERIA_RUBRICS[0];

  return (
    <div className="space-y-5 pb-20">
      {/* Announcements Banner & Quick Action */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-rose-950/40 border border-emerald-500/30 space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs uppercase tracking-wide">
            <Megaphone className="w-4 h-4" />
            <span>Resmi Konsey Bildirisi</span>
          </div>
          <button
            onClick={() => setShowDisciplineModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all active:scale-95"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Disiplin & Cezalar</span>
          </button>
        </div>
        <p className="text-xs text-slate-200 leading-relaxed">
          Tüm üyelerin maç başlangıç saatinden en az 15 dakika önce sahada olması esastır. İptaller en geç maçtan 24 saat önce bildirilmelidir; aksi takdirde sistem tarafından ceza puanı uygulanır.
        </p>
      </div>

      {/* 6 ALTIN KURAL ACCORDION */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-300 px-1">
          <Scale className="w-4 h-4 text-emerald-400" />
          <span>Konseyin 6 Altın Kuralı</span>
        </div>

        <div className="space-y-2">
          {COUNCIL_RULES.map(rule => {
            const isOpen = openRuleId === rule.id;

            return (
              <div
                key={rule.id}
                className="rounded-xl bg-slate-900/90 border border-slate-800 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenRuleId(isOpen ? null : rule.id)}
                  className="w-full p-3.5 flex items-center justify-between text-left text-xs font-bold text-white hover:text-emerald-400 transition-colors"
                >
                  <span>{rule.title}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-3.5 pb-3.5 pt-1 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 bg-slate-950/40">
                    <p>{rule.description}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 12 KRİTER DEĞERLENDİRME REHBERİ (RUBRIC) */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-300 px-1">
          <Award className="w-4 h-4 text-amber-400" />
          <span>12 Yetenek Kriter Sözlüğü (1 - 10 Puan Baremleri)</span>
        </div>

        {/* Kriter Seçici Yatay Scroll */}
        <div className="flex space-x-1.5 overflow-x-auto no-scrollbar pb-1">
          {CRITERIA_RUBRICS.map(r => (
            <button
              key={r.key}
              onClick={() => setSelectedRubricKey(r.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedRubricKey === r.key
                  ? 'bg-amber-500 text-black shadow-sm font-bold'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {r.criterion}
            </button>
          ))}
        </div>

        {/* Seçili Kriterin 1, 3, 5, 7, 9, 10 Puan Karşılıkları */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
          <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center justify-between">
            <span>{selectedRubric.criterion} Puanlama Kılavuzu</span>
            <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              Resmi Barem
            </span>
          </h4>

          <div className="space-y-1.5 text-xs">
            <div className="p-2 rounded-lg bg-slate-800/60 flex items-start space-x-2 border border-slate-700/50">
              <span className="font-mono font-black text-rose-400 w-12 shrink-0">1 Puan:</span>
              <span className="text-slate-300">{selectedRubric.p1}</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-800/60 flex items-start space-x-2 border border-slate-700/50">
              <span className="font-mono font-black text-amber-400 w-12 shrink-0">3 Puan:</span>
              <span className="text-slate-300">{selectedRubric.p3}</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-800/60 flex items-start space-x-2 border border-slate-700/50">
              <span className="font-mono font-black text-yellow-400 w-12 shrink-0">5 Puan:</span>
              <span className="text-slate-300">{selectedRubric.p5} (Standart Referans)</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-800/60 flex items-start space-x-2 border border-slate-700/50">
              <span className="font-mono font-black text-teal-400 w-12 shrink-0">7 Puan:</span>
              <span className="text-slate-300">{selectedRubric.p7}</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-800/60 flex items-start space-x-2 border border-slate-700/50">
              <span className="font-mono font-black text-emerald-400 w-12 shrink-0">9 Puan:</span>
              <span className="text-slate-300">{selectedRubric.p9}</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-800/60 flex items-start space-x-2 border border-slate-700/50">
              <span className="font-mono font-black text-cyan-400 w-12 shrink-0">10 Puan:</span>
              <span className="text-slate-300 font-bold">{selectedRubric.p10}</span>
            </div>
          </div>
        </div>
      </div>

      {/* MEVKİ AĞIRLIK MATRİSİ TABLOSU */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-300 px-1">
          <BookOpen className="w-4 h-4 text-emerald-400" />
          <span>Mevki Yetenek Ağırlık Dağılımı (%100)</span>
        </div>

        <div className="flex space-x-1.5 overflow-x-auto no-scrollbar pb-1">
          {(['Kaleci', 'Defans', 'Orta saha', 'Kanat', 'Forvet'] as Position[]).map(pos => (
            <button
              key={pos}
              onClick={() => setSelectedPosition(pos)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedPosition === pos
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-slate-200">
            <span>{selectedPosition} İçin Kriter Ağırlıkları</span>
            <span className="text-emerald-400 font-mono">Toplam %100</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(POSITION_WEIGHTS[selectedPosition])
              .filter(([_, weight]) => weight > 0)
              .sort(([_, a], [__, b]) => b - a)
              .map(([key, weight]) => {
                const rubric = CRITERIA_RUBRICS.find(r => r.key === key);
                const label = rubric ? rubric.criterion : key;

                return (
                  <div
                    key={key}
                    className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-between"
                  >
                    <span className="text-slate-300 truncate max-w-[100px]">{label}</span>
                    <span className="font-mono font-bold text-emerald-400">%{weight}</span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {showDisciplineModal && (
        <DisciplineManagerModal onClose={() => setShowDisciplineModal(false)} />
      )}
    </div>
  );
};
