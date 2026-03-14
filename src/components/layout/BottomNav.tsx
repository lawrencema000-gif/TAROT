import { Home, Sparkles, Brain, BookOpen, User, Shield, Newspaper, Star } from 'lucide-react';
import { isWeb } from '../../utils/platform';
import type { Tab } from '../../types';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  isAdmin?: boolean;
}

const baseTabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'readings', label: 'Readings', icon: Sparkles },
  { id: 'horoscope', label: 'Horoscope', icon: Star },
  { id: 'quizzes', label: 'Quizzes', icon: Brain },
  { id: 'journal', label: 'Journal', icon: BookOpen },
  { id: 'profile', label: 'Profile', icon: User },
];

const blogTab = { id: 'blog' as Tab, label: 'News', icon: Newspaper };
const adminTab = { id: 'admin' as Tab, label: 'Admin', icon: Shield };

export function BottomNav({ activeTab, onTabChange, isAdmin = false }: BottomNavProps) {
  let tabs = [...baseTabs];
  if (isWeb()) tabs.push(blogTab);
  if (isAdmin) tabs.push(adminTab);
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 safe-bottom" aria-label="Main navigation" role="tablist">
      <div className="bg-gradient-to-t from-mystic-900 via-mystic-900/98 to-mystic-900/95 backdrop-blur-lg border-t border-mystic-700/30">
        <div className="flex items-center justify-around max-w-lg mx-auto px-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                role="tab"
                aria-selected={isActive}
                aria-label={tab.label}
                className={`
                  relative flex flex-col items-center gap-1 py-3 px-4 min-w-[64px] min-h-[60px]
                  transition-all duration-300 touch-manipulation
                  active:scale-90
                  ${isActive ? 'text-gold' : 'text-mystic-500 hover:text-mystic-300'}
                `}
              >
                {isActive && (
                  <div className="absolute inset-x-2 -top-px h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent" />
                )}
                <div className={`
                  relative p-1.5 rounded-xl transition-all duration-300
                  ${isActive ? 'bg-gold/10' : ''}
                `}>
                  <Icon className={`w-5 h-5 transition-all duration-300 ${isActive ? 'drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]' : ''}`} />
                </div>
                <span className={`text-[10px] font-medium transition-all duration-300 ${isActive ? 'text-gold' : ''}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
