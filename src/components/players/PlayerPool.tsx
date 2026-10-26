import React, { useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  Award,
  AlertOctagon,
  UserCheck,
  Star,
  Edit2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Player, Position } from '../../types';
import { PlayerDetailModal } from './PlayerDetailModal';
import { EvaluatorModal } from './EvaluatorModal';
import { FifaCardModal } from './FifaCardModal';

export const PlayerPool: React.FC = () => {
  const { players, addPlayer } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<string>('ALL');

  const [detailPlayer, setDetailPlayer] = useState<Player | null>(null);
  const [evaluatingPlayer, setEvaluatingPlayer] = useState<Player | null>(null);
  const [fifaCardPlayer, setFifaCardPlayer] = useState<Player | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Player Form State
  const [newName, setNewName] = useState('');
  const [newPos, setNewPos] = useState<Position>('Orta saha');
  const [newSecPos, setNewSecPos] = useState<Position | ''>('');
  const [newIsJoker, setNewIsJoker] = useState(false);

  // Filter players
  const filteredPlayers = players.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedPosition === 'ALL') return true;
    if (selectedPosition === 'JOKER') return p.isJoker;
    if (selectedPosition === 'SUSPENDED') return p.attendanceStats.isSuspended;
    return p.primaryPosition === selectedPosition;
  });

  const handleAddNewPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    addPlayer(newName.trim(), newPos, newSecPos ? (newSecPos as Position) : undefined, newIsJoker);
    setNewName('');
    setShowAddModal(false);
  };

  const positionFilterButtons = [
    { id: 'ALL', label: 'Tümü' },
    { id: 'Kaleci', label: 'Kaleci' },
    { id: 'Defans', label: 'Defans' },
    { id: 'Orta saha', label: 'Orta Saha' },
    { id: 'Kanat', label: 'Kanat' },
    { id: 'Forvet', label: 'Forvet' },
    { id: 'JOKER', label: 'Jokerler' },
    { id: 'SUSPENDED', label: 'Askıda' },
  ];

  return (
    <div className="space-y-4 pb-20">
      {/* Search & Add Bar */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Oyuncu ara (isim, mevki)..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
          title="Yeni Oyuncu Ekle"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Position Filters Pills (Horizontally Scrollable) */}
      <div className="flex space-x-1.5 overflow-x-auto no-scrollbar pb-1">
        {positionFilterButtons.map(btn => (
          <button
            key={btn.id}
            onClick={() => setSelectedPosition(btn.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              selectedPosition === btn.id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Players Count & List */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>Toplam {filteredPlayers.length} Oyuncu</span>
        <span>Sıralama: Nihai Güç Puanı</span>
      </div>

      <div className="space-y-2">
        {filteredPlayers
          .sort((a, b) => b.finalScore - a.finalScore)
          .map(player => (
            <div
              key={player.id}
              className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-all flex items-center justify-between"
            >
              {/* Player Info with rating badge */}
              <div
                onClick={() => setDetailPlayer(player)}
                className="flex items-center space-x-3 cursor-pointer flex-1"
              >
                {/* FIFA Style Rating Badge */}
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-600 flex flex-col items-center justify-center shadow-md">
                  <span className="text-[9px] font-bold text-slate-400 leading-none">OVR</span>
                  <span className="text-sm font-black text-emerald-400 font-mono leading-none">
                    {player.finalScore.toFixed(1)}
                  </span>
                </div>

                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-sm font-bold text-white">{player.name}</span>
                    {player.isJoker && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                        Joker
                      </span>
                    )}
                    {player.attendanceStats.isSuspended && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500 text-white font-black flex items-center space-x-0.5">
                        <AlertOctagon className="w-2.5 h-2.5" />
                        <span>ASKIDA</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                    <span className="font-medium text-slate-300">{player.primaryPosition}</span>
                    <span>•</span>
                    <span>
                      M: <strong className="text-slate-200">{player.trimmedMean}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Sapma: <strong className="text-slate-200">{player.standardDeviation}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center space-x-1 pl-2">
                <button
                  onClick={() => setFifaCardPlayer(player)}
                  title="FIFA Kartını Gör & İndir"
                  className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all active:scale-90"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEvaluatingPlayer(player)}
                  title="Konsey Oyu Ver"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition-all active:scale-90"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDetailPlayer(player)}
                  title="Detayları İncele"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-all active:scale-90"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* FIFA CARD MODAL */}
      {fifaCardPlayer && (
        <FifaCardModal
          player={fifaCardPlayer}
          onClose={() => setFifaCardPlayer(null)}
        />
      )}

      {/* DETAIL MODAL */}
      {detailPlayer && (
        <PlayerDetailModal
          player={detailPlayer}
          onClose={() => setDetailPlayer(null)}
          onOpenEvaluation={p => {
            setDetailPlayer(null);
            setEvaluatingPlayer(p);
          }}
        />
      )}

      {/* EVALUATION MODAL */}
      {evaluatingPlayer && (
        <EvaluatorModal
          player={evaluatingPlayer}
          onClose={() => setEvaluatingPlayer(null)}
        />
      )}

      {/* ADD PLAYER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAddNewPlayer}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4"
          >
            <div>
              <h3 className="font-bold text-white text-base">Yeni Oyuncu Ekle</h3>
              <p className="text-xs text-slate-400">Havuz kadrosuna yeni bir oyuncu tanımlayın</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Oyuncu Adı</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Burak Hoca"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Asıl Mevki</label>
                <select
                  value={newPos}
                  onChange={e => setNewPos(e.target.value as Position)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="Kaleci">Kaleci</option>
                  <option value="Defans">Defans</option>
                  <option value="Orta saha">Orta saha</option>
                  <option value="Kanat">Kanat</option>
                  <option value="Forvet">Forvet</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  İkincil Mevki (Opsiyonel)
                </label>
                <select
                  value={newSecPos}
                  onChange={e => setNewSecPos(e.target.value as Position | '')}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="">Yok</option>
                  <option value="Kaleci">Kaleci</option>
                  <option value="Defans">Defans</option>
                  <option value="Orta saha">Orta saha</option>
                  <option value="Kanat">Kanat</option>
                  <option value="Forvet">Forvet</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="jokerCheck"
                  checked={newIsJoker}
                  onChange={e => setNewIsJoker(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded"
                />
                <label htmlFor="jokerCheck" className="text-xs text-slate-300 font-semibold cursor-pointer">
                  'Joker' Oyuncu Etiketi Ver
                </label>
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
              >
                İptal
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                Kaydet
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
