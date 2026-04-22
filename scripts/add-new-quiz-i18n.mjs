// One-shot script: merge translations for the two new quizzes (Quick MBTI
// and Tarot Court Card Match) plus the mid-quiz sneak-peek labels, share
// button copy, and the 16 court-card descriptions, into every locale's
// app.json file.
//
// Idempotent: re-running overwrites in place, so later copy tweaks just
// replay cleanly.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES = ['en', 'ja', 'ko', 'zh'];

// ------------------------------------------------------------------
// Translation payloads — one object per locale.
// ------------------------------------------------------------------

const PAYLOADS = {
  en: {
    mbtiQuick: {
      title: 'Quick Personality Type',
      description: 'A fast 12-question read on how you recharge, perceive, decide, and structure your life. Great as an intro — upgrade to the full 70-question deep dive any time for a more precise result.',
      timeEstimate: '3 min',
      whatYouGet: [
        'Your 4-letter type, fast',
        'Where your strengths live',
        'Upgrade path to the full 70-question deep read',
        'Tarot archetype alignment',
      ],
      questions: {
        qei1: { text: 'I recharge best around energetic groups of people.' },
        qei2: { text: 'After a long social event, I need solo time to recover.' },
        qei3: { text: 'I process ideas best by talking them out with others.' },
        qsn1: { text: 'I trust concrete facts and details more than hunches.' },
        qsn2: { text: 'I love imagining future possibilities and abstract ideas.' },
        qsn3: { text: 'Proven, practical methods appeal to me more than novel theories.' },
        qtf1: { text: 'Logic and fairness matter more to me than sparing feelings when I decide.' },
        qtf2: { text: 'My first thought when deciding is how it affects the people involved.' },
        qtf3: { text: 'Getting to the objective truth matters more than keeping the peace.' },
        qjp1: { text: 'I feel calmer when plans and schedules are set in advance.' },
        qjp2: { text: 'I prefer to keep options open and see what unfolds.' },
        qjp3: { text: 'Deadlines and structure bring out my best work.' },
      },
    },
    courtMatch: {
      title: 'Tarot Court Card Match',
      description: 'Twelve cards. One verdict. Which of the sixteen court cards of the tarot best mirrors your current energy? This reading pairs elemental style (Wands / Cups / Swords / Pentacles) with rank (Page / Knight / Queen / King) so you get a living archetype — not just a trait.',
      timeEstimate: '4 min',
      whatYouGet: [
        'Which of 16 tarot court cards mirrors you',
        'Your elemental style (fire/water/air/earth)',
        'Your current maturity rank (page/knight/queen/king)',
        'Strengths, shadow, and an affirmation to carry',
      ],
      questions: {
        ce1: { text: 'When faced with a problem, I first…', options: { 1: 'Burn through it with passion and force.', 2: 'Feel it in my body and follow my gut.', 3: 'Break it down and analyze every angle.', 4: 'Build a practical, step-by-step plan.' } },
        ce2: { text: 'My ideal day looks like…', options: { 1: 'Adventure — something bold and new.', 2: 'Cozy time with the people I love.', 3: 'Deep conversation about meaningful ideas.', 4: 'Building or making something tangible.' } },
        ce3: { text: 'Friends describe me as…', options: { 1: 'Energetic and bold.', 2: 'Warm and empathetic.', 3: 'Sharp and analytical.', 4: 'Reliable and grounded.' } },
        ce4: { text: 'I lose track of time when I\'m…', options: { 1: 'Creating, performing, or leading.', 2: 'Connecting deeply with someone.', 3: 'Writing, debating, or puzzling something out.', 4: 'Crafting, gardening, or working with my hands.' } },
        ce5: { text: 'Under stress I tend to…', options: { 1: 'Act out impulsively or explode.', 2: 'Withdraw into my feelings.', 3: 'Overthink and detach.', 4: 'Double down on rigid routines.' } },
        ce6: { text: 'What draws me most is…', options: { 1: 'Flames — inspiration, movement, spark.', 2: 'Water — emotion, depth, flow.', 3: 'Air — thought, language, clarity.', 4: 'Earth — craft, body, solidity.' } },
        cr1: { text: 'My relationship with authority is…', options: { 1: 'I question it — I\'m still learning the ropes.', 2: 'I challenge it through action.', 3: 'I guide others around me.', 4: 'I\'ve become it — I set the standard.' } },
        cr2: { text: 'In groups I tend to…', options: { 1: 'Ask a lot of questions and soak it all in.', 2: 'Push everyone toward action.', 3: 'Hold space and listen deeply.', 4: 'Make the final call.' } },
        cr3: { text: 'My relationship with change is…', options: { 1: 'Exciting — I\'m curious and wide-eyed.', 2: 'I chase it — I want to make it happen.', 3: 'I adapt and nurture others through it.', 4: 'I steady the ship so nothing breaks.' } },
        cr4: { text: 'Experience has taught me…', options: { 1: 'I still have so much to learn.', 2: 'To trust my instincts and move.', 3: 'Empathy is strength.', 4: 'Structure and accountability matter.' } },
        cr5: { text: 'When I master something I…', options: { 1: 'Share the excitement of discovering it.', 2: 'Teach through doing — lead by example.', 3: 'Mentor gently, one person at a time.', 4: 'Set the bar others aspire to.' } },
        cr6: { text: 'My emotional style is…', options: { 1: 'Open and fresh — I feel things vividly.', 2: 'Intense and driven.', 3: 'Deep and containing — I hold others\' feelings too.', 4: 'Measured and sovereign.' } },
      },
    },
    courtCards: courtCardsEN(),
    sneakPeek: {
      label: 'Early reading:',
      mbti: "You're leaning {{letters}} so far — keep going to confirm.",
      courtMatchElement: { wands: 'A Wands card is taking shape — fire energy leads.', cups: 'A Cups card is emerging — water leads.', swords: 'A Swords card is forming — air leads.', pentacles: 'A Pentacles card is building — earth leads.' },
      loveLanguage: 'Your primary love language is starting to emerge...',
      enneagram: 'A type pattern is forming — keep going for your wing.',
      attachment: 'Your attachment style is coming into focus...',
      bigFive: 'Your trait profile is taking shape...',
    },
    share: { button: 'Share', downloaded: 'Saved to your device', failed: 'Could not create share image' },
    backToQuizzes: 'Back to Quizzes',
    resultSections: { whenDrawn: 'When this card appears', strengths: 'Strengths', shadow: 'Shadow side', affirmation: 'Your affirmation' },
  },
  ja: {
    mbtiQuick: {
      title: 'クイック性格タイプ診断',
      description: 'エネルギーの取り戻し方、認識の仕方、決断の仕方、そして日常の整え方について、12問で一気読みします。入門として最適で、より精密な結果が欲しいときはいつでも70問版の深い診断に進めます。',
      timeEstimate: '3分',
      whatYouGet: ['4文字の性格タイプが一瞬で', '強みが発揮される領域', '70問版への進路', 'タロットの元型との対応'],
      questions: {
        qei1: { text: '賑やかな集まりの中にいると、自分が一番充電されると感じる。' },
        qei2: { text: '長い社交の後は、ひとりで過ごす時間がないと回復しない。' },
        qei3: { text: '考えは人に話しながら整理するのがいちばん得意だ。' },
        qsn1: { text: '直感よりも、具体的な事実や細部を信頼する。' },
        qsn2: { text: '未来の可能性や抽象的なアイデアを思い描くのが好きだ。' },
        qsn3: { text: '目新しい理論よりも、実証済みで現実的な方法に惹かれる。' },
        qtf1: { text: '決断するとき、気持ちよりも論理と公正さを優先する。' },
        qtf2: { text: '決断する最初の視点は、関わる人への影響である。' },
        qtf3: { text: '和を保つよりも、客観的な真実にたどり着くことの方が大切だ。' },
        qjp1: { text: '予定や段取りが前もって決まっていると安心する。' },
        qjp2: { text: '選択肢は開いたままにして、流れを見るのが好きだ。' },
        qjp3: { text: '締切や構造があるほど、自分の力を最大限に発揮できる。' },
      },
    },
    courtMatch: {
      title: 'タロットコートカード診断',
      description: '12問でひとつの答えを。タロットの16枚のコートカードのうち、今のあなたの空気をもっとも映す一枚はどれか——元素の気質（ワンド／カップ／ソード／ペンタクル）と段階（ペイジ／ナイト／クイーン／キング）を組み合わせ、単なる特性ではなく「生きた元型」として返します。',
      timeEstimate: '4分',
      whatYouGet: ['16枚のコートカードのうち、あなたを映す一枚', '元素の気質（火／水／風／地）', '現在の成熟度（ペイジ／ナイト／クイーン／キング）', '強み・影・持ち帰るアファメーション'],
      questions: {
        ce1: { text: '問題にぶつかったとき、まずは——', options: { 1: '情熱と勢いで突き抜ける。', 2: '体で感じて、直感に従う。', 3: 'あらゆる角度から分析する。', 4: '現実的な手順を順番に組み立てる。' } },
        ce2: { text: '理想の一日は——', options: { 1: '新しくて大胆な冒険。', 2: '大切な人と過ごす穏やかな時間。', 3: '意味のあるテーマを深く話し合うこと。', 4: '手で何かを作ったり組み立てたりすること。' } },
        ce3: { text: '友人は私を——と言う。', options: { 1: 'エネルギッシュで大胆', 2: '温かく共感力が高い', 3: '鋭く分析的', 4: '頼れて地に足がついている' } },
        ce4: { text: '時間を忘れるのは——', options: { 1: '創作・表現・先頭に立つとき。', 2: '誰かと深くつながっているとき。', 3: '書いたり議論したり考え抜いているとき。', 4: '手仕事・庭仕事・体を使う作業のとき。' } },
        ce5: { text: 'ストレスが高まると、つい——', options: { 1: '衝動的に動いたり爆発したりする。', 2: '感情の中に引きこもる。', 3: '考えすぎて頭だけに逃げる。', 4: '決まりやルーティンにしがみつく。' } },
        ce6: { text: 'もっとも惹かれるのは——', options: { 1: '炎——ひらめき、勢い、火花。', 2: '水——感情、深み、流れ。', 3: '風——思考、言葉、澄み。', 4: '地——技、身体、安定。' } },
        cr1: { text: '権威との関係は——', options: { 1: '疑問を持つ——まだ学んでいる途中。', 2: '行動で挑戦していく。', 3: '周りを導く側にいる。', 4: '自分が基準をつくる立場にある。' } },
        cr2: { text: 'グループの中では——', options: { 1: 'たくさん質問して吸収する。', 2: 'みんなを行動へ押し出す。', 3: '場を保ち、深く耳を傾ける。', 4: '最終判断を下す。' } },
        cr3: { text: '変化との関係は——', options: { 1: 'わくわくして、好奇心いっぱい。', 2: '自分から追いかけにいく。', 3: '適応しながら周りを支える。', 4: '何も壊さないよう船を安定させる。' } },
        cr4: { text: '経験が教えてくれたのは——', options: { 1: 'まだまだ学ぶことが山ほどある、ということ。', 2: '自分の直感を信じて動くこと。', 3: '共感は強さである、ということ。', 4: '構造と責任が大切だ、ということ。' } },
        cr5: { text: '何かを身につけたとき、私は——', options: { 1: '発見のわくわくを分かち合う。', 2: 'やって見せて導く。', 3: 'ひとりずつ、そっと伴走する。', 4: '周りが目指す基準を打ち立てる。' } },
        cr6: { text: '感情のあり方は——', options: { 1: '開かれていて、生き生きと感じる。', 2: '濃く、駆動力がある。', 3: '深く、他者の感情まで抱えられる。', 4: '落ち着いていて、独立している。' } },
      },
    },
    courtCards: courtCardsJA(),
    sneakPeek: {
      label: '途中経過：',
      mbti: '今のところ {{letters}} 寄りです——続けて確定させましょう。',
      courtMatchElement: { wands: 'ワンドのカードが浮かんできています——火のエネルギーが前面に。', cups: 'カップのカードが立ち上がってきています——水が主軸に。', swords: 'ソードのカードが形になってきています——風が主軸に。', pentacles: 'ペンタクルのカードが積み上がってきています——地が主軸に。' },
      loveLanguage: 'あなたの一次ラブランゲージが見え始めています……',
      enneagram: 'タイプの輪郭が出てきました——ウィングのために続けましょう。',
      attachment: 'あなたの愛着スタイルが焦点を結び始めています……',
      bigFive: '特性プロファイルが形になってきています……',
    },
    share: { button: 'シェア', downloaded: '端末に保存しました', failed: 'シェア画像を作成できませんでした' },
    backToQuizzes: '診断一覧に戻る',
    resultSections: { whenDrawn: 'このカードが現れるとき', strengths: '強み', shadow: '影', affirmation: 'あなたへのアファメーション' },
  },
  ko: {
    mbtiQuick: {
      title: '빠른 성격 유형 진단',
      description: '에너지를 되찾는 방식, 인식하는 방식, 결정하는 방식, 그리고 일상을 짜는 방식을 12문항으로 훑습니다. 입문용으로 딱 좋으며, 더 정밀한 결과가 필요할 때는 언제든 70문항 심화판으로 넘어갈 수 있습니다.',
      timeEstimate: '3분',
      whatYouGet: ['4글자 성격 유형을 빠르게', '강점이 발현되는 영역', '70문항 심화판으로 이어지는 경로', '타로 원형과의 연결'],
      questions: {
        qei1: { text: '활기찬 사람들 속에 있을 때 가장 충전된다.' },
        qei2: { text: '긴 사교 뒤에는 혼자만의 시간이 있어야 회복된다.' },
        qei3: { text: '생각은 다른 사람과 말하면서 정리될 때 가장 또렷해진다.' },
        qsn1: { text: '직감보다 구체적인 사실과 세부를 믿는 편이다.' },
        qsn2: { text: '미래의 가능성과 추상적 아이디어를 상상하는 것을 좋아한다.' },
        qsn3: { text: '새로운 이론보다 검증된 실용적 방법이 더 끌린다.' },
        qtf1: { text: '결정할 때 감정을 돌보는 것보다 논리와 공정함이 더 중요하다.' },
        qtf2: { text: '결정할 때 가장 먼저 떠오르는 것은 관련된 사람들에게 미치는 영향이다.' },
        qtf3: { text: '평화를 지키기보다 객관적 진실에 다가가는 것이 더 중요하다.' },
        qjp1: { text: '계획과 일정이 미리 정해져 있을 때 마음이 놓인다.' },
        qjp2: { text: '선택지를 열어둔 채 흐름을 보는 쪽이 편하다.' },
        qjp3: { text: '마감과 구조가 있을 때 내 능력이 가장 잘 드러난다.' },
      },
    },
    courtMatch: {
      title: '타로 코트 카드 매칭',
      description: '12문항, 하나의 답. 타로의 16장 코트 카드 가운데 지금 당신의 에너지를 가장 잘 비추는 카드는 무엇일까요? 원소 기질(완드/컵/소드/펜타클)과 단계(페이지/나이트/퀸/킹)를 맞물려, 단순한 특성이 아니라 “살아 있는 원형”으로 돌려드립니다.',
      timeEstimate: '4분',
      whatYouGet: ['16장 중 당신을 비추는 코트 카드', '원소 기질(불/물/공기/흙)', '현재의 성숙 단계(페이지/나이트/퀸/킹)', '강점·그림자·가져갈 아파메이션'],
      questions: {
        ce1: { text: '문제에 마주치면 먼저…', options: { 1: '열정과 힘으로 밀어붙인다.', 2: '몸으로 느끼고 직감을 따른다.', 3: '모든 각도에서 분석한다.', 4: '실용적이고 단계적인 계획을 세운다.' } },
        ce2: { text: '이상적인 하루는…', options: { 1: '새롭고 대담한 모험.', 2: '사랑하는 사람들과의 포근한 시간.', 3: '의미 있는 주제로 깊이 이야기 나누기.', 4: '손으로 무언가를 만들거나 조립하기.' } },
        ce3: { text: '친구들은 나를…', options: { 1: '에너지 넘치고 대담하다', 2: '따뜻하고 공감 어린 편이다', 3: '날카롭고 분석적이다', 4: '믿음직하고 차분하다' } },
        ce4: { text: '시간 가는 줄 모르는 순간은…', options: { 1: '창작하거나, 공연하거나, 앞에 설 때.', 2: '누군가와 깊이 연결될 때.', 3: '글 쓰고, 토론하고, 문제를 풀 때.', 4: '수공·정원일·몸을 쓰는 작업을 할 때.' } },
        ce5: { text: '스트레스 속에서는 자주…', options: { 1: '충동적으로 행동하거나 폭발한다.', 2: '감정 속으로 물러난다.', 3: '지나치게 생각하며 머리로 도망간다.', 4: '규칙과 루틴에 더 매달린다.' } },
        ce6: { text: '가장 끌리는 것은…', options: { 1: '불꽃 — 영감, 움직임, 불티.', 2: '물 — 감정, 깊이, 흐름.', 3: '공기 — 사유, 언어, 투명함.', 4: '흙 — 기예, 몸, 단단함.' } },
        cr1: { text: '권위에 대한 나의 태도는…', options: { 1: '의심한다 — 아직 배우는 중이다.', 2: '행동으로 도전한다.', 3: '주변을 이끈다.', 4: '내가 기준이 된다.' } },
        cr2: { text: '그룹에서 나는…', options: { 1: '많이 묻고 흡수한다.', 2: '모두를 행동으로 밀어낸다.', 3: '공간을 지키고 깊이 듣는다.', 4: '최종 결정을 내린다.' } },
        cr3: { text: '변화와의 관계는…', options: { 1: '설레고 호기심이 넘친다.', 2: '내가 먼저 쫓아간다.', 3: '적응하며 주변을 돌본다.', 4: '배를 안정시켜 아무것도 깨지지 않게 한다.' } },
        cr4: { text: '경험이 나에게 가르쳐 준 것은…', options: { 1: '아직 배울 것이 많다는 사실.', 2: '직감을 믿고 움직이라는 것.', 3: '공감은 힘이라는 것.', 4: '구조와 책임이 중요하다는 것.' } },
        cr5: { text: '어떤 것을 익혔을 때 나는…', options: { 1: '발견의 설렘을 나눈다.', 2: '몸소 보이며 이끈다.', 3: '한 사람씩, 부드럽게 돕는다.', 4: '다른 사람들이 바라보는 기준이 된다.' } },
        cr6: { text: '감정의 결은…', options: { 1: '열려 있고 생생하다.', 2: '짙고 추진력이 있다.', 3: '깊고 담을 수 있다 — 타인의 감정까지.', 4: '차분하고 스스로 주권이 있다.' } },
      },
    },
    courtCards: courtCardsKO(),
    sneakPeek: {
      label: '중간 읽기:',
      mbti: '지금까지 {{letters}} 쪽으로 기울고 있어요 — 계속해 확정해 보세요.',
      courtMatchElement: { wands: '완드 카드가 떠오르고 있어요 — 불의 에너지가 앞섭니다.', cups: '컵 카드가 일어나고 있어요 — 물이 중심이 됩니다.', swords: '소드 카드가 형태를 잡고 있어요 — 공기가 중심이 됩니다.', pentacles: '펜타클 카드가 쌓이고 있어요 — 흙이 중심이 됩니다.' },
      loveLanguage: '당신의 일차 러브 랭귀지가 드러나기 시작했어요…',
      enneagram: '유형의 윤곽이 잡히고 있어요 — 윙을 위해 계속해 보세요.',
      attachment: '애착 스타일의 초점이 잡히고 있어요…',
      bigFive: '특성 프로파일의 모양이 드러나고 있어요…',
    },
    share: { button: '공유', downloaded: '기기에 저장했어요', failed: '공유 이미지를 만들 수 없었어요' },
    backToQuizzes: '퀴즈 목록으로',
    resultSections: { whenDrawn: '이 카드가 나올 때', strengths: '강점', shadow: '그림자', affirmation: '당신을 위한 아파메이션' },
  },
  zh: {
    mbtiQuick: {
      title: '快速人格类型测评',
      description: '12 道题，快速读取你充电、感知、决策与规划日常的方式。作为入门正合适；想要更精准的结果时，可随时升级到 70 题的完整深度版。',
      timeEstimate: '3 分钟',
      whatYouGet: ['快速得到你的四字母类型', '了解你的强项所在', '通向 70 题深度版的路径', '塔罗原型对照'],
      questions: {
        qei1: { text: '在充满活力的人群中最能让我充电。' },
        qei2: { text: '经过长时间的社交后，我需要独处的时间来恢复。' },
        qei3: { text: '我最擅长在与人交谈时梳理自己的想法。' },
        qsn1: { text: '相较于直觉，我更相信具体的事实和细节。' },
        qsn2: { text: '我喜欢构想未来的可能性和抽象的概念。' },
        qsn3: { text: '成熟、实用的方法比新颖的理论更吸引我。' },
        qtf1: { text: '做决定时，逻辑和公平比照顾感受更重要。' },
        qtf2: { text: '做决定时，我首先想到的是它对相关人的影响。' },
        qtf3: { text: '触及客观真相比维持和气更重要。' },
        qjp1: { text: '计划和时间表提前确定时，我更安心。' },
        qjp2: { text: '我更喜欢保持选择，让事情自然展开。' },
        qjp3: { text: '有截止日期和结构时，我能发挥得最好。' },
      },
    },
    courtMatch: {
      title: '塔罗宫廷牌匹配',
      description: '十二题，一个答案。塔罗十六张宫廷牌中，哪一张最贴近你此刻的能量？本测评将元素气质（权杖／圣杯／宝剑／金币）与身份阶段（侍从／骑士／皇后／国王）相结合，给你的不是单一特质，而是一位「活着的原型」。',
      timeEstimate: '4 分钟',
      whatYouGet: ['16 张宫廷牌中最映照你的一张', '你的元素气质（火／水／风／土）', '当前成熟阶段（侍从／骑士／皇后／国王）', '强项、阴影与可带走的肯定语'],
      questions: {
        ce1: { text: '面对问题时，我会首先…', options: { 1: '以激情和冲劲强行突破。', 2: '用身体感受，顺从直觉。', 3: '从每个角度逐一分析。', 4: '搭建切实可行的分步计划。' } },
        ce2: { text: '我理想的一天是…', options: { 1: '冒险——大胆又新鲜。', 2: '与挚爱之人度过温馨的时光。', 3: '就有意义的话题深入交谈。', 4: '动手制作或搭建实物。' } },
        ce3: { text: '朋友对我的形容是…', options: { 1: '精力充沛、大胆。', 2: '温暖、富有共情。', 3: '敏锐、善分析。', 4: '可靠、脚踏实地。' } },
        ce4: { text: '让我忘记时间的是…', options: { 1: '创作、表演或带头。', 2: '与某人深入连接。', 3: '写作、辩论或解题。', 4: '手工、园艺或以身体劳作。' } },
        ce5: { text: '压力下我往往…', options: { 1: '冲动行事或爆发。', 2: '退回到自己的情绪里。', 3: '陷入过度思考、抽离身体。', 4: '更牢地抓住既定的规则与节奏。' } },
        ce6: { text: '最吸引我的是…', options: { 1: '火焰——灵感、冲劲、火花。', 2: '水——情感、深度、流动。', 3: '风——思维、语言、澄明。', 4: '土——技艺、身体、稳固。' } },
        cr1: { text: '我与权威的关系是…', options: { 1: '会质疑——还在学习的阶段。', 2: '用行动挑战它。', 3: '引导身边的人。', 4: '我已成为标准本身。' } },
        cr2: { text: '在群体里我倾向于…', options: { 1: '提很多问题并吸收。', 2: '推动大家向行动前进。', 3: '守住场域，深入倾听。', 4: '做出最终决定。' } },
        cr3: { text: '我与变化的关系是…', options: { 1: '兴奋——充满好奇。', 2: '我主动追逐变化。', 3: '一边适应，一边照顾他人。', 4: '稳住整艘船，不让任何东西破碎。' } },
        cr4: { text: '经验教会我的是…', options: { 1: '我仍有很多需要学。', 2: '相信直觉并行动。', 3: '共情就是力量。', 4: '结构与责任很重要。' } },
        cr5: { text: '当我掌握一件事后，我会…', options: { 1: '分享发现的兴奋。', 2: '以身示范带领。', 3: '一次陪一个人温柔指引。', 4: '成为别人追随的标杆。' } },
        cr6: { text: '我的情绪风格是…', options: { 1: '开放而鲜活，感受强烈。', 2: '浓烈而有推动力。', 3: '深沉而可以承载——也包括他人的情绪。', 4: '沉稳自主。' } },
      },
    },
    courtCards: courtCardsZH(),
    sneakPeek: {
      label: '阶段读数：',
      mbti: '目前正倾向 {{letters}}——继续作答以确认。',
      courtMatchElement: { wands: '权杖牌正在显形——火的能量走在前面。', cups: '圣杯牌正在浮现——水走在前面。', swords: '宝剑牌正在成形——风走在前面。', pentacles: '金币牌正在累积——土走在前面。' },
      loveLanguage: '你的主要爱的语言正逐渐浮现……',
      enneagram: '类型轮廓正在形成——继续作答以找出你的侧翼。',
      attachment: '你的依恋风格正逐渐聚焦……',
      bigFive: '你的特质轮廓正在成形……',
    },
    share: { button: '分享', downloaded: '已保存到设备', failed: '无法创建分享图片' },
    backToQuizzes: '返回测评列表',
    resultSections: { whenDrawn: '这张牌出现时', strengths: '强项', shadow: '阴影', affirmation: '你的肯定语' },
  },
};

