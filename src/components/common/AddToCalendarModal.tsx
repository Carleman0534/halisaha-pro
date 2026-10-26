import React, { useState } from 'react';
import { Calendar, Download, ExternalLink, Check, Clock, MapPin, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Match } from '../../types';
import { generateGoogleCalendarUrl, downloadIcsFile } from '../../utils/calendar';

interface AddToCalendarModalProps {
  match: Match;
  onClose: () => void;
}

export const AddToCalendarModal: React.FC<AddToCalendarModalProps> = ({ match, onClose }) => {
  const [downloaded, setDownloaded] = useState(false);

  const handleGoogleCalendar = () => {
    const url = generateGoogleCalendarUrl(match);
    window.open(url, '_blank');
  };

  const handleDownloadIcs = () => {
    downloadIcsFile(match);
    setDownloaded(true);
    try {
      confetti({ particleCount: 25, spread: 50, origin: { y: 0.7 } });
    } catch {}
    setTimeout(() => setDownloaded(false), 3000);
  };

  const dateFormatted = new Date(match.date).toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Takvime Ekle</h3>
              <p className="text-[10px] text-slate-400">Maçı telefon ajandana 2 saat öncesine alarmlı ekle</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Match Info Summary Card */}
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-xs">
          <div className="font-bold text-white text-sm capitalize">{dateFormatted}</div>
          <div className="flex items-center space-x-2 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>{match.time}</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-rose-400" />
            <span>{match.venueName} ({match.pitchNo})</span>
          </div>
          <div className="text-[10px] text-amber-400/90 pt-1">
            ⏰ Etkinlik oluşturulurken maçtan 2 saat önce ve 1 gün önce için otomatik bildirim alarmları eklenir.
          </div>
        </div>

        {/* Action Options */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleGoogleCalendar}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-white border border-slate-700 transition-all active:scale-95 group"
          >
            <div className="flex items-center space-x-2.5">
              <span className="text-xl">📅</span>
              <div className="text-left">
                <div className="font-bold text-xs text-white">Google Takvim'e Ekle</div>
                <div className="text-[10px] text-slate-400">Android & Tarayıcı için doğrudan açar</div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
          </button>

          <button
            onClick={handleDownloadIcs}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-white border border-slate-700 transition-all active:scale-95 group"
          >
            <div className="flex items-center space-x-2.5">
              <span className="text-xl">🍏</span>
              <div className="text-left">
                <div className="font-bold text-xs text-white">
                  {downloaded ? 'Takvim Dosyası İndirildi!' : 'Apple / Outlook Takvim (.ics)'}
                </div>
                <div className="text-[10px] text-slate-400">iPhone Takvim & Outlook için tek tık</div>
              </div>
            </div>
            {downloaded ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Download className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
            )}
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 bg-slate-800/60 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
        >
          Kapat
        </button>
      </div>
    </div>
  );
};
