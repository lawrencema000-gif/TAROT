// Extra localized content for astrology-weekly and astrology-monthly.
// Kept in a separate file so astrology-daily's bundle stays small.
import type { Locale, Element, AspectType } from "./astrology-content.ts";

// Short day-of-week labels (Sun, Mon, ...) for weekly forecasts.
export const DAY_SHORT: Record<Locale, string[]> = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  ja: ["日", "月", "火", "水", "木", "金", "土"],
  ko: ["일", "월", "화", "수", "목", "금", "토"],
  zh: ["日", "一", "二", "三", "四", "五", "六"],
};

// Month short labels (Jan, Feb, ...)
export const MONTH_SHORT: Record<Locale, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  ja: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
  ko: ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"],
  zh: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
};

// Weekly: aspect-event phrases that go between planet names
export const ASPECT_EVENTS: Record<Locale, Record<AspectType, string[]>> = {
  en: {
    conjunction: ["intensifies themes around", "merges powerfully with", "brings a concentrated focus on"],
    opposition: ["creates a revealing tension with", "highlights a balance point for", "challenges you to integrate"],
    trine: ["flows effortlessly with", "supports natural growth in", "opens easy doors for"],
    square: ["pushes you to take action on", "creates productive friction with", "motivates change around"],
    sextile: ["offers an opportunity involving", "gently activates", "brings a helpful nudge toward"],
  },
  ja: {
    conjunction: ["のテーマを強めます、対象は", "と力強く融合します、対象は", "に集中した焦点を生みます、対象は"],
    opposition: ["と啓発的な緊張を生みます、対象は", "のバランス点を照らします、対象は", "の統合を促します、対象は"],
    trine: ["と自然に流れます、対象は", "での自然な成長を支えます、対象は", "のための扉を軽やかに開きます、対象は"],
    square: ["への行動を促します、対象は", "との建設的な摩擦を生みます、対象は", "における変化を動機づけます、対象は"],
    sextile: ["に関するチャンスを提供します、対象は", "を優しく活性化します、対象は", "への有益な後押しをもたらします、対象は"],
  },
  ko: {
    conjunction: ["의 주제를 강화합니다. 대상은", "과(와) 강력히 융합합니다. 대상은", "에 집중된 초점을 가져옵니다. 대상은"],
    opposition: ["과(와) 드러나는 긴장을 만듭니다. 대상은", "의 균형점을 부각합니다. 대상은", "의 통합을 도전합니다. 대상은"],
    trine: ["과(와) 수월하게 흐릅니다. 대상은", "의 자연스런 성장을 지원합니다. 대상은", "를 위한 문을 쉽게 엽니다. 대상은"],
    square: ["에 대한 행동을 밀어붙입니다. 대상은", "과(와) 생산적 마찰을 만듭니다. 대상은", "에 관한 변화를 자극합니다. 대상은"],
    sextile: ["에 관한 기회를 제공합니다. 대상은", "를 부드럽게 활성화합니다. 대상은", "를 향한 도움의 자극을 줍니다. 대상은"],
  },
  zh: {
    conjunction: ["强化围绕以下主题:", "与之强力融合:", "带来集中的焦点于:"],
    opposition: ["产生富有启示的张力:", "突显平衡点:", "挑战你整合:"],
    trine: ["毫不费力地流动于:", "支持自然成长于:", "为以下打开轻松之门:"],
    square: ["推动你采取行动于:", "制造富有成效的摩擦:", "激励改变围绕:"],
    sextile: ["提供涉及以下的机会:", "温和地激活:", "带来有益的推力朝向:"],
  },
};

// Weekly: advice per aspect type
export const ASPECT_ADVICE: Record<Locale, Record<AspectType, string[]>> = {
  en: {
    conjunction: ["Focus your energy. This is a powerful moment for clarity.", "Lean into this energy fully -- half-measures won't cut it."],
    opposition: ["Find the middle ground. Both sides hold wisdom.", "Step back and see the bigger picture before reacting."],
    trine: ["Accept the gifts being offered. Don't overthink this.", "Let things flow naturally. Effort isn't required here."],
    square: ["Embrace the discomfort -- growth lives here.", "Take one decisive step rather than ruminating."],
    sextile: ["Be alert for subtle opportunities. They're easy to miss.", "Say yes to invitations and suggestions from others."],
  },
  ja: {
    conjunction: ["エネルギーを集中させて。明晰さを得るための強力な瞬間です。", "このエネルギーに身を委ねて — 中途半端では足りません。"],
    opposition: ["中間点を見つけて。両側に知恵があります。", "反応する前に一歩引いて、大きな絵を見ましょう。"],
    trine: ["差し出される贈り物を受け取って。考えすぎないで。", "物事を自然に流れさせて。努力は必要ありません。"],
    square: ["不快さを受け入れて — そこに成長があります。", "くよくよするより、決定的な一歩を踏み出して。"],
    sextile: ["微かなチャンスにアンテナを立てて。見逃しやすいものです。", "誘いや提案に「はい」と答えて。"],
  },
  ko: {
    conjunction: ["에너지를 집중하세요. 명료함을 위한 강력한 순간입니다.", "이 에너지에 완전히 기대세요 — 어중간한 태도는 통하지 않습니다."],
    opposition: ["중간 지점을 찾으세요. 양쪽 모두에 지혜가 있습니다.", "반응하기 전에 한 걸음 물러서 큰 그림을 보세요."],
    trine: ["주어지는 선물을 받아들이세요. 너무 생각하지 마세요.", "일이 자연스럽게 흐르도록 두세요. 여기서는 노력이 필요치 않습니다."],
    square: ["불편함을 껴안으세요 — 성장이 그곳에 있습니다.", "고민하기보다 결정적인 한 걸음을 내딛으세요."],
    sextile: ["미묘한 기회에 깨어 있으세요. 놓치기 쉽습니다.", "타인의 초대와 제안에 '예'라고 답하세요."],
  },
  zh: {
    conjunction: ["聚焦你的能量。这是获得清明的强大时刻。", "完全投入这股能量 —— 半吊子无济于事。"],
    opposition: ["寻找中间地带。两边都藏有智慧。", "在反应之前退后一步,看看全局。"],
    trine: ["接受被馈赠的礼物。不要想太多。", "让事情自然流动。这里无需费力。"],
    square: ["拥抱不适 —— 成长就在此处。", "迈出决定性的一步,胜于反复思虑。"],
    sextile: ["对微妙的机会保持警觉。它们很容易被错过。", "对他人的邀请与建议说'是'。"],
  },
};

