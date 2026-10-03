import { useState } from 'react';
import { Heart, Briefcase, Feather, Compass, ArrowUp, ArrowDown, BookOpen, X, Share2, ChevronUp, ChevronDown } from 'lucide-react';
import { Card, Tabs, KeywordRow, AffirmationPanel, Paper, TarotFace, EyebrowLabel, ReadingProse } from '../ui';
import type { TarotCard } from '../../types';
import { useT } from '../../i18n/useT';
import { affirmationFor, orientedMeaning } from './tarot/readingText';

/**
 * The card detail sheet.
 *
 *   chrome: share · ↑ previous / ↓ next · ✕
 *   the face (xl), named beneath by its arcana
 *   keyword pills · the affirmation
 *   tabs Meaning / Love / Career / Reflect, their panels on paper
 *   "Today's action"
 *
 * Previous / next walk whatever list the card was opened from — the cards
 * on the table, or the deck in the library — so a reading can be read
 * card by card without closing the sheet. The Sheet that mounts this
 * passes `label` rather than `title`, so this row is the only chrome.
 */

interface TarotCardDetailProps {
  card: TarotCard;
  reversed?: boolean;
  onClose: () => void;
  /** The list the card was opened from, with its index, for ↑ / ↓. */
  siblings?: { card: TarotCard; reversed: boolean }[];
  index?: number;
  onNavigate?: (index: number) => void;
  onShare?: () => void;
}

type DetailTab = 'meaning' | 'love' | 'career' | 'reflect';

const ICON_BUTTON =
  'w-11 h-11 inline-flex items-center justify-center rounded-full text-mystic-300 transition-[background-color,transform,color] duration-fast ' +
  '[@media(hover:hover)]:[&:hover:not(:active)]:bg-mystic-800 motion-safe:active:scale-90 disabled:opacity-30 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50';

