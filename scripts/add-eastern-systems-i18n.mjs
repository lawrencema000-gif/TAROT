// Seed i18n for the four eastern-systems features (Human Design, Bazi,
// Ayurveda, Dream Interpreter). Writes to every locale's app.json.
//
// Strategy for first ship:
//   - UI chrome: full translations across EN/JA/KO/ZH
//   - Type/archetype/dosha names: localized across all 4
//   - Long-form descriptions: EN canonical; JA/KO/ZH fall back to EN for V1
//     with a later translator pass to replace. This matches the I-Ching
//     pattern and keeps the feature usable in all locales.
//
// Idempotent.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES = ['en', 'ja', 'ko', 'zh'];

// ------------------------------------------------------------------
// Human Design
// ------------------------------------------------------------------

const HD_CHROME = {
  en: {
    title: 'Human Design',
    intro: 'Human Design maps the unique way you are built to engage with the world. Your type, strategy, authority, and profile show the path of least resistance — the way you are designed to make decisions, do work, and find alignment.',
    birthDate: 'Birth date',
    birthTime: 'Birth time (optional, sharpens result)',
    calculate: 'Reveal my design',
    calcFailed: 'Could not calculate chart',
    needBirthDate: 'Birth date is required',
    disclaimer: 'This is a lightweight reading. A full Human Design chart uses planetary positions from your exact birth moment. For the complete 9-centre bodygraph, export your birth data and visit a dedicated Human Design site.',
    signatureLabel: 'Signature',
    notSelfLabel: 'Not-self theme',
    authorityLabel: 'Authority',
    profileLabel: 'Profile',
    strengthsLabel: 'Strengths',
    challengesLabel: 'Challenges',
    affirmationLabel: 'Your affirmation',
    tarotPairingLabel: 'Tarot pairing',
    backToInput: 'Recalculate',
    recalculate: 'Recalculate',
  },
  ja: {
    title: 'ヒューマンデザイン',
    intro: 'ヒューマンデザインは、あなたが世界と関わるための独自の設計を地図にします。タイプ・戦略・オーソリティ・プロファイルが、無理なく進むための道筋——決断・仕事・整合のとり方——を示します。',
    birthDate: '生年月日',
    birthTime: '出生時刻（任意、結果がより精密になります）',
    calculate: '私のデザインを見る',
    calcFailed: 'チャートを計算できませんでした',
    needBirthDate: '生年月日が必要です',
    disclaimer: 'これは簡易版です。本格的なヒューマンデザインのチャートには、出生時点の正確な惑星位置が必要です。9センターのボディグラフ全体を見たい場合は、専用のHuman Designサイトへ出生データを持って行ってください。',
    signatureLabel: 'シグネチャー',
    notSelfLabel: '不本来（ノット・セルフ）テーマ',
    authorityLabel: 'オーソリティ',
    profileLabel: 'プロファイル',
    strengthsLabel: '強み',
    challengesLabel: '課題',
    affirmationLabel: 'あなたへのアファメーション',
    tarotPairingLabel: 'タロットとの対応',
    backToInput: '再計算',
    recalculate: '再計算',
  },
  ko: {
    title: '휴먼디자인',
    intro: '휴먼디자인은 당신이 세상과 어떻게 상호작용하도록 설계되었는지를 지도로 보여줍니다. 타입, 전략, 결정 권위, 프로파일은 가장 저항이 적은 길 — 당신이 결정을 내리고, 일하고, 정렬을 찾는 방식 — 을 보여 줍니다.',
    birthDate: '생년월일',
    birthTime: '출생 시간 (선택, 결과를 더 정확하게)',
    calculate: '나의 디자인 보기',
    calcFailed: '차트를 계산할 수 없었습니다',
    needBirthDate: '생년월일이 필요합니다',
    disclaimer: '이것은 간편 버전입니다. 완전한 휴먼디자인 차트는 정확한 출생 시점의 행성 위치가 필요합니다. 9센터 전체 바디그래프를 원하면 전용 Human Design 사이트에 출생 데이터를 입력하세요.',
    signatureLabel: '시그니처',
    notSelfLabel: '낫-셀프 테마',
    authorityLabel: '결정 권위',
    profileLabel: '프로파일',
    strengthsLabel: '강점',
    challengesLabel: '과제',
    affirmationLabel: '당신을 위한 아파메이션',
    tarotPairingLabel: '타로 페어링',
    backToInput: '다시 계산',
    recalculate: '다시 계산',
  },
  zh: {
    title: '人类图',
    intro: '人类图描绘你与世界互动的独特设计。你的类型、策略、内在权威与人生角色，展示了阻力最小的路径——适合你的决策、工作与找到协同的方式。',
    birthDate: '出生日期',
    birthTime: '出生时间（可选，让结果更精准）',
    calculate: '揭示我的设计',
    calcFailed: '未能计算图表',
    needBirthDate: '请填写出生日期',
    disclaimer: '这是简化版本。完整的人类图需要出生时刻准确的行星位置。若想看完整的九中心 bodygraph，请把出生数据带到专门的人类图网站。',
    signatureLabel: '标志',
    notSelfLabel: '非我主题',
    authorityLabel: '内在权威',
    profileLabel: '人生角色',
    strengthsLabel: '优势',
    challengesLabel: '挑战',
    affirmationLabel: '你的肯定语',
    tarotPairingLabel: '塔罗对应',
    backToInput: '重新计算',
    recalculate: '重新计算',
  },
};