// Weekly: main storyline per element
export const STORYLINES: Record<Locale, Record<Element, string[]>> = {
  en: {
    Fire: [
      "This week ignites your ambition and desire for self-expression. You're called to step forward with courage, take creative risks, and let your authentic fire shine. Energy is high -- channel it with intention.",
      "A week of dynamic action and bold decisions. Your confidence is magnetized, drawing opportunities and attention. Balance your drive with moments of stillness to avoid burnout.",
      "Passion and purpose align this week. Whether in relationships, creative projects, or career moves, your enthusiasm inspires others. Trust the spark of inspiration when it strikes.",
    ],
    Earth: [
      "This week favors building, consolidating, and strengthening your foundations. Patient effort yields impressive results. Focus on what's real and tangible rather than hypothetical possibilities.",
      "Stability and structure are your allies this week. Financial matters, health routines, and long-term plans benefit from your grounded attention. Small improvements compound into significant gains.",
      "A week for practical magic. Your ability to turn ideas into reality is heightened. Trust the process, stay disciplined, and celebrate incremental progress.",
    ],
    Air: [
      "Communication and connection are this week's superpowers. Conversations spark insights, networks expand, and intellectual curiosity leads you somewhere unexpected. Stay open and flexible.",
      "Ideas are flowing fast this week. Your mind is sharp, your words are persuasive, and social interactions bring both joy and opportunity. Write down what inspires you before it fades.",
      "This week invites you to share, learn, and explore. New perspectives challenge old assumptions in liberating ways. Let curiosity guide you -- the most interesting discoveries often come sideways.",
    ],
    Water: [
      "This week takes you deeper into emotional territory. Intuition is your compass, pointing toward what needs healing, release, or nurturing. Honor your sensitivity -- it's a strength, not a weakness.",
      "Emotional currents run strong this week. Dreams may be vivid, empathy heightened, and creative inspiration plentiful. Create space for reflection alongside your responsibilities.",
      "A week for soul-level work. Whether through art, meditation, intimate conversation, or quiet reflection, you're processing something important beneath the surface. Trust the timing.",
    ],
  },
  ja: {
    Fire: [
      "今週はあなたの野心と自己表現の欲求を燃え立たせます。勇気を持って踏み出し、創造的なリスクを取り、本来の炎を輝かせるとき。エネルギーは高く — 意図を持って注ぎましょう。",
      "ダイナミックな行動と大胆な決断の週。自信に磁力が生まれ、機会と注目を引き寄せます。推進力と静けさのバランスを取り、燃え尽きを避けましょう。",
      "情熱と目的が今週重なります。人間関係、創作プロジェクト、キャリアの動きで、あなたの熱意が人を動かします。閃きが訪れた瞬間を信じて。",
    ],
    Earth: [
      "今週は土台を築き、固め、強めるのに向いています。辛抱強い努力が印象的な結果を生みます。仮定ではなく、現実に触れられるものに集中しましょう。",
      "安定と構造が今週の味方です。財務、健康習慣、長期計画が、地に足のついたあなたの注意から恩恵を受けます。小さな改善が積み重なって大きな成果に。",
      "実践的な魔法の週。アイデアを現実に変える力が増しています。プロセスを信じ、規律を保ち、少しずつの進歩を祝いましょう。",
    ],
    Air: [
      "今週の超能力は、コミュニケーションとつながり。会話が洞察を生み、ネットワークが広がり、知的好奇心が思いがけない場所へ導きます。柔軟に開いていて。",
      "今週はアイデアが速く流れます。頭は冴え、言葉は説得力を持ち、社交的なやり取りが喜びとチャンスをもたらします。閃いたことは薄れる前に書き留めて。",
      "今週は分かち合い、学び、探求することへの招待。新しい視点が古い前提を解放的に問い直します。好奇心に導かれて — 最も面白い発見は横から訪れます。",
    ],
    Water: [
      "今週は感情の奥深くへ導かれます。直感があなたの羅針盤となり、癒し、手放し、育みが必要なものを指し示します。感受性を敬って — それは弱さではなく強さです。",
      "今週は感情の流れが強く、夢は鮮やかで、共感力が高まり、創造的な着想が豊かに訪れます。責任と並んで、省察のための余白を作りましょう。",
      "魂のレベルの作業の週。芸術、瞑想、親密な会話、静かな省察を通じて、水面下で大切な何かを処理しています。タイミングを信じて。",
    ],
  },
  ko: {
    Fire: [
      "이번 주는 당신의 야망과 자기 표현의 욕구를 불태웁니다. 용기 있게 나서고, 창의적 위험을 감수하며, 진정한 불을 빛내라는 부름이 있습니다. 에너지가 높습니다 — 의도를 갖고 쏟으세요.",
      "역동적 행동과 대담한 결단의 한 주. 자신감이 자력을 띠어 기회와 관심을 끌어당깁니다. 추진력과 고요의 균형으로 번아웃을 피하세요.",
      "이번 주 열정과 목적이 정렬됩니다. 관계, 창작 프로젝트, 커리어 움직임에서 당신의 열의가 다른 이들에게 영감을 줍니다. 영감이 튀어오르는 순간을 믿으세요.",
    ],
    Earth: [
      "이번 주는 기반을 세우고, 다지고, 강화하기에 좋습니다. 인내하는 노력이 인상적인 결과를 낳습니다. 가설이 아닌 실재하고 손에 잡히는 것에 집중하세요.",
      "안정과 구조가 이번 주의 동맹입니다. 재정, 건강 루틴, 장기 계획이 당신의 안정된 주의에서 이익을 얻습니다. 작은 개선이 복리로 의미 있는 성과로 쌓입니다.",
      "실용 마법의 한 주. 아이디어를 현실로 바꾸는 능력이 고조됩니다. 과정을 신뢰하고, 규율을 지키며, 점진적 진전을 축하하세요.",
    ],
    Air: [
      "이번 주의 초능력은 소통과 연결입니다. 대화가 통찰을 일으키고, 네트워크가 확장되며, 지적 호기심이 뜻밖의 곳으로 당신을 이끕니다. 열려 있고 유연하세요.",
      "이번 주 아이디어가 빠르게 흐릅니다. 머리는 예리하고, 말은 설득력 있으며, 사회적 교류가 기쁨과 기회를 함께 가져옵니다. 영감을 주는 것은 흐려지기 전에 적어 두세요.",
      "이번 주는 공유하고 배우고 탐구하도록 초대합니다. 새 관점이 익숙한 전제를 해방적으로 흔듭니다. 호기심이 당신을 이끌게 두세요 — 가장 흥미로운 발견은 옆으로 다가옵니다.",
    ],
    Water: [
      "이번 주는 감정의 깊은 영역으로 데려갑니다. 직감이 당신의 나침반이 되어 치유, 방출, 돌봄이 필요한 것을 가리킵니다. 감수성을 존중하세요 — 약점이 아닌 강점입니다.",
      "이번 주 감정의 흐름이 강합니다. 꿈이 생생할 수 있고, 공감이 고조되며, 창의적 영감이 풍부합니다. 책임과 함께 성찰의 공간을 만드세요.",
      "영혼 차원의 한 주. 예술, 명상, 친밀한 대화, 조용한 성찰을 통해 수면 아래에서 중요한 무언가를 처리하고 있습니다. 타이밍을 믿으세요.",
    ],
  },
  zh: {
    Fire: [
      "本周点燃你的雄心与自我表达的渴望。你被召唤勇敢前行,承担创意风险,让真正的火焰发光。能量高涨 —— 带着意图去引导它。",
      "动感行动与大胆决定的一周。自信带有磁力,吸引机会与关注。以推力与静定的平衡避免倦怠。",
      "本周热情与目标对齐。无论在关系、创意项目或事业行动中,你的热忱激励他人。当灵感闪现时,信任它。",
    ],
    Earth: [
      "本周利于构建、巩固与强化你的基础。耐心的努力带来令人印象深刻的结果。专注于真实、可触的事物,而非假设的可能。",
      "本周稳定与结构是你的盟友。财务事项、健康日常、长期计划都从你扎根的注意中受益。小小的改善复利成为显著的收获。",
      "务实魔法的一周。你将想法化为现实的能力被放大。信任过程,保持纪律,庆祝渐进的进步。",
    ],
    Air: [
      "本周的超能力是沟通与连接。对话点燃洞见,人脉扩展,智识的好奇心带你走向意外之处。保持开放与灵活。",
      "本周灵感流动迅速。思路锐利,语言具说服力,社交互动带来喜悦与机会。把启发你的东西写下来,免得消散。",
      "本周邀请你分享、学习、探索。新的视角以解放的方式撼动旧的假设。让好奇心引导你 —— 最有趣的发现常从旁边降临。",
    ],
    Water: [
      "本周将你带入更深的情感领域。直觉是你的指南针,指向需要疗愈、释放或滋养之处。敬重你的敏感 —— 它是力量,不是弱点。",
      "本周情感暗流强劲。梦境可能鲜明,共情加深,创意灵感丰沛。在责任之外,为省思留出空间。",
      "灵魂层面工作的一周。无论通过艺术、冥想、亲密对话或静默省思,你正在水面下处理某件重要的事。信任时机。",
    ],
  },
};

