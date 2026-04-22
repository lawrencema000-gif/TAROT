// Second i18n merge — Shadow Archetype quiz + Element Affinity quiz +
// Numerology Life Path + Cosmic Profile section + Chinese zodiac labels,
// into every locale's app.json.
//
// Idempotent.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES = ['en', 'ja', 'ko', 'zh'];

// ------------------------------------------------------------------
// Quiz definition payloads
// ------------------------------------------------------------------

const SHADOW = {
  en: {
    title: 'Shadow Archetype',
    description: 'Which inner archetype is running the room right now? This reading maps you to one of the seven deep patterns — Lover, Warrior, Magician, Sovereign, Sage, Innocent, or Explorer — with the gift each one brings, the shadow it casts when wounded, and a path toward integration.',
    timeEstimate: '6 min',
    whatYouGet: ['Your dominant Jungian archetype (Lover, Warrior, Magician, Sovereign, Sage, Innocent, Explorer)', 'The gift it brings when healthy', 'The shadow it casts when wounded', 'A path toward integration + tarot pairing'],
    questions: {
      lov1: { text: 'Deep emotional intimacy is what makes life worth living.' },
      lov2: { text: "I often feel other people's emotions as vividly as my own." },
      lov3: { text: 'I give myself fully when I love someone or something.' },
      war1: { text: 'I am willing to fight — literally or metaphorically — for what I believe in.' },
      war2: { text: 'Discipline and follow-through are core to who I am.' },
      war3: { text: "I step up to protect people who can't protect themselves." },
      mag1: { text: "I'm drawn to hidden knowledge — the underneath of things." },
      mag2: { text: 'I see patterns and connections others often miss.' },
      mag3: { text: 'Helping someone transform the way they see themselves is one of my deepest pleasures.' },
      sov1: { text: 'People naturally look to me to set the direction.' },
      sov2: { text: "I feel responsible for the well-being of the systems I'm part of." },
      sov3: { text: 'I have a clear sense of what I am the standard-bearer for.' },
      sag1: { text: "I'm happier as a teacher / witness than as the main character." },
      sag2: { text: 'I need long solitary stretches to think things through.' },
      sag3: { text: 'I value understanding a thing deeply more than acting on it quickly.' },
      inn1: { text: 'I lead with hope, even when things look hard.' },
      inn2: { text: 'The simple pleasures (a walk, a meal, good light) matter enormously to me.' },
      inn3: { text: 'I trust people by default, not by evidence.' },
      exp1: { text: 'Routine feels like slow suffocation.' },
      exp2: { text: "I've reinvented my life more than once." },
      exp3: { text: 'Being somewhere unfamiliar is one of my favourite feelings.' },
    },
  },
  ja: {
    title: '影の元型診断',
    description: '今、内側でどの元型が主役になっている？ ラバー／ウォリアー／マジシャン／ソブリン／セージ／イノセント／エクスプローラー——7つの深い型のどれかに対応づけ、健やかなときの贈り物、傷ついたときの影、そして統合への道を返します。',
    timeEstimate: '6分',
    whatYouGet: ['主役となるユング派の元型（ラバー／ウォリアー／マジシャン／ソブリン／セージ／イノセント／エクスプローラー）', '健やかなときの贈り物', '傷ついたときの影', '統合への道＋タロットとの対応'],
    questions: {
      lov1: { text: '深い感情的な親密さこそが、生きる価値そのものだと感じる。' },
      lov2: { text: '他者の感情を、自分のことのように鮮明に感じ取ることが多い。' },
      lov3: { text: '誰かや何かを愛するとき、自分のすべてを差し出す。' },
      war1: { text: '自分が信じるもののためには、比喩でも実際でも戦う覚悟がある。' },
      war2: { text: '規律とやり抜く力が、自分の芯を成している。' },
      war3: { text: '自分で自分を守れない人のために、立ち上がることをいとわない。' },
      mag1: { text: '表層の下にある隠された知識に強く惹かれる。' },
      mag2: { text: '他人が見落とすパターンやつながりがよく見える。' },
      mag3: { text: '誰かが自分自身の見方を変えていく——その転機に立ち会うのが、深い喜びだ。' },
      sov1: { text: '方向性を決める役割を、自然と求められる。' },
      sov2: { text: '自分が属する場や仕組みの健やかさに責任を感じる。' },
      sov3: { text: '自分は何のための旗印なのか、はっきりした感覚がある。' },
      sag1: { text: '主役より、教える人・見守る人でいる方が自分らしい。' },
      sag2: { text: '物事をきちんと考えるには、長い独りの時間が必要だ。' },
      sag3: { text: '急いで動くより、深く理解することの方を大切にする。' },
      inn1: { text: '状況が厳しくても、まず希望を先に置く。' },
      inn2: { text: '散歩、食事、やわらかい光——そんな簡素な喜びが、自分にはとても大切だ。' },
      inn3: { text: '人を、証拠ではなくデフォルトで信じる。' },
      exp1: { text: '日常のルーティンは、ゆっくりした窒息のように感じる。' },
      exp2: { text: '人生を作り変えた経験が、一度ではすまない。' },
      exp3: { text: '見知らぬ場所にいる感覚は、もっとも好きな感覚のひとつだ。' },
    },
  },
  ko: {
    title: '그림자 원형 진단',
    description: '지금 내면에서 어떤 원형이 방을 지휘하고 있을까요? 연인·전사·마법사·왕권·현자·순수자·탐험가 — 일곱 개의 깊은 패턴 중 하나에 연결하고, 건강할 때의 선물, 상처 입었을 때의 그림자, 그리고 통합의 길을 돌려드립니다.',
    timeEstimate: '6분',
    whatYouGet: ['당신을 지배하는 융 원형(연인·전사·마법사·왕권·현자·순수자·탐험가)', '건강할 때의 선물', '상처 입었을 때의 그림자', '통합의 길 + 타로 페어링'],
    questions: {
      lov1: { text: '깊은 정서적 친밀감이 삶을 살아갈 이유가 된다.' },
      lov2: { text: '타인의 감정을 내 것처럼 생생하게 느끼는 때가 자주 있다.' },
      lov3: { text: '누군가 또는 무언가를 사랑할 때, 나를 전부 내어준다.' },
      war1: { text: '믿는 바를 위해서라면 — 실제로든 비유든 — 싸울 각오가 되어 있다.' },
      war2: { text: '규율과 끝까지 해내는 힘이 나의 중심이다.' },
      war3: { text: '스스로를 지키지 못하는 사람들을 위해 앞에 나선다.' },
      mag1: { text: '표면 아래의 숨은 지식에 끌린다.' },
      mag2: { text: '다른 사람들이 놓치는 패턴과 연결을 자주 본다.' },
      mag3: { text: '누군가가 자기 자신을 보는 방식이 바뀌는 순간을 돕는 것 — 그것이 내 가장 깊은 기쁨 중 하나다.' },
      sov1: { text: '사람들은 자연스레 나에게서 방향을 구한다.' },
      sov2: { text: '내가 속한 장과 체계의 안녕에 책임감을 느낀다.' },
      sov3: { text: '내가 무엇의 기준이 되는지에 대해 또렷한 감각이 있다.' },
      sag1: { text: '주인공이기보다 가르치는 사람·지켜보는 사람으로 있는 쪽이 편하다.' },
      sag2: { text: '생각을 제대로 정리하려면 긴 홀로의 시간이 필요하다.' },
      sag3: { text: '빠르게 움직이는 것보다 깊이 이해하는 것을 더 귀하게 여긴다.' },
      inn1: { text: '상황이 힘들어도, 희망을 먼저 둔다.' },
      inn2: { text: '산책, 한 끼의 식사, 좋은 빛 — 이런 단순한 기쁨이 내게는 엄청나게 중요하다.' },
      inn3: { text: '사람을 증거가 아니라 기본값으로 신뢰한다.' },
      exp1: { text: '루틴은 천천히 숨이 막히는 감각처럼 느껴진다.' },
      exp2: { text: '삶을 새로 짠 적이 한 번으로 끝나지 않는다.' },
      exp3: { text: '낯선 곳에 있는 감각이 내가 가장 좋아하는 감각 중 하나다.' },
    },
  },
  zh: {
    title: '影子原型测评',
    description: '此刻你的内在由哪一位原型在指挥这个房间？此测评把你对应到七个深层模式之一——情人、战士、魔法师、君主、贤者、天真者、探险者——并告诉你它健康时的礼物、受伤时的阴影，以及走向整合的路径。',
    timeEstimate: '6 分钟',
    whatYouGet: ['主导你的荣格原型（情人／战士／魔法师／君主／贤者／天真者／探险者）', '健康时带来的礼物', '受伤时投下的阴影', '整合之路 + 塔罗对应'],
    questions: {
      lov1: { text: '深刻的情感亲密让生活变得值得活。' },
      lov2: { text: '我经常能像感知自己一样鲜明地感受他人的情绪。' },
      lov3: { text: '当我爱一个人或一件事，我会把自己整个交出去。' },
      war1: { text: '为了所信，我愿意——无论比喻还是真刀真枪——去战斗。' },
      war2: { text: '纪律与贯彻是我核心的一部分。' },
      war3: { text: '我会为那些无法保护自己的人挺身而出。' },
      mag1: { text: '我被藏在表面之下的知识所吸引。' },
      mag2: { text: '我常看到别人错过的模式与关联。' },
      mag3: { text: '帮助一个人改变看待自己的方式——这是我最深的乐趣之一。' },
      sov1: { text: '人们会自然地期待我来定方向。' },
      sov2: { text: '我对自己所属系统的福祉有责任感。' },
      sov3: { text: '我清楚自己是为什么而立的旗。' },
      sag1: { text: '相比做主角，我更愿做老师或见证者。' },
      sag2: { text: '我需要长时间独处才能把事情想透。' },
      sag3: { text: '深度地理解一件事，对我而言比快速行动更重要。' },
      inn1: { text: '即便处境艰难，我依然把希望放在前面。' },
      inn2: { text: '简单的快乐——一次散步、一餐饭、一束好光——对我意义深远。' },
      inn3: { text: '我默认信任人，而不是凭证据才信任。' },
      exp1: { text: '固定的日常让我感到缓慢的窒息。' },
      exp2: { text: '我不止一次重塑自己的生活。' },
      exp3: { text: '处在陌生之地，是我最喜欢的感觉之一。' },
    },
  },
};

