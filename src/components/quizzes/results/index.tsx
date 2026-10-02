import type { QuizDefinition } from '../../../types';
import type { QuizResultViewProps } from '../shared';
import { MbtiResult } from './MbtiResult';
import { LoveLanguageResult } from './LoveLanguageResult';
import { MoodCheckResult } from './MoodCheckResult';
import { BigFiveResult } from './BigFiveResult';
import { EnneagramResult } from './EnneagramResult';
import { AttachmentResult } from './AttachmentResult';
import { CourtMatchResult } from './CourtMatchResult';
import { ShadowResult } from './ShadowResult';
import { ElementResult } from './ElementResult';
import { DoshaResult } from './DoshaResult';
import { ExtraResult } from './ExtraResult';
import type { MBTIResult, LoveLanguageResult as LoveLanguageScore, MoodCheckResult as MoodScore } from '../../../data/quizzes';
import type { BigFiveResult as BigFiveScore } from '../../../data/bigFiveQuiz';
import type { EnneagramResult as EnneagramScore } from '../../../data/enneagramQuiz';
import type { AttachmentResult as AttachmentScore } from '../../../data/attachmentQuiz';
import type { CourtMatchResult as CourtScore } from '../../../data/tarotCourtQuiz';
import type { ShadowResult as ShadowScore } from '../../../data/shadowArchetypeQuiz';
import type { ElementAffinityResult as ElementScore } from '../../../data/elementAffinityQuiz';
import type { DoshaResult as DoshaScore } from '../../../data/ayurvedaQuiz';
import type { DimensionalResult } from '../../../data/extraQuizzes';

export type QuizResultDispatchProps = Omit<QuizResultViewProps<unknown>, 'quiz'> & { quiz: QuizDefinition };

/**
 * One result screen per quiz type. `result` is whatever the scorer
 * returned (or whatever a saved quiz_results.scores row holds), so every
 * renderer tolerates fields a newer scorer adds.
 */
export function QuizResultView(props: QuizResultDispatchProps) {
  const { quiz, result } = props;
  switch (quiz.type) {
    case 'mbti':
      return <MbtiResult {...props} result={result as MBTIResult} />;
    case 'love-language':
      return <LoveLanguageResult {...props} result={result as LoveLanguageScore} />;
    case 'mood-check':
      return <MoodCheckResult {...props} result={result as MoodScore} />;
    case 'big-five':
      return <BigFiveResult {...props} result={result as BigFiveScore} />;
    case 'enneagram':
      return <EnneagramResult {...props} result={result as EnneagramScore} />;
    case 'attachment':
      return <AttachmentResult {...props} result={result as AttachmentScore} />;
    case 'court-match':
      return <CourtMatchResult {...props} result={result as CourtScore} />;
    case 'shadow-archetype':
      return <ShadowResult {...props} result={result as ShadowScore} />;
    case 'element-affinity':
      return <ElementResult {...props} result={result as ElementScore} />;
    case 'ayurveda-dosha':
      return <DoshaResult {...props} result={result as DoshaScore} />;
    case 'extra-dimensional':
      return <ExtraResult {...props} result={result as DimensionalResult} />;
    default:
      return null;
  }
}
