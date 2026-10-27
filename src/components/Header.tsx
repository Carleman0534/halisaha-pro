import React, { useState, useEffect } from 'react';
import { Shield, Database, Bell, Crown, User, ChevronDown, LogOut, ArrowRightLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DEFAULT_GUEST_USER } from '../data/initialData';
import { NotificationModal } from './common/NotificationModal';
import { AuthRoleModal } from './auth/AuthRoleModal';
import { getNotificationPermission } from '../services/notifications';

interface HeaderProps {
  onOpenFirebaseModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenFirebaseModal }) => {
  const { currentMatch, currentUser, setCurrentUser, isCouncil, firebaseActive } = useApp();
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<'admin' | 'guest'>('admin');
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    setHasPermission(getNotificationPermission() === 'granted');
  }, [showNotificationModal]);

  const isLoggedUser = currentUser.id !== DEFAULT_GUEST_USER.id && currentUser.role !== 'guest';

  const handleDirectLogout = () => {
    localStorage.removeItem('halisaha_admin_authenticated');
    setCurrentUser(DEFAULT_GUEST_USER);
  };

  const handleOpenAuth = (tab: 'admin' | 'guest') => {
    setAuthDefaultTab(tab);
    setShowAuthModal(true);
  };

  const roleLabel =
    currentUser.role === 'admin'
      ? 'Yönetici'
      : currentUser.role === 'council_member'
      ? 'Konsey'
      : currentUser.role === 'player'
      ? 'Oyuncu'
      : 'Misafir';

  return (
    <>
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3 sm:px-6 py-2.5 sm:py-3 w-full md:hidden">
      <div className="w-full flex items-center justify-between gap-2 sm:gap-4">
        {/* ============================================================== */}
        {/* SAYFANIN EN SOLUNA SABİTLENMİŞ VE TIKLANDIĞINDA PERDEYİ AÇAN LOGO */}
        {/* ============================================================== */}
        <button
          type="button"
          onClick={() => handleOpenAuth(isCouncil ? 'admin' : 'guest')}
          title="Tüm Sayfaya Kontrol Perdesini Aç (Rol & Kullanıcı Değiştir)"
          className="flex items-center space-x-2.5 sm:space-x-3.5 shrink-0 text-left p-1.5 -ml-1.5 rounded-2xl hover:bg-slate-800/80 transition-all cursor-pointer group active:scale-[0.98] select-none"
        >
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-400 flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0 group-hover:scale-105 group-hover:shadow-emerald-500/40 transition-all">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <span className="font-black tracking-tight text-white text-sm sm:text-lg group-hover:text-emerald-400 transition-colors">
                HALISAHA
              </span>
              <span className="text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                PRO
              </span>
              <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-hover:text-emerald-400 transition-colors group-hover:translate-y-0.5" />
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 font-medium truncate max-w-[140px] sm:max-w-none flex items-center space-x-1.5">
              <span>{currentMatch.matchNumber}. Hafta • {roleLabel} Modu</span>
              <span className="text-[9px] text-emerald-400/90 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 hidden md:inline">
                Açmak İçin Tıklayın ▾
              </span>
            </p>
          </div>
        </button>

        {/* User Role Switcher, Direct Logout, Notification Bell & Firebase Status */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
          {/* ============================================================== */}
          {/* CASE 1: USER IS LOGGED IN (ADMIN, COUNCIL, OR REGISTERED PLAYER)*/}
          {/* ============================================================== */}
          {isLoggedUser ? (
            <>
              {/* Active Profile Pill (Click to switch / open drawer) */}
              <button
                onClick={() => handleOpenAuth(isCouncil ? 'admin' : 'guest')}
                title="Kişi veya Rolü Değiştir (Tüm Sayfa Bildirim Perdesi)"
                className={`flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border text-xs sm:text-sm font-bold transition-all active:scale-95 shadow-sm shrink-0 ${
                  currentUser.role === 'admin'
                    ? 'bg-gradient-to-r from-amber-950/80 to-slate-900 border-amber-500/50 text-amber-300 hover:border-amber-400'
                    : currentUser.role === 'council_member'
                    ? 'bg-gradient-to-r from-emerald-950/80 to-slate-900 border-emerald-500/50 text-emerald-300 hover:border-emerald-400'
                    : 'bg-gradient-to-r from-blue-950/80 to-slate-900 border-blue-500/50 text-blue-300 hover:border-blue-400'
                }`}
              >
                {currentUser.role === 'admin' ? (
                  <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
                ) : currentUser.role === 'council_member' ? (
                  <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
                ) : (
                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 shrink-0" />
                )}
                <span className="truncate max-w-[85px] sm:max-w-[140px] text-white">{currentUser.name}</span>
                <span
                  className={`text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded font-black uppercase ${
                    currentUser.role === 'admin'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : currentUser.role === 'council_member'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}
                >
                  {roleLabel}
                </span>
                <span className="text-[10px] sm:text-xs text-amber-400/90 font-bold ml-0.5 flex items-center space-x-0.5 bg-slate-950/60 px-1.5 py-0.5 rounded-lg border border-slate-800">
                  <ArrowRightLeft className="w-3 h-3" />
                  <span className="hidden md:inline">Değiştir</span>
                </span>
              </button>

              {/* DIRECT LOGOUT BUTTON (TEK TIKLA OTURUMU KAPAT) */}
              <button
                onClick={handleDirectLogout}
                title="Oturumu Kapat ve Misafir Moduna Dön"
                className="flex items-center space-x-1 sm:space-x-1.5 p-2 sm:px-3 sm:py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-100 text-xs sm:text-sm font-bold transition-all active:scale-95 shrink-0"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />
                <span className="hidden sm:inline">Çıkış</span>
              </button>
            </>
          ) : (
            /* ============================================================== */
            /* CASE 2: USER IS IN GUEST MODE (SHOW FAST LOGIN BUTTONS)        */
            /* ============================================================== */
            <>
              {/* Button 1: Yöneticiye Geç */}
              <button
                onClick={() => handleOpenAuth('admin')}
                title="Yönetici (Konsey) Girişine Geç"
                className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs sm:text-sm font-black shadow-lg shadow-amber-500/25 transition-all active:scale-95 shrink-0 border border-amber-300"
              >
                <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black shrink-0" />
                <span className="sm:hidden">Yönetici</span>
                <span className="hidden sm:inline">Yöneticiye Geç</span>
              </button>

              {/* Button 2: Oyuncu Seç */}
              <button
                onClick={() => handleOpenAuth('guest')}
                title="Oyuncu veya Misafir Olarak Giriş Yap"
                className="flex items-center space-x-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs sm:text-sm font-bold transition-all active:scale-95 shrink-0"
              >
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 shrink-0" />
                <span>Oyuncu</span>
                <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
              </button>
            </>
          )}

          {/* Notification Bell Button */}
          <button
            onClick={() => setShowNotificationModal(true)}
            title="Sistem Bildirimleri & Hatırlatıcılar"
            className="relative p-2 sm:p-2.5 rounded-xl border border-slate-700/60 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all active:scale-95 shrink-0"
          >
            <Bell className="w-4 h-4 text-amber-400" />
            {!hasPermission && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>

          {/* Firebase Status Button */}
          <button
            onClick={onOpenFirebaseModal}
            title={firebaseActive ? 'Firebase Canlı Veritabanı Bağlı' : 'Yerel Depolama (Firebase için tıklayın)'}
            className={`p-2 sm:p-2.5 rounded-xl border transition-all shrink-0 ${
              firebaseActive
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
            }`}
          >
            <Database className="w-4 h-4" />
          </button>
        </div>
      </div>
      </header>

      {/* Role / Auth Selection Modal */}
      {showAuthModal && (
        <AuthRoleModal
          defaultTab={authDefaultTab}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      {/* Notification Modal */}
      {showNotificationModal && (
        <NotificationModal onClose={() => setShowNotificationModal(false)} />
      )}
    </>
  );
};
