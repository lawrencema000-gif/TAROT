import { useState } from 'react';
import { Home, Sparkles, Brain, BookOpen, User, Shield, Newspaper, Star, Trophy, MoreHorizontal, X } from 'lucide-react';
import { isWeb } from '../../utils/platform';
import type { Tab } from '../../types';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  isAdmin?: boolean;
}

type TabDef = { id: Tab; label: string; icon: React.ElementType };

const visibleTabs: TabDef[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'readings', label: 'Readings', icon: Sparkles },
  { id: 'horoscope', label: 'Horoscope', icon: Star },
  { id: 'quizzes', label: 'Quizzes', icon: Brain },
];

const moreMenuTabs: TabDef[] = [
  { id: 'achievements', label: 'Trophies', icon: Trophy },
  { id: 'journal', label: 'Journal', icon: BookOpen },
];

const blogTab: TabDef = { id: 'blog', label: 'News', icon: Newspaper };
const profileTab: TabDef = { id: 'profile', label: 'Profile', icon: User };
const adminTab: TabDef = { id: 'admin', label: 'Admin', icon: Shield };

export function BottomNav({ activeTab, onTabChange, isAdmin = false }: BottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  // Build the list of items inside the More menu
  const moreItems: TabDef[] = [...moreMenuTabs];
  if (isWeb()) moreItems.push(blogTab);
  moreItems.push(profileTab);
  if (isAdmin) moreItems.push(adminTab);

  const moreTabIds = moreItems.map(t => t.id);
  const isMoreActive = moreTabIds.includes(activeTab);

  const handleMoreItemClick = (tab: Tab) => {
    onTabChange(tab);
    setMoreOpen(false);
  };

  return (
    <>
      {/* More menu overlay */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />

          {/* Slide-up menu panel */}
          <div className="relative z-10 w-full max-w-lg mx-auto mb-[76px] mx-2 animate-in slide-in-from-bottom duration-200">
            <div className="bg-gradient-to-b from-mystic-800 to-mystic-900 border border-mystic-700/40 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-mystic-700/30">
                <span className="text-gold font-semibold text-sm tracking-wide">More</span>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="p-1 rounded-lg text-mystic-400 hover:text-mystic-200 hover:bg-mystic-700/40 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Menu items grid */}
              <div className="grid grid-cols-3 gap-1 p-3">
                {moreItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleMoreItemClick(item.id)}
                      className={`
                        flex flex-col items-center gap-2 py-4 px-2 rounded-xl
                        transition-all duration-200 touch-manipulation active:scale-95
                        ${isActive
                          ? 'bg-gold/10 text-gold'
                          : 'text-mystic-400 hover:text-mystic-200 hover:bg-mystic-700/30'
                        }
                      `}
                    >
                      <div className={`
                        p-2.5 rounded-xl transition-all duration-200
                        ${isActive ? 'bg-gold/15 shadow-[0_0_12px_rgba(212,175,55,0.2)]' : 'bg-mystic-700/30'}
                      `}>
                        <Icon className={`w-5 h-5 transition-all duration-200 ${isActive ? 'drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]' : ''}`} />
                      </div>
                      <span className={`text-xs font-medium ${isActive ? 'text-gold' : ''}`}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom navigation bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 safe-bottom" aria-label="Main navigation" role="tablist">
        <div className="bg-gradient-to-t from-mystic-900 via-mystic-900/98 to-mystic-900/95 backdrop-blur-lg border-t border-mystic-700/30">
          <div className="flex items-center justify-around max-w-lg mx-auto px-2">
            {visibleTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setMoreOpen(false);
                    onTabChange(tab.id);
                  }}
                  role="tab"
                  aria-selected={isActive}
                  aria-label={tab.label}
                  className={`
                    relative flex flex-col items-center gap-1 py-3 px-2 min-w-[48px] min-h-[60px]
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

            {/* More button */}
            <button
              onClick={() => setMoreOpen(prev => !prev)}
              role="tab"
              aria-selected={isMoreActive}
              aria-label="More"
              className={`
                relative flex flex-col items-center gap-1 py-3 px-2 min-w-[48px] min-h-[60px]
                transition-all duration-300 touch-manipulation
                active:scale-90
                ${isMoreActive || moreOpen ? 'text-gold' : 'text-mystic-500 hover:text-mystic-300'}
              `}
            >
              {isMoreActive && (
                <div className="absolute inset-x-2 -top-px h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent" />
              )}
              <div className={`
                relative p-1.5 rounded-xl transition-all duration-300
                ${isMoreActive || moreOpen ? 'bg-gold/10' : ''}
              `}>
                <MoreHorizontal className={`w-5 h-5 transition-all duration-300 ${isMoreActive || moreOpen ? 'drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]' : ''}`} />
              </div>
              <span className={`text-[10px] font-medium transition-all duration-300 ${isMoreActive || moreOpen ? 'text-gold' : ''}`}>
                More
              </span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