// Weekly: activity pool per element (best-days)
export const BEST_DAYS_ACTIVITIES: Record<Locale, Record<Element, string[]>> = {
  en: {
    Fire: ["Starting something new", "Physical activity", "Public speaking", "Negotiations", "Creative work", "Socializing"],
    Earth: ["Financial planning", "Home improvement", "Health checkups", "Organizing", "Long-term planning", "Cooking & nourishing"],
    Air: ["Brainstorming", "Networking", "Writing", "Learning new skills", "Social gatherings", "Research"],
    Water: ["Journaling", "Meditation", "Creative expression", "Deep conversations", "Self-care", "Spending time near water"],
  },
  ja: {
    Fire: ["新しいことを始める", "身体を動かす", "人前で話す", "交渉", "創作", "社交"],
    Earth: ["財務計画", "住まいの改善", "健康チェック", "整理整頓", "長期計画", "料理と滋養"],
    Air: ["ブレインストーミング", "ネットワーキング", "書くこと", "新しいスキルの学習", "集まり", "リサーチ"],
    Water: ["ジャーナリング", "瞑想", "創造的表現", "深い対話", "セルフケア", "水辺で過ごす"],
  },
  ko: {
    Fire: ["새로운 시작", "신체 활동", "대중 연설", "협상", "창의 작업", "사교"],
    Earth: ["재정 계획", "집 정비", "건강 검진", "정리", "장기 계획", "요리와 영양"],
    Air: ["브레인스토밍", "네트워킹", "글쓰기", "새 기술 학습", "사교 모임", "리서치"],
    Water: ["저널링", "명상", "창의적 표현", "깊은 대화", "자기 돌봄", "물가에서 시간 보내기"],
  },
  zh: {
    Fire: ["开始新事物", "身体活动", "公开演讲", "谈判", "创意工作", "社交"],
    Earth: ["财务规划", "家居改善", "健康检查", "整理", "长期规划", "烹饪与滋养"],
    Air: ["头脑风暴", "拓展人脉", "写作", "学习新技能", "社交聚会", "研究"],
    Water: ["写日记", "冥想", "创意表达", "深度对话", "自我照顾", "在水边时光"],
  },
};

// "natal" word used in weekly event composition
export const NATAL_WORD: Record<Locale, string> = {
  en: "natal",
  ja: "ネイタル",
  ko: "네이탈",
  zh: "本命",
};

