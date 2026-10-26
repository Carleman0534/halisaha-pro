import React from 'react';
import { CalendarDays, Users2, ShieldAlert, Wallet, BookOpen } from 'lucide-react';
import { useApp } from '../context/AppContext';

export type TabType = 'matches' | 'squad' | 'players' | 'finance' | 'rules';

interface BottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const { currentMatch } = useApp();

  // Count unpaid players in current match
  const unpaidCount = currentMatch.squad.filter(id => !currentMatch.payments[id]?.isPaid).length;

  const tabs = [
    { id: 'matches' as TabType, label: 'Maçlar', icon: CalendarDays },
    {
      id: 'squad' as TabType,
      label: 'Kadro',
      icon: Users2,
      badge: `${currentMatch.squad.length}/14`,
    },
    { id: 'players' as TabType, label: 'Havuz', icon: ShieldAlert },
    {
      id: 'finance' as TabType,
      label: 'Finans',
      icon: Wallet,
      badge: unpaidCount > 0 ? `${unpaidCount}` : undefined,
      badgeColor: 'bg-rose-500',
    },
    { id: 'rules' as TabType, label: 'Konsey', icon: BookOpen },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 pb-safe md:hidden">
      <div className="w-full max-w-2xl lg:max-w-3xl mx-auto grid grid-cols-5 h-16 px-2 sm:px-4">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center justify-center space-y-1 transition-all ${
                isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {tab.badge && (
                  <span
                    className={`absolute -top-1.5 -right-3 text-[10px] font-black px-1.5 py-0.2 rounded-full text-white shadow-sm ${
                      tab.badgeColor || 'bg-emerald-600'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] sm:text-xs tracking-tight">{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-1 w-8 sm:w-10 h-0.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
