import React, { useState, useEffect } from 'react';
import { Shield, Database, Users, Bell } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { COUNCIL_MEMBERS } from '../data/initialData';
import { NotificationModal } from './common/NotificationModal';
import { getNotificationPermission } from '../services/notifications';

interface HeaderProps {
  onOpenFirebaseModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenFirebaseModal }) => {
  const { currentMatch, currentEvaluator, setCurrentEvaluator, firebaseActive } = useApp();
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    setHasPermission(getNotificationPermission() === 'granted');
  }, [showNotificationModal]);

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Logo & Match Week */}
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-black tracking-tight text-white text-base">HALISAHA</span>
              <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                PRO
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              {currentMatch.matchNumber}. Hafta • Konsey Sistemi
            </p>
          </div>
        </div>

        {/* Evaluator Selector, Notification Bell & Firebase Status */}
        <div className="flex items-center space-x-2">
          {/* Active Evaluator Badge/Select */}
          <div className="relative flex items-center">
            <div className="flex items-center space-x-1.5 bg-slate-800/80 border border-slate-700/60 rounded-lg px-2.5 py-1 text-xs text-slate-200">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <select
                aria-label="Aktif Değerlendirici Seçin"
                value={currentEvaluator.id}
                onChange={e => {
                  const found = COUNCIL_MEMBERS.find(m => m.id === e.target.value);
                  if (found) setCurrentEvaluator(found);
                }}
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer pr-1"
              >
                {COUNCIL_MEMBERS.map(m => (
                  <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notification Bell Button */}
          <button
            onClick={() => setShowNotificationModal(true)}
            title="Sistem Bildirimleri & Hatırlatıcılar"
            className="relative p-2 rounded-lg border border-slate-700/60 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all active:scale-95"
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
            className={`p-2 rounded-lg border transition-all ${
              firebaseActive
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
            }`}
          >
            <Database className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notification Modal */}
      {showNotificationModal && (
        <NotificationModal onClose={() => setShowNotificationModal(false)} />
      )}
    </header>
  );
};
