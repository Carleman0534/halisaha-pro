import React, { useState, useEffect } from 'react';
import { Shield, Database, Users, Bell, Crown, User, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { COUNCIL_MEMBERS } from '../data/initialData';
import { NotificationModal } from './common/NotificationModal';
import { AuthRoleModal } from './auth/AuthRoleModal';
import { getNotificationPermission } from '../services/notifications';

interface HeaderProps {
  onOpenFirebaseModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenFirebaseModal }) => {
  const { currentMatch, currentUser, isAdmin, isCouncil, firebaseActive } = useApp();
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<'admin' | 'guest'>('admin');
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    setHasPermission(getNotificationPermission() === 'granted');
  }, [showNotificationModal]);

  const roleLabel =
    currentUser.role === 'admin'
      ? 'Yönetici'
      : currentUser.role === 'council_member'
      ? 'Konsey'
      : currentUser.role === 'player'
      ? 'Oyuncu'
      : 'Misafir';

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-3 sm:px-4 py-2.5 sm:py-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Logo & Match Week */}
        <div className="flex items-center space-x-2">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-black tracking-tight text-white text-sm sm:text-base">HALISAHA</span>
              <span className="text-[10px] sm:text-xs font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                PRO
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 font-medium">
              {currentMatch.matchNumber}. Hafta • {roleLabel} Modu
            </p>
          </div>
        </div>

        {/* User Role Switcher, Notification Bell & Firebase Status */}
        <div className="flex items-center space-x-1 sm:space-x-1.5">
          {/* Quick "Yöneticiye Geç" Button for Guests & Players */}
          {!isCouncil && (
            <button
              onClick={() => {
                setAuthDefaultTab('admin');
                setShowAuthModal(true);
              }}
              title="Yönetici (Konsey) Girişine Geç"
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-black shadow-lg shadow-amber-500/25 transition-all active:scale-95 shrink-0 border border-amber-300 animate-pulse"
            >
              <Crown className="w-3.5 h-3.5 text-black shrink-0" />
              <span>Yöneticiye Geç</span>
            </button>
          )}

          {/* Active User / Role Badge */}
          <button
            onClick={() => {
              setAuthDefaultTab(isCouncil ? 'guest' : 'admin');
              setShowAuthModal(true);
            }}
            title="Kullanıcı Girişi ve Rolleri Yönet"
            className={`flex items-center space-x-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 shadow-sm ${
              currentUser.role === 'admin'
                ? 'bg-gradient-to-r from-amber-950/80 to-slate-900 border-amber-500/40 text-amber-300 hover:border-amber-400'
                : currentUser.role === 'council_member'
                ? 'bg-gradient-to-r from-emerald-950/80 to-slate-900 border-emerald-500/40 text-emerald-300 hover:border-emerald-400'
                : currentUser.role === 'player'
                ? 'bg-gradient-to-r from-blue-950/80 to-slate-900 border-blue-500/40 text-blue-300 hover:border-blue-400'
                : 'bg-gradient-to-r from-slate-950 to-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
            }`}
          >
            {currentUser.role === 'admin' ? (
              <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : currentUser.role === 'council_member' ? (
              <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            )}
            <span className="truncate max-w-[70px] sm:max-w-[85px] text-white">{currentUser.name}</span>
            <span
              className={`text-[9px] px-1 py-0.2 rounded font-black uppercase ${
                currentUser.role === 'admin'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : currentUser.role === 'council_member'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : currentUser.role === 'player'
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                  : 'bg-slate-700 text-slate-300 border border-slate-600'
              }`}
            >
              {roleLabel}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
          </button>

          {/* Notification Bell Button */}
          <button
            onClick={() => setShowNotificationModal(true)}
            title="Sistem Bildirimleri & Hatırlatıcılar"
            className="relative p-2 rounded-xl border border-slate-700/60 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all active:scale-95 shrink-0"
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
    </header>
  );
};
