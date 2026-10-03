import type { QuizDefinition } from '../../types';
import { tResultCopy } from '../../i18n/localizeQuiz';
import { loveLanguageDescriptions } from '../../data/quizzes';
import { attachmentDescriptions } from '../../data/attachmentQuiz';
import { getCourtCardInfo, type CourtMatchResult } from '../../data/tarotCourtQuiz';
import { SHADOW_ARCHETYPES } from '../../data/shadowArchetypeQuiz';
import { ELEMENT_INFO, type Element } from '../../data/elementAffinityQuiz';
import { DOSHA_INFO, type Dosha } from '../../data/ayurvedaQuiz';
import { EXTRA_QUIZ_SCORING } from '../../data/extraQuizzes';

type T = (key: string, opts?: Record<string, unknown>) => string;

/**
 * The words on a quiz row's "last result" chip.
 *
 * quiz_results.label stores the scorer's KEY ("low", "both", "words",
 * "secure", "vata", "Struggling") because the profile fields key on it, so
 * the chip names it the way the result screen does, through the same keys
 * with the data module as the fallback. Returns undefined when the chip
 * would only repeat the row title (the Big Five has no single verdict).
 */
export function resultChipLabel(quiz: QuizDefinition, label: string | undefined, t: T): string | undefined {
  if (!label) return undefined;
  // Older rows carry the English "Type N" prefix from before the enneagramType key existed.
  const enneagram = (s: string) => s.replace(/^Type\s+(\d+)/, (_m, n) => t('quizzes.resultSections.enneagramType', { defaultValue: 'Type {{n}}', n }));
  switch (quiz.type) {
    case 'big-five':
      return undefined;
    case 'enneagram':
      return enneagram(label);
    case 'mood-check':
      return t(`quizzes.mood.${label.toLowerCase()}.label`, { defaultValue: label });
    case 'love-language':
      return loveLanguageDescriptions[label] ? tResultCopy(`loveLanguage.${label}.title`, loveLanguageDescriptions[label].title) : label;
    case 'attachment': {
      const info = attachmentDescriptions[label as keyof typeof attachmentDescriptions];
      return info ? tResultCopy(`attachment.${label}.name`, info.name) : label;
    }
    case 'court-match': {
      if (!/^\w+-of-\w+$/.test(label)) return label;
      const info = getCourtCardInfo(label as CourtMatchResult['courtCard']);
      return t(`quizzes.courtCards.${label}.name`, { defaultValue: info.name });
    }
    case 'shadow-archetype': {
      const info = SHADOW_ARCHETYPES[label as keyof typeof SHADOW_ARCHETYPES];
      return info ? t(`quizzes.shadowArchetypes.${label}.name`, { defaultValue: info.name }) : label;
    }
    case 'element-affinity': {
      const info = ELEMENT_INFO[label as Element];
      return info ? t(`quizzes.elements.${label}.name`, { defaultValue: info.name }) : label;
    }
    case 'ayurveda-dosha': {
      const info = DOSHA_INFO[label as Dosha];
      return info ? t(`ayurveda.doshas.${label}.name`, { defaultValue: info.name }) : label;
    }
    case 'extra-dimensional': {
      const info = EXTRA_QUIZ_SCORING[quiz.id]?.info[label];
      const quizKey = quiz.id.replace(/-v\d+$/, '');
      return info ? t(`extraQuizzes.${quizKey}.results.${label}.name`, { defaultValue: info.name }) : label;
    }
    default:
      return label;
  }
}
