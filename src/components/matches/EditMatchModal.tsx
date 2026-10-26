import React, { useState } from 'react';
import { Calendar, Clock, MapPin, DollarSign, X, Check, Plus, Edit3, Sliders } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import { Match } from '../../types';

interface EditMatchModalProps {
  initialMode?: 'edit' | 'create';
  onClose: () => void;
}

export const EditMatchModal: React.FC<EditMatchModalProps> = ({
  initialMode = 'edit',
  onClose,
}) => {
  const { currentMatch, updateMatchDetails, createNewMatch } = useApp();

  const [mode, setMode] = useState<'edit' | 'create'>(initialMode);

  // Form states
  const [date, setDate] = useState(
    initialMode === 'edit' ? currentMatch.date : new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [time, setTime] = useState(currentMatch.time || '21:00 - 22:00');
  const [venueName, setVenueName] = useState(currentMatch.venueName || 'Olimpiyat Halı Saha');
  const [pitchNo, setPitchNo] = useState(currentMatch.pitchNo || 'Saha 1');
  const [totalCost, setTotalCost] = useState(currentMatch.totalPitchCost || 2800);
  const [format, setFormat] = useState<'5v5' | '6v6' | '7v7' | '8v8'>(currentMatch.matchFormat || '7v7');

  const targetCount = format === '5v5' ? 10 : format === '6v6' ? 12 : format === '8v8' ? 16 : 14;
  const costPerPlayer = Math.round(totalCost / targetCount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'edit') {
      updateMatchDetails({
        date,
        time,
        venueName: venueName.trim(),
        pitchNo: pitchNo.trim(),
        totalPitchCost: totalCost,
        costPerPlayer,
        matchFormat: format,
        targetSquadCount: targetCount,
      });
    } else {
      createNewMatch(date, time, totalCost, venueName.trim());
      updateMatchDetails({
        pitchNo: pitchNo.trim(),
        matchFormat: format,
        targetSquadCount: targetCount,
        costPerPlayer,
      });
    }

    try {
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 } });
    } catch {}

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              {mode === 'edit' ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">
                {mode === 'edit' ? 'Maç Bilgilerini Düzenle' : 'Yeni Hafta Maçı Ekle'}
              </h3>
              <p className="text-[10px] text-slate-400">Tarih, saat, saha ve kişi başı ücret ayarları</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setMode('edit')}
            className={`py-1.5 rounded-lg transition-all ${
              mode === 'edit' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Mevcut Maçı Düzenle ({currentMatch.matchNumber}. Hafta)
          </button>
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`py-1.5 rounded-lg transition-all ${
              mode === 'create' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            + Yeni Hafta Maçı Planla
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Format Selector */}
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Maç Formatı & Kadro Hedefi
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['5v5', '6v6', '7v7', '8v8'] as const).map(fmt => {
                const count = fmt === '5v5' ? 10 : fmt === '6v6' ? 12 : fmt === '8v8' ? 16 : 14;
                const active = format === fmt;
                return (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setFormat(fmt)}
                    className={`py-1.5 px-1 rounded-xl text-center border text-xs transition-all ${
                      active
                        ? 'bg-emerald-600 border-emerald-400 text-white font-black shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div>{fmt}</div>
                    <div className="text-[9px] opacity-75">{count} Kişi</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Maç Tarihi
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Saat Aralığı
              </label>
              <input
                type="text"
                required
                placeholder="21:00 - 22:00"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
              />
            </div>
          </div>

          {/* Venue & Pitch */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Saha / Tesis Adı
              </label>
              <input
                type="text"
                required
                placeholder="Olimpiyat Halı Saha"
                value={venueName}
                onChange={e => setVenueName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Saha Numarası / Bölüm
              </label>
              <input
                type="text"
                required
                placeholder="Saha 1 (Kapalı)"
                value={pitchNo}
                onChange={e => setPitchNo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
              />
            </div>
          </div>

          {/* Cost & Calculation Preview */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-300">
                Toplam Saha Ücreti (TL)
              </label>
              <div className="text-[11px] text-emerald-400 font-bold">
                Kişi Başı: {costPerPlayer} ₺
              </div>
            </div>

            <div className="relative">
              <input
                type="number"
                min="0"
                step="50"
                required
                value={totalCost}
                onChange={e => setTotalCost(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">₺</span>
            </div>

            <div className="text-[10px] text-slate-400">
              💡 Toplam {totalCost} ₺ saha bedeli, {targetCount} kişiye bölündüğünde kişi başı <strong>{costPerPlayer} ₺</strong> olarak otomatik güncellenir.
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs rounded-xl"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
            >
              {mode === 'edit' ? 'Değişiklikleri Kaydet' : 'Yeni Maçı Başlat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