const SHADOW_ARCHETYPES_I18N = {
  en: {
    lover: { name: 'The Lover', tagline: 'The one who stays open.', gift: 'You lead with connection. When you are in your power, life feels warm, sensual, and meaningful. You create belonging wherever you go.', shadow: 'When wounded, the Lover drowns — co-dependence, obsession, or losing yourself in someone else. The shadow can also show up as the opposite: shutting down entirely to avoid being hurt.', integration: 'Anchor in self-knowledge so your giving is a choice, not a compulsion. Practice loving without needing to merge.', affirmation: 'I open my heart from fullness, not fear — and I remain myself inside the love.', tarotPairing: 'The Lovers / Two of Cups' },
    warrior: { name: 'The Warrior', tagline: 'The one who acts for what matters.', gift: 'You bring discipline, courage, and follow-through. You protect what you love and move when others freeze. Your word is your weapon.', shadow: 'The wounded Warrior becomes the bully — fighting for the sake of fighting, turning every conversation into combat, or burning out in service of a cause. The shadow can also collapse into the coward who stays silent.', integration: 'Fight for, not just against. Rest is not retreat. The sword and the sheath both belong to the Warrior.', affirmation: 'I act with discipline and care — I know when to move and when to rest.', tarotPairing: 'The Chariot / Knight of Swords' },
    magician: { name: 'The Magician', tagline: 'The one who sees beneath.', gift: 'You read the hidden patterns. You transform — yourself, a room, a relationship, a problem — by seeing what others don\'t. Knowledge is your weapon and your gift.', shadow: 'The wounded Magician manipulates. Uses insight to control, withholds truth as power, or becomes a detached observer who refuses to live. The shadow can also be the charlatan — mistaking knowing about for knowing.', integration: 'Translate your insight into real service to other people. Teach what you know. Let yourself be transformed, not just be the one who transforms.', affirmation: 'I use my sight to illuminate, not to dominate.', tarotPairing: 'The Magician / The High Priestess' },
    sovereign: { name: 'The Sovereign', tagline: 'The one who sets the standard.', gift: 'You see the whole field and take responsibility for it. You create order, set vision, and hold the wellbeing of the group. Others find their place near you.', shadow: 'The wounded Sovereign becomes the tyrant — controlling, rigid, taking everything personally. Or collapses into the abdicator: refusing the throne out of fear of its weight.', integration: 'Lead for the people, not from the ego. Delegate. Let others be sovereigns too.', affirmation: 'I hold my power in service of something larger than myself.', tarotPairing: 'The Emperor / The Empress' },
    sage: { name: 'The Sage', tagline: 'The one who sees clearly from the edge.', gift: 'You stay calm in chaos. You ask the questions no one else is asking. You bring long-range wisdom and the patience to tell the truth without needing the credit.', shadow: 'The wounded Sage becomes the cynic — knowing, detached, refusing to act or feel. Or the ivory-tower recluse who won\'t come down from the mountain.', integration: 'Wisdom that stays inside you becomes bitter. Teach. Get close. Risk being wrong.', affirmation: 'I step down from the mountain and walk among the people I love.', tarotPairing: 'The Hermit / The Hierophant' },
    innocent: { name: 'The Innocent', tagline: 'The one who keeps faith.', gift: 'You protect hope. You see goodness where others see rot. Your trust, optimism, and simplicity are a gift to the people around you.', shadow: 'The wounded Innocent refuses to see shadow at all — naive to harm, stuck in fantasy, or trapped in a perpetual "it will be fine" that blocks real action.', integration: 'Keep your faith but earn your eyes. You can be hopeful AND clear-eyed. Both / and.', affirmation: 'I keep hope with open eyes.', tarotPairing: 'The Fool / The Star' },
    explorer: { name: 'The Explorer', tagline: 'The one who keeps moving.', gift: 'You find the edge. You know new territory is where you come alive, and you show others that the life they have is not the only life possible. Freedom is your medicine.', shadow: 'The wounded Explorer runs — from intimacy, from follow-through, from the ordinary life that would actually grow them. The shadow keeps leaving just before anything gets real.', integration: 'Stay. Go deep in one place. The new territory you haven\'t explored yet may be intimacy, not geography.', affirmation: 'I travel both outward and inward — some of my deepest exploration happens in staying.', tarotPairing: 'The Fool / Knight of Wands' },
  },
  ja: {
    lover: { name: 'ラバー', tagline: '開いていられる人。', gift: 'あなたはつながりを先に立てる。力を発揮しているとき、人生は温かく、官能的で、意味にあふれる。行く先々に「居場所」を生み出す。', shadow: '傷つくとラバーは溺れる——共依存、執着、他者の中で自分を失う。あるいは真逆——傷つかないために完全に閉じてしまう。', integration: '自己理解を錨にする。与えることが強迫ではなく選択になるように。溶け合わずに愛する練習を。', affirmation: '恐れではなく満ちたところから心を開き、愛の中でも自分であり続ける。', tarotPairing: '恋人 ／ カップの2' },
    warrior: { name: 'ウォリアー', tagline: '大切なもののために動く人。', gift: '規律と勇気、最後までやり抜く力をもたらす。愛するものを守り、他人が固まるときに動く。言葉こそ武器。', shadow: '傷ついたウォリアーは傷つける側になる——戦うために戦い、会話が戦闘になり、大義のために燃え尽きる。あるいは沈黙する臆病者へと崩れる。', integration: '「反対する」より「守る」ために戦う。休むことは撤退ではない。剣と鞘、どちらもウォリアーのもの。', affirmation: '規律と慈しみをもって動く——進むときと休むときが、私にはわかっている。', tarotPairing: '戦車 ／ ソードのナイト' },
    magician: { name: 'マジシャン', tagline: '下側が見える人。', gift: '隠れたパターンを読む。自分、場、関係、問題——他人に見えないものを見ることで、変容を起こす。知こそ武器であり、贈り物。', shadow: '傷ついたマジシャンは操作する。洞察を支配に使い、真実を権力として差し控え、生きずに観察する側に回る。あるいは「知っていること」を「理解している」と取り違える詐欺師に。', integration: '洞察を他者への具体的な奉仕に翻訳する。教える。変える人だけでなく、変えられる人にもなる。', affirmation: '見る力を、支配ではなく照らすことに使う。', tarotPairing: '魔術師 ／ 女教皇' },
    sovereign: { name: 'ソブリン', tagline: '基準を立てる人。', gift: '場全体を見渡し、その責任を引き受ける。秩序をつくり、ビジョンを示し、集団の健やかさを抱える。そばで皆が自分の場所を見つける。', shadow: '傷ついたソブリンは暴君になる——支配し、硬直し、すべてを個人攻撃と受け取る。あるいは放棄者へ——玉座の重さを恐れて退く。', integration: 'エゴからではなく、人々のために導く。委ねる。他人もまたソブリンになれるようにする。', affirmation: '自分より大きなもののために、力を握る。', tarotPairing: '皇帝 ／ 女帝' },
    sage: { name: 'セージ', tagline: '端から澄んで見る人。', gift: '混乱の中で静かである。誰も問わない問いを立てる。手柄なしで真実を伝える忍耐と、長射程の叡智を携える。', shadow: '傷ついたセージは冷笑家になる——知っていて、離れ、動かず、感じない。あるいは山から降りない象牙の塔の隠者に。', integration: '内側に留まる叡智は苦くなる。教える。近づく。間違うリスクを引き受ける。', affirmation: '山を降りて、私は愛する人たちの間を歩く。', tarotPairing: '隠者 ／ 教皇' },
    innocent: { name: 'イノセント', tagline: '信を保つ人。', gift: '希望を守る。他人が腐敗を見るところに、あなたは善を見る。信頼、楽観、簡素さが、周囲への贈り物となる。', shadow: '傷ついたイノセントは、影そのものを見ようとしない——危険にナイーブで、幻想に縛られ、「大丈夫さ」が現実の行動を妨げる。', integration: '信を保ちつつ、目を鍛える。希望的かつ澄んだ目でいられる。「どちらも」の姿勢を。', affirmation: '目を開いたまま、希望を保つ。', tarotPairing: '愚者 ／ 星' },
    explorer: { name: 'エクスプローラー', tagline: '動き続ける人。', gift: '縁を見つける。新しい土地で息を取り戻すと知っている。今ある生だけが生ではないと示す。自由こそ、あなたの薬。', shadow: '傷ついたエクスプローラーは逃げる——親密さから、やり抜きから、本当は成長させてくれるはずの平凡な生活から。何かが本気になる直前に去り続ける。', integration: '留まる。ひとつの場所で深く潜る。まだ行っていない新領域は、地理ではなく親密さかもしれない。', affirmation: '外へも内へも旅をする——もっとも深い探検は、留まることの中に起きる。', tarotPairing: '愚者 ／ ワンドのナイト' },
  },
  ko: {
    lover: { name: '연인', tagline: '계속 열어 두는 사람.', gift: '당신은 연결을 먼저 세웁니다. 힘을 발휘할 때 삶은 따뜻하고 관능적이며 의미로 가득해집니다. 당신이 가는 곳마다 소속감이 생겨납니다.', shadow: '상처 입은 연인은 가라앉습니다 — 공의존, 집착, 타인 안에서 나를 잃음. 반대로 상처받지 않기 위해 완전히 닫아버리는 모습으로도 드러납니다.', integration: '자기 이해에 닻을 내립니다. 당신의 나눔이 강박이 아니라 선택이 되도록. 녹아들지 않고 사랑하는 연습을.', affirmation: '두려움이 아니라 충만함에서 마음을 열고, 사랑 안에서도 나로 남는다.', tarotPairing: '연인 / 컵 2' },
    warrior: { name: '전사', tagline: '중요한 것을 위해 움직이는 사람.', gift: '규율과 용기, 끝까지 해내는 힘을 가져옵니다. 사랑하는 것을 지키고, 남들이 얼어붙을 때 움직입니다. 당신의 말이 곧 무기입니다.', shadow: '상처 입은 전사는 괴롭히는 사람이 됩니다 — 싸움 자체를 위한 싸움, 모든 대화가 전투가 되는 것, 대의를 위해 불타 없어지는 것. 혹은 침묵하는 겁쟁이로 주저앉습니다.', integration: '반대하기 위해서가 아니라 지키기 위해 싸웁니다. 쉼은 후퇴가 아닙니다. 검과 칼집, 둘 다 전사의 것입니다.', affirmation: '규율과 돌봄으로 움직인다 — 나아갈 때와 쉬어야 할 때를 안다.', tarotPairing: '전차 / 소드 기사' },
    magician: { name: '마법사', tagline: '표면 아래를 보는 사람.', gift: '숨은 패턴을 읽습니다. 자신, 방, 관계, 문제 — 남이 보지 못하는 것을 봄으로써 변화를 일으킵니다. 앎이 당신의 무기이자 선물입니다.', shadow: '상처 입은 마법사는 조종합니다. 통찰을 지배에 쓰고, 진실을 권력처럼 붙들며, 살지 않고 관찰만 합니다. 혹은 "아는 것"과 "이해하는 것"을 혼동하는 사기꾼이 됩니다.', integration: '통찰을 타인을 위한 구체적인 쓰임으로 번역합니다. 가르치세요. 변화시키는 사람이 아니라, 변화받는 사람도 되어 보세요.', affirmation: '시선을 지배가 아니라 밝힘에 쓴다.', tarotPairing: '마법사 / 여사제' },
    sovereign: { name: '왕권', tagline: '기준을 세우는 사람.', gift: '전체를 보고 그것에 책임집니다. 질서를 만들고 비전을 세우며 집단의 안녕을 품습니다. 당신 곁에서 사람들은 자기 자리를 찾습니다.', shadow: '상처 입은 왕권은 폭군이 됩니다 — 통제하고, 경직되며, 모든 것을 개인적으로 받아들임. 혹은 왕좌의 무게가 두려워 물러나는 포기자가 됩니다.', integration: '에고가 아니라 사람들을 위해 이끕니다. 위임합니다. 다른 사람도 왕권이 되도록 합니다.', affirmation: '나보다 더 큰 것을 위해 내 힘을 쥔다.', tarotPairing: '황제 / 여황제' },
    sage: { name: '현자', tagline: '가장자리에서 또렷이 보는 사람.', gift: '혼란 속에서 차분합니다. 누구도 던지지 않는 질문을 합니다. 공 없이 진실을 말하는 인내와 장기적 지혜를 가져옵니다.', shadow: '상처 입은 현자는 냉소가가 됩니다 — 알지만 거리를 두고, 움직이지 않으며, 느끼지 않음. 혹은 산에서 내려오지 않는 상아탑의 은둔자가 됩니다.', integration: '안에만 머무는 지혜는 쓰디쓴 것이 됩니다. 가르치세요. 다가가세요. 틀릴 위험을 감수하세요.', affirmation: '산에서 내려와, 사랑하는 사람들 사이를 걷는다.', tarotPairing: '은둔자 / 교황' },
    innocent: { name: '순수자', tagline: '신뢰를 지키는 사람.', gift: '희망을 지킵니다. 남이 부패를 볼 때 당신은 선을 봅니다. 신뢰, 낙관, 단순함이 주변에 주는 선물이 됩니다.', shadow: '상처 입은 순수자는 그림자 자체를 보지 않으려 합니다 — 해악에 순진하고, 환상에 갇히며, "괜찮을 거야"가 실제 행동을 막습니다.', integration: '믿음을 유지하되 눈을 단련하세요. 희망적이면서도 또렷할 수 있습니다. "둘 다"의 태도로.', affirmation: '눈을 뜨고서도 희망을 지킨다.', tarotPairing: '바보 / 별' },
    explorer: { name: '탐험가', tagline: '계속 움직이는 사람.', gift: '경계를 찾습니다. 새로운 지형에서 생기를 되찾는다는 것을 알고 있으며, 지금 삶이 유일한 삶이 아님을 보여줍니다. 자유가 당신의 약입니다.', shadow: '상처 입은 탐험가는 도망칩니다 — 친밀함에서, 끝까지 해내는 것에서, 사실은 성장시켜 줄 평범한 삶에서. 무엇이 진짜가 되기 직전에 늘 떠납니다.', integration: '머무릅니다. 한 곳에서 깊이 들어가 보세요. 아직 가보지 않은 새 지형은, 지리가 아니라 친밀함일 수도 있습니다.', affirmation: '바깥과 안, 둘 다 여행한다 — 가장 깊은 탐험은 머물 때 일어난다.', tarotPairing: '바보 / 완드 기사' },
  },
  zh: {
    lover: { name: '情人', tagline: '愿意保持敞开的人。', gift: '你以连结为先。当你处于自己的力量中，生活温暖、感性、充满意义。你所到之处都会生出归属感。', shadow: '受伤的情人会被吞没——共依附、执念、或在他人身上迷失自己。阴影也可能以相反的方式出现：为了不再受伤，彻底关闭自己。', integration: '以自我认识为锚，让你的给予是一种选择而非强迫。学习既爱、又不融没。', affirmation: '我从丰盈而非恐惧中敞开心，也在爱里保持自己。', tarotPairing: '恋人 ／ 圣杯二' },
    warrior: { name: '战士', tagline: '为重要之事行动的人。', gift: '你带来纪律、勇气与贯彻。你保护所爱，在别人僵住时行动。言语即你的武器。', shadow: '受伤的战士变成了霸凌者——为战而战、把每一次对话都化作战斗、为一桩事业燃尽自己；又或坍缩为沉默的懦夫。', integration: '为而战，而不仅是反而战。休息不是退却。剑与鞘，都属于战士。', affirmation: '我以纪律与关怀行动——我知道何时出手，何时歇息。', tarotPairing: '战车 ／ 宝剑骑士' },
    magician: { name: '魔法师', tagline: '看得见表面之下的人。', gift: '你读懂隐藏的模式。你通过看见别人看不见之物，去转化——自己、一个房间、一段关系、一道难题。知识是你的武器，也是你的礼物。', shadow: '受伤的魔法师开始操纵：把洞见用于掌控、把真相当作权力来扣留、或变成拒绝活着的冷眼旁观者。也可能成为把「知道关于」当成「真正理解」的江湖术士。', integration: '把你的洞见翻译成对他人的实际服务。去教授。让自己也被转化，而不是只做那位转化他人的人。', affirmation: '我用我的视线去照亮，而不是去掌控。', tarotPairing: '魔术师 ／ 女祭司' },
    sovereign: { name: '君主', tagline: '立起标准的人。', gift: '你看得见整片场域并愿意为它担当。你创造秩序、立起愿景、抱持群体的福祉。在你身边，人们找到自己的位置。', shadow: '受伤的君主变成暴君——控制、僵硬、把一切视为针对自己；或坍缩为让位者：因害怕王座的重量而拒绝即位。', integration: '为众人而领导，不从自我出发。学会授权。让他人也成为自己的君主。', affirmation: '我把我的力量，握在一件比自己更大的事之中。', tarotPairing: '皇帝 ／ 女皇' },
    sage: { name: '贤者', tagline: '从边缘看得清的人。', gift: '你在混乱中保持安静。你发问无人发问的问题。你带来长程的智慧，以及不需要功劳也能说出真相的耐心。', shadow: '受伤的贤者变成犬儒——知、且疏离、既不行动也不动情；或成为不下山的象牙塔隐士。', integration: '只留在内里的智慧会变苦。去教。去靠近。去承担犯错的风险。', affirmation: '我从山上走下来，走进我所爱的人群。', tarotPairing: '隐士 ／ 教皇' },
    innocent: { name: '天真者', tagline: '守住信念的人。', gift: '你守护希望。在他人看见腐败之处，你看见善意。你的信任、乐观与简朴，是送给周围人的礼物。', shadow: '受伤的天真者拒绝去看阴影——对伤害天真、困在幻想里、被一句"没事会好起来"永久卡住，阻碍真实的行动。', integration: '保有信念，同时锻炼你的眼。你可以既怀抱希望、又目光清明。兼得。', affirmation: '我睁着眼，同时守住希望。', tarotPairing: '愚者 ／ 星' },
    explorer: { name: '探险者', tagline: '不停移动的人。', gift: '你找到边界。你知道新的领域会让你鲜活起来，并让他人看见：现有的人生不是唯一可能的人生。自由是你的药。', shadow: '受伤的探险者在逃——逃离亲密、逃离贯彻、逃离那些本来会让他们真正长大的平凡生活。总在任何事将要变得真实之前离开。', integration: '留下。在一个地方往深里走。你还未探索过的新领域，也许是亲密，而不是地理。', affirmation: '我向外也向内旅行——我最深的探索，发生在停留之中。', tarotPairing: '愚者 ／ 权杖骑士' },
  },
};

