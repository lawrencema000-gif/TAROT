import { useEffect, useRef } from 'react';
import { RefreshCw, Moon, Zap, Heart, Briefcase, DollarSign, Flame, Check, X, Sparkles, BookOpen } from 'lucide-react';
import { Card, Skeleton } from '../ui';
import { useDailyHoroscope } from '../../hooks/useAstrology';
import { useAuth } from '../../context/AuthContext';
import { adsService } from '../../services/ads';
import { SIGN_SYMBOLS } from '../../types/astrology';
import type { AspectType, ZodiacSign } from '../../types/astrology';

const ASPECT_COLORS: Record<AspectType, string> = {
  conjunction: 'text-gold border-gold/20 bg-gold/5',
  trine: 'text-teal border-teal/20 bg-teal/5',
  sextile: 'text-cosmic-blue border-cosmic-blue/20 bg-cosmic-blue/5',
  square: 'text-coral border-coral/20 bg-coral/5',
  opposition: 'text-cosmic-rose border-cosmic-rose/20 bg-cosmic-rose/5',
};

const CATEGORY_ICONS = {
  love: Heart,
  career: Briefcase,
  money: DollarSign,
  energy: Flame,
};

const CATEGORY_COLORS = {
  love: 'text-cosmic-rose',
  career: 'text-cosmic-blue',
  money: 'text-teal',
  energy: 'text-gold',
};

export function TodayForYou() {
  const { content, loading, error, refresh } = useDailyHoroscope();
  const { profile } = useAuth();
  const adShownRef = useRef(false);

  useEffect(() => {
    if (content && !adShownRef.current) {
      adShownRef.current = true;
      adsService.checkAndShowAd(profile?.isPremium || false, 'horoscope', profile?.isAdFree || false);
    }
  }, [content]);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-mystic-400">{error || 'No daily content available'}</p>
        <button onClick={() => refresh()} className="text-gold text-sm hover:underline cursor-pointer">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-mystic-100">Today For You</h2>
        <button onClick={() => refresh()} className="p-2 rounded-lg hover:bg-mystic-800/60 transition-colors cursor-pointer">
          <RefreshCw className="w-4 h-4 text-mystic-400" />
        </button>
      </div>

      <Card variant="glow" padding="lg">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold" />
            <span className="text-sm font-medium text-gold">{content.theme}</span>
          </div>
          <p className="text-mystic-200 leading-relaxed">{content.summary}</p>
        </div>
      </Card>

      <Card padding="md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-mystic-800/60 flex items-center justify-center">
            <Moon className="w-5 h-5 text-mystic-300" />
          </div>
          <div>
            <div className="text-xs text-mystic-400">Moon in</div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg" style={{ fontFamily: 'serif' }}>
                {SIGN_SYMBOLS[content.moonSign as ZodiacSign]}
              </span>
              <span className="font-medium text-mystic-200">{content.moonSign}</span>
              {content.moonHouse && (
                <span className="text-xs text-mystic-500">(House {content.moonHouse})</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {content.transitHighlights && content.transitHighlights.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-mystic-300 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" />
            Active Transits
          </h3>
          <div className="space-y-2">
            {content.transitHighlights.map((t, i) => (
              <div
                key={i}
                className={`px-3 py-2.5 rounded-xl border ${ASPECT_COLORS[t.aspect] || 'text-mystic-300 border-mystic-700/30 bg-mystic-800/30'}`}
              >
                <div className="text-xs font-medium mb-0.5">
                  {t.planet} {t.aspect} {t.natalPlanet}
                </div>
                <div className="text-xs opacity-80">{t.brief}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {(Object.entries(content.categories) as [keyof typeof CATEGORY_ICONS, string][]).map(([key, text]) => {
          const Icon = CATEGORY_ICONS[key];
          const color = CATEGORY_COLORS[key];
          return (
            <Card key={key} padding="sm" className="space-y-2">
              <div className={`flex items-center gap-2 ${color}`}>
                <Icon className="w-4 h-4" />
                <span className="text-xs font-medium capitalize">{key}</span>
              </div>
              <p className="text-xs text-mystic-300 leading-relaxed">{text}</p>
            </Card>
          );
        })}
      </div>

      {content.powerMove && (
        <Card variant="glow" padding="md">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-gold" />
            </div>
            <div>
              <div className="text-xs font-medium text-gold mb-1">Power Move</div>
              <p className="text-sm text-mystic-200">{content.powerMove}</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        {content.doList && content.doList.length > 0 && (
          <Card padding="sm" className="space-y-2">
            <div className="text-xs font-medium text-teal flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> Do
            </div>
            <ul className="space-y-1">
              {content.doList.map((item, i) => (
                <li key={i} className="text-xs text-mystic-300">{item}</li>
              ))}
            </ul>
          </Card>
        )}
        {content.avoidList && content.avoidList.length > 0 && (
          <Card padding="sm" className="space-y-2">
            <div className="text-xs font-medium text-coral flex items-center gap-1.5">
              <X className="w-3.5 h-3.5" /> Avoid
            </div>
            <ul className="space-y-1">
              {content.avoidList.map((item, i) => (
                <li key={i} className="text-xs text-mystic-300">{item}</li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {content.ritual && (
        <Card padding="md">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-mystic-800/60 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-mystic-300" />
            </div>
            <div>
              <div className="text-xs font-medium text-mystic-400 mb-1">Mini Ritual</div>
              <p className="text-sm text-mystic-200">{content.ritual}</p>
            </div>
          </div>
        </Card>
      )}

      {content.journalPrompt && (
        <Card padding="md">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-mystic-800/60 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4 h-4 text-mystic-300" />
            </div>
            <div>
              <div className="text-xs font-medium text-mystic-400 mb-1">Journal Prompt</div>
              <p className="text-sm text-mystic-200 italic">{content.journalPrompt}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
