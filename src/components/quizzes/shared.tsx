import type { ReactNode } from 'react';
import { Share2, Bookmark } from 'lucide-react';
import { AffirmationPanel, Button, Disclaimer, EyebrowLabel, Paper, ResultLayout, toast } from '../ui';
import { useT } from '../../i18n/useT';
import { shareOrDownloadCard } from '../../utils/shareCard';
import type { QuizDefinition } from '../../types';
import type { QuizCategory } from '../../data/quizzes';

/**
 * What every quiz result screen is built from.
 *
 * The verdict stays on the navy ResultLayout block; everything the person
 * READS afterwards sits on one Paper, closed by the quiz Disclaimer. These
 * helpers hold the paper-side recipes so eleven renderers cannot disagree
 * about a heading, a bullet or a score bar.
 */

export interface QuizResultViewProps<R> {
  /** The localized definition the person just took (or the one a saved result belongs to). */
  quiz: QuizDefinition;
  result: R;
  /** Back to the list. */
  onBack: () => void;
  /** Start the same quiz again. */
  onRetake: () => void;
  saving?: boolean;
  /** Present on the quizzes that write a profile field (mbti, love-language, enneagram, attachment). */
  onSaveToProfile?: (type: string, label: string, extra?: Record<string, unknown>) => void;
}

/** quizMetadata.color / EXTRA_QUIZ_METADATA.color → a whole class Tailwind can see. */
export const TILE_INK: Record<string, string> = {
  gold: 'text-gold',
  teal: 'text-teal',
  coral: 'text-coral',
  'cosmic-blue': 'text-cosmic-blue',
  'cosmic-rose': 'text-cosmic-rose',
  'cosmic-violet': 'text-cosmic-violet',
};

/** moodDescriptions[verdict].tone → the verdict's ink on the navy block (R8 (e)1). */
export const MOOD_INK: Record<'high' | 'steady' | 'low', string> = {
  high: 'text-teal',
  steady: 'text-gold',
  low: 'text-coral',
};

export const CATEGORY_ORDER: readonly QuizCategory[] = ['personality', 'relationships', 'wellbeing', 'tarot-spirit'];

export const CATEGORY_LABEL_EN: Record<QuizCategory, string> = {
  personality: 'Personality',
  relationships: 'Relationships',
  wellbeing: 'Wellbeing',
  'tarot-spirit': 'Tarot & spirit',
};

/** The cream reading body of a result: one Paper, the quiz Disclaimer as its tail, then anything that follows. */
export function ResultBody({ children, after }: { children: ReactNode; after?: ReactNode }) {
  return (
    <>
      <Paper as="article" tail>
        <div className="mx-auto max-w-[66ch] space-y-8">{children}</div>
      </Paper>
      <Disclaimer kind="quiz" tail />
      {after}
    </>
  );
}

export function ResultSection({ title, children, className = '' }: { title: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`space-y-3 ${className}`.trim()}>
      <h2 className="heading-display-md heading-strong text-ink">{title}</h2>
      {children}
    </section>
  );
}

export function Prose({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`reading-copy ${className}`.trim()}>{children}</p>;
}

export function Bullets({ items }: { items: readonly string[] }) {
  return (
    <ul className="reading-copy list-disc space-y-1.5 pl-5 marker:text-ink-muted">
      {items.map((s, i) => (
        <li key={i}>{s}</li>
      ))}
    </ul>
  );
}

