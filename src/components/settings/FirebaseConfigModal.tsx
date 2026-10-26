import React, { useState } from 'react';
import { X, Database, Check, AlertCircle, Save, Trash2, Key } from 'lucide-react';
import { FirebaseConfig } from '../../types';
import {
  loadSavedFirebaseConfig,
  initFirebase,
  clearFirebaseConfig,
} from '../../services/firebase';
import { useApp } from '../../context/AppContext';

interface FirebaseConfigModalProps {
  onClose: () => void;
}

export const FirebaseConfigModal: React.FC<FirebaseConfigModalProps> = ({ onClose }) => {
  const { firebaseActive, refreshFirebaseStatus } = useApp();

  const saved = loadSavedFirebaseConfig();

  const [apiKey, setApiKey] = useState(saved?.apiKey || '');
  const [projectId, setProjectId] = useState(saved?.projectId || '');
  const [authDomain, setAuthDomain] = useState(saved?.authDomain || '');
  const [appId, setAppId] = useState(saved?.appId || '');

  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!apiKey || !projectId) {
      setStatusMessage({ text: 'Lütfen en azından API Key ve Project ID alanlarını doldurun.', type: 'error' });
      return;
    }

    const config: FirebaseConfig = {
      apiKey,
      projectId,
      authDomain: authDomain || `${projectId}.firebaseapp.com`,
      storageBucket: `${projectId}.appspot.com`,
      messagingSenderId: '1234567890',
      appId: appId || '1:1234567890:web:abcdef',
    };

    const success = initFirebase(config);
    refreshFirebaseStatus();

    if (success) {
      setStatusMessage({ text: 'Firebase yapılandırması başarıyla kaydedildi ve bağlandı!', type: 'success' });
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setStatusMessage({ text: 'Firebase bağlantısı kurulamadı. Lütfen bilgileri kontrol edin.', type: 'error' });
    }
  };

  const handleClear = () => {
    clearFirebaseConfig();
    refreshFirebaseStatus();
    setApiKey('');
    setProjectId('');
    setAuthDomain('');
    setAppId('');
    setStatusMessage({ text: 'Firebase yapılandırması silindi. Yerel önbelleğe geçildi.', type: 'success' });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-base">Firebase Veritabanı</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Banner */}
        <div
          className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
            firebaseActive
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}
        >
          {firebaseActive ? <Check className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />}
          <span>
            {firebaseActive
              ? 'Canlı Firestore Veritabanı Bağlı. Veriler gerçek zamanlı senkronize ediliyor.'
              : 'Yerel Mod Aktif: Veriler cihazınızda (LocalStorage) tam performansla saklanıyor.'}
          </span>
        </div>

        {statusMessage && (
          <div
            className={`p-2.5 rounded-xl text-xs font-semibold ${
              statusMessage.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        {/* Config Form */}
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Firebase API Key
            </label>
            <input
              type="text"
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Project ID
            </label>
            <input
              type="text"
              placeholder="halisaha-pro-123"
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              App ID (Opsiyonel)
            </label>
            <input
              type="text"
              placeholder="1:123456789:web:..."
              value={appId}
              onChange={e => setAppId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex space-x-2 pt-2">
            {saved && (
              <button
                type="button"
                onClick={handleClear}
                className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:bg-rose-500/30 transition-all"
                title="Yapılandırmayı Sıfırla"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Kaydet & Bağlan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
