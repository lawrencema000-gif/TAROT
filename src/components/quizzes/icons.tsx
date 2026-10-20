import { memo, type ComponentType, type SVGProps } from 'react';
import * as QuizIcons from '../ui/QuizIcons';
import { SparkleFourPoint } from '../ui';
import type { Dosha } from '../../data/ayurvedaQuiz';
import type { Element } from '../../data/elementAffinityQuiz';

/**
 * Drawn glyphs for the quiz result medallions that used to be emoji
 * (🔥🌊🌬️🌱 for the elements, 🌬️🔥⛰️ for the doshas, one per extra quiz).
 * Single colour, currentColor stroke, 24px viewBox — the same contract as
 * src/components/ui/QuizIcons.tsx, so they tint through text-* classes and
 * sit in the ResultLayout medallion at 40px.
 */

type IconProps = Omit<SVGProps<SVGSVGElement>, 'viewBox' | 'fill'>;

const svgProps = (className: string): SVGProps<SVGSVGElement> => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  className,
  'aria-hidden': true,
});

/** Fire △, water ▽, air △ with a bar, earth ▽ with a bar: the alchemical signs. */
export const ElementGlyph = memo(function ElementGlyph({ element, className = '', ...rest }: IconProps & { element: Element }) {
  const up = 'M12 4 L20 19 L4 19 Z';
  const down = 'M12 20 L4 5 L20 5 Z';
  return (
    <svg {...svgProps(className)} {...rest}>
      {element === 'fire' && <path d={up} />}
      {element === 'water' && <path d={down} />}
      {element === 'air' && (
        <>
          <path d={up} />
          <path d="M7.5 13 H16.5" />
        </>
      )}
      {element === 'earth' && (
        <>
          <path d={down} />
          <path d="M7.5 11 H16.5" />
        </>
      )}
    </svg>
  );
});

/** Vata: three wind strokes. Pitta: a flame. Kapha: two hills on a baseline. */
export const DoshaGlyph = memo(function DoshaGlyph({ dosha, className = '', ...rest }: IconProps & { dosha: Dosha }) {
  return (
    <svg {...svgProps(className)} {...rest}>
      {dosha === 'vata' && (
        <>
          <path d="M3 8 H13 a2.5 2.5 0 1 0 -2.5 -2.5" />
          <path d="M3 12.5 H17 a2.5 2.5 0 1 1 -2.5 2.5" />
          <path d="M3 17 H10" />
        </>
      )}
      {dosha === 'pitta' && (
        <>
          <path d="M12 3 C12 7 7 9 7 14 a5 5 0 0 0 10 0 C17 10 14 9 14 6 C13 7 12 8 12 3 Z" />
          <path d="M12 21 C9.8 21 9.5 18.5 10.5 17 C11 18 12 18.5 12 19.5 C12.6 18.8 13.2 18.2 13.4 17 C14.4 18.3 14.2 21 12 21 Z" />
        </>
      )}
      {dosha === 'kapha' && (
        <>
          <path d="M2 18 H22" />
          <path d="M3 18 L8.5 9 L12 14.5 L14.5 11 L21 18" />
          <path d="M9.5 14 L11 15.5" />
        </>
      )}
    </svg>
  );
});

/**
 * Icon key (quizMetadata.icon / EXTRA_QUIZ_METADATA.icon) → drawn glyph.
 * Every quiz has its own; the four-point sparkle is the fallback for a
 * future quiz that has not been given one yet.
 */
export const QUIZ_ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  'mbti-quadrant': QuizIcons.MbtiQuadrantIcon,
  'mbti-quick': QuizIcons.MbtiQuickIcon,
  'love-languages': QuizIcons.LoveLanguagesIcon,
  'mood-wave': QuizIcons.MoodWaveIcon,
  'attachment-rings': QuizIcons.AttachmentRingsIcon,
  'big-five-pentagon': QuizIcons.BigFivePentagonIcon,
  'four-elements': QuizIcons.FourElementsIcon,
  enneagram: QuizIcons.EnneagramIcon,
  'shadow-mask': QuizIcons.ShadowMaskIcon,
  'tarot-court': QuizIcons.TarotCourtIcon,
  'ayurveda-dosha': QuizIcons.AyurvedaDoshaIcon,
  'dark-triad': QuizIcons.DarkTriadIcon,
  briefcase: QuizIcons.DiscIcon,
  'dollar-sign': QuizIcons.MoneyScriptIcon,
  shield: QuizIcons.BoundariesIcon,
  flame: QuizIcons.BurnoutIcon,
  'message-circle': QuizIcons.CommunicationIcon,
  swords: QuizIcons.ConflictIcon,
  chronotype: QuizIcons.ChronotypeIcon,
  palette: QuizIcons.CreativeTypeIcon,
  sparkles: QuizIcons.SpiritualTypeIcon,
  'jungian-functions': QuizIcons.JungianFunctionsIcon,
  'love-styles-icon': QuizIcons.LoveStylesIcon,
  home: QuizIcons.ParentingStyleIcon,
  'book-open': QuizIcons.LearningStyleIcon,
  'empath-hsp-icon': QuizIcons.EmpathHspIcon,
  'self-compassion-icon': QuizIcons.SelfCompassionIcon,
  activity: QuizIcons.MoodScreenerIcon,
  wind: QuizIcons.AnxietyProfileIcon,
  compass: QuizIcons.LeadershipIcon,
  settings: QuizIcons.ProductivityIcon,
  'relationship-readiness-icon': QuizIcons.RelationshipReadinessIcon,
  leaf: QuizIcons.WellnessTypeIcon,
};

export function QuizGlyph({ icon, className = '' }: { icon: string; className?: string }) {
  const Icon = QUIZ_ICON_MAP[icon];
  if (!Icon) return <SparkleFourPoint className={className} />;
  return <Icon className={className} />;
}