// Monthly: New moon / Full moon themes by element
export const NEW_MOON_THEMES: Record<Locale, Record<Element, string[]>> = {
  en: {
    Fire: ["Plant seeds of bold new beginnings. Initiate projects that excite your passion.", "A fresh start in self-expression. Dare to show the world who you really are.", "Set intentions around leadership, courage, and creative risk-taking."],
    Earth: ["Ground your intentions in practical reality. What tangible goal will you commit to?", "New beginnings in finances, health, or home. Build something lasting.", "A fertile moment for planting seeds of material security and comfort."],
    Air: ["Fresh ideas spark exciting possibilities. Communicate your vision clearly.", "New connections and conversations open doors. Set intentions around learning.", "A reset in your social sphere. Reach out, share ideas, begin dialogues."],
    Water: ["Emotional renewal invites deeper self-understanding. Set heartfelt intentions.", "A new chapter in intimacy, creativity, or spiritual practice begins now.", "Trust the quiet whisper of intuition as you set intentions for inner growth."],
  },
  ja: {
    Fire: ["大胆な新しい始まりの種をまきましょう。情熱をかき立てるプロジェクトを始めて。", "自己表現の新しいスタート。本当の自分を世に見せる勇気を。", "リーダーシップ、勇気、創造的なリスクに関する意図を立てて。"],
    Earth: ["意図を実践的な現実に根づかせて。どの具体的な目標に取り組みますか?", "財務、健康、家での新しい始まり。長く残るものを築いて。", "物質的な安心と快適の種をまくのに肥沃な瞬間。"],
    Air: ["新鮮なアイデアがわくわくする可能性に火をつけます。ビジョンを明確に伝えて。", "新しいつながりと会話が扉を開きます。学びに関する意図を立てて。", "社交の場のリセット。声をかけ、アイデアを共有し、対話を始めて。"],
    Water: ["感情の更新が、より深い自己理解を招きます。心からの意図を立てて。", "親密さ、創造性、霊性の実践の新章がいま始まります。", "内面の成長への意図を立てながら、直感の静かな囁きを信じて。"],
  },
  ko: {
    Fire: ["과감한 새 시작의 씨앗을 뿌리세요. 열정을 일깨우는 프로젝트를 시작하세요.", "자기 표현의 새로운 출발. 진짜 당신이 누구인지 세상에 보여주세요.", "리더십, 용기, 창의적 위험에 관한 의도를 세우세요."],
    Earth: ["의도를 실용적 현실에 뿌리내리세요. 어떤 구체적 목표에 전념하시겠습니까?", "재정, 건강, 가정에서의 새 시작. 오래 남을 것을 쌓으세요.", "물질적 안전과 안락의 씨앗을 뿌리기에 비옥한 순간입니다."],
    Air: ["신선한 아이디어가 설레는 가능성에 불을 붙입니다. 비전을 명확히 전하세요.", "새로운 연결과 대화가 문을 엽니다. 배움에 관한 의도를 세우세요.", "사회적 영역의 리셋. 연락하고, 아이디어를 나누고, 대화를 시작하세요."],
    Water: ["감정의 갱신이 더 깊은 자기 이해를 초대합니다. 진심의 의도를 세우세요.", "친밀함, 창의, 영적 수행의 새로운 장이 지금 시작됩니다.", "내면의 성장에 대한 의도를 세우며 직관의 고요한 속삭임을 신뢰하세요."],
  },
  zh: {
    Fire: ["播下大胆新开始的种子。启动点燃热情的项目。", "自我表达的崭新开始。敢于让世界看到真正的你。", "围绕领导力、勇气与创意风险立下意图。"],
    Earth: ["把意图扎根于务实的现实。你将承诺哪个具体目标?", "财务、健康或家居上的新开始。建造能长久之物。", "播下物质安全与安逸种子的肥沃时刻。"],
    Air: ["新鲜的想法点燃令人兴奋的可能性。清晰地传达你的愿景。", "新的连结与对话打开门户。立下关于学习的意图。", "社交领域的重启。伸出手、分享想法、开启对话。"],
    Water: ["情感的更新邀请更深的自我理解。立下真诚的意图。", "亲密、创造或灵性修行的新篇章从此开启。", "立下内在成长的意图时,信任直觉静静的低语。"],
  },
};

