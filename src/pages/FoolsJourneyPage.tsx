import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, CheckCircle2 } from 'lucide-react';
import { Button, Card, Page, PageHeader, Tag, EyebrowLabel, TarotFace } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { FOOLS_JOURNEY, getCurrentJourney, type JourneyLevel } from '../data/foolsJourney';
import { fullDeck } from '../data/tarotDeck';
import { setPageMeta } from '../utils/seo';
import { useT } from '../i18n/useT';
import { ctEntry, useContentOverlay } from '../i18n/contentOverlay';
import { localizeCard } from '../i18n/localizeCard';

/**
 * The Fool's Journey — the 22-level rank ladder mapped to the Major Arcana.
 * One flat "next milestone" panel (it was a gold gradient) and a row per
 * level with the card's face once the level is reached.
 *
 * Each level's title, theme and milestone come from the `journey` content
 * overlay keyed by level number; the card is named by id in the reader's
 * language (the same name its face's plate shows), never by the English
 * data's `cardName`.
 */
export function FoolsJourneyPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { t } = useT('app');
  const { overlay } = useContentOverlay('journey');

  useEffect(() => {
    setPageMeta(
      t('foolsJourney.metaTitle', { defaultValue: 'The Fool’s Journey — Your progression' }),
      t('foolsJourney.metaDescription', { defaultValue: '22-level progression mapped to the Major Arcana. From Wandering Seeker to Returned Whole.' }),
    );
  }, [t]);

  /** A level in the reader's language: its words from the overlay, its card's name by id. */
  const local = (level: JourneyLevel): JourneyLevel & { cardLabel: string } => {
    const words = ctEntry(level, overlay, String(level.level), ['title', 'theme', 'milestone']);
    const card = fullDeck.find((c) => c.id === level.cardId);
    return { ...words, cardLabel: card ? localizeCard(card).name : level.cardName };
  };

  if (!user || !profile) {
    return (
      <Page className="py-16 text-center">
        <p className="text-body text-mystic-300 mb-4">{t('foolsJourney.signInHint', { defaultValue: "Sign in to see your Fool's Journey." })}</p>
        <Button variant="gold" onClick={() => navigate('/signin')}>
          {t('foolsJourney.signIn', { defaultValue: 'Sign in to walk the journey' })}
        </Button>
      </Page>
    );
  }

  const currentLevel = profile.level || 1;
  const journey = getCurrentJourney(currentLevel);
  const current = local(journey.current);
  const next = journey.next ? local(journey.next) : null;

  return (
    <Page className="py-6 sm:py-10">
      <PageHeader
        align="center"
        onBack={() => navigate(-1)}
        backLabel={t('common:actions.back', { defaultValue: 'Back' })}
        eyebrow={t('foolsJourney.eyebrow', { defaultValue: 'The Fool’s Journey' })}
        title={current.title}
        subtitle={
          <>
            <span className="block">{current.theme}</span>
            <span className="block text-meta text-mystic-500 mt-2 tabular-nums">
              {t('foolsJourney.levelOf', { defaultValue: 'Level {{level}} of 22', level: currentLevel })}
            </span>
          </>
        }
      />

      {next && (
        <Card variant="accent" padding="md" className="text-center">
          <EyebrowLabel className="block mb-1">{t('foolsJourney.nextMilestone', { defaultValue: 'Next milestone' })}</EyebrowLabel>
          <p className="heading-display-md heading-strong text-mystic-100">{next.title}</p>
          <p className="text-meta text-mystic-400 mt-1">{next.cardLabel} · {next.milestone}</p>
        </Card>
      )}

      <ol className="space-y-2">
        {FOOLS_JOURNEY.map((raw) => {
          const level = local(raw);
          const card = fullDeck.find((c) => c.id === level.cardId);
          const isUnlocked = level.level <= currentLevel;
          const isCurrent = level.level === currentLevel;
          return (
            <li
              key={level.level}
              aria-current={isCurrent ? 'step' : undefined}
              className={`rounded-card border p-3 flex items-center gap-3 ${
                isCurrent
                  ? 'border-gold/50 bg-mystic-800'
                  : isUnlocked
                  ? 'border-mystic-700 bg-mystic-850'
                  : 'border-mystic-700/60 bg-mystic-900 opacity-70'
              }`}
            >
              {card && isUnlocked ? (
                <TarotFace card={card} size="sm" loading="lazy" alt="" className="shrink-0" />
              ) : (
                <div className="w-16 aspect-[2/3] shrink-0 rounded-inset bg-mystic-900 border border-mystic-700 flex items-center justify-center" aria-hidden>
                  <Lock className="w-4 h-4 text-mystic-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <EyebrowLabel className="text-mystic-500 tabular-nums">
                    {t('foolsJourney.level', { defaultValue: 'Level {{level}}', level: level.level })}
                  </EyebrowLabel>
                  {isCurrent && <Tag tone="gold">{t('foolsJourney.youAreHere', { defaultValue: 'You are here' })}</Tag>}
                  {isUnlocked && !isCurrent && <CheckCircle2 className="w-3 h-3 text-gold/70" aria-hidden />}
                </div>
                <h2 className={`text-ui font-medium truncate ${isUnlocked ? 'text-mystic-100' : 'text-mystic-500'}`}>{level.title}</h2>
                <p className="text-meta text-mystic-400 truncate">{level.cardLabel} · {level.theme}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="text-caption text-mystic-500 text-center">
        {t('foolsJourney.footnote', { defaultValue: 'Each level unlocks as you build your daily practice — pulling cards, journaling readings, completing rituals.' })}
      </p>
    </Page>
  );
}
