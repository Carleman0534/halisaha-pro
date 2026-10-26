import React, { useState, useMemo } from 'react';
import {
  Shield,
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
  ChevronUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import { ADMIN_USERS, DEFAULT_GUEST_USER } from '../../data/initialData';
import { AppUser, Player } from '../../types';

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
        confetti({ particleCount: 30, spread: 60, origin: { y: 0.5 } });
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

    // Auto-verify as soon as the correct 4-digit PIN is typed
    if (val.trim() === correctPin) {
      if (pendingAdmin) {
        localStorage.setItem('halisaha_admin_authenticated', 'true');
        setCurrentUser(pendingAdmin);
        try {
          confetti({ particleCount: 35, spread: 60, origin: { y: 0.5 } });
        } catch {}
        onClose();
      }
    }
  };

  const handleVerifyPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const correctPin = getCouncilPin();

    if (pinInput.trim() === correctPin) {
      if (pendingAdmin) {
        localStorage.setItem('halisaha_admin_authenticated', 'true');
        setCurrentUser(pendingAdmin);
        try {
          confetti({ particleCount: 35, spread: 60, origin: { y: 0.5 } });
        } catch {}
        onClose();
      }
    } else {
      setPinError('Hatalı PIN kodu! Misafirlerin konsey üyelerinin oturumunu açma yetkisi yoktur.');
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
    }, 1800);
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
    try {
      confetti({ particleCount: 20, spread: 50, origin: { y: 0.5 } });
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
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex flex-col justify-start items-center animate-in fade-in duration-200"
    >
      {/* ============================================================ */}
      {/* PULL-DOWN NOTIFICATION SHADE PANEL (TELEFON BİLDİRİM PERDESİ) */}
      {/* ============================================================ */}
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md mx-auto bg-slate-900/98 border-b-2 border-x border-slate-700/80 rounded-b-3xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden animate-in slide-in-from-top-full duration-300 ease-out"
      >
        {/* SHADE TOP BAR */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-slate-900/90 shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-500/20 text-white shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-white text-sm flex items-center space-x-1.5">
                  <span>Kontrol Paneli</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase font-mono">
                    Giriş & Yetki
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400">Yönetici (Konsey) veya Misafir / Oyuncu</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              title="Kapat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* TWO-TONE TOGGLE SWITCHER (ALWAYS AT THE TOP) */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-bold shadow-inner">
            <button
              type="button"
              onClick={() => {
                setActiveTab('admin');
                setPendingAdmin(null);
                setShowChangePin(false);
              }}
              className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-xl transition-all ${
                activeTab === 'admin'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black shadow-lg shadow-amber-500/25 border border-amber-300'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Crown className="w-4 h-4 text-amber-300 shrink-0" />
              <span>👑 Yönetici (Konsey)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('guest');
                setPendingAdmin(null);
                setShowChangePin(false);
              }}
              className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-xl transition-all ${
                activeTab === 'guest'
                  ? 'bg-blue-600 text-white font-black shadow-lg shadow-blue-500/25 border border-blue-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <User className="w-4 h-4 text-blue-200 shrink-0" />
              <span>👤 Misafir / Oyuncu</span>
            </button>
          </div>
        </div>

        {/* SHADE SCROLLABLE CONTENT BODY */}
        <div className="p-3.5 sm:p-4 overflow-y-auto flex-1 min-h-0 space-y-3">
          {/* Current Active Profile Status */}
          <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              {currentUser.role === 'admin' ? (
                <Crown className="w-4 h-4 text-amber-400" />
              ) : currentUser.role === 'council_member' ? (
                <Shield className="w-4 h-4 text-emerald-400" />
              ) : currentUser.role === 'player' ? (
                <User className="w-4 h-4 text-blue-400" />
              ) : (
                <User className="w-4 h-4 text-slate-400" />
              )}
              <div>
                <span className="text-[10px] text-slate-400 block">Şu Anki Oturum:</span>
                <span className="font-bold text-white text-xs sm:text-sm">{currentUser.name}</span>
              </div>
            </div>
            <div className="flex items-center space-x-1.5">
              <span
                className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full font-black border ${
                  currentUser.role === 'admin'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : currentUser.role === 'council_member'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : currentUser.role === 'player'
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                    : 'bg-slate-700/40 text-slate-300 border-slate-600'
                }`}
              >
                {currentUser.role === 'admin'
                  ? '👑 Yönetici'
                  : currentUser.role === 'council_member'
                  ? '🛡️ Konsey'
                  : currentUser.role === 'player'
                  ? '⚽ Oyuncu'
                  : '👤 Misafir'}
              </span>

              {isAdmin && (
                <button
                  onClick={handleLogoutToGuest}
                  title="Yönetici Oturumunu Kapat"
                  className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs transition-all active:scale-95 flex items-center space-x-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-bold">Çıkış</span>
                </button>
              )}
            </div>
          </div>

          {/* ============================================================ */}
          {/* SUB-VIEW 1: PIN PROMPT FOR COUNCIL MEMBER LOGIN              */}
          {/* ============================================================ */}
          {pendingAdmin ? (
            <div className="space-y-3 py-1">
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

              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-1.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 mx-auto flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <h4 className="font-black text-white text-sm">
                  👑 {pendingAdmin.name} Oturumu
                </h4>
                <p className="text-[11px] text-amber-200 leading-relaxed">
                  4 haneli Konsey PIN şifrenizi girin (yazınca otomatik açılır):
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
                    className="w-full text-center text-2xl tracking-[0.4em] py-3 bg-slate-950 border border-slate-700 rounded-2xl text-white placeholder:text-slate-600 placeholder:text-xs placeholder:tracking-normal focus:outline-none focus:border-amber-500 font-mono font-bold"
                  />
                </div>

                {pinError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center space-x-1.5 animate-shake">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{pinError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!pinInput.trim()}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 text-black font-black text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95 flex items-center justify-center space-x-1.5"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Giriş Yap ve Kapat</span>
                </button>
              </form>

              <div className="text-center pt-0.5">
                <span className="text-[10px] text-slate-500">
                  Varsayılan PIN: <code className="text-amber-400/80 font-mono font-bold">1453</code>
                </span>
              </div>
            </div>
          ) : showChangePin ? (
            /* ============================================================ */
            /* SUB-VIEW 2: CHANGE COUNCIL PIN SCREEN                        */
            /* ============================================================ */
            <div className="space-y-3 py-1">
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

              <form onSubmit={handleChangePinSubmit} className="space-y-3 p-3 bg-slate-950/70 border border-slate-800 rounded-2xl">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
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
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
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
                  <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center space-x-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{pinError}</span>
                  </div>
                )}

                {pinSuccessMsg && (
                  <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center space-x-1.5">
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
                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start space-x-2">
                    <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      İsminize dokunun; seçtiğinizde perde <strong>otomatik kapanır</strong>.
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {ADMIN_USERS.map(admin => {
                      const isSelected = currentUser.id === admin.id;
                      return (
                        <button
                          key={admin.id}
                          type="button"
                          onClick={() => handleSelectAdmin(admin)}
                          className={`w-full p-3 rounded-2xl border transition-all flex items-center justify-between text-left active:scale-[0.98] ${
                            isSelected
                              ? 'bg-amber-950/40 border-amber-500/60 shadow-md ring-1 ring-amber-500/40'
                              : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs border ${
                                isSelected
                                  ? 'bg-amber-500 text-black border-amber-400'
                                  : 'bg-slate-800 text-amber-300 border-slate-700'
                              }`}
                            >
                              <Crown className="w-4 h-4 text-amber-400" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-1.5">
                                <span className="font-black text-xs sm:text-sm text-white">{admin.name}</span>
                                {admin.id === 'eval_hadi' && (
                                  <span className="text-[8px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                                    Konsey Başkanı
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                                <Lock className="w-3 h-3 text-amber-400/80" />
                                <span>PIN Korumalı Yönetici</span>
                              </span>
                            </div>
                          </div>

                          {isSelected ? (
                            <div className="w-6 h-6 rounded-full bg-amber-500 text-black flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          ) : (
                            <span className="text-[11px] font-bold text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
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
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center space-x-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20"
                      >
                        <KeyRound className="w-3 h-3" />
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
                  <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200 flex items-start space-x-2">
                    <Eye className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span>
                      İsminize dokunduğunuzda profiliniz açılır ve perde <strong>otomatik kapanır</strong>.
                    </span>
                  </div>

                  {/* General Viewer Option */}
                  <button
                    type="button"
                    onClick={handleSelectGeneralGuest}
                    className={`w-full p-2.5 rounded-2xl border transition-all flex items-center justify-between text-left active:scale-[0.98] ${
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
                    {currentUser.id === DEFAULT_GUEST_USER.id ? (
                      <Check className="w-4 h-4 text-blue-400 stroke-[3]" />
                    ) : (
                      <span className="text-[11px] text-slate-400 font-semibold">Seç →</span>
                    )}
                  </button>

                  {/* Search Player to Login as */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
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
                          type="button"
                          onClick={() => handleSelectPlayerGuest(p)}
                          className={`w-full p-2 rounded-xl border transition-all flex items-center justify-between text-left text-xs active:scale-[0.98] ${
                            isSelected
                              ? 'bg-blue-950/40 border-blue-500/60 shadow-sm ring-1 ring-blue-500/40'
                              : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 flex items-center justify-center font-bold text-xs">
                              {p.name.charAt(0)}
                            </div>
                            <div>
                              <span className="font-bold text-white text-xs block">{p.name}</span>
                              <span className="text-[10px] text-slate-400">
                                {p.primaryPosition} • Kayıtlı Oyuncu
                              </span>
                            </div>
                          </div>

                          {isSelected ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500 text-white font-bold">
                              Aktif Oyuncu
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-semibold hover:text-white">Seç →</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ============================================================ */}
        {/* DRAG HANDLE BAR (PULL-UP HANDLE — TIKLAYINCA YUKARI KAPANIR) */}
        {/* ============================================================ */}
        <div
          onClick={onClose}
          className="py-2.5 bg-slate-950/90 hover:bg-slate-900 border-t border-slate-800/80 cursor-pointer flex flex-col items-center justify-center space-y-0.5 transition-colors select-none group shrink-0"
          title="Perdeyi Kapat"
        >
          <div className="w-12 h-1.5 rounded-full bg-slate-600 group-hover:bg-slate-400 transition-colors" />
          <div className="flex items-center space-x-1 text-[10px] text-slate-400 group-hover:text-white font-bold tracking-wider uppercase">
            <ChevronUp className="w-3 h-3 text-slate-400 group-hover:text-white" />
            <span>Kapatmak İçin Dokunun</span>
          </div>
        </div>
      </div>
    </div>
  );
};