export const FULL_MOON_THEMES: Record<Locale, Record<Element, string[]>> = {
  en: {
    Fire: ["A culmination of effort brings recognition. Celebrate your courage and progress.", "Passionate emotions reach a peak. Let yourself feel fully, then channel that fire wisely.", "What you started with boldness now shows results. Release what didn't ignite."],
    Earth: ["Tangible results of your patient work become visible. Harvest what you've grown.", "A material or financial matter reaches resolution. Assess your resources with clarity.", "Practical wisdom illuminates the path forward. Release ineffective habits."],
    Air: ["An important truth or insight comes to light. Communication reaches clarity.", "Social dynamics shift as hidden information surfaces. Speak your truth.", "Ideas you've been developing reach maturity. Share or release to make room for more."],
    Water: ["Emotions crest, revealing what your heart truly needs. Allow tears and joy alike.", "A relationship or emotional pattern reaches fullness. Release with compassion.", "Deep intuitive knowing surfaces. Trust what you feel even if logic can't explain it."],
  },
  ja: {
    Fire: ["努力の集大成が認知をもたらします。勇気と進歩を祝って。", "情熱の感情がピークに達します。十分に感じ、その炎を賢く注ぎましょう。", "大胆に始めたことが結果を見せます。火が灯らなかったものは手放して。"],
    Earth: ["辛抱強い仕事の実りが目に見える形に。育てたものを収穫して。", "物質的または財務の事柄が決着を迎えます。資源を明晰に見積もりましょう。", "実践的な知恵が前への道を照らします。効かない習慣は手放して。"],
    Air: ["大切な真実や洞察が明るみに出ます。コミュニケーションが明晰に。", "隠れていた情報が表に出て、人間関係の力学が動きます。あなたの真実を語って。", "温めてきたアイデアが成熟します。共有するか手放して、次のための余白を。"],
    Water: ["感情が頂点に達し、心が本当に必要とするものを明らかにします。涙も喜びも受け入れて。", "関係や感情のパターンが満ちます。慈しみを持って手放して。", "深い直感の知が浮かびます。論理で説明できなくても、感じていることを信じて。"],
  },
  ko: {
    Fire: ["노력의 정점이 인정을 가져옵니다. 당신의 용기와 진전을 축하하세요.", "열정의 감정이 정점에 이릅니다. 충분히 느끼고, 그 불을 지혜롭게 사용하세요.", "과감히 시작한 것이 결과를 보입니다. 타오르지 않은 것은 내려놓으세요."],
    Earth: ["인내한 작업의 구체적 결과가 드러납니다. 키운 것을 거두세요.", "물질적 또는 재정적 사안이 매듭지어집니다. 자원을 명료하게 평가하세요.", "실용적 지혜가 앞길을 비춥니다. 효과 없는 습관을 내려놓으세요."],
    Air: ["중요한 진실이나 통찰이 드러납니다. 소통이 명료함에 이릅니다.", "숨은 정보가 표면에 떠오르며 사회적 역학이 바뀝니다. 당신의 진실을 말하세요.", "발전시켜 온 아이디어가 성숙에 이릅니다. 나누거나 내려놓고 다음을 위한 자리를 마련하세요."],
    Water: ["감정이 정점에 이르러 마음이 진정 필요로 하는 것을 드러냅니다. 눈물도 기쁨도 허용하세요.", "관계나 감정 패턴이 가득 찹니다. 자비로 내려놓으세요.", "깊은 직관의 앎이 떠오릅니다. 논리가 설명하지 못해도 느끼는 것을 신뢰하세요."],
  },
  zh: {
    Fire: ["努力的高峰带来认可。庆祝你的勇气与进步。", "热烈的情感到达顶点。让自己充分感受,再明智地引导那份火。", "以大胆开始的事物如今显现结果。放下没有点燃的事。"],
    Earth: ["耐心工作的有形成果显现。收获你所培育的。", "物质或财务事项达至解决。清晰地评估你的资源。", "实用的智慧照亮前路。放下无效的习惯。"],
    Air: ["重要的真相或洞见浮现。沟通达至清明。", "隐藏的信息浮出水面,社交动态随之转变。说出你的真相。", "你发展中的想法达至成熟。分享或放下,为更多腾出空间。"],
    Water: ["情感达到高峰,揭示心真正需要的。允许泪水与喜悦共存。", "一段关系或情感模式臻于圆满。以慈悲放下。", "深层的直觉之知浮现。即使逻辑无法解释,也信任你的感受。"],
  },
};