// ------------------------------------------------------------------
// Court-card content for 16 cards × 4 locales
// ------------------------------------------------------------------

function courtCardsEN() {
  return {
    'page-of-wands': { name: 'Page of Wands', tagline: 'The curious spark.', archetype: 'Beginner adventurer', strengths: ['Enthusiasm', 'Fresh ideas', 'Contagious energy'], shadow: ['Impulsiveness', 'Half-finished projects', 'Flakiness'], whenDrawn: 'A new creative fire is lighting — explore it before planning it.', affirmation: 'I follow what lights me up without needing it to be perfect yet.' },
    'knight-of-wands': { name: 'Knight of Wands', tagline: 'The bold quester.', archetype: 'Action-driven pioneer', strengths: ['Momentum', 'Courage', 'Charisma'], shadow: ['Recklessness', 'Burnout', 'Impatience'], whenDrawn: 'Move — but watch the cost of speed. The fire wants direction.', affirmation: 'I move with passion and pace myself for the long road.' },
    'queen-of-wands': { name: 'Queen of Wands', tagline: 'The radiant sovereign.', archetype: 'Magnetic leader', strengths: ['Confidence', 'Warmth', 'Creative authority'], shadow: ['Ego flare-ups', 'Jealousy', 'Attention-dependence'], whenDrawn: 'Step fully into your light. Others follow the one who burns clearly.', affirmation: 'My presence is my power — I take up the space that is mine.' },
    'king-of-wands': { name: 'King of Wands', tagline: 'The visionary founder.', archetype: 'Mature creator', strengths: ['Vision', 'Leadership', 'Sustained passion'], shadow: ['Tyranny', 'Over-control', 'Pride'], whenDrawn: 'You are ready to build long-range. Lead from purpose, not pressure.', affirmation: 'I lead with clear vision and trust others to carry their part.' },
    'page-of-cups': { name: 'Page of Cups', tagline: 'The open-hearted dreamer.', archetype: 'Intuitive newcomer', strengths: ['Imagination', 'Empathy', 'Emotional openness'], shadow: ['Naivety', 'Over-sensitivity', 'Escapism'], whenDrawn: 'A tender feeling or creative spark wants attention — honour it.', affirmation: 'I let my softness be a source of information, not a liability.' },
    'knight-of-cups': { name: 'Knight of Cups', tagline: 'The romantic quester.', archetype: 'Heart-led seeker', strengths: ['Deep feeling', 'Artistry', 'Devotion'], shadow: ['Idealization', 'Moodiness', 'Avoidance of hard truths'], whenDrawn: 'Follow the feeling — but ground it with action, not fantasy alone.', affirmation: 'I pursue what I love with both heart and feet on the ground.' },
    'queen-of-cups': { name: 'Queen of Cups', tagline: 'The empath-oracle.', archetype: 'Emotional sage', strengths: ['Intuition', 'Compassion', 'Emotional holding'], shadow: ['Absorbing others\' pain', 'Martyrdom', 'Loss of self'], whenDrawn: 'Your emotional intelligence is a gift. Also — tend your own cup first.', affirmation: 'I feel deeply and also know where I end and others begin.' },
    'king-of-cups': { name: 'King of Cups', tagline: 'The steady current.', archetype: 'Compassionate authority', strengths: ['Emotional maturity', 'Counsel', 'Resilience under pressure'], shadow: ['Suppressed feelings', 'Over-caretaking', 'Quiet resentment'], whenDrawn: 'You are the calm others rely on — make sure you have somewhere to feel, too.', affirmation: 'I hold space for others because I know how to hold space for myself.' },
    'page-of-swords': { name: 'Page of Swords', tagline: 'The sharp apprentice.', archetype: 'Curious thinker', strengths: ['Quick mind', 'Curiosity', 'Questioning spirit'], shadow: ['Gossip', 'Overthinking', 'Cutting words'], whenDrawn: 'A new idea wants investigating — ask before you assume.', affirmation: 'I ask questions before I draw conclusions.' },
    'knight-of-swords': { name: 'Knight of Swords', tagline: 'The charging mind.', archetype: 'Relentless debater', strengths: ['Clarity', 'Drive', 'Moral conviction'], shadow: ['Arrogance', 'Tunnel vision', 'Verbal harm'], whenDrawn: 'Your truth is strong — deliver it without running people over.', affirmation: 'I speak truth with both edge and care.' },
    'queen-of-swords': { name: 'Queen of Swords', tagline: 'The clear-eyed witness.', archetype: 'Discerning wise one', strengths: ['Clarity', 'Boundaries', 'Honest insight'], shadow: ['Coldness', 'Harsh judgement', 'Isolation'], whenDrawn: 'Your clarity is needed — let honesty and warmth arrive together.', affirmation: 'I see clearly and speak kindly.' },
    'king-of-swords': { name: 'King of Swords', tagline: 'The sovereign intellect.', archetype: 'Principled authority', strengths: ['Strategic thinking', 'Fairness', 'Decisiveness'], shadow: ['Rigidity', 'Emotional distance', 'Abstraction'], whenDrawn: 'You are the one others trust to cut clean — lead from ethics, not ego.', affirmation: 'I decide from principle and remain open to new evidence.' },
    'page-of-pentacles': { name: 'Page of Pentacles', tagline: 'The eager builder.', archetype: 'Patient student', strengths: ['Willingness to learn', 'Practicality', 'Follow-through'], shadow: ['Perfectionism', 'Slowness to start', 'Penny-pinching'], whenDrawn: 'A new skill or venture is worth investing in — start small, stay steady.', affirmation: 'I begin where I am and trust the accumulation of small steps.' },
    'knight-of-pentacles': { name: 'Knight of Pentacles', tagline: 'The determined worker.', archetype: 'Reliable executor', strengths: ['Consistency', 'Discipline', 'Trustworthiness'], shadow: ['Rigidity', 'Workaholism', 'Fear of risk'], whenDrawn: 'Steady wins here — but occasionally, the slow path needs a shake.', affirmation: 'I honour my discipline and allow myself moments of play.' },
    'queen-of-pentacles': { name: 'Queen of Pentacles', tagline: 'The abundant provider.', archetype: 'Nurturing creator', strengths: ['Generosity', 'Practical care', 'Sensory wisdom'], shadow: ['Over-giving', 'Material anxiety', 'Losing self in caretaking'], whenDrawn: 'You tend to everyone\'s garden — remember to plant in your own.', affirmation: 'I give from fullness, not from fear.' },
    'king-of-pentacles': { name: 'King of Pentacles', tagline: 'The mountain.', archetype: 'Established master', strengths: ['Wealth-building', 'Legacy', 'Grounded leadership'], shadow: ['Materialism', 'Control', 'Stubbornness'], whenDrawn: 'You have built something real — now shape what it means, not just what it has.', affirmation: 'I measure wealth by what I protect and what I give, not only by what I hold.' },
  };
}

