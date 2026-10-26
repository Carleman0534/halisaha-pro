import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { TabType } from './components/BottomNav';
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
    <div className="min-h-screen min-w-[1024px] bg-slate-950 text-slate-100 flex flex-row selection:bg-emerald-500 selection:text-white">
      {/* 1. MASAÜSTÜ İLE BİREBİR AYNI SOL DİK PANEL (SIDEBAR) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenFirebaseModal={() => setShowFirebaseModal(true)}
      />

      {/* 2. ANA SAYFA ALANI: Bilgisayardaki gibi sol panelin sağına ferah biçimde yerleşir */}
      <main className="flex-1 w-full pl-64 lg:pl-72 min-h-screen px-4 sm:px-6 lg:px-8 pt-6 pb-12">
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