const ELEMENT_AFFINITY = {
  en: {
    title: 'Element Affinity',
    description: 'Ten quick questions to discover which of the four classical elements most echoes how you actually live — fire, water, air, or earth. Pairs with your astrology chart\'s native element for a "chart says X, behaviour says Y" comparison.',
    timeEstimate: '2 min',
    whatYouGet: ['Your behavioural element (fire/water/air/earth)', 'How it differs from your astrology chart element', 'Strengths, shadow, and when it\'s running the show', 'An affirmation to carry'],
    questions: {
      el1: { text: 'My natural pace is best described as…', options: { 1: 'Fast and forward.', 2: 'Ebbs and flows with my mood.', 3: 'Mental before physical.', 4: 'Steady and unhurried.' } },
      el2: { text: 'What do you crave most when the day gets rough?', options: { 1: 'Movement — something physical or creative.', 2: 'Softness — a bath, a hug, good food.', 3: 'Information — a podcast, a conversation, a reframe.', 4: 'Grounding — routine, garden, body work.' } },
      el3: { text: 'My creative fuel is…', options: { 1: 'Passion — I make from heat.', 2: 'Emotion — I make from feeling.', 3: 'Ideas — I make from concepts.', 4: 'Craft — I make from refinement and skill.' } },
      el4: { text: 'A meaningful gift to me is…', options: { 1: 'An experience or adventure.', 2: 'A hand-written note or something sentimental.', 3: 'A book, a conversation, or a new idea.', 4: 'Something beautifully made or useful for my home.' } },
      el5: { text: 'I get stuck when…', options: { 1: "I'm forced to sit still for too long.", 2: "I'm disconnected from people I love.", 3: "I don't understand what's going on.", 4: 'My routine / environment feels chaotic.' } },
      el6: { text: 'My ideal environment has…', options: { 1: 'Light, energy, movement.', 2: 'Water, softness, warmth.', 3: 'Books, conversation, airy space.', 4: 'Plants, texture, materials I can touch.' } },
      el7: { text: 'What do you spend money on most easily?', options: { 1: 'Experiences, travel, tickets.', 2: 'Beauty, care, gifts for loved ones.', 3: 'Books, courses, information.', 4: 'Home, quality tools, long-lasting items.' } },
      el8: { text: 'Under pressure, my default move is…', options: { 1: 'Push harder and move faster.', 2: 'Withdraw into feelings, people, comfort.', 3: 'Analyse and rework the strategy.', 4: 'Simplify, slow down, return to basics.' } },
      el9: { text: 'A compliment that would land hardest is…', options: { 1: '"You make things happen."', 2: '"You make people feel seen."', 3: '"You make things make sense."', 4: '"You make things last."' } },
      el10: { text: 'The season I love most is…', options: { 1: 'Summer — heat, long days, intensity.', 2: 'Autumn — the poetry of change.', 3: 'Spring — fresh ideas, new light.', 4: 'Winter — stillness, depth, root time.' } },
    },
  },
  ja: {
    title: 'エレメント親和性',
    description: '4つの古典元素——火・水・風・地——のうち、実際の生き方にいちばん響いているのはどれか、10問でさっとわかります。あなたの星占い（ネイタル）の元素と並べれば「チャートはXだけど、ふるまいはY」という対比も見えます。',
    timeEstimate: '2分',
    whatYouGet: ['ふるまいとしての元素（火／水／風／地）', '星占いチャートの元素との違い', '強み・影・主役になっているときの特徴', '持ち帰るアファメーション'],
    questions: {
      el1: { text: '自分のペースを一番よく表しているのは——', options: { 1: '速く、前のめり。', 2: '気分に合わせて満ち引きする。', 3: '身体より先に頭が動く。', 4: '安定して、急がない。' } },
      el2: { text: '一日がつらいときに、いちばん欲しくなるのは？', options: { 1: '動き——身体か創作で。', 2: 'やわらかさ——お風呂、ハグ、美味しいもの。', 3: '情報——ポッドキャスト、会話、見方の置き換え。', 4: '地に着く感覚——ルーティン、庭、身体を整える時間。' } },
      el3: { text: '創作の燃料は——', options: { 1: '情熱——熱から作る。', 2: '感情——感覚から作る。', 3: 'アイデア——概念から作る。', 4: '技——磨きと手さばきから作る。' } },
      el4: { text: '自分にとって意味のある贈り物は——', options: { 1: '体験や冒険。', 2: '手書きの手紙、思い出のあるもの。', 3: '本、会話、新しい視点。', 4: '美しく作られたもの、家で使えるもの。' } },
      el5: { text: 'つまずくのは——', options: { 1: 'じっと長く座らされるとき。', 2: '愛する人たちと切り離されたとき。', 3: '何が起きているかが理解できないとき。', 4: 'ルーティンや環境が散らかっていると感じるとき。' } },
      el6: { text: '理想の環境は——', options: { 1: '光、エネルギー、動き。', 2: '水、やわらかさ、温もり。', 3: '本、会話、風通しのいい空間。', 4: '植物、手ざわり、触れられる素材。' } },
      el7: { text: '気軽に使うお金は？', options: { 1: '体験、旅、チケット。', 2: '美しさ、ケア、大切な人への贈り物。', 3: '本、講座、情報。', 4: '家、良い道具、長く使えるもの。' } },
      el8: { text: '圧がかかったとき、つい取る動きは——', options: { 1: 'さらに押し、もっと速く動く。', 2: '感情・人・心地よさに退く。', 3: '分析し、戦略を組み直す。', 4: '簡素にし、ゆるめ、基本に戻る。' } },
      el9: { text: 'いちばん刺さるであろう褒め言葉は——', options: { 1: '「あなたは物事を起こす人だ」。', 2: '「あなたは人に“見えている”感覚を与える人だ」。', 3: '「あなたは物事を腑に落とす人だ」。', 4: '「あなたは物事を持続させる人だ」。' } },
      el10: { text: '一番好きな季節は——', options: { 1: '夏——熱、長い昼、強度。', 2: '秋——移ろいの詩。', 3: '春——新しい発想、新しい光。', 4: '冬——静けさ、深さ、根の時間。' } },
    },
  },
  ko: {
    title: '원소 친화성',
    description: '네 개의 고전 원소 — 불·물·공기·흙 — 중 지금 당신이 실제로 살아가는 방식에 가장 울리는 것은 무엇인지, 10문항으로 빠르게 알아봅니다. 별자리 차트의 원소와 맞춰 "차트는 X인데 행동은 Y"라는 대비도 볼 수 있습니다.',
    timeEstimate: '2분',
    whatYouGet: ['행동의 원소(불/물/공기/흙)', '별자리 차트 원소와의 차이', '강점·그림자·주도적으로 작동할 때의 특징', '가져갈 아파메이션'],
    questions: {
      el1: { text: '나의 자연스러운 속도를 가장 잘 설명하는 것은…', options: { 1: '빠르고 앞으로.', 2: '기분에 따라 오르내린다.', 3: '몸보다 머리가 먼저 움직인다.', 4: '꾸준하고 서두르지 않는다.' } },
      el2: { text: '하루가 거칠어질 때 가장 원하는 건?', options: { 1: '움직임 — 몸이나 창작으로.', 2: '부드러움 — 목욕, 포옹, 맛있는 음식.', 3: '정보 — 팟캐스트, 대화, 시점 바꾸기.', 4: '닻내림 — 루틴, 정원, 몸 일.' } },
      el3: { text: '창작의 연료는…', options: { 1: '열정 — 열기에서 만든다.', 2: '감정 — 느낌에서 만든다.', 3: '아이디어 — 개념에서 만든다.', 4: '기예 — 다듬음과 손기술에서 만든다.' } },
      el4: { text: '나에게 의미 있는 선물은…', options: { 1: '경험이나 모험.', 2: '손으로 쓴 편지나 감성적인 무언가.', 3: '책, 대화, 새 아이디어.', 4: '잘 만들어졌거나 집에서 쓸 수 있는 물건.' } },
      el5: { text: '내가 막히는 건…', options: { 1: '너무 오래 가만히 있어야 할 때.', 2: '사랑하는 사람들과 단절됐을 때.', 3: '무슨 일이 벌어지는지 이해가 안 될 때.', 4: '루틴이나 환경이 어수선할 때.' } },
      el6: { text: '나의 이상적 환경은…', options: { 1: '빛, 에너지, 움직임.', 2: '물, 부드러움, 온기.', 3: '책, 대화, 환한 공간.', 4: '식물, 질감, 만질 수 있는 재료.' } },
      el7: { text: '쉽게 돈을 쓰는 곳은?', options: { 1: '경험, 여행, 티켓.', 2: '아름다움, 돌봄, 사랑하는 이를 위한 선물.', 3: '책, 강의, 정보.', 4: '집, 좋은 도구, 오래가는 물건.' } },
      el8: { text: '압박 아래에서의 기본 반응은…', options: { 1: '더 세게 밀고, 더 빨리 움직인다.', 2: '감정, 사람, 편안함으로 물러난다.', 3: '분석하고 전략을 다시 짠다.', 4: '단순하게 하고, 느리게 하고, 기본으로 돌아간다.' } },
      el9: { text: '가장 와닿는 칭찬은…', options: { 1: '"당신은 일이 벌어지게 한다."', 2: '"당신은 사람들을 보이는 존재로 만든다."', 3: '"당신은 일이 말이 되게 한다."', 4: '"당신은 일이 오래가게 한다."' } },
      el10: { text: '가장 좋아하는 계절은…', options: { 1: '여름 — 열기, 긴 낮, 강도.', 2: '가을 — 변화의 시.', 3: '봄 — 새 아이디어, 새 빛.', 4: '겨울 — 고요, 깊이, 뿌리의 시간.' } },
    },
  },
  zh: {
    title: '元素亲和',
    description: '十道题，迅速看出在四大古典元素——火、水、风、土——之中，哪一个最贴近你现在真正的生活方式。与星盘的本命元素对照，便可看见「星盘说 X，行为说 Y」的对比。',
    timeEstimate: '2 分钟',
    whatYouGet: ['你的行为元素（火／水／风／土）', '与星盘本命元素的差异', '强项、阴影、以及它主导时的样子', '可带走的肯定语'],
    questions: {
      el1: { text: '描述我自然节奏的是——', options: { 1: '快速、向前。', 2: '随心情潮起潮落。', 3: '脑子在身体前。', 4: '稳定、不急。' } },
      el2: { text: '当一天变得艰难时，最想要的是什么？', options: { 1: '运动——身体或创作上的。', 2: '柔软——一场泡澡、一个拥抱、一顿好饭。', 3: '信息——播客、对话、换个角度。', 4: '接地——规律、园艺、身体练习。' } },
      el3: { text: '我的创作燃料是——', options: { 1: '热情——我从热度里创造。', 2: '情感——我从感受里创造。', 3: '思想——我从概念里创造。', 4: '技艺——我在打磨与手艺里创造。' } },
      el4: { text: '对我有意义的礼物是——', options: { 1: '一次体验或冒险。', 2: '一封手写信或有情感的东西。', 3: '一本书、一次对话、一个新视角。', 4: '精美的手工或家里好用的物件。' } },
      el5: { text: '我卡住的时刻是——', options: { 1: '被迫长时间静坐时。', 2: '与所爱的人断开连接时。', 3: '搞不懂正在发生什么时。', 4: '规律或环境混乱时。' } },
      el6: { text: '我理想的环境里有——', options: { 1: '光、能量、动。', 2: '水、柔软、温度。', 3: '书、对话、通透的空间。', 4: '植物、质感、可触摸的材料。' } },
      el7: { text: '我最容易花钱在？', options: { 1: '体验、旅行、门票。', 2: '美、照顾、给所爱之人的礼物。', 3: '书、课程、信息。', 4: '家、好工具、能长用之物。' } },
      el8: { text: '压力下我的默认反应是——', options: { 1: '更用力地推、跑得更快。', 2: '退回到情感、人、安抚里。', 3: '分析并重构策略。', 4: '简化、放慢、回到基础。' } },
      el9: { text: '最能打中我的赞美是——', options: { 1: '「你让事情发生。」', 2: '「你让人感到被看见。」', 3: '「你让事情变得有条理。」', 4: '「你让事情能够长久。」' } },
      el10: { text: '我最爱的季节是——', options: { 1: '夏——炽热、长日、浓度。', 2: '秋——变化的诗。', 3: '春——新意与新光。', 4: '冬——静、深、回到根部的时节。' } },
    },
  },
};

