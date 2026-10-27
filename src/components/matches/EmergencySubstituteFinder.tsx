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
  BellRing,
  Wallet,
  Edit3,
  CreditCard,
  AlertTriangle,
  Trophy,
  Star,
  Navigation,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import { Player, AttendanceStatus, Position } from '../../types';
import { sendOneDayBeforeReminder } from '../../services/notifications';
import { getMatchMapsUrl } from '../../services/firebase';
import { AddToCalendarModal } from '../common/AddToCalendarModal';
import { EditMatchModal } from './EditMatchModal';
import { VenueManagerModal } from './VenueManagerModal';
import { PlayerAttendanceConfirmCard } from './PlayerAttendanceConfirmCard';
import { AuthRoleModal } from '../auth/AuthRoleModal';
import { WeatherWidget } from '../common/WeatherWidget';
import { MvpVotingModal } from './MvpVotingModal';
import { LeaderboardModal } from './LeaderboardModal';
import { MatchResultsModal } from './MatchResultsModal';
import { WhatsAppDebtReminderModal } from '../finance/WhatsAppDebtReminderModal';
import { SquadVisualCardModal } from '../squad/SquadVisualCardModal';

interface EmergencySubstituteFinderProps {
  onNavigateToSquad?: () => void;
}

export const EmergencySubstituteFinder: React.FC<EmergencySubstituteFinderProps> = ({
  onNavigateToSquad,
}) => {
  const {
    currentMatch,
    players,
    playersMap,
    updateAttendance,
    updateMatchAttendance,
    togglePayment,
    currentUser,
    isAdmin,
    isCouncil,
    isGuest,
    dismissDeclineAlert,
    sendPlayerAttendanceRequest,
    sendReNotificationToPending,
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<'all' | 'geliyor' | 'bekleniyor' | 'gelemiyor' | 'satti'>('bekleniyor');
  const [searchQuery, setSearchQuery] = useState('');
  const [playerNotifyToast, setPlayerNotifyToast] = useState<{
    player: Player;
    message: string;
  } | null>(null);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showEditMatchModal, setShowEditMatchModal] = useState<'edit' | 'create' | null>(null);
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMvpModal, setShowMvpModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showDebtReminderModal, setShowDebtReminderModal] = useState(false);
  const [showVisualCardModal, setShowVisualCardModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [copiedBroadcast, setCopiedBroadcast] = useState(false);
  const [selectedPositionFilter, setSelectedPositionFilter] = useState<string>('all');
  const [reNotificationModal, setReNotificationModal] = useState<{
    open: boolean;
    targetedCount: number;
    successfulCount: number;
    failedCount: number;
    message: string;
    recipients: any[];
  } | null>(null);
  const [isSendingReNotify, setIsSendingReNotify] = useState(false);

  const handleTriggerReNotification = async () => {
    setIsSendingReNotify(true);
    try {
      const res = await sendReNotificationToPending(currentMatch.id);
      if (res.success && res.log) {
        try {
          confetti({ particleCount: 35, spread: 60, origin: { y: 0.7 } });
        } catch {}
        setReNotificationModal({
          open: true,
          targetedCount: res.targetedCount,
          successfulCount: res.successfulCount,
          failedCount: res.failedCount,
          message: res.message,
          recipients: res.log.recipients,
        });
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert('Bildirim gönderilirken bir hata oluştu.');
    } finally {
      setIsSendingReNotify(false);
    }
  };

  const handleSendPlayerNotification = async (player: Player) => {
    const res = await sendPlayerAttendanceRequest(player.id);
    if (res.success) {
      try {
        confetti({ particleCount: 25, spread: 50, origin: { y: 0.7 } });
      } catch {}
      setPlayerNotifyToast({
        player,
        message: res.message,
      });
    }
  };

  // Check if URL opened with ?action=mvp
  React.useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('action') === 'mvp') {
          setShowMvpModal(true);
        }
      }
    } catch {}
  }, []);

  // Match target squad count based on format
  const targetCount = currentMatch.targetSquadCount || 14;

  // Categorize all 45 players according to current match attendance
  const categorizedPlayers = useMemo(() => {
    const geliyor: Player[] = [];
    const bekleniyor: Player[] = [];
    const gelemiyor: Player[] = [];
    const satti: Player[] = [];
    const diger: Player[] = [];

    players.forEach(p => {
      const status = currentMatch.attendance[p.id];
      if (status === 'Geliyor' || status === 'Geldi') {
        geliyor.push(p);
      } else if (status === 'Satış koydu' || status === 'Son dakika iptal') {
        satti.push(p);
      } else if (status === 'Gelemiyor' || status === 'Gelmedi') {
        gelemiyor.push(p);
      } else {
        // Until player responds, keep their status in 'bekleniyor' (Haber Bekleniyor)
        bekleniyor.push(p);
      }
    });

    return { geliyor, bekleniyor, gelemiyor, satti, diger };
  }, [players, currentMatch.attendance]);

  const comingCount = categorizedPlayers.geliyor.length;
  const pendingCount = categorizedPlayers.bekleniyor.length;
  const sattiCount = categorizedPlayers.satti.length;
  const missingCount = Math.max(0, targetCount - comingCount);
  const comingPaidCount = categorizedPlayers.geliyor.filter(p => currentMatch.payments[p.id]?.isPaid).length;
  const remainingDebtForMatch = Math.max(0, currentMatch.totalPitchCost - comingPaidCount * currentMatch.costPerPlayer);
  const progressPercent = Math.min(100, Math.round((comingCount / targetCount) * 100));

  // Date & Countdown calculation
  const { dateFormatted, countdownText, isUrgent } = useMemo(() => {
    try {
      const cleanDate = (currentMatch.date || '').split('T')[0] || new Date().toISOString().split('T')[0];
      const startTime = (currentMatch.time || '21:00').split('-')[0].trim();
      const [h, m] = startTime.split(':');
      const hourStr = (h || '21').padStart(2, '0');
      const minStr = (m || '00').padStart(2, '0');

      const matchDate = new Date(`${cleanDate}T${hourStr}:${minStr}:00`);
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
  }, [currentMatch.date, currentMatch.time]);

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
    if (!isCouncil) {
      list = categorizedPlayers.geliyor;
    } else if (activeFilter === 'all') {
      list = players;
    } else if (activeFilter === 'geliyor') {
      list = categorizedPlayers.geliyor;
    } else if (activeFilter === 'bekleniyor') {
      list = [...categorizedPlayers.bekleniyor, ...categorizedPlayers.diger];
    } else if (activeFilter === 'gelemiyor') {
      list = categorizedPlayers.gelemiyor;
    } else if (activeFilter === 'satti') {
      list = categorizedPlayers.satti;
    }

    if (selectedPositionFilter !== 'all') {
      list = list.filter(p => p.primaryPosition === selectedPositionFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }

    return list;
  }, [isCouncil, activeFilter, players, categorizedPlayers, selectedPositionFilter, searchQuery]);

  const matchMapsUrl = useMemo(() => getMatchMapsUrl(currentMatch), [currentMatch]);

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
📍 *Saha:* ${currentMatch.venueName}
🗺️ *Konum (Google Maps):* ${matchMapsUrl}
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

  const getConfirmUrl = (playerId: string) => {
    try {
      const origin = window.location.origin + window.location.pathname;
      const params = new URLSearchParams({
        oyuncu: playerId,
        mDate: currentMatch.date,
        mTime: currentMatch.time,
        mVenue: currentMatch.venueName,
        mLoc: currentMatch.venueLocation || currentMatch.venueName,
        mCost: String(currentMatch.costPerPlayer),
        mNo: String(currentMatch.matchNumber),
      });
      return `${origin}?${params.toString()}`;
    } catch {
      return '';
    }
  };

  const openPersonalWhatsAppPing = (player: Player) => {
    const confirmUrl = getConfirmUrl(player.id);
    const yesUrl = `${confirmUrl}&durum=geliyorum`;
    const noUrl = `${confirmUrl}&durum=gelmiyorum`;
    const d = new Date(currentMatch.date);
    const day = d.toLocaleDateString('tr-TR', { weekday: 'long' });
    const timeOnly = currentMatch.time.split('-')[0].trim();
    const text = encodeURIComponent(
      `Selam ${player.name}, ${day} günü saat ${timeOnly}'de halı saha maçımız var! ⚽🔥\n` +
      `📍 Saha: ${currentMatch.venueName}\n` +
      `🗺️ Konum (Google Maps): ${matchMapsUrl}\n` +
      `💰 Ücret: ${currentMatch.costPerPlayer} ₺\n\n` +
      `👇 Lütfen katılım durumunu tek tıkla onayla:\n\n` +
      `🟢 *[ONAYLIYORUM (MAÇA GELİYORUM)]:*\n${yesUrl}\n\n` +
      `🔴 *[GELMİYORUM]:*\n${noUrl}`
    );
    const phoneParam = player.phone ? `phone=${player.phone.replace(/\D/g, '')}&` : '';
    window.open(`https://api.whatsapp.com/send?${phoneParam}text=${text}`, '_blank');
  };

  const openSubInviteWhatsApp = (player: Player) => {
    const confirmUrl = getConfirmUrl(player.id);
    const yesUrl = `${confirmUrl}&durum=geliyorum`;
    const noUrl = `${confirmUrl}&durum=gelmiyorum`;
    const d = new Date(currentMatch.date);
    const day = d.toLocaleDateString('tr-TR', { weekday: 'long' });
    const timeOnly = currentMatch.time.split('-')[0].trim();
    const text = encodeURIComponent(
      `🚨 *ACİL YEDEK OYUNCU ÇAĞRISI* 🚨\n\n` +
      `Selam ${player.name}, ${day} günü saat ${timeOnly}'de maçımızda acil ${player.primaryPosition} eksiğimiz var, kadroya girmek ister misin? ⚽🔥\n` +
      `📍 Saha: ${currentMatch.venueName}\n` +
      `🗺️ Konum (Google Maps): ${matchMapsUrl}\n\n` +
      `🟢 *[GELİYORUM (KADROYA GİR)]:*\n${yesUrl}\n\n` +
      `🔴 *[GELEMİYORUM]:*\n${noUrl}`
    );
    const phoneParam = player.phone ? `phone=${player.phone.replace(/\D/g, '')}&` : '';
    window.open(`https://api.whatsapp.com/send?${phoneParam}text=${text}`, '_blank');
  };

  const [oneDayNotifSent, setOneDayNotifSent] = useState(false);

  const openOneDayPlayerWhatsApp = (player: Player) => {
    const confirmUrl = getConfirmUrl(player.id);
    const yesUrl = `${confirmUrl}&durum=geliyorum`;
    const noUrl = `${confirmUrl}&durum=gelmiyorum`;
    const timeOnly = currentMatch.time.split('-')[0].trim();
    const text = encodeURIComponent(
      `⏰ *YARINKİ MAÇ SON TEYİT BİLDİRİMİ* ⏰\n\n` +
      `Selam ${player.name}, yarın saat ${timeOnly}'de halı saha maçımız var! ⚽🔥\n` +
      `📍 Saha: ${currentMatch.venueName}\n` +
      `🗺️ Konum (Google Maps): ${matchMapsUrl}\n` +
      `💰 Kişi Başı: ${currentMatch.costPerPlayer} ₺\n\n` +
      `Kadro netleştiriliyor. Lütfen katılım durumunu hemen onayla:\n\n` +
      `🟢 *[ONAYLIYORUM (MAÇA GELİYORUM)]:*\n${yesUrl}\n\n` +
      `🔴 *[GELMİYORUM (İPTAL)]:*\n${noUrl}\n\n` +
      `⚠️ Yarın son dakika mağduriyeti olmaması için teyit vermeniz zorunludur!`
    );
    const phoneParam = player.phone ? `phone=${player.phone.replace(/\D/g, '')}&` : '';
    window.open(`https://api.whatsapp.com/send?${phoneParam}text=${text}`, '_blank');
  };

  const openPendingBroadcastWhatsApp = () => {
    const pendingNames = categorizedPlayers.bekleniyor
      .map((p, idx) => `${idx + 1}. ${p.name} (${p.primaryPosition})`)
      .join('\n');
    const origin = window.location.origin + window.location.pathname;

    const text = encodeURIComponent(
      `⏳ *HALI SAHA MAÇI TEYİT ÇAĞRISI* ⏳\n\n` +
      `📅 *Tarih:* ${dateFormatted} | ${currentMatch.time}\n` +
      `📍 *Saha:* ${currentMatch.venueName}\n` +
      `🗺️ *Konum (Google Maps):* ${matchMapsUrl}\n\n` +
      `Kadromuzu kesinleştirmek için aşağıdaki arkadaşlarımızın ACİLEN durumunu bildirmesi gerekmektedir:\n\n` +
      `${pendingNames || 'Tüm cevaplar alındı'}\n\n` +
      `📲 *Lütfen aşağıdaki linke tıklayıp [Maça Geliyorum] veya [Gelmiyorum] butonuna basarak onay verin:*\n` +
      `${origin}\n\n` +
      `Teşekkürler! 🤝`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleSendOneDayBroadcast = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
    const generalConfirm = `${origin}?action=confirm`;
    const generalDecline = `${origin}?action=decline`;

    const gelenlerLines = categorizedPlayers.geliyor
      .map((p, idx) => `${idx + 1}. ${p.name} (${p.primaryPosition})`)
      .join('\n');

    const text = encodeURIComponent(`⏰ *YARIN MAÇ GÜNÜ! (SON KATILIM TEYİDİ & HATIRLATMA)* ⏰
📅 *Tarih:* Yarın (${dateFormatted}) | ${currentMatch.time}
📍 *Saha:* ${currentMatch.venueName}
🗺️ *Konum (Google Maps):* ${matchMapsUrl}
👥 *Kadro Durumu:* ${comingCount}/${targetCount} Kişi Onayladı
💰 *Kişi Başı Ücret:* ${currentMatch.costPerPlayer} ₺

✅ *KESİNLEŞEN KADRO:*
${gelenlerLines || '(Henüz kadro kesinleşmedi)'}

👇 *Lütfen katılım durumunu aşağıdaki linklerden son kez ONAYLA:*

🟢 *[ONAYLIYORUM (MAÇA GELİYORUM)]:*
${generalConfirm}

🔴 *[GELMİYORUM (İPTAL)]:*
${generalDecline}

⚠️ *ÖNEMLİ KURAL:* Son dakika iptalleri takımları eksik bırakır. Yarın gelemeyecek olanların BU AKŞAMDAN bildirmesi zorunludur! Herkes vaktinde sahada olsun. ⚽🔥`);

    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleSendOneDayPush = async () => {
    try {
      const d = new Date(currentMatch.date);
      const day = d.toLocaleDateString('tr-TR', { weekday: 'long' });
      await sendOneDayBeforeReminder(day, currentMatch.time, currentMatch.venueName);
      setOneDayNotifSent(true);
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.8 } });
      setTimeout(() => setOneDayNotifSent(false), 3000);
    } catch (err) {
      console.warn('One day before reminder error:', err);
    }
  };

  const getBankDetails = () => {
    const iban = localStorage.getItem('halisaha_iban') || 'TR33 0006 1005 1234 5678 9012 34';
    const receiver = localStorage.getItem('halisaha_receiver') || 'Hadi Hoca';
    return { iban, receiver };
  };

  const [copiedIbanToast, setCopiedIbanToast] = useState(false);

  const copyIbanQuick = () => {
    const { iban, receiver } = getBankDetails();
    navigator.clipboard.writeText(
      `⚽ HALI SAHA MAÇ ÖDEMESİ\n💰 Kişi Başı: ${currentMatch.costPerPlayer} ₺\n🏦 IBAN: ${iban}\n👤 Alıcı: ${receiver}\n📝 Açıklama: [Ad Soyad] Halısaha`
    );
    setCopiedIbanToast(true);
    confetti({ particleCount: 25, spread: 50, origin: { y: 0.8 } });
    setTimeout(() => setCopiedIbanToast(false), 2500);
  };

  const openPlayerIbanWhatsApp = (player: Player) => {
    const { iban, receiver } = getBankDetails();
    const text = encodeURIComponent(
      `Selam ${player.name}, halı saha maç ödemesi için bilgiler aşağıdadır ⚽💰\n\n` +
      `📅 Tarih: ${dateFormatted} | ${currentMatch.time}\n` +
      `📍 Saha: ${currentMatch.venueName}\n` +
      `💰 Tutar: ${currentMatch.costPerPlayer} ₺\n\n` +
      `🏦 IBAN: ${iban}\n` +
      `👤 Alıcı: ${receiver}\n` +
      `📝 Açıklama: ${player.name} Halısaha\n\n` +
      `Gönderince dekont iletirsen veya bilgi verirsen sevinirim, teşekkürler!`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const openMatchIbanGroupWhatsApp = () => {
    const { iban, receiver } = getBankDetails();
    const unpaidList = categorizedPlayers.geliyor
      .filter(p => !currentMatch.payments[p.id]?.isPaid)
      .map((p, idx) => `${idx + 1}. ${p.name} (${currentMatch.costPerPlayer} ₺)`)
      .join('\n');

    const text = encodeURIComponent(
      `⚽ *HALI SAHA MAÇI KASA & IBAN DUYURUSU* ⚽\n` +
      `📅 *Tarih:* ${dateFormatted} | ${currentMatch.time}\n` +
      `📍 *Saha:* ${currentMatch.venueName}\n` +
      `👥 *Format:* ${currentMatch.matchFormat || '7v7'} (${targetCount} Kişi)\n` +
      `💰 *Kişi Başı Ücret:* ${currentMatch.costPerPlayer} ₺\n\n` +
      `🏦 *IBAN:* ${iban}\n` +
      `👤 *Alıcı:* ${receiver}\n` +
      `📝 *Açıklama:* [Adınız] Halısaha\n\n` +
      `📊 *Ödeme Durumu:* ${comingPaidCount} / ${comingCount} Kişi Ödedi\n` +
      `💵 *Kalan Kasa Tutarı:* ${remainingDebtForMatch} ₺\n\n` +
      (unpaidList ? `⏳ *Ödeme Bekleyenler:*\n${unpaidList}\n\n` : `🎉 *Tüm gelenlerin ödemesi tamamlandı!*\n\n`) +
      `Ödeme yapan arkadaşlar lütfen gruba dekont atsın veya bilgi versin. Teşekkürler! 🤝`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* 0. OYUNCU / MİSAFİR MAÇ KATILIM ONAY KARTI */}
      <PlayerAttendanceConfirmCard onOpenAuthModal={() => setShowAuthModal(true)} />

      {/* 1. TARİH, SAAT & GERİ SAYIM KARTI */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 border border-emerald-500/30 p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>{currentMatch.matchNumber}. HAFTA MAÇI</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(isAdmin || isCouncil) && (
              <>
                <button
                  onClick={() => setShowVenueModal(true)}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[11px] font-bold transition-all active:scale-95 shadow-sm"
                  title="Kayıtlı Sahaları Yönet ve Yeni Saha Ekle"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Sahalar</span>
                </button>
                <button
                  onClick={() => setShowEditMatchModal('edit')}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold transition-all active:scale-95 shadow-sm"
                  title="Bu Maçın Tarih, Saat, Saha ve Ücretini Düzenle"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Maçı Düzenle</span>
                </button>
                <button
                  onClick={() => setShowEditMatchModal('create')}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 text-[11px] font-bold transition-all active:scale-95 shadow-sm"
                  title="Yeni Hafta Maçı Planla"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Yeni Maç</span>
                </button>
              </>
            )}
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
        </div>

        {/* Date Display */}
        <h2 className="text-lg font-black text-white capitalize leading-tight mb-1.5">{dateFormatted}</h2>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 mb-3">
          <div className="flex items-center space-x-1 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-white">{currentMatch.time}</span>
          </div>
          <div className="flex items-center space-x-1 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800">
            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="font-semibold text-white">{currentMatch.venueName}</span>
          </div>
          <a
            href={matchMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-2.5 py-1 rounded-lg border border-blue-500/40 font-bold transition-all active:scale-95"
            title="Saha Konumunu Google Maps'te Aç ve Yol Tarifi Al"
          >
            <Navigation className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>Konum / Yol Tarifi</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-80" />
          </a>
          <div className="text-[10px] px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold">
            {currentMatch.matchFormat || '7v7'} ({targetCount} Kişi)
          </div>
          <div className="text-[10px] px-2 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold">
            {currentMatch.costPerPlayer} ₺ / Kişi
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
        {isCouncil ? (
          <>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <button
                onClick={() => setShowBroadcastModal(true)}
                className="flex items-center justify-center space-x-1.5 py-2 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Acil Çağrı</span>
              </button>

              <button
                onClick={() => setShowVisualCardModal(true)}
                className="flex items-center justify-center space-x-1.5 py-2 px-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition-all active:scale-95"
              >
                <span>📸 Görsel Kadro</span>
              </button>

              <button
                onClick={() => setShowDebtReminderModal(true)}
                className="flex items-center justify-center space-x-1.5 py-2 px-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-black text-xs shadow-md shadow-amber-500/20 transition-all active:scale-95"
              >
                <Wallet className="w-3.5 h-3.5 text-black" />
                <span>💬 Kasa Hatırlat</span>
              </button>
            </div>

            {/* 2nd Row: Skor, MVP Oylaması, Gol Krallığı */}
            <div className="grid grid-cols-3 gap-2 mt-2">
              <button
                onClick={() => setShowResultsModal(true)}
                className="flex items-center justify-center space-x-1.5 py-2 px-2 rounded-xl bg-gradient-to-r from-amber-600/30 to-orange-600/30 hover:from-amber-600/40 hover:to-orange-600/40 text-amber-300 border border-amber-500/40 font-bold text-xs transition-all active:scale-95"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Skor & Karne</span>
              </button>

              <button
                onClick={() => setShowMvpModal(true)}
                className="flex items-center justify-center space-x-1.5 py-2 px-2 rounded-xl bg-gradient-to-r from-yellow-600/30 to-amber-600/30 hover:from-yellow-600/40 hover:to-amber-600/40 text-yellow-300 border border-yellow-500/40 font-bold text-xs transition-all active:scale-95"
              >
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                <span>MVP Oyla</span>
              </button>

              <button
                onClick={() => setShowLeaderboardModal(true)}
                className="flex items-center justify-center space-x-1.5 py-2 px-2 rounded-xl bg-gradient-to-r from-emerald-600/30 to-teal-600/30 hover:from-emerald-600/40 hover:to-teal-600/40 text-emerald-300 border border-emerald-500/40 font-bold text-xs transition-all active:scale-95"
              >
                <Flame className="w-3.5 h-3.5 text-emerald-400" />
                <span>Gol Krallığı</span>
              </button>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-3 gap-2 mt-3">
            <button
              onClick={() => setShowVisualCardModal(true)}
              className="flex items-center justify-center space-x-1.5 py-2 px-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition-all active:scale-95"
            >
              <span>📸 Görsel Kadro</span>
            </button>

            <button
              onClick={() => setShowMvpModal(true)}
              className="flex items-center justify-center space-x-1.5 py-2 px-2 rounded-xl bg-gradient-to-r from-yellow-600/30 to-amber-600/30 hover:from-yellow-600/40 hover:to-amber-600/40 text-yellow-300 border border-yellow-500/40 font-bold text-xs transition-all active:scale-95"
            >
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
              <span>MVP Oyla</span>
            </button>

            <button
              onClick={() => setShowLeaderboardModal(true)}
              className="flex items-center justify-center space-x-1.5 py-2 px-2 rounded-xl bg-gradient-to-r from-emerald-600/30 to-teal-600/30 hover:from-emerald-600/40 hover:to-teal-600/40 text-emerald-300 border border-emerald-500/40 font-bold text-xs transition-all active:scale-95"
            >
              <Flame className="w-3.5 h-3.5 text-emerald-400" />
              <span>Gol Krallığı</span>
            </button>
          </div>
        )}
      </div>

      {/* 1.5 CANLI MAÇ GÜNÜ HAVA DURUMU WIDGET */}
      <WeatherWidget
        matchDate={currentMatch.date}
        matchTime={currentMatch.time}
        venueName={currentMatch.venueName}
        venueLocation={currentMatch.venueLocation}
      />

      {/* 2. 1 GÜN ÖNCE MAÇ TEYİT & BİLDİRİM SİSTEMİ (H-24) — Sadece Konsey/Yönetici */}
      {isCouncil && (
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <BellRing className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="text-xs font-black text-white uppercase tracking-wider">
                  1 Gün Önce Maç Teyit & Bildirim (H-24)
                </h3>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  Otomatik & Manuel
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Gelen {comingCount} oyuncuya teyit bildirimi gönder, son dakika iptallerini önle!
              </p>
            </div>
          </div>
        </div>

        {/* Teyit Mini Özeti */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
            <span className="text-[9px] text-emerald-400 block font-bold">🟢 Onaylayanlar</span>
            <span className="text-xs font-black text-white">{comingCount} Kişi</span>
          </div>
          <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-500/30">
            <span className="text-[9px] text-amber-400 block font-bold">⏳ Cevap Bekleyen</span>
            <span className="text-xs font-black text-white">{pendingCount} Kişi</span>
          </div>
          <div className="p-2 rounded-xl bg-rose-950/40 border border-rose-500/30">
            <span className="text-[9px] text-rose-400 block font-bold">🔴 Gelemeyen</span>
            <span className="text-xs font-black text-white">{categorizedPlayers.gelemiyor.length + sattiCount} Kişi</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
          <button
            onClick={handleSendOneDayBroadcast}
            className="flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Yarınki Maçı Gruba Duyur</span>
          </button>

          {pendingCount > 0 && (
            <button
              onClick={openPendingBroadcastWhatsApp}
              className="flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-600/20 transition-all active:scale-95"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Cevap Bekleyenlere Teyit İste ({pendingCount})</span>
            </button>
          )}

          <button
            onClick={handleSendOneDayPush}
            disabled={oneDayNotifSent}
            className={`flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-xl font-bold text-xs transition-all active:scale-95 border ${
              oneDayNotifSent
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-300 shadow-sm'
            }`}
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>{oneDayNotifSent ? 'Bildirim Gönderildi!' : 'Telefonlara Push Bildirim'}</span>
          </button>
        </div>
      </div>
      )}

      {/* 3. BU MAÇA ÖZEL KASA & IBAN DUYURUSU — Sadece Konsey/Yönetici */}
      {isCouncil && (
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="text-xs font-black text-white uppercase tracking-wider">
                  Bu Maça Özel Para Toplama & IBAN
                </h3>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  {currentMatch.costPerPlayer} ₺ / Kişi
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Bu maça katılan oyuncuların ödemelerini takip edin, IBAN ve kasa durumunu WhatsApp'a iletin
              </p>
            </div>
          </div>
        </div>

        {/* Kasa Mini İstatistikleri */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[9px] text-slate-400 block">Saha Ücreti</span>
            <span className="text-xs font-black text-white font-mono">{currentMatch.totalPitchCost} ₺</span>
          </div>
          <div className="p-2 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
            <span className="text-[9px] text-emerald-400 block">Toplanan ({comingPaidCount} Kişi)</span>
            <span className="text-xs font-black text-emerald-300 font-mono">
              {comingPaidCount * currentMatch.costPerPlayer} ₺
            </span>
          </div>
          <div className="p-2 rounded-xl bg-rose-950/30 border border-rose-500/30">
            <span className="text-[9px] text-rose-400 block">Kalan Borç</span>
            <span className="text-xs font-black text-rose-300 font-mono">{remainingDebtForMatch} ₺</span>
          </div>
        </div>

        {/* IBAN Bilgisi ve Gruba Duyur Butonu */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
          <div className="flex items-center space-x-2 text-slate-300 truncate">
            <CreditCard className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-mono text-[11px] text-emerald-200 truncate">{getBankDetails().iban}</span>
            <span className="text-[10px] text-slate-400 shrink-0">({getBankDetails().receiver})</span>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              onClick={copyIbanQuick}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold transition-all active:scale-95"
            >
              {copiedIbanToast ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Kopyalandı</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>IBAN Kopyala</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowDebtReminderModal(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>💬 Gruba Kasa & Borç At</span>
            </button>
          </div>
        </div>
      </div>
      )}

      {/* 3. MEVKİ EKSİKLERİ & AKILLI YEDEK ÖNERİLERİ (Sadece Konsey/Yönetici) */}
      {isCouncil && missingCount > 0 && (
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
                    {isCouncil ? Math.round(sub.finalScore * 10) : '⚽'}
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

                {(isAdmin || isCouncil) && (
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
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DECLINE ALERTS BANNER FOR ADMIN/COUNCIL (Rule 3.3) */}
      {(isAdmin || isCouncil) && currentMatch.adminDeclineAlerts && currentMatch.adminDeclineAlerts.filter(a => !a.read).length > 0 && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/70 via-slate-900 to-slate-900 border border-rose-500/50 shadow-xl space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-rose-300 flex items-center space-x-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 animate-bounce shrink-0" />
              <span>Yeni "Gelmiyorum" Yanıtları ({currentMatch.adminDeclineAlerts.filter(a => !a.read).length})</span>
            </span>
            <span className="text-[10px] text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded-full font-bold border border-rose-500/30">
              Yönetici Uyarısı
            </span>
          </div>

          <div className="space-y-1.5">
            {currentMatch.adminDeclineAlerts.filter(a => !a.read).map(alert => (
              <div
                key={alert.id}
                className="p-2.5 rounded-xl bg-slate-950/80 border border-rose-500/30 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-white">{alert.playerName}</span>
                    <span className="text-rose-400 font-bold">({alert.response})</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {alert.matchNumber}. Hafta Maçı • Yanıt Zamanı: {new Date(alert.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <button
                  onClick={() => dismissDeclineAlert(currentMatch.id, alert.id)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-bold transition-all active:scale-95 shrink-0"
                >
                  Gördüm / Kapat
                </button>
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
              {isCouncil ? 'Oyuncu Durumları (45 Kişilik Havuz)' : `Maça Katılacak Kadro (${comingCount} Kişi)`}
            </h3>
          </div>
        </div>

        {/* Re-notification Button for Pending Players (Rule 3.4) */}
        {(isAdmin || isCouncil) && categorizedPlayers.bekleniyor.length > 0 && (
          <button
            onClick={handleTriggerReNotification}
            disabled={isSendingReNotify}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 text-white font-black text-xs shadow-lg shadow-amber-600/25 flex items-center justify-center space-x-2 transition-all active:scale-95"
          >
            <BellRing className="w-4 h-4 animate-bounce shrink-0" />
            <span>
              {isSendingReNotify
                ? 'Bildirimler İletiliyor...'
                : `Yanıt Vermeyenlere Tekrar Bildirim Gönder (${categorizedPlayers.bekleniyor.length} Kişi)`}
            </span>
          </button>
        )}

        {/* Filter Tabs (Sadece Konsey/Yönetici) */}
        {isCouncil && (
          <div className="grid grid-cols-5 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
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
              onClick={() => setActiveFilter('satti')}
              className={`py-1.5 px-1 rounded-lg font-bold text-center transition-all ${
                activeFilter === 'satti'
                  ? 'bg-rose-600 text-white shadow-md animate-pulse'
                  : 'text-rose-400 hover:text-white'
              }`}
            >
              Sattı 🚨 ({sattiCount})
            </button>

            <button
              onClick={() => setActiveFilter('all')}
              className={`py-1.5 px-1 rounded-lg font-bold text-center transition-all ${
                activeFilter === 'all'
                  ? 'bg-slate-700 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tümü ({players.length})
            </button>
          </div>
        )}

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

        {/* Single Player Notification Dispatched Toast Banner */}
        {playerNotifyToast && (
          <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-900 border border-amber-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-lg animate-in fade-in">
            <div className="flex items-start space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <BellRing className="w-4 h-4 animate-bounce" />
              </div>
              <div className="text-xs">
                <span className="font-black text-white block">
                  🔔 {playerNotifyToast.player.name} İçin Katılım Bildirimi Gönderildi!
                </span>
                <span className="text-[11px] text-amber-300/90 block">
                  Oyuncu telefonundan yanıt verene kadar durumu <strong>"Haber Bekleniyor (Bekliyor)"</strong> olarak ayarlandı.
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 shrink-0">
              <button
                onClick={() => openPersonalWhatsAppPing(playerNotifyToast.player)}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center space-x-1 shadow-md transition-all active:scale-95"
                title="Oyuncunun telefonuna tek tıkla yanıt linkini WhatsApp'tan da ilet"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp ile Telefona İlet</span>
              </button>
              <button
                onClick={() => setPlayerNotifyToast(null)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold border border-slate-700"
              >
                Tamam
              </button>
            </div>
          </div>
        )}

        {/* Player List */}
        <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
          {displayPlayers.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              Bu filtreye uygun oyuncu bulunamadı.
            </div>
          ) : (
            displayPlayers.map(p => {
              const status = currentMatch.attendance[p.id] || 'Haber Bekleniyor';
              const isComing = status === 'Geliyor' || status === 'Geldi';
              const isPending = status === 'Haber Bekleniyor' || status === 'Beklemede';
              const isNotComing = status === 'Gelemiyor' || status === 'Gelmedi';
              const isSatti = status === 'Satış koydu' || status === 'Son dakika iptal';
              const isPaid = !!currentMatch.payments[p.id]?.isPaid;
              const reqInfo = currentMatch.attendanceRequests?.[p.id];
              const isWaitingNotificationResponse = reqInfo?.status === 'pending' && isPending;

              return (
                <div
                  key={p.id}
                  className={`p-2.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    isSatti
                      ? 'bg-red-950/30 border-red-500/40'
                      : isComing
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : isPending
                      ? 'bg-amber-950/20 border-amber-500/30'
                      : 'bg-slate-950/50 border-slate-800 opacity-75'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        isSatti
                          ? 'bg-rose-500 animate-ping'
                          : isComing
                          ? 'bg-emerald-400'
                          : isPending
                          ? 'bg-amber-400'
                          : 'bg-slate-500'
                      }`}
                    />
                    <div>
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <span className="font-bold text-xs text-white">{p.name}</span>
                        {p.isJoker && (
                          <span className="text-[8px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold">
                            Joker
                          </span>
                        )}
                        {isCouncil && isWaitingNotificationResponse && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold flex items-center space-x-1">
                            <BellRing className="w-2.5 h-2.5 text-amber-400 animate-pulse" />
                            <span>Haber Bekleniyor (Bildirim Gönderildi)</span>
                          </span>
                        )}
                        {isCouncil && reqInfo?.status === 'responded' && !isPending && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                            📱 Bildirime Yanıt Verdi
                          </span>
                        )}
                        {isCouncil && isSatti && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-600/30 text-rose-300 border border-rose-500/40 font-black">
                            🚨 SATTI (-15 P)
                          </span>
                        )}
                        {(isCouncil || currentUser.playerId === p.id) && isComing && (
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${
                              isPaid
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            }`}
                          >
                            {isPaid ? 'Ödedi ✓' : 'Ödemedi ⏳'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                        <span className="text-slate-300 font-semibold">{p.primaryPosition}</span>
                        {isCouncil && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-emerald-400 font-bold">
                              {Math.round(p.finalScore * 10)} OVR
                            </span>
                          </>
                        )}
                        {isCouncil && p.attendanceStats.penaltyPoints > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-rose-400 font-bold">
                              Ceza: {p.attendanceStats.penaltyPoints} P
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Area */}
                  {(isAdmin || isCouncil) ? (
                    <div className="flex items-center flex-wrap gap-1">
                      {/* NEW BUTTON FOR EVERY PLAYER: SEND ATTENDANCE NOTIFICATION */}
                      <button
                        onClick={() => handleSendPlayerNotification(p)}
                        title="Oyuncunun telefonuna maça gelip gelmeyeceğini soran bildirim gönder (Cevap verene kadar statüsü Bekliyor kalır)"
                        className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-[10px] font-black border transition-all active:scale-95 ${
                          isWaitingNotificationResponse
                            ? 'bg-amber-500/25 text-amber-200 border-amber-400/60 hover:bg-amber-500/35'
                            : 'bg-blue-600/25 hover:bg-blue-600/40 text-blue-200 border-blue-500/50 shadow-sm'
                        }`}
                      >
                        <BellRing className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>Sor</span>
                      </button>

                      {/* Coming Player In-match Payment & IBAN Actions */}
                      {isComing && (
                        <>
                          <button
                            onClick={() => togglePayment(p.id)}
                            title={isPaid ? 'Ödemeyi İptal Et' : 'Ödedi Olarak İşaretle'}
                            className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all active:scale-95 ${
                              isPaid
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                            }`}
                          >
                            <Wallet className="w-3 h-3" />
                            <span>{isPaid ? 'Ödedi ✓' : 'Ödeme Al'}</span>
                          </button>

                          <button
                            onClick={() => openPlayerIbanWhatsApp(p)}
                            title="Oyuncuya WhatsApp'tan IBAN ve Ücret Bilgisi Gönder"
                            className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-bold transition-all active:scale-95"
                          >
                            <CreditCard className="w-3 h-3 text-emerald-400" />
                            <span>IBAN At</span>
                          </button>
                        </>
                      )}

                      {/* WhatsApp Direct Link Button */}
                      <button
                        onClick={() => openPersonalWhatsAppPing(p)}
                        title="WhatsApp'tan Tek Tıkla Yanıt Linki Gönder"
                        className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold transition-all active:scale-95"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>Sor</span>
                      </button>

                      {/* 4 Manual Attendance Status Buttons for Admin / Council */}
                      <button
                        onClick={() => updateAttendance(p.id, 'Geliyor')}
                        title="Manuel: Geliyor Olarak İşaretle (Kadroya Alınır)"
                        className={`px-2 py-1 rounded-lg text-[10px] font-black border transition-all ${
                          isComing
                            ? 'bg-emerald-500 text-black border-emerald-400 shadow-sm'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        Geliyor
                      </button>

                      <button
                        onClick={() => updateAttendance(p.id, 'Haber Bekleniyor')}
                        title="Manuel: Haber Bekleniyor / Bekliyor"
                        className={`px-2 py-1 rounded-lg text-[10px] font-black border transition-all ${
                          isPending
                            ? 'bg-amber-500 text-black border-amber-400 shadow-sm'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        Bekliyor
                      </button>

                      <button
                        onClick={() => updateAttendance(p.id, 'Gelemiyor')}
                        title="Manuel: Gelemiyor Olarak İşaretle"
                        className={`px-2 py-1 rounded-lg text-[10px] font-black border transition-all ${
                          isNotComing
                            ? 'bg-slate-700 text-white border-slate-600 shadow-sm'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        Gelmiyor
                      </button>

                      <button
                        onClick={() => updateAttendance(p.id, 'Satış koydu')}
                        title="Manuel: Son Anda Satış Koydu (-15 Ceza Puanı, Kadrodan Çıkarılır)"
                        className={`px-2 py-1 rounded-lg text-[10px] font-black border transition-all ${
                          isSatti
                            ? 'bg-rose-600 text-white border-rose-500 shadow-md animate-pulse'
                            : 'bg-rose-950/40 text-rose-300 border-rose-800/60 hover:bg-rose-900/50'
                        }`}
                      >
                        Sattı 🚨
                      </button>
                    </div>
                  ) : (
                    /* Player / Guest View */
                    <div className="flex items-center space-x-1.5">
                      {currentUser.playerId === p.id ? (
                        /* Self-Attendance confirmation buttons for the logged-in player */
                        <div className="flex items-center space-x-1 bg-slate-950/80 p-1 rounded-xl border border-blue-500/40">
                          <button
                            onClick={() => updateAttendance(p.id, 'Geliyor')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-black border transition-all active:scale-95 ${
                              isComing
                                ? 'bg-emerald-500 text-black border-emerald-400 shadow-sm'
                                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                            }`}
                          >
                            Geliyorum ✓
                          </button>
                          <button
                            onClick={() => updateAttendance(p.id, 'Gelemiyor')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-black border transition-all active:scale-95 ${
                              isNotComing
                                ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                            }`}
                          >
                            Gelmiyorum ✗
                          </button>
                        </div>
                      ) : (
                        /* Read-only status badge for other players */
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                            isSatti
                              ? 'bg-rose-950/40 text-rose-300 border-rose-500/40'
                              : isComing
                              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                              : isPending
                              ? 'bg-amber-950/40 text-amber-300 border-amber-500/40'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {isSatti ? 'Sattı 🚨' : isComing ? 'Geliyor' : isPending ? 'Haber Bekleniyor' : 'Gelmiyor'}
                        </span>
                      )}
                    </div>
                  )}
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

      {/* 6. ADD TO CALENDAR MODAL */}
      {showCalendarModal && (
        <AddToCalendarModal
          match={currentMatch}
          onClose={() => setShowCalendarModal(false)}
        />
      )}

      {/* 7. EDIT / CREATE MATCH MODAL */}
      {showEditMatchModal && (
        <EditMatchModal
          initialMode={showEditMatchModal}
          onClose={() => setShowEditMatchModal(null)}
        />
      )}

      {/* 8. AUTH ROLE SWITCH MODAL */}
      {showAuthModal && (
        <AuthRoleModal onClose={() => setShowAuthModal(false)} />
      )}

      {/* 9. MVP PUBLIC VOTING MODAL */}
      {showMvpModal && (
        <MvpVotingModal onClose={() => setShowMvpModal(false)} />
      )}

      {/* 10. LEADERBOARD & GOL KRALLIĞI MODAL */}
      {showLeaderboardModal && (
        <LeaderboardModal onClose={() => setShowLeaderboardModal(false)} />
      )}

      {/* 11. MATCH RESULTS & SCORERS MODAL */}
      {showResultsModal && (
        <MatchResultsModal
          onClose={() => setShowResultsModal(false)}
          onOpenMvpVoting={() => setShowMvpModal(true)}
        />
      )}

      {/* 12. RE-NOTIFICATION DISPATCH REPORT MODAL (Rule 3.4) */}
      {reNotificationModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <BellRing className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Tekrar Bildirim Gönderim Raporu</h3>
                  <p className="text-[10px] text-slate-400">{currentMatch.matchNumber}. Hafta Maç Daveti</p>
                </div>
              </div>
              <button
                onClick={() => setReNotificationModal(null)}
                className="text-slate-400 hover:text-white p-1 text-sm"
              >
                ✕
              </button>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block font-semibold">Hedeflenen</span>
                <span className="text-lg font-black text-white font-mono">{reNotificationModal.targetedCount}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-2xl border border-emerald-500/30 text-center">
                <span className="text-[10px] text-emerald-400 block font-semibold">Başarılı</span>
                <span className="text-lg font-black text-emerald-400 font-mono">{reNotificationModal.successfulCount}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block font-semibold">Başarısız</span>
                <span className="text-lg font-black text-slate-400 font-mono">{reNotificationModal.failedCount}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
              ✓ Gerçek sistem bildirimleri tetiklendi. Ayrıca aşağıdaki listeden her oyuncuya doğrudan WhatsApp üzerinden de tek tıkla hatırlatma yapabilirsiniz.
            </div>

            {/* Recipient breakdown list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block px-1">
                Hedeflenen Oyuncular ({reNotificationModal.recipients.length})
              </span>
              {reNotificationModal.recipients.map(r => {
                const p = playersMap[r.playerId];
                return (
                  <div
                    key={r.playerId}
                    className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-white">{r.playerName}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                          İletildi ✓
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {p?.primaryPosition || 'Oyuncu'} {r.phone ? `• ${r.phone}` : ''}
                      </span>
                    </div>

                    {p && (
                      <button
                        onClick={() => openPersonalWhatsAppPing(p)}
                        className="px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center space-x-1 transition-all active:scale-95"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setReNotificationModal(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
            >
              Tamam
            </button>
          </div>
        </div>
      )}

      {/* WHATSAPP DEBT REMINDER MODAL */}
      {showDebtReminderModal && (
        <WhatsAppDebtReminderModal
          match={currentMatch}
          onClose={() => setShowDebtReminderModal(false)}
        />
      )}

      {/* SQUAD VISUAL CARD MODAL */}
      {showVisualCardModal && (
        <SquadVisualCardModal
          match={currentMatch}
          onClose={() => setShowVisualCardModal(false)}
        />
      )}

      {/* VENUE MANAGER MODAL */}
      {showVenueModal && (
        <VenueManagerModal onClose={() => setShowVenueModal(false)} />
      )}
    </div>
  );
};
