// Sprint 4 — i18n seed for Mood Diary, Partner Compatibility, Daily Wisdom,
// and Feng Shui Bagua. UI chrome in all 4 locales; long-form content
// falls back to EN for V1 (same pattern as earlier sprints).

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES = ['en', 'ja', 'ko', 'zh'];

const MOOD = {
  en: {
    title: 'Daily Mood',
    intro: 'How is today landing in you? Pick the shape of it, notice the intensity, optionally write a sentence. Over time your mood curve becomes a map.',
    intensityLabel: 'Intensity',
    noteLabel: 'One-line note (optional)',
    notePlaceholder: 'What coloured today?',
    promptLabel: 'Journal prompt',
    saveButton: 'Save today',
    updateButton: 'Update today',
    viewHistory: 'View 30-day curve',
    pickOne: 'Pick a mood first',
    saved: 'Mood logged for today',
    historyTitle: '30-day curve',
    entriesCount: '{{n}} of 30 days logged',
    noEntriesYet: 'Log today\'s mood to start your curve.',
    dominantLabel: 'Most common mood',
    avgIntensity: 'Average intensity: {{n}} / 5',
    backToLog: 'Back to log',
    privacyNote: 'Your mood log lives on this device only. It is not uploaded or synced.',
    days: { '30ago': '30d ago', today: 'Today' },
  },
  ja: {
    title: '今日のムード',
    intro: '今日の自分にどんな形で届いた？　かたちを選んで、強さを見て、よかったら一文添えて。時間がたつと、あなたの気分の曲線が地図になっていきます。',
    intensityLabel: '強さ',
    noteLabel: 'ひと言メモ（任意）',
    notePlaceholder: '今日を染めたものは？',
    promptLabel: 'ジャーナルの問い',
    saveButton: '今日を保存',
    updateButton: '今日を更新',
    viewHistory: '30日間の曲線を見る',
    pickOne: 'まず気分を一つ選んでください',
    saved: '今日の気分を記録しました',
    historyTitle: '30日間の曲線',
    entriesCount: '30日のうち {{n}} 日記録済み',
    noEntriesYet: '今日の気分を記録して、あなたの曲線を始めましょう。',
    dominantLabel: 'いちばん多い気分',
    avgIntensity: '平均強さ：{{n}} / 5',
    backToLog: '記録に戻る',
    privacyNote: 'ムードの記録はこの端末にのみ保存されます。アップロードや同期は行いません。',
    days: { '30ago': '30日前', today: '今日' },
  },
  ko: {
    title: '오늘의 무드',
    intro: '오늘 당신에게 어떤 모양으로 닿았나요? 모양을 고르고, 강도를 보고, 원하면 한 줄 적어 두세요. 시간이 쌓이면 당신의 기분 곡선이 하나의 지도가 됩니다.',
    intensityLabel: '강도',
    noteLabel: '한 줄 메모 (선택)',
    notePlaceholder: '오늘을 물들인 건 무엇인가요?',
    promptLabel: '저널 질문',
    saveButton: '오늘 저장',
    updateButton: '오늘 업데이트',
    viewHistory: '30일 곡선 보기',
    pickOne: '먼저 무드를 하나 골라 주세요',
    saved: '오늘의 무드가 기록됐어요',
    historyTitle: '30일 곡선',
    entriesCount: '30일 중 {{n}}일 기록됨',
    noEntriesYet: '오늘의 무드를 기록해 당신의 곡선을 시작해 보세요.',
    dominantLabel: '가장 자주 나타난 무드',
    avgIntensity: '평균 강도: {{n}} / 5',
    backToLog: '기록으로 돌아가기',
    privacyNote: '무드 기록은 이 기기에만 남습니다. 업로드되거나 동기화되지 않습니다.',
    days: { '30ago': '30일 전', today: '오늘' },
  },
  zh: {
    title: '每日心境',
    intro: '今天以怎样的形状来到你身边？选一个形状，留意它的强度，愿意的话写上一句。时间久了，你的心境曲线就成了一幅地图。',
    intensityLabel: '强度',
    noteLabel: '一句话（可选）',
    notePlaceholder: '今天被什么染色？',
    promptLabel: '书写提示',
    saveButton: '保存今天',
    updateButton: '更新今天',
    viewHistory: '看 30 天曲线',
    pickOne: '请先选一个心境',
    saved: '今天的心境已记录',
    historyTitle: '30 天曲线',
    entriesCount: '30 天中已记录 {{n}} 天',
    noEntriesYet: '记录今天的心境，开始你的曲线。',
    dominantLabel: '最常出现的心境',
    avgIntensity: '平均强度：{{n}} / 5',
    backToLog: '回到记录',
    privacyNote: '心境记录只保存在本机内，不上传、不同步。',
    days: { '30ago': '30 天前', today: '今天' },
  },
};

