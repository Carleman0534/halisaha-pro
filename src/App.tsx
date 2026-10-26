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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row selection:bg-emerald-500 selection:text-white">
      {/* 1. VERTICAL LEFT SIDEBAR: Pinned along the left of the page on desktop (Sayfanın solunda dik blok) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenFirebaseModal={() => setShowFirebaseModal(true)}
      />

      {/* 2. TOP MOBILE HEADER: Shown on mobile screens (< md) */}
      <Header onOpenFirebaseModal={() => setShowFirebaseModal(true)} />

      {/* 3. MAIN CONTENT AREA: Expands gracefully to the right of the vertical sidebar on desktop */}
      <main className="flex-1 w-full md:pl-64 lg:pl-72 min-h-screen px-3.5 sm:px-6 lg:px-8 pt-4 pb-24 md:pb-8">
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

      {/* 4. BOTTOM MOBILE NAV: Shown on mobile screens (< md), hidden on desktop */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Firebase Settings Modal */}
      {showFirebaseModal && (
        <FirebaseConfigModal onClose={() => setShowFirebaseModal(false)} />
      )}

      {/* Instant Match Confirmation Modal for Notified Players */}
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
