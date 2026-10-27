import React, { useState, useMemo, useEffect } from 'react';
import {
  Crown,
  User,
  X,
  Check,
  Search,
  Sparkles,
  Lock,
  Eye,
  AlertCircle,
  KeyRound,
  ArrowLeft,
  LogOut,
  CheckCircle2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import { ADMIN_USERS, DEFAULT_GUEST_USER } from '../../data/initialData';
import { AppUser, Player } from '../../types';
import { requestNotificationPermission } from '../../services/notifications';

interface AuthRoleModalProps {
  onClose: () => void;
  defaultTab?: 'admin' | 'guest';
}

export const AuthRoleModal: React.FC<AuthRoleModalProps> = ({
  onClose,
  defaultTab = 'admin',
}) => {
  const { currentUser, setCurrentUser, players, isAdmin } = useApp();

  const [activeTab, setActiveTab] = useState<'admin' | 'guest'>(defaultTab);
  const [playerSearch, setPlayerSearch] = useState('');

  // Council PIN security state
  const [pendingAdmin, setPendingAdmin] = useState<AppUser | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [showChangePin, setShowChangePin] = useState(false);
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [pinSuccessMsg, setPinSuccessMsg] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const getCouncilPin = (): string => {
    return localStorage.getItem('halisaha_council_pin') || '1453';
  };

  // Filter non-admin players for guest list
  const guestCandidates = useMemo(() => {
    const adminPlayerIds = new Set(ADMIN_USERS.map(a => a.playerId));
    const nonAdminPlayers = players.filter(p => !adminPlayerIds.has(p.id));

    if (!playerSearch.trim()) return nonAdminPlayers;
    const q = playerSearch.toLowerCase().trim();
    return nonAdminPlayers.filter(p => p.name.toLowerCase().includes(q));
  }, [players, playerSearch]);

  const handleSelectAdmin = (admin: AppUser) => {
    if (currentUser.id === admin.id) {
      onClose();
      return;
    }

    // If already authenticated in this browser, switch and close immediately!
    const alreadyAuth = localStorage.getItem('halisaha_admin_authenticated') === 'true';
    if (alreadyAuth) {
      setCurrentUser(admin);
      try {
        confetti({ particleCount: 35, spread: 60, origin: { y: 0.5 } });
      } catch {}
      onClose();
      return;
    }

    setPendingAdmin(admin);
    setPinInput('');
    setPinError(null);
  };

  const handlePinInput = (val: string) => {
    setPinInput(val);
    setPinError(null);
    const correctPin = getCouncilPin();

    // Auto-verify as soon as the correct PIN is typed
    if (val.trim() === correctPin) {
      completeAdminLogin(pendingAdmin);
    }
  };

  const completeAdminLogin = (targetAdmin: AppUser | null) => {
    const adminToSet = targetAdmin || pendingAdmin || ADMIN_USERS[0];
    localStorage.setItem('halisaha_admin_authenticated', 'true');
    setCurrentUser(adminToSet);
    try {
      confetti({ particleCount: 40, spread: 70, origin: { y: 0.5 } });
    } catch {}
    onClose();
  };

  const handleVerifyPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const correctPin = getCouncilPin();

    if (pinInput.trim() === correctPin) {
      completeAdminLogin(pendingAdmin);
    } else {
      setPinError('Hatalı PIN kodu! (Varsayılan PIN: 1453)');
      setPinInput('');
    }
  };

  const handleChangePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPin = getCouncilPin();

    if (currentPinInput.trim() !== correctPin) {
      setPinError('Mevcut şifre hatalı!');
      return;
    }

    if (newPinInput.trim().length < 4) {
      setPinError('Yeni PIN en az 4 haneli olmalıdır!');
      return;
    }

    localStorage.setItem('halisaha_council_pin', newPinInput.trim());
    setPinSuccessMsg('Konsey PIN şifresi başarıyla değiştirildi! ✓');
    setCurrentPinInput('');
    setNewPinInput('');
    setPinError(null);
    try {
      confetti({ particleCount: 25, spread: 50, origin: { y: 0.5 } });
    } catch {}
    setTimeout(() => {
      setShowChangePin(false);
      setPinSuccessMsg(null);
    }, 1500);
  };

  const handleLogoutToGuest = () => {
    localStorage.removeItem('halisaha_admin_authenticated');
    setCurrentUser(DEFAULT_GUEST_USER);
    onClose();
  };

  const handleSelectPlayerGuest = (player: Player) => {
    const playerUser: AppUser = {
      id: `player_${player.id}`,
      name: player.name,
      role: 'player',
      playerId: player.id,
    };
    setCurrentUser(playerUser);
    requestNotificationPermission().catch(() => {});
    try {
      confetti({ particleCount: 25, spread: 50, origin: { y: 0.5 } });
    } catch {}
    onClose();
  };

  const handleSelectGeneralGuest = () => {
    setCurrentUser(DEFAULT_GUEST_USER);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-center items-center p-3 sm:p-4"
    >
      {/* ========================================================================= */}
      {/* CLEAN CENTERED / MOBILE-FRIENDLY MODAL (OYUNCU & YÖNETİCİ SEÇİMİ)         */}
      {/* ========================================================================= */}
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl shadow-black/95 flex flex-col max-h-[85vh] overflow-hidden animate-fade-in"
      >
        {/* COMPACT TOP BAR: TAB SWITCHER + CLOSE BUTTON */}
        <div className="p-2.5 sm:p-3 border-b border-slate-800 bg-slate-950/90 shrink-0 flex items-center gap-2">
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900 rounded-2xl border border-slate-800 flex-1 text-xs sm:text-sm font-bold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('guest');
                setPendingAdmin(null);
                setShowChangePin(false);
              }}
              className={`flex items-center justify-center space-x-1.5 py-2 sm:py-2.5 rounded-xl transition-all ${
                activeTab === 'guest'
                  ? 'bg-blue-600 text-white font-black shadow-md shadow-blue-500/30 border border-blue-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <User className="w-4 h-4 shrink-0" />
              <span>⚽ Oyuncu Seç</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('admin');
                setPendingAdmin(null);
                setShowChangePin(false);
              }}
              className={`flex items-center justify-center space-x-1.5 py-2 sm:py-2.5 rounded-xl transition-all ${
                activeTab === 'admin'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black shadow-md shadow-amber-500/30 border border-amber-300'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Crown className="w-4 h-4 shrink-0" />
              <span>👑 Yönetici (Konsey)</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors shrink-0"
            title="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SCROLLABLE CONTENT BODY */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 min-h-0 space-y-3">
          {/* Compact Active Session Bar (Only shown if already logged in as someone) */}
          {currentUser.role !== 'guest' && (
            <div className="px-3 py-2 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 min-w-0">
                <span className="text-slate-400 shrink-0">Aktif:</span>
                <span className="font-black text-white truncate">{currentUser.name}</span>
              </div>
              <button
                onClick={handleLogoutToGuest}
                className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center space-x-1 shrink-0"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>Çıkış Yap</span>
              </button>
            </div>
          )}

          {/* ============================================================ */}
          {/* SUB-VIEW 1: PIN PROMPT FOR COUNCIL MEMBER LOGIN              */}
          {/* ============================================================ */}
          {pendingAdmin ? (
            <div className="max-w-md mx-auto space-y-3.5 py-2">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setPendingAdmin(null);
                    setPinError(null);
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center space-x-1 transition-all"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Geri</span>
                </button>
                <span className="text-xs font-bold text-slate-300">Konsey Giriş Doğrulaması</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-1">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 mx-auto flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <h4 className="font-black text-white text-base">
                  👑 {pendingAdmin.name} Oturumu
                </h4>
                <p className="text-xs text-amber-200 leading-relaxed font-medium">
                  4 haneli Konsey PIN şifrenizi girin:
                </p>
              </div>

              <form onSubmit={handleVerifyPin} className="space-y-3">
                <div className="relative">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    autoFocus
                    placeholder="PIN Kodu (1453)"
                    value={pinInput}
                    onChange={e => handlePinInput(e.target.value)}
                    className="w-full text-center text-3xl tracking-[0.4em] py-2.5 bg-slate-950 border border-slate-700 rounded-2xl text-white placeholder:text-slate-600 placeholder:text-xs placeholder:tracking-normal focus:outline-none focus:border-amber-500 font-mono font-bold"
                  />
                </div>

                {pinError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center space-x-2 animate-shake">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{pinError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handlePinInput('1453')}
                    className="w-full py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all active:scale-95"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>⚡ Tek Tıkla Doldur (1453)</span>
                  </button>

                  <button
                    type="submit"
                    disabled={!pinInput.trim()}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 text-black font-black text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95 flex items-center justify-center space-x-1.5"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Giriş Yap</span>
                  </button>
                </div>
              </form>
            </div>
          ) : showChangePin ? (
            /* ============================================================ */
            /* SUB-VIEW 2: CHANGE COUNCIL PIN SCREEN                        */
            /* ============================================================ */
            <div className="max-w-md mx-auto space-y-3 py-1">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePin(false);
                    setPinError(null);
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center space-x-1 transition-all"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Geri</span>
                </button>
                <span className="text-xs font-bold text-white">Konsey PIN Şifresini Değiştir</span>
              </div>

              <form onSubmit={handleChangePinSubmit} className="space-y-3 p-3.5 bg-slate-950/90 border border-slate-800 rounded-2xl">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Mevcut PIN Şifresi:
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={currentPinInput}
                    onChange={e => setCurrentPinInput(e.target.value)}
                    placeholder="Mevcut PIN"
                    className="w-full py-2 px-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Yeni PIN Şifresi (En az 4 hane):
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={newPinInput}
                    onChange={e => setNewPinInput(e.target.value)}
                    placeholder="Yeni PIN (Örn: 2026)"
                    className="w-full py-2 px-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                {pinError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center space-x-1.5 animate-shake">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{pinError}</span>
                  </div>
                )}

                {pinSuccessMsg && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{pinSuccessMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                >
                  Yeni PIN'i Kaydet
                </button>
              </form>
            </div>
          ) : (
            <>
              {/* ============================================================ */}
              {/* TAB 1 CONTENT: ADMIN SELECTION (5 COUNCIL MEMBERS)           */}
              {/* ============================================================ */}
              {activeTab === 'admin' && (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ADMIN_USERS.map(admin => {
                      const isSelected = currentUser.id === admin.id;
                      return (
                        <button
                          key={admin.id}
                          type="button"
                          onClick={() => handleSelectAdmin(admin)}
                          className={`w-full p-3 rounded-2xl border transition-all flex items-center justify-between text-left active:scale-[0.98] ${
                            isSelected
                              ? 'bg-amber-950/60 border-amber-500/70 shadow-md ring-1 ring-amber-500/50'
                              : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm border ${
                                isSelected
                                  ? 'bg-amber-500 text-black border-amber-400'
                                  : 'bg-slate-800 text-amber-300 border-slate-700'
                              }`}
                            >
                              <Crown className="w-4 h-4 text-amber-400" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-1.5">
                                <span className="font-black text-sm text-white">{admin.name}</span>
                                {admin.id === 'eval_hadi' && (
                                  <span className="text-[8px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                                    Başkan
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400 font-medium flex items-center space-x-1 mt-0.5">
                                <Lock className="w-3 h-3 text-amber-400/80" />
                                <span>PIN Korumalı Yönetici</span>
                              </span>
                            </div>
                          </div>

                          {isSelected ? (
                            <div className="w-7 h-7 rounded-full bg-amber-500 text-black flex items-center justify-center shadow-md shrink-0">
                              <Check className="w-4 h-4 stroke-[3]" />
                            </div>
                          ) : (
                            <span className="text-xs font-black text-amber-400 bg-amber-500/15 px-2.5 py-1 rounded-xl border border-amber-500/30 hover:bg-amber-500/25 transition-colors shrink-0">
                              Seç →
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {isAdmin && (
                    <div className="pt-1.5 border-t border-slate-800 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setShowChangePin(true)}
                        className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Konsey PIN Şifresini Değiştir</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================ */}
              {/* TAB 2 CONTENT: GUEST / PLAYER SELECTION                      */}
              {/* ============================================================ */}
              {activeTab === 'guest' && (
                <div className="space-y-2.5">
                  {/* Search Player to Login as */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="İsminizi arayın (Talha, Sidar, Ömer, Emre...)"
                      value={playerSearch}
                      onChange={e => setPlayerSearch(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Player List (Full scrollable list right under search) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {guestCandidates.map(p => {
                      const isSelected = currentUser.playerId === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectPlayerGuest(p)}
                          className={`w-full p-3 rounded-xl border transition-all flex items-center justify-between text-left text-xs active:scale-[0.98] ${
                            isSelected
                              ? 'bg-blue-950/60 border-blue-500/70 shadow-sm ring-1 ring-blue-500/50'
                              : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center justify-center font-black text-xs">
                              {p.name.charAt(0)}
                            </div>
                            <div>
                              <span className="font-bold text-white text-sm block">{p.name}</span>
                              <span className="text-[11px] text-slate-400 font-medium">
                                {p.primaryPosition} • Oyuncu
                              </span>
                            </div>
                          </div>

                          {isSelected ? (
                            <span className="text-[11px] px-2.5 py-1 rounded-lg bg-blue-500 text-white font-bold">
                              Aktif ✓
                            </span>
                          ) : (
                            <span className="text-xs text-blue-400 font-bold bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                              Seç →
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* General Viewer Option at bottom */}
                  <button
                    type="button"
                    onClick={handleSelectGeneralGuest}
                    className={`w-full p-2.5 rounded-xl border transition-all flex items-center justify-between text-left active:scale-[0.98] ${
                      currentUser.id === DEFAULT_GUEST_USER.id
                        ? 'bg-slate-800 border-slate-600'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Eye className="w-4 h-4 text-slate-400 ml-1" />
                      <span className="font-bold text-xs text-slate-300">Genel Misafir (İzleyici Modu)</span>
                    </div>
                    {currentUser.id === DEFAULT_GUEST_USER.id ? (
                      <span className="text-[10px] text-slate-400 font-bold">Aktif</span>
                    ) : (
                      <span className="text-xs text-slate-400 font-bold">Geç →</span>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
