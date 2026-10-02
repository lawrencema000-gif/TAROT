import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Share2, Heart, Briefcase, Feather, BookOpen, Compass, User } from 'lucide-react';
import { KeywordRow, Paper, Tabs, Tag, EyebrowLabel } from '../ui';
import { useT } from '../../i18n/useT';
import { getPlayingCardBySlug, isCourtCard, isJoker, PLAYING_CARDS_ALL } from '../../data/cartomancy';
import type { PlayingCard } from '../../types/cartomancy';
import { PlayingCardFace } from './PlayingCardFace';

/**
 * One playing card, close up: the face at 224/256 px, its name and
 * keywords on the canvas, then the meanings on paper under a row of tabs
 * (Meaning · Love · Career · Advice · Reflect, and As a person for the
 * courts and the Jokers). Prev/next walk the 54 in deck order; share hands
 * the card to the section's share card. TarotCardDetail's shape with a
 * drawn face instead of a bitmap.
 */

export interface CartomancyCardDetailProps {
  card: PlayingCard;
  reversed?: boolean;
  /** The card with the active locale's prose. */
  localize: (card: PlayingCard) => PlayingCard;
  /** The cards prev/next walk through. Default: the whole deck in order. */
  sequence?: PlayingCard[];
  /** Walk to another card; omit to hide the prev/next row. */
  onNavigate?: (card: PlayingCard) => void;
  onShare?: (card: PlayingCard, reversed: boolean) => void;
}

type DetailTab = 'meaning' | 'love' | 'career' | 'advice' | 'person' | 'reflect';

