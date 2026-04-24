// Sprint-3 extra quizzes — minimal i18n seed.
//
// Writes localized title + short description for all 10 quizzes across
// EN/JA/KO/ZH. Question text + option labels + full result descriptions
// fall back to the English source in the data file for V1. A dedicated
// translator pass later replaces the English fallbacks.
//
// This keeps the quiz-list in the user's language (which is the most
// user-visible surface) without blocking the feature on a huge content
// job.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES = ['en', 'ja', 'ko', 'zh'];

const QUIZ_CHROME = {
  'dark-triad': {
    en: { title: 'Dark Triad Shadow', description: "Three shadow traits psychologists call the 'dark triad' — narcissism, Machiavellianism, and psychopathy — exist to some degree in all of us. Surface where your shadow runs strongest." },
    ja: { title: 'ダーク・トライアド（影の三徴）', description: '心理学で「ダーク・トライアド」と呼ばれる3つの影の特性——ナルシシズム、マキャベリズム、サイコパシー——はどの人にも程度の差で存在します。あなたの影がもっとも強く動くところを見ます。' },
    ko: { title: '다크 트라이어드 — 그림자 삼각', description: '심리학에서 "다크 트라이어드"라 부르는 세 가지 그림자 특성 — 자기애, 마키아벨리즘, 사이코패시 — 는 누구에게나 어느 정도 있습니다. 당신의 그림자가 어디서 가장 강한지 비춰 보세요.' },
    zh: { title: '暗黑三角（阴影三性）', description: '心理学称作"暗黑三角"的三种阴影特质——自恋、马基雅维利主义、精神病态——存在于每个人身上，只是程度不同。看看你的阴影最强烈地跑在何处。' },
  },
  'disc': {
    en: { title: 'DISC Behavioural Profile', description: 'A four-quadrant model of workplace behaviour: Dominance, Influence, Steadiness, Conscientiousness. See which style leads for you and how you naturally contribute to a team.' },
    ja: { title: 'DISC 行動プロファイル', description: '職場行動の4象限モデル——主導（D）、影響（I）、安定（S）、誠実（C）。どのスタイルが前に出るか、チームでどう自然に役割を果たすかを見ます。' },
    ko: { title: 'DISC 행동 프로파일', description: '직장 행동의 4사분면 모델 — 주도(D), 영향(I), 안정(S), 신중(C). 당신의 주된 스타일과 팀 안에서의 자연스러운 기여 방식을 봅니다.' },
    zh: { title: 'DISC 行为风格', description: '职场行为的四象限模型——支配(D)、影响(I)、稳健(S)、严谨(C)。看看哪种风格在你身上为主，你在团队里自然贡献的方式是什么。' },
  },
  'money-personality': {
    en: { title: 'Money Personality', description: 'Five distinct patterns of relating to money — the Saver, the Spender, the Avoider, the Monk, the Status-Seeker. See which script your money self is running.' },
    ja: { title: 'マネー・パーソナリティ', description: 'お金との関わり方の5つのパターン——セイバー（貯める）、スペンダー（使う）、アボイダー（避ける）、モンク（修道士型）、ステータス追求型。あなたの「お金の自分」がどの台本を動かしているかを見ます。' },
    ko: { title: '머니 퍼스낼러티', description: '돈과 맺는 다섯 가지 관계 — 세이버(저축형), 스펜더(소비형), 어보이더(회피형), 몽크(수도자형), 스테이터스 추구형. 당신의 "돈 자아"가 어떤 각본을 돌리는지 봅니다.' },
    zh: { title: '金钱人格', description: '与金钱相关的五种不同模式——储蓄者、消费者、逃避者、修道者、地位追求者。看看你的"金钱自我"运行的是哪本脚本。' },
  },
  'boundaries': {
    en: { title: 'Boundaries Check-In', description: 'Where are your boundaries strong, where are they weak, and where do they shift depending on who\'s asking? Four patterns: rigid walls, porous openness, healthy flex, situation-dependent.' },
    ja: { title: '境界線チェックイン', description: 'あなたの境界線はどこが強く、どこが弱く、どこで相手によって変わる？　4つのパターン——硬い壁、透過的な開放、健康な柔軟性、状況依存——で見ます。' },
    ko: { title: '경계선 체크인', description: '당신의 경계선은 어디가 단단하고, 어디가 약하고, 어디서 상대에 따라 변합니까? 네 가지 패턴 — 단단한 벽, 투과적 개방, 건강한 유연함, 상황 의존 — 으로 봅니다.' },
    zh: { title: '界限体检', description: '你的界限在哪里坚固、哪里薄弱、在哪里依对方而变？四种模式——坚墙、渗透式开放、健康弹性、随情境切换——逐一看清。' },
  },
  'burnout': {
    en: { title: 'Burnout Check', description: "Burnout has three measurable dimensions: exhaustion (drained energy), cynicism (distance from the work), and efficacy-loss (I'm not effective anymore). See where you are today." },
    ja: { title: '燃え尽きチェック', description: '燃え尽きには測定可能な3つの次元があります——消耗（エネルギー切れ）、シニシズム（仕事からの距離）、効力感の喪失（自分はもう効果的ではない）。今日どこにいるかを見ます。' },
    ko: { title: '번아웃 체크', description: '번아웃은 측정 가능한 세 가지 차원이 있습니다 — 소진(에너지 고갈), 냉소(업무와의 거리), 효능감 상실(나는 더 이상 효과적이지 않다). 오늘 어디에 있는지 봅니다.' },
    zh: { title: '倦怠自查', description: '倦怠有三个可测量的维度——耗竭（能量见底）、冷漠（与工作拉开距离）、效能感下降（我不再有效了）。看看你今天身处何处。' },
  },
  'communication': {
    en: { title: 'Communication Style', description: 'Four styles emerge under difficulty: passive (hide), aggressive (attack), passive-aggressive (sideways), assertive (clear + respectful). See your default and which is available when you\'re regulated.' },
    ja: { title: 'コミュニケーション・スタイル', description: '困難な状況で現れる4つのスタイル——受動的（隠す）、攻撃的（攻める）、受動攻撃的（横からの抵抗）、アサーティブ（明確かつ敬意を持って）。デフォルトと、整っているときに使えるものを見ます。' },
    ko: { title: '커뮤니케이션 스타일', description: '어려움 속에서 네 가지 스타일이 드러납니다 — 수동적(숨기), 공격적(치기), 수동공격적(옆에서), 어서티브(명확 + 존중). 당신의 기본값과, 조절되어 있을 때 쓸 수 있는 것을 봅니다.' },
    zh: { title: '沟通风格', description: '困境中出现四种风格——被动（退避）、攻击（进攻）、被动攻击（侧面绊）、自信而尊重。看看你的默认风格，以及当你状态好时还能调用哪些。' },
  },
  'conflict': {
    en: { title: 'Conflict Style', description: 'The Thomas-Kilmann model identifies five modes for handling conflict: competing, collaborating, compromising, avoiding, accommodating. See your preferred response — and which modes you need to practice.' },
    ja: { title: 'コンフリクト・スタイル', description: 'トーマス・キルマン・モデルでは、対立への対処に5つのモードを示します——競合・協働・妥協・回避・順応。あなたの好むモードと、練習が必要なモードを見ます。' },
    ko: { title: '갈등 스타일', description: '토마스-킬만 모델은 갈등 대처의 다섯 모드를 제시합니다 — 경쟁, 협력, 타협, 회피, 수용. 당신이 즐겨 쓰는 모드와, 연습이 필요한 모드를 봅니다.' },
    zh: { title: '冲突风格', description: '托马斯-基尔曼模型把应对冲突的方式分为五种——竞争、协作、妥协、回避、顺应。看看你偏好哪种，以及哪些是你需要练习的。' },
  },
  'chronotype': {
    en: { title: 'Sleep Chronotype', description: 'Four sleep-wake personalities by Dr. Michael Breus: the Lion (morning), the Bear (daytime), the Wolf (evening), the Dolphin (restless). Find your rhythm — and when your real peak hours are.' },
    ja: { title: 'スリープ・クロノタイプ', description: 'マイケル・ブロイス博士による4つの睡眠-覚醒パーソナリティ——ライオン（朝型）、ベア（昼型）、ウルフ（夜型）、ドルフィン（不眠型）。あなたのリズムと本当のピーク時間を見つけます。' },
    ko: { title: '수면 크로노타입', description: '마이클 브로이스 박사가 제시한 네 가지 수면-각성 성격 — 라이언(아침형), 베어(낮형), 울프(저녁형), 돌핀(불안정형). 당신의 리듬과 진짜 최고조 시간을 찾습니다.' },
    zh: { title: '睡眠时型（Chronotype）', description: '迈克尔·布鲁斯博士提出的四种睡眠-清醒人格——狮子（晨型）、熊（日型）、狼（夜型）、海豚（浅眠型）。找到你的节律与真正的高峰时段。' },
  },
  'creative-type': {
    en: { title: 'Creative Type', description: 'Five ways of being creative — five roles in the creative process. The Maker, the Dreamer, the Performer, the Organiser, the Analyser. See which you take on naturally — and who you partner best with.' },
    ja: { title: 'クリエイティブ・タイプ', description: '創造の5つのあり方——メイカー（作る人）、ドリーマー（夢見る人）、パフォーマー（演じる人）、オーガナイザー（まとめる人）、アナライザー（読み解く人）。自然にどれを担うか、誰とパートナーを組むと良いかを見ます。' },
    ko: { title: '크리에이티브 타입', description: '창조의 다섯 가지 방식 — 메이커(만드는 사람), 드리머(꿈꾸는 사람), 퍼포머(연기하는 사람), 오거나이저(조직하는 사람), 애널라이저(해석하는 사람). 어떤 역할을 자연스레 맡는지, 누구와 궁합이 좋은지 봅니다.' },
    zh: { title: '创造型人格', description: '五种创造方式——创造者（动手的人）、梦想者（构想的人）、表演者（现场的人）、组织者（让事情落地的人）、分析者（看模式的人）。看看你自然担当哪一种，与谁搭档最默契。' },
  },
  'spiritual-type': {
    en: { title: 'Spiritual Type', description: 'Five ways of relating to the sacred, across all traditions: the Mystic (direct experience), the Ritualist (ceremony), the Seeker (study), the Servant (devotion through action), the Warrior (discipline as path).' },
    ja: { title: 'スピリチュアル・タイプ', description: 'あらゆる伝統を横断する、聖なるものとの関わり方の5つ——ミスティック（直接体験）、リチュアリスト（儀式と形式）、シーカー（学びと問い）、サーバント（行為による献身）、ウォリアー（修行としての道）。あなたの家を見つけます。' },
    ko: { title: '스피리추얼 타입', description: '모든 전통을 관통하는 신성과의 다섯 관계 — 미스틱(직접 경험), 리추얼리스트(의례와 형식), 시커(공부와 질문), 서번트(행위를 통한 헌신), 워리어(수련으로서의 길). 당신의 고향을 찾습니다.' },
    zh: { title: '灵性取向', description: '跨越所有传统的五种与神圣相关的方式——神秘者（直接体验）、仪式者（仪轨与形式）、求道者（学习与追问）、服事者（以行动奉献）、战士（以纪律为道）。找到你归属的那一种。' },
  },
};

for (const locale of LOCALES) {
  const path = resolve(__dirname, `../src/i18n/locales/${locale}/app.json`);
  const data = JSON.parse(readFileSync(path, 'utf8'));

  if (!data.extraQuizzes) data.extraQuizzes = {};

  for (const [quizKey, perLocale] of Object.entries(QUIZ_CHROME)) {
    if (!data.extraQuizzes[quizKey]) data.extraQuizzes[quizKey] = {};
    data.extraQuizzes[quizKey].title = perLocale[locale].title;
    data.extraQuizzes[quizKey].description = perLocale[locale].description;
  }

  // Common strings for the generic result page
  if (!data.extraQuizzes.common) data.extraQuizzes.common = {};
  data.extraQuizzes.common.scoreDistribution = {
    en: 'Score distribution',
    ja: 'スコア分布',
    ko: '점수 분포',
    zh: '得分分布',
  }[locale];

  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`✓ ${locale}: seeded 10 extra-quiz titles + descriptions`);
}
