import { useState } from 'react';
import { Home, Sparkles, Brain, BookOpen, User, Shield, Newspaper, Star, Trophy, MoreHorizontal, X, ShoppingBag, MessageCircle, Moon } from 'lucide-react';
import { isWeb } from '../../utils/platform';
import { useT } from '../../i18n/useT';
import { useFeatureFlag } from '../../context/FeatureFlagContext';
import type { Tab } from '../../types';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  isAdmin?: boolean;
}

// Label here is a translation key under common:nav.* — rendered via t().
type TabDef = { id: Tab; labelKey: string; icon: React.ElementType };
type ExternalItem = { id: string; labelKey: string; icon: React.ElementType; externalHref: string };
type MoreItem = TabDef | ExternalItem;

const isExternal = (item: MoreItem): item is ExternalItem =>
  (item as ExternalItem).externalHref !== undefined;

const visibleTabs: TabDef[] = [
  { id: 'home', labelKey: 'nav.home', icon: Home },
  { id: 'readings', labelKey: 'nav.readings', icon: Sparkles },
  { id: 'horoscope', labelKey: 'nav.horoscope', icon: Star },
  { id: 'quizzes', labelKey: 'nav.quizzes', icon: Brain },
];

const moreMenuTabs: TabDef[] = [
  { id: 'achievements', labelKey: 'nav.trophies', icon: Trophy },
  { id: 'journal', labelKey: 'nav.journal', icon: BookOpen },
];

const shopItem: ExternalItem = { id: 'shop', labelKey: 'nav.shop', icon: ShoppingBag, externalHref: 'https://yinyangguardian.com/' };
const blogTab: TabDef = { id: 'blog', labelKey: 'nav.news', icon: Newspaper };
const profileTab: TabDef = { id: 'profile', labelKey: 'nav.profile', icon: User };
const adminTab: TabDef = { id: 'admin', labelKey: 'nav.admin', icon: Shield };