export function CartomancyCardDetail({ card: source, reversed = false, localize, sequence = PLAYING_CARDS_ALL, onNavigate, onShare }: CartomancyCardDetailProps) {
  const { t } = useT('app');
  const [activeTab, setActiveTab] = useState<DetailTab>('meaning');
  const card = useMemo(() => localize(source), [source, localize]);
  const index = sequence.findIndex((c) => c.id === source.id);
  const prev = index > 0 ? sequence[index - 1] : null;
  const next = index >= 0 && index < sequence.length - 1 ? sequence[index + 1] : null;
  const person = isCourtCard(source) || isJoker(source);

  const tabs: { id: DetailTab; label: string; icon: typeof Heart }[] = [
    { id: 'meaning', label: t('tarot.detail.tabs.meaning'), icon: BookOpen },
    { id: 'love', label: t('tarot.detail.tabs.love'), icon: Heart },
    { id: 'career', label: t('tarot.detail.tabs.career'), icon: Briefcase },
    ...(card.adviceMeaning ? [{ id: 'advice' as const, label: t('cartomancy.card.advice', { defaultValue: 'Advice' }), icon: Compass }] : []),
    ...(person && card.asPerson ? [{ id: 'person' as const, label: t('cartomancy.card.asPerson', { defaultValue: 'As a person' }), icon: User }] : []),
    { id: 'reflect', label: t('tarot.detail.tabs.reflect'), icon: Feather },
  ];

  const suitLabel = isJoker(source)
    ? t('cartomancy.suits.joker', { defaultValue: 'Joker' })
    : t(`cartomancy.suits.${source.suit}.title`, { defaultValue: source.suit.charAt(0).toUpperCase() + source.suit.slice(1) });

  const heading = (text: string) => <h3 className="heading-display-md heading-strong text-ink">{text}</h3>;

  return (
    <div className="space-y-6 pb-2">
      <div className="flex items-center justify-between">
        {onShare ? (
          <button
            type="button"
            onClick={() => onShare(source, reversed)}
            aria-label={t('readings.revealView.share', { defaultValue: 'Share this reading' })}
            className="w-11 h-11 -ml-2 flex items-center justify-center rounded-full text-mystic-300 transition-colors duration-fast [@media(hover:hover)]:[&:hover:not(:active)]:text-mystic-100 active:text-mystic-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
          >
            <Share2 className="w-5 h-5" />
          </button>
        ) : (
          <span />
        )}
        {onNavigate && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!prev}
              onClick={() => prev && onNavigate(prev)}
              aria-label={prev ? t('cartomancy.card.previous', { defaultValue: 'Previous card: {{name}}', name: localize(prev).name }) : t('cartomancy.card.previousNone', { defaultValue: 'No previous card' })}
              className="w-11 h-11 flex items-center justify-center rounded-full text-mystic-300 transition-colors duration-fast disabled:opacity-40 [@media(hover:hover)]:[&:hover:not(:active)]:text-mystic-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-caption tabular-nums text-mystic-500 min-w-[3.5rem] text-center" aria-hidden>
              {index + 1} / {sequence.length}
            </span>
            <button
              type="button"
              disabled={!next}
              onClick={() => next && onNavigate(next)}
              aria-label={next ? t('cartomancy.card.next', { defaultValue: 'Next card: {{name}}', name: localize(next).name }) : t('cartomancy.card.nextNone', { defaultValue: 'No next card' })}
              className="w-11 h-11 -mr-2 flex items-center justify-center rounded-full text-mystic-300 transition-colors duration-fast disabled:opacity-40 [@media(hover:hover)]:[&:hover:not(:active)]:text-mystic-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      <div className="relative mx-auto w-56 sm:w-64 text-gold [&>svg]:w-full [&>svg]:h-auto [&>svg]:block rounded-card overflow-hidden border border-gold/25">
        <PlayingCardFace card={source} reversed={reversed} />
        {reversed && (
          <Tag tone="neutral" size="md" className="absolute bottom-3 left-1/2 -translate-x-1/2">
            {t('tarot.detail.reversed')}
          </Tag>
        )}
      </div>

      <div className="text-center space-y-2">
        <EyebrowLabel>{suitLabel}</EyebrowLabel>
        <h2 className="heading-display-lg heading-strong text-mystic-100">{card.name}</h2>
      </div>

      <KeywordRow keywords={card.keywords} />

      <Tabs
        idPrefix="carto-card-detail"
        aria-label={card.name}
        value={activeTab}
        onChange={setActiveTab}
        size="sm"
        items={tabs.map((tab) => ({ id: tab.id, icon: tab.icon, label: <span className="hidden sm:inline">{tab.label}</span>, 'aria-label': tab.label }))}
      />

      {/* -mx-2 outside Paper's own -mx-4 reaches the sheet's 24 px padding. */}
      <div className="-mx-2">
        <Paper as="div">
          <div className="min-h-[200px] space-y-5">
            {activeTab === 'meaning' && (
              <>
                <section className="space-y-2">
                  {heading(t('tarot.upright'))}
                  <p className="reading-copy">{card.meaningUpright}</p>
                </section>
                {card.meaningReversed && (
                  <section className="space-y-2">
                    {heading(t('tarot.reversed'))}
                    <p className="reading-copy">{card.meaningReversed}</p>
                  </section>
                )}
                {card.timing && (
                  <section className="space-y-2">
                    {heading(t('cartomancy.card.timing', { defaultValue: 'Timing' }))}
                    <p className="reading-copy">{card.timing}</p>
                  </section>
                )}
                {card.combinations.length > 0 && (
                  <section className="space-y-2">
                    {heading(t('cartomancy.card.withOtherCards', { defaultValue: 'With other cards' }))}
                    <ul className="space-y-2">
                      {card.combinations.map((combo) => {
                        const other = getPlayingCardBySlug(combo.with);
                        return (
                          <li key={combo.with} className="reading-copy">
                            <strong>{other ? localize(other).name : combo.with}.</strong> {combo.meaning}
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}
              </>
            )}
            {activeTab === 'love' && (
              <section className="space-y-2">
                {heading(t('tarot.detail.loveTitle'))}
                <p className="reading-copy">{card.loveMeaning}</p>
              </section>
            )}
            {activeTab === 'career' && (
              <section className="space-y-2">
                {heading(t('tarot.detail.careerTitle'))}
                <p className="reading-copy">{card.careerMeaning}</p>
              </section>
            )}
            {activeTab === 'advice' && card.adviceMeaning && (
              <section className="space-y-2">
                {heading(t('cartomancy.card.advice', { defaultValue: 'Advice' }))}
                <p className="reading-copy">{card.adviceMeaning}</p>
              </section>
            )}
            {activeTab === 'person' && card.asPerson && (
              <section className="space-y-2">
                {heading(t('cartomancy.card.asPerson', { defaultValue: 'As a person' }))}
                <p className="reading-copy">{card.asPerson}</p>
              </section>
            )}
            {activeTab === 'reflect' && (
              <section className="space-y-4">
                {heading(t('tarot.detail.reflectionTitle'))}
                <blockquote className="reading-quote">{card.reflectionPrompt}</blockquote>
                <p className="reading-meta">{card.quickMeaning}</p>
              </section>
            )}
          </div>
        </Paper>
      </div>
    </div>
  );
}
