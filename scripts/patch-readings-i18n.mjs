import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, '..', 'src', 'i18n', 'locales');

const additions = {
  en: {
    focusAreas: { love: 'Love', career: 'Career', self: 'Self', money: 'Money', health: 'Health', general: 'General' },
    spreads: {
      single: { name: '1-Card Daily', description: 'Quick guidance' },
      threeCard: { name: 'Past/Present/Future', description: '3-card spread' },
      celticCross: { name: 'Celtic Cross', description: '10-card deep reading' },
      relationship: { name: 'Relationship Spread', description: '5-card love reading' },
      careerSpread: { name: 'Career Decision', description: '6-card career insight' },
      shadow: { name: 'Shadow Work', description: '7-card inner work' },
    },
    dailyDraw: { title: 'Daily Draw', subtitle: 'Tap to begin your reading' },
    browse: {
      title: 'Browse Deck',
      allCards: 'All 78 Cards',
      learnMeanings: 'Learn card meanings',
      filters: { all: 'All', major: 'Major Arcana', swords: 'Swords', cups: 'Cups', wands: 'Wands', pentacles: 'Pentacles' },
    },
    spreadsSection: 'Spreads',
    focusView: { title: "What's your focus?", subtitle: 'Choose an area to guide your reading', continue: 'Continue' },
    shuffleView: {
      inProgress: 'Shuffling the deck...', clearMind: 'Clear your mind',
      spreading: 'Spreading all 78 cards', focusQuestion: 'Focus on your question', shuffleDeck: 'Shuffle Deck',
    },
    selectView: {
      chooseMore_one: 'Choose {{count}} more card',
      chooseMore_other: 'Choose {{count}} more cards',
      readyReveal: 'Ready to reveal!',
      trustIntuition: 'Trust your intuition • All 78 cards',
      selectMore: 'Select {{count}} More',
      revealCards: 'Reveal Cards',
    },
    revealView: {
      focusReading: '{{focus}} Reading', tapToReveal: 'Tap to reveal', revealAll: 'Reveal All',
      generating: 'Generating...', getAIInsight: 'Get AI Insight', premiumAI: 'Premium AI',
      aiInterpretation: 'AI Interpretation', aiSubtitle: 'Personalized insight based on your cards and profile',
      showCardMeanings: '← Show card meanings',
      loveFocus: 'Love Focus', careerFocus: 'Career Focus', moneyFocus: 'Money Focus',
      traditional: 'Traditional', reversedParen: '(Reversed)', reversed: 'Reversed', upright: 'Upright',
      reversalNote: 'Reversal note: {{text}}',
      save: 'Save', saved: 'Saved', newReading: 'New Reading',
      cardsSpoken: '"The cards have spoken. What small action can you take today that aligns with this guidance?"',
    },
    status: { try: 'Try', unlocked: 'Unlocked' },
    back: '← Back',
    toasts: {
      cardsNotFound: 'Some selected cards could not be found. Please reshuffle and try again.',
      saveFailed: 'Failed to save reading',
      readingSaved: 'Reading saved',
    },
  },
  ja: {
    focusAreas: { love: '恋愛', career: 'キャリア', self: '自分', money: 'お金', health: '健康', general: '全般' },
    spreads: {
      single: { name: '1枚引き(日々)', description: 'クイックガイダンス' },
      threeCard: { name: '過去・現在・未来', description: '3枚スプレッド' },
      celticCross: { name: 'ケルト十字', description: '10枚の深いリーディング' },
      relationship: { name: '関係性スプレッド', description: '5枚の恋愛リーディング' },
      careerSpread: { name: 'キャリアの決断', description: '6枚のキャリア洞察' },
      shadow: { name: 'シャドウワーク', description: '7枚の内面ワーク' },
    },
    dailyDraw: { title: 'デイリードロー', subtitle: 'タップしてリーディングを開始' },
    browse: {
      title: 'デッキを見る', allCards: '全78枚', learnMeanings: 'カードの意味を学ぶ',
      filters: { all: 'すべて', major: '大アルカナ', swords: 'ソード', cups: 'カップ', wands: 'ワンド', pentacles: 'ペンタクル' },
    },
    spreadsSection: 'スプレッド',
    focusView: { title: 'テーマは何ですか?', subtitle: 'リーディングを導くエリアを選んでください', continue: '続ける' },
    shuffleView: {
      inProgress: 'デッキをシャッフル中...', clearMind: '心を澄ませて',
      spreading: '全78枚を広げています', focusQuestion: '質問に集中してください', shuffleDeck: 'デッキをシャッフル',
    },
    selectView: {
      chooseMore_one: 'あと{{count}}枚選んでください',
      chooseMore_other: 'あと{{count}}枚選んでください',
      readyReveal: 'めくる準備ができました!',
      trustIntuition: '直感を信じて • 全78枚',
      selectMore: 'あと{{count}}枚選ぶ',
      revealCards: 'カードをめくる',
    },
    revealView: {
      focusReading: '{{focus}}リーディング', tapToReveal: 'タップしてめくる', revealAll: 'すべてめくる',
      generating: '生成中...', getAIInsight: 'AIインサイト取得', premiumAI: 'プレミアムAI',
      aiInterpretation: 'AI解釈', aiSubtitle: 'あなたのカードとプロフィールに基づくパーソナライズされた洞察',
      showCardMeanings: '← カードの意味を表示',
      loveFocus: '恋愛フォーカス', careerFocus: 'キャリアフォーカス', moneyFocus: 'マネーフォーカス',
      traditional: '伝統的', reversedParen: '(逆位置)', reversed: '逆位置', upright: '正位置',
      reversalNote: '逆位置ノート: {{text}}',
      save: '保存', saved: '保存済み', newReading: '新しいリーディング',
      cardsSpoken: '「カードは語りました。このガイダンスに沿って、今日あなたが取れる小さな行動は何ですか?」',
    },
    status: { try: 'お試し', unlocked: 'ロック解除' },
    back: '← 戻る',
    toasts: {
      cardsNotFound: '選択されたカードが見つかりませんでした。再シャッフルしてやり直してください。',
      saveFailed: 'リーディングの保存に失敗しました',
      readingSaved: 'リーディングを保存しました',
    },
  },
  ko: {
    focusAreas: { love: '사랑', career: '커리어', self: '자기', money: '돈', health: '건강', general: '일반' },
    spreads: {
      single: { name: '1장 데일리', description: '간단한 안내' },
      threeCard: { name: '과거/현재/미래', description: '3장 스프레드' },
      celticCross: { name: '켈틱 크로스', description: '10장 심층 리딩' },
      relationship: { name: '관계 스프레드', description: '5장 사랑 리딩' },
      careerSpread: { name: '커리어 결정', description: '6장 커리어 통찰' },
      shadow: { name: '섀도우 워크', description: '7장 내면 작업' },
    },
    dailyDraw: { title: '데일리 드로우', subtitle: '탭하여 리딩 시작' },
    browse: {
      title: '덱 보기', allCards: '전체 78장', learnMeanings: '카드 의미 배우기',
      filters: { all: '전체', major: '메이저 아르카나', swords: '소드', cups: '컵', wands: '완드', pentacles: '펜타클' },
    },
    spreadsSection: '스프레드',
    focusView: { title: '무엇에 집중하시겠어요?', subtitle: '리딩을 안내할 영역을 선택하세요', continue: '계속' },
    shuffleView: {
      inProgress: '덱을 섞는 중...', clearMind: '마음을 비우세요',
      spreading: '78장을 펼치는 중', focusQuestion: '질문에 집중하세요', shuffleDeck: '덱 섞기',
    },
    selectView: {
      chooseMore_one: '{{count}}장 더 선택하세요',
      chooseMore_other: '{{count}}장 더 선택하세요',
      readyReveal: '공개 준비 완료!',
      trustIntuition: '직관을 믿으세요 • 전체 78장',
      selectMore: '{{count}}장 더 선택',
      revealCards: '카드 공개',
    },
    revealView: {
      focusReading: '{{focus}} 리딩', tapToReveal: '탭하여 공개', revealAll: '전체 공개',
      generating: '생성 중...', getAIInsight: 'AI 인사이트 받기', premiumAI: '프리미엄 AI',
      aiInterpretation: 'AI 해석', aiSubtitle: '당신의 카드와 프로필을 기반으로 한 맞춤형 통찰',
      showCardMeanings: '← 카드 의미 표시',
      loveFocus: '사랑 포커스', careerFocus: '커리어 포커스', moneyFocus: '돈 포커스',
      traditional: '전통적', reversedParen: '(역방향)', reversed: '역방향', upright: '정방향',
      reversalNote: '역방향 노트: {{text}}',
      save: '저장', saved: '저장됨', newReading: '새 리딩',
      cardsSpoken: '"카드가 말했습니다. 이 안내에 따라 오늘 당신이 취할 수 있는 작은 행동은 무엇인가요?"',
    },
    status: { try: '시도', unlocked: '잠금 해제' },
    back: '← 뒤로',
    toasts: {
      cardsNotFound: '선택한 카드 중 일부를 찾을 수 없습니다. 다시 섞어서 시도하세요.',
      saveFailed: '리딩 저장에 실패했습니다',
      readingSaved: '리딩이 저장되었습니다',
    },
  },
  zh: {
    focusAreas: { love: '爱情', career: '事业', self: '自我', money: '财运', health: '健康', general: '综合' },
    spreads: {
      single: { name: '每日一张', description: '快速指引' },
      threeCard: { name: '过去/现在/未来', description: '3张牌阵' },
      celticCross: { name: '凯尔特十字', description: '10张深度解读' },
      relationship: { name: '关系牌阵', description: '5张爱情解读' },
      careerSpread: { name: '事业抉择', description: '6张事业洞察' },
      shadow: { name: '阴影工作', description: '7张内在探索' },
    },
    dailyDraw: { title: '每日抽牌', subtitle: '点击开始你的解读' },
    browse: {
      title: '浏览牌组', allCards: '全部78张', learnMeanings: '学习牌意',
      filters: { all: '全部', major: '大阿尔克那', swords: '宝剑', cups: '圣杯', wands: '权杖', pentacles: '星币' },
    },
    spreadsSection: '牌阵',
    focusView: { title: '你的焦点是什么?', subtitle: '选择一个领域来引导你的解读', continue: '继续' },
    shuffleView: {
      inProgress: '正在洗牌...', clearMind: '清空思绪',
      spreading: '展开全部78张牌', focusQuestion: '专注于你的问题', shuffleDeck: '洗牌',
    },
    selectView: {
      chooseMore_one: '再选{{count}}张牌',
      chooseMore_other: '再选{{count}}张牌',
      readyReveal: '准备揭示!',
      trustIntuition: '相信你的直觉 • 全78张',
      selectMore: '再选{{count}}张',
      revealCards: '揭示牌面',
    },
    revealView: {
      focusReading: '{{focus}}解读', tapToReveal: '点击揭示', revealAll: '全部揭示',
      generating: '生成中...', getAIInsight: '获取AI洞察', premiumAI: '高级AI',
      aiInterpretation: 'AI解读', aiSubtitle: '基于你的牌和个人资料的个性化洞察',
      showCardMeanings: '← 显示牌意',
      loveFocus: '爱情焦点', careerFocus: '事业焦点', moneyFocus: '财运焦点',
      traditional: '传统', reversedParen: '(逆位)', reversed: '逆位', upright: '正位',
      reversalNote: '逆位说明: {{text}}',
      save: '保存', saved: '已保存', newReading: '新解读',
      cardsSpoken: '"牌已说话。遵循这份指引,你今天可以采取哪个小小的行动?"',
    },
    status: { try: '试用', unlocked: '已解锁' },
    back: '← 返回',
    toasts: {
      cardsNotFound: '部分选中的牌无法找到。请重新洗牌后再试。',
      saveFailed: '保存解读失败',
      readingSaved: '解读已保存',
    },
  },
};

for (const [lang, block] of Object.entries(additions)) {
  const file = path.join(localesDir, lang, 'app.json');
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  j.readings = { ...j.readings, ...block };
  fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
  console.log(`Patched ${lang}/app.json — readings block extended`);
}
