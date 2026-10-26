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
  MessageCircle,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Player, Position } from '../../types';
import { PlayerDetailModal } from './PlayerDetailModal';
import { EvaluatorModal } from './EvaluatorModal';
import { FifaCardModal } from './FifaCardModal';
import { WhatsAppInviteModal } from '../common/WhatsAppInviteModal';
import { QuickAddPlayerModal } from './QuickAddPlayerModal';
import { DisciplineManagerModal } from '../council/DisciplineManagerModal';

export const PlayerPool: React.FC = () => {
  const { players, isAdmin, isCouncil } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<string>('ALL');

  const [detailPlayer, setDetailPlayer] = useState<Player | null>(null);
  const [evaluatingPlayer, setEvaluatingPlayer] = useState<Player | null>(null);
  const [fifaCardPlayer, setFifaCardPlayer] = useState<Player | null>(null);
  const [invitePlayer, setInvitePlayer] = useState<Player | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDisciplineModal, setShowDisciplineModal] = useState(false);

  // Filter players
  const filteredPlayers = players.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedPosition === 'ALL') return true;
    if (selectedPosition === 'JOKER') return p.isJoker;
    if (selectedPosition === 'SUSPENDED') return p.attendanceStats.isSuspended;
    return p.primaryPosition === selectedPosition;
  });

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
          onClick={() => setInvitePlayer(players[0] || null)}
          className="flex items-center space-x-1 py-2 px-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all active:scale-95"
          title="WhatsApp Maç Daveti Gönder"
        >
          <MessageCircle className="w-4 h-4 text-emerald-400" />
          <span>Davet</span>
        </button>

        {(isAdmin || isCouncil) && (
          <>
            <button
              onClick={() => setShowDisciplineModal(true)}
              className="flex items-center space-x-1 py-2 px-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all active:scale-95"
              title="Disiplin & Ceza Yönetimi"
            >
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Cezalar</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
              title="Yeni Oyuncu Ekle"
            >
              <Plus className="w-4 h-4" />
            </button>
          </>
        )}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
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
                    {isCouncil ? player.finalScore.toFixed(1) : 'PRO'}
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
                    {isCouncil && (
                      <>
                        <span>•</span>
                        <span>
                          M: <strong className="text-slate-200">{player.trimmedMean}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Sapma: <strong className="text-slate-200">{player.standardDeviation}</strong>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center space-x-1 pl-2">
                <button
                  onClick={() => setInvitePlayer(player)}
                  title="WhatsApp'tan Maça Davet Et"
                  className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all active:scale-90"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setFifaCardPlayer(player)}
                  title="FIFA Kartını Gör & İndir"
                  className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all active:scale-90"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
                {isCouncil && (
                  <button
                    onClick={() => setEvaluatingPlayer(player)}
                    title="Konsey Oyu Ver"
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition-all active:scale-90"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
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

      {/* WHATSAPP INVITE MODAL */}
      {invitePlayer && (
        <WhatsAppInviteModal
          player={invitePlayer}
          onClose={() => setInvitePlayer(null)}
        />
      )}

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

      {/* QUICK & BATCH ADD PLAYER MODAL */}
      {showAddModal && (
        <QuickAddPlayerModal onClose={() => setShowAddModal(false)} />
      )}

      {/* DISCIPLINE & PENALTY MANAGER MODAL */}
      {showDisciplineModal && (
        <DisciplineManagerModal onClose={() => setShowDisciplineModal(false)} />
      )}
    </div>
  );
};