// Monthly: overall overview per element
export const OVERVIEWS: Record<Locale, Record<Element, string[]>> = {
  en: {
    Fire: [
      "This month channels fiery determination into meaningful achievements. Your vitality is high, your ambition sharp, and opportunities respond to bold initiative. Balance your drive with rest to sustain your momentum throughout the month.",
      "A month of dynamic action and creative breakthroughs. You're drawn to take the lead, start fresh projects, and express yourself without reservation. Your enthusiasm is contagious -- use it to rally support for what matters most.",
      "Passion fuels your month ahead. Whether pursuing career goals, deepening relationships, or embarking on personal adventures, your confidence lights the way. Channel your fire with intention to avoid scattered energy.",
    ],
    Earth: [
      "This month rewards patience, planning, and persistence. Material matters benefit from your careful attention, and routines you establish now create lasting positive change. Trust the slow build -- it's more powerful than it seems.",
      "A month for strengthening foundations and enjoying the fruits of consistent effort. Financial clarity, health improvements, and practical progress are all favored. Stay grounded in what you know to be true.",
      "Steady growth defines your month ahead. Your natural ability to turn ideas into reality is amplified. Focus on quality over speed, and invest your energy where it generates the most tangible return.",
    ],
    Air: [
      "This month buzzes with intellectual energy and social activity. Conversations lead to breakthroughs, new connections spark inspiration, and your curiosity guides you toward valuable discoveries. Stay flexible and open to unexpected turns.",
      "A month of ideas, communication, and mental expansion. Your words carry extra weight, making this ideal for negotiations, writing, teaching, or any form of self-expression. Let your mind roam freely.",
      "Social and intellectual currents carry you forward this month. New perspectives challenge comfortable assumptions, and the willingness to learn opens exciting doors. Embrace variety and stay curious.",
    ],
    Water: [
      "This month invites you into emotional depth and intuitive wisdom. Inner work is especially productive, relationships deepen through vulnerability, and creative inspiration flows freely. Honor your sensitivity as the gift it is.",
      "A month for soul-level exploration and emotional honesty. Dreams may carry messages, empathy connects you with others profoundly, and artistic expression provides a powerful outlet. Create space for stillness.",
      "Emotional intelligence is your superpower this month. Trust gut feelings, nurture important relationships, and allow yourself the healing that comes from acknowledging what you truly feel. Beauty and meaning await in quiet moments.",
    ],
  },
  ja: {
    Fire: [
      "今月は炎のような決意を意味ある成果へと注ぎます。活力が高く、野心は鋭く、機会は大胆な一歩に応えます。推進力と休息のバランスで、一ヶ月を通して勢いを保ちましょう。",
      "ダイナミックな行動と創造的なブレイクスルーの月。あなたはリードを取り、新しいプロジェクトを始め、ためらわずに自分を表現する方向へ引かれます。熱意は伝染します — 大切なことのための支持を集めるために使って。",
      "情熱が月を前進させます。キャリア目標、関係の深化、個人的な冒険のどれであっても、自信が道を照らします。散漫にならないよう、意図を持って炎を注いで。",
    ],
    Earth: [
      "今月は忍耐、計画、粘りに報いる月。物質の事柄があなたの丁寧な注意から恩恵を受け、いま築くルーティンが持続的な良い変化を生みます。ゆっくりとした積み上げを信じて — 見かけより力強いものです。",
      "基盤を強め、一貫した努力の果実を味わう月。財務の明晰さ、健康の改善、実践的な進歩がいずれも味方します。自分が真実と知るものに根を下ろしたまま。",
      "着実な成長が月を定めます。アイデアを現実に変えるあなたの力が増幅します。速さより質を優先し、最も具体的な実りを生むところにエネルギーを注いで。",
    ],
    Air: [
      "今月は知的エネルギーと社交の賑わいに満ちます。会話がブレイクスルーへ導き、新しい繋がりが着想を呼び、好奇心が貴重な発見へと導きます。柔軟に、思いがけない展開に心を開いて。",
      "アイデア、コミュニケーション、精神の拡張の月。言葉に重みが増し、交渉・執筆・教育など自己表現に理想的な時。心を自由に遊ばせて。",
      "社交と知的な潮流があなたを前へと運びます。新しい視点が心地よい前提を揺さぶり、学ぶ意思がわくわくする扉を開きます。多様性を受け入れ、好奇心を保って。",
    ],
    Water: [
      "今月は感情の深みと直感の知へと招かれます。内面の作業が特に実り多く、弱さを通じて関係が深まり、創造的な霊感が自由に流れます。敏感さをそのままの贈り物として敬って。",
      "魂のレベルの探究と感情の正直さの月。夢はメッセージを運び、共感は深く人と繋ぎ、芸術表現が力強い出口となります。静けさのための空間を作って。",
      "感情的知性が今月の超能力。直感を信じ、大切な関係を育み、本当に感じていることを認めることから来る癒しを自分に許して。静かな時間に美と意味が待っています。",
    ],
  },
  ko: {
    Fire: [
      "이번 달은 불같은 결의를 의미 있는 성취로 바꿉니다. 활력이 높고, 야망은 예리하며, 기회는 과감한 행동에 응답합니다. 추진력과 휴식의 균형으로 이번 달 내내 모멘텀을 유지하세요.",
      "역동적 행동과 창의적 돌파의 달. 앞장서고, 새 프로젝트를 시작하고, 거침없이 자기 표현을 하려는 끌림이 있습니다. 열정은 전염됩니다 — 가장 중요한 일에 지지를 모으는 데 쓰세요.",
      "이번 달 열정이 당신을 전진시킵니다. 커리어 목표, 관계의 깊어짐, 개인적 모험 무엇이든 자신감이 길을 비춥니다. 에너지가 흩어지지 않도록 의도를 갖고 불을 사용하세요.",
    ],
    Earth: [
      "이번 달은 인내, 계획, 끈기를 보상합니다. 물질적 사안이 당신의 세심한 주의에서 이익을 얻고, 지금 세우는 루틴이 지속되는 긍정적 변화를 만듭니다. 천천히 쌓이는 과정을 신뢰하세요 — 보이는 것보다 강력합니다.",
      "기반을 강화하고 꾸준한 노력의 결실을 누리는 달. 재정의 명료함, 건강 개선, 실용적 진전이 모두 유리합니다. 자신이 아는 진실에 안정된 채로 머무르세요.",
      "이번 달을 규정하는 것은 꾸준한 성장. 아이디어를 현실로 만드는 당신의 타고난 능력이 증폭됩니다. 속도보다 품질에 집중하고, 가장 구체적 보상이 나오는 곳에 에너지를 쓰세요.",
    ],
    Air: [
      "이번 달은 지적 에너지와 사회적 활기로 가득합니다. 대화가 돌파구로 이어지고, 새 연결이 영감을 일으키며, 호기심이 가치 있는 발견으로 당신을 이끕니다. 예상치 못한 변화에 유연하고 열려 있으세요.",
      "아이디어, 소통, 정신적 확장의 달. 당신의 말에 무게가 실려 협상, 글쓰기, 가르침, 자기 표현에 이상적입니다. 마음이 자유롭게 거닐게 하세요.",
      "사회적·지적 흐름이 이번 달 당신을 앞으로 이끕니다. 새 관점이 익숙한 전제를 흔들고, 배우려는 의지가 설레는 문을 엽니다. 다양성을 받아들이고 호기심을 유지하세요.",
    ],
    Water: [
      "이번 달은 감정의 깊이와 직관의 지혜로 초대합니다. 내면 작업이 특히 생산적이고, 취약함을 통해 관계가 깊어지며, 창의적 영감이 자유롭게 흐릅니다. 감수성을 선물로서 존중하세요.",
      "영혼 차원의 탐구와 감정의 솔직함의 달. 꿈이 메시지를 전할 수 있고, 공감이 깊이 사람들과 당신을 잇고, 예술적 표현이 강력한 배출구가 됩니다. 고요를 위한 공간을 만드세요.",
      "정서 지능이 이번 달의 초능력. 직감을 신뢰하고, 중요한 관계를 돌보고, 진정으로 느끼는 것을 인정함에서 오는 치유를 스스로에게 허락하세요. 고요한 순간에 아름다움과 의미가 기다립니다.",
    ],
  },
  zh: {
    Fire: [
      "本月将火热的决心化为有意义的成就。你的活力高昂,野心锐利,机会会回应大胆的行动。以推力与休息的平衡,维持整个月的势能。",
      "动感行动与创意突破的一个月。你被牵引去带头、开启新项目、毫无保留地表达自己。你的热忱具传染力 —— 用它为最重要的事聚集支持。",
      "热情驱动你的本月。无论追求事业目标、深化关系或展开个人冒险,自信都为你照亮前路。带着意图引导你的火焰,以避免能量散乱。",
    ],
    Earth: [
      "本月奖励耐心、计划与坚持。物质事务从你的细致中受益,现在建立的日常会带来长久的正向改变。信任缓慢的累积 —— 它比看起来更强。",
      "一个强化基础、享用持续努力果实的月份。财务清晰、健康改善、实务进展都得利。保持扎根于你所确信的真实。",
      "稳定成长定义本月。你把想法化为现实的天赋被放大。重质胜于速度,把能量投在最能产出有形成果之处。",
    ],
    Air: [
      "本月充满智识能量与社交活力。对话带来突破,新的连结点燃灵感,好奇心引领你走向有价值的发现。保持灵活,对意外保持开放。",
      "想法、沟通与心智扩展的一个月。你的言语份量加重,使谈判、写作、教学、各种自我表达都尤为理想。让你的心自由游走。",
      "社交与智识的潮流在本月推你前行。新的视角撼动舒适的假设,学习的意愿打开令人兴奋的门户。拥抱多样,保持好奇。",
    ],
    Water: [
      "本月邀请你进入情感的深度与直觉的智慧。内在工作特别富有成效,关系因脆弱而加深,创意灵感自由流动。将你的敏感视为礼物来敬重。",
      "灵魂层面的探索与情感坦诚之月。梦可能带着讯息,共情深深地将你与他人相连,艺术表达提供强力的出口。为静定腾出空间。",
      "本月你的超能力是情绪智慧。信任直觉,滋养重要的关系,允许自己承认真正的感受所带来的疗愈。在安静的时刻,美与意义在等候。",
    ],
  },
};

