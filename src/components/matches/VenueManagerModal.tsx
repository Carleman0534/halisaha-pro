import React, { useState } from 'react';
import {
  MapPin,
  Plus,
  Trash2,
  ExternalLink,
  Check,
  X,
  Edit3,
  Navigation,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import { Venue } from '../../types';
import { buildGoogleMapsUrl } from '../../services/firebase';

interface VenueManagerModalProps {
  onClose: () => void;
  onSelectVenue?: (venue: Venue) => void;
}

export const VenueManagerModal: React.FC<VenueManagerModalProps> = ({
  onClose,
  onSelectVenue,
}) => {
  const { venues, addVenue, updateVenue, deleteVenue, currentMatch, updateMatchDetails } = useApp();

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [defaultCost, setDefaultCost] = useState<number>(currentMatch.totalPitchCost || 2800);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleAddOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingId) {
      updateVenue({
        id: editingId,
        name: name.trim(),
        location: location.trim() || name.trim(),
        mapsUrl: buildGoogleMapsUrl(name.trim(), location.trim()),
        defaultCost: defaultCost > 0 ? defaultCost : 2800,
      });
      setToastMsg('Saha bilgileri güncellendi! ✓');
      setEditingId(null);
    } else {
      const created = addVenue(name.trim(), location.trim(), defaultCost);
      setToastMsg(`"${created.name}" saha listesine eklendi! ✓`);
      try {
        confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 } });
      } catch {}
    }

    setName('');
    setLocation('');
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleStartEdit = (v: Venue) => {
    setEditingId(v.id);
    setName(v.name);
    setLocation(v.location);
    setDefaultCost(v.defaultCost || 2800);
  };

  const handleApplyToCurrentMatch = (v: Venue) => {
    if (onSelectVenue) {
      onSelectVenue(v);
      onClose();
      return;
    }

    const target = currentMatch.targetSquadCount || 14;
    const newTotal = v.defaultCost || currentMatch.totalPitchCost || 2800;
    updateMatchDetails({
      venueId: v.id,
      venueName: v.name,
      venueLocation: v.location,
      venueMapsUrl: v.mapsUrl,
      totalPitchCost: newTotal,
      costPerPlayer: Math.round(newTotal / target),
    });

    try {
      confetti({ particleCount: 35, spread: 60, origin: { y: 0.7 } });
    } catch {}
    setToastMsg(`Bu haftanın maçı "${v.name}" olarak güncellendi! ✓`);
    setTimeout(() => {
      setToastMsg(null);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-4 sm:p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-auto animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-white text-sm sm:text-base">
                Sahalarımız & Google Maps Konumları
              </h3>
              <p className="text-[11px] text-slate-400">
                Saha ekleyin, konum kaydedin ve maçlara tek tıkla atayın
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {toastMsg && (
          <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Add / Edit Venue Form */}
        <form
          onSubmit={handleAddOrUpdate}
          className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Plus className="w-3.5 h-3.5" />
              <span>{editingId ? 'Sahayı Düzenle' : 'Yeni Saha Ekle'}</span>
            </span>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setName('');
                  setLocation('');
                }}
                className="text-[10px] text-slate-400 hover:text-white underline"
              >
                Düzenlemeyi İptal Et
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Saha / Tesis Adı *
              </label>
              <input
                type="text"
                required
                placeholder="Örn: Olimpiyat Halı Saha"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Saha Ücreti (TL)
              </label>
              <input
                type="number"
                min="0"
                placeholder="2800"
                value={defaultCost === 0 ? '' : defaultCost}
                onChange={e => setDefaultCost(e.target.value === '' ? 0 : parseInt(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Konum (Google Maps Linki veya Açık Adres / Semt)
            </label>
            <input
              type="text"
              placeholder="Google Maps linki yapıştırın veya semt/adres yazın..."
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              💡 Google Maps'ten kopyaladığınız linki (`https://maps.app.goo.gl/...`) yapıştırabilir veya direkt adres yazabilirsiniz.
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-600/25 transition-all active:scale-95 flex items-center justify-center space-x-1.5"
          >
            <Check className="w-4 h-4" />
            <span>{editingId ? 'Saha Bilgilerini Güncelle' : '+ Sahayı Listeye Kaydet'}</span>
          </button>
        </form>

        {/* Saved Venues List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-300">
              Kayıtlı Sahalar ({venues.length})
            </span>
            <span className="text-[10px] text-slate-400">
              Maça atamak için "Seç" butonuna dokunun
            </span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {venues.map(v => {
              const isCurrent =
                currentMatch.venueId === v.id ||
                currentMatch.venueName.toLowerCase() === v.name.toLowerCase();

              return (
                <div
                  key={v.id}
                  className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    isCurrent
                      ? 'bg-emerald-950/30 border-emerald-500/50'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-white text-xs sm:text-sm truncate">
                        {v.name}
                      </span>
                      {isCurrent && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold shrink-0">
                          Aktif Saha
                        </span>
                      )}
                      {v.defaultCost && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono font-bold shrink-0">
                          {v.defaultCost} ₺
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                      <span className="truncate">{v.location || v.name}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <a
                      href={v.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-[11px] font-bold flex items-center space-x-1 transition-all active:scale-95"
                      title="Google Maps'te Konumu Aç"
                    >
                      <Navigation className="w-3 h-3 text-blue-400" />
                      <span>Harita</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-75" />
                    </a>

                    <button
                      type="button"
                      onClick={() => handleApplyToCurrentMatch(v)}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black transition-all active:scale-95 flex items-center space-x-1 ${
                        isCurrent
                          ? 'bg-emerald-500 text-black'
                          : 'bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40'
                      }`}
                    >
                      <Check className="w-3 h-3" />
                      <span>{isCurrent ? 'Seçili' : 'Seç'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartEdit(v)}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
                      title="Sahayı Düzenle"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {venues.length > 1 && (
                      <button
                        type="button"
                        onClick={() => deleteVenue(v.id)}
                        className="p-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 transition-all"
                        title="Sahayı Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
