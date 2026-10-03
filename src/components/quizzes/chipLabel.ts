import type { QuizDefinition } from '../../types';
import { tResultCopy } from '../../i18n/localizeQuiz';
import { loveLanguageDescriptions, moodDescriptions } from '../../data/quizzes';
import { attachmentDescriptions } from '../../data/attachmentQuiz';
import { getCourtCardInfo, type CourtMatchResult } from '../../data/tarotCourtQuiz';
import { SHADOW_ARCHETYPES } from '../../data/shadowArchetypeQuiz';
import { ELEMENT_INFO, type Element } from '../../data/elementAffinityQuiz';
import { DOSHA_INFO, type Dosha } from '../../data/ayurvedaQuiz';
import { EXTRA_QUIZ_SCORING } from '../../data/extraQuizzes';
import { extraResultName } from './extraNames';

type T = (key: string, opts?: Record<string, unknown>) => string;

/**
 * The words on a quiz row's "last result" chip.
 *
 * quiz_results.label stores the scorer's KEY ("low", "both", "words",
 * "secure", "vata", "Struggling") because the profile fields key on it, so
 * the chip names it the way the result screen does, through the same keys
 * with the data module as the fallback. Returns undefined when the chip
 * would only repeat the row title (the Big Five has no single verdict).
 *
 * A key the current data module no longer has (the four self-compassion
 * components the bands replaced, a renamed result) never reaches the chip
 * raw: it reads "Needs a retake", the same verdict "See result" opens
 * (StaleResult).
 */
export function resultChipLabel(quiz: QuizDefinition, label: string | undefined, t: T): string | undefined {
  if (!label) return undefined;
  const stale = () => t('quizzes.stale.chip', { defaultValue: 'Needs a retake' });
  // Older rows carry the English "Type N" prefix from before the enneagramType key existed.
  const enneagram = (s: string) => s.replace(/^Type\s+(\d+)/, (_m, n) => t('quizzes.resultSections.enneagramType', { defaultValue: 'Type {{n}}', n }));
  switch (quiz.type) {
    case 'big-five':
      return undefined;
    case 'enneagram':
      return enneagram(label);
    case 'mood-check':
      return moodDescriptions[label] ? t(`quizzes.mood.${label.toLowerCase()}.label`, { defaultValue: label }) : stale();
    case 'love-language':
      return loveLanguageDescriptions[label] ? tResultCopy(`loveLanguage.${label}.title`, loveLanguageDescriptions[label].title) : stale();
    case 'attachment': {
      const info = attachmentDescriptions[label as keyof typeof attachmentDescriptions];
      return info ? tResultCopy(`attachment.${label}.name`, info.name) : stale();
    }
    case 'court-match': {
      if (!/^\w+-of-\w+$/.test(label)) return label;
      const info = getCourtCardInfo(label as CourtMatchResult['courtCard']);
      return t(`quizzes.courtCards.${label}.name`, { defaultValue: info.name });
    }
    case 'shadow-archetype': {
      const info = SHADOW_ARCHETYPES[label as keyof typeof SHADOW_ARCHETYPES];
      return info ? t(`quizzes.shadowArchetypes.${label}.name`, { defaultValue: info.name }) : stale();
    }
    case 'element-affinity': {
      const info = ELEMENT_INFO[label as Element];
      return info ? t(`quizzes.elements.${label}.name`, { defaultValue: info.name }) : stale();
    }
    case 'ayurveda-dosha': {
      const info = DOSHA_INFO[label as Dosha];
      return info ? t(`ayurveda.doshas.${label}.name`, { defaultValue: info.name }) : stale();
    }
    case 'extra-dimensional':
      return EXTRA_QUIZ_SCORING[quiz.id]?.info[label] ? extraResultName(quiz.id, label, t) : stale();
    default:
      return label;
  }
}
