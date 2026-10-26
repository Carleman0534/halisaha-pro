import React, { useState, useEffect } from 'react';
import { Download, Share, X, Sparkles, Smartphone, Check } from 'lucide-react';

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already running as standalone PWA
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(isStandaloneMode);

    // Check if user dismissed recently
    const isDismissed = sessionStorage.getItem('pwa_prompt_dismissed');
    if (isDismissed) {
      setDismissed(true);
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Capture Chrome / Android install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setTimeout(() => setDismissed(true), 3000);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  // If already installed or dismissed, hide
  if (isStandalone || dismissed) {
    return null;
  }

  // Only show if we have an install prompt (Android/Desktop) or it's iOS
  if (!deferredPrompt && !isIOS) {
    return null;
  }

  return (
    <div className="mb-3 p-3 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/40 shadow-xl animate-in fade-in slide-in-from-top-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
            <Smartphone className="w-4 h-4 animate-bounce" />
          </div>

          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-black text-white">Uygulamayı Telefona Yükle</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                PWA
              </span>
            </div>

            {installed ? (
              <p className="text-[11px] text-emerald-400 flex items-center space-x-1 mt-0.5">
                <Check className="w-3.5 h-3.5" />
                <span>Uygulama başarıyla kuruldu!</span>
              </p>
            ) : isIOS ? (
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                Safari alt menüsünden <strong className="text-emerald-400">Paylaş</strong> simgesine, ardından{' '}
                <strong className="text-emerald-400">"Ana Ekrana Ekle"</strong>'ye dokunun.
              </p>
            ) : (
              <p className="text-[11px] text-slate-300 mt-0.5">
                Tarayıcı çubuğu olmadan tam ekran mobil uygulama olarak kullanın.
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="text-slate-500 hover:text-slate-300 p-1 -mr-1 -mt-1 text-xs"
          title="Kapat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Action button for Android / Desktop */}
      {deferredPrompt && !installed && (
        <div className="mt-2.5 flex justify-end">
          <button
            onClick={handleInstallClick}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Şimdi Yükle (Tek Tıkla)</span>
          </button>
        </div>
      )}
    </div>
  );
};
