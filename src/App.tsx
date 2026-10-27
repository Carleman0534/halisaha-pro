import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { BottomNav, TabType } from './components/BottomNav';
import { MatchPlanner } from './components/matches/MatchPlanner';
import { SquadManager } from './components/squad/SquadManager';
import { PlayerPool } from './components/players/PlayerPool';
import { FinanceManager } from './components/finance/FinanceManager';
import { CouncilRules } from './components/council/CouncilRules';
import { FirebaseConfigModal } from './components/settings/FirebaseConfigModal';
import { PwaInstallPrompt } from './components/common/PwaInstallPrompt';
import { AttendanceActionModal } from './components/matches/AttendanceActionModal';

const MainLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('matches');
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-950 text-slate-100 flex flex-col md:flex-row selection:bg-emerald-500 selection:text-white">
      {/* 1. MASAÜSTÜ SOL DİK PANEL (SIDEBAR): Bilgisayarda (md+) görünür, mobilde gizlenir */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenFirebaseModal={() => setShowFirebaseModal(true)}
      />

      {/* 2. MOBİL ÜST BAŞLIK (HEADER): Telefonda (< md) görünür, masaüstünde gizlenir */}
      <Header onOpenFirebaseModal={() => setShowFirebaseModal(true)} />

      {/* 3. ANA SAYFA ALANI: Mobilde tam ekran uygulama hissi, masaüstünde sol panelin sağında geniş görünüm */}
      <main className="flex-1 w-full max-w-full md:pl-64 lg:pl-72 min-h-screen px-3 sm:px-6 lg:px-8 pt-3 md:pt-6 pb-24 md:pb-12">
        <div className="w-full max-w-6xl mx-auto">
          {/* PWA Install Banner */}
          <PwaInstallPrompt />

          {activeTab === 'matches' && (
            <MatchPlanner onNavigateToSquad={() => setActiveTab('squad')} />
          )}
          {activeTab === 'squad' && <SquadManager />}
          {activeTab === 'players' && <PlayerPool />}
          {activeTab === 'finance' && <FinanceManager />}
          {activeTab === 'rules' && <CouncilRules />}
        </div>
      </main>

      {/* 4. MOBİL 5 SEKMELİ ALT BAR (BOTTOM NAV): Telefonda (< md) sabit alt menü */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Firebase Ayarlar Modalı */}
      {showFirebaseModal && (
        <FirebaseConfigModal onClose={() => setShowFirebaseModal(false)} />
      )}

      {/* WhatsApp Bildirim Onay Modalı */}
      <AttendanceActionModal />
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}

export default App;