function courtCardsJA() {
  return {
    'page-of-wands': { name: 'ワンドのペイジ', tagline: '好奇心の火花。', archetype: '始まりの冒険者', strengths: ['情熱', '新鮮な発想', '伝わる熱量'], shadow: ['衝動性', '中途半端な企画', '気まぐれ'], whenDrawn: '新しい創造の火が点いた——計画より先に、まず触れてみて。', affirmation: 'まだ完璧でなくていい——心が灯ったほうへ動いていく。' },
    'knight-of-wands': { name: 'ワンドのナイト', tagline: '勇敢なる探求者。', archetype: '行動の先駆者', strengths: ['勢い', '勇気', 'カリスマ'], shadow: ['向こう見ず', '燃え尽き', '短気'], whenDrawn: '動いていい——ただしスピードの代償に気づいて。火は方向を欲している。', affirmation: '情熱をもって進み、長い道のために自分のペースを守る。' },
    'queen-of-wands': { name: 'ワンドのクイーン', tagline: '光を放つ女王。', archetype: '惹きつけるリーダー', strengths: ['自信', '温かさ', '創造する権威'], shadow: ['エゴの高ぶり', '嫉妬', '注目への依存'], whenDrawn: '自分の光に一歩踏み出して。はっきり燃える人に、人はついてくる。', affirmation: '私の存在そのものが力——自分の場所を堂々と取る。' },
    'king-of-wands': { name: 'ワンドのキング', tagline: '構想する創始者。', archetype: '成熟した創造者', strengths: ['ビジョン', '統率', '持続する情熱'], shadow: ['独裁', '過剰な統制', 'プライド'], whenDrawn: '長いスパンで築く準備ができている。焦りではなく目的から導こう。', affirmation: '明確なビジョンで導き、仲間に役割を託す。' },
    'page-of-cups': { name: 'カップのペイジ', tagline: '開かれた夢見る人。', archetype: '直感の新参者', strengths: ['想像力', '共感', '感情の開き'], shadow: ['ナイーブさ', '過敏さ', '現実逃避'], whenDrawn: '柔らかな気持ちや閃きが、あなたの注意を求めている——大切に扱って。', affirmation: '私の柔らかさは弱さではなく、情報の源だ。' },
    'knight-of-cups': { name: 'カップのナイト', tagline: '愛の探求者。', archetype: '心を軸にする求道者', strengths: ['深い感受性', '芸術性', '献身'], shadow: ['理想化', '気分の波', '厳しい事実からの回避'], whenDrawn: '感じていることに従って——ただし夢だけでなく行動で地に着けて。', affirmation: '愛するものを、心と足——両方で追いかける。' },
    'queen-of-cups': { name: 'カップのクイーン', tagline: '共感の巫女。', archetype: '感情の賢者', strengths: ['直感', '慈しみ', '感情を抱く力'], shadow: ['他者の痛みを吸う', '自己犠牲', '自分を見失う'], whenDrawn: 'あなたの共感力は贈り物。でも、まずは自分のカップを満たして。', affirmation: '深く感じる——同時に、自分と他者の境目も知っている。' },
    'king-of-cups': { name: 'カップのキング', tagline: '静かな水脈。', archetype: '慈しみの権威', strengths: ['感情の成熟', '助言', '圧の下での粘り'], shadow: ['感情の抑え込み', '過剰な世話', '静かな恨み'], whenDrawn: '周りが頼る落ち着いた存在である——自分自身も、安心して感じられる場所を持って。', affirmation: '人を抱けるのは、自分を抱く術を知っているから。' },
    'page-of-swords': { name: 'ソードのペイジ', tagline: '鋭い見習い。', archetype: '好奇心の思考者', strengths: ['頭の回転', '好奇心', '問う姿勢'], shadow: ['噂話', '考えすぎ', '切る言葉'], whenDrawn: '新しい考えが検証を求めている——決めつける前に、問いを。', affirmation: '結論の前に、まず質問する。' },
    'knight-of-swords': { name: 'ソードのナイト', tagline: '突き進む思考。', archetype: '止まらない論者', strengths: ['明晰さ', '推進力', '倫理的確信'], shadow: ['傲慢', '視野狭窄', '言葉の暴力'], whenDrawn: 'あなたの真実は強い——ただし人を踏み越えずに届けよう。', affirmation: '真実を語る——鋭さと配慮の両方で。' },
    'queen-of-swords': { name: 'ソードのクイーン', tagline: '澄んだ目の目撃者。', archetype: '見極める賢者', strengths: ['明晰さ', '境界線', '正直な洞察'], shadow: ['冷たさ', '厳しい裁き', '孤立'], whenDrawn: 'あなたの明晰さが必要だ——正直さと温もりを同時に届けよう。', affirmation: 'はっきり見て、優しく語る。' },
    'king-of-swords': { name: 'ソードのキング', tagline: '主権ある知性。', archetype: '原則ある権威', strengths: ['戦略', '公正', '決断'], shadow: ['硬直', '感情的な距離', '抽象化'], whenDrawn: '潔く切り分けるあなたは信頼される——倫理から導こう、エゴからではなく。', affirmation: '原則から決める——ただし新しい根拠にも開かれている。' },
    'page-of-pentacles': { name: 'ペンタクルのペイジ', tagline: '学びに熱心な職人見習い。', archetype: '忍耐の生徒', strengths: ['学ぶ意欲', '実際性', 'やり抜く力'], shadow: ['完璧主義', '始めるのが遅い', '締めすぎ'], whenDrawn: '新しいスキルや挑戦は投資する価値がある——小さく始め、着実に。', affirmation: '今いる場所から始める——小さな一歩の積み重ねを信じる。' },
    'knight-of-pentacles': { name: 'ペンタクルのナイト', tagline: '堅実な働き手。', archetype: '信頼できる実行者', strengths: ['一貫性', '規律', '信頼'], shadow: ['硬さ', '働きすぎ', 'リスクへの恐れ'], whenDrawn: '着実さが勝つ——ただし時には、その道を少し揺さぶることも。', affirmation: '自分の規律を敬う——遊びの余白も自分に許す。' },
    'queen-of-pentacles': { name: 'ペンタクルのクイーン', tagline: '豊かさを育む人。', archetype: '育てる創造者', strengths: ['気前良さ', '実際的なケア', '感覚の智慧'], shadow: ['与えすぎ', '物質的な不安', 'ケアの中で自分を失う'], whenDrawn: '皆の庭を世話している——自分の庭にも、種を蒔くのを忘れずに。', affirmation: '恐れからではなく、満ちたところから与える。' },
    'king-of-pentacles': { name: 'ペンタクルのキング', tagline: '動かない山。', archetype: '確立された達人', strengths: ['富の構築', 'レガシー', '地に足のついた統率'], shadow: ['物質主義', '支配', '頑固さ'], whenDrawn: '確かなものを築いた——次は、その意味を形づくろう。持ち高ではなく、意味を。', affirmation: '富は、守るものと手渡すもので測る——ただ所有するものではない。' },
  };
}