const MOOD_CATEGORIES = {
  en: { calm: 'Calm', charged: 'Charged', drained: 'Drained', steady: 'Steady', anxious: 'Anxious', joyful: 'Joyful', heavy: 'Heavy', curious: 'Curious' },
  ja: { calm: '穏やか', charged: '充電中', drained: '枯れ気味', steady: '地に足', anxious: '不安', joyful: '喜び', heavy: '重い', curious: '好奇心' },
  ko: { calm: '고요', charged: '충만', drained: '소진', steady: '안정', anxious: '불안', joyful: '기쁨', heavy: '무거움', curious: '호기심' },
  zh: { calm: '平静', charged: '充电', drained: '耗尽', steady: '稳定', anxious: '焦虑', joyful: '喜悦', heavy: '沉重', curious: '好奇' },
};

const COMPAT = {
  en: {
    title: 'Partner Compatibility',
    intro: 'Combines MBTI cognitive-function fit with astrology elemental compatibility to show you where you click, where you rub, and where the growth edges live. Enter what you know about each side — at least one from each.',
    yourSide: 'You',
    yourMbti: 'Your MBTI type',
    yourBirth: 'Your birth date',
    partnerSide: 'Partner',
    partnerMbti: "Partner's MBTI",
    partnerBirth: "Partner's birth date",
    selectOrSkip: 'Select or skip',
    runButton: 'Reveal our compatibility',
    needBothSides: 'Need at least one data point from each side (MBTI or birth date).',
    failed: 'Could not compute compatibility',
    back: 'Check another pair',
    another: 'Check another',
    compatibilityLabel: 'Compatibility',
    mbtiLabel: 'MBTI Fit',
    astroLabel: 'Astrology Fit',
    strengthsLabel: 'Strengths',
    growthLabel: 'Growth edges',
    adviceLabel: 'Advice',
  },
  ja: {
    title: 'パートナー相性',
    intro: 'MBTIの認知機能の相性と、占星術のエレメント相性を組み合わせて、どこで合って、どこでぶつかり、どこが成長の縁にあるかを示します。双方について、少なくともひとつずつ（MBTIか誕生日）入力してください。',
    yourSide: 'あなた',
    yourMbti: 'あなたのMBTI',
    yourBirth: 'あなたの誕生日',
    partnerSide: '相手',
    partnerMbti: '相手のMBTI',
    partnerBirth: '相手の誕生日',
    selectOrSkip: '選択または省略',
    runButton: '相性を明かす',
    needBothSides: '双方から少なくとも1つずつ必要です（MBTIまたは誕生日）。',
    failed: '相性を計算できませんでした',
    back: '別のペアを確認',
    another: '別のペア',
    compatibilityLabel: '相性',
    mbtiLabel: 'MBTIフィット',
    astroLabel: '占星術フィット',
    strengthsLabel: '強み',
    growthLabel: '成長の縁',
    adviceLabel: 'アドバイス',
  },
  ko: {
    title: '파트너 궁합',
    intro: 'MBTI 인지 기능 궁합과 점성술 원소 궁합을 결합해, 어디서 맞고, 어디서 부딪히며, 어디에 성장의 모서리가 있는지 보여줍니다. 양쪽 모두에 대해 MBTI든 생년월일이든, 최소 하나씩은 입력해 주세요.',
    yourSide: '당신',
    yourMbti: '당신의 MBTI',
    yourBirth: '당신의 생년월일',
    partnerSide: '상대',
    partnerMbti: '상대의 MBTI',
    partnerBirth: '상대의 생년월일',
    selectOrSkip: '선택 또는 건너뛰기',
    runButton: '궁합 확인하기',
    needBothSides: '양쪽에서 최소한 하나의 정보가 필요합니다 (MBTI 또는 생년월일).',
    failed: '궁합을 계산할 수 없었습니다',
    back: '다른 짝 보기',
    another: '다른 짝',
    compatibilityLabel: '궁합',
    mbtiLabel: 'MBTI 핏',
    astroLabel: '점성술 핏',
    strengthsLabel: '강점',
    growthLabel: '성장의 모서리',
    adviceLabel: '조언',
  },
  zh: {
    title: '伴侣契合',
    intro: '把 MBTI 认知功能契合与占星元素契合结合起来，看看你们在哪里合拍、在哪里摩擦、以及成长的边缘在哪里。请为双方各填至少一项（MBTI 或出生日期）。',
    yourSide: '你',
    yourMbti: '你的 MBTI',
    yourBirth: '你的出生日期',
    partnerSide: '伴侣',
    partnerMbti: '伴侣的 MBTI',
    partnerBirth: '伴侣的出生日期',
    selectOrSkip: '选择或跳过',
    runButton: '揭晓我们的契合度',
    needBothSides: '双方至少各需要一个数据点（MBTI 或出生日期）。',
    failed: '无法计算契合度',
    back: '查看另一对',
    another: '另一对',
    compatibilityLabel: '契合度',
    mbtiLabel: 'MBTI 契合',
    astroLabel: '占星契合',
    strengthsLabel: '优势',
    growthLabel: '成长边缘',
    adviceLabel: '建议',
  },
};

