import React, { useState, useEffect } from 'react';
import {
  Shield,
  Database,
  Bell,
  Crown,
  User,
  LogOut,
  CalendarDays,
  Users2,
  ShieldAlert,
  Wallet,
  BookOpen,
  ArrowRightLeft,
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext';
import { ADMIN_USERS, DEFAULT_GUEST_USER } from '../data/initialData';
import { TabType } from './BottomNav';
import { AuthRoleModal } from './auth/AuthRoleModal';
import { NotificationModal } from './common/NotificationModal';
import { getNotificationPermission } from '../services/notifications';
import { AppUser } from '../types';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onOpenFirebaseModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenFirebaseModal,
}) => {
  const { currentMatch, currentUser, setCurrentUser, isCouncil, firebaseActive } = useApp();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<'admin' | 'guest'>('admin');
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    setHasPermission(getNotificationPermission() === 'granted');
  }, [showNotificationModal]);

  const isLoggedUser = currentUser.id !== DEFAULT_GUEST_USER.id && currentUser.role !== 'guest';

  // Count unpaid players in current match for financial badge
  const unpaidCount = currentMatch.squad.filter(id => !currentMatch.payments[id]?.isPaid).length;

  const handleDirectLogout = () => {
    localStorage.removeItem('halisaha_admin_authenticated');
    setCurrentUser(DEFAULT_GUEST_USER);
  };

  const handleOpenAuth = (tab: 'admin' | 'guest') => {
    setAuthDefaultTab(tab);
    setShowAuthModal(true);
    setMobileDrawerOpen(false);
  };

  const handleQuickSelectAdmin = (admin: AppUser) => {
    const alreadyAuth = localStorage.getItem('halisaha_admin_authenticated') === 'true';
    if (alreadyAuth) {
      setCurrentUser(admin);
      try {
        confetti({ particleCount: 30, spread: 60, origin: { y: 0.5 } });
      } catch {}
      setMobileDrawerOpen(false);
    } else {
      handleOpenAuth('admin');
    }
  };

  const roleLabel =
    currentUser.role === 'admin'
      ? 'Yönetici'
      : currentUser.role === 'council_member'
      ? 'Konsey'
      : currentUser.role === 'player'
      ? 'Oyuncu'
      : 'Misafir';

  const navTabs = [
    { id: 'matches' as TabType, label: 'Maçlar', icon: CalendarDays },
    {
      id: 'squad' as TabType,
      label: 'Kadro & Taktik',
      icon: Users2,
      badge: `${currentMatch.squad.length}/14`,
    },
    { id: 'players' as TabType, label: 'Oyuncu Havuzu', icon: ShieldAlert },
    {
      id: 'finance' as TabType,
      label: 'Finans & Kasa',
      icon: Wallet,
      badge: unpaidCount > 0 ? `${unpaidCount}` : undefined,
      badgeColor: 'bg-rose-500',
    },
    { id: 'rules' as TabType, label: 'Konsey Kuralları', icon: BookOpen },
  ];

  return (
    <>
      {/* ============================================================== */}
      {/* 1. MOBİL: SOL SAYFAYA YANAŞIK DOCK BUTONU (HUGS THE LEFT EDGE)  */}
      {/* ============================================================== */}
      <div className="md:hidden fixed left-0 top-3 z-40">
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className="flex items-center space-x-2 pl-2 pr-3 py-1.5 rounded-r-2xl bg-slate-900/98 border-y border-r border-emerald-500/50 shadow-xl shadow-black/80 backdrop-blur-md active:scale-95 transition-all group select-none cursor-pointer"
          title="Sol Menüyü ve Paneli Aç"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-400 flex items-center justify-center shadow-md shadow-emerald-500/30 text-white shrink-0 group-hover:scale-105 transition-transform">
            <Shield className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="flex items-center space-x-1">
              <span className="font-black text-white text-xs tracking-tight">HALISAHA</span>
              <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-slate-300 font-medium">
              {currentMatch.matchNumber}. Hafta • {roleLabel}
            </p>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* MOBİL: SAĞ ÜST HIZLI AKSİYON (ÇIKIŞ VEYA YÖNETİCİYE GEÇ) */}
      <div className="md:hidden fixed right-2.5 top-3 z-40 flex items-center space-x-1.5">
        {isLoggedUser ? (
          <button
            onClick={handleDirectLogout}
            title="Oturumu Kapat ve Misafir Ol"
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold shadow-lg backdrop-blur-md active:scale-95 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Çıkış</span>
          </button>
        ) : (
          <button
            onClick={() => handleOpenAuth('admin')}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black text-xs font-black shadow-lg shadow-amber-500/25 border border-amber-300 active:scale-95 transition-all animate-pulse"
          >
            <Crown className="w-3.5 h-3.5 text-black" />
            <span>Yönetici</span>
          </button>
        )}
      </div>

      {/* ============================================================== */}
      {/* 2. MOBİL: SOL SAYFADAN AÇILAN ÇEKMECE PANELİ (MOBILE LEFT DRAWER)*/}
      {/* ============================================================== */}
      {mobileDrawerOpen && (
        <div
          onClick={() => setMobileDrawerOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-slate-900/98 border-r-2 border-emerald-500/50 shadow-2xl p-4 flex flex-col justify-between animate-slide-in-left select-none overflow-y-auto"
          >
            <div className="space-y-4">
              {/* Header with Close Button */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-sm">HALISAHA PRO</h3>
                    <p className="text-[10px] text-slate-400">{currentMatch.matchNumber}. Hafta • {roleLabel}</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Vertical Navigation Tabs */}
              <nav className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 block mb-1">
                  Menü
                </span>
                {navTabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setMobileDrawerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition-all ${
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                        <span>{tab.label}</span>
                      </div>
                      {tab.badge && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black text-white ${tab.badgeColor || 'bg-emerald-600'}`}>
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* Quick 1-Tap Switchers */}
              <div className="p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  ⚡ Hızlı Geçiş:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {ADMIN_USERS.slice(0, 4).map(admin => (
                    <button
                      key={admin.id}
                      onClick={() => handleQuickSelectAdmin(admin)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold truncate border transition-all ${
                        currentUser.id === admin.id
                          ? 'bg-amber-500 text-black border-amber-400'
                          : 'bg-slate-900 text-slate-300 border-slate-800'
                      }`}
                    >
                      👑 {admin.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions inside Mobile Drawer */}
            <div className="space-y-2 pt-3 border-t border-slate-800">
              <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => handleOpenAuth(isCouncil ? 'admin' : 'guest')}
                  className="flex items-center space-x-2 truncate text-left flex-1 min-w-0"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                    {currentUser.role === 'admin' ? <Crown className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-bold text-white block truncate">{currentUser.name}</span>
                    <span className="text-[10px] text-slate-400">{roleLabel} • Değiştir ▾</span>
                  </div>
                </button>
                {isLoggedUser && (
                  <button
                    onClick={handleDirectLogout}
                    className="p-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 transition-all shrink-0 ml-1"
                    title="Çıkış"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setShowNotificationModal(true);
                    setMobileDrawerOpen(false);
                  }}
                  className="py-2 px-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center space-x-1"
                >
                  <Bell className="w-3.5 h-3.5 text-amber-400" />
                  <span>Bildirimler</span>
                </button>
                <button
                  onClick={() => {
                    onOpenFirebaseModal();
                    setMobileDrawerOpen(false);
                  }}
                  className="py-2 px-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center space-x-1"
                >
                  <Database className={`w-3.5 h-3.5 ${firebaseActive ? 'text-emerald-400' : 'text-amber-400'}`} />
                  <span>{firebaseActive ? 'Canlı' : 'Yerel'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. MASAÜSTÜ: SAYFANIN SOLUNDA DİK OLAN SABİT BLOK (DESKTOP)     */}
      {/* ============================================================== */}
      <aside className="hidden md:flex fixed top-0 left-0 bottom-0 w-64 lg:w-72 bg-slate-900/98 border-r border-slate-800 z-40 flex-col justify-between p-4 shadow-xl select-none">
        {/* TOP SECTION: BRAND & CONTROL CENTER BUTTON */}
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => handleOpenAuth(isCouncil ? 'admin' : 'guest')}
            title="Kontrol Perdesini Aç (Rol Değiştir)"
            className="w-full p-3 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-950 text-left transition-all group cursor-pointer active:scale-[0.98]"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-400 flex items-center justify-center shadow-lg shadow-emerald-500/25 text-white shrink-0 group-hover:scale-105 transition-transform">
                <Shield className="w-5 h-5" />
              </div>
              <div className="truncate flex-1 min-w-0">
                <div className="flex items-center space-x-1.5">
                  <span className="font-black text-white text-base tracking-tight group-hover:text-emerald-400 transition-colors">
                    HALISAHA
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    PRO
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                  {currentMatch.matchNumber}. Hafta • {roleLabel} Modu
                </p>
              </div>
            </div>

            <div className="mt-2.5 text-[10px] text-emerald-400/90 font-bold bg-emerald-500/10 px-2 py-1 rounded-xl border border-emerald-500/20 flex items-center justify-between group-hover:bg-emerald-500/20 transition-colors">
              <span>⚡ Kontrol Paneli & Roller</span>
              <span className="flex items-center space-x-0.5">
                <span>Aç</span>
                <ChevronDown className="w-3 h-3 group-hover:translate-y-0.5 transition-transform" />
              </span>
            </div>
          </button>

          {/* VERTICAL NAVIGATION TABS (DİK MENÜ) */}
          <nav className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-1">
              Menü
            </span>
            {navTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs lg:text-sm transition-all active:scale-[0.98] ${
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/70 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 lg:w-5 lg:h-5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-black text-white ${
                        tab.badgeColor || 'bg-emerald-600'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* QUICK 1-TAP SWITCH CHIPS */}
          <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <span>⚡ Hızlı Giriş</span>
              <span className="text-slate-400 font-normal">Tek tık</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {ADMIN_USERS.slice(0, 4).map(admin => {
                const isSelected = currentUser.id === admin.id;
                return (
                  <button
                    key={admin.id}
                    onClick={() => handleQuickSelectAdmin(admin)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold truncate text-center border transition-all active:scale-95 ${
                      isSelected
                        ? 'bg-amber-500 text-black border-amber-400 shadow-sm'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    👑 {admin.name.split(' ')[0]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: ACTIVE USER CARD, LOGOUT & SYSTEM CONTROLS */}
        <div className="space-y-2 pt-3 border-t border-slate-800">
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <button
              onClick={() => handleOpenAuth(isCouncil ? 'admin' : 'guest')}
              title="Kullanıcı veya Rol Değiştir"
              className="flex items-center space-x-2.5 truncate text-left hover:opacity-90 transition-opacity flex-1 min-w-0"
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                  currentUser.role === 'admin'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : currentUser.role === 'council_member'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}
              >
                {currentUser.role === 'admin' ? (
                  <Crown className="w-4 h-4" />
                ) : currentUser.role === 'council_member' ? (
                  <Shield className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>
              <div className="truncate flex-1 min-w-0">
                <span className="text-xs font-bold text-white block truncate">{currentUser.name}</span>
                <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                  <span>{roleLabel}</span>
                  <ArrowRightLeft className="w-2.5 h-2.5 text-amber-400" />
                </span>
              </div>
            </button>

            {isLoggedUser && (
              <button
                onClick={handleDirectLogout}
                title="Oturumu Kapat ve Misafir Ol"
                className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 hover:text-rose-200 transition-all active:scale-95 shrink-0 ml-1.5"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowNotificationModal(true)}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center space-x-1.5 transition-all"
            >
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span>Bildirimler</span>
              {!hasPermission && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse ml-0.5" />
              )}
            </button>

            <button
              onClick={onOpenFirebaseModal}
              title={firebaseActive ? 'Firebase Bağlı' : 'Yerel Depolama (Firebase için tıklayın)'}
              className={`p-2 rounded-xl border transition-all shrink-0 ${
                firebaseActive
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
              }`}
            >
              <Database className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

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
