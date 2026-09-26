import { getLocale, type SupportedLocale } from '../i18n/config';

/**
 * The daily journal prompt, on its own.
 *
 * Home and the Journal used to dynamic-import src/data/horoscopes.ts to get
 * this one sentence, and that chunk is a megabyte: it statically bundles the
 * ja / ko / zh horoscope corpora for the horoscope generator. The prompt
 * needs twelve strings per locale and a seeded pick, so it lives here and
 * costs nothing. horoscopes.ts re-exports these two names so nothing else
 * changed.
 *
 * The RNG and the pick are byte-for-byte the ones horoscopes.ts used, so a
 * given date still yields the same prompt it did yesterday.
 */

export const dailyPrompts = [
  'What intention do you want to set for today?',
  'What are you most grateful for right now?',
  'What fear are you ready to release?',
  'Describe a moment that brought you joy recently.',
  'What lesson has life been teaching you lately?',
  'If you could tell your past self one thing, what would it be?',
  'What does your ideal day look like?',
  'What boundary do you need to strengthen?',
  'Who in your life deserves more appreciation?',
  'What dream have you been postponing?',
  'How can you show yourself more compassion today?',
  'What pattern in your life are you ready to change?',
];

const LOCALIZED: Partial<Record<SupportedLocale, string[]>> = {
  ja: [
    "今日はどんな意図を設定したいですか?",
    "今最も感謝していることは何ですか?",
    "手放す準備ができている恐れは何ですか?",
    "最近喜びをもたらした瞬間を説明してください。",
    "人生が最近あなたに教えていた教訓は何ですか?",
    "過去の自分に1つのことを伝えられるとしたら、何を伝えますか?",
    "あなたの理想の日はどのように見えますか?",
    "強化する必要がある境界は何ですか?",
    "あなたの人生で誰がもっと感謝に値しますか?",
    "延期してきた夢は何ですか?",
    "今日どうすればもっと自分に思いやりを示せますか?",
    "人生でどんなパターンを変える準備ができていますか?"
  ],
  ko: [
    "오늘 어떤 의도를 설정하고 싶으신가요?",
    "지금 가장 감사한 것은 무엇인가요?",
    "놓아줄 준비가 된 두려움은 무엇인가요?",
    "최근 기쁨을 가져다준 순간을 설명해 주세요.",
    "삶이 최근에 당신에게 가르치고 있던 교훈은 무엇인가요?",
    "과거의 자신에게 한 가지를 말할 수 있다면, 무엇을 말하시겠어요?",
    "당신의 이상적인 하루는 어떻게 보이나요?",
    "강화해야 할 경계는 무엇인가요?",
    "당신의 삶에서 누가 더 많은 감사를 받을 자격이 있나요?",
    "미뤄왔던 꿈은 무엇인가요?",
    "오늘 어떻게 자신에게 더 많은 자비를 보여줄 수 있나요?",
    "당신의 삶에서 바꿀 준비가 된 패턴은 무엇인가요?"
  ],
  zh: [
    "你今天想设定什么意图?",
    "你现在最感激什么?",
    "你准备释放什么恐惧?",
    "描述最近给你带来喜悦的一个时刻。",
    "生活最近一直在教你什么课程?",
    "如果你可以告诉过去的自己一件事,那会是什么?",
    "你理想的一天是什么样的?",
    "你需要加强什么界限?",
    "你生活中的谁值得更多的欣赏?",
    "你一直在推迟什么梦想?",
    "今天你如何能对自己表现更多的同情?",
    "你生活中什么模式你准备改变?"
  ],
};

function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

/** The prompt list for the active locale (English where none exists). */
export function localizedDailyPrompts(): string[] {
  return LOCALIZED[getLocale()] ?? dailyPrompts;
}

export function getDailyPrompt(date: string): string {
  const dateNum = new Date(date).getTime();
  const random = seededRandom(dateNum);
  const prompts = localizedDailyPrompts();
  return prompts[Math.floor(random() * prompts.length)];
}
