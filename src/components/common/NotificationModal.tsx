import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  Check,
  X,
  AlertCircle,
  Clock,
  ShieldAlert,
  CircleDollarSign,
  Send,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  sendTestNotification,
  sendMatchReminderNotification,
  sendMissingPlayerNotification,
  sendPaymentReminderNotification,
} from '../../services/notifications';

interface NotificationModalProps {
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ onClose }) => {
  const { currentMatch } = useApp();

  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [supported, setSupported] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Auto reminders toggles (stored in localStorage)
  const [autoMatchReminder, setAutoMatchReminder] = useState(() => {
    return localStorage.getItem('halisaha_notif_match') !== 'false';
  });
  const [autoMissingReminder, setAutoMissingReminder] = useState(() => {
    return localStorage.getItem('halisaha_notif_missing') !== 'false';
  });

  useEffect(() => {
    setSupported(isNotificationSupported());
    setPermission(getNotificationPermission());
  }, []);

  const handleRequestPermission = async () => {
    const perm = await requestNotificationPermission();
    setPermission(perm);
    if (perm === 'granted') {
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.8 } });
      await sendTestNotification();
      setFeedbackMsg('Bildirimler başarıyla açıldı ve test bildirimi gönderildi!');
    } else {
      setFeedbackMsg('Bildirim izni verilmedi. Tarayıcı ayarlarınızdan izin verebilirsiniz.');
    }
  };

  const handleTestNotification = async () => {
    const ok = await sendTestNotification();
    if (ok) {
      setFeedbackMsg('Test bildirimi cihazınıza iletildi!');
      confetti({ particleCount: 20, spread: 50, origin: { y: 0.8 } });
    } else {
      setFeedbackMsg('Bildirim gönderilemedi. Lütfen önce izin verin.');
    }
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleSendMatchReminder = async () => {
    const d = new Date(currentMatch.date);
    const day = d.toLocaleDateString('tr-TR', { weekday: 'long' });
    const ok = await sendMatchReminderNotification(day, currentMatch.time, currentMatch.venueName);
    if (ok) {
      setFeedbackMsg('Maç hatırlatma bildirimi gönderildi!');
    }
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleSendMissingAlert = async () => {
    const target = currentMatch.targetSquadCount || 14;
    const coming = Object.values(currentMatch.attendance).filter(
      s => s === 'Geliyor' || s === 'Geldi'
    ).length;
    const missing = Math.max(1, target - coming);

    const ok = await sendMissingPlayerNotification(missing);
    if (ok) {
      setFeedbackMsg(`${missing} kişilik eksik çağrısı bildirimi gönderildi!`);
    }
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleSendPaymentReminder = async () => {
    const ok = await sendPaymentReminderNotification(currentMatch.costPerPlayer);
    if (ok) {
      setFeedbackMsg('Saha ücreti hatırlatma bildirimi gönderildi!');
    }
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const toggleAutoMatch = (val: boolean) => {
    setAutoMatchReminder(val);
    localStorage.setItem('halisaha_notif_match', val.toString());
  };

  const toggleAutoMissing = (val: boolean) => {
    setAutoMissingReminder(val);
    localStorage.setItem('halisaha_notif_missing', val.toString());
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <BellRing className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Sistem Bildirimleri</h3>
              <p className="text-[10px] text-slate-400">Telefon ve tarayıcı maç hatırlatıcıları</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center space-x-1.5 animate-in slide-in-from-top-1">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Permission Status Card */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Bildirim İzni Durumu:</span>
            {permission === 'granted' ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black flex items-center space-x-1">
                <Check className="w-3 h-3" />
                <span>AKTİF / İZİN VERİLDİ</span>
              </span>
            ) : permission === 'denied' ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 font-black">
                ENGELLENDİ
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-black">
                İZİN BEKLENİYOR
              </span>
            )}
          </div>

          {permission !== 'granted' ? (
            <button
              onClick={handleRequestPermission}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all active:scale-95 flex items-center justify-center space-x-1.5"
            >
              <Bell className="w-4 h-4" />
              <span>Bildirim İzni Ver & Aç</span>
            </button>
          ) : (
            <button
              onClick={handleTestNotification}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold text-xs transition-all active:scale-95 flex items-center justify-center space-x-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Cihazda Test Bildirimi Gönder</span>
            </button>
          )}
        </div>

        {/* Quick Send Halı Saha Alerts */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold text-slate-300 block">
            Anlık Halı Saha Bildirimleri Gönder:
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={handleSendMatchReminder}
              className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-left transition-all active:scale-95"
            >
              <Clock className="w-4 h-4 text-emerald-400 mb-1" />
              <span className="text-xs font-bold text-white block">Maç Saati</span>
              <span className="text-[9px] text-slate-400 block">Geri sayım & saha bilgisi</span>
            </button>

            <button
              onClick={handleSendMissingAlert}
              className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-left transition-all active:scale-95"
            >
              <ShieldAlert className="w-4 h-4 text-rose-400 mb-1" />
              <span className="text-xs font-bold text-white block">Acil Eksik</span>
              <span className="text-[9px] text-slate-400 block">Yedek arayışı uyarısı</span>
            </button>

            <button
              onClick={handleSendPaymentReminder}
              className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-left transition-all active:scale-95"
            >
              <CircleDollarSign className="w-4 h-4 text-amber-400 mb-1" />
              <span className="text-xs font-bold text-white block">Ücret Takibi</span>
              <span className="text-[9px] text-slate-400 block">Kişi başı {currentMatch.costPerPlayer} ₺</span>
            </button>
          </div>
        </div>

        {/* Automatic Reminders Toggles */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <span className="text-[11px] font-semibold text-slate-300 block">
            Otomatik Bildirim Tercihleri:
          </span>

          <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
            <span>Maç günü sabahı hatırlatıcı bildirim</span>
            <input
              type="checkbox"
              checked={autoMatchReminder}
              onChange={e => toggleAutoMatch(e.target.checked)}
              className="w-4 h-4 accent-emerald-500 rounded"
            />
          </label>

          <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
            <span>Kadroda eksik olduğunda uyarı gönder</span>
            <input
              type="checkbox"
              checked={autoMissingReminder}
              onChange={e => toggleAutoMissing(e.target.checked)}
              className="w-4 h-4 accent-emerald-500 rounded"
            />
          </label>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all"
        >
          Kapat
        </button>
      </div>
    </div>
  );
};
