import React, { useState } from 'react';
import {
  UserPlus,
  Users,
  Check,
  X,
  Sparkles,
  Phone,
  Shield,
  Zap,
  Star,
  Copy,
  Plus,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import { Position } from '../../types';

interface QuickAddPlayerModalProps {
  onClose: () => void;
}

export const QuickAddPlayerModal: React.FC<QuickAddPlayerModalProps> = ({ onClose }) => {
  const { addPlayer, batchAddPlayers } = useApp();

  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');

  // Single Player Form State
  const [name, setName] = useState('');
  const [position, setPosition] = useState<Position>('Orta saha');
  const [secPosition, setSecPosition] = useState<Position | ''>('');
  const [phone, setPhone] = useState('');
  const [isJoker, setIsJoker] = useState(false);
  const [baselineScore, setBaselineScore] = useState<number>(7.5);
  const [addToSquad, setAddToSquad] = useState(false);

  // Batch Players State
  const [batchText, setBatchText] = useState('');
  const [batchDefaultPos, setBatchDefaultPos] = useState<Position>('Orta saha');
  const [batchAddToSquad, setBatchAddToSquad] = useState(false);

  const positionButtons: { pos: Position; label: string; icon: string }[] = [
    { pos: 'Kaleci', label: 'Kaleci', icon: '🧤' },
    { pos: 'Defans', label: 'Defans', icon: '🛡️' },
    { pos: 'Orta saha', label: 'Orta Saha', icon: '🎯' },
    { pos: 'Kanat', label: 'Kanat', icon: '⚡' },
    { pos: 'Forvet', label: 'Forvet', icon: '⚽' },
  ];

  const presetProfiles = [
    { label: 'Yıldız / Çok İyi', score: 8.5, desc: 'Maçı tek başına çözebilen, teknik', badge: '8.5 OVR' },
    { label: 'Tempolu / İyi', score: 8.0, desc: 'Çok koşan, takım oyununa yatkın', badge: '8.0 OVR' },
    { label: 'Standart / Dengeli', score: 7.5, desc: 'Grup ortalaması, sırıtmıyor', badge: '7.5 OVR' },
    { label: 'Gelişmekte Olan', score: 6.8, desc: 'Nadir oynayan veya yeni başlayan', badge: '6.8 OVR' },
  ];

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addPlayer(
      name.trim(),
      position,
      secPosition ? (secPosition as Position) : undefined,
      isJoker,
      phone.trim() || undefined,
      baselineScore,
      addToSquad
    );

    confetti({ particleCount: 35, spread: 60, origin: { y: 0.8 } });
    onClose();
  };

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchText.trim()) return;

    // Parse lines: each line is an entry, e.g. "Ahmet", "Murat (Kaleci)", "Caner 0532..."
    const lines = batchText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length === 0) return;

    const parsedList = lines.map(line => {
      let detectedPos: Position = batchDefaultPos;
      const lower = line.toLowerCase();

      if (lower.includes('kaleci')) detectedPos = 'Kaleci';
      else if (lower.includes('defans')) detectedPos = 'Defans';
      else if (lower.includes('orta')) detectedPos = 'Orta saha';
      else if (lower.includes('kanat')) detectedPos = 'Kanat';
      else if (lower.includes('forvet')) detectedPos = 'Forvet';

      // Clean name from parentheses
      const cleanName = line
        .replace(/\(kaleci\)|\(defans\)|\(orta saha\)|\(kanat\)|\(forvet\)/gi, '')
        .trim();

      return {
        name: cleanName,
        pos: detectedPos,
        baselineScore: 7.5,
        isJoker: false,
      };
    });

    batchAddPlayers(parsedList, batchAddToSquad);
    confetti({ particleCount: 50, spread: 70, origin: { y: 0.8 } });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Yeni Oyuncu Tanımla</h3>
              <p className="text-[10px] text-slate-400">Hızlı şablonlar ile tek dokunuşta havuza ekleyin</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('single')}
            className={`py-2 rounded-lg font-bold transition-all ${
              activeTab === 'single'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ⚡ Hızlı Tekil Ekle
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('batch')}
            className={`py-2 rounded-lg font-bold transition-all ${
              activeTab === 'batch'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📋 Toplu Ekle (WhatsApp'tan)
          </button>
        </div>

        {/* SINGLE PLAYER TAB */}
        {activeTab === 'single' ? (
          <form onSubmit={handleSingleSubmit} className="space-y-3.5">
            {/* Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Adı Soyadı <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Arda Güler"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Telefon No (Opsiyonel)
                </label>
                <input
                  type="tel"
                  placeholder="05xxxxxxxxx"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Position Touch Selector */}
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">
                Mevkisi (Tek Dokunuşla Seçin):
              </label>
              <div className="grid grid-cols-5 gap-1">
                {positionButtons.map(btn => (
                  <button
                    key={btn.pos}
                    type="button"
                    onClick={() => setPosition(btn.pos)}
                    className={`py-2 px-1 rounded-xl text-center transition-all border ${
                      position === btn.pos
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-black shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-sm block">{btn.icon}</span>
                    <span className="text-[10px] block mt-0.5">{btn.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Preset Rating Template */}
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">
                Oyuncu Seviyesi / Güç Şablonu:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {presetProfiles.map(p => (
                  <button
                    key={p.score}
                    type="button"
                    onClick={() => setBaselineScore(p.score)}
                    className={`p-2 rounded-xl text-left border transition-all ${
                      baselineScore === p.score
                        ? 'bg-emerald-950/60 border-emerald-400 text-white shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white block">{p.label}</span>
                      <span className="text-[10px] font-black font-mono text-emerald-400">
                        {p.badge}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-400 block line-clamp-1 mt-0.5">
                      {p.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Checkboxes: Joker & Immediate Squad Add */}
            <div className="space-y-2 pt-1 border-t border-slate-800/80">
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isJoker}
                  onChange={e => setIsJoker(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded"
                />
                <span className="font-semibold">'Joker' Oyuncu Etiketi Ver</span>
                <span className="text-[10px] text-purple-400">(Her mevkide oynayabilir)</span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addToSquad}
                  onChange={e => setAddToSquad(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded"
                />
                <span className="font-semibold text-emerald-300">
                  Bu haftaki maça hemen 'Geliyor' olarak dahil et
                </span>
              </label>
            </div>

            {/* Submit Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all active:scale-95 flex items-center justify-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Oyuncuyu Kaydet</span>
              </button>
            </div>
          </form>
        ) : (
          /* BATCH ADD TAB (WHATSAPP LIST) */
          <form onSubmit={handleBatchSubmit} className="space-y-3.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-300">
                  İsim Listesi (Her Satıra Bir Oyuncu):
                </label>
                <span className="text-[10px] text-emerald-400 font-semibold">
                  WhatsApp'tan kopyalayıp yapıştırın
                </span>
              </div>

              <textarea
                rows={6}
                required
                value={batchText}
                onChange={e => setBatchText(e.target.value)}
                placeholder={`Ahmet Yılmaz\nMurat Can (Kaleci)\nBarış Demir (Defans)\nKemal Hoca\nSerhat`}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono leading-relaxed select-all resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Varsayılan Mevki:
                </label>
                <select
                  value={batchDefaultPos}
                  onChange={e => setBatchDefaultPos(e.target.value as Position)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Orta saha">Orta saha</option>
                  <option value="Defans">Defans</option>
                  <option value="Kanat">Kanat</option>
                  <option value="Forvet">Forvet</option>
                  <option value="Kaleci">Kaleci</option>
                </select>
              </div>

              <div className="flex items-end pb-1">
                <label className="flex items-center space-x-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={batchAddToSquad}
                    onChange={e => setBatchAddToSquad(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded"
                  />
                  <span className="text-[11px] font-semibold text-emerald-300">Hepsini bu maça ekle</span>
                </label>
              </div>
            </div>

            {/* Submit Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all active:scale-95 flex items-center justify-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Listeyi Toplu Ekle</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