// Monthly: one-thing-to-do per element (3 variants)
export const ONE_THING: Record<Locale, Record<Element, string[]>> = {
  en: {
    Fire: ["Take one bold risk that scares you just enough to know it matters.", "Initiate a passion project you've been daydreaming about.", "Have a courageous conversation you've been postponing."],
    Earth: ["Complete one practical goal you've been working toward.", "Create a financial plan or health routine you'll actually follow.", "Declutter one area of your life to make space for growth."],
    Air: ["Write down your ideas and share them with someone who can help.", "Reconnect with a person whose perspective always challenges you.", "Learn one new skill or subject that genuinely excites you."],
    Water: ["Practice a daily mindfulness or gratitude ritual all month.", "Express a deep feeling to someone important, without editing yourself.", "Create something purely for the joy of it, with no outcome attached."],
  },
  ja: {
    Fire: ["大切だと分かる程度に怖い、大胆なリスクを一つ取る。", "夢想してきた情熱のプロジェクトを立ち上げる。", "先延ばしにしてきた勇気ある会話を持つ。"],
    Earth: ["取り組んできた実践的な目標を一つ完了させる。", "実際に続けられる財務計画か健康ルーティンを作る。", "成長のための余白を作るため、生活の一領域を片付ける。"],
    Air: ["アイデアを書き出し、助けになる誰かと共有する。", "いつもあなたの視点を揺さぶる人と再び繋がる。", "心から興奮する新しいスキルか分野を一つ学ぶ。"],
    Water: ["今月ずっと、毎日のマインドフルネスか感謝の儀式を行う。", "大切な人に、編集せずに深い気持ちを伝える。", "成果に執着せず、純粋な喜びのためだけに何かを創る。"],
  },
  ko: {
    Fire: ["중요함을 느낄 만큼만 두려운 과감한 위험 하나를 감수하세요.", "꿈꿔 오던 열정 프로젝트를 시작하세요.", "미뤄 왔던 용기 있는 대화를 나누세요."],
    Earth: ["진행해 온 실용적 목표 하나를 완수하세요.", "실제로 지킬 재정 계획이나 건강 루틴을 만드세요.", "성장을 위한 공간을 내기 위해 삶의 한 영역을 정리하세요."],
    Air: ["아이디어를 적고 도울 수 있는 사람과 나누세요.", "늘 당신의 관점을 흔드는 사람과 다시 이어지세요.", "진심으로 설레는 새 기술이나 분야 하나를 배우세요."],
    Water: ["이번 달 내내 매일의 마음챙김 또는 감사 의식을 실천하세요.", "중요한 사람에게, 편집 없이 깊은 감정을 표현하세요.", "결과에 매이지 않고 순수한 기쁨만을 위해 무언가를 만드세요."],
  },
  zh: {
    Fire: ["承担一次刚好够怕、让你知道它很重要的大胆风险。", "启动一个你一直幻想的热情项目。", "进行一场你一直拖延的勇敢对话。"],
    Earth: ["完成一个你一直在努力的务实目标。", "制定一个你真的会遵循的财务计划或健康日常。", "整理生活中的一个角落,为成长腾出空间。"],
    Air: ["写下你的想法,并分享给能帮你的人。", "重新连接一位总能挑战你观点的人。", "学习一项真正令你兴奋的新技能或学科。"],
    Water: ["整个月每天练习正念或感恩仪式。", "向一个重要的人,不加修饰地表达一份深层感受。", "纯粹为了喜悦创作些什么,不附带任何结果。"],
  },
};