export function BottomNav({ activeTab, onTabChange, isAdmin = false }: BottomNavProps) {
  const { t } = useT();
  const [moreOpen, setMoreOpen] = useState(false);
  const communityEnabled = useFeatureFlag('community');
  const whisperingWellEnabled = useFeatureFlag('whispering-well');
  const companionEnabled = useFeatureFlag('ai-companion');
  const advisorsEnabled = useFeatureFlag('advisors');

  // Build the list of items inside the More menu
  const moreItems: MoreItem[] = [...moreMenuTabs];
  if (companionEnabled) {
    moreItems.push({ id: 'companion' as Tab, labelKey: 'nav.companion', icon: Sparkles });
  }
  if (advisorsEnabled) {
    moreItems.push({ id: 'advisors' as Tab, labelKey: 'nav.advisors', icon: User });
  }
  if (communityEnabled) {
    moreItems.push({ id: 'community' as Tab, labelKey: 'nav.community', icon: MessageCircle });
  }
  if (whisperingWellEnabled) {
    moreItems.push({ id: 'whispering-well' as Tab, labelKey: 'nav.whisperingWell', icon: Moon });
  }
  if (isWeb()) moreItems.push(blogTab);
  moreItems.push(profileTab);
  if (isAdmin) moreItems.push(adminTab);
  moreItems.push(shopItem);

  const moreTabIds = moreItems.filter((item): item is TabDef => !isExternal(item)).map(t => t.id);
  const isMoreActive = moreTabIds.includes(activeTab as Tab);

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
          <div className="relative z-10 w-full max-w-lg mx-auto mb-[76px] px-2 animate-in slide-in-from-bottom duration-200">
            <div className="bg-gradient-to-b from-mystic-800 to-mystic-900 border border-mystic-700/40 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-mystic-700/30">
                <span className="text-gold font-semibold text-sm tracking-wide">{t('nav.more')}</span>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="p-1 rounded-lg text-mystic-400 hover:text-mystic-200 hover:bg-mystic-700/40 transition-colors"
                  aria-label={t('actions.close')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Menu items grid */}
              <div className="grid grid-cols-3 gap-1 p-3">
                {moreItems.map(item => {
                  const Icon = item.icon;
                  const external = isExternal(item);
                  const isActive = !external && activeTab === item.id;
                  const baseClass = `
                        flex flex-col items-center gap-2 py-4 px-2 rounded-xl
                        transition-all duration-200 touch-manipulation active:scale-95
                        ${isActive
                          ? 'bg-gold/10 text-gold'
                          : 'text-mystic-400 hover:text-mystic-200 hover:bg-mystic-700/30'
                        }
                      `;
                  const iconWrap = `
                        p-2.5 rounded-xl transition-all duration-200
                        ${isActive ? 'bg-gold/15 shadow-[0_0_12px_rgba(212,175,55,0.2)]' : 'bg-mystic-700/30'}
                      `;
                  const inner = (
                    <>
                      <div className={iconWrap}>
                        <Icon className={`w-5 h-5 transition-all duration-200 ${isActive ? 'drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]' : ''}`} />
                      </div>
                      <span className={`text-xs font-medium ${isActive ? 'text-gold' : ''}`}>
                        {t(item.labelKey)}
                      </span>
                    </>
                  );

                  if (external) {
                    return (
                      <a
                        key={item.id}
                        href={item.externalHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setMoreOpen(false)}
                        className={baseClass}
                      >
                        {inner}
                      </a>
                    );
                  }

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleMoreItemClick(item.id)}
                      className={baseClass}
                    >
                      {inner}
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
        {/* Hairline gold separator above the bar — replaces the previous
            mystic-700 border for a more refined brand-line treatment.
            Fades at the edges for a softer attachment to the page. */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-gold/25 to-transparent" aria-hidden />
        <div className="bg-gradient-to-t from-mystic-950 via-mystic-900/98 to-mystic-900/92 backdrop-blur-xl">
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
                  aria-label={t(tab.labelKey)}
                  className={`
                    relative flex flex-col items-center gap-1 py-3 px-2 min-w-[48px] min-h-[60px]
                    transition-all duration-300 touch-manipulation
                    active:scale-90
                    ${isActive ? 'text-gold' : 'text-mystic-500 hover:text-mystic-300'}
                  `}
                >
                  <div className={`
                    relative p-1.5 rounded-xl transition-all duration-300
                    ${isActive ? 'bg-gold/10 ring-1 ring-gold/25' : ''}
                  `}>
                    <Icon className={`w-5 h-5 transition-all duration-300 ${isActive ? 'drop-shadow-[0_0_8px_rgba(212,175,55,0.55)]' : ''}`} />
                  </div>
                  <span className={`text-[10px] font-medium tracking-wide transition-all duration-300 ${isActive ? 'text-gold' : ''}`}>
                    {t(tab.labelKey)}
                  </span>
                  {/* Active dot — small gold sparkle below the label,
                      matching the redesign mockup. Appears at the bottom
                      of the tab cell. Replaces the prior top gradient
                      bar for a quieter, more brand-centric indicator. */}
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gold shadow-[0_0_6px_rgba(212,175,55,0.7)]"
                    />
                  )}
                </button>
              );
            })}

            {/* More button */}
            <button
              onClick={() => setMoreOpen(prev => !prev)}
              role="tab"
              aria-selected={isMoreActive}
              aria-label={t('nav.more')}
              className={`
                relative flex flex-col items-center gap-1 py-3 px-2 min-w-[48px] min-h-[60px]
                transition-all duration-300 touch-manipulation
                active:scale-90
                ${isMoreActive || moreOpen ? 'text-gold' : 'text-mystic-500 hover:text-mystic-300'}
              `}
            >
              <div className={`
                relative p-1.5 rounded-xl transition-all duration-300
                ${isMoreActive || moreOpen ? 'bg-gold/10 ring-1 ring-gold/25' : ''}
              `}>
                <MoreHorizontal className={`w-5 h-5 transition-all duration-300 ${isMoreActive || moreOpen ? 'drop-shadow-[0_0_8px_rgba(212,175,55,0.55)]' : ''}`} />
              </div>
              <span className={`text-[10px] font-medium tracking-wide transition-all duration-300 ${isMoreActive || moreOpen ? 'text-gold' : ''}`}>
                {t('nav.more')}
              </span>
              {(isMoreActive || moreOpen) && (
                <span
                  aria-hidden
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gold shadow-[0_0_6px_rgba(212,175,55,0.7)]"
                />
              )}
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
