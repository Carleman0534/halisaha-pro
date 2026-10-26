import React, { useState, useMemo, useEffect } from 'react';
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
    // Automatically close immediately upon selection / verification!
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
    try {
      confetti({ particleCount: 25, spread: 50, origin: { y: 0.5 } });
    } catch {}
    // Automatically close immediately upon selection!
    onClose();
  };

  const handleSelectGeneralGuest = () => {
    setCurrentUser(DEFAULT_GUEST_USER);
    // Automatically close immediately upon selection!
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-start items-center"
    >
      {/* ============================================================ */}
      {/* FULL-WIDTH PULL-DOWN NOTIFICATION SHADE (TÜM SAYFAYA AÇILIR) */}
      {/* ============================================================ */}
      <div
        onClick={e => e.stopPropagation()}
        className="w-full bg-slate-900/98 border-b-2 border-emerald-500/40 rounded-b-3xl shadow-2xl shadow-black/95 flex flex-col max-h-[92vh] overflow-hidden animate-phone-shade-down"
      >
        <div className="w-full max-w-6xl mx-auto flex flex-col flex-1 min-h-0">
          {/* SHADE TOP BAR */}
          <div className="p-3.5 sm:p-5 border-b border-slate-800 bg-slate-900/95 shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-500/25 text-white shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-white text-sm sm:text-lg flex items-center space-x-2">
                    <span>Tüm Sayfa Kontrol Merkezi & Yetki Girişi</span>
                    <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase font-mono">
                      Hızlı Panel
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">Yönetici (Konsey) veya Misafir / Oyuncu Profilinizi Seçin</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
                title="Kapat"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* QUICK 1-TAP SWITCHER BAR */}
            <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1 text-xs select-none">
              <span className="text-[10px] sm:text-xs uppercase font-bold text-slate-400 shrink-0">⚡ 1-Tıkla Giriş:</span>
              {ADMIN_USERS.map(admin => (
                <button
                  key={admin.id}
                  type="button"
                  onClick={() => handleSelectAdmin(admin)}
                  className={`px-3 py-1.5 rounded-xl font-bold flex items-center space-x-1 shrink-0 transition-all active:scale-95 border ${
                    currentUser.id === admin.id
                      ? 'bg-amber-500 text-black border-amber-400 shadow-sm'
                      : 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>{admin.name.split(' ')[0]}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={handleSelectGeneralGuest}
                className={`px-3 py-1.5 rounded-xl font-bold flex items-center space-x-1 shrink-0 transition-all active:scale-95 border ${
                  currentUser.role === 'guest'
                    ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Misafir Modu</span>
              </button>
            </div>

            {/* TWO-TONE TOGGLE SWITCHER (ALWAYS AT THE TOP IN PLAIN SIGHT) */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4 p-1.5 bg-slate-950 rounded-2xl border border-slate-800 text-xs sm:text-sm font-bold shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('admin');
                  setPendingAdmin(null);
                  setShowChangePin(false);
                }}
                className={`flex items-center justify-center space-x-2 py-3 sm:py-3.5 rounded-xl transition-all ${
                  activeTab === 'admin'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black shadow-lg shadow-amber-500/30 border border-amber-300'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 shrink-0" />
                <span className="text-xs sm:text-base font-black">👑 Yöneticiye Geç (Konsey)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('guest');
                  setPendingAdmin(null);
                  setShowChangePin(false);
                }}
                className={`flex items-center justify-center space-x-2 py-3 sm:py-3.5 rounded-xl transition-all ${
                  activeTab === 'guest'
                    ? 'bg-blue-600 text-white font-black shadow-lg shadow-blue-500/30 border border-blue-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-200 shrink-0" />
                <span className="text-xs sm:text-base font-black">👤 Misafir / Oyuncu</span>
              </button>
            </div>
          </div>

          {/* SHADE SCROLLABLE CONTENT BODY */}
          <div className="p-3.5 sm:p-5 overflow-y-auto flex-1 min-h-0 space-y-4">
            {/* Current Active Profile Status */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center space-x-3 sm:space-x-4">
                {currentUser.role === 'admin' ? (
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                    <Crown className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                ) : currentUser.role === 'council_member' ? (
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                    <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                ) : currentUser.role === 'player' ? (
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                    <User className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                ) : (
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center">
                    <User className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                )}
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Şu Anki Açık Oturum:</span>
                  <span className="font-bold text-white text-sm sm:text-lg">{currentUser.name}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <span
                  className={`text-[10px] sm:text-xs px-3 sm:px-4 py-1 rounded-full font-black border ${
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

                {/* LOGOUT BUTTON FOR ALL LOGGED-IN USERS */}
                {currentUser.role !== 'guest' && (
                  <button
                    onClick={handleLogoutToGuest}
                    title="Oturumu Kapat ve Misafir Ol"
                    className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 hover:text-rose-100 text-xs sm:text-sm font-bold transition-all active:scale-95 flex items-center space-x-1.5"
                  >
                    <LogOut className="w-4 h-4 text-rose-400" />
                    <span>Oturumu Kapat</span>
                  </button>
                )}
              </div>
            </div>

            {/* ============================================================ */}
            {/* SUB-VIEW 1: PIN PROMPT FOR COUNCIL MEMBER LOGIN              */}
            {/* ============================================================ */}
            {pendingAdmin ? (
              <div className="max-w-md mx-auto space-y-4 py-3">
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

                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-1.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 mx-auto flex items-center justify-center">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h4 className="font-black text-white text-base">
                    👑 {pendingAdmin.name} Oturumu
                  </h4>
                  <p className="text-xs text-amber-200 leading-relaxed">
                    4 haneli Konsey PIN şifrenizi girin (yazınca <strong>otomatik açılır ve perde kapanır</strong>):
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
                      className="w-full text-center text-3xl tracking-[0.4em] py-3 bg-slate-950 border border-slate-700 rounded-2xl text-white placeholder:text-slate-600 placeholder:text-xs placeholder:tracking-normal focus:outline-none focus:border-amber-500 font-mono font-bold"
                    />
                  </div>

                  {pinError && (
                    <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center space-x-2 animate-shake">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{pinError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handlePinInput('1453')}
                      className="w-full py-3 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all active:scale-95"
                    >
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>⚡ Tek Tıkla Doldur (1453)</span>
                    </button>

                    <button
                      type="submit"
                      disabled={!pinInput.trim()}
                      className="w-full py-3 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 text-black font-black text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95 flex items-center justify-center space-x-1.5"
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>Giriş Yap ve Kapat</span>
                    </button>
                  </div>
                </form>

                <div className="text-center pt-1">
                  <span className="text-[11px] text-slate-400">
                    Varsayılan PIN: <code className="text-amber-400 font-mono font-bold">1453</code>
                  </span>
                </div>
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

                <form onSubmit={handleChangePinSubmit} className="space-y-3 p-4 bg-slate-950/70 border border-slate-800 rounded-2xl">
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
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs sm:text-sm text-amber-200 flex items-start space-x-3">
                      <Crown className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div className="leading-relaxed">
                        <span className="font-bold text-amber-300 block">Yönetici Profilinizi Seçin:</span>
                        İsminize dokunduğunuzda profil aktifleşir ve perde <strong>otomatik kapanır</strong>.
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {ADMIN_USERS.map(admin => {
                        const isSelected = currentUser.id === admin.id;
                        return (
                          <button
                            key={admin.id}
                            type="button"
                            onClick={() => handleSelectAdmin(admin)}
                            className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between text-left active:scale-[0.98] ${
                              isSelected
                                ? 'bg-amber-950/50 border-amber-500/70 shadow-md ring-1 ring-amber-500/50'
                                : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div
                                className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm border ${
                                  isSelected
                                    ? 'bg-amber-500 text-black border-amber-400'
                                    : 'bg-slate-800 text-amber-300 border-slate-700'
                                }`}
                              >
                                <Crown className="w-5 h-5 text-amber-400" />
                              </div>
                              <div>
                                <div className="flex items-center space-x-1.5">
                                  <span className="font-black text-sm sm:text-base text-white">{admin.name}</span>
                                  {admin.id === 'eval_hadi' && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                                      Başkan
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-slate-400 flex items-center space-x-1 mt-0.5">
                                  <Lock className="w-3 h-3 text-amber-400/80" />
                                  <span>PIN Korumalı Yönetici</span>
                                </span>
                              </div>
                            </div>

                            {isSelected ? (
                              <div className="w-8 h-8 rounded-full bg-amber-500 text-black flex items-center justify-center shadow-md shrink-0">
                                <Check className="w-4 h-4 stroke-[3]" />
                              </div>
                            ) : (
                              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20 hover:bg-amber-500/20 transition-colors shrink-0">
                                Giriş Yap →
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {isAdmin && (
                      <div className="pt-2 border-t border-slate-800 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setShowChangePin(true)}
                          className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20"
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
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/25 text-xs sm:text-sm text-blue-200 flex items-start space-x-3">
                      <User className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                      <div className="leading-relaxed">
                        <span className="font-bold text-blue-300 block">Misafir veya Oyuncu Seçin:</span>
                        İsminize dokunduğunuzda profiliniz açılır ve perde <strong>otomatik kapanır</strong>.
                      </div>
                    </div>

                    {/* General Viewer Option */}
                    <button
                      type="button"
                      onClick={handleSelectGeneralGuest}
                      className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between text-left active:scale-[0.98] ${
                        currentUser.id === DEFAULT_GUEST_USER.id
                          ? 'bg-blue-950/40 border-blue-500/60 shadow-md ring-1 ring-blue-500/40'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-11 h-11 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                          <Eye className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="font-bold text-sm sm:text-base text-white">Genel Misafir / İzleyici</span>
                          <span className="text-xs text-slate-400 block">Sadece kadro ve maçları incele</span>
                        </div>
                      </div>
                      {currentUser.id === DEFAULT_GUEST_USER.id ? (
                        <Check className="w-6 h-6 text-blue-400 stroke-[3]" />
                      ) : (
                        <span className="text-xs text-slate-400 font-semibold bg-slate-800 px-3 py-1.5 rounded-lg">Seç →</span>
                      )}
                    </button>

                    {/* Search Player to Login as */}
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="İsminizi arayın (Talha, Sidar, Ömer, Emre, Fatih...)"
                        value={playerSearch}
                        onChange={e => setPlayerSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Player List (Responsive 2 to 3-column grid on desktop) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1">
                      {guestCandidates.map(p => {
                        const isSelected = currentUser.playerId === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelectPlayerGuest(p)}
                            className={`w-full p-3 rounded-xl border transition-all flex items-center justify-between text-left text-xs active:scale-[0.98] ${
                              isSelected
                                ? 'bg-blue-950/40 border-blue-500/60 shadow-sm ring-1 ring-blue-500/40'
                                : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5">
                              <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 flex items-center justify-center font-bold text-xs">
                                {p.name.charAt(0)}
                              </div>
                              <div>
                                <span className="font-bold text-white text-xs sm:text-sm block">{p.name}</span>
                                <span className="text-[11px] text-slate-400">
                                  {p.primaryPosition} • Kayıtlı Oyuncu
                                </span>
                              </div>
                            </div>

                            {isSelected ? (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500 text-white font-bold">
                                Aktif Profil
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 font-semibold hover:text-white">Seç →</span>
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
            className="py-3 bg-slate-950 hover:bg-slate-900 border-t border-slate-800 cursor-pointer flex flex-col items-center justify-center space-y-1 transition-colors select-none group shrink-0"
            title="Perdeyi Kapatmak İçin Dokunun"
          >
            <div className="w-20 h-1.5 rounded-full bg-slate-600 group-hover:bg-slate-400 transition-colors" />
            <div className="flex items-center space-x-1.5 text-xs text-slate-400 group-hover:text-amber-400 font-bold tracking-wider uppercase">
              <ChevronUp className="w-4 h-4" />
              <span>Kapatmak İçin Dokunun veya Yukarı Kaydırın</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