const ELEMENTS_INFO_I18N = {
  en: {
    fire: { name: 'Fire', tagline: 'Spark, passion, forward motion.', description: 'Fire lives through passion and velocity. You create from heat — inspired action, bold initiative, the will to begin. When you are in your element, life feels intense, creative, and directional.', strengths: ['Initiative', 'Courage', 'Charisma', 'Creative drive'], shadow: ['Burnout', 'Impatience', 'Scattered follow-through', 'Explosive temper'], whenDominant: 'You start more than you finish — not a weakness, a signature. Build structure around you that finishes for you, or partner with an Earth-leaning teammate.', affirmation: 'My spark is valuable — I honour both when to ignite and when to rest the embers.' },
    water: { name: 'Water', tagline: 'Feeling, intuition, connection.', description: 'Water lives through emotion and attunement. You know the room before anyone speaks. You create from feeling, love from depth, and heal by holding space. You are porous by design.', strengths: ['Empathy', 'Intuition', 'Emotional depth', 'Capacity for intimacy'], shadow: ['Overwhelm', "Absorbing others' feelings", 'Moodiness', 'Merger / loss of self'], whenDominant: 'Your gift is your permeability — also your hardest edge. Learn to tend your own cup first. Water without banks becomes a flood.', affirmation: 'I feel everything and I stay myself.' },
    air: { name: 'Air', tagline: 'Thought, language, clarity.', description: 'Air lives through mind. You connect ideas, name what others can\'t, and move by understanding. Conversations, books, language, breath — these are your medicine and your medium.', strengths: ['Clarity', 'Curiosity', 'Communication', 'Adaptability'], shadow: ['Overthinking', 'Detachment from the body', 'Intellectualising emotion', 'Difficulty landing a decision'], whenDominant: 'Get in your body. Let thoughts turn into action without needing another round of analysis. The mind is a great servant and a terrible master.', affirmation: 'I think to understand, and I live to land.' },
    earth: { name: 'Earth', tagline: 'Craft, body, steady building.', description: 'Earth lives through matter. You create with your hands, know through your body, and build for the long road. Stability is not boring to you — it is the ground for everything else.', strengths: ['Patience', 'Craftsmanship', 'Reliability', 'Sensory wisdom'], shadow: ['Rigidity', 'Resistance to change', 'Materialism', 'Shutting down when plans break'], whenDominant: 'Your gift is durability. Your risk is staying too long. Let some things end so new things can root.', affirmation: 'I build for the long road and allow seasons to turn.' },
    chartVsBehaviour: 'Chart vs. behaviour',
    matchNote: 'Your behavioural element matches your astrology chart — you\'re living in alignment with your native energy.',
    differNote: 'Your chart says {{natal}} but your behaviour says {{behaviour}} — worth noticing where you\'re stretching.',
  },
  ja: {
    fire: { name: '火', tagline: '火花、情熱、前進。', description: '火は情熱と速度で生きる。熱から創る——ひらめきの行動、大胆な起動、始める意志。本領を発揮するとき、人生は濃密で、創造的で、方向を持つ。', strengths: ['起動力', '勇気', 'カリスマ', '創造的ドライブ'], shadow: ['燃え尽き', '性急さ', '散らかる詰め', '爆発的な怒り'], whenDominant: '始める数が終える数より多い——弱点ではなく、あなたの署名。完結させてくれる構造を周りに作るか、地の気質の仲間と組もう。', affirmation: 'この火花は価値がある——点けるときと、残り火を休ませるとき、両方を敬う。' },
    water: { name: '水', tagline: '感情、直感、つながり。', description: '水は感情と調律で生きる。誰も口を開く前から場を知る。感情から創り、深さから愛し、場を抱くことで癒す。あなたは設計からして透過的だ。', strengths: ['共感', '直感', '感情の深さ', '親密さへの容量'], shadow: ['飲み込まれる', '他者の感情を吸う', '気分の波', '溶け込み・自己喪失'], whenDominant: 'あなたの贈り物は透過性——そして最も厳しい縁でもある。まず自分の杯を先に世話すること。岸のない水は洪水になる。', affirmation: 'すべてを感じて、自分であり続ける。' },
    air: { name: '風', tagline: '思考、言語、澄み。', description: '風は心で生きる。アイデアを結び、他人に名付けられないものに名前を与え、理解で動く。会話、本、言葉、呼吸——これらが薬であり媒体。', strengths: ['明晰さ', '好奇心', '伝える力', '適応性'], shadow: ['考えすぎ', '身体からの切断', '感情を理屈化', '決断を落とせない'], whenDominant: '身体に戻ろう。もう一度の分析なしに、思考を行動に変える。心は素晴らしい従者であり、恐ろしい主人である。', affirmation: '理解するために考え、着地するために生きる。' },
    earth: { name: '地', tagline: '技、身体、着実な構築。', description: '地は物質で生きる。手で創り、身体で知り、長い道のために築く。安定はあなたにとって退屈ではない——他すべての地面である。', strengths: ['忍耐', '職人性', '信頼性', '感覚の智慧'], shadow: ['硬直', '変化への抵抗', '物質主義', '計画が崩れたときの遮断'], whenDominant: 'あなたの贈り物は耐久。リスクは留まりすぎ。新しいものが根づけるよう、いくつかは終えていい。', affirmation: '長い道のために築き、季節のめぐりを許す。' },
    chartVsBehaviour: 'チャート vs. ふるまい',
    matchNote: 'ふるまいの元素はチャートと一致——ネイティブなエネルギーと揃って生きている。',
    differNote: 'チャートは {{natal}} だけど、ふるまいは {{behaviour}}——どこで伸びているか、見ておく価値がある。',
  },
  ko: {
    fire: { name: '불', tagline: '불꽃, 열정, 전진.', description: '불은 열정과 속도로 산다. 열기에서 만든다 — 영감 어린 행동, 대담한 시동, 시작하려는 의지. 본령을 발휘할 때 삶은 강렬하고, 창조적이며, 방향이 선다.', strengths: ['추진력', '용기', '카리스마', '창조적 드라이브'], shadow: ['번아웃', '조급함', '흩어지는 마무리', '폭발적 기질'], whenDominant: '끝내는 것보다 시작하는 게 더 많다 — 약점이 아니라 당신의 서명. 마무리해 줄 구조를 곁에 두거나, 흙 기질 동료와 팀을 이루세요.', affirmation: '나의 불꽃은 소중하다 — 불을 붙일 때와 잿불을 쉬게 할 때, 둘 다 존중한다.' },
    water: { name: '물', tagline: '느낌, 직관, 연결.', description: '물은 감정과 조율로 산다. 누구도 입을 열기 전에 방을 안다. 느낌에서 창조하고, 깊이로 사랑하고, 공간을 품어 치유한다. 당신은 설계상 투과적이다.', strengths: ['공감', '직관', '감정의 깊이', '친밀함의 용량'], shadow: ['삼켜짐', '타인의 감정 흡수', '기분의 파동', '녹아들며 자기 상실'], whenDominant: '당신의 선물은 투과성 — 또한 가장 가혹한 가장자리다. 자신의 잔을 먼저 돌보세요. 둑이 없는 물은 홍수가 됩니다.', affirmation: '모든 것을 느끼며, 나로 남는다.' },
    air: { name: '공기', tagline: '사유, 언어, 투명함.', description: '공기는 마음으로 산다. 아이디어를 잇고, 남들이 이름 붙이지 못하는 것에 이름을 붙이며, 이해로 움직인다. 대화, 책, 언어, 호흡 — 이것이 당신의 약이며 매체다.', strengths: ['명료함', '호기심', '의사소통', '적응력'], shadow: ['과도한 사유', '몸에서 분리', '감정의 지적화', '결정을 내리지 못함'], whenDominant: '몸으로 돌아오세요. 한 번 더 분석할 필요 없이 생각을 행동으로 전환해요. 마음은 훌륭한 하인이고, 끔찍한 주인입니다.', affirmation: '이해하기 위해 생각하고, 착지하기 위해 산다.' },
    earth: { name: '흙', tagline: '기예, 몸, 꾸준한 쌓음.', description: '흙은 물질로 산다. 손으로 만들고, 몸으로 알며, 긴 길을 위해 짓는다. 안정은 당신에게 지루함이 아니다 — 다른 모든 것의 바닥이다.', strengths: ['인내', '기예성', '신뢰성', '감각의 지혜'], shadow: ['경직', '변화에 대한 저항', '물질주의', '계획이 깨질 때의 차단'], whenDominant: '당신의 선물은 내구성. 위험은 너무 오래 머무르는 것. 새 것이 뿌리내릴 수 있게 일부는 끝내세요.', affirmation: '먼 길을 위해 짓고, 계절의 순환을 허락한다.' },
    chartVsBehaviour: '차트 vs. 행동',
    matchNote: '당신의 행동 원소가 별자리 차트와 일치합니다 — 본래의 에너지와 나란히 살고 있어요.',
    differNote: '차트는 {{natal}}라고 말하지만 행동은 {{behaviour}}라고 말해요 — 당신이 어디서 늘어지고 있는지 살펴볼 가치가 있어요.',
  },
  zh: {
    fire: { name: '火', tagline: '火花、热情、前行。', description: '火以热情与速度而生。你从热度里创造——受启发的行动、大胆的发起、开始的意志。当你处于本位，生活浓烈、富创造、带方向。', strengths: ['发起力', '勇气', '魅力', '创造的驱动'], shadow: ['燃尽', '急躁', '收尾散乱', '暴烈的脾气'], whenDominant: '你开始的多于完成的——不是弱点，而是你的签名。在周围搭出能替你完成的结构，或与土系同伴搭档。', affirmation: '我的火花是珍贵的——我尊重点火的时刻，也尊重让余烬休息的时刻。' },
    water: { name: '水', tagline: '感受、直觉、连结。', description: '水以情感与调频而生。在任何人开口之前，你已经知道这个房间。你从感受中创造，从深处去爱，以承载空间来疗愈。你在设计上就是透过的。', strengths: ['共情', '直觉', '情感的深度', '亲密的容量'], shadow: ['被淹没', '吸收他人的感受', '情绪起伏', '融合／失去自我'], whenDominant: '你的礼物是通透——也是最难的边缘。先照料自己的杯。没有堤岸的水会成洪水。', affirmation: '我感受一切，也继续是我。' },
    air: { name: '风', tagline: '思维、语言、澄明。', description: '风以心智而生。你串起想法，为他人说不出的东西命名，以理解去移动。对话、书本、语言、呼吸——这些既是你的药，也是你的媒介。', strengths: ['澄明', '好奇心', '表达', '适应力'], shadow: ['过度思考', '与身体脱离', '把情绪理智化', '无法落地一个决定'], whenDominant: '回到身体里。让想法无需再一轮分析就能变为行动。心智是极好的仆人，也是糟糕的主人。', affirmation: '我为了理解而思考，为了落地而生活。' },
    earth: { name: '土', tagline: '技艺、身体、稳步搭建。', description: '土以物质而生。你用手创造，用身体认知，为漫长之路而建。稳定对你并不无聊——它是其他一切的地基。', strengths: ['耐心', '匠艺', '可靠', '感官的智慧'], shadow: ['僵硬', '抗拒变化', '物质主义', '计划破碎时的封闭'], whenDominant: '你的礼物是持久。你的风险是停留太久。让某些事情结束，好让新的东西扎根。', affirmation: '我为远路而建，并允许季节更替。' },
    chartVsBehaviour: '星盘 vs. 行为',
    matchNote: '你的行为元素与星盘一致——你与自己本来的能量同步地生活着。',
    differNote: '星盘说 {{natal}}，行为却说 {{behaviour}}——值得留意你正在哪里伸展。',
  },
};

