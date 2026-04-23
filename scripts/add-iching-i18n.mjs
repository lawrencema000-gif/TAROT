// Seed i18n for the I-Ching feature.
//
// English is the canonical source. JA/KO/ZH start with the ENGLISH STRINGS
// baked into the data file — i.e. if no translation is present, the
// localized page falls back to English seamlessly. This script writes an
// `iching` namespace block into each locale's `app.json` with:
//   - UI chrome labels (title, intro, buttons, section headers)
//   - hexagram chrome labels (name / tagline / judgement / interpretation
//     / journalPrompt / strengths / cautions) for all 64 hexagrams
//
// For the initial ship: only UI chrome + hexagram 1 and 2 get full
// translations. Hexagrams 3-64 fall back to English until a translator
// pass. Users will see I-Ching in their language across the UI, with the
// hexagram content itself still English for now. Acceptable MVP for
// feature-flag beta.
//
// Idempotent.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES = ['en', 'ja', 'ko', 'zh'];

const UI_CHROME = {
  en: {
    title: 'I-Ching Oracle',
    intro: 'The I-Ching — the Book of Changes — is the oldest divination system in the world. Hold a question in mind. Throw the coins six times. The hexagram that appears reflects the moving energies around your question.',
    questionLabel: 'Your question (optional)',
    questionPlaceholder: 'What would be most helpful for me to understand right now?',
    castButton: 'Cast the coins',
    casting: 'Casting...',
    hexagramLabel: 'Hexagram',
    judgement: 'The Judgement',
    interpretation: 'Interpretation',
    strengths: 'Strengths',
    cautions: 'Cautions',
    transformsInto: 'Transforms into',
    transformNote: 'The changing lines show the energy moving toward this second hexagram — read as "where this situation is heading".',
    journalPrompt: 'Journal prompt',
    backToStart: 'Cast again',
    castAgain: 'Cast again',
    yourQuestion: 'Your question',
  },
  ja: {
    title: '易経オラクル',
    intro: '易経——変化の書——は、世界で最も古い占術の体系です。心に問いを抱えて、6回コインを投げてください。現れた卦が、あなたの問いを取り巻く動きを映します。',
    questionLabel: 'あなたの問い（任意）',
    questionPlaceholder: 'いま理解しておくと一番助けになることは何？',
    castButton: 'コインを投げる',
    casting: '占っています……',
    hexagramLabel: '第',
    judgement: '彖辞',
    interpretation: '読み解き',
    strengths: '強み',
    cautions: '注意',
    transformsInto: '変じて次の卦へ',
    transformNote: '動爻はこの状況が次の卦の方向へ動いていることを示します——「これからどう展開するか」として読んでください。',
    journalPrompt: 'ジャーナルの問い',
    backToStart: 'もう一度投げる',
    castAgain: 'もう一度投げる',
    yourQuestion: 'あなたの問い',
  },
  ko: {
    title: '주역 오라클',
    intro: '주역——변화의 서——은 세상에서 가장 오래된 점술 체계입니다. 마음속에 질문을 품고, 동전을 여섯 번 던져 보세요. 나타난 괘가 당신의 질문을 둘러싼 움직임을 비춥니다.',
    questionLabel: '당신의 질문 (선택)',
    questionPlaceholder: '지금 내가 이해하면 가장 도움이 될 것은 무엇일까요?',
    castButton: '동전 던지기',
    casting: '점치는 중...',
    hexagramLabel: '제',
    judgement: '단전',
    interpretation: '해석',
    strengths: '강점',
    cautions: '주의',
    transformsInto: '변해서 다음 괘로',
    transformNote: '동효는 이 상황이 두 번째 괘의 방향으로 움직이고 있음을 보여줍니다 — "이 상황이 어디로 향하고 있는가"로 읽으세요.',
    journalPrompt: '저널 질문',
    backToStart: '다시 던지기',
    castAgain: '다시 던지기',
    yourQuestion: '당신의 질문',
  },
  zh: {
    title: '易经占卜',
    intro: '易经——变化之书——是世界上最古老的占卜体系。心中怀着一个问题，掷六次硬币，浮现的卦象会映照你所问之事周围的流动之势。',
    questionLabel: '你的问题（可选）',
    questionPlaceholder: '此刻对我最有帮助的是理解什么？',
    castButton: '掷硬币',
    casting: '占卜中……',
    hexagramLabel: '第',
    judgement: '彖',
    interpretation: '解读',
    strengths: '长处',
    cautions: '当心',
    transformsInto: '变为下一卦',
    transformNote: '变爻显示此情境正朝着第二卦的方向流动——可读作"此局正往何处去"。',
    journalPrompt: '书写提示',
    backToStart: '再掷一次',
    castAgain: '再掷一次',
    yourQuestion: '你的问题',
  },
};

