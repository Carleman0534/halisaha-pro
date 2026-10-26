import React, { useState, useRef, useMemo } from 'react';
import {
  Wand2,
  Share2,
  Check,
  AlertOctagon,
  ArrowLeftRight,
  Sliders,
  Shield,
  Layers,
  ChevronDown,
  UserCheck,
  RotateCcw,
  RefreshCw,
  Camera,
  Download,
  Image as ImageIcon,
  Calendar,
  Trophy,
  Sparkles,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import { generateWhatsAppShareText } from '../../utils/calculations';
import { Position } from '../../types';

export const SquadManager: React.FC = () => {
  const {
    currentMatch,
    pastMatches,
    players,
    playersMap,
    autoBalanceSquad,
    syncSquadFromAttendees,
    updateSquad,
    setMatchFormat,
    assignPlayerToTeam,
    updatePlayerPositionInTeam,
    setTeamFormation,
    isAdmin,
    isGuest,
  } = useApp();

  const [copiedToast, setCopiedToast] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pitch' | 'manualTeam' | 'poolSelect'>('pitch');

  // Selected week match ID for week switching
  const [selectedMatchId, setSelectedMatchId] = useState<string>(currentMatch.id);
  const isViewingCurrent = selectedMatchId === currentMatch.id;
  const activeMatch = isViewingCurrent
    ? currentMatch
    : (pastMatches.find(m => m.id === selectedMatchId) || currentMatch);

  // Selected player on pitch for tactical customization
  const [pitchPlayerModal, setPitchPlayerModal] = useState<{
    playerId: string;
    team: 'teamA' | 'teamB';
  } | null>(null);

  const [selectedPlayerToSwap, setSelectedPlayerToSwap] = useState<{
    playerId: string;
    team: 'teamA' | 'teamB';
  } | null>(null);

  // Attendees who marked 'Geliyor' or 'Geldi' for the upcoming match
  const comingCount = useMemo(() => {
    return Object.values(currentMatch.attendance || {}).filter(
      st => st === 'Geliyor' || st === 'Geldi'
    ).length;
  }, [currentMatch.attendance]);

  const handleSyncAttendees = () => {
    if (!isAdmin) return;
    const res = syncSquadFromAttendees();
    if (res.success) {
      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#3b82f6', '#f59e0b'],
        });
      } catch {}
      setSyncToast(`🎉 Kadro, bu haftanın teyit veren ${res.count} oyuncusundan başarıyla oluşturuldu ve dengelendi!`);
      setTimeout(() => setSyncToast(null), 4000);
    } else {
      alert(res.message || 'Gelen oyuncu bulunamadı.');
    }
  };

  // Active match format (default 7v7, 14 players)
  const currentFormat = activeMatch.matchFormat || '7v7';
  const targetCount = activeMatch.targetSquadCount || (currentFormat === '5v5' ? 10 : currentFormat === '6v6' ? 12 : currentFormat === '8v8' ? 16 : 14);
  const perTeamTarget = Math.round(targetCount / 2);

  const powerDiff = Math.abs(activeMatch.teamA.totalPower - activeMatch.teamB.totalPower).toFixed(1);

  // Available formations depending on format
  const getFormationsForFormat = (fmt: string) => {
    switch (fmt) {
      case '5v5':
        return ['1-2-1', '2-1-1', '1-1-2'];
      case '6v6':
        return ['2-2-1', '2-1-2', '1-3-1'];
      case '8v8':
        return ['3-3-1', '2-4-1', '3-2-2'];
      case '7v7':
      default:
        return ['2-3-1', '3-2-1', '2-2-2', '1-4-1'];
    }
  };

  const formations = getFormationsForFormat(currentFormat);
  const teamAFormation = activeMatch.teamA.formation || formations[0];
  const teamBFormation = activeMatch.teamB.formation || formations[0];

  // Auto balance trigger
  const handleAutoBalance = () => {
    if (!isViewingCurrent) {
      setSelectedMatchId(currentMatch.id);
    }
    autoBalanceSquad();
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#ef4444', '#3b82f6', '#10b981'],
      });
    } catch {}
  };

  // WhatsApp share
  const handleShareWhatsApp = () => {
    const text = generateWhatsAppShareText(activeMatch, playersMap);
    navigator.clipboard.writeText(text);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 3000);
  };

  const [isExportingImage, setIsExportingImage] = useState(false);
  const pitchContainerRef = useRef<HTMLDivElement>(null);

  // Export tactical field as PNG image and share/download
  const handleExportSquadImage = async () => {
    if (!pitchContainerRef.current) return;
    setIsExportingImage(true);
    try {
      const dataUrl = await toPng(pitchContainerRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#020617',
      });

      // Try native Web Share API with image file for mobile WhatsApp sharing
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], `halisaha-kadro-${activeMatch.date}.png`, { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `⚽ Halı Saha Kadro Dizilimi (${currentFormat})`,
            text: `⚽ *${activeMatch.venueName} | ${activeMatch.time}*\nKırmızı Takım vs Mavi Takım Kadro Dizilimi!`,
            files: [file],
          });
          confetti({ particleCount: 35, spread: 60, origin: { y: 0.7 } });
          return;
        }
      } catch (shareErr) {
        console.log('Direct image share fallback to download:', shareErr);
      }

      // Download file fallback
      const link = document.createElement('a');
      link.download = `halisaha-kadro-${activeMatch.date}.png`;
      link.href = dataUrl;
      link.click();
      confetti({ particleCount: 35, spread: 60, origin: { y: 0.7 } });
    } catch (err) {
      console.warn('Squad image export error:', err);
    } finally {
      setIsExportingImage(false);
    }
  };

  // Toggle player selection in squad
  const togglePlayerInSquad = (playerId: string) => {
    if (!isAdmin) return;
    const isAlreadyIn = currentMatch.squad.includes(playerId);
    let nextSquad: string[];

    if (isAlreadyIn) {
      nextSquad = currentMatch.squad.filter(id => id !== playerId);
    } else {
      if (currentMatch.squad.length >= targetCount) {
        alert(`Kadro hedefi ${targetCount} kişidir. Önce bir oyuncuyu yedeğe alın.`);
        return;
      }
      nextSquad = [...currentMatch.squad, playerId];
    }
    updateSquad(nextSquad);
  };

  // Handle tactical chip click on pitch
  const handleChipClick = (playerId: string, team: 'teamA' | 'teamB') => {
    if (!isAdmin) {
      // Guests cannot move players or open tactical management
      return;
    }
    if (selectedPlayerToSwap) {
      if (selectedPlayerToSwap.playerId === playerId) {
        setSelectedPlayerToSwap(null);
      } else {
        // Perform swap
        const p1Id = selectedPlayerToSwap.playerId;
        const p2Id = playerId;
        const p1Team = selectedPlayerToSwap.team;
        const p2Team = team;

        if (p1Team === p2Team) {
          // Same team swap
          setSelectedPlayerToSwap(null);
        } else {
          // Cross-team swap
          const p1 = playersMap[p1Id];
          const p2 = playersMap[p2Id];

          assignPlayerToTeam(p1Id, p2Team);
          assignPlayerToTeam(p2Id, p1Team);
          setSelectedPlayerToSwap(null);
        }
      }
    } else {
      setPitchPlayerModal({ playerId, team });
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Toast Notification */}
      {copiedToast && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2 rounded-full font-bold text-xs shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-top">
          <Check className="w-4 h-4" />
          <span>WhatsApp Kadro Metni Kopyalandı!</span>
        </div>
      )}

      {syncToast && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl font-bold text-xs shadow-2xl flex items-center space-x-2 border border-emerald-400 animate-in fade-in slide-in-from-top max-w-sm text-center">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
          <span>{syncToast}</span>
        </div>
      )}

      {/* HAFTA SEÇİCİ (WEEK SELECTOR) */}
      <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>Haftalık Kadro Seçici</span>
          </span>
          <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700">
            {isViewingCurrent ? '🔥 Önümüzdeki Maç' : '📚 Geçmiş Hafta'}
          </span>
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700">
          <button
            onClick={() => setSelectedMatchId(currentMatch.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
              isViewingCurrent
                ? 'bg-emerald-600 border border-emerald-400 text-white shadow-md shadow-emerald-600/30'
                : 'bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
            <span>{currentMatch.matchNumber}. Hafta (Önümüzdeki Maç)</span>
          </button>

          {pastMatches.map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedMatchId(m.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                selectedMatchId === m.id
                  ? 'bg-amber-600 border border-amber-400 text-white shadow-md shadow-amber-600/30'
                  : 'bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-white'
              }`}
            >
              <span>{m.matchNumber}. Hafta</span>
              <span className="text-[10px] opacity-75">
                ({new Date(m.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })})
              </span>
              {m.status === 'completed' && <span className="text-[10px]">🏆</span>}
            </button>
          ))}
        </div>
      </div>

      {/* IF VIEWING PAST MATCH: ARCHIVE BANNER */}
      {!isViewingCurrent && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center space-x-2">
            <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold text-white block">
                {activeMatch.matchNumber}. Hafta Geçmiş Maç Kadrosu ({activeMatch.date})
              </span>
              <span>
                Skor: <strong className="text-white">{activeMatch.teamA.score ?? 0} - {activeMatch.teamB.score ?? 0}</strong>
                {activeMatch.mvpWinnerId && playersMap[activeMatch.mvpWinnerId] && (
                  <span className="ml-1.5 text-amber-300">• MVP: ⭐ {playersMap[activeMatch.mvpWinnerId].name}</span>
                )}
              </span>
            </div>
          </div>
          <button
            onClick={() => setSelectedMatchId(currentMatch.id)}
            className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shrink-0 active:scale-95 transition-all"
          >
            Önümüzdeki Maça Dön
          </button>
        </div>
      )}

      {/* IF VIEWING CURRENT MATCH: GELENLERDEN KADRO ÇEK CARD */}
      {isViewingCurrent && (
        <div className="p-3.5 bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs font-black text-white flex items-center space-x-1.5">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>{currentMatch.matchNumber}. Hafta Gelenleri ({comingCount} Kişi)</span>
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Yoklamada 'Geliyor' teyidi veren {comingCount} oyuncudan kadroyu çek & otomatik dengele
            </span>
          </div>

          <button
            onClick={handleSyncAttendees}
            disabled={!isAdmin}
            className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-black text-xs shadow-md shadow-emerald-500/20 flex items-center space-x-1.5 active:scale-95 transition-all shrink-0 ml-2"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Gelenlerden Kadro Çek ({comingCount})</span>
          </button>
        </div>
      )}

      {/* Guest Mode Notice */}
      {!isAdmin && (
        <div className="flex items-center space-x-2.5 p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs">
          <Shield className="w-4 h-4 text-blue-400 shrink-0" />
          <div>
            <strong className="text-white block font-semibold">Misafir İzleme Modu</strong>
            <span>Kadro ve taktik saha salt okunurdur. Kadroları dengeleme ve oyuncu transferlerini sadece Konsey Yöneticileri yapabilir.</span>
          </div>
        </div>
      )}

      {/* MATCH FORMAT SELECTOR (5v5, 6v6, 7v7, 8v8) */}
      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Haftalık Maç Formatı (Kaça Kaç)</span>
          </span>
          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            Kişi Başı: {activeMatch.costPerPlayer} ₺
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {(['5v5', '6v6', '7v7', '8v8'] as const).map(fmt => {
            const isFmtActive = currentFormat === fmt;
            const count = fmt === '5v5' ? 10 : fmt === '6v6' ? 12 : fmt === '8v8' ? 16 : 14;

            return (
              <button
                key={fmt}
                disabled={!isAdmin}
                onClick={() => isAdmin && setMatchFormat(fmt)}
                className={`py-2 px-1 rounded-xl text-center border transition-all ${
                  !isAdmin ? 'cursor-default opacity-85 ' : ''
                }${
                  isFmtActive
                    ? 'bg-emerald-600 border-emerald-400 text-white shadow-md shadow-emerald-600/30 font-black'
                    : 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:text-white font-bold'
                }`}
              >
                <div className="text-xs">{fmt}</div>
                <div className="text-[10px] opacity-80">{count} Kişi</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* POWER BALANCE & ACTION BUTTONS */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-white flex items-center space-x-1.5">
              <span>Takım Güç Karşılaştırması</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Manuel veya otomatik seçimle takımları ayarlayın.
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Güç Farkı</span>
            <span
              className={`text-xs font-black px-2 py-0.5 rounded-md ${
                Number(powerDiff) <= 0.8
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {powerDiff} Puan
            </span>
          </div>
        </div>

        {/* Comparison Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-rose-400 flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>
                {activeMatch.teamA.name} ({activeMatch.teamA.players.length}/{perTeamTarget}) •{' '}
                {activeMatch.teamA.totalPower}p
              </span>
            </span>
            <span className="text-blue-400 flex items-center space-x-1">
              <span>
                {activeMatch.teamB.name} ({activeMatch.teamB.players.length}/{perTeamTarget}) •{' '}
                {activeMatch.teamB.totalPower}p
              </span>
              <span className="w-2 h-2 rounded-full bg-blue-500" />
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 flex overflow-hidden">
            <div
              className="bg-rose-500 h-full transition-all duration-500"
              style={{
                width: `${
                  (activeMatch.teamA.totalPower /
                    (activeMatch.teamA.totalPower + activeMatch.teamB.totalPower || 1)) *
                  100
                }%`,
              }}
            />
            <div
              className="bg-blue-500 h-full transition-all duration-500"
              style={{
                width: `${
                  (activeMatch.teamB.totalPower /
                    (activeMatch.teamA.totalPower + activeMatch.teamB.totalPower || 1)) *
                  100
                }%`,
              }}
            />
          </div>
        </div>

        {/* Buttons */}
        <div className={`grid grid-cols-1 ${isAdmin ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-2 pt-1`}>
          {isAdmin && (
            <button
              onClick={handleAutoBalance}
              className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
            >
              <Wand2 className="w-4 h-4" />
              <span>Otomatik Dengele</span>
            </button>
          )}
          <button
            onClick={handleShareWhatsApp}
            className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition-all active:scale-95"
          >
            <Share2 className="w-4 h-4" />
            <span>WhatsApp Metni</span>
          </button>
          <button
            onClick={handleExportSquadImage}
            disabled={isExportingImage}
            className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition-all active:scale-95"
          >
            <Camera className="w-4 h-4" />
            <span>{isExportingImage ? 'Hazırlanıyor...' : '📸 Kadro Resmi (PNG)'}</span>
          </button>
        </div>
      </div>

      {/* 3 SUB-TABS: PITCH, MANUAL ASSIGNMENT, POOL SELECT (Admins only see full tabs) */}
      {isAdmin && (
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('pitch')}
            className={`flex-1 py-2 rounded-lg transition-all ${
              activeTab === 'pitch' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Saha Dizilimi
          </button>
          <button
            onClick={() => setActiveTab('manualTeam')}
            className={`flex-1 py-2 rounded-lg transition-all ${
              activeTab === 'manualTeam' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Manuel Takımlar
          </button>
          <button
            onClick={() => setActiveTab('poolSelect')}
            className={`flex-1 py-2 rounded-lg transition-all ${
              activeTab === 'poolSelect' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Havuz ({activeMatch.squad.length}/{targetCount})
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 1: INTERACTIVE TACTICAL PITCH WITH FORMATION SELECTION */}
      {/* ============================================================ */}
      {activeTab === 'pitch' && (
        <div className="space-y-3">
          {/* Formation Pickers for both teams */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-xl bg-slate-900 border border-rose-900/40 flex items-center justify-between">
              <span className="font-bold text-rose-400">Kırmızı Diziliş:</span>
              <select
                aria-label="Kırmızı Takım Dizilişi"
                disabled={!isAdmin}
                value={teamAFormation}
                onChange={e => setTeamFormation('teamA', e.target.value)}
                className={`bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 font-bold text-xs focus:outline-none ${!isAdmin ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {formations.map(f => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-2 rounded-xl bg-slate-900 border border-blue-900/40 flex items-center justify-between">
              <span className="font-bold text-blue-400">Mavi Diziliş:</span>
              <select
                aria-label="Mavi Takım Dizilişi"
                disabled={!isAdmin}
                value={teamBFormation}
                onChange={e => setTeamFormation('teamB', e.target.value)}
                className={`bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 font-bold text-xs focus:outline-none ${!isAdmin ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {formations.map(f => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Swap banner */}
          {selectedPlayerToSwap && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ArrowLeftRight className="w-4 h-4 animate-spin" />
                <span>
                  <strong>{playersMap[selectedPlayerToSwap.playerId]?.name}</strong> seçildi. Takas edilecek
                  oyuncuya dokunun.
                </span>
              </div>
              <button
                onClick={() => setSelectedPlayerToSwap(null)}
                className="font-bold underline text-white ml-2"
              >
                İptal
              </button>
            </div>
          )}

          {/* HALI SAHA TACTICAL FIELD */}
          <div
            ref={pitchContainerRef}
            className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/40 shadow-2xl pitch-bg p-3 min-h-[480px] flex flex-col justify-between"
          >
            {/* Field Lines */}
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-center items-center">
              <div className="w-[96%] h-[96%] border border-white/20 rounded-xl flex flex-col justify-between items-center relative">
                {/* Penalty Top */}
                <div className="w-32 h-14 border-b border-x border-white/20 rounded-b-lg absolute top-0" />
                {/* Halfway */}
                <div className="w-full border-b border-white/20 absolute top-1/2 -translate-y-1/2 flex items-center justify-center">
                  <div className="w-20 h-20 border border-white/20 rounded-full" />
                </div>
                {/* Penalty Bottom */}
                <div className="w-32 h-14 border-t border-x border-white/20 rounded-t-lg absolute bottom-0" />
              </div>
            </div>

            {/* TEAM A (Kırmızı Takım) - Top Half */}
            <div className="relative z-10 space-y-2">
              <div className="flex items-center justify-between px-2">
                <span className="text-[11px] font-black uppercase text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/30">
                  {activeMatch.teamA.name} ({activeMatch.teamA.players.length}) • {teamAFormation}
                </span>
                <span className="text-[10px] text-white/60">{isAdmin && isViewingCurrent ? 'Dokunarak Yönet' : 'Salt Okunur'}</span>
              </div>

              {/* GK */}
              <div className="flex justify-center mb-1">
                {activeMatch.teamA.players
                  .filter(p => p.position === 'Kaleci')
                  .map(p => (
                    <PlayerPitchChip
                      key={p.playerId}
                      player={playersMap[p.playerId]}
                      position={p.position}
                      score={p.score}
                      teamColor="rose"
                      isSelected={selectedPlayerToSwap?.playerId === p.playerId}
                      onClick={() => handleChipClick(p.playerId, 'teamA')}
                    />
                  ))}
              </div>

              {/* DEF */}
              <div className="flex justify-around px-4">
                {activeMatch.teamA.players
                  .filter(p => p.position === 'Defans')
                  .map(p => (
                    <PlayerPitchChip
                      key={p.playerId}
                      player={playersMap[p.playerId]}
                      position={p.position}
                      score={p.score}
                      teamColor="rose"
                      isSelected={selectedPlayerToSwap?.playerId === p.playerId}
                      onClick={() => handleChipClick(p.playerId, 'teamA')}
                    />
                  ))}
              </div>

              {/* MID & WNG */}
              <div className="flex justify-around px-2">
                {activeMatch.teamA.players
                  .filter(p => p.position === 'Orta saha' || p.position === 'Kanat')
                  .map(p => (
                    <PlayerPitchChip
                      key={p.playerId}
                      player={playersMap[p.playerId]}
                      position={p.position}
                      score={p.score}
                      teamColor="rose"
                      isSelected={selectedPlayerToSwap?.playerId === p.playerId}
                      onClick={() => handleChipClick(p.playerId, 'teamA')}
                    />
                  ))}
              </div>

              {/* FWD */}
              <div className="flex justify-around px-6">
                {activeMatch.teamA.players
                  .filter(p => p.position === 'Forvet')
                  .map(p => (
                    <PlayerPitchChip
                      key={p.playerId}
                      player={playersMap[p.playerId]}
                      position={p.position}
                      score={p.score}
                      teamColor="rose"
                      isSelected={selectedPlayerToSwap?.playerId === p.playerId}
                      onClick={() => handleChipClick(p.playerId, 'teamA')}
                    />
                  ))}
              </div>
            </div>

            {/* Center Field Spacer */}
            <div className="py-2 text-center relative z-10">
              <span className="text-[10px] font-bold tracking-widest text-white/40 uppercase bg-black/40 px-2.5 py-0.5 rounded-full">
                ORTA SAHA
              </span>
            </div>

            {/* TEAM B (Beyaz/Mavi Takım) - Bottom Half */}
            <div className="relative z-10 space-y-2">
              {/* FWD */}
              <div className="flex justify-around px-6">
                {activeMatch.teamB.players
                  .filter(p => p.position === 'Forvet')
                  .map(p => (
                    <PlayerPitchChip
                      key={p.playerId}
                      player={playersMap[p.playerId]}
                      position={p.position}
                      score={p.score}
                      teamColor="blue"
                      isSelected={selectedPlayerToSwap?.playerId === p.playerId}
                      onClick={() => handleChipClick(p.playerId, 'teamB')}
                    />
                  ))}
              </div>

              {/* MID & WNG */}
              <div className="flex justify-around px-2">
                {activeMatch.teamB.players
                  .filter(p => p.position === 'Orta saha' || p.position === 'Kanat')
                  .map(p => (
                    <PlayerPitchChip
                      key={p.playerId}
                      player={playersMap[p.playerId]}
                      position={p.position}
                      score={p.score}
                      teamColor="blue"
                      isSelected={selectedPlayerToSwap?.playerId === p.playerId}
                      onClick={() => handleChipClick(p.playerId, 'teamB')}
                    />
                  ))}
              </div>

              {/* DEF */}
              <div className="flex justify-around px-4">
                {activeMatch.teamB.players
                  .filter(p => p.position === 'Defans')
                  .map(p => (
                    <PlayerPitchChip
                      key={p.playerId}
                      player={playersMap[p.playerId]}
                      position={p.position}
                      score={p.score}
                      teamColor="blue"
                      isSelected={selectedPlayerToSwap?.playerId === p.playerId}
                      onClick={() => handleChipClick(p.playerId, 'teamB')}
                    />
                  ))}
              </div>

              {/* GK */}
              <div className="flex justify-center mt-1">
                {activeMatch.teamB.players
                  .filter(p => p.position === 'Kaleci')
                  .map(p => (
                    <PlayerPitchChip
                      key={p.playerId}
                      player={playersMap[p.playerId]}
                      position={p.position}
                      score={p.score}
                      teamColor="blue"
                      isSelected={selectedPlayerToSwap?.playerId === p.playerId}
                      onClick={() => handleChipClick(p.playerId, 'teamB')}
                    />
                  ))}
              </div>

              <div className="flex items-center justify-between px-2 pt-1">
                <span className="text-[11px] font-black uppercase text-blue-300 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-500/30">
                  {activeMatch.teamB.name} ({activeMatch.teamB.players.length}) • {teamBFormation}
                </span>
                <span className="text-[10px] text-white/60">{isAdmin && isViewingCurrent ? 'Dokunarak Yönet' : 'Salt Okunur'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: MANUAL TEAM ASSIGNMENT (Kimin Hangi Takımda Olduğu)   */}
      {/* ============================================================ */}
      {activeTab === 'manualTeam' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400 px-1">
            Her oyuncunun yanındaki butonlara basarak doğrudan <strong>Kırmızı</strong>, <strong>Mavi</strong> veya <strong>Yedek</strong> olarak atayabilirsiniz.
          </p>

          <div className="space-y-2">
            {players.map(player => {
              const inTeamA = activeMatch.teamA.players.some(p => p.playerId === player.id);
              const inTeamB = activeMatch.teamB.players.some(p => p.playerId === player.id);
              const isBench = !inTeamA && !inTeamB;

              return (
                <div
                  key={player.id}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    inTeamA
                      ? 'bg-rose-950/30 border-rose-800/60'
                      : inTeamB
                      ? 'bg-blue-950/30 border-blue-800/60'
                      : 'bg-slate-900 border-slate-800 opacity-70'
                  }`}
                >
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-sm text-white">{player.name}</span>
                      {player.isJoker && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold">
                          Joker
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">
                      {player.primaryPosition} • {player.finalScore} Puan
                    </span>
                  </div>

                  {/* 3-Way Assignment Segmented Buttons */}
                  <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                    <button
                      onClick={() => assignPlayerToTeam(player.id, 'teamA')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        inTeamA
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-rose-400'
                      }`}
                    >
                      Kırmızı
                    </button>
                    <button
                      onClick={() => assignPlayerToTeam(player.id, 'teamB')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        inTeamB
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-blue-400'
                      }`}
                    >
                      Mavi
                    </button>
                    <button
                      onClick={() => assignPlayerToTeam(player.id, 'bench')}
                      className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                        isBench
                          ? 'bg-slate-700 text-slate-200'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      Yedek
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: POOL SELECTION (Haftalık Havuz Belirleme)              */}
      {/* ============================================================ */}
      {activeTab === 'poolSelect' && (
        <div className="space-y-3">
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 flex items-center justify-between">
            <span>
              Format Hedefi: <strong className="text-white">{currentFormat} ({targetCount} Kişi)</strong>
            </span>
            <span>
              Seçili: <strong className="text-emerald-400">{activeMatch.squad.length} Kişi</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {players.map(p => {
              const isSelected = activeMatch.squad.includes(p.id);
              const isSuspended = p.attendanceStats.isSuspended;

              return (
                <div
                  key={p.id}
                  onClick={() => !isSuspended && togglePlayerInSquad(p.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    isSuspended
                      ? 'bg-rose-950/30 border-rose-900/60 opacity-60 cursor-not-allowed'
                      : isSelected
                      ? 'bg-emerald-950/40 border-emerald-500/50 cursor-pointer shadow-md'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                        isSelected
                          ? 'bg-emerald-500 border-emerald-400 text-white'
                          : 'border-slate-600 bg-slate-800'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-sm font-bold text-white">{p.name}</span>
                        {p.isJoker && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold">
                            Joker
                          </span>
                        )}
                        {isSuspended && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500 text-white font-black flex items-center space-x-0.5">
                            <AlertOctagon className="w-2.5 h-2.5" />
                            <span>ASKIDA</span>
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 font-medium">
                        {p.primaryPosition} • Nihai: <strong className="text-emerald-400">{p.finalScore}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="text-right text-xs">
                    {p.attendanceStats.penaltyPoints > 0 ? (
                      <span className="text-rose-400 font-bold">
                        {p.attendanceStats.penaltyPoints} Ceza
                      </span>
                    ) : (
                      <span className="text-slate-500 font-medium">Cezasız</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TACTICAL PLAYER CONTROL MODAL (Sahadaki Oyuncuya Tıklayınca) */}
      {/* ============================================================ */}
      {pitchPlayerModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">
                  SAHA İÇİ MEVKİ & TAKIM YÖNETİMİ
                </span>
                <h3 className="text-base font-black text-white">
                  {playersMap[pitchPlayerModal.playerId]?.name}
                </h3>
              </div>
              <button
                onClick={() => setPitchPlayerModal(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {/* Quick Actions */}
            <div className="space-y-3">
              {/* Change Team Button */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Takım Değiştir</label>
                <button
                  onClick={() => {
                    const targetTeam = pitchPlayerModal.team === 'teamA' ? 'teamB' : 'teamA';
                    assignPlayerToTeam(pitchPlayerModal.playerId, targetTeam);
                    setPitchPlayerModal(null);
                  }}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                    pitchPlayerModal.team === 'teamA'
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md'
                      : 'bg-rose-600 hover:bg-rose-500 text-white shadow-md'
                  }`}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>
                    {pitchPlayerModal.team === 'teamA' ? 'Mavi Takıma Geçir' : 'Kırmızı Takıma Geçir'}
                  </span>
                </button>
              </div>

              {/* Change Position On Field */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Sahadaki Mevkisini Değiştir
                </label>
                <div className="grid grid-cols-5 gap-1">
                  {(['Kaleci', 'Defans', 'Orta saha', 'Kanat', 'Forvet'] as Position[]).map(pos => {
                    const currentPos = (pitchPlayerModal.team === 'teamA'
                      ? activeMatch.teamA.players
                      : activeMatch.teamB.players
                    ).find(p => p.playerId === pitchPlayerModal.playerId)?.position;

                    const isCurrent = currentPos === pos;

                    return (
                      <button
                        key={pos}
                        onClick={() => {
                          updatePlayerPositionInTeam(pitchPlayerModal.playerId, pitchPlayerModal.team, pos);
                          setPitchPlayerModal(null);
                        }}
                        className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition-all ${
                          isCurrent
                            ? 'bg-emerald-600 border-emerald-400 text-white shadow-sm'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {pos.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Put to bench */}
              <div className="pt-1">
                <button
                  onClick={() => {
                    assignPlayerToTeam(pitchPlayerModal.playerId, 'bench');
                    setPitchPlayerModal(null);
                  }}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-rose-400 font-bold text-xs"
                >
                  Kadro Dışına / Yedeğe Al
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Subcomponent for each tactical chip on the field
interface PlayerPitchChipProps {
  player?: any;
  position: string;
  score: number;
  teamColor: 'rose' | 'blue';
  isSelected: boolean;
  onClick: () => void;
}

const PlayerPitchChip: React.FC<PlayerPitchChipProps> = ({
  player,
  position,
  score,
  teamColor,
  isSelected,
  onClick,
}) => {
  const name = player ? player.name.split(' ')[0] : 'Oyuncu';

  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-center justify-center p-1.5 rounded-xl backdrop-blur-md border transition-all transform active:scale-90 ${
        isSelected
          ? 'bg-amber-400 text-black border-amber-300 ring-4 ring-amber-400/50 scale-105 z-20'
          : teamColor === 'rose'
          ? 'bg-rose-950/80 text-white border-rose-500/50 hover:border-rose-400'
          : 'bg-blue-950/80 text-white border-blue-500/50 hover:border-blue-400'
      }`}
    >
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] shadow-sm mb-0.5 ${
          teamColor === 'rose' ? 'bg-rose-600 text-white' : 'bg-blue-600 text-white'
        }`}
      >
        {position === 'Kaleci' ? 'GK' : score.toFixed(1)}
      </div>

      <span className="text-[10px] font-black tracking-tight truncate max-w-[62px]">{name}</span>
      <span className="text-[8px] text-white/60 font-semibold">{position.slice(0, 3)}</span>
    </button>
  );
};
