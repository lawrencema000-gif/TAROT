import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Paper, Progress, SparkleFourPoint } from '../ui';

/**
 * LessonFrame — one question or one lesson step, in the order a learner
 * reads it (design cues §6.8).
 *
 *   row 1   back (44px) · Progress (gold, sm) · "n / N"
 *   Paper   prompt (text-ui, ink-muted, centred)
 *           → concept (bold display serif, ink, centred)
 *           → answers (stacked AnswerChoice buttons, left-aligned)
 *           → hint (text-caption, ink-muted, with a 12px glyph)
 *
 * The chrome stays on the navy canvas; everything the learner READS sits
 * on the cream Paper, the one reading region of the screen. Quiz
 * questions (QuizQuestionView) and tarot lessons share this frame so a
 * question cannot drift from a lesson in paddings or type.
 *
 * `above` is a slot between the chrome and the paper for a one-line Tag
 * (the quiz's mid-way "early reading"); it is never a Card.
 */
export interface LessonFrameProps {
  /** 1-based step and the total, drawn as the bar and the "n / N" meta. */
  step: number;
  total: number;
  /** Accessible name of the progress bar, e.g. "Quiz progress". */
  progressLabel: string;
  onBack: () => void;
  backLabel: string;
  prompt?: ReactNode;
  concept: ReactNode;
  /**
   * The concept is the page title on a quiz screen (h1). Pass h2 when the
   * page already has an h1 above the frame.
   */
  headingLevel?: 'h1' | 'h2';
  children: ReactNode;
  hint?: ReactNode;
  above?: ReactNode;
  className?: string;
}

export function LessonFrame({
  step,
  total,
  progressLabel,
  onBack,
  backLabel,
  prompt,
  concept,
  headingLevel = 'h1',
  children,
  hint,
  above,
  className = '',
}: LessonFrameProps) {
  const Heading = headingLevel;
  // A short concept ("The Fool") carries the hero size; a full-sentence
  // question stem steps down one size so six lines of 32px serif do not
  // push the answers below the fold at 390px.
  const long = typeof concept === 'string' && concept.length > 90;
  return (
    <div className={`space-y-4 ${className}`.trim()}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel}
          className="
            -ml-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-mystic-400
            transition-colors duration-fast [@media(hover:hover)]:[&:hover:not(:active)]:bg-mystic-800 active:bg-mystic-800
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-mystic-950
          "
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <Progress value={step} max={total} size="sm" tone="gold" label={progressLabel} className="flex-1" />
        <span className="shrink-0 text-meta tabular-nums text-mystic-400">
          {step} / {total}
        </span>
      </div>

      {above}

      <Paper as="section">
        <div className="mx-auto max-w-[66ch] space-y-6">
          {prompt && <p className="text-ui text-ink-muted text-center">{prompt}</p>}
          <Heading className={`${long ? 'heading-display-lg' : 'heading-display-xl'} heading-strong text-ink text-center text-balance`}>
            {concept}
          </Heading>
          <div className="space-y-3">{children}</div>
          {hint && (
            <p className="flex items-center justify-center gap-1.5 text-caption text-ink-muted">
              <span className="inline-flex text-ink-muted" aria-hidden>
                <SparkleFourPoint size={12} />
              </span>
              <span>{hint}</span>
            </p>
          )}
        </div>
      </Paper>
    </div>
  );
}

export interface AnswerChoiceProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

/**
 * One answer on the paper: the Button recipe (48px, rounded-control,
 * text-ui, 0.97 press, explicit focus ring) in paper inks — a faint ink
 * fill on a paper hairline, ink text, left-aligned so a long option reads
 * as a sentence. Selected: ink-gold hairline on an ink-gold tint. The
 * Button primitive has no paper variant yet; when it gains one this
 * becomes `<Button variant="paper">`.
 */
export function AnswerChoice({ selected = false, className = '', children, disabled, ...rest }: AnswerChoiceProps) {
  const fill = selected
    ? 'border-ink-gold bg-ink-gold/10 text-ink'
    : 'border-paper-hairline bg-ink/5 text-ink [@media(hover:hover)]:[&:hover:not(:active)]:bg-ink/10 active:bg-ink/15';
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected || undefined}
      className={`
        flex w-full min-h-[48px] items-center rounded-control border px-4 py-3 text-left text-ui leading-snug
        transition-[transform,background-color,border-color] duration-fast ease-[cubic-bezier(0.22,0.8,0.25,1)]
        select-none touch-manipulation [-webkit-tap-highlight-color:transparent]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-paper
        disabled:opacity-50 disabled:cursor-not-allowed
        ${fill} ${disabled ? '' : 'motion-safe:active:scale-[0.98]'} ${className}
      `}
      {...rest}
    >
      {children}
    </button>
  );
}