function courtCardsKO() {
  return {
    'page-of-wands': { name: '완드의 페이지', tagline: '호기심의 불씨.', archetype: '시작하는 모험가', strengths: ['열정', '신선한 발상', '전염되는 에너지'], shadow: ['충동성', '미완의 프로젝트', '변덕'], whenDrawn: '새로운 창작의 불이 붙었어요 — 계획보다 먼저 만져 보세요.', affirmation: '아직 완벽하지 않아도 괜찮아요. 나는 가슴이 설레는 쪽으로 움직인다.' },
    'knight-of-wands': { name: '완드의 기사', tagline: '담대한 탐구자.', archetype: '행동하는 개척자', strengths: ['추진력', '용기', '카리스마'], shadow: ['무모함', '번아웃', '조급함'], whenDrawn: '움직여도 좋아요 — 다만 속도의 대가를 살피세요. 불은 방향을 원합니다.', affirmation: '나는 열정으로 나아가되, 먼 길을 위해 속도를 지킨다.' },
    'queen-of-wands': { name: '완드의 여왕', tagline: '빛나는 주권자.', archetype: '끌어당기는 리더', strengths: ['자신감', '따뜻함', '창조의 권위'], shadow: ['자아 과열', '질투', '주목 의존'], whenDrawn: '나의 빛 속으로 한 걸음 더 들어가요. 또렷이 타오르는 사람을 사람들은 따릅니다.', affirmation: '나의 존재 자체가 힘 — 내 자리에 당당히 선다.' },
    'king-of-wands': { name: '완드의 왕', tagline: '비전의 창건자.', archetype: '성숙한 창조자', strengths: ['비전', '리더십', '지속되는 열정'], shadow: ['독재', '과도한 통제', '자만'], whenDrawn: '장기적인 것을 지을 준비가 되어 있어요. 압박이 아니라 목적에서 이끌어요.', affirmation: '나는 또렷한 비전으로 이끌고, 사람들에게 각자의 몫을 맡긴다.' },
    'page-of-cups': { name: '컵의 페이지', tagline: '열린 마음의 몽상가.', archetype: '직관의 신참', strengths: ['상상력', '공감', '감정의 개방'], shadow: ['순진함', '과민함', '도피'], whenDrawn: '부드러운 감정이나 창작의 불티가 주의를 구해요 — 소중히 대해요.', affirmation: '나의 부드러움은 약점이 아니라 정보의 원천이다.' },
    'knight-of-cups': { name: '컵의 기사', tagline: '낭만의 탐구자.', archetype: '마음이 이끄는 구도자', strengths: ['깊은 감수성', '예술성', '헌신'], shadow: ['이상화', '감정의 기복', '불편한 진실 회피'], whenDrawn: '감정을 따르되, 환상 대신 행동으로 땅에 내려요.', affirmation: '사랑하는 것을 마음과 발, 둘 다로 쫓아간다.' },
    'queen-of-cups': { name: '컵의 여왕', tagline: '공감의 사제.', archetype: '감정의 현자', strengths: ['직관', '자비', '감정을 담는 힘'], shadow: ['타인의 고통 흡수', '자기희생', '자신을 잃음'], whenDrawn: '당신의 감정 지능은 선물이에요. 다만 자신의 잔을 먼저 채워요.', affirmation: '나는 깊이 느끼며, 동시에 나와 타인의 경계를 안다.' },
    'king-of-cups': { name: '컵의 왕', tagline: '고요한 물길.', archetype: '자비의 권위', strengths: ['감정의 성숙', '조언', '압박 아래의 회복력'], shadow: ['감정 억제', '과도한 돌봄', '조용한 원망'], whenDrawn: '당신은 사람들이 의지하는 차분함 — 자신도 감정을 내려놓을 공간을 가져요.', affirmation: '타인을 품을 수 있는 건, 나를 품는 법을 알기 때문이다.' },
    'page-of-swords': { name: '소드의 페이지', tagline: '날카로운 견습.', archetype: '호기심의 사색가', strengths: ['민첩한 사고', '호기심', '질문하는 태도'], shadow: ['가십', '과도한 사고', '베는 말'], whenDrawn: '새로운 생각이 검증을 원해요 — 단정 짓기 전에 질문을.', affirmation: '결론 이전에 먼저 질문한다.' },
    'knight-of-swords': { name: '소드의 기사', tagline: '돌진하는 사유.', archetype: '멈추지 않는 논자', strengths: ['명료함', '추진력', '도덕적 확신'], shadow: ['오만', '터널 시야', '언어의 상처'], whenDrawn: '당신의 진실은 강해요 — 다만 사람을 밟지 않고 전달해요.', affirmation: '예리함과 배려, 둘 다로 진실을 말한다.' },
    'queen-of-swords': { name: '소드의 여왕', tagline: '맑은 눈의 증인.', archetype: '분별 있는 현자', strengths: ['명료함', '경계', '솔직한 통찰'], shadow: ['차가움', '가혹한 판단', '고립'], whenDrawn: '당신의 명료함이 필요해요 — 솔직함과 따뜻함이 함께 도달하게 해요.', affirmation: '나는 분명히 보고, 다정하게 말한다.' },
    'king-of-swords': { name: '소드의 왕', tagline: '주권자의 지성.', archetype: '원칙 있는 권위', strengths: ['전략', '공정', '결단'], shadow: ['경직', '감정적 거리', '추상화'], whenDrawn: '깨끗하게 자를 수 있는 당신은 신뢰의 대상 — 에고가 아닌 윤리에서 이끌어요.', affirmation: '나는 원칙에서 결정하되, 새 증거에도 열려 있다.' },
    'page-of-pentacles': { name: '펜타클의 페이지', tagline: '열심인 견습.', archetype: '인내의 학생', strengths: ['배움의 의지', '실용성', '끈기'], shadow: ['완벽주의', '시작의 늦음', '너무 아끼기'], whenDrawn: '새 기술이나 도전은 투자할 만해요 — 작게 시작해 꾸준히.', affirmation: '지금 있는 자리에서 시작하며, 작은 걸음의 축적을 믿는다.' },
    'knight-of-pentacles': { name: '펜타클의 기사', tagline: '성실한 일꾼.', archetype: '신뢰할 수 있는 실행자', strengths: ['일관성', '규율', '믿음직함'], shadow: ['경직', '과로', '위험을 회피함'], whenDrawn: '꾸준함이 이기는 때 — 가끔은 그 길을 살짝 흔들어도 좋아요.', affirmation: '나의 규율을 존중하며, 놀이의 순간도 스스로에게 허락한다.' },
    'queen-of-pentacles': { name: '펜타클의 여왕', tagline: '풍요의 제공자.', archetype: '기르는 창조자', strengths: ['관대함', '현실적 돌봄', '감각의 지혜'], shadow: ['지나친 베풂', '물질 불안', '돌봄 속 자기 상실'], whenDrawn: '모두의 정원을 돌보고 있어요 — 내 정원에도 씨를 뿌리는 걸 잊지 마요.', affirmation: '두려움이 아니라 충만함에서 베푼다.' },
    'king-of-pentacles': { name: '펜타클의 왕', tagline: '산.', archetype: '확립된 대가', strengths: ['부의 축적', '유산', '지상에 뿌리내린 리더십'], shadow: ['물질주의', '통제', '고집'], whenDrawn: '진짜를 지었어요 — 이제는 소유가 아니라 의미를 빚어요.', affirmation: '부는 내가 지키고 건네는 것으로 잰다 — 단지 내가 쥐고 있는 것으로가 아니라.' },
  };
}