const HD_TYPE_NAMES = {
  en: {
    manifestor: 'Manifestor', generator: 'Generator', 'manifesting-generator': 'Manifesting Generator',
    projector: 'Projector', reflector: 'Reflector',
  },
  ja: {
    manifestor: 'マニフェスター', generator: 'ジェネレーター', 'manifesting-generator': 'マニジェネ（マニフェスティング・ジェネレーター）',
    projector: 'プロジェクター', reflector: 'リフレクター',
  },
  ko: {
    manifestor: '매니페스터', generator: '제너레이터', 'manifesting-generator': '매니페스팅 제너레이터',
    projector: '프로젝터', reflector: '리플렉터',
  },
  zh: {
    manifestor: '显示者', generator: '生产者', 'manifesting-generator': '显示生产者',
    projector: '投射者', reflector: '反映者',
  },
};

// ------------------------------------------------------------------
// Bazi
// ------------------------------------------------------------------

const BAZI_CHROME = {
  en: {
    title: 'Bazi — Four Pillars of Destiny',
    intro: 'Bazi — "eight characters" — is the traditional Chinese reading of your birth moment as four pillars: year, month, day, and hour. Each pillar carries one of the five elements (wood, fire, earth, metal, water) and a yin or yang polarity. Together they show your Day Master — the axis of your nature — and where the elements of your life run rich or run thin.',
    birthDate: 'Birth date',
    birthTime: 'Birth time (optional)',
    calculate: 'Cast the four pillars',
    calcFailed: 'Could not compute Bazi',
    needBirthDate: 'Birth date is required',
    pillarsLabel: 'Your Four Pillars',
    year: 'Year', month: 'Month', day: 'Day', hour: 'Hour',
    elementBalanceLabel: 'Element Balance',
    guidanceLabel: 'Element Guidance',
    dayMasterLabel: 'Day Master',
    strengthsLabel: 'Strengths',
    challengesLabel: 'Challenges',
    thrivingLabel: 'When you thrive',
    strugglingLabel: 'When you struggle',
    affirmationLabel: 'Your affirmation',
    back: 'Recalculate',
    recalculate: 'Recalculate',
    elements: { wood: 'Wood', fire: 'Fire', earth: 'Earth', metal: 'Metal', water: 'Water' },
  },
  ja: {
    title: '八字（四柱推命）',
    intro: '八字——「8つの字」——は、出生時を年柱・月柱・日柱・時柱の4本の柱として読む伝統中国の読み方です。各柱は五行（木・火・土・金・水）と陰陽を持ちます。日干（日柱の天干）があなたの本質軸となり、五行の多寡はあなたの人生のどこが豊かでどこが薄いかを示します。',
    birthDate: '生年月日',
    birthTime: '出生時刻（任意）',
    calculate: '四柱を立てる',
    calcFailed: '八字を計算できませんでした',
    needBirthDate: '生年月日が必要です',
    pillarsLabel: 'あなたの四柱',
    year: '年柱', month: '月柱', day: '日柱', hour: '時柱',
    elementBalanceLabel: '五行のバランス',
    guidanceLabel: '五行ガイダンス',
    dayMasterLabel: '日主（日干）',
    strengthsLabel: '強み',
    challengesLabel: '課題',
    thrivingLabel: '輝くとき',
    strugglingLabel: '苦しむとき',
    affirmationLabel: 'アファメーション',
    back: '再計算',
    recalculate: '再計算',
    elements: { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' },
  },
  ko: {
    title: '사주팔자(바지)',
    intro: '바지(八字) — "여덟 글자" — 는 당신의 출생 시점을 년·월·일·시 네 기둥으로 읽는 전통 중국의 방식입니다. 각 기둥은 오행(목·화·토·금·수) 중 하나와 음양을 지닙니다. 일간(日干)이 당신 본질의 축이며, 오행의 비율은 당신 삶의 어느 요소가 풍성하고 어느 요소가 부족한지를 보여줍니다.',
    birthDate: '생년월일',
    birthTime: '출생 시간 (선택)',
    calculate: '사주 뽑기',
    calcFailed: '사주를 계산할 수 없었습니다',
    needBirthDate: '생년월일이 필요합니다',
    pillarsLabel: '당신의 네 기둥',
    year: '년주', month: '월주', day: '일주', hour: '시주',
    elementBalanceLabel: '오행 균형',
    guidanceLabel: '오행 안내',
    dayMasterLabel: '일간',
    strengthsLabel: '강점',
    challengesLabel: '과제',
    thrivingLabel: '빛날 때',
    strugglingLabel: '힘들 때',
    affirmationLabel: '아파메이션',
    back: '다시 계산',
    recalculate: '다시 계산',
    elements: { wood: '목', fire: '화', earth: '토', metal: '금', water: '수' },
  },
  zh: {
    title: '八字——四柱命理',
    intro: '八字——"八个字"——是中国传统命理，把你的出生时刻读为四根柱：年柱、月柱、日柱、时柱。每根柱都带有五行（木火土金水）之一与阴阳极性。日干（日柱的天干）是你本性的中轴，五行的多寡显示你生命的哪些元素丰沛、哪些元素稀薄。',
    birthDate: '出生日期',
    birthTime: '出生时间（可选）',
    calculate: '起四柱',
    calcFailed: '无法计算八字',
    needBirthDate: '请填写出生日期',
    pillarsLabel: '你的四柱',
    year: '年柱', month: '月柱', day: '日柱', hour: '时柱',
    elementBalanceLabel: '五行平衡',
    guidanceLabel: '五行指引',
    dayMasterLabel: '日主',
    strengthsLabel: '强项',
    challengesLabel: '挑战',
    thrivingLabel: '发光之时',
    strugglingLabel: '困顿之时',
    affirmationLabel: '你的肯定语',
    back: '重新计算',
    recalculate: '重新计算',
    elements: { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' },
  },
};

// ------------------------------------------------------------------
// Ayurveda
// ------------------------------------------------------------------

const AYURVEDA_CHROME = {
  en: {
    withSecondary: 'with secondary {{sec}}',
    scoresLabel: 'Your dosha balance',
    thrivingLabel: "When you're in balance",
    imbalancedLabel: "When you're out of balance",
    dietLabel: 'Diet that suits you',
    lifestyleLabel: 'Lifestyle that balances you',
    affirmationLabel: 'Your affirmation',
    doshas: {
      vata: { name: 'Vata' },
      pitta: { name: 'Pitta' },
      kapha: { name: 'Kapha' },
    },
  },
  ja: {
    withSecondary: '（副ドーシャ：{{sec}}）',
    scoresLabel: 'あなたのドーシャ バランス',
    thrivingLabel: 'バランスが取れているとき',
    imbalancedLabel: 'バランスを失っているとき',
    dietLabel: 'あなたに合う食事',
    lifestyleLabel: 'あなたを整える暮らし方',
    affirmationLabel: 'アファメーション',
    doshas: {
      vata: { name: 'ヴァータ' },
      pitta: { name: 'ピッタ' },
      kapha: { name: 'カパ' },
    },
  },
  ko: {
    withSecondary: '(부 도샤: {{sec}})',
    scoresLabel: '당신의 도샤 균형',
    thrivingLabel: '균형이 잡혀 있을 때',
    imbalancedLabel: '균형을 잃었을 때',
    dietLabel: '당신에게 맞는 식사',
    lifestyleLabel: '당신을 조율하는 생활 방식',
    affirmationLabel: '아파메이션',
    doshas: {
      vata: { name: '바타' },
      pitta: { name: '피타' },
      kapha: { name: '카파' },
    },
  },
  zh: {
    withSecondary: '（次要道夏：{{sec}}）',
    scoresLabel: '你的道夏平衡',
    thrivingLabel: '当你处在平衡中',
    imbalancedLabel: '当你失衡时',
    dietLabel: '适合你的饮食',
    lifestyleLabel: '让你平衡的生活方式',
    affirmationLabel: '你的肯定语',
    doshas: {
      vata: { name: '瓦塔' },
      pitta: { name: '皮塔' },
      kapha: { name: '卡帕' },
    },
  },
};

// ------------------------------------------------------------------
// Dream Interpreter
// ------------------------------------------------------------------

const DREAM_CHROME = {
  en: {
    title: 'Dream Interpreter',
    intro: "Describe your dream in as much detail as you remember. Don't worry about order or clarity — the mind works in symbols. We'll match archetypal patterns and offer reflective questions to sit with. Dreams don't have single meanings; they have invitations.",
    label: 'Tell me about your dream',
    placeholder: "I was standing by a dark ocean and couldn't find my way home. A bird flew overhead carrying something in its beak...",
    privacy: 'Your dream text is not saved. It is analysed locally on your device.',
    interpret: 'Interpret my dream',
    needLonger: 'Please share a bit more about the dream (at least a few sentences).',
    yourDream: 'What the symbols say',
    noMatch: "No immediately common archetypes surfaced in this dream text — but that doesn't mean it's silent. Often the most personal dreams use symbols unique to your life. Sit with the strongest image from the dream. Ask: what is it the opposite of? What in my life does it rhyme with?",
    symbolsLabel: 'The symbols',
    reflectionLabel: 'Hold this question',
    practiceLabel: 'Dream practice',
    practiceBody: 'Keep a notebook by your bed. Record dreams the moment you wake, before they fade. Over time, recurring symbols reveal the language your unconscious uses with you.',
    archetypeLabel: 'A dream symbol reading',
    back: 'Interpret another dream',
    another: 'Another dream',
    genericTitle: 'Dream Reading',
    genericReflection: 'Dreams bring messages — honour the question they leave with you.',
  },
  ja: {
    title: '夢解きインタープリター',
    intro: '覚えている限り、夢の内容を詳しく書いてください。順番や整合性は気にしなくて大丈夫です——心は象徴で働きます。原型的なパターンを見つけ、そこに座って考えるための問いをお返しします。夢に「唯一の意味」はありません。夢は招待状です。',
    label: 'あなたの夢を教えてください',
    placeholder: '暗い海辺に立っていて、家への道が見つからなかった。鳥が何かをくちばしにくわえて飛んでいった……',
    privacy: '夢の文章は保存されません。あなたの端末内でのみ解析されます。',
    interpret: '夢を読み解く',
    needLonger: 'もう少しだけ詳しく教えてください（数文程度）。',
    yourDream: '象徴たちの声',
    noMatch: 'よくある原型は今回の文章には表れませんでした——でも沈黙しているわけではありません。もっとも個人的な夢は、あなたの人生に固有の象徴を使います。夢の中で最も強い像のそばに座ってください。問うてみましょう：それは何の反対にある？　自分の人生のどこと韻を踏んでいる？',
    symbolsLabel: '象徴',
    reflectionLabel: 'この問いを抱えて',
    practiceLabel: '夢の練習',
    practiceBody: '枕元にノートを置いて。目覚めた瞬間、消える前に夢を書き留めましょう。時間が経つと、繰り返し現れる象徴が、無意識があなたに話しかける言語を明かしてくれます。',
    archetypeLabel: '夢の象徴の読み',
    back: 'もう一度夢を読む',
    another: '別の夢',
    genericTitle: '夢の読み',
    genericReflection: '夢はメッセージを運ぶ——残される問いを大切に。',
  },
  ko: {
    title: '꿈 해석기',
    intro: '기억나는 만큼 꿈을 자세히 적어 주세요. 순서나 일관성은 걱정하지 않아도 됩니다 — 마음은 상징으로 작동합니다. 원형적 패턴을 맞춰 당신이 머무를 수 있는 질문을 돌려드립니다. 꿈에는 하나의 의미가 아니라, 초대가 있습니다.',
    label: '당신의 꿈을 말해 주세요',
    placeholder: '어두운 바다 옆에 서 있었는데 집으로 가는 길을 찾을 수 없었다. 새 한 마리가 무언가를 부리에 물고 위로 날아갔다……',
    privacy: '꿈 텍스트는 저장되지 않습니다. 당신의 기기 내부에서 분석됩니다.',
    interpret: '내 꿈 해석하기',
    needLonger: '꿈에 대해 조금만 더 이야기해 주세요 (몇 문장 정도).',
    yourDream: '상징이 말하는 것',
    noMatch: '이 꿈 텍스트에는 흔한 원형이 즉시 떠오르지 않았지만, 그렇다고 침묵은 아닙니다. 가장 개인적인 꿈은 당신의 삶에만 고유한 상징을 사용합니다. 꿈에서 가장 강한 이미지 옆에 앉아 보세요. 묻습니다: 이것은 무엇의 반대인가? 나의 삶의 어느 부분과 운율을 맞추고 있는가?',
    symbolsLabel: '상징들',
    reflectionLabel: '이 질문을 품고',
    practiceLabel: '꿈 연습',
    practiceBody: '머리맡에 노트를 두세요. 깨자마자, 사라지기 전에 꿈을 기록하세요. 시간이 쌓이면 반복되는 상징이 당신의 무의식이 당신과 나누는 언어를 드러냅니다.',
    archetypeLabel: '꿈 상징 읽기',
    back: '다른 꿈 해석하기',
    another: '다른 꿈',
    genericTitle: '꿈 읽기',
    genericReflection: '꿈은 메시지를 전합니다 — 남기고 가는 질문을 소중히 하세요.',
  },
  zh: {
    title: '梦境解读',
    intro: '尽你所能，把梦的细节写出来。不必在意顺序或清晰度——心灵用象征工作。我们会匹配原型模式，为你准备可以长坐其中的问题。梦没有单一的意义，梦带来邀请。',
    label: '告诉我你的梦',
    placeholder: '我站在一片黑暗的海边，找不到回家的路。一只鸟从头顶飞过，嘴里叼着什么……',
    privacy: '你的梦境文字不会被保存，仅在本机内进行解读。',
    interpret: '解读我的梦',
    needLonger: '请再多说一点梦的内容（至少几句话）。',
    yourDream: '象征在说什么',
    noMatch: '此次文本中没有立即浮现常见的原型——但这并不表示它在沉默。最私人的梦常使用只属于你生活的象征。在梦中最强烈的那个意象旁坐下，问：它是什么的反面？我生活里有什么与它押韵？',
    symbolsLabel: '这些象征',
    reflectionLabel: '带着这个问题',
    practiceLabel: '梦的练习',
    practiceBody: '床边放一本笔记。醒来的瞬间，趁它还没散，就把梦写下。时间久了，反复出现的象征会揭示你的无意识使用的语言。',
    archetypeLabel: '梦的象征解读',
    back: '解读另一个梦',
    another: '另一个梦',
    genericTitle: '梦的解读',
    genericReflection: '梦带来讯息——珍惜它留下的问题。',
  },
};

// ------------------------------------------------------------------
// Readings tab labels
// ------------------------------------------------------------------

const TAB_LABELS = {
  en: { humanDesign: 'Human Design', bazi: 'Bazi', dream: 'Dreams' },
  ja: { humanDesign: 'HD', bazi: '八字', dream: '夢' },
  ko: { humanDesign: '휴먼디자인', bazi: '바지', dream: '꿈' },
  zh: { humanDesign: '人类图', bazi: '八字', dream: '梦境' },
};

// ------------------------------------------------------------------
// Merge
// ------------------------------------------------------------------

for (const locale of LOCALES) {
  const path = resolve(__dirname, `../src/i18n/locales/${locale}/app.json`);
  const data = JSON.parse(readFileSync(path, 'utf8'));

  // Human Design
  data.humanDesign = HD_CHROME[locale];
  if (!data.humanDesign.types) data.humanDesign.types = {};
  for (const [key, name] of Object.entries(HD_TYPE_NAMES[locale])) {
    if (!data.humanDesign.types[key]) data.humanDesign.types[key] = {};
    data.humanDesign.types[key].name = name;
  }

  // Bazi
  data.bazi = BAZI_CHROME[locale];

  // Ayurveda — merge into existing quizzes i18n block so the quiz
  // description + results can call quizzes.* for its chrome while
  // ayurveda.doshas.* handles dosha-specific content
  data.ayurveda = AYURVEDA_CHROME[locale];

  // Dream Interpreter
  data.dream = DREAM_CHROME[locale];

  // Readings tab labels
  if (!data.readings) data.readings = {};
  if (!data.readings.tabs) data.readings.tabs = {};
  data.readings.tabs.humanDesign = TAB_LABELS[locale].humanDesign;
  data.readings.tabs.bazi = TAB_LABELS[locale].bazi;
  data.readings.tabs.dream = TAB_LABELS[locale].dream;

  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`✓ ${locale}: merged HD + Bazi + Ayurveda + Dream chrome`);
}
