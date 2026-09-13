import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { FOOLS_JOURNEY, getCurrentJourney } from '../data/foolsJourney';
import { fullDeck } from '../data/tarotDeck';
import { getBundledFullPath } from '../config/bundledImages';
import { setPageMeta } from '../utils/seo';

export function FoolsJourneyPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setPageMeta(
      'The Fool\'s Journey — Your progression',
      '22-level progression mapped to the Major Arcana. From Wandering Seeker to Returned Whole.',
    );
  }, []);

  if (!user || !profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-mystic-300 mb-4">Sign in to see your Fool\'s Journey.</p>
        <button onClick={() => navigate('/signin')} className="px-5 py-2 rounded-xl bg-gradient-to-r from-gold via-gold-dark to-gold text-mystic-950 font-semibold">
          Sign in
        </button>
      </div>
    );
  }

  const currentLevel = profile.level || 1;
  const { current, next } = getCurrentJourney(currentLevel);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
      <PageHeader
        className="mb-6"
        align="center"
        onBack={() => navigate(-1)}
        eyebrow="The Fool’s Journey"
        title={current.title}
        subtitle={
          <>
            <span className="block italic">{current.theme}</span>
            <span className="block text-xs text-mystic-500 mt-2">Level {currentLevel} of 22</span>
          </>
        }
      />

      {next && (
        <section className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 via-mystic-900/40 to-mystic-900/40 p-4 mb-6 text-center">
          <p className="text-[10px] uppercase tracking-wider text-gold mb-1">Next milestone</p>
          <p className="text-mystic-100 font-display text-lg">{next.title}</p>
          <p className="text-xs text-mystic-400 mt-1">{next.cardName} · {next.milestone}</p>
        </section>
      )}

      <div className="space-y-2">
        {FOOLS_JOURNEY.map((level) => {
          const card = fullDeck.find((c) => c.id === level.cardId);
          const imgUrl = card ? getBundledFullPath(card.id) : null;
          const isUnlocked = level.level <= currentLevel;
          const isCurrent = level.level === currentLevel;
          return (
            <div
              key={level.level}
              className={`rounded-2xl border p-3 flex items-center gap-3 transition-colors ${
                isCurrent
                  ? 'border-gold/50 bg-gold/10'
                  : isUnlocked
                  ? 'border-mystic-800/60 bg-mystic-900/40'
                  : 'border-mystic-800/40 bg-mystic-900/20 opacity-60'
              }`}
            >
              <div className="relative w-12 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-mystic-950">
                {imgUrl && isUnlocked ? (
                  <img src={imgUrl} alt={level.cardName} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-mystic-900">
                    <Lock className="w-4 h-4 text-mystic-600" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] uppercase tracking-wider text-mystic-500">Level {level.level}</span>
                  {isCurrent && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gold/20 text-gold">You are here</span>}
                  {isUnlocked && !isCurrent && <CheckCircle2 className="w-3 h-3 text-gold/70" />}
                </div>
                <h2 className={`text-sm font-medium truncate ${isUnlocked ? 'text-mystic-100' : 'text-mystic-500'}`}>{level.title}</h2>
                <p className="text-xs text-mystic-400 truncate">{level.cardName} · {level.theme}</p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-mystic-500 text-center mt-6">
        Each level unlocks as you build your daily practice — pulling cards, journaling readings, completing rituals.
      </p>
    </div>
  );
}