function courtCardsZH() {
  return {
    'page-of-wands': { name: '权杖侍从', tagline: '好奇的火花。', archetype: '启程的冒险者', strengths: ['热情', '新鲜的想法', '会传染的能量'], shadow: ['冲动', '半途的计划', '善变'], whenDrawn: '新的创作之火正在点燃——先去触碰，再谈计划。', affirmation: '不必完美，我依循心中被点亮的方向。' },
    'knight-of-wands': { name: '权杖骑士', tagline: '勇敢的探寻者。', archetype: '行动的开拓者', strengths: ['冲劲', '勇气', '魅力'], shadow: ['鲁莽', '耗尽', '急躁'], whenDrawn: '可以前进——但留意速度的代价。火需要方向。', affirmation: '以热情前进，并为长路配好节奏。' },
    'queen-of-wands': { name: '权杖皇后', tagline: '光辉的女王。', archetype: '吸引人的领导者', strengths: ['自信', '温暖', '创造的权威'], shadow: ['自我高涨', '嫉妒', '依赖关注'], whenDrawn: '踏进自己的光。人们愿意追随燃烧得清晰的人。', affirmation: '我的存在就是力量——我占据属于自己的位置。' },
    'king-of-wands': { name: '权杖国王', tagline: '有远见的创建者。', archetype: '成熟的创造者', strengths: ['远见', '领导', '持续的热情'], shadow: ['专断', '过度掌控', '骄傲'], whenDrawn: '你已准备好长远地搭建——由目的而非压力来带领。', affirmation: '以清晰的远见带领，并信任他人承担自己的部分。' },
    'page-of-cups': { name: '圣杯侍从', tagline: '敞开心的梦者。', archetype: '直觉的新手', strengths: ['想象力', '共情', '情感的开放'], shadow: ['天真', '过敏', '逃避'], whenDrawn: '一种温柔的感觉或灵感正在召唤你的注意——好好对待它。', affirmation: '我的柔软不是弱点，而是一种信息来源。' },
    'knight-of-cups': { name: '圣杯骑士', tagline: '浪漫的求道者。', archetype: '以心为轴的追寻者', strengths: ['深厚的感受', '艺术性', '奉献'], shadow: ['理想化', '情绪起伏', '回避硬真相'], whenDrawn: '跟随感受——但以行动而非幻想落地。', affirmation: '我以心与双脚，一同追寻所爱。' },
    'queen-of-cups': { name: '圣杯皇后', tagline: '共情的祭司。', archetype: '情感的智者', strengths: ['直觉', '慈悲', '承载情感的力量'], shadow: ['吸收他人之痛', '过度牺牲', '失去自我'], whenDrawn: '你的情感智慧是一份礼物——但也请先照料自己的杯。', affirmation: '我深深感受，也知道自己与他人的边界。' },
    'king-of-cups': { name: '圣杯国王', tagline: '稳定的水流。', archetype: '慈悲的权威', strengths: ['情感的成熟', '劝言', '压力下的韧性'], shadow: ['压抑感受', '过度照顾', '安静的怨气'], whenDrawn: '你是他人倚靠的安稳——也请为自己留一个可以感受的地方。', affirmation: '我能为他人留出空间，因为我懂得如何为自己留出空间。' },
    'page-of-swords': { name: '宝剑侍从', tagline: '锋利的学徒。', archetype: '好奇的思考者', strengths: ['思维敏捷', '好奇心', '敢于追问'], shadow: ['流言', '过度思考', '话语伤人'], whenDrawn: '一个新想法需要被检验——先发问，再下结论。', affirmation: '在下结论前，我先提出问题。' },
    'knight-of-swords': { name: '宝剑骑士', tagline: '冲锋的思维。', archetype: '不停止的论者', strengths: ['清晰', '推动力', '道德信念'], shadow: ['傲慢', '视野狭窄', '语言伤害'], whenDrawn: '你的真相很有力——送达时别踏过别人。', affirmation: '我以锋芒与体贴，一同说出真相。' },
    'queen-of-swords': { name: '宝剑皇后', tagline: '清明的见证者。', archetype: '明辨的智者', strengths: ['清晰', '界限', '诚实的洞察'], shadow: ['冷淡', '严厉的评判', '孤立'], whenDrawn: '需要你的清明——让诚实与温度一起抵达。', affirmation: '我看得清楚，也说得温柔。' },
    'king-of-swords': { name: '宝剑国王', tagline: '主权的理智。', archetype: '讲原则的权威', strengths: ['战略', '公平', '决断'], shadow: ['僵硬', '情感距离', '抽象化'], whenDrawn: '你是能够干净切割、被信任的那个人——由伦理而非自我来带领。', affirmation: '我从原则出发做决定，并对新证据保持开放。' },
    'page-of-pentacles': { name: '金币侍从', tagline: '勤学的学徒。', archetype: '耐心的学生', strengths: ['愿意学习', '实用', '能够跟进'], shadow: ['完美主义', '起步慢', '过度吝惜'], whenDrawn: '新的技能或尝试值得投入——小处起步，稳步前行。', affirmation: '我从所在之处起步，相信微小步伐的累积。' },
    'knight-of-pentacles': { name: '金币骑士', tagline: '踏实的劳作者。', archetype: '可靠的执行者', strengths: ['持续性', '纪律', '可信赖'], shadow: ['僵硬', '工作狂', '畏惧风险'], whenDrawn: '此处由踏实胜出——但偶尔，也需要让那条慢路被摇动。', affirmation: '我尊重自己的纪律，也允许自己有玩耍的时刻。' },
    'queen-of-pentacles': { name: '金币皇后', tagline: '丰盛的供给者。', archetype: '养育的创造者', strengths: ['慷慨', '实际的照顾', '感官的智慧'], shadow: ['付出过度', '对物质焦虑', '在照顾中失去自己'], whenDrawn: '你在照料每个人的花园——别忘了在自己的花园里播种。', affirmation: '我从丰盈里给，而不是从恐惧里给。' },
    'king-of-pentacles': { name: '金币国王', tagline: '一座山。', archetype: '立住根基的大家', strengths: ['累积财富', '留下传承', '接地的领导'], shadow: ['物质主义', '控制', '固执'], whenDrawn: '你已经建成了真的东西——现在来塑造它的意义，而不只是它的体量。', affirmation: '我以守护与给予来度量富足，而不只是所握之物。' },
  };
}

// ------------------------------------------------------------------
// Merge + write
// ------------------------------------------------------------------

for (const locale of LOCALES) {
  const path = resolve(__dirname, `../src/i18n/locales/${locale}/app.json`);
  const data = JSON.parse(readFileSync(path, 'utf8'));

  const payload = PAYLOADS[locale];
  if (!data.quizzes) data.quizzes = {};
  if (!data.quizzes.definitions) data.quizzes.definitions = {};

  data.quizzes.definitions.mbtiQuick = payload.mbtiQuick;
  data.quizzes.definitions.courtMatch = payload.courtMatch;
  data.quizzes.courtCards = payload.courtCards;
  data.quizzes.sneakPeek = payload.sneakPeek;
  data.quizzes.share = payload.share;
  data.quizzes.backToQuizzes = payload.backToQuizzes;
  if (!data.quizzes.resultSections) data.quizzes.resultSections = {};
  Object.assign(data.quizzes.resultSections, payload.resultSections);

  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`✓ ${locale}: merged quiz i18n into app.json`);
}