const LIFE_PATH_I18N = {
  en: {
    1: { title: 'The Pioneer', tagline: 'Independence, initiative, leadership.', purpose: 'You are here to lead, originate, and carve paths where none existed. Your lesson is learning to trust your own direction without needing permission.', strengths: ['Self-reliance', 'Courage', 'Drive', 'Originality'], challenges: ['Impatience', 'Going it alone when collaboration would serve', 'Resistance to being helped'], affirmation: 'I set my own direction — and I let others walk alongside me.' },
    2: { title: 'The Diplomat', tagline: 'Partnership, harmony, sensitivity.', purpose: 'You are here to harmonize — to hold the space between people, to read nuance, to build through connection rather than force. Your lesson is finding your own voice inside the bridge you build.', strengths: ['Empathy', 'Intuition', 'Cooperation', 'Patience'], challenges: ['Codependence', 'Over-accommodating', 'Avoiding healthy conflict'], affirmation: 'I hold the space between — and I stay myself inside the bridge.' },
    3: { title: 'The Expresser', tagline: 'Creativity, communication, joy.', purpose: 'You are here to express, inspire, and spark joy. Language, art, performance, teaching — these are your native mediums. Your lesson is letting depth and discipline shape the gift.', strengths: ['Creativity', 'Charisma', 'Optimism', 'Expression'], challenges: ['Scattering energy', 'Avoiding hard feelings by staying bright', 'Superficial reach without depth'], affirmation: 'I create, express, and go deep — brightness and depth belong together.' },
    4: { title: 'The Builder', tagline: 'Stability, craft, long-range order.', purpose: 'You are here to build what lasts. Systems, institutions, crafts, homes. Your lesson is allowing the work to breathe — rigidity is the enemy of durability.', strengths: ['Discipline', 'Reliability', 'Craftsmanship', 'Patience'], challenges: ['Over-rigidity', 'Workaholism', 'Fear of change'], affirmation: 'I build for the long road and allow the structure to evolve.' },
    5: { title: 'The Explorer', tagline: 'Freedom, change, adventure.', purpose: 'You are here to experience. To move, travel, transform. You are the one who shows others that the life they have is not the only life possible. Your lesson is staying long enough to let experiences land.', strengths: ['Curiosity', 'Adaptability', 'Magnetism', 'Restless evolution'], challenges: ['Flightiness', 'Avoiding roots and depth', 'Chasing stimulation over substance'], affirmation: 'I travel widely — and I stay long enough to be changed.' },
    6: { title: 'The Nurturer', tagline: 'Love, responsibility, service.', purpose: 'You are here to love and tend — family, community, the vulnerable, the home. Your lesson is loving without losing yourself inside the caretaking.', strengths: ['Compassion', 'Devotion', 'Responsibility', 'Artistic sense of beauty'], challenges: ['Over-giving', 'Martyrdom', 'Control disguised as care'], affirmation: 'I give from fullness and tend my own garden first.' },
    7: { title: 'The Seeker', tagline: 'Wisdom, solitude, depth.', purpose: 'You are here to go deep. Study, reflect, uncover what is true. You bring the long-range wisdom that holds a community steady. Your lesson is sharing what you know instead of hoarding it.', strengths: ['Analytical mind', 'Intuition', 'Depth', 'Authenticity'], challenges: ['Isolation', 'Distrust', 'Intellectualising feeling', 'Spiritual perfectionism'], affirmation: 'I bring my depth into the world — wisdom is meant to be shared.' },
    8: { title: 'The Architect', tagline: 'Power, abundance, stewardship.', purpose: 'You are here to lead at scale — to move resources, build enterprises, steward power responsibly. Your lesson is remembering that material mastery and spiritual integrity are one path, not two.', strengths: ['Vision', 'Executive ability', 'Resilience', 'Capacity for abundance'], challenges: ['Money-as-identity', 'Over-work', 'Using power for control', 'Fear of loss'], affirmation: 'I build wealth and power in service of what I love.' },
    9: { title: 'The Humanitarian', tagline: 'Completion, compassion, wide love.', purpose: 'You are here to love broadly — causes, humanity, the planet. You finish what needs ending and give what needs giving. Your lesson is staying present inside your own life while also holding the bigger picture.', strengths: ['Idealism', 'Compassion', 'Wisdom', 'Endings and transitions'], challenges: ['Martyrdom', 'Emotional distance via "saving the world"', 'Grief carried too long'], affirmation: 'I love wide and I live close — both at once.' },
    11: { title: 'The Intuitive Messenger', tagline: 'Vision, inspiration, spiritual sight.', purpose: "A master path. You are here to see what others can't and translate it into language people can carry. Your lesson is grounding the vision — channel it, don't be consumed by it.", strengths: ['Vision', 'Spiritual attunement', 'Inspiration', 'Artistic sensitivity'], challenges: ['Nervous system overwhelm', 'Feeling like an outsider', 'Over-idealising'], affirmation: 'I channel the vision and stay rooted in my body.' },
    22: { title: 'The Master Builder', tagline: 'Vision into form at large scale.', purpose: 'A master path. You are here to build something enduring — an institution, a body of work, a movement. Your lesson is trusting the scale of your own capability.', strengths: ['Vision + execution', 'Organisational genius', 'Long-range stamina'], challenges: ['Feeling the weight of your own potential', 'Self-doubt at pivotal moments', 'Sacrificing relationships for the work'], affirmation: 'I trust my capacity — and I build with others, not in isolation.' },
    33: { title: 'The Master Teacher', tagline: 'Love in service at a collective scale.', purpose: 'The rarest master path. You are here to love, heal, and teach at a scale that shapes communities. Your lesson is self-care — you cannot pour from an empty cup, and your cup is asked for often.', strengths: ['Unconditional love', 'Healing presence', 'Teaching by being'], challenges: ['Martyrdom', 'Overwhelm', 'Forgetting to be a person, not just a role'], affirmation: "I love and serve from fullness — my own life matters as much as anyone's." },
  },
  ja: {
    1: { title: 'パイオニア', tagline: '独立・起動・リーダーシップ。', purpose: '道のないところに道を切り拓く人。許可を待たずに自分の方向を信じる、それが課題です。', strengths: ['自立', '勇気', '推進力', '独創性'], challenges: ['性急さ', '協働が効くときにも独りで行こうとする', '助けを受け取ることへの抵抗'], affirmation: '自分の方向を定める——そして誰かと並んで歩くことも許す。' },
    2: { title: '調停者', tagline: 'パートナーシップ・調和・感度。', purpose: '人と人のあいだの場を保ち、機微を読み、力ではなくつながりで築く人。橋の中にいても、自分の声を失わない——それが課題です。', strengths: ['共感', '直感', '協働', '忍耐'], challenges: ['共依存', '合わせすぎ', '健やかな衝突を避ける'], affirmation: '人と人のあいだを保つ——橋の中でも、私は私のままでいる。' },
    3: { title: '表現者', tagline: '創造・伝達・よろこび。', purpose: '表現し、励まし、よろこびの火花を散らす人。言葉、芸術、舞台、教え——これらが母国語です。深さと規律を、輝きに通わせるのが課題です。', strengths: ['創造性', 'カリスマ', '楽観', '表現力'], challenges: ['エネルギーを散らす', '明るさで辛さを避ける', '深さのない届き方'], affirmation: '創り、表現し、深くまで潜る——明るさと深さは両立する。' },
    4: { title: '建設者', tagline: '安定・技・長期の秩序。', purpose: '残るものを築く人。仕組み、制度、技、家。作業に呼吸を通わせること——硬直は耐久性の敵です。', strengths: ['規律', '信頼性', '職人性', '忍耐'], challenges: ['硬直', 'ワーカホリック', '変化への恐れ'], affirmation: '長い道のために築き、構造が育つことを許す。' },
    5: { title: '冒険家', tagline: '自由・変化・冒険。', purpose: '体験する人。動き、旅し、変わる。今の生だけが生ではないと、他者に見せる人。体験が根づくまで留まる——それが課題です。', strengths: ['好奇心', '適応力', '磁力', '止まらない進化'], challenges: ['気まぐれ', '根と深さを避ける', '実より刺激を追う'], affirmation: '広く旅する——変わるのに足る時間、留まる。' },
    6: { title: '育む人', tagline: '愛・責任・奉仕。', purpose: '愛し、世話する人。家族、共同体、弱さの中にある人、家。ケアの中で自分を失わない——それが課題です。', strengths: ['慈しみ', '献身', '責任', '芸術的な美感覚'], challenges: ['与えすぎ', '自己犠牲', 'ケアに化けた支配'], affirmation: '満ちたところから与え、自分の庭を先に世話する。' },
    7: { title: '求道者', tagline: '叡智・孤独・深さ。', purpose: '深く潜る人。学び、観照し、真実を掘り出す。長射程の叡智で共同体を安定させる。抱え込まず分かち合う——それが課題です。', strengths: ['分析', '直感', '深さ', '真正性'], challenges: ['孤立', '不信', '感情の知的化', '霊性の完璧主義'], affirmation: '私の深さを世界へ差し出す——叡智は分かち合うためにある。' },
    8: { title: '建築家', tagline: '力・豊かさ・管理。', purpose: 'スケールで導く人。資源を動かし、事業を築き、力を責任をもって管理する。物質の熟達と霊性の誠実さは別の道ではない——それが課題です。', strengths: ['ビジョン', '執行力', '粘り', '豊かさの容量'], challenges: ['お金を自己同一視', '働きすぎ', '支配のための力', '喪失への恐れ'], affirmation: '愛するもののために、富と力を築く。' },
    9: { title: '人道家', tagline: '完結・慈悲・広い愛。', purpose: '広く愛する人——大義、人類、地球。終えるべきを終え、与えるべきを与える。大きな視点を保ちつつ、自分の生にも居る——それが課題です。', strengths: ['理想', '慈悲', '叡智', '終わりと移行の扱い'], challenges: ['自己犠牲', '「世界を救う」で距離を取る', '長く抱えすぎる悲しみ'], affirmation: '広く愛し、近くで生きる——同時に両方。' },
    11: { title: '直観の伝令', tagline: 'ビジョン・ひらめき・霊性の眼。', purpose: 'マスターの道。他者には見えないものを見て、人が持ち帰れる言葉に翻訳する。ビジョンを地に降ろす——呑まれずに流す——それが課題です。', strengths: ['ビジョン', '霊性の感度', 'インスピレーション', '芸術的繊細さ'], challenges: ['神経系の過負荷', 'よそ者感', '理想化しすぎ'], affirmation: 'ビジョンを流し、身体に根を下ろしておく。' },
    22: { title: 'マスタービルダー', tagline: 'ビジョンを大きなスケールで形に。', purpose: 'マスターの道。残るもの——制度、作品群、ムーブメント——を築く人。自分の器の大きさを信じる——それが課題です。', strengths: ['ビジョンと実行', '組織の天才性', '長射程の粘り'], challenges: ['自らの可能性の重み', '要所での自己疑念', '仕事のために関係を犠牲にする'], affirmation: '自分の器を信じる——そして孤立ではなく、他者と共に築く。' },
    33: { title: 'マスターティーチャー', tagline: '集団規模の愛と奉仕。', purpose: '最も稀なマスターの道。共同体を形づくる規模で愛し、癒し、教える人。自分のケア——空の杯からは注げない、そしてあなたの杯は頻繁に求められる——それが課題です。', strengths: ['無条件の愛', '癒しのプレゼンス', '在り方そのもので教える'], challenges: ['自己犠牲', '圧倒', '役割だけになって「人」であるのを忘れる'], affirmation: '満ちたところから愛し、仕える——自分の生も、誰のそれとも同じくらい大切だ。' },
  },
  ko: {
    1: { title: '개척자', tagline: '독립·시동·리더십.', purpose: '길이 없던 곳에 길을 여는 사람. 허락을 기다리지 않고 자신의 방향을 믿는 것이 과제입니다.', strengths: ['자립', '용기', '추진', '독창'], challenges: ['조급함', '협업이 도움이 될 때도 홀로 가려는 경향', '도움 받기를 거부함'], affirmation: '나는 나의 방향을 정한다 — 그리고 다른 이들이 나란히 걷도록 허락한다.' },
    2: { title: '조율자', tagline: '파트너십·조화·감도.', purpose: '사람과 사람 사이의 공간을 지키고, 뉘앙스를 읽고, 힘보다 연결로 쌓는 사람. 당신이 지은 다리 안에서 자기 목소리를 찾는 것이 과제입니다.', strengths: ['공감', '직관', '협력', '인내'], challenges: ['공의존', '지나친 맞춤', '건강한 충돌 회피'], affirmation: '사이의 공간을 지킨다 — 그 다리 안에서도 나는 나로 남는다.' },
    3: { title: '표현자', tagline: '창조·소통·기쁨.', purpose: '표현하고, 영감을 주고, 기쁨의 불꽃을 튀기는 사람. 언어·예술·무대·가르침이 당신의 모국어입니다. 깊이와 규율이 밝음을 빚게 하는 것이 과제입니다.', strengths: ['창조성', '카리스마', '낙관', '표현'], challenges: ['에너지의 분산', '밝음으로 힘든 감정을 회피', '깊이 없는 도달'], affirmation: '창조하고, 표현하고, 깊이 들어간다 — 밝음과 깊이는 함께 간다.' },
    4: { title: '건설자', tagline: '안정·기예·장기적 질서.', purpose: '남을 것을 짓는 사람. 체계, 기관, 기예, 집. 일에 숨을 들이는 것 — 경직은 내구성의 적입니다 — 이 과제입니다.', strengths: ['규율', '신뢰성', '기예성', '인내'], challenges: ['과도한 경직', '일 중독', '변화에 대한 두려움'], affirmation: '먼 길을 위해 짓고, 구조가 진화하도록 허락한다.' },
    5: { title: '탐험가', tagline: '자유·변화·모험.', purpose: '체험하는 사람. 움직이고 여행하고 변화한다. 지금 이 삶이 유일한 삶이 아님을 타인에게 보여준다. 체험이 뿌리내릴 만큼 머무는 것이 과제입니다.', strengths: ['호기심', '적응력', '자력', '멈추지 않는 진화'], challenges: ['변덕', '뿌리와 깊이를 피함', '본질보다 자극을 쫓음'], affirmation: '넓게 여행한다 — 변할 만큼 오래 머무른다.' },
    6: { title: '돌봄의 사람', tagline: '사랑·책임·봉사.', purpose: '사랑하고 돌보는 사람 — 가족, 공동체, 취약한 이, 집. 돌봄 속에서 자신을 잃지 않는 것이 과제입니다.', strengths: ['자비', '헌신', '책임', '아름다움에 대한 감각'], challenges: ['지나친 베풂', '자기희생', '돌봄으로 위장한 통제'], affirmation: '충만함에서 주고, 자신의 정원을 먼저 돌본다.' },
    7: { title: '구도자', tagline: '지혜·고독·깊이.', purpose: '깊이 들어가는 사람. 공부하고, 성찰하고, 진실을 캐낸다. 공동체를 안정시키는 장기적 지혜를 가져온다. 쌓아두지 말고 나누는 것이 과제입니다.', strengths: ['분석적 사고', '직관', '깊이', '진정성'], challenges: ['고립', '불신', '감정의 지적화', '영적 완벽주의'], affirmation: '나의 깊이를 세상으로 가져간다 — 지혜는 나누기 위한 것이다.' },
    8: { title: '건축가', tagline: '힘·풍요·관리.', purpose: '규모로 이끄는 사람 — 자원을 움직이고, 사업을 짓고, 힘을 책임있게 다룬다. 물질의 숙달과 영적 성실이 두 길이 아님을 기억하는 것이 과제입니다.', strengths: ['비전', '실행력', '회복력', '풍요의 용량'], challenges: ['돈-정체성 동일시', '과로', '통제를 위한 힘 사용', '상실에 대한 두려움'], affirmation: '내가 사랑하는 것을 위해 부와 힘을 짓는다.' },
    9: { title: '인도주의자', tagline: '완결·자비·넓은 사랑.', purpose: '넓게 사랑하는 사람 — 대의, 인류, 지구. 끝내야 할 것을 끝내고 주어야 할 것을 준다. 큰 그림을 안으면서도 자신의 삶 안에 머무는 것이 과제입니다.', strengths: ['이상주의', '자비', '지혜', '끝과 전이를 다루는 힘'], challenges: ['자기희생', '"세계를 구함"으로 거리두기', '너무 오래 품는 슬픔'], affirmation: '넓게 사랑하고 가까이 산다 — 동시에 둘 다.' },
    11: { title: '직관의 전령', tagline: '비전·영감·영적 시각.', purpose: '마스터의 길. 남들이 보지 못하는 것을 보고, 사람들이 가져갈 수 있는 언어로 번역한다. 비전을 땅으로 내린다 — 잠기지 않고 흘려보낸다 — 이 과제입니다.', strengths: ['비전', '영적 감도', '영감', '예술적 섬세함'], challenges: ['신경계 과부하', '이방인 감각', '지나친 이상화'], affirmation: '비전을 흘려보내고, 내 몸에 뿌리를 내린다.' },
    22: { title: '마스터 건축가', tagline: '큰 규모로 비전을 형체로.', purpose: '마스터의 길. 남을 무언가 — 기관, 작품군, 움직임 — 를 짓는 사람. 자기 역량의 규모를 신뢰하는 것이 과제입니다.', strengths: ['비전 + 실행', '조직적 천재성', '장기적 끈기'], challenges: ['자기 잠재력의 무게', '결정적 순간의 자기의심', '일을 위해 관계를 희생'], affirmation: '나의 역량을 신뢰한다 — 그리고 고립이 아니라 다른 이들과 함께 짓는다.' },
    33: { title: '마스터 티처', tagline: '집단적 규모의 사랑과 봉사.', purpose: '가장 드문 마스터의 길. 공동체를 빚는 규모로 사랑하고, 치유하고, 가르치는 사람. 자기 돌봄 — 빈 잔에서는 부을 수 없고, 당신의 잔은 자주 요청받는다 — 이 과제입니다.', strengths: ['무조건적 사랑', '치유적 현존', '존재로 가르침'], challenges: ['자기희생', '압도', '역할만 되어 사람임을 잊음'], affirmation: '충만함에서 사랑하고 봉사한다 — 내 삶도 누구의 삶만큼 소중하다.' },
  },
  zh: {
    1: { title: '开创者', tagline: '独立、发起、领导。', purpose: '在没有路的地方开辟路。课题是不等许可，就信任自己的方向。', strengths: ['自立', '勇气', '推进', '原创'], challenges: ['急躁', '本可协作时仍独行', '拒绝被帮助'], affirmation: '我为自己定方向——也让他人与我并肩同行。' },
    2: { title: '调停者', tagline: '伙伴、和谐、敏感。', purpose: '守住人与人之间的空间、读懂微妙、以连结而非力量来建造。课题是在你建的桥上也有自己的声音。', strengths: ['共情', '直觉', '合作', '耐心'], challenges: ['共依附', '过度迁就', '回避健康的冲突'], affirmation: '我守住中间的空间——也在桥上保持自己。' },
    3: { title: '表达者', tagline: '创造、交流、喜悦。', purpose: '表达、鼓舞、点燃喜悦。语言、艺术、舞台、教学——这些都是你的母语。课题是让深度与纪律为这份光赋形。', strengths: ['创造', '魅力', '乐观', '表达'], challenges: ['能量散乱', '用明亮回避困难的感受', '缺乏深度的抵达'], affirmation: '我创造、表达、并往深处去——明亮与深度同属一体。' },
    4: { title: '建筑者', tagline: '稳定、技艺、长期秩序。', purpose: '建造能留存的事物——体系、机构、技艺、家。课题是让工作有呼吸——僵硬是耐久的敌人。', strengths: ['纪律', '可靠', '匠艺', '耐心'], challenges: ['过度僵硬', '工作狂', '害怕变化'], affirmation: '我为远路而建，也允许结构演变。' },
    5: { title: '探险家', tagline: '自由、变化、冒险。', purpose: '体验的人。移动、旅行、转变。你向他人展示：现在的生活并非唯一可能。课题是停留得够久，让体验扎根。', strengths: ['好奇', '适应', '磁性', '不停止的进化'], challenges: ['浮动', '回避扎根与深度', '追求刺激胜过实质'], affirmation: '我走很远——也停得够久，好让自己被改变。' },
    6: { title: '照护者', tagline: '爱、责任、服务。', purpose: '去爱与照顾——家庭、社群、脆弱者、家。课题是在照护之中不把自己丢掉。', strengths: ['慈悲', '奉献', '责任', '对美的艺术感'], challenges: ['过度付出', '自我牺牲', '以关怀为名的控制'], affirmation: '我从丰盈里给，并先照看自己的花园。' },
    7: { title: '求索者', tagline: '智慧、独处、深度。', purpose: '向深处去——学习、反思、挖掘真实。你带来长程智慧，稳定社群。课题是把所知分享出去，而不是囤积。', strengths: ['分析力', '直觉', '深度', '真实'], challenges: ['孤立', '不信任', '把感受理智化', '灵性完美主义'], affirmation: '我把自己的深度带进世界——智慧是为了分享。' },
    8: { title: '擘画者', tagline: '力量、丰盛、治理。', purpose: '在大尺度上带领——调动资源、建立事业、负责任地治理权力。课题是记得：物质的熟成与灵性的正直是同一条路。', strengths: ['远见', '执行', '韧性', '丰盛的容量'], challenges: ['把钱当作身份', '过度工作', '用力量去控制', '惧怕失去'], affirmation: '我为所爱之物建立财富与力量。' },
    9: { title: '人道者', tagline: '完成、慈悲、广阔的爱。', purpose: '以广阔之爱而来——为事业、为人类、为地球。结束该结束的，付出该付出的。课题是既守住大图景，也住在自己的生活里。', strengths: ['理想主义', '慈悲', '智慧', '处理结束与过渡'], challenges: ['自我牺牲', '以"拯救世界"拉开距离', '哀伤背得太久'], affirmation: '我广而爱，也近地活——同时两者。' },
    11: { title: '直觉的传讯者', tagline: '远见、灵感、灵性之眼。', purpose: '大师之路。你看见他人看不见之物，并把它翻译成人们可以带走的语言。课题是让远见落地——将其疏导，而非被它吞没。', strengths: ['远见', '灵性的调频', '灵感', '艺术的细腻'], challenges: ['神经系统过载', '觉得自己是局外人', '过度理想化'], affirmation: '我把远见疏通而出，并把根留在身体里。' },
    22: { title: '大师级建筑者', tagline: '在大尺度上让远见成形。', purpose: '大师之路。建造能够久存的事物——一所机构、一整批作品、一场运动。课题是信任自己能力的规模。', strengths: ['远见与执行', '组织的天才性', '长期的耐力'], challenges: ['自己潜能的重量感', '关键时刻的自我怀疑', '为工作牺牲关系'], affirmation: '我信任自己的容量——并与他人同建，不在孤立中。' },
    33: { title: '大师级老师', tagline: '集体尺度的爱与服务。', purpose: '最稀有的大师之路。以塑造群体的规模去爱、疗愈、教导。课题是自我照护——空杯无以浇灌，而你的杯常被求取。', strengths: ['无条件的爱', '疗愈的临在', '以存在本身去教导'], challenges: ['自我牺牲', '被淹没', '只剩角色，忘了做个人'], affirmation: '我从丰盈里去爱与服务——我的生命，和任何人的一样重要。' },
  },
};