export function TarotCardDetail({
  card,
  reversed = false,
  onClose,
  siblings,
  index = 0,
  onNavigate,
  onShare,
}: TarotCardDetailProps) {
  const { t } = useT('app');
  const [activeTab, setActiveTab] = useState<DetailTab>('meaning');

  const tabs: { id: DetailTab; label: string; icon: typeof Heart }[] = [
    { id: 'meaning', label: t('tarot.detail.tabs.meaning'), icon: BookOpen },
    { id: 'love', label: t('tarot.detail.tabs.love'), icon: Heart },
    { id: 'career', label: t('tarot.detail.tabs.career'), icon: Briefcase },
    { id: 'reflect', label: t('tarot.detail.tabs.reflect'), icon: Feather },
  ];

  const suitLabel = card.suit
    ? t('tarot.detail.minorArcanaLabel', {
        suit: `${card.suit.charAt(0).toUpperCase()}${card.suit.slice(1)}`,
      })
    : '';
  const affirmation = affirmationFor(card.id);
  const canNavigate = Boolean(siblings && siblings.length > 1 && onNavigate);
  const prev = canNavigate && index > 0 ? siblings![index - 1] : null;
  const next = canNavigate && index < siblings!.length - 1 ? siblings![index + 1] : null;

  return (
    <div className="space-y-6 pb-4">
      {/* Chrome: share · ↑ ↓ · close. One row, 44px targets. */}
      <div className="flex items-center justify-between -mt-2 -mx-2">
        <button
          type="button"
          onClick={onShare}
          disabled={!onShare}
          aria-label={t('tarot.detail.share', { defaultValue: 'Share this card' })}
          className={ICON_BUTTON}
        >
          <Share2 className="w-5 h-5" aria-hidden />
        </button>
        {canNavigate && (
          <div className="flex items-center gap-1 text-meta text-mystic-400">
            <button
              type="button"
              onClick={() => prev && onNavigate!(index - 1)}
              disabled={!prev}
              aria-label={
                prev
                  ? t('tarot.detail.previousCard', { defaultValue: 'Previous: {{name}}', name: prev.card.name })
                  : t('tarot.detail.previous', { defaultValue: 'Previous card' })
              }
              className={ICON_BUTTON}
            >
              <ChevronUp className="w-5 h-5" aria-hidden />
            </button>
            <span className="tabular-nums" aria-hidden>
              {index + 1} / {siblings!.length}
            </span>
            <button
              type="button"
              onClick={() => next && onNavigate!(index + 1)}
              disabled={!next}
              aria-label={
                next
                  ? t('tarot.detail.nextCard', { defaultValue: 'Next: {{name}}', name: next.card.name })
                  : t('tarot.detail.next', { defaultValue: 'Next card' })
              }
              className={ICON_BUTTON}
            >
              <ChevronDown className="w-5 h-5" aria-hidden />
            </button>
          </div>
        )}
        <button type="button" onClick={onClose} aria-label={t('tarot.detail.closeLabel')} className={ICON_BUTTON}>
          <X className="w-5 h-5" aria-hidden />
        </button>
      </div>

      <div className="flex justify-center">
        <TarotFace card={card} size="xl" radius="card" reversed={reversed} loading="eager" />
      </div>

      <div className="text-center space-y-1">
        <EyebrowLabel tone="ink">{card.arcana === 'major' ? t('tarot.detail.majorArcanaLabel') : suitLabel}</EyebrowLabel>
        <h2 className="heading-display-lg heading-strong text-mystic-100">{card.name}</h2>
        {card.arcana === 'major' && (
          <p className="text-meta text-mystic-400">{t('tarot.detail.cardNumber', { id: card.id })}</p>
        )}
      </div>

      {card.keywords.length > 0 && <KeywordRow keywords={card.keywords.slice(0, 4)} />}

      {affirmation && <AffirmationPanel text={affirmation} />}

      <Tabs
        size="sm"
        idPrefix="card-detail"
        aria-label={card.name}
        value={activeTab}
        onChange={setActiveTab}
        items={tabs.map(tab => ({ id: tab.id, icon: tab.icon, label: tab.label }))}
      />

      <Paper>
        {activeTab === 'meaning' && (
          <div className="space-y-6 animate-fade-in">
            <blockquote className="reading-quote">{card.description}</blockquote>

            <div className="space-y-5">
              <section>
                <h3 className="heading-display-md heading-strong text-ink inline-flex items-center gap-2">
                  <ArrowUp className="w-4 h-4 text-ink-teal" aria-hidden />
                  {t('tarot.upright')}
                </h3>
                <p className="reading-copy mt-2">{card.meaningUpright}</p>
              </section>

              <section>
                <h3 className="heading-display-md heading-strong text-ink inline-flex items-center gap-2">
                  <ArrowDown className="w-4 h-4 text-ink-gold" aria-hidden />
                  {t('tarot.reversed')}
                </h3>
                <p className="reading-copy mt-2">{card.meaningReversed}</p>
              </section>
            </div>
          </div>
        )}

        {activeTab === 'love' && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h3 className="heading-display-md heading-strong text-ink">{t('tarot.detail.loveTitle')}</h3>
              <p className="reading-meta">{t('tarot.detail.loveSubtitle')}</p>
            </div>
            {card.loveMeaning ? (
              <ReadingProse lede={false} text={orientedMeaning(card.loveMeaning, reversed)} />
            ) : (
              <p className="reading-copy">{t('tarot.detail.loveFallback')}</p>
            )}
            <p className="reading-copy border-l-2 border-ink-rose pl-4">
              {reversed ? t('tarot.detail.loveInsightReversed') : t('tarot.detail.loveInsightUpright')}
            </p>
          </div>
        )}

        {activeTab === 'career' && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h3 className="heading-display-md heading-strong text-ink">{t('tarot.detail.careerTitle')}</h3>
              <p className="reading-meta">{t('tarot.detail.careerSubtitle')}</p>
            </div>
            {card.careerMeaning ? (
              <ReadingProse lede={false} text={orientedMeaning(card.careerMeaning, reversed)} />
            ) : (
              <p className="reading-copy">{t('tarot.detail.careerFallback')}</p>
            )}
            <p className="reading-copy border-l-2 border-ink-blue pl-4">
              {reversed ? t('tarot.detail.careerInsightReversed') : t('tarot.detail.careerInsightUpright')}
            </p>
          </div>
        )}

        {activeTab === 'reflect' && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h3 className="heading-display-md heading-strong text-ink">{t('tarot.detail.reflectionTitle')}</h3>
              <p className="reading-meta">{t('tarot.detail.reflectionSubtitle')}</p>
            </div>
            <blockquote className="reading-quote">{card.reflectionPrompt || t('tarot.detail.reflectionFallback')}</blockquote>
            <div className="space-y-2 pt-1">
              <p className="reading-meta">{t('tarot.detail.journalPromptsLabel')}</p>
              <ol className="reading-copy space-y-2 list-decimal pl-5 marker:text-ink-gold">
                <li>{t('tarot.detail.journalPrompt1')}</li>
                <li>{t('tarot.detail.journalPrompt2')}</li>
                <li>{t('tarot.detail.journalPrompt3')}</li>
              </ol>
            </div>
          </div>
        )}
      </Paper>

      <Card padding="md">
        <h4 className="text-ui font-medium text-mystic-100 mb-1.5 flex items-center gap-2">
          <Compass className="w-4 h-4 text-gold" aria-hidden />
          {t('tarot.detail.todaysAction')}
        </h4>
        <p className="reading-copy">{t('tarot.detail.todaysActionText', { name: card.name })}</p>
      </Card>
    </div>
  );
}