// Monthly: outer-planet themes (Jupiter/Saturn/Uranus/Neptune/Pluto × element)
export const OUTER_PLANET_THEMES: Record<Locale, Record<string, Record<Element, string[]>>> = {
  en: {
    Jupiter: {
      Fire: ["Expanding your confidence and creative self-expression."],
      Earth: ["Growing your financial resources and material security."],
      Air: ["Broadening your intellectual horizons and social circle."],
      Water: ["Deepening emotional wisdom and spiritual understanding."],
    },
    Saturn: {
      Fire: ["Disciplining your ambitions into sustainable achievement."],
      Earth: ["Building structures that create lasting financial stability."],
      Air: ["Committing to ideas and relationships that truly matter."],
      Water: ["Setting healthy emotional boundaries with compassion."],
    },
    Uranus: {
      Fire: ["Liberating your authentic self-expression from old constraints."],
      Earth: ["Revolutionizing your approach to money, body, or daily routine."],
      Air: ["Awakening radical new ideas and unconventional connections."],
      Water: ["Breaking free from emotional patterns that no longer serve you."],
    },
    Neptune: {
      Fire: ["Dissolving ego barriers to connect with creative source."],
      Earth: ["Infusing practical life with imagination and spiritual purpose."],
      Air: ["Expanding consciousness through visionary thinking and compassion."],
      Water: ["Deepening mystical awareness and artistic sensitivity."],
    },
    Pluto: {
      Fire: ["Transforming personal power and identity at a fundamental level."],
      Earth: ["Deep restructuring of values, finances, or physical wellbeing."],
      Air: ["Profound shifts in thinking, communication, or social dynamics."],
      Water: ["Emotional death-and-rebirth cycles leading to profound healing."],
    },
  },
  ja: {
    Jupiter: {
      Fire: ["自信と創造的な自己表現の拡大。"],
      Earth: ["財務的な資源と物質的な安心の成長。"],
      Air: ["知的な視野と交友の輪の拡大。"],
      Water: ["感情的な知恵と霊的な理解の深化。"],
    },
    Saturn: {
      Fire: ["野心を持続可能な達成へと律する。"],
      Earth: ["持続する財務的安定を生む構造を築く。"],
      Air: ["本当に大切なアイデアと関係にコミットする。"],
      Water: ["慈しみを持って健全な感情の境界を設ける。"],
    },
    Uranus: {
      Fire: ["古い制約から真正な自己表現を解放する。"],
      Earth: ["お金、身体、日々のルーティンへのアプローチを革新する。"],
      Air: ["急進的な新しい発想と型にはまらない繋がりの目覚め。"],
      Water: ["もう役立たない感情のパターンから自由になる。"],
    },
    Neptune: {
      Fire: ["自我の壁を溶かし、創造の源と繋がる。"],
      Earth: ["実践的な生活に想像力と霊的な目的を注ぐ。"],
      Air: ["先見と慈悲を通じて意識を拡げる。"],
      Water: ["神秘的な気づきと芸術的な感受性の深化。"],
    },
    Pluto: {
      Fire: ["個人の力とアイデンティティを根底から変容させる。"],
      Earth: ["価値観、財務、身体の福利の深い再構築。"],
      Air: ["思考、コミュニケーション、社会的力学の深遠な変化。"],
      Water: ["深い癒しへと至る、感情の死と再生のサイクル。"],
    },
  },
  ko: {
    Jupiter: {
      Fire: ["자신감과 창의적 자기 표현의 확장."],
      Earth: ["재정 자원과 물질적 안전의 성장."],
      Air: ["지적 시야와 사회적 반경의 넓어짐."],
      Water: ["감정적 지혜와 영적 이해의 깊어짐."],
    },
    Saturn: {
      Fire: ["야망을 지속 가능한 성취로 규율화."],
      Earth: ["지속되는 재정 안정을 만드는 구조의 구축."],
      Air: ["정말 중요한 아이디어와 관계에 헌신."],
      Water: ["자비로 건강한 정서적 경계 설정."],
    },
    Uranus: {
      Fire: ["오래된 제약으로부터 진정한 자기 표현의 해방."],
      Earth: ["돈, 몸, 일상 루틴에 대한 접근의 혁신."],
      Air: ["급진적 새 아이디어와 비인습적 연결의 각성."],
      Water: ["더 이상 도움이 되지 않는 감정 패턴으로부터의 해방."],
    },
    Neptune: {
      Fire: ["자아의 벽을 녹여 창조의 원천과 연결."],
      Earth: ["실용적 삶에 상상력과 영적 목적을 불어넣기."],
      Air: ["선견과 자비를 통한 의식의 확장."],
      Water: ["신비적 자각과 예술적 감수성의 심화."],
    },
    Pluto: {
      Fire: ["개인의 힘과 정체성을 근본적으로 변환."],
      Earth: ["가치, 재정, 신체 웰빙의 깊은 재구성."],
      Air: ["사고, 소통, 사회적 역학의 심대한 변화."],
      Water: ["깊은 치유로 이어지는 감정의 죽음과 재탄생 주기."],
    },
  },
  zh: {
    Jupiter: {
      Fire: ["扩展你的自信与创意的自我表达。"],
      Earth: ["增长你的财务资源与物质安全。"],
      Air: ["拓宽你的智识视野与社交圈。"],
      Water: ["加深情感智慧与灵性理解。"],
    },
    Saturn: {
      Fire: ["将野心规训为可持续的成就。"],
      Earth: ["建立能带来持久财务稳定的结构。"],
      Air: ["投入真正重要的想法与关系。"],
      Water: ["以慈悲设立健康的情感边界。"],
    },
    Uranus: {
      Fire: ["将真正的自我表达从旧约束中解放。"],
      Earth: ["革新你对金钱、身体或日常的方式。"],
      Air: ["唤醒激进的新想法与非传统的连结。"],
      Water: ["挣脱不再服务你的情感模式。"],
    },
    Neptune: {
      Fire: ["溶解自我的壁垒,连结创意之源。"],
      Earth: ["将想象与灵性目的注入务实生活。"],
      Air: ["以远见与慈悲扩展意识。"],
      Water: ["加深神秘觉察与艺术敏感。"],
    },
    Pluto: {
      Fire: ["在根本层面转化个人力量与身份。"],
      Earth: ["价值、财务或身体福祉的深度重构。"],
      Air: ["思考、沟通或社交动态的深刻转变。"],
      Water: ["导向深层疗愈的情感死亡与再生循环。"],
    },
  },
};

// Monthly: key-date phrases
export const KEY_DATES: Record<Locale, { newMoonLabel: string; fullMoonLabel: string }> = {
  en: {
    newMoonLabel: "New Moon in {sign} -- set intentions",
    fullMoonLabel: "Full Moon in {sign} -- release & celebrate",
  },
  ja: {
    newMoonLabel: "{sign}の新月 -- 意図を立てる",
    fullMoonLabel: "{sign}の満月 -- 手放しと祝福",
  },
  ko: {
    newMoonLabel: "{sign} 신월 -- 의도를 세우세요",
    fullMoonLabel: "{sign} 보름달 -- 내려놓고 축하하세요",
  },
  zh: {
    newMoonLabel: "{sign}新月 -- 立下意图",
    fullMoonLabel: "{sign}满月 -- 释放与庆祝",
  },
};

// Fallback for outer planet: "{Planet} transits through {Sign}, shaping collective themes."
export const OUTER_PLANET_FALLBACK: Record<Locale, string> = {
  en: "{planet} transits through {sign}, shaping collective themes.",
  ja: "{planet}が{sign}を通過し、集合的なテーマを形作ります。",
  ko: "{planet}이(가) {sign}을(를) 통과하며 집단적 주제를 빚어냅니다.",
  zh: "{planet}经过{sign},塑造集体主题。",
};

// Formatted date like "Jan 15" (weekly start/end, full moon / new moon dates)
export function formatShortLocalized(d: Date, locale: Locale): string {
  const m = MONTH_SHORT[locale][d.getUTCMonth()];
  return locale === "en" ? `${m} ${d.getUTCDate()}` : `${m}${d.getUTCDate()}日`;
}