// Localized hexagram names only (full interpretations fall back to English
// on first ship — dedicated translation pass comes later).
const HEXAGRAM_NAMES = {
  en: null, // data file has these — no override needed
  ja: {
    1: '乾・創造', 2: '坤・受容', 3: '屯・始まりの困難', 4: '蒙・若き愚か者',
    5: '需・待つこと', 6: '訟・争い', 7: '師・軍隊', 8: '比・団結',
    9: '小畜・小さく養う', 10: '履・踏みゆく', 11: '泰・平和', 12: '否・閉塞',
    13: '同人・和合', 14: '大有・大いなる所有', 15: '謙・謙虚', 16: '豫・熱意',
    17: '隨・従う', 18: '蠱・荒廃を正す', 19: '臨・接近', 20: '觀・観照',
    21: '噬嗑・噛み合わせる', 22: '賁・優雅', 23: '剝・剝落', 24: '復・復帰',
    25: '无妄・無心', 26: '大畜・大いに養う', 27: '頤・養い', 28: '大過・大いなる過剰',
    29: '坎・深淵', 30: '離・依り付く', 31: '咸・感応', 32: '恆・恒常',
    33: '遯・退却', 34: '大壯・大いなる力', 35: '晉・進展', 36: '明夷・光の沈み',
    37: '家人・家族', 38: '睽・対立', 39: '蹇・障害', 40: '解・解放',
    41: '損・減少', 42: '益・増大', 43: '夬・決断', 44: '姤・出会い',
    45: '萃・集う', 46: '升・上昇', 47: '困・困窮', 48: '井・井戸',
    49: '革・革新', 50: '鼎・鼎', 51: '震・震動', 52: '艮・止', 53: '漸・漸進',
    54: '歸妹・嫁ぐ娘', 55: '豐・豊かさ', 56: '旅・旅人', 57: '巽・風',
    58: '兌・歓び', 59: '渙・散る', 60: '節・節度', 61: '中孚・内なる誠',
    62: '小過・小さな過ぎ', 63: '既濟・完成の後', 64: '未濟・完成の前',
  },
  ko: {
    1: '건·창조', 2: '곤·수용', 3: '둔·시작의 어려움', 4: '몽·어린 어리석음',
    5: '수·기다림', 6: '송·다툼', 7: '사·군대', 8: '비·단결',
    9: '소축·작은 기름', 10: '이·밟음', 11: '태·평화', 12: '비·정체',
    13: '동인·동지', 14: '대유·크게 가짐', 15: '겸·겸손', 16: '예·열정',
    17: '수·따름', 18: '고·폐단의 정리', 19: '임·접근', 20: '관·관조',
    21: '서합·깨물어 합함', 22: '비·우아함', 23: '박·깎임', 24: '복·회복',
    25: '무망·무심', 26: '대축·크게 기름', 27: '이·기름', 28: '대과·큰 지나침',
    29: '감·심연', 30: '이·붙잡음', 31: '함·감응', 32: '항·항상됨',
    33: '둔·물러남', 34: '대장·큰 힘', 35: '진·나아감', 36: '명이·빛의 가라앉음',
    37: '가인·가족', 38: '규·대립', 39: '건·장애', 40: '해·해방',
    41: '손·감소', 42: '익·증가', 43: '쾌·결단', 44: '구·만남',
    45: '췌·모임', 46: '승·오름', 47: '곤·곤경', 48: '정·우물',
    49: '혁·혁신', 50: '정·솥', 51: '진·진동', 52: '간·고요', 53: '점·점진',
    54: '귀매·시집가는 누이', 55: '풍·풍요', 56: '여·나그네', 57: '손·바람',
    58: '태·기쁨', 59: '환·흩어짐', 60: '절·절도', 61: '중부·내면의 진실',
    62: '소과·작은 지나침', 63: '기제·완성의 후', 64: '미제·완성의 전',
  },
  zh: {
    1: '乾·创造', 2: '坤·承受', 3: '屯·始难', 4: '蒙·稚者',
    5: '需·等待', 6: '讼·争讼', 7: '师·军众', 8: '比·亲比',
    9: '小畜·小畜', 10: '履·履虎', 11: '泰·泰平', 12: '否·闭塞',
    13: '同人·同人', 14: '大有·大有', 15: '谦·谦德', 16: '豫·奋起',
    17: '随·随顺', 18: '蛊·振弊', 19: '临·来临', 20: '观·观照',
    21: '噬嗑·噬合', 22: '贲·装饰', 23: '剥·剥落', 24: '复·复归',
    25: '无妄·不妄', 26: '大畜·大畜', 27: '颐·养颐', 28: '大过·大过',
    29: '坎·重水', 30: '离·附丽', 31: '咸·感应', 32: '恒·恒常',
    33: '遁·退遁', 34: '大壮·大壮', 35: '晋·前进', 36: '明夷·明伤',
    37: '家人·家人', 38: '睽·乖离', 39: '蹇·阻险', 40: '解·解脱',
    41: '损·损下', 42: '益·益上', 43: '夬·决断', 44: '姤·相遇',
    45: '萃·聚集', 46: '升·上升', 47: '困·困境', 48: '井·井泉',
    49: '革·革新', 50: '鼎·鼎器', 51: '震·震动', 52: '艮·静止', 53: '渐·渐进',
    54: '归妹·归妹', 55: '丰·丰盛', 56: '旅·行旅', 57: '巽·顺风',
    58: '兑·悦', 59: '涣·涣散', 60: '节·节制', 61: '中孚·中孚',
    62: '小过·小过', 63: '既济·既济', 64: '未济·未济',
  },
};

for (const locale of LOCALES) {
  const path = resolve(__dirname, `../src/i18n/locales/${locale}/app.json`);
  const data = JSON.parse(readFileSync(path, 'utf8'));

  // UI chrome
  data.iching = UI_CHROME[locale];

  // Hexagram name overrides (only when not English — English falls back to data file)
  if (HEXAGRAM_NAMES[locale]) {
    if (!data.iching.hexagrams) data.iching.hexagrams = {};
    for (const [num, name] of Object.entries(HEXAGRAM_NAMES[locale])) {
      if (!data.iching.hexagrams[num]) data.iching.hexagrams[num] = {};
      data.iching.hexagrams[num].name = name;
    }
  }

  // readings tab label
  if (!data.readings) data.readings = {};
  if (!data.readings.tabs) data.readings.tabs = {};
  data.readings.tabs.iching = {
    en: 'I-Ching', ja: '易経', ko: '주역', zh: '易经',
  }[locale];

  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`✓ ${locale}: merged iching i18n`);
}
