import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  UserCheck,
  UserX,
  HelpCircle,
  Share2,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
  ShieldAlert,
  MessageCircle,
  Plus,
  Search,
  Filter,
  Flame,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import { Player, AttendanceStatus, Position } from '../../types';

interface EmergencySubstituteFinderProps {
  onNavigateToSquad?: () => void;
}

export const EmergencySubstituteFinder: React.FC<EmergencySubstituteFinderProps> = ({
  onNavigateToSquad,
}) => {
  const { currentMatch, players, playersMap, updateAttendance } = useApp();

  const [activeFilter, setActiveFilter] = useState<'all' | 'geliyor' | 'bekleniyor' | 'gelemiyor'>('bekleniyor');
  const [searchQuery, setSearchQuery] = useState('');
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [copiedBroadcast, setCopiedBroadcast] = useState(false);
  const [selectedPositionFilter, setSelectedPositionFilter] = useState<string>('all');

  // Match target squad count based on format
  const targetCount = currentMatch.targetSquadCount || 14;

  // Categorize all 45 players according to current match attendance
  const categorizedPlayers = useMemo(() => {
    const geliyor: Player[] = [];
    const bekleniyor: Player[] = [];
    const gelemiyor: Player[] = [];
    const diger: Player[] = [];

    players.forEach(p => {
      const status = currentMatch.attendance[p.id];
      if (status === 'Geliyor' || status === 'Geldi') {
        geliyor.push(p);
      } else if (status === 'Haber Bekleniyor' || status === 'Beklemede') {
        bekleniyor.push(p);
      } else if (status === 'Gelemiyor' || status === 'Gelmedi' || status === 'Son dakika iptal') {
        gelemiyor.push(p);
      } else {
        diger.push(p);
      }
    });

    return { geliyor, bekleniyor, gelemiyor, diger };
  }, [players, currentMatch.attendance]);

  const comingCount = categorizedPlayers.geliyor.length;
  const pendingCount = categorizedPlayers.bekleniyor.length;
  const missingCount = Math.max(0, targetCount - comingCount);
  const progressPercent = Math.min(100, Math.round((comingCount / targetCount) * 100));

  // Date & Countdown calculation
  const { dateFormatted, countdownText, isUrgent } = useMemo(() => {
    try {
      const matchDate = new Date(`${currentMatch.date}T21:00:00`);
      const now = new Date();
      const diffMs = matchDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

      const formatted = matchDate.toLocaleDateString('tr-TR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      let cdText = '';
      let urgent = false;

      if (diffMs < 0) {
        cdText = 'Maç Tamamlandı';
      } else if (diffHours <= 12) {
        cdText = `Bu Akşam! (${diffHours} saat kaldı)`;
        urgent = true;
      } else if (diffDays === 1) {
        cdText = 'Yarın Maç Günü!';
        urgent = true;
      } else {
        cdText = `${diffDays} gün kaldı`;
        if (diffDays <= 2) urgent = true;
      }

      return { dateFormatted: formatted, countdownText: cdText, isUrgent: urgent };
    } catch {
      return { dateFormatted: currentMatch.date, countdownText: 'Yaklaşıyor', isUrgent: false };
    }
  }, [currentMatch.date]);

  // Position needs analysis
  const positionNeeds = useMemo(() => {
    const counts: Record<Position, number> = {
      'Kaleci': 0,
      'Defans': 0,
      'Orta saha': 0,
      'Kanat': 0,
      'Forvet': 0,
    };

    categorizedPlayers.geliyor.forEach(p => {
      counts[p.primaryPosition] = (counts[p.primaryPosition] || 0) + 1;
    });

    const targetPositions: Record<Position, number> = {
      'Kaleci': 2,
      'Defans': 4,
      'Orta saha': 4,
      'Kanat': 2,
      'Forvet': 2,
    };

    const needed: { pos: Position; count: number }[] = [];
    (Object.keys(targetPositions) as Position[]).forEach(pos => {
      const diff = targetPositions[pos] - (counts[pos] || 0);
      if (diff > 0) {
        needed.push({ pos, count: diff });
      }
    });

    return needed;
  }, [categorizedPlayers.geliyor]);

  // Smart Substitute Recommendations (Players not coming or not yet called)
  const substituteRecommendations = useMemo(() => {
    const candidates = players.filter(p => {
      const status = currentMatch.attendance[p.id];
      return status !== 'Geliyor' && status !== 'Geldi';
    });

    // Sort by:
    // 1. Position match if a specific position is urgently needed (e.g. Kaleci)
    // 2. Least penalty points (more reliable)
    // 3. Highest rating / score
    return candidates.sort((a, b) => {
      const aIsGk = a.primaryPosition === 'Kaleci';
      const bIsGk = b.primaryPosition === 'Kaleci';
      const gkNeeded = positionNeeds.some(n => n.pos === 'Kaleci');

      if (gkNeeded) {
        if (aIsGk && !bIsGk) return -1;
        if (!aIsGk && bIsGk) return 1;
      }

      if (a.attendanceStats.penaltyPoints !== b.attendanceStats.penaltyPoints) {
        return a.attendanceStats.penaltyPoints - b.attendanceStats.penaltyPoints;
      }

      return b.finalScore - a.finalScore;
    });
  }, [players, currentMatch.attendance, positionNeeds]);

  // Filtered players list for the active view
  const displayPlayers = useMemo(() => {
    let list: Player[] = [];
    if (activeFilter === 'all') {
      list = players;
    } else if (activeFilter === 'geliyor') {
      list = categorizedPlayers.geliyor;
    } else if (activeFilter === 'bekleniyor') {
      list = [...categorizedPlayers.bekleniyor, ...categorizedPlayers.diger];
    } else if (activeFilter === 'gelemiyor') {
      list = categorizedPlayers.gelemiyor;
    }

    if (selectedPositionFilter !== 'all') {
      list = list.filter(p => p.primaryPosition === selectedPositionFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }

    return list;
  }, [activeFilter, players, categorizedPlayers, selectedPositionFilter, searchQuery]);

  // WhatsApp Broadcast Text Generator
  const generateBroadcastText = () => {
    const gelenlerLines = categorizedPlayers.geliyor
      .map((p, idx) => `${idx + 1}. ${p.name} (${p.primaryPosition})`)
      .join('\n');

    const pendingLines = categorizedPlayers.bekleniyor
      .map(p => `⏳ ${p.name} (${p.primaryPosition})`)
      .join('\n');

    let eksikNotice = '';
    if (missingCount > 0) {
      eksikNotice = `\n🚨 *ACİL EKSİK:* ${missingCount} Kişi aranıyor!\nKadroya katılmak isteyenler veya yedek getirebilecekler lütfen acil gruba yazsın!`;
    } else {
      eksikNotice = `\n🎉 *KADRO TAM:* 14/14 kişi tamamlandı! Maç saatinde herkes sahada olsun.`;
    }

    return `⚽ *HALI SAHA MAÇI YOKLAMASI & ACİL ÇAĞRI* ⚽
📅 *Tarih:* ${dateFormatted} | ${currentMatch.time}
📍 *Saha:* ${currentMatch.venueName} (${currentMatch.pitchNo})
👥 *Format:* ${currentMatch.matchFormat || '7v7'} (Hedef: ${targetCount} Kişi)
💰 *Kişi Başı Ücret:* ${currentMatch.costPerPlayer} ₺

📊 *DURUM:* ${comingCount} / ${targetCount} Kişi Onayladı
${eksikNotice}

✅ *GELENLER (${comingCount}/${targetCount}):*
${gelenlerLines || '(Henüz onaylayan yok)'}

${
  categorizedPlayers.bekleniyor.length > 0
    ? `⏳ *HABER BEKLENENLER (${categorizedPlayers.bekleniyor.length}):*\n${pendingLines}`
    : ''
}

📢 *Komisyon Duyurusu:* Maça gelemeyecek olanların en geç 24 saat önceden haber vermesi rica olunur.`;
  };

  const copyBroadcastToClipboard = () => {
    const text = generateBroadcastText();
    navigator.clipboard.writeText(text);
    setCopiedBroadcast(true);
    confetti({ particleCount: 30, spread: 60, origin: { y: 0.8 } });
    setTimeout(() => setCopiedBroadcast(false), 2500);
  };

  const openWhatsAppBroadcast = () => {
    const text = encodeURIComponent(generateBroadcastText());
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const openPersonalWhatsAppPing = (player: Player) => {
    try {
      const d = new Date(currentMatch.date);
      const day = d.toLocaleDateString('tr-TR', { weekday: 'long' });
      const timeOnly = currentMatch.time.split('-')[0].trim();
      const text = encodeURIComponent(
        `Selam ${player.name}, ${day} günü saat ${timeOnly}'de maçımız var, gelmek ister misin? ⚽🔥\nSaha: ${currentMatch.venueName}`
      );
      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    } catch {
      const text = encodeURIComponent(
        `Selam ${player.name}, ${dateFormatted} saat ${currentMatch.time} maçımız var, gelmek ister misin? ⚽\nSaha: ${currentMatch.venueName}`
      );
      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    }
  };

  const openSubInviteWhatsApp = (player: Player) => {
    try {
      const d = new Date(currentMatch.date);
      const day = d.toLocaleDateString('tr-TR', { weekday: 'long' });
      const timeOnly = currentMatch.time.split('-')[0].trim();
      const text = encodeURIComponent(
        `Selam ${player.name}, ${day} günü saat ${timeOnly}'de maçımızda acil ${player.primaryPosition} eksiğimiz var, gelmek ister misin? 🚨⚽\nSaha: ${currentMatch.venueName}`
      );
      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    } catch {
      const text = encodeURIComponent(
        `Selam ${player.name}, ${dateFormatted} saat ${currentMatch.time} halı saha maçımızda ${player.primaryPosition} eksiğimiz var, gelmek ister misin? ⚽`
      );
      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. TARİH, SAAT & GERİ SAYIM KARTI */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 border border-emerald-500/30 p-4 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>TARİH & MAÇ PLANI</span>
          </div>

          <div
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
              isUrgent
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{countdownText}</span>
          </div>
        </div>

        {/* Date Display */}
        <h2 className="text-lg font-black text-white capitalize leading-tight mb-1">{dateFormatted}</h2>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mb-3">
          <div className="flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-white">{currentMatch.time}</span>
          </div>
          <div className="flex items-center space-x-1">
            <MapPin className="w-3.5 h-3.5 text-rose-400" />
            <span>{currentMatch.venueName}</span>
          </div>
          <div className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            {currentMatch.pitchNo}
          </div>
        </div>

        {/* 2. TOPLAM GELEN SAYISI & EKSİK GÖSTERGESİ */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-700/60 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Toplam Gelen Sayısı</span>
              <div className="flex items-baseline space-x-1.5 mt-0.5">
                <span className="text-2xl font-black text-white font-mono">{comingCount}</span>
                <span className="text-slate-400 font-bold text-sm">/ {targetCount} Kişi</span>
              </div>
            </div>

            <div className="text-right">
              {missingCount === 0 ? (
                <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black">
                  <Check className="w-4 h-4" />
                  <span>KADRO TAM</span>
                </div>
              ) : (
                <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-black animate-bounce">
                  <ShieldAlert className="w-4 h-4" />
                  <span>{missingCount} KİŞİ EKSİK!</span>
                </div>
              )}
              <span className="text-[10px] text-slate-400 block mt-1">
                {pendingCount > 0 ? `${pendingCount} kişi beklemede` : 'Tüm cevaplar alındı'}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                missingCount === 0
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : missingCount <= 2
                  ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                  : 'bg-gradient-to-r from-rose-500 to-amber-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button
            onClick={() => setShowBroadcastModal(true)}
            className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>WhatsApp Acil Çağrı</span>
          </button>

          {onNavigateToSquad && (
            <button
              onClick={onNavigateToSquad}
              className="flex items-center justify-center space-x-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition-all active:scale-95"
            >
              <span>Sahada Dizilimi Aç</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          )}
        </div>
      </div>

      {/* 3. MEVKİ EKSİKLERİ & AKILLI YEDEK ÖNERİLERİ (Eğer Eksik Varsa) */}
      {missingCount > 0 && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border border-rose-500/30 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">
                  Akıllı Yedek Önerileri ({missingCount} Eksik)
                </h3>
                <p className="text-[10px] text-slate-400">Havuzdan mevkiye en uygun ve cezasız yedekler</p>
              </div>
            </div>

            {positionNeeds.length > 0 && (
              <div className="flex items-center space-x-1">
                {positionNeeds.slice(0, 2).map(n => (
                  <span
                    key={n.pos}
                    className="text-[9px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30"
                  >
                    {n.count} {n.pos}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Top 3 Recommended Substitutes */}
          <div className="space-y-2">
            {substituteRecommendations.slice(0, 3).map(sub => (
              <div
                key={sub.id}
                className="p-2.5 rounded-xl bg-slate-850/80 bg-slate-900 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-all"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-mono font-black text-xs text-emerald-400 border border-slate-700">
                    {Math.round(sub.finalScore * 10)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-xs text-white">{sub.name}</span>
                      {sub.isJoker && (
                        <span className="text-[8px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold">
                          Joker
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                      <span className="text-emerald-400 font-semibold">{sub.primaryPosition}</span>
                      <span>•</span>
                      <span>Ceza: {sub.attendanceStats.penaltyPoints} P</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => openSubInviteWhatsApp(sub)}
                    title="WhatsApp'tan Özel Davet Gönder"
                    className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs transition-all active:scale-95"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => updateAttendance(sub.id, 'Geliyor')}
                    className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm transition-all active:scale-95"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Kadroya Al</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. HABER BEKLENENLER & TÜM OYUNCU YOKLAMA LİSTESİ */}
      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              Oyuncu Durumları (45 Kişilik Havuz)
            </h3>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveFilter('bekleniyor')}
            className={`py-1.5 px-1 rounded-lg font-bold text-center transition-all ${
              activeFilter === 'bekleniyor'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Beklenen ({categorizedPlayers.bekleniyor.length})
          </button>

          <button
            onClick={() => setActiveFilter('geliyor')}
            className={`py-1.5 px-1 rounded-lg font-bold text-center transition-all ${
              activeFilter === 'geliyor'
                ? 'bg-emerald-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Gelen ({comingCount})
          </button>

          <button
            onClick={() => setActiveFilter('gelemiyor')}
            className={`py-1.5 px-1 rounded-lg font-bold text-center transition-all ${
              activeFilter === 'gelemiyor'
                ? 'bg-rose-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Gelemeyen ({categorizedPlayers.gelemiyor.length})
          </button>

          <button
            onClick={() => setActiveFilter('all')}
            className={`py-1.5 px-1 rounded-lg font-bold text-center transition-all ${
              activeFilter === 'all'
                ? 'bg-slate-700 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tümü (45)
          </button>
        </div>

        {/* Search & Position Filter */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Oyuncu ara..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <select
            value={selectedPositionFilter}
            onChange={e => setSelectedPositionFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Mevki: Tümü</option>
            <option value="Kaleci">Kaleci</option>
            <option value="Defans">Defans</option>
            <option value="Orta saha">Orta saha</option>
            <option value="Kanat">Kanat</option>
            <option value="Forvet">Forvet</option>
          </select>
        </div>

        {/* Player List */}
        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
          {displayPlayers.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              Bu filtreye uygun oyuncu bulunamadı.
            </div>
          ) : (
            displayPlayers.map(p => {
              const status = currentMatch.attendance[p.id] || 'Haber Bekleniyor';
              const isComing = status === 'Geliyor' || status === 'Geldi';
              const isPending = status === 'Haber Bekleniyor' || status === 'Beklemede';
              const isNotComing = status === 'Gelemiyor' || status === 'Gelmedi' || status === 'Son dakika iptal';

              return (
                <div
                  key={p.id}
                  className={`p-2.5 rounded-xl border transition-all flex items-center justify-between ${
                    isComing
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : isPending
                      ? 'bg-amber-950/20 border-amber-500/30'
                      : 'bg-slate-950/50 border-slate-800 opacity-75'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        isComing ? 'bg-emerald-400' : isPending ? 'bg-amber-400' : 'bg-rose-400'
                      }`}
                    />
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-xs text-white">{p.name}</span>
                        {p.isJoker && (
                          <span className="text-[8px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold">
                            Joker
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                        <span className="text-slate-300 font-semibold">{p.primaryPosition}</span>
                        <span>•</span>
                        <span className="font-mono text-emerald-400 font-bold">
                          {Math.round(p.finalScore * 10)} OVR
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Toggles */}
                  <div className="flex items-center space-x-1">
                    {/* Ping via WhatsApp if pending */}
                    {isPending && (
                      <button
                        onClick={() => openPersonalWhatsAppPing(p)}
                        title="WhatsApp'tan Durum Sor"
                        className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs transition-all active:scale-95"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Coming Toggle */}
                    <button
                      onClick={() => updateAttendance(p.id, 'Geliyor')}
                      title="Geliyor Olarak İşaretle"
                      className={`px-2 py-1 rounded-lg text-[10px] font-black border transition-all ${
                        isComing
                          ? 'bg-emerald-500 text-black border-emerald-400 shadow-sm'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      Geliyor
                    </button>

                    {/* Pending Toggle */}
                    <button
                      onClick={() => updateAttendance(p.id, 'Haber Bekleniyor')}
                      title="Haber Bekleniyor / Beklemede"
                      className={`px-2 py-1 rounded-lg text-[10px] font-black border transition-all ${
                        isPending
                          ? 'bg-amber-500 text-black border-amber-400 shadow-sm'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      Beklemede
                    </button>

                    {/* Not Coming Toggle */}
                    <button
                      onClick={() => updateAttendance(p.id, 'Gelemiyor')}
                      title="Gelemiyor Olarak İşaretle"
                      className={`px-2 py-1 rounded-lg text-[10px] font-black border transition-all ${
                        isNotComing
                          ? 'bg-rose-500 text-white border-rose-400 shadow-sm'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      Yok
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 5. WHATSAPP BROADCAST MODAL */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">WhatsApp Acil Çağrı & Yoklama</h3>
                  <p className="text-[10px] text-slate-400">Tek tıkla gruba kopyala veya WhatsApp'ta aç</p>
                </div>
              </div>
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="text-slate-400 hover:text-white p-1 text-sm"
              >
                ✕
              </button>
            </div>

            {/* Broadcast Text Preview */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
              {generateBroadcastText()}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={copyBroadcastToClipboard}
                className="flex items-center justify-center space-x-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all active:scale-95"
              >
                {copiedBroadcast ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Kopyalandı!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Metni Kopyala</span>
                  </>
                )}
              </button>

              <button
                onClick={openWhatsAppBroadcast}
                className="flex items-center justify-center space-x-1.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
              >
                <ExternalLink className="w-4 h-4" />
                <span>WhatsApp'ta Aç</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
