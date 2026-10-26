import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { Header } from './components/Header';
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Header - Full Responsive Width */}
      <Header onOpenFirebaseModal={() => setShowFirebaseModal(true)} />

      {/* Main Content Area - Expands gracefully on desktop/tablet while staying 100% responsive on mobile */}
      <main className="flex-1 w-full max-w-5xl lg:max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-4 pb-24">
        {/* PWA Install Banner */}
        <PwaInstallPrompt />

        {activeTab === 'matches' && (
          <MatchPlanner onNavigateToSquad={() => setActiveTab('squad')} />
        )}
        {activeTab === 'squad' && <SquadManager />}
        {activeTab === 'players' && <PlayerPool />}
        {activeTab === 'finance' && <FinanceManager />}
        {activeTab === 'rules' && <CouncilRules />}
      </main>

      {/* Bottom 5-Tab Navigation Bar */}
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
