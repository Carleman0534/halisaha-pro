import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  Plus,
  Search,
  CheckCircle2,
  X,
  UserX,
  Scale,
  Award,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import { Player } from '../../types';

interface DisciplineManagerModalProps {
  onClose: () => void;
}

export const DisciplineManagerModal: React.FC<DisciplineManagerModalProps> = ({ onClose }) => {
  const { players, applyPenalty, clearPenalties } = useApp();

  const [filter, setFilter] = useState<'all' | 'penalized' | 'suspended'>('penalized');
  const [search, setSearch] = useState('');

  // Sorted by highest penalty points first
  const displayPlayers = useMemo(() => {
    return players
      .filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
        if (!matchesSearch) return false;

        if (filter === 'penalized') return p.attendanceStats.penaltyPoints > 0;
        if (filter === 'suspended') return p.attendanceStats.isSuspended;
        return true;
      })
      .sort((a, b) => b.attendanceStats.penaltyPoints - a.attendanceStats.penaltyPoints);
  }, [players, filter, search]);

  const handleApply = (playerId: string, points: number, reason: string) => {
    applyPenalty(playerId, points, reason);
  };

  const handleClear = (playerId: string) => {
    clearPenalties(playerId);
    try {
      confetti({ particleCount: 25, spread: 50, origin: { y: 0.7 } });
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Disiplin & Güvenilirlik Yönetimi</h3>
              <p className="text-[10px] text-slate-400">Ceza puanları, son dakika iptalleri & kara liste</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Rule Explanation Banner */}
        <div className="p-3 bg-slate-950 rounded-xl border border-rose-500/20 text-[11px] text-slate-300 space-y-1">
          <div className="flex items-center space-x-1 text-rose-400 font-bold">
            <Scale className="w-3.5 h-3.5" />
            <span>Konsey Ceza Sistemi Nasıl Çalışır?</span>
          </div>
          <p className="leading-relaxed">
            Ceza puanı yüksek olan oyuncular <strong>Akıllı Yedek Öneri Motoru</strong>'nda en arkaya atılır. 30+ ceza puanı olan oyuncular otomatik olarak <strong>Askıya Alınır (Kara Liste)</strong>.
          </p>
        </div>

        {/* Filter Pills & Search */}
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setFilter('penalized')}
              className={`py-1.5 rounded-lg transition-all ${
                filter === 'penalized' ? 'bg-amber-500 text-black shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Cezalılar ({players.filter(p => p.attendanceStats.penaltyPoints > 0).length})
            </button>
            <button
              onClick={() => setFilter('suspended')}
              className={`py-1.5 rounded-lg transition-all ${
                filter === 'suspended' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Askıdakiler ({players.filter(p => p.attendanceStats.isSuspended).length})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`py-1.5 rounded-lg transition-all ${
                filter === 'all' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tümü ({players.length})
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Oyuncu ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Player List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[240px]">
          {displayPlayers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Bu kriterde cezalı oyuncu bulunmamaktadır. 🎉
            </div>
          ) : (
            displayPlayers.map(p => {
              const penalty = p.attendanceStats.penaltyPoints;
              const isSuspended = p.attendanceStats.isSuspended;

              let reliabilityLabel = '🟢 %100 Güvenilir';
              let badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
              if (isSuspended || penalty >= 30) {
                reliabilityLabel = '🚨 Askıda (Kara Liste)';
                badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse';
              } else if (penalty > 0) {
                reliabilityLabel = `⚠️ ${penalty} Ceza Puanı`;
                badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
              }

              return (
                <div
                  key={p.id}
                  className={`p-3 rounded-xl border transition-all space-y-2 ${
                    isSuspended
                      ? 'bg-rose-950/20 border-rose-900/60'
                      : penalty > 0
                      ? 'bg-amber-950/20 border-amber-900/40'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-white">{p.name}</span>
                        <span className={`text-[9px] px-2 py-0.2 rounded-full font-bold border ${badgeColor}`}>
                          {reliabilityLabel}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Mevki: <span className="text-slate-300">{p.primaryPosition}</span> • İptal: {p.attendanceStats.lastMinuteCancel} • Gelmedi: {p.attendanceStats.noShow}
                      </div>
                    </div>

                    {penalty > 0 && (
                      <button
                        onClick={() => handleClear(p.id)}
                        title="Cezaları Sıfırla (Af)"
                        className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-[10px] font-bold transition-all active:scale-95"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Affet</span>
                      </button>
                    )}
                  </div>

                  {/* Quick Action Penalty Buttons */}
                  <div className="flex items-center space-x-1.5 pt-1">
                    <button
                      onClick={() => handleApply(p.id, 15, 'Son Dakika İptal')}
                      className="flex-1 py-1 px-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-semibold text-center transition-all active:scale-95"
                    >
                      +15 İptal
                    </button>
                    <button
                      onClick={() => handleApply(p.id, 30, 'Habersiz Gelmedi')}
                      className="flex-1 py-1 px-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-semibold text-center transition-all active:scale-95"
                    >
                      +30 Gelmedi
                    </button>
                    <button
                      onClick={() => handleApply(p.id, 5, 'Geç Kalma')}
                      className="flex-1 py-1 px-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[10px] font-semibold text-center transition-all active:scale-95"
                    >
                      +5 Geç Kaldı
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-xs font-bold transition-all"
        >
          Kapat
        </button>
      </div>
    </div>
  );
};