const CHINESE_ZODIAC_I18N = {
  en: { rat: { name: 'Rat' }, ox: { name: 'Ox' }, tiger: { name: 'Tiger' }, rabbit: { name: 'Rabbit' }, dragon: { name: 'Dragon' }, snake: { name: 'Snake' }, horse: { name: 'Horse' }, goat: { name: 'Goat' }, monkey: { name: 'Monkey' }, rooster: { name: 'Rooster' }, dog: { name: 'Dog' }, pig: { name: 'Pig' } },
  ja: { rat: { name: '子（ね）' }, ox: { name: '丑（うし）' }, tiger: { name: '寅（とら）' }, rabbit: { name: '卯（う）' }, dragon: { name: '辰（たつ）' }, snake: { name: '巳（み）' }, horse: { name: '午（うま）' }, goat: { name: '未（ひつじ）' }, monkey: { name: '申（さる）' }, rooster: { name: '酉（とり）' }, dog: { name: '戌（いぬ）' }, pig: { name: '亥（い）' } },
  ko: { rat: { name: '쥐' }, ox: { name: '소' }, tiger: { name: '호랑이' }, rabbit: { name: '토끼' }, dragon: { name: '용' }, snake: { name: '뱀' }, horse: { name: '말' }, goat: { name: '양' }, monkey: { name: '원숭이' }, rooster: { name: '닭' }, dog: { name: '개' }, pig: { name: '돼지' } },
  zh: { rat: { name: '鼠' }, ox: { name: '牛' }, tiger: { name: '虎' }, rabbit: { name: '兔' }, dragon: { name: '龙' }, snake: { name: '蛇' }, horse: { name: '马' }, goat: { name: '羊' }, monkey: { name: '猴' }, rooster: { name: '鸡' }, dog: { name: '狗' }, pig: { name: '猪' } },
};