/** Label-over-value pairs (core motivation / fear / desire). */
export function Facts({ items }: { items: { label: string; value: string }[] }) {
  return (
    <dl className="space-y-3">
      {items.map((f) => (
        <div key={f.label}>
          <dt className="reading-meta">{f.label}</dt>
          <dd className="reading-copy">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A quoted line set apart: a journal prompt, a way to ask for it. */
export function Quote({ children }: { children: ReactNode }) {
  return <blockquote className="reading-copy reading-quote border-l-2 border-ink-gold pl-4 italic">{children}</blockquote>;
}

/**
 * A score bar in paper inks. The Progress primitive paints its track in
 * mystic-800, which on cream reads as a dark bar; until Progress grows a
 * `surface="paper"` variant this is the one hand-drawn bar in the app,
 * with the primitive's accessibility contract.
 */
export function PaperBar({
  value,
  max,
  label,
  emphasis = false,
  className = '',
}: {
  value: number;
  max: number;
  label: string;
  emphasis?: boolean;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(Math.max(value, 0), max)}
      className={`h-2 w-full overflow-hidden rounded-full bg-ink/10 ${className}`.trim()}
    >
      <div className={`h-full rounded-full ${emphasis ? 'bg-ink-gold' : 'bg-ink-muted/50'}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/**
 * One dimension of a score distribution: name and number on one line, the
 * bar under them. Stacked rather than side by side so a long result name
 * ("Machiavellian Shadow") wraps instead of truncating at 390px, and so the
 * rows read the same as the attachment axes.
 */
export function ScoreRow({
  name,
  value,
  max,
  display,
  emphasis = false,
  icon,
}: {
  name: string;
  value: number;
  max: number;
  /** The number drawn at the right; defaults to `value`. */
  display?: string | number;
  emphasis?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-3">
        {icon && <span className="inline-flex w-5 shrink-0 justify-center text-ink-2 [&>svg]:h-5 [&>svg]:w-5" aria-hidden>{icon}</span>}
        <span className={`min-w-0 flex-1 text-ui ${emphasis ? 'font-semibold text-ink' : 'text-ink-2'}`}>{name}</span>
        <span className="shrink-0 text-right text-meta tabular-nums text-ink-muted">{display ?? value}</span>
      </div>
      <PaperBar value={value} max={max} label={name} emphasis={emphasis} />
    </div>
  );
}

/** Named when the scorer reports a tie: both names, so a coin flip is not read as a verdict. */
export function CloseCall({ a, b }: { a: string; b: string }) {
  const { t } = useT('app');
  return (
    <div className="rounded-control border border-paper-hairline bg-ink/5 px-4 py-3">
      <EyebrowLabel tone="ink" align="left">
        {t('quizzes.resultSections.closeCall', { defaultValue: 'Close call' })}
      </EyebrowLabel>
      <p className="reading-copy mt-1">
        {t('quizzes.resultSections.closeCallBody', {
          defaultValue: '{{a}} and {{b}} scored within a hair of each other. Read both — the one you recognise is the one that counts.',
          a,
          b,
        })}
      </p>
    </div>
  );
}

export function Affirmation({ text }: { text: string }) {
  return <AffirmationPanel text={text} surface="paper" />;
}

/** The action row under the verdict: share, and save-to-profile where the quiz writes one. */
export function VerdictActions({
  onShare,
  onSave,
  saving,
}: {
  onShare: () => void;
  onSave?: () => void;
  saving?: boolean;
}) {
  const { t } = useT('app');
  return (
    <>
      {onSave && (
        <Button variant="outline" fullWidth onClick={onSave} disabled={saving}>
          <Bookmark className="h-4 w-4" aria-hidden />
          {t('quizzes.saveToProfile', { defaultValue: 'Save to my profile' })}
        </Button>
      )}
      <Button variant="outline" fullWidth onClick={onShare}>
        <Share2 className="h-4 w-4" aria-hidden />
        {t('quizzes.share.button', { defaultValue: 'Share my result' })}
      </Button>
    </>
  );
}

/** Retake · Take another quiz, after the Disclaimer. */
export function AfterResult({ onRetake, onBack, children }: { onRetake: () => void; onBack: () => void; children?: ReactNode }) {
  const { t } = useT('app');
  return (
    <div className="space-y-4 pt-1">
      {children}
      <div className="flex gap-3">
        <Button variant="ghost" fullWidth onClick={onRetake}>
          {t('quizzes.retake', { defaultValue: 'Retake' })}
        </Button>
        <Button variant="secondary" fullWidth onClick={onBack}>
          {t('quizzes.takeAnother', { defaultValue: 'Take another quiz' })}
        </Button>
      </div>
    </div>
  );
}

/**
 * One share path for every result (R6 A17): the share-card `quiz` variant
 * through the OS sheet, a download where there is none, and a toast on
 * the outcomes that need one.
 */
export function useQuizShare() {
  const { t } = useT('app');
  return async (opts: { quizTitle: string; resultName: string; affirmation?: string; fileName: string }) => {
    const outcome = await shareOrDownloadCard(
      { variant: 'quiz', quizName: opts.quizTitle, resultName: opts.resultName, affirmation: opts.affirmation },
      opts.fileName,
      t('quizzes.share.text', { defaultValue: '{{quiz}}: {{result}}. Take it on Arcana.', quiz: opts.quizTitle, result: opts.resultName }),
    );
    if (outcome === 'downloaded') toast(t('quizzes.share.downloaded', { defaultValue: 'Saved to your device' }), 'success');
    else if (outcome === 'failed') toast(t('common:actions.shareFailed', { defaultValue: 'Could not share right now' }), 'error');
  };
}

/**
 * A saved result whose key the current scorer no longer produces (the
 * self-compassion bands replaced four component keys; a quiz may rename a
 * result). Honest and short: retake, do not crash on `info[undefined]`.
 */
export function StaleResult({ quiz, onBack, onRetake }: { quiz: QuizDefinition; onBack: () => void; onRetake: () => void }) {
  const { t } = useT('app');
  return (
    <ResultLayout
      eyebrow={quiz.title}
      verdict={t('quizzes.stale.title', { defaultValue: 'This result needs a retake' })}
      summary={t('quizzes.stale.body', {
        defaultValue: 'This quiz has been revised since you took it, so the saved result no longer matches how it is scored. It takes a few minutes to take again.',
      })}
      onBack={onBack}
      backLabel={t('quizzes.backToQuizzes', { defaultValue: 'Back to quizzes' })}
      footer={<AfterResult onRetake={onRetake} onBack={onBack} />}
    />
  );
}

/** `arcana-<quiz>-<result>.png`, safe for every file system. */
export function shareFileName(quizId: string, resultKey: string): string {
  return `arcana-${quizId.replace(/-v\d+$/, '')}-${resultKey.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
}
