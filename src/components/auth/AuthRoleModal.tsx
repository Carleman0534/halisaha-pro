import React, { useState, useMemo } from 'react';
import { Shield, Crown, User, X, Check, Search, Sparkles, Lock, Eye, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import { ADMIN_USERS, DEFAULT_GUEST_USER } from '../../data/initialData';
import { AppUser, Player } from '../../types';

interface AuthRoleModalProps {
  onClose: () => void;
}

export const AuthRoleModal: React.FC<AuthRoleModalProps> = ({ onClose }) => {
  const { currentUser, setCurrentUser, players } = useApp();

  const [activeTab, setActiveTab] = useState<'admin' | 'guest'>(
    currentUser.role === 'admin' ? 'admin' : 'guest'
  );
  const [playerSearch, setPlayerSearch] = useState('');

  // Filter non-admin players for guest list
  const guestCandidates = useMemo(() => {
    const adminPlayerIds = new Set(ADMIN_USERS.map(a => a.playerId));
    const nonAdminPlayers = players.filter(p => !adminPlayerIds.has(p.id));

    if (!playerSearch.trim()) return nonAdminPlayers;
    const q = playerSearch.toLowerCase().trim();
    return nonAdminPlayers.filter(p => p.name.toLowerCase().includes(q));
  }, [players, playerSearch]);

  const handleSelectAdmin = (admin: AppUser) => {
    setCurrentUser(admin);
    try {
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 } });
    } catch {}
    onClose();
  };

  const handleSelectPlayerGuest = (player: Player) => {
    const guestUser: AppUser = {
      id: `guest_${player.id}`,
      name: player.name,
      role: 'guest',
      playerId: player.id,
    };
    setCurrentUser(guestUser);
    try {
      confetti({ particleCount: 20, spread: 50, origin: { y: 0.7 } });
    } catch {}
    onClose();
  };

  const handleSelectGeneralGuest = () => {
    setCurrentUser(DEFAULT_GUEST_USER);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Kullanıcı Girişi & Rol Seçimi</h3>
              <p className="text-[10px] text-slate-400">Yönetici (Konsey) veya Misafir / Oyuncu</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Active Profile Info */}
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            {currentUser.role === 'admin' ? (
              <Crown className="w-4 h-4 text-amber-400" />
            ) : (
              <User className="w-4 h-4 text-blue-400" />
            )}
            <div>
              <span className="text-[10px] text-slate-400 block">Şu Anki Giriş:</span>
              <span className="font-bold text-white">{currentUser.name}</span>
            </div>
          </div>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-black border ${
              currentUser.role === 'admin'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
            }`}
          >
            {currentUser.role === 'admin' ? '👑 Yönetici (Tam Yetkili)' : '👤 Misafir (Salt Okunur)'}
          </span>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`flex items-center justify-center space-x-1.5 py-2 rounded-lg transition-all ${
              activeTab === 'admin'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-300" />
            <span>Yönetici (Konsey)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guest')}
            className={`flex items-center justify-center space-x-1.5 py-2 rounded-lg transition-all ${
              activeTab === 'guest'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5 text-blue-200" />
            <span>Misafir / Oyuncu</span>
          </button>
        </div>

        {/* Tab 1: ADMIN SELECTION (5 COUNCIL MEMBERS) */}
        {activeTab === 'admin' && (
          <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 flex items-start space-x-2">
              <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Yönetici Yetkileri:</strong> Maç organize etme, yoklama alma, kadroları dengeleme, para toplama ve konsey oylaması yapabilir.
              </span>
            </div>

            <div className="space-y-1.5">
              {ADMIN_USERS.map(admin => {
                const isSelected = currentUser.id === admin.id;
                return (
                  <button
                    key={admin.id}
                    onClick={() => handleSelectAdmin(admin)}
                    className={`w-full p-3 rounded-xl border transition-all flex items-center justify-between text-left active:scale-[0.98] ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500/60 shadow-md ring-1 ring-emerald-500/40'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs border ${
                          isSelected
                            ? 'bg-emerald-500 text-black border-emerald-400'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        <Crown className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-xs text-white">{admin.name}</span>
                          {admin.id === 'eval_hadi' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                              Konsey Başkanı
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">Konsey Üyesi & Yönetici</span>
                      </div>
                    </div>

                    {isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-500 text-black flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-500">Seç</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: GUEST / PLAYER SELECTION */}
        {activeTab === 'guest' && (
          <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-200 flex items-start space-x-2">
              <Eye className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>
                <strong>Misafir Modu:</strong> Sistemi sadece görüntüleyebilirsiniz. Seçtiğiniz oyuncu olarak <strong>[Maça Geliyorum / Gelmiyorum]</strong> onayınızı verebilirsiniz.
              </span>
            </div>

            {/* General Viewer Option */}
            <button
              onClick={handleSelectGeneralGuest}
              className={`w-full p-2.5 rounded-xl border transition-all flex items-center justify-between text-left active:scale-[0.98] ${
                currentUser.id === DEFAULT_GUEST_USER.id
                  ? 'bg-blue-950/40 border-blue-500/60 shadow-md ring-1 ring-blue-500/40'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-white">Genel Misafir / İzleyici</span>
                  <span className="text-[10px] text-slate-400 block">Sadece kadro ve maçları incele</span>
                </div>
              </div>
              {currentUser.id === DEFAULT_GUEST_USER.id && (
                <Check className="w-4 h-4 text-blue-400 stroke-[3]" />
              )}
            </button>

            {/* Search Player to Login as */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="İsminizi arayın (Talha, Sidar, Ömer...)"
                value={playerSearch}
                onChange={e => setPlayerSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Player List */}
            <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
              {guestCandidates.map(p => {
                const isSelected = currentUser.playerId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPlayerGuest(p)}
                    className={`w-full p-2 rounded-xl border transition-all flex items-center justify-between text-left text-xs active:scale-[0.98] ${
                      isSelected
                        ? 'bg-blue-950/40 border-blue-500/60 shadow-sm'
                        : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center font-bold text-[11px]">
                        {p.name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-white block">{p.name}</span>
                        <span className="text-[10px] text-slate-400">
                          {p.primaryPosition} • {Math.round(p.finalScore * 10)} OVR
                        </span>
                      </div>
                    </div>

                    {isSelected ? (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500 text-white font-bold">
                        Aktif Oyuncu
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-semibold">Giriş Yap →</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