const COSMIC_PROFILE_UI = {
  en: { title: 'Cosmic Profile', sun: 'Sun', animal: 'Animal', lifePath: 'Life Path', shareButton: 'Share Cosmic Profile', shareSubtitle: 'Sun · Animal · Life Path', myProfile: 'My Cosmic Profile' },
  ja: { title: 'コスミックプロファイル', sun: '太陽', animal: '十二支', lifePath: 'ライフパス', shareButton: 'コスミックプロファイルをシェア', shareSubtitle: '太陽・十二支・ライフパス', myProfile: '私のコスミックプロファイル' },
  ko: { title: '코스믹 프로파일', sun: '태양', animal: '띠', lifePath: '라이프 패스', shareButton: '코스믹 프로파일 공유', shareSubtitle: '태양 · 띠 · 라이프 패스', myProfile: '나의 코스믹 프로파일' },
  zh: { title: '宇宙档案', sun: '太阳', animal: '生肖', lifePath: '生命数字', shareButton: '分享宇宙档案', shareSubtitle: '太阳 · 生肖 · 生命数字', myProfile: '我的宇宙档案' },
};

const RESULT_SECTIONS_EXTRA = {
  en: { gift: 'The gift', integration: 'Integration', tarotPairing: 'Tarot pairing', whenDominant: 'When this element is dominant' },
  ja: { gift: '贈り物', integration: '統合', tarotPairing: 'タロットとの対応', whenDominant: 'この元素が主役になっているとき' },
  ko: { gift: '선물', integration: '통합', tarotPairing: '타로 페어링', whenDominant: '이 원소가 주도할 때' },
  zh: { gift: '礼物', integration: '整合', tarotPairing: '塔罗对应', whenDominant: '当此元素主导时' },
};