const WISDOM_CHROME = {
  en: { title: 'Daily Wisdom' },
  ja: { title: '今日の智慧' },
  ko: { title: '오늘의 지혜' },
  zh: { title: '今日智慧' },
};

const FENGSHUI = {
  en: {
    title: 'Feng Shui Bagua',
    intro: 'The Bagua map divides life into nine areas. Rate how each area of YOUR life feels right now on a 1-5 scale. We\'ll surface the area most wanting attention and the Feng Shui adjustments that nourish it.',
    scale: '1 = severely depleted · 3 = okay · 5 = thriving',
    reveal: 'Reveal my Bagua',
    backToRate: 'Re-rate',
    reRate: 'Re-rate',
    mapLabel: 'Your Bagua map',
    overallScore: 'Overall: {{n}} / 5',
    focusLabel: 'Area needing attention',
    strongestLabel: 'Your strongest area',
    adjustmentsLabel: 'Try these adjustments',
    elementLabel: 'Element',
    colorLabel: 'Colour',
    placement: 'Place these adjustments in the {{dir}} of your room (oriented from the entry door).',
    shareSubtitle: 'Needs attention',
  },
  ja: {
    title: '風水の八卦',
    intro: '八卦の図は人生を9つの領域に分けます。あなたの人生の各領域が今どう感じるかを1〜5で評価してください。もっとも手当てを求めている領域と、それを養う風水の調整を示します。',
    scale: '1 = 深く枯れている · 3 = まあまあ · 5 = よく咲いている',
    reveal: '私の八卦を見る',
    backToRate: 'もう一度評価する',
    reRate: 'もう一度評価する',
    mapLabel: 'あなたの八卦マップ',
    overallScore: '全体：{{n}} / 5',
    focusLabel: '手当てを求める領域',
    strongestLabel: 'いちばん強い領域',
    adjustmentsLabel: 'この調整を試して',
    elementLabel: 'エレメント',
    colorLabel: '色',
    placement: '部屋の{{dir}}（入口から見て）にこれらの調整を置いてください。',
    shareSubtitle: '手当てが必要',
  },
  ko: {
    title: '풍수 팔괘',
    intro: '팔괘 맵은 삶을 아홉 영역으로 나눕니다. 당신의 삶의 각 영역이 지금 어떻게 느껴지는지 1-5로 평가해 주세요. 가장 손길이 필요한 영역과 그것을 살리는 풍수 조정을 알려 드립니다.',
    scale: '1 = 심하게 고갈 · 3 = 괜찮음 · 5 = 번성',
    reveal: '나의 팔괘 보기',
    backToRate: '다시 평가하기',
    reRate: '다시 평가',
    mapLabel: '당신의 팔괘 지도',
    overallScore: '전체: {{n}} / 5',
    focusLabel: '손길이 필요한 영역',
    strongestLabel: '가장 강한 영역',
    adjustmentsLabel: '이런 조정을 시도해 보세요',
    elementLabel: '원소',
    colorLabel: '색',
    placement: '방의 {{dir}}(입구 기준)에 이 조정들을 놓아 보세요.',
    shareSubtitle: '손길이 필요',
  },
  zh: {
    title: '风水八卦',
    intro: '八卦图把人生分为九个领域。请按 1-5 为你生活中每个领域"此刻的感觉"打分。我们会指出最需要照料的领域，以及滋养它的风水调整。',
    scale: '1 = 严重枯竭 · 3 = 一般 · 5 = 繁茂',
    reveal: '揭示我的八卦',
    backToRate: '重新评分',
    reRate: '重新评分',
    mapLabel: '你的八卦地图',
    overallScore: '整体：{{n}} / 5',
    focusLabel: '需要关照的领域',
    strongestLabel: '最强的领域',
    adjustmentsLabel: '试试这些调整',
    elementLabel: '元素',
    colorLabel: '颜色',
    placement: '把这些调整放在房间的{{dir}}（从入口朝向看）。',
    shareSubtitle: '需要照料',
  },
};

