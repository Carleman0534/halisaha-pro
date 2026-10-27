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
  Lock,
  Unlock,
  History,
  Save,
  ShieldAlert,
  Clock,
  User,
  X,
  Crown,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import { generateWhatsAppShareText } from '../../utils/calculations';
import { Position, SquadVersion } from '../../types';
import { canViewRoster, canViewRatings } from '../../utils/permissions';
import { SquadVisualCardModal } from './SquadVisualCardModal';
import { AuthRoleModal } from '../auth/AuthRoleModal';

export const SquadManager: React.FC = () => {
  const {
    currentMatch,
    pastMatches,
    players,
    playersMap,
    autoBalanceSquad,
    syncSquadFromAttendees,
    updateSquad,
    saveSquadForMatch,
    restoreSquadVersion,
    toggleSquadLock,
    setMatchFormat,
    assignPlayerToTeam,
    updatePlayerPositionInTeam,
    setTeamFormation,
    updateAttendance,
    currentUser,
    isAdmin,
    isCouncil,
    isPlayer,
    isGuest,
  } = useApp();

  const [copiedToast, setCopiedToast] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pitch' | 'manualTeam' | 'poolSelect'>('pitch');
  const [showVersionHistoryModal, setShowVersionHistoryModal] = useState(false);
  const [showVisualCardModal, setShowVisualCardModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [formatNotice, setFormatNotice] = useState<string | null>(null);

  // Selected week match ID for week switching
  const [selectedMatchId, setSelectedMatchId] = useState<string>(currentMatch.id);
  const isViewingCurrent = selectedMatchId === currentMatch.id;
  const activeMatch = isViewingCurrent
    ? currentMatch
    : pastMatches.find(m => m.id === selectedMatchId) || currentMatch;

  // Selected player on pitch for tactical customization
  const [pitchPlayerModal, setPitchPlayerModal] = useState<{
    playerId: string;
    team: 'teamA' | 'teamB';
  } | null>(null);

  const [selectedPlayerToSwap, setSelectedPlayerToSwap] = useState<{
    playerId: string;
    team: 'teamA' | 'teamB';
  } | null>(null);

  // Access check per Rule 5: Misafirler ve Oyuncular katılım durumuna göre kadroyu görebilir
  const rosterAccess = canViewRoster(currentUser, activeMatch);
  const canSeeRatings = canViewRatings(currentUser);
  const isFinalized = activeMatch.squadLockStatus === 'finalized';

  // Attendees who marked 'Geliyor' or 'Geldi' for the upcoming match
  const comingCount = useMemo(() => {
    return Object.values(currentMatch.attendance || {}).filter(
      st => st === 'Geliyor' || st === 'Geldi'
    ).length;
  }, [currentMatch.attendance]);

  const handleSyncAttendees = () => {
    if (!isAdmin && !isCouncil) {
      setShowAuthModal(true);
      return;
    }
    const res = syncSquadFromAttendees(activeMatch.id);
    if (res.success) {
      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#3b82f6', '#f59e0b'],
        });
      } catch {}
      setSyncToast(
        `🎉 Kadro, bu haftanın teyit veren ${res.count} oyuncusundan başarıyla oluşturuldu ve dengelendi!`
      );
      setTimeout(() => setSyncToast(null), 4000);
    } else {
      alert(res.message || 'Gelen oyuncu bulunamadı.');
    }
  };

  // Handle format selection (5v5, 6v6, 7v7, 8v8) with rich feedback and auth fallback
  const handleSelectFormat = (fmt: '5v5' | '6v6' | '7v7' | '8v8') => {
    if (!isAdmin && !isCouncil) {
      setFormatNotice('Maç formatını (5v5, 6v6, 7v7, 8v8) değiştirmek için Yönetici veya Konsey girişi yapınız.');
      setShowAuthModal(true);
      return;
    }

    if (isFinalized) {
      setFormatNotice('Kadro kesinleştiği için kilitlidir. Formatı değiştirmek için önce yukarıdaki "Kilidi Aç" butonuna basınız.');
      setTimeout(() => setFormatNotice(null), 4000);
      return;
    }

    setMatchFormat(fmt, activeMatch.id);
    const countMap = { '5v5': 10, '6v6': 12, '7v7': 14, '8v8': 16 };
    setFormatNotice(`🎯 Maç formatı başarıyla ${fmt} (${countMap[fmt]} Kişi) olarak ayarlandı!`);
    try {
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.5 } });
    } catch {}
    setTimeout(() => setFormatNotice(null), 3500);
  };

  // Active match format (default 7v7, 14 players)
  const currentFormat = activeMatch.matchFormat || '7v7';
  const targetCount =
    activeMatch.targetSquadCount ||
    (currentFormat === '5v5'
      ? 10
      : currentFormat === '6v6'
      ? 12
      : currentFormat === '8v8'
      ? 16
      : 14);
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
    if (isFinalized && !isAdmin) {
      alert('Kadro kesinleştiği için değiştirilemez.');
      return;
    }
    autoBalanceSquad(activeMatch.id);
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#ef4444', '#3b82f6', '#10b981'],
      });
    } catch {}
    setSaveToast('Kadro otomatik olarak dengelendi ve kaydedildi ✓');
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Explicit Save Squad
  const handleExplicitSaveSquad = () => {
    const res = saveSquadForMatch(
      activeMatch.id,
      activeMatch.teamA,
      activeMatch.teamB,
      activeMatch.squad,
      activeMatch.squadLockStatus,
      'Yönetici tarafından kalıcı olarak kaydedildi'
    );
    if (res.success) {
      try {
        confetti({ particleCount: 35, spread: 50, origin: { y: 0.7 } });
      } catch {}
      setSaveToast('💾 Kadro kalıcı veri kaynağına başarıyla kaydedildi!');
      setTimeout(() => setSaveToast(null), 3000);
    } else {
      alert(res.error || 'Kayıt sırasında bir hata oluştu.');
    }
  };

  // Toggle Finalized Lock Status
  const handleToggleLock = () => {
    const res = toggleSquadLock(activeMatch.id);
    if (res.success) {
      try {
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
      } catch {}
      setSaveToast(
        res.newStatus === 'finalized'
          ? '🔒 Kadro kesinleştirildi ve kilitlendi!'
          : '🔓 Kadro kilidi kaldırıldı, taslak moduna alındı.'
      );
      setTimeout(() => setSaveToast(null), 3000);
    } else {
      alert(res.error || 'İşlem gerçekleştirilemedi.');
    }
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

      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], `halisaha-kadro-${activeMatch.date}.png`, {
          type: 'image/png',
        });

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
    if (!isAdmin && !isCouncil) {
      setShowAuthModal(true);
      return;
    }
    if (isFinalized) {
      alert('Kadro kesinleştiği için değişiklik yapılamaz. Önce kilidi kaldırın.');
      return;
    }
    const isAlreadyIn = activeMatch.squad.includes(playerId);
    let nextSquad: string[];

    if (isAlreadyIn) {
      nextSquad = activeMatch.squad.filter(id => id !== playerId);
    } else {
      if (activeMatch.squad.length >= targetCount) {
        alert(`Kadro hedefi ${targetCount} kişidir. Önce bir oyuncuyu yedeğe alın.`);
        return;
      }
      nextSquad = [...activeMatch.squad, playerId];
    }
    updateSquad(nextSquad, activeMatch.id);
  };

  // Handle tactical chip click on pitch (Her kullanıcı için paneli açar)
  const handleChipClick = (playerId: string, team: 'teamA' | 'teamB') => {
    // Eğer takas (swap) modundaysa
    if (selectedPlayerToSwap) {
      if (!isAdmin && !isCouncil) {
        setSelectedPlayerToSwap(null);
        return;
      }
      if (selectedPlayerToSwap.playerId === playerId) {
        setSelectedPlayerToSwap(null);
      } else {
        const p1Id = selectedPlayerToSwap.playerId;
        const p2Id = playerId;
        const p1Team = selectedPlayerToSwap.team;
        const p2Team = team;

        if (p1Team === p2Team) {
          setSelectedPlayerToSwap(null);
        } else {
          assignPlayerToTeam(p1Id, p2Team, undefined, activeMatch.id);
          assignPlayerToTeam(p2Id, p1Team, undefined, activeMatch.id);
          setSelectedPlayerToSwap(null);
        }
      }
      return;
    }

    // Sahadaki oyuncuya tıklandığında paneli aç
    setPitchPlayerModal({ playerId, team });
  };

  // IF ROSTER ACCESS IS DENIED (Rule 5: Misafir - Gelmiyorum veya yetkisiz)
  if (!rosterAccess.allowed) {
    return (
      <div className="space-y-4 pb-20">
        <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/40 border border-rose-500/30 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shadow-lg">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-black text-white">Kadro Bilgisine Erişim Kısıtlandı</h3>
            <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed mt-1.5">
              {rosterAccess.reason}
            </p>
          </div>

          {currentUser.playerId && currentMatch.attendanceRequests?.[currentUser.playerId]?.status === 'pending' && (
            <div className="pt-2">
              <button
                onClick={() => {
                  updateAttendance(currentUser.playerId!, 'Geliyor');
                  try {
                    confetti({ particleCount: 40, spread: 70, origin: { y: 0.7 } });
                  } catch {}
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 active:scale-95 transition-all"
              >
                Daveti Onayla ("Geliyorum" Yap) ve Kadroyu Gör
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Toast Notifications */}
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

      {saveToast && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl font-bold text-xs shadow-2xl flex items-center space-x-2 border border-emerald-400 animate-in fade-in slide-in-from-top max-w-sm text-center">
          <Check className="w-4 h-4 text-emerald-200 shrink-0" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* HAFTA SEÇİCİ (WEEK SELECTOR) */}
      {isCouncil && (
      <>
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
              {m.squadLockStatus === 'finalized' && <span className="text-[10px]">🔒</span>}
              {m.status === 'completed' && <span className="text-[10px]">🏆</span>}
            </button>
          ))}
        </div>
      </div>

      {/* SQUAD LOCK STATUS & PERSISTENCE CONTROL BAR (Kadro Kilitleme & Sürüm Yönetimi) */}
      <div
        className={`p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-2.5 shadow-lg ${
          isFinalized
            ? 'bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border-emerald-500/50'
            : 'bg-gradient-to-r from-amber-950/50 via-slate-900 to-slate-900 border-amber-500/40'
        }`}
      >
        <div className="flex items-center space-x-2.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center border font-black text-xs ${
              isFinalized
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
            }`}
          >
            {isFinalized ? <Lock className="w-5 h-5 text-emerald-400" /> : <Unlock className="w-5 h-5 text-amber-400" />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black text-white">
                {isFinalized ? 'Kesinleşmiş Kadro (Kilitli)' : 'Taslak Kadro (Düzenlenebilir)'}
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-black uppercase ${
                  isFinalized
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {isFinalized ? 'Kesinleşti' : 'Taslak'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {isFinalized
                ? `Kadro kesinleştirildi ${activeMatch.squadFinalizedBy ? `(${activeMatch.squadFinalizedBy})` : ''} ve yanlışlıklara karşı korumalıdır.`
                : 'Kadroda oyuncu ve mevki değişiklikleri yapabilirsiniz.'}
            </p>
          </div>
        </div>

        {/* Action Controls for Squad Persistence & History */}
        <div className="flex items-center space-x-1.5 ml-auto">
          {isAdmin && (
            <button
              onClick={handleToggleLock}
              className={`px-2.5 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1 transition-all active:scale-95 shadow-sm ${
                isFinalized
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
              }`}
              title={isFinalized ? 'Kilidi Açıp Taslağa Al' : 'Kadroyu Kesinleştir ve Kilitle'}
            >
              {isFinalized ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span>{isFinalized ? 'Kilidi Kaldır' : 'Kesinleştir (Kilitle)'}</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={handleExplicitSaveSquad}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center space-x-1 transition-all active:scale-95"
              title="Kadroyu Kalıcı Olarak Kaydet"
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              <span>Kaydet</span>
            </button>
          )}

          <button
            onClick={() => setShowVersionHistoryModal(true)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-xs flex items-center space-x-1 transition-all active:scale-95"
            title="Kadro Değişiklik ve Sürüm Geçmişini Gör"
          >
            <History className="w-3.5 h-3.5 text-blue-400" />
            <span>Sürümler ({activeMatch.squadVersions?.length || 0})</span>
          </button>
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
      {isCouncil && isViewingCurrent && (
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
            disabled={(!isAdmin && !isCouncil) || isFinalized}
            className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-black text-xs shadow-md shadow-emerald-500/20 flex items-center space-x-1.5 active:scale-95 transition-all shrink-0 ml-2"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Gelenlerden Kadro Çek ({comingCount})</span>
          </button>
        </div>
      )}
      </>
      )}

      {/* Guest Mode Notice */}
      {!isAdmin && !isCouncil && (
        <div className="flex items-center space-x-2.5 p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs">
          <Shield className="w-4 h-4 text-blue-400 shrink-0" />
          <div className="flex-1">
            <strong className="text-white block font-semibold">
              {isPlayer ? 'Kayıtlı Oyuncu Modu' : 'Misafir İzleme Modu'}
            </strong>
            <span>
              Kadro ve taktik saha görüntülenmektedir. Kadroda değişiklik yapmak için yönetici girişi yapabilirsiniz.
            </span>
          </div>
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-[11px] shadow-sm shrink-0 active:scale-95 transition-all"
          >
            Giriş Yap
          </button>
        </div>
      )}

      {/* MATCH FORMAT SELECTOR (5v5, 6v6, 7v7, 8v8) */}
      {isCouncil && (
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

        {formatNotice && (
          <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between animate-in fade-in">
            <span>{formatNotice}</span>
            <button
              onClick={() => setFormatNotice(null)}
              className="text-emerald-400 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-4 gap-1.5">
          {(['5v5', '6v6', '7v7', '8v8'] as const).map(fmt => {
            const isFmtActive = currentFormat === fmt;
            const count = fmt === '5v5' ? 10 : fmt === '6v6' ? 12 : fmt === '8v8' ? 16 : 14;

            return (
              <button
                key={fmt}
                type="button"
                onClick={() => handleSelectFormat(fmt)}
                className={`py-2 px-1 rounded-xl text-center border transition-all cursor-pointer active:scale-95 ${
                  isFmtActive
                    ? 'bg-emerald-600 border-emerald-400 text-white shadow-md shadow-emerald-600/30 font-black'
                    : 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:text-white font-bold hover:border-slate-600'
                }`}
              >
                <div className="text-xs">{fmt}</div>
                <div className="text-[10px] opacity-80">{count} Kişi</div>
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* POWER BALANCE & ACTION BUTTONS */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-white flex items-center space-x-1.5">
              <span>Takım Güç Karşılaştırması</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {canSeeRatings
                ? 'Otomatik dengeleme ile güç farkı en aza indirilir.'
                : 'Takım kadro dağılımı ve mevkileri.'}
            </p>
          </div>

          {canSeeRatings && (
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
          )}
        </div>

        {/* Comparison Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-rose-400 flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>
                {activeMatch.teamA.name} ({activeMatch.teamA.players.length}/{perTeamTarget})
                {canSeeRatings ? ` • ${activeMatch.teamA.totalPower}p` : ''}
              </span>
            </span>
            <span className="text-blue-400 flex items-center space-x-1">
              <span>
                {activeMatch.teamB.name} ({activeMatch.teamB.players.length}/{perTeamTarget})
                {canSeeRatings ? ` • ${activeMatch.teamB.totalPower}p` : ''}
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
        <div className={`grid grid-cols-1 ${isAdmin || isCouncil ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-2 pt-1`}>
          {(isAdmin || isCouncil) && (
            <button
              onClick={handleAutoBalance}
              disabled={isFinalized}
              className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
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
            onClick={() => setShowVisualCardModal(true)}
            className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-emerald-600/25 transition-all active:scale-95"
          >
            <Camera className="w-4 h-4 text-emerald-200" />
            <span>📸 Görsel Kadro Kartı (WP)</span>
          </button>
        </div>
      </div>

      {/* 3 SUB-TABS: PITCH, MANUAL ASSIGNMENT, POOL SELECT */}
      {(isAdmin || isCouncil) && (
        <div className="grid grid-cols-3 p-1 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg">
          <button
            onClick={() => setActiveTab('pitch')}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'pitch'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Taktik Saha
          </button>
          <button
            onClick={() => setActiveTab('manualTeam')}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'manualTeam'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Kırmızı / Mavi Dağıt
          </button>
          <button
            onClick={() => setActiveTab('poolSelect')}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'poolSelect'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Havuzdan Seç ({activeMatch.squad.length})
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 1: PITCH VIEW (Taktik Saha)                             */}
      {/* ============================================================ */}
      {activeTab === 'pitch' && (
        <div className="space-y-4">
          {/* Tactical Formation Switcher (Team A & B) */}
          {(isAdmin || isCouncil) && (
            <div className="grid grid-cols-2 gap-2 bg-slate-900 p-2.5 rounded-2xl border border-slate-800 text-xs">
              <div>
                <label className="text-[10px] uppercase font-bold text-rose-400 block mb-1">
                  Kırmızı Takım Dizilişi
                </label>
                <select
                  disabled={isFinalized}
                  value={teamAFormation}
                  onChange={e => setTeamFormation('teamA', e.target.value, activeMatch.id)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-rose-500 font-bold"
                >
                  {formations.map(f => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-blue-400 block mb-1">
                  Mavi Takım Dizilişi
                </label>
                <select
                  disabled={isFinalized}
                  value={teamBFormation}
                  onChange={e => setTeamFormation('teamB', e.target.value, activeMatch.id)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-bold"
                >
                  {formations.map(f => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* SWAP INSTRUCTION BANNER */}
          {selectedPlayerToSwap && (
            <div className="p-3 bg-amber-500/20 border border-amber-400 text-amber-200 rounded-2xl flex items-center justify-between text-xs animate-pulse">
              <span>
                🔄 <strong>{playersMap[selectedPlayerToSwap.playerId]?.name}</strong> seçildi. Takas
                yapmak istediğiniz diğer takım oyuncusuna tıklayın.
              </span>
              <button
                onClick={() => setSelectedPlayerToSwap(null)}
                className="px-2 py-0.5 rounded bg-slate-800 text-white font-bold ml-2"
              >
                İptal
              </button>
            </div>
          )}

          {/* THE TACTICAL SOCCER PITCH */}
          <div
            ref={pitchContainerRef}
            className="relative w-full aspect-[9/14] bg-emerald-900/90 rounded-3xl border-4 border-slate-800 overflow-hidden shadow-2xl p-3 flex flex-col justify-between"
            style={{
              backgroundImage: `radial-gradient(ellipse at center, rgba(16, 185, 129, 0.25) 0%, rgba(6, 78, 59, 0.95) 100%), repeating-linear-gradient(0deg, rgba(0,0,0,0.15), rgba(0,0,0,0.15) 40px, transparent 40px, transparent 80px)`,
            }}
          >
            {/* Center Line and Circles */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-b-2 border-white/20 z-0" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border-2 border-white/20 z-0" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/40 z-0" />

            {/* Top Penalty Box (Team A - Red) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-44 h-20 border-b-2 border-x-2 border-white/20 rounded-b-2xl z-0" />

            {/* Bottom Penalty Box (Team B - Blue) */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-44 h-20 border-t-2 border-x-2 border-white/20 rounded-t-2xl z-0" />

            {/* TEAM A (RED) SIDE - TOP HALF */}
            <div className="relative z-10 flex flex-col justify-between h-[48%] pt-2">
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-black uppercase text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded-full border border-rose-500/40">
                  {activeMatch.teamA.name} ({teamAFormation})
                </span>
                {canSeeRatings && (
                  <span className="text-[10px] font-bold text-rose-300 bg-black/40 px-2 py-0.5 rounded-full">
                    {activeMatch.teamA.totalPower} Puan
                  </span>
                )}
              </div>

              {/* Roster Grid Team A */}
              <div className="flex-1 flex flex-col justify-around py-1">
                {/* GK */}
                <div className="flex justify-center">
                  {activeMatch.teamA.players
                    .filter(p => p.position === 'Kaleci')
                    .map(tp => (
                      <PlayerPitchChip
                        key={tp.playerId}
                        player={playersMap[tp.playerId]}
                        position={tp.position}
                        score={tp.score}
                        canSeeRatings={canSeeRatings}
                        teamColor="rose"
                        isSelected={selectedPlayerToSwap?.playerId === tp.playerId}
                        onClick={() => handleChipClick(tp.playerId, 'teamA')}
                      />
                    ))}
                </div>

                {/* DEF */}
                <div className="flex justify-around px-2">
                  {activeMatch.teamA.players
                    .filter(p => p.position === 'Defans')
                    .map(tp => (
                      <PlayerPitchChip
                        key={tp.playerId}
                        player={playersMap[tp.playerId]}
                        position={tp.position}
                        score={tp.score}
                        canSeeRatings={canSeeRatings}
                        teamColor="rose"
                        isSelected={selectedPlayerToSwap?.playerId === tp.playerId}
                        onClick={() => handleChipClick(tp.playerId, 'teamA')}
                      />
                    ))}
                </div>

                {/* MID / WING */}
                <div className="flex justify-around px-1">
                  {activeMatch.teamA.players
                    .filter(p => p.position === 'Orta saha' || p.position === 'Kanat')
                    .map(tp => (
                      <PlayerPitchChip
                        key={tp.playerId}
                        player={playersMap[tp.playerId]}
                        position={tp.position}
                        score={tp.score}
                        canSeeRatings={canSeeRatings}
                        teamColor="rose"
                        isSelected={selectedPlayerToSwap?.playerId === tp.playerId}
                        onClick={() => handleChipClick(tp.playerId, 'teamA')}
                      />
                    ))}
                </div>

                {/* FWD */}
                <div className="flex justify-around px-4">
                  {activeMatch.teamA.players
                    .filter(p => p.position === 'Forvet')
                    .map(tp => (
                      <PlayerPitchChip
                        key={tp.playerId}
                        player={playersMap[tp.playerId]}
                        position={tp.position}
                        score={tp.score}
                        canSeeRatings={canSeeRatings}
                        teamColor="rose"
                        isSelected={selectedPlayerToSwap?.playerId === tp.playerId}
                        onClick={() => handleChipClick(tp.playerId, 'teamA')}
                      />
                    ))}
                </div>
              </div>
            </div>

            {/* TEAM B (BLUE) SIDE - BOTTOM HALF */}
            <div className="relative z-10 flex flex-col justify-between h-[48%] pb-2">
              <div className="flex-1 flex flex-col-reverse justify-around py-1">
                {/* GK */}
                <div className="flex justify-center">
                  {activeMatch.teamB.players
                    .filter(p => p.position === 'Kaleci')
                    .map(tp => (
                      <PlayerPitchChip
                        key={tp.playerId}
                        player={playersMap[tp.playerId]}
                        position={tp.position}
                        score={tp.score}
                        canSeeRatings={canSeeRatings}
                        teamColor="blue"
                        isSelected={selectedPlayerToSwap?.playerId === tp.playerId}
                        onClick={() => handleChipClick(tp.playerId, 'teamB')}
                      />
                    ))}
                </div>

                {/* DEF */}
                <div className="flex justify-around px-2">
                  {activeMatch.teamB.players
                    .filter(p => p.position === 'Defans')
                    .map(tp => (
                      <PlayerPitchChip
                        key={tp.playerId}
                        player={playersMap[tp.playerId]}
                        position={tp.position}
                        score={tp.score}
                        canSeeRatings={canSeeRatings}
                        teamColor="blue"
                        isSelected={selectedPlayerToSwap?.playerId === tp.playerId}
                        onClick={() => handleChipClick(tp.playerId, 'teamB')}
                      />
                    ))}
                </div>

                {/* MID / WING */}
                <div className="flex justify-around px-1">
                  {activeMatch.teamB.players
                    .filter(p => p.position === 'Orta saha' || p.position === 'Kanat')
                    .map(tp => (
                      <PlayerPitchChip
                        key={tp.playerId}
                        player={playersMap[tp.playerId]}
                        position={tp.position}
                        score={tp.score}
                        canSeeRatings={canSeeRatings}
                        teamColor="blue"
                        isSelected={selectedPlayerToSwap?.playerId === tp.playerId}
                        onClick={() => handleChipClick(tp.playerId, 'teamB')}
                      />
                    ))}
                </div>

                {/* FWD */}
                <div className="flex justify-around px-4">
                  {activeMatch.teamB.players
                    .filter(p => p.position === 'Forvet')
                    .map(tp => (
                      <PlayerPitchChip
                        key={tp.playerId}
                        player={playersMap[tp.playerId]}
                        position={tp.position}
                        score={tp.score}
                        canSeeRatings={canSeeRatings}
                        teamColor="blue"
                        isSelected={selectedPlayerToSwap?.playerId === tp.playerId}
                        onClick={() => handleChipClick(tp.playerId, 'teamB')}
                      />
                    ))}
                </div>
              </div>

              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-black uppercase text-blue-300 bg-blue-950/80 px-2 py-0.5 rounded-full border border-blue-500/40">
                  {activeMatch.teamB.name} ({teamBFormation})
                </span>
                {canSeeRatings && (
                  <span className="text-[10px] font-bold text-blue-300 bg-black/40 px-2 py-0.5 rounded-full">
                    {activeMatch.teamB.totalPower} Puan
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: MANUAL TEAM ASSIGNMENT (Kırmızı / Mavi Dağıt)         */}
      {/* ============================================================ */}
      {activeTab === 'manualTeam' && (
        <div className="space-y-3">
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 flex items-center justify-between">
            <span>
              Kırmızı:{' '}
              <strong className="text-rose-400">
                {activeMatch.teamA.players.length}/{perTeamTarget}
              </strong>
            </span>
            <span>
              Mavi:{' '}
              <strong className="text-blue-400">
                {activeMatch.teamB.players.length}/{perTeamTarget}
              </strong>
            </span>
          </div>

          <div className="space-y-2">
            {activeMatch.squad.map(playerId => {
              const player = playersMap[playerId];
              if (!player) return null;

              const inTeamA = activeMatch.teamA.players.some(p => p.playerId === playerId);
              const inTeamB = activeMatch.teamB.players.some(p => p.playerId === playerId);
              const isBench = !inTeamA && !inTeamB;

              return (
                <div
                  key={playerId}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-all"
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
                      {player.primaryPosition}
                      {canSeeRatings ? ` • ${player.finalScore} Puan` : ''}
                    </span>
                  </div>

                  {/* 3-Way Assignment Segmented Buttons */}
                  <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                    <button
                      disabled={isFinalized}
                      onClick={() =>
                        !isFinalized && assignPlayerToTeam(player.id, 'teamA', undefined, activeMatch.id)
                      }
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        inTeamA
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-rose-400'
                      }`}
                    >
                      Kırmızı
                    </button>
                    <button
                      disabled={isFinalized}
                      onClick={() =>
                        !isFinalized && assignPlayerToTeam(player.id, 'teamB', undefined, activeMatch.id)
                      }
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        inTeamB
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-blue-400'
                      }`}
                    >
                      Mavi
                    </button>
                    <button
                      disabled={isFinalized}
                      onClick={() =>
                        !isFinalized && assignPlayerToTeam(player.id, 'bench', undefined, activeMatch.id)
                      }
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
              Format Hedefi:{' '}
              <strong className="text-white">
                {currentFormat} ({targetCount} Kişi)
              </strong>
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
                  onClick={() => !isSuspended && !isFinalized && togglePlayerInSquad(p.id)}
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
                        {p.primaryPosition}
                        {canSeeRatings ? ` • Nihai: ${p.finalScore}` : ''}
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
      {/* SQUAD VERSION HISTORY MODAL (Sürüm Geçmişi & Geri Yükleme)   */}
      {/* ============================================================ */}
      {showVersionHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Kadro Sürüm Geçmişi</h3>
                  <p className="text-[10px] text-slate-400">
                    {activeMatch.matchNumber}. Hafta Kadro Kayıtları
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowVersionHistoryModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {(!activeMatch.squadVersions || activeMatch.squadVersions.length === 0) ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Henüz kaydedilmiş bir sürüm bulunmuyor.
                </div>
              ) : (
                activeMatch.squadVersions.map(ver => (
                  <div
                    key={ver.id}
                    className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between hover:border-slate-600 transition-all"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-black text-white">Sürüm #{ver.versionNumber}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-black uppercase ${
                            ver.status === 'finalized'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {ver.status === 'finalized' ? 'Kesinleşti' : 'Taslak'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center space-x-2">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{new Date(ver.savedAt).toLocaleString('tr-TR')}</span>
                        </span>
                        <span>•</span>
                        <span className="text-slate-300 font-semibold">{ver.savedBy}</span>
                      </div>
                      {ver.note && (
                        <div className="text-[10px] text-slate-300 italic mt-0.5">"{ver.note}"</div>
                      )}
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => {
                          const res = restoreSquadVersion(activeMatch.id, ver.id);
                          if (res.success) {
                            try {
                              confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 } });
                            } catch {}
                            setSaveToast(`Sürüm #${ver.versionNumber} başarıyla geri yüklendi ✓`);
                            setShowVersionHistoryModal(false);
                            setTimeout(() => setSaveToast(null), 3000);
                          } else {
                            alert(res.error || 'Geri yükleme başarısız oldu.');
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 shrink-0"
                      >
                        Geri Yükle
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowVersionHistoryModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TACTICAL PLAYER CONTROL MODAL (Sahadaki Oyuncuya Tıklayınca) */}
      {/* ============================================================ */}
      {pitchPlayerModal && (() => {
        const pObj = playersMap[pitchPlayerModal.playerId];
        const canManage = (isAdmin || isCouncil) && !isFinalized;
        const isTeamA = pitchPlayerModal.team === 'teamA';
        const teamLabel = isTeamA ? 'Kırmızı Takım' : 'Mavi Takım';
        const currentPos = (isTeamA
          ? activeMatch.teamA.players
          : activeMatch.teamB.players
        ).find(p => p.playerId === pitchPlayerModal.playerId)?.position || pObj?.primaryPosition || 'Oyuncu';

        return (
          <div
            onClick={() => setPitchPlayerModal(null)}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 select-none"
          >
            <div
              onClick={e => e.stopPropagation()}
              className="bg-slate-900 border border-emerald-500/50 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom"
            >
              {/* Modal Top Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-md ${
                      isTeamA
                        ? 'bg-rose-600 shadow-rose-600/30'
                        : 'bg-blue-600 shadow-blue-600/30'
                    }`}
                  >
                    {isTeamA ? '🔴' : '🔵'}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">
                      {teamLabel} • SAHA İÇİ MEVKİ
                    </span>
                    <h3 className="text-base font-black text-white">
                      {pObj?.name || 'Oyuncu'}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setPitchPlayerModal(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Status & Finalized Notice */}
              {isFinalized && (
                <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between text-xs text-amber-200">
                  <span className="flex items-center space-x-1">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Kadro kilitlidir.</span>
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => toggleSquadLock(activeMatch.id)}
                      className="px-2 py-0.5 rounded bg-amber-500 text-black font-bold text-[10px]"
                    >
                      Kilidi Aç
                    </button>
                  )}
                </div>
              )}

              {/* If user CAN manage squad */}
              {canManage ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Takım Değiştir
                    </label>
                    <button
                      onClick={() => {
                        const targetTeam = isTeamA ? 'teamB' : 'teamA';
                        assignPlayerToTeam(pitchPlayerModal.playerId, targetTeam, undefined, activeMatch.id);
                        setPitchPlayerModal(null);
                      }}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all active:scale-95 ${
                        isTeamA
                          ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20'
                          : 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20'
                      }`}
                    >
                      <ArrowLeftRight className="w-4 h-4" />
                      <span>{isTeamA ? 'Mavi Takıma Geçir' : 'Kırmızı Takıma Geçir'}</span>
                    </button>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Sahadaki Mevkisini Değiştir
                    </label>
                    <div className="grid grid-cols-5 gap-1">
                      {(['Kaleci', 'Defans', 'Orta saha', 'Kanat', 'Forvet'] as Position[]).map(pos => {
                        const isCurrent = currentPos === pos;

                        return (
                          <button
                            key={pos}
                            onClick={() => {
                              updatePlayerPositionInTeam(
                                pitchPlayerModal.playerId,
                                pitchPlayerModal.team,
                                pos,
                                activeMatch.id
                              );
                              setPitchPlayerModal(null);
                            }}
                            className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition-all active:scale-95 ${
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

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => {
                        setSelectedPlayerToSwap({
                          playerId: pitchPlayerModal.playerId,
                          team: pitchPlayerModal.team,
                        });
                        setPitchPlayerModal(null);
                      }}
                      className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-bold text-xs flex items-center justify-center space-x-1 transition-all active:scale-95"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      <span>Takas Et</span>
                    </button>

                    <button
                      onClick={() => {
                        assignPlayerToTeam(pitchPlayerModal.playerId, 'bench', undefined, activeMatch.id);
                        setPitchPlayerModal(null);
                      }}
                      className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-rose-400 font-bold text-xs transition-all active:scale-95"
                    >
                      Yedeğe Al
                    </button>
                  </div>
                </div>
              ) : (
                /* Non-admin / Guest view: shows info & fast login button */
                <div className="space-y-3">
                  <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Mevcut Takım:</span>
                      <span className="font-bold text-white">{teamLabel}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Mevki:</span>
                      <span className="font-bold text-emerald-400">{currentPos}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Katılım Durumu:</span>
                      <span className="font-bold text-white">Geliyor ✓</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed text-center">
                    Kadroda takım veya mevki değişikliği yapmak için Yönetici veya Konsey girişi gereklidir.
                  </p>

                  <button
                    onClick={() => {
                      setPitchPlayerModal(null);
                      setShowAuthModal(true);
                    }}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs shadow-lg shadow-amber-500/25 flex items-center justify-center space-x-1.5 transition-all active:scale-95"
                  >
                    <Crown className="w-4 h-4 text-black" />
                    <span>Yönetici / Konsey Girişi Yap</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* SQUAD VISUAL CARD MODAL */}
      {showVisualCardModal && (
        <SquadVisualCardModal
          match={activeMatch}
          onClose={() => setShowVisualCardModal(false)}
        />
      )}

      {/* AUTH ROLE MODAL (Yöneticiye Geçiş) */}
      {showAuthModal && (
        <AuthRoleModal
          defaultTab="admin"
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
};

// Subcomponent for each tactical chip on the field
interface PlayerPitchChipProps {
  player?: any;
  position: string;
  score: number;
  canSeeRatings: boolean;
  teamColor: 'rose' | 'blue';
  isSelected: boolean;
  onClick: () => void;
}

const PlayerPitchChip: React.FC<PlayerPitchChipProps> = ({
  player,
  position,
  score,
  canSeeRatings,
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
        {position === 'Kaleci' ? 'GK' : canSeeRatings ? score.toFixed(1) : position.slice(0, 1)}
      </div>

      <span className="text-[10px] font-black tracking-tight truncate max-w-[62px]">{name}</span>
      <span className="text-[8px] text-white/60 font-semibold">{position.slice(0, 3)}</span>
    </button>
  );
};