const SNEAK_PEEK_EXTRA = {
  en: { shadowArchetype: 'An archetype pattern is forming...', elementAffinity: 'An elemental current is emerging...' },
  ja: { shadowArchetype: '元型のパターンが形になってきています……', elementAffinity: 'エレメントの流れが立ち上がってきています……' },
  ko: { shadowArchetype: '원형의 패턴이 형태를 잡고 있어요……', elementAffinity: '원소의 흐름이 드러나고 있어요……' },
  zh: { shadowArchetype: '一个原型模式正在形成……', elementAffinity: '一股元素之流正在浮现……' },
};

// ------------------------------------------------------------------
// Merge + write
// ------------------------------------------------------------------

for (const locale of LOCALES) {
  const path = resolve(__dirname, `../src/i18n/locales/${locale}/app.json`);
  const data = JSON.parse(readFileSync(path, 'utf8'));

  if (!data.quizzes) data.quizzes = {};
  if (!data.quizzes.definitions) data.quizzes.definitions = {};
  if (!data.quizzes.resultSections) data.quizzes.resultSections = {};
  if (!data.quizzes.sneakPeek) data.quizzes.sneakPeek = {};

  // Quiz definitions
  data.quizzes.definitions.shadowArchetype = SHADOW[locale];
  data.quizzes.definitions.elementAffinity = ELEMENT_AFFINITY[locale];

  // Archetype + element info blocks (used by result pages)
  data.quizzes.shadowArchetypes = SHADOW_ARCHETYPES_I18N[locale];
  data.quizzes.elements = ELEMENTS_INFO_I18N[locale];

  // Sneak peek additions
  Object.assign(data.quizzes.sneakPeek, SNEAK_PEEK_EXTRA[locale]);

  // Extra result section labels
  Object.assign(data.quizzes.resultSections, RESULT_SECTIONS_EXTRA[locale]);

  // Life Path + Chinese zodiac + Cosmic profile — top-level under `lifePath`,
  // `chineseZodiac`, and `profile.cosmic`
  data.lifePath = LIFE_PATH_I18N[locale];
  data.chineseZodiac = CHINESE_ZODIAC_I18N[locale];
  if (!data.profile) data.profile = {};
  data.profile.cosmic = COSMIC_PROFILE_UI[locale];

  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`✓ ${locale}: merged shadow + element + lifePath + chinese + cosmic-profile`);
}
