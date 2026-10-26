import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  CircleDollarSign,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  ArrowRight,
  Sparkles,
  Crown,
  Flame,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import { AttendanceStatus } from '../../types';

import { EmergencySubstituteFinder } from './EmergencySubstituteFinder';
import { MatchResultsModal } from './MatchResultsModal';
import { AddToCalendarModal } from '../common/AddToCalendarModal';
import { MvpVotingModal } from './MvpVotingModal';
import { WeeklyArchiveManager } from './WeeklyArchiveManager';
import { WeeklyAdminSummaryDashboard } from './WeeklyAdminSummaryDashboard';

interface MatchPlannerProps {
  onNavigateToSquad: () => void;
}

export const MatchPlanner: React.FC<MatchPlannerProps> = ({ onNavigateToSquad }) => {
  const { currentMatch, pastMatches, playersMap, updateAttendance, setMatchScores, createNewMatch, voteMvp } =
    useApp();

  const [activeView, setActiveView] = useState<'upcoming' | 'weeklyArchive'>('upcoming');
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showNewMatchModal, setShowNewMatchModal] = useState(false);
  const [showMvpModal, setShowMvpModal] = useState(false);

  const [newDate, setNewDate] = useState('2026-11-04');
  const [newTime, setNewTime] = useState('21:00 - 22:00');
  const [newCost, setNewCost] = useState(2800);
  const [newVenue, setNewVenue] = useState('Olimpiyat Halı Saha Tesisleri');

  return (
    <div className="space-y-4 pb-20">
      {/* SEGMENTED VIEW SWITCHER: ÖNÜMÜZDEKİ MAÇ vs HAFTALIK SEKME & GEÇMİŞ ARŞİVİ */}
      <div className="grid grid-cols-2 p-1 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg">
        <button
          onClick={() => setActiveView('upcoming')}
          className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 ${
            activeView === 'upcoming'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-300" />
          <span>{currentMatch.matchNumber}. Hafta (Önümüzdeki Maç)</span>
        </button>

        <button
          onClick={() => setActiveView('weeklyArchive')}
          className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 ${
            activeView === 'weeklyArchive'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-emerald-300" />
          <span>Haftalık Sekme & Geçmiş</span>
        </button>
      </div>

      {activeView === 'weeklyArchive' ? (
        <WeeklyArchiveManager onNavigateToSquad={onNavigateToSquad} />
      ) : (
        <>
          {/* HAFTALIK YÖNETİCİ AKILLI ÖZET PANELİ (11 METRİK & HIZLI GEÇİŞ) */}
          <WeeklyAdminSummaryDashboard onNavigateToSquad={onNavigateToSquad} />

          {/* 3 NUMARALI MODÜL: TARİH, TOPLAM GELEN SAYISI, HABER BEKLENENLER & ACİL ÇAĞRI */}
          <EmergencySubstituteFinder onNavigateToSquad={onNavigateToSquad} />

      {/* Maç Sonu İşlemleri & Takvim Çubuğu */}
      <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-white block">Maç İşlemleri & Takvim</span>
          <span className="text-[10px] text-slate-400">Skor, MVP ve takvim entegrasyonu</span>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setShowCalendarModal(true)}
            className="flex items-center space-x-1 py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-all active:scale-95"
            title="Google veya Apple Takvimine Ekle"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>Takvim</span>
          </button>

          <button
            onClick={() => setShowAttendanceModal(true)}
            className="flex items-center space-x-1 py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-all active:scale-95"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Yoklama</span>
          </button>

          <button
            onClick={() => setShowResultsModal(true)}
            className="flex items-center space-x-1 py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black shadow-md shadow-amber-500/20 transition-all active:scale-95"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Skor & MVP</span>
          </button>
        </div>
      </div>

      {/* MVP OF THE MATCH (Maçın Adamı) CARD */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border border-amber-500/30 space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Crown className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center space-x-1">
                <span>Haftanın MVP'si (Maçın Adamı)</span>
              </h3>
              <p className="text-[10px] text-slate-400">Grup üyeleri tarafından oylanan maçın yıldızı</p>
            </div>
          </div>

          <button
            onClick={() => setShowMvpModal(true)}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs shadow-md shadow-amber-500/20 transition-all active:scale-95"
          >
            Oy Ver
          </button>
        </div>

        {/* Current MVP Leader Display */}
        {(() => {
          const mvpVotes = currentMatch.mvpVotes || {};
          const totalVotes = Object.values(mvpVotes).reduce((a, b) => a + b, 0);
          const sortedCandidates = Object.entries(mvpVotes).sort((a, b) => b[1] - a[1]);
          const leaderEntry = sortedCandidates[0];
          const leader = leaderEntry ? playersMap[leaderEntry[0]] : null;

          if (!leader || totalVotes === 0) {
            return (
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 text-center">
                Henüz MVP oyu kullanılmadı. Maçın adamını belirlemek için ilk oyu verin!
              </div>
            );
          }

          const leaderVotes = leaderEntry[1];
          const leaderPercent = Math.round((leaderVotes / totalVotes) * 100);

          return (
            <div className="p-3 rounded-xl bg-slate-900/80 border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">👑</span>
                  <div>
                    <span className="font-black text-white block">{leader.name}</span>
                    <span className="text-[10px] text-amber-400 font-semibold">{leader.primaryPosition}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black text-amber-400 font-mono">{leaderVotes} Oy</span>
                  <span className="text-[10px] text-slate-400 block">(%{leaderPercent})</span>
                </div>
              </div>

              {/* Vote progress bar */}
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 rounded-full transition-all duration-500"
                  style={{ width: `${leaderPercent}%` }}
                />
              </div>
            </div>
          );
        })()}
      </div>

      {/* Action to create next match */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-bold text-slate-200">Geçmiş Maçlar & Skorlar</h3>
        <button
          onClick={() => setShowNewMatchModal(true)}
          className="flex items-center space-x-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Yeni Maç Planla</span>
        </button>
      </div>

      {/* Past Matches List */}
      <div className="space-y-2.5">
        {pastMatches.map(m => (
          <div
            key={m.id}
            onClick={() => setActiveView('weeklyArchive')}
            className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold text-slate-300 group-hover:text-emerald-400 transition-colors">
                {m.matchNumber}. Hafta • {new Date(m.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
              </span>
              <span className="text-[10px] text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                Detayları Gör ➔
              </span>
            </div>

            {/* Scoreboard */}
            <div className="flex items-center justify-between bg-slate-950/60 rounded-xl p-3 border border-slate-800/60 mb-2">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-xs font-bold text-white">{m.teamA.name}</span>
              </div>

              <div className="flex items-center space-x-2 font-mono font-black text-lg text-white">
                <span className={m.teamA.score! > m.teamB.score! ? 'text-emerald-400' : ''}>
                  {m.teamA.score ?? 0}
                </span>
                <span className="text-slate-500 text-sm">-</span>
                <span className={m.teamB.score! > m.teamA.score! ? 'text-emerald-400' : ''}>
                  {m.teamB.score ?? 0}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-white">{m.teamB.name}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              </div>
            </div>

            {m.notes && <p className="text-[11px] text-slate-400 italic line-clamp-1">"{m.notes}"</p>}
          </div>
        ))}
      </div>
      </>
      )}

      {/* ATTENDANCE MODAL */}
      {showAttendanceModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full max-h-[85vh] flex flex-col p-5 shadow-2xl animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div>
                <h3 className="font-bold text-white text-base">Maç Yoklaması</h3>
                <p className="text-xs text-slate-400">Ceza ve askı durumlarını otomatik günceller</p>
              </div>
              <button
                onClick={() => setShowAttendanceModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-2.5 pr-1 flex-1">
              {currentMatch.squad.map(playerId => {
                const player = playersMap[playerId];
                if (!player) return null;
                const status = currentMatch.attendance[playerId] || 'Beklemede';

                return (
                  <div
                    key={playerId}
                    className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-sm text-white">{player.name}</span>
                        {player.isJoker && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold">
                            Joker
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">
                        Ceza Puanı: <strong className="text-amber-400">{player.attendanceStats.penaltyPoints}</strong>
                      </span>
                    </div>

                    {/* Attendance Status Buttons */}
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => updateAttendance(playerId, 'Geldi')}
                        title="Geldi (0 Ceza)"
                        className={`p-1.5 rounded-lg border text-xs font-semibold transition-all ${
                          status === 'Geldi'
                            ? 'bg-emerald-500 border-emerald-400 text-white shadow-sm shadow-emerald-500/50'
                            : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => updateAttendance(playerId, 'Son dakika iptal')}
                        title="Son Dakika İptal (+1 Ceza Puanı)"
                        className={`p-1.5 rounded-lg border text-xs font-semibold transition-all ${
                          status === 'Son dakika iptal'
                            ? 'bg-amber-500 border-amber-400 text-black shadow-sm shadow-amber-500/50'
                            : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => updateAttendance(playerId, 'Gelmedi')}
                        title="Gelmedi (+2 Ceza Puanı)"
                        className={`p-1.5 rounded-lg border text-xs font-semibold transition-all ${
                          status === 'Gelmedi'
                            ? 'bg-rose-500 border-rose-400 text-white shadow-sm shadow-rose-500/50'
                            : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowAttendanceModal(false)}
              className="mt-4 w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all"
            >
              Tamamla
            </button>
          </div>
        </div>
      )}

      {/* MATCH RESULTS MODAL (SCORE + MVP + FAIR PLAY + WHATSAPP) */}
      {showResultsModal && (
        <MatchResultsModal onClose={() => setShowResultsModal(false)} />
      )}

      {/* ADD TO CALENDAR MODAL */}
      {showCalendarModal && (
        <AddToCalendarModal
          match={currentMatch}
          onClose={() => setShowCalendarModal(false)}
        />
      )}

      {/* NEW MATCH MODAL */}
      {showNewMatchModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div>
              <h3 className="font-bold text-white text-base">Yeni Hafta Maçı Planla</h3>
              <p className="text-xs text-slate-400">Tarih ve saha rezervasyon bilgilerini girin</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Maç Tarihi</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Saat Aralığı</label>
                <input
                  type="text"
                  value={newTime}
                  onChange={e => setNewTime(e.target.value)}
                  placeholder="21:00 - 22:00"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Saha Ücreti (TL)</label>
                <input
                  type="number"
                  value={newCost}
                  onChange={e => setNewCost(parseInt(e.target.value) || 2800)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Saha / Tesis Adı</label>
                <input
                  type="text"
                  value={newVenue}
                  onChange={e => setNewVenue(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setShowNewMatchModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
              >
                Vazgeç
              </button>
              <button
                onClick={() => {
                  createNewMatch(newDate, newTime, newCost, newVenue);
                  setShowNewMatchModal(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                Oluştur
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MVP VOTING MODAL */}
      {showMvpModal && (
        <MvpVotingModal onClose={() => setShowMvpModal(false)} />
      )}
    </div>
  );
};