const FENGSHUI_AREA_NAMES = {
  en: { wealth: 'Wealth / Abundance', fame: 'Fame / Reputation', relationships: 'Relationships / Love', family: 'Family / Ancestry', health: 'Health / Centre', creativity: 'Creativity / Children', knowledge: 'Knowledge / Wisdom', career: 'Career / Path', helpers: 'Helpful People / Travel' },
  ja: { wealth: '富・豊かさ', fame: '名声・評判', relationships: '関係・愛', family: '家族・先祖', health: '健康・中央', creativity: '創造・子ども', knowledge: '知恵・学び', career: 'キャリア・道', helpers: '助け手・旅' },
  ko: { wealth: '재물·풍요', fame: '명성·평판', relationships: '관계·사랑', family: '가족·조상', health: '건강·중심', creativity: '창조·자녀', knowledge: '지혜·배움', career: '커리어·길', helpers: '도움·여행' },
  zh: { wealth: '财富·丰盛', fame: '名声·声誉', relationships: '关系·爱情', family: '家庭·祖脉', health: '健康·中央', creativity: '创造·子女', knowledge: '智慧·学习', career: '事业·道路', helpers: '贵人·远行' },
};

const READING_TAB_LABELS = {
  en: { mood: 'Mood', partner: 'Partner', fengshui: 'Feng Shui' },
  ja: { mood: 'ムード', partner: '相性', fengshui: '風水' },
  ko: { mood: '무드', partner: '궁합', fengshui: '풍수' },
  zh: { mood: '心境', partner: '契合', fengshui: '风水' },
};

// Merge
for (const locale of LOCALES) {
  const path = resolve(__dirname, `../src/i18n/locales/${locale}/app.json`);
  const data = JSON.parse(readFileSync(path, 'utf8'));

  data.mood = { ...MOOD[locale] };
  data.mood.categories = data.mood.categories ?? {};
  for (const [k, name] of Object.entries(MOOD_CATEGORIES[locale])) {
    if (!data.mood.categories[k]) data.mood.categories[k] = {};
    data.mood.categories[k].name = name;
  }

  data.compat = COMPAT[locale];
  data.wisdom = WISDOM_CHROME[locale];
  data.fengshui = FENGSHUI[locale];
  data.fengshui.areas = data.fengshui.areas ?? {};
  for (const [area, name] of Object.entries(FENGSHUI_AREA_NAMES[locale])) {
    if (!data.fengshui.areas[area]) data.fengshui.areas[area] = {};
    data.fengshui.areas[area].name = name;
  }

  if (!data.readings) data.readings = {};
  if (!data.readings.tabs) data.readings.tabs = {};
  Object.assign(data.readings.tabs, READING_TAB_LABELS[locale]);

  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`✓ ${locale}: merged Mood + Compat + Wisdom + FengShui`);
}
