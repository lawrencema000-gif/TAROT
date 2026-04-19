// Localized content tables for astrology edge functions.
// Keeps all copy in one place so astrology-daily / -weekly / -monthly
// / -transit-calendar can pick the right language at request time.

export type Locale = "en" | "ja" | "ko" | "zh";
export type Element = "Fire" | "Earth" | "Air" | "Water";
export type AspectType = "conjunction" | "opposition" | "trine" | "square" | "sextile";

export function normalizeLocale(code: string | undefined): Locale {
  if (!code) return "en";
  const lower = code.toLowerCase();
  if (lower === "ja" || lower.startsWith("ja-")) return "ja";
  if (lower === "ko" || lower.startsWith("ko-")) return "ko";
  if (lower === "zh" || lower.startsWith("zh")) return "zh";
  return "en";
}

export const SIGN_NAMES: Record<Locale, Record<string, string>> = {
  en: { Aries: "Aries", Taurus: "Taurus", Gemini: "Gemini", Cancer: "Cancer", Leo: "Leo", Virgo: "Virgo", Libra: "Libra", Scorpio: "Scorpio", Sagittarius: "Sagittarius", Capricorn: "Capricorn", Aquarius: "Aquarius", Pisces: "Pisces" },
  ja: { Aries: "牡羊座", Taurus: "牡牛座", Gemini: "双子座", Cancer: "蟹座", Leo: "獅子座", Virgo: "乙女座", Libra: "天秤座", Scorpio: "蠍座", Sagittarius: "射手座", Capricorn: "山羊座", Aquarius: "水瓶座", Pisces: "魚座" },
  ko: { Aries: "양자리", Taurus: "황소자리", Gemini: "쌍둥이자리", Cancer: "게자리", Leo: "사자자리", Virgo: "처녀자리", Libra: "천칭자리", Scorpio: "전갈자리", Sagittarius: "궁수자리", Capricorn: "염소자리", Aquarius: "물병자리", Pisces: "물고기자리" },
  zh: { Aries: "白羊座", Taurus: "金牛座", Gemini: "双子座", Cancer: "巨蟹座", Leo: "狮子座", Virgo: "处女座", Libra: "天秤座", Scorpio: "天蝎座", Sagittarius: "射手座", Capricorn: "摩羯座", Aquarius: "水瓶座", Pisces: "双鱼座" },
};

export const PLANET_NAMES: Record<Locale, Record<string, string>> = {
  en: { Sun: "Sun", Moon: "Moon", Mercury: "Mercury", Venus: "Venus", Mars: "Mars", Jupiter: "Jupiter", Saturn: "Saturn", Uranus: "Uranus", Neptune: "Neptune", Pluto: "Pluto" },
  ja: { Sun: "太陽", Moon: "月", Mercury: "水星", Venus: "金星", Mars: "火星", Jupiter: "木星", Saturn: "土星", Uranus: "天王星", Neptune: "海王星", Pluto: "冥王星" },
  ko: { Sun: "태양", Moon: "달", Mercury: "수성", Venus: "금성", Mars: "화성", Jupiter: "목성", Saturn: "토성", Uranus: "천왕성", Neptune: "해왕성", Pluto: "명왕성" },
  zh: { Sun: "太阳", Moon: "月亮", Mercury: "水星", Venus: "金星", Mars: "火星", Jupiter: "木星", Saturn: "土星", Uranus: "天王星", Neptune: "海王星", Pluto: "冥王星" },
};

// Aspect brief templates — {transitPlanet} and {natalPlanet} get substituted.
export const ASPECT_BRIEFS: Record<Locale, Record<AspectType, string[]>> = {
  en: {
    conjunction: [
      "{transitPlanet} merges with your natal {natalPlanet}, intensifying its themes.",
      "A powerful fusion of {transitPlanet} energy with your {natalPlanet} placement.",
    ],
    opposition: [
      "{transitPlanet} challenges your natal {natalPlanet}, revealing what needs balancing.",
      "Tension between {transitPlanet} and your {natalPlanet} creates growth through awareness.",
    ],
    trine: [
      "{transitPlanet} flows harmoniously with your {natalPlanet}, easing progress.",
      "Natural support from {transitPlanet} to your {natalPlanet} opens doors effortlessly.",
    ],
    square: [
      "{transitPlanet} creates friction with your {natalPlanet}, motivating necessary change.",
      "Pressure from {transitPlanet} on your {natalPlanet} pushes you to evolve.",
    ],
    sextile: [
      "{transitPlanet} offers an opportunity through your {natalPlanet}. Stay alert.",
      "A gentle nudge from {transitPlanet} activates your {natalPlanet}'s potential.",
    ],
  },
  ja: {
    conjunction: [
      "{transitPlanet}があなたのネイタル{natalPlanet}と重なり、そのテーマを強めます。",
      "{transitPlanet}のエネルギーとあなたの{natalPlanet}が力強く融合します。",
    ],
    opposition: [
      "{transitPlanet}があなたのネイタル{natalPlanet}に挑み、バランスが必要な部分を明らかにします。",
      "{transitPlanet}と{natalPlanet}の緊張が気づきを通じた成長を生みます。",
    ],
    trine: [
      "{transitPlanet}があなたの{natalPlanet}と調和し、物事がスムーズに進みます。",
      "{transitPlanet}から{natalPlanet}への自然な後押しが、扉を軽やかに開きます。",
    ],
    square: [
      "{transitPlanet}が{natalPlanet}に摩擦を生み、必要な変化を促します。",
      "{transitPlanet}から{natalPlanet}への圧力が、あなたを進化させます。",
    ],
    sextile: [
      "{transitPlanet}があなたの{natalPlanet}を通してチャンスをもたらします。アンテナを立てましょう。",
      "{transitPlanet}からの優しい後押しが、あなたの{natalPlanet}の可能性を活性化します。",
    ],
  },
  ko: {
    conjunction: [
      "{transitPlanet}이(가) 당신의 네이탈 {natalPlanet}과(와) 합치며 그 주제를 강화합니다.",
      "{transitPlanet}의 에너지와 당신의 {natalPlanet} 배치가 강력히 융합됩니다.",
    ],
    opposition: [
      "{transitPlanet}이(가) 당신의 네이탈 {natalPlanet}에 도전하며 균형이 필요한 지점을 드러냅니다.",
      "{transitPlanet}과(와) {natalPlanet} 사이의 긴장이 인식을 통해 성장을 만듭니다.",
    ],
    trine: [
      "{transitPlanet}이(가) 당신의 {natalPlanet}과(와) 조화롭게 흐르며 진전을 쉽게 합니다.",
      "{transitPlanet}에서 당신의 {natalPlanet}으로 가는 자연스러운 지원이 문을 수월하게 엽니다.",
    ],
    square: [
      "{transitPlanet}이(가) 당신의 {natalPlanet}에 마찰을 만들어 필요한 변화를 자극합니다.",
      "{transitPlanet}이(가) 당신의 {natalPlanet}에 가하는 압력이 당신을 진화시킵니다.",
    ],
    sextile: [
      "{transitPlanet}이(가) 당신의 {natalPlanet}을(를) 통해 기회를 제공합니다. 깨어 있으세요.",
      "{transitPlanet}의 부드러운 자극이 당신의 {natalPlanet}의 잠재력을 활성화합니다.",
    ],
  },
  zh: {
    conjunction: [
      "{transitPlanet}与你的本命{natalPlanet}合相,强化其主题。",
      "{transitPlanet}的能量与你的{natalPlanet}位置强力融合。",
    ],
    opposition: [
      "{transitPlanet}挑战你的本命{natalPlanet},揭示需要平衡之处。",
      "{transitPlanet}与你的{natalPlanet}之间的张力,通过觉察催生成长。",
    ],
    trine: [
      "{transitPlanet}与你的{natalPlanet}和谐流动,让进展变得轻松。",
      "{transitPlanet}对你的{natalPlanet}的自然支持,让机会之门毫不费力地打开。",
    ],
    square: [
      "{transitPlanet}对你的{natalPlanet}造成摩擦,激发必要的改变。",
      "{transitPlanet}对你的{natalPlanet}的压力,推动你进化。",
    ],
    sextile: [
      "{transitPlanet}通过你的{natalPlanet}提供一个机会。保持警觉。",
      "来自{transitPlanet}的温和助力,激活了你{natalPlanet}的潜能。",
    ],
  },
};

// Compose an aspect brief with localized planet names substituted in.
export function buildAspectBrief(
  locale: Locale,
  transitPlanet: string,
  aspect: AspectType,
  natalPlanet: string,
): string {
  const template = (ASPECT_BRIEFS[locale][aspect] || ASPECT_BRIEFS[locale].conjunction)[0];
  return template
    .replaceAll("{transitPlanet}", PLANET_NAMES[locale][transitPlanet] ?? transitPlanet)
    .replaceAll("{natalPlanet}", PLANET_NAMES[locale][natalPlanet] ?? natalPlanet);
}

// Daily themes by element
export const THEMES: Record<Locale, Record<Element, string[]>> = {
  en: {
    Fire: ["Courage & Bold Action", "Creative Spark", "Passionate Pursuit", "Inner Fire", "Brave New Steps"],
    Earth: ["Grounded Stability", "Practical Progress", "Building Foundations", "Material Abundance", "Steady Growth"],
    Air: ["Clear Communication", "Intellectual Curiosity", "Social Connection", "Fresh Perspectives", "Mental Clarity"],
    Water: ["Emotional Depth", "Intuitive Flow", "Inner Healing", "Compassionate Heart", "Soulful Reflection"],
  },
  ja: {
    Fire: ["勇気と大胆な行動", "創造の閃き", "情熱の追求", "内なる炎", "勇敢な新しい一歩"],
    Earth: ["地に足のついた安定", "実践的な進歩", "土台を築く", "物質的な豊かさ", "着実な成長"],
    Air: ["明確なコミュニケーション", "知的な好奇心", "社会とのつながり", "新鮮な視点", "心の明晰さ"],
    Water: ["感情の深み", "直感の流れ", "内なる癒し", "思いやりの心", "魂の省察"],
  },
  ko: {
    Fire: ["용기와 대담한 행동", "창의적 번뜩임", "열정적 추구", "내면의 불꽃", "용감한 새 발걸음"],
    Earth: ["안정감 있는 기반", "실용적 진전", "기반 다지기", "물질적 풍요", "꾸준한 성장"],
    Air: ["명확한 소통", "지적 호기심", "사회적 연결", "새로운 관점", "정신적 명료함"],
    Water: ["감정의 깊이", "직관의 흐름", "내면의 치유", "공감하는 마음", "영혼의 성찰"],
  },
  zh: {
    Fire: ["勇气与大胆行动", "创意火花", "热情追求", "内在之火", "勇敢的新步伐"],
    Earth: ["稳固的安定", "务实的进展", "夯实基础", "物质的丰盛", "稳定成长"],
    Air: ["清晰的沟通", "智识的好奇", "社交的连接", "新鲜的视角", "心智的清明"],
    Water: ["情感的深度", "直觉的流动", "内在的疗愈", "慈悲的心", "灵魂的省思"],
  },
};

// Daily summaries by element
export const SUMMARIES: Record<Locale, Record<Element, string[]>> = {
  en: {
    Fire: [
      "Your energy is electric today. Channel your passion into meaningful action and watch doors open that seemed firmly shut.",
      "A surge of confidence carries you forward. Trust your instincts -- they're sharper than usual right now.",
      "Today sparks a desire to lead and take initiative. Others are drawn to your warmth and enthusiasm.",
      "Bold moves are favored today. Your natural charisma is amplified, making this ideal for important conversations.",
    ],
    Earth: [
      "Patience and persistence pay off today. Focus on the details that others overlook -- therein lies your advantage.",
      "Today rewards practical thinking and careful planning. Ground yourself in what you know to be true.",
      "Your steady approach attracts resources and support. Build on foundations you've already laid.",
      "A day for tangible progress. Small, consistent steps create lasting change more reliably than grand gestures.",
    ],
    Air: [
      "Your mind is razor-sharp today. Ideas flow freely, and conversations lead to unexpected insights and opportunities.",
      "Communication channels are wide open. Share your thoughts -- someone needs to hear exactly what you have to say.",
      "Curiosity drives you toward fascinating discoveries. Follow the thread of an interesting idea wherever it leads.",
      "Social connections energize you today. A casual conversation could spark a meaningful collaboration or friendship.",
    ],
    Water: [
      "Trust your intuition today -- it's picking up on undercurrents that logic alone would miss. Pay attention to your dreams.",
      "Emotional honesty opens doors to deeper intimacy. Let yourself be vulnerable with someone you trust.",
      "Your empathy is heightened today. Use it wisely to support others, but remember to protect your own energy too.",
      "A reflective mood settles in, inviting you to explore your inner landscape. Journaling or meditation will feel especially rewarding.",
    ],
  },
  ja: {
    Fire: [
      "今日はエネルギーが電流のように流れます。情熱を意味ある行動に注げば、固く閉ざされていた扉が開きます。",
      "自信の高まりがあなたを前へ運びます。直感を信じて — 今はいつもより鋭く働いています。",
      "リードし主導する欲求が今日芽生えます。あなたの温かさと熱意に人々が惹きつけられます。",
      "今日は大胆な動きが味方します。自然なカリスマが増幅され、大事な会話に最適な日です。",
    ],
    Earth: [
      "今日は忍耐と粘り強さが報われます。他人が見落とす細部に集中しましょう — そこにこそ優位があります。",
      "今日は実践的な思考と周到な計画に報いる日です。自分が真実と知るものに根を下ろしましょう。",
      "安定した姿勢が資源と支援を引き寄せます。すでに築いた土台の上に重ねていきましょう。",
      "具体的な進歩の日。大げさな動きより、小さく確かな歩みが確かな変化を生みます。",
    ],
    Air: [
      "今日は頭が冴え渡ります。アイデアが自由に流れ、会話から予想外の洞察やチャンスが生まれます。",
      "コミュニケーションの回路が大きく開いています。思いを共有しましょう — あなたの言葉を必要としている人がいます。",
      "好奇心が魅力的な発見へとあなたを導きます。興味深い考えの糸を、行き着くところまで辿りましょう。",
      "今日は社会とのつながりがあなたを元気づけます。何気ない会話が意味ある協力や友情に火を灯すかもしれません。",
    ],
    Water: [
      "今日は直感を信じて — 論理だけでは捉えられない水面下の流れを感じ取っています。夢にも注意を払いましょう。",
      "感情の正直さが、より深い親密さへの扉を開きます。信頼できる人の前で弱さを見せてみましょう。",
      "今日は共感力が高まっています。他者を支えるために賢く使いながら、自分のエネルギーも大切に守りましょう。",
      "内省的な気分が訪れ、内なる風景の探索へ誘います。ジャーナリングや瞑想が特に満たされる時間になります。",
    ],
  },
  ko: {
    Fire: [
      "오늘 당신의 에너지는 전류처럼 흐릅니다. 열정을 의미 있는 행동에 쏟으면 굳게 닫혔던 문이 열립니다.",
      "자신감의 파도가 당신을 앞으로 이끕니다. 직감을 믿으세요 — 지금은 평소보다 더 예리합니다.",
      "오늘은 주도하고 앞장서려는 욕구가 살아납니다. 당신의 따스함과 열정에 사람들이 이끌립니다.",
      "오늘은 과감한 움직임이 유리합니다. 자연스러운 카리스마가 증폭되어 중요한 대화에 이상적인 날입니다.",
    ],
    Earth: [
      "오늘은 인내와 끈기가 보상받습니다. 다른 사람이 지나치는 디테일에 집중하세요 — 그곳에 당신의 우위가 있습니다.",
      "오늘은 실용적 사고와 세심한 계획에 보답하는 날입니다. 자신이 아는 진실에 뿌리를 내리세요.",
      "꾸준한 접근이 자원과 지지를 끌어당깁니다. 이미 닦아둔 기반 위에 쌓아 올리세요.",
      "구체적인 진전의 날입니다. 거창한 몸짓보다 작고 일관된 걸음이 지속되는 변화를 만듭니다.",
    ],
    Air: [
      "오늘은 머리가 칼날처럼 예리합니다. 아이디어가 자유롭게 흐르고, 대화가 뜻밖의 통찰과 기회로 이어집니다.",
      "소통의 채널이 활짝 열려 있습니다. 생각을 나누세요 — 당신의 말을 꼭 들어야 할 누군가가 있습니다.",
      "호기심이 당신을 매혹적인 발견으로 이끕니다. 흥미로운 생각의 실마리를 끝까지 따라가 보세요.",
      "오늘은 사회적 연결이 당신에게 활력을 줍니다. 스쳐 지나가는 대화가 의미 있는 협업이나 우정에 불을 지필 수 있습니다.",
    ],
    Water: [
      "오늘은 직감을 믿으세요 — 논리만으로는 놓칠 저류를 포착하고 있습니다. 꿈에도 주의를 기울이세요.",
      "감정적 솔직함이 더 깊은 친밀함의 문을 엽니다. 믿을 수 있는 사람 앞에서 약한 모습을 내보이세요.",
      "오늘은 공감 능력이 고조되어 있습니다. 타인을 지지하되 자신의 에너지를 지키는 것도 잊지 마세요.",
      "성찰하는 기분이 내려앉아, 내면의 풍경을 탐색하도록 초대합니다. 저널링이나 명상이 유난히 보람 있을 것입니다.",
    ],
  },
  zh: {
    Fire: [
      "你今天的能量像电流一样涌动。将热情投入有意义的行动,原本紧闭的门将为你打开。",
      "一股自信的浪潮将你向前推进。相信你的直觉 —— 此刻它比平常更敏锐。",
      "今天激起你领导与主动的欲望。人们被你的温暖与热情吸引。",
      "今天适合大胆的行动。你的天生魅力被放大,是重要对话的理想时机。",
    ],
    Earth: [
      "今天耐心与坚持将得到回报。专注于别人忽略的细节 —— 那里正是你的优势。",
      "今天奖励务实的思考与周密的计划。扎根于你所确信的真实。",
      "稳健的步伐吸引资源与支持。在你已铺设的基础上继续搭建。",
      "这是有形进展的一天。小而一致的步伐比宏大的姿态更能创造持久的改变。",
    ],
    Air: [
      "今天你思维锐利如刃。灵感自由流动,对话引出意想不到的洞见与机会。",
      "沟通的通道大开。分享你的想法 —— 有人正需要听见你要说的话。",
      "好奇心引领你走向迷人的发现。顺着一个有趣想法的线索,一直走下去。",
      "今天社交的连接为你注入活力。一次偶然的对话,可能点燃有意义的合作或友谊。",
    ],
    Water: [
      "今天请信任你的直觉 —— 它正捕捉着逻辑无法察觉的暗流。留意你的梦境。",
      "情感的坦诚打开更深亲密的门。在你信任的人面前让自己脆弱一次。",
      "你今天的共情力特别敏锐。明智地用它支持他人,也别忘了保护自己的能量。",
      "一种内省的心绪降临,邀请你探索内在的风景。写日记或冥想会格外滋养。",
    ],
  },
};

// Category templates — love/career/money/energy per element
type CategoryBlock = Record<string, Record<Element, string[]>>;
export const CATEGORIES: Record<Locale, CategoryBlock> = {
  en: {
    love: {
      Fire: ["Passion ignites in unexpected moments. Be open to playful flirtation.", "Your warmth draws admirers. Express your affection boldly.", "Romantic energy is high. Speak from the heart without hesitation.", "A spark of attraction could surprise you. Stay open to connection."],
      Earth: ["Loyalty and reliability deepen bonds today. Show up consistently.", "Small gestures of care mean more than grand declarations right now.", "A stable presence strengthens your closest relationship.", "Practical acts of love -- cooking, fixing, helping -- speak volumes today."],
      Air: ["Engaging conversation is the pathway to someone's heart today.", "Witty exchanges and shared laughter bring you closer to someone special.", "Intellectual compatibility matters most right now. Connect through ideas.", "A lighthearted approach to love opens doors. Don't overthink it."],
      Water: ["Deep emotional sharing strengthens your most important bond.", "Vulnerability creates intimacy. Let your guard down with someone safe.", "Your intuition guides you toward the right words for a tender moment.", "Compassion and patience heal an old relational pattern today."],
    },
    career: {
      Fire: ["Take the lead on a project that excites you. Your initiative impresses.", "Bold proposals gain traction. Don't hold back your ambitious ideas.", "Your competitive edge is an asset today. Channel it constructively.", "A leadership opportunity presents itself. Step up with confidence."],
      Earth: ["Methodical work produces impressive results. Focus on quality.", "Financial planning and budgeting efforts bear fruit today.", "Your reliability earns trust from higher-ups. Keep delivering.", "A practical solution to a persistent problem elevates your standing."],
      Air: ["Networking and idea-sharing lead to valuable professional connections.", "Your communication skills solve a team challenge today.", "Presenting your ideas clearly wins allies and supporters.", "A creative brainstorm yields an innovative approach to an old problem."],
      Water: ["Reading the room gives you a strategic advantage in meetings.", "Your empathy helps resolve a workplace tension. Others notice your skill.", "Trust your gut feeling about a professional opportunity.", "Collaborative projects thrive when you bring emotional intelligence to the table."],
    },
    money: {
      Fire: ["A bold financial move could pay off, but calculate the risk first.", "Your earning potential increases when you negotiate with confidence.", "Invest energy in passion projects -- they have future monetary value.", "Entrepreneurial impulses are strong. Explore a side venture idea."],
      Earth: ["Careful budgeting and saving create future security. Review your finances.", "A practical investment opportunity deserves your attention today.", "Steady income streams are favored. Focus on sustainable growth.", "Material resources are available -- use them wisely and efficiently."],
      Air: ["Financial insight comes through research and informed decision-making.", "A conversation about money leads to a valuable tip or opportunity.", "Multiple income streams suit your versatile nature. Diversify.", "Intellectual property and digital assets could be lucrative right now."],
      Water: ["Trust your instincts about a financial decision, but verify with facts.", "Generosity returns to you in unexpected ways. Give without attachment.", "Emotional spending may tempt you -- pause before purchasing impulsively.", "A creative endeavor has hidden financial potential. Explore it gently."],
    },
    energy: {
      Fire: ["Physical activity channels your excess energy productively. Move your body.", "Your vitality is at a peak. Use this surge to tackle demanding tasks.", "Avoid burnout by balancing intensity with moments of rest.", "Outdoor activity in sunlight recharges your natural fire."],
      Earth: ["A grounding routine stabilizes your energy. Stick to healthy habits.", "Nature walks or gardening restore your equilibrium today.", "Your body responds well to nourishing, whole foods right now.", "Sleep quality matters more than quantity. Create a restful bedtime ritual."],
      Air: ["Mental stimulation energizes you, but take breaks to avoid overthinking.", "Fresh air and open spaces clear mental fog. Step outside.", "Social interaction boosts your vitality. Connect with uplifting people.", "Breathwork or meditation restores clarity when you feel scattered."],
      Water: ["Emotional processing may drain your energy. Honor the need for solitude.", "Water-related activities -- baths, swimming, rain walks -- deeply restore you.", "Creative expression channels emotional energy into something beautiful.", "Rest is productive today. Let yourself recharge without guilt."],
    },
  },
  ja: {
    love: {
      Fire: ["予想外の瞬間に情熱が灯ります。無邪気な戯れに心を開いて。", "あなたの温かさが人を惹きつけます。愛情を大胆に伝えましょう。", "恋のエネルギーが高まっています。ためらわず心から語りましょう。", "思いがけない惹かれに驚くかも。つながりに心を開いて。"],
      Earth: ["忠実さと信頼が今日の絆を深めます。変わらずそばに居ましょう。", "いまは大げさな宣言より、小さな心遣いが多くを物語ります。", "安定した存在感が、一番近い関係を強めます。", "料理、修繕、手助け — 実践的な愛の行為が今日は雄弁に語ります。"],
      Air: ["今日は心に通じる道は魅力的な会話です。", "機知に富んだやり取りと共有の笑いが、特別な誰かとの距離を縮めます。", "いまは知的な相性が一番大切。考えでつながりましょう。", "軽やかな恋のアプローチが扉を開きます。考えすぎないで。"],
      Water: ["深い感情の共有が、最も大切な絆を強めます。", "弱さが親密さを生みます。安全な相手の前で心を開きましょう。", "直感が、優しい瞬間にふさわしい言葉へ導きます。", "今日は慈しみと忍耐が、古い関係性のパターンを癒します。"],
    },
    career: {
      Fire: ["わくわくするプロジェクトで主導権を取って。行動力が印象を残します。", "大胆な提案が力を得ます。野心的なアイデアを引っ込めないで。", "今日はあなたの競争心が強みです。建設的に使いましょう。", "リーダーシップのチャンスが訪れます。自信を持って前へ。"],
      Earth: ["緻密な仕事が印象的な結果を生みます。質にこだわって。", "財務計画や予算作りの努力が、今日実を結びます。", "あなたの信頼性が上層の信頼を得ます。結果を出し続けて。", "長引く問題への実践的な解決策が、あなたの立場を高めます。"],
      Air: ["ネットワーキングとアイデアの共有が、価値ある人脈に繋がります。", "あなたのコミュニケーション力が、今日チームの課題を解決します。", "考えを明快に示すことで味方と支持者を得ます。", "創造的なブレインストーミングが、古い課題に新しい切り口をもたらします。"],
      Water: ["場の空気を読む力が、会議での戦略的優位になります。", "共感力が職場の緊張を和らげます。周りはあなたの力に気づきます。", "仕事上の機会について直感を信じて。", "共同作業はあなたが情緒的知性を持ち込むと成功します。"],
    },
    money: {
      Fire: ["大胆な金銭の動きが実を結ぶ可能性。ただしリスクを計算してから。", "自信を持って交渉することで、稼ぐ力が高まります。", "情熱のプロジェクトにエネルギーを投じて — 未来の金銭的価値があります。", "起業への衝動が強まります。副業のアイデアを探ってみて。"],
      Earth: ["慎重な予算管理と貯蓄が、将来の安心を作ります。家計を見直して。", "実践的な投資機会が、今日あなたの注意を求めます。", "安定した収入源が有利です。持続可能な成長に集中して。", "物質的な資源が揃っています — 賢く効率的に使いましょう。"],
      Air: ["金銭の洞察は、調査と情報に基づく判断からやってきます。", "お金に関する会話が、貴重なヒントや機会をもたらします。", "多様性のあるあなたには、複数の収入源が合います。分散しましょう。", "知的財産やデジタル資産が、今は利益を生み得ます。"],
      Water: ["金銭の判断は直感を信じつつ、事実で確認を。", "寛容さが思わぬ形で返ってきます。執着せずに与えましょう。", "感情的な買い物に注意 — 衝動買いの前に一呼吸。", "創作の営みに、隠れた金銭的可能性があります。そっと探って。"],
    },
    energy: {
      Fire: ["身体を動かすことで余剰エネルギーを生産的に使えます。", "活力がピークにあります。この勢いで大きな課題に挑みましょう。", "強度と休息のバランスで燃え尽きを避けましょう。", "日差しの下での外活動が、あなたの自然な火を再充電します。"],
      Earth: ["地に足のついたルーティンがエネルギーを安定させます。健康な習慣を続けて。", "自然の中の散歩や園芸が、今日の平衡を取り戻します。", "いまは滋養のあるホールフードに身体がよく応えます。", "睡眠は量より質。休める就寝儀式を作りましょう。"],
      Air: ["知的な刺激は活力源。ただし考えすぎを避けるため休憩を。", "新鮮な空気と開けた場所が頭の霧を晴らします。外へ出て。", "社交的なやり取りが活力を高めます。前向きな人と繋がりましょう。", "散漫な時は呼吸法や瞑想が明晰さを取り戻します。"],
      Water: ["感情処理がエネルギーを消耗させることも。孤独の時間を大切に。", "水に関わる活動 — 入浴、水泳、雨歩き — が深く回復させます。", "創造的表現が、感情のエネルギーを美しい何かへ導きます。", "今日は休むことが生産的。罪悪感なく充電しましょう。"],
    },
  },
  ko: {
    love: {
      Fire: ["예상 못한 순간 열정이 피어오릅니다. 장난스런 밀당에 마음을 열어 보세요.", "당신의 온기가 사람을 끌어당깁니다. 애정을 대담하게 표현하세요.", "로맨틱한 에너지가 고조됩니다. 망설이지 말고 마음에서 우러나는 말을 하세요.", "예기치 못한 끌림이 찾아올 수 있어요. 연결에 마음을 열어 두세요."],
      Earth: ["충실함과 신뢰가 오늘의 유대를 깊게 합니다. 한결같이 곁에 머무르세요.", "지금은 거창한 선언보다 작은 관심의 제스처가 더 많은 것을 말합니다.", "안정적인 존재감이 가장 가까운 관계를 단단하게 합니다.", "요리, 고치기, 돕기 — 실천하는 사랑이 오늘은 크게 말합니다."],
      Air: ["오늘은 매력적인 대화가 누군가의 마음에 이르는 길입니다.", "재치 있는 대화와 함께 나누는 웃음이 특별한 사람과의 거리를 좁힙니다.", "지금은 지적 궁합이 가장 중요합니다. 아이디어로 연결되세요.", "가벼운 로맨스의 태도가 문을 엽니다. 너무 깊이 생각하지 마세요."],
      Water: ["깊은 감정의 공유가 가장 중요한 유대를 강화합니다.", "취약함이 친밀함을 만듭니다. 안전한 사람 앞에서 경계를 풀어 보세요.", "직감이 다정한 순간에 어울리는 말로 당신을 이끕니다.", "오늘은 자비와 인내가 오래된 관계 패턴을 치유합니다."],
    },
    career: {
      Fire: ["설레는 프로젝트에서 주도권을 잡으세요. 추진력이 깊은 인상을 남깁니다.", "과감한 제안이 힘을 얻습니다. 야심 찬 아이디어를 숨기지 마세요.", "오늘은 당신의 경쟁심이 자산입니다. 건설적으로 써 보세요.", "리더십 기회가 다가옵니다. 자신 있게 나서세요."],
      Earth: ["치밀한 작업이 인상적인 결과를 냅니다. 품질에 집중하세요.", "재정 계획과 예산 수립의 노력이 오늘 결실을 맺습니다.", "당신의 신뢰성이 윗사람의 믿음을 얻습니다. 계속 결과를 내세요.", "오래 묵은 문제에 대한 실용적 해법이 당신의 위상을 높입니다."],
      Air: ["네트워킹과 아이디어 공유가 가치 있는 전문 인맥으로 이어집니다.", "당신의 소통 능력이 오늘 팀의 난제를 풉니다.", "아이디어를 명확히 전달해 우군과 지지자를 얻으세요.", "창의적 브레인스토밍이 오래된 문제에 혁신적 접근을 가져옵니다."],
      Water: ["분위기를 읽는 능력이 회의에서 전략적 우위를 줍니다.", "공감이 직장 긴장을 푸는 데 도움을 줍니다. 사람들은 그 능력을 알아봅니다.", "직업적 기회에 대한 직감을 믿으세요.", "공동 작업은 정서 지능을 가져올 때 빛납니다."],
    },
    money: {
      Fire: ["과감한 금융 움직임이 보상을 줄 수 있어요. 단, 리스크를 먼저 계산하세요.", "자신감 있게 협상하면 수입 잠재력이 커집니다.", "열정 프로젝트에 에너지를 투자하세요 — 미래의 금전적 가치가 있습니다.", "창업의 충동이 강합니다. 사이드 프로젝트 아이디어를 탐색해 보세요."],
      Earth: ["신중한 예산과 저축이 미래의 안정을 만듭니다. 재정을 점검하세요.", "실용적인 투자 기회가 오늘 관심을 요구합니다.", "안정적인 수입원이 유리합니다. 지속 가능한 성장에 집중하세요.", "물질적 자원이 준비되어 있습니다 — 현명하고 효율적으로 쓰세요."],
      Air: ["금전의 통찰은 조사와 정보 기반 결정에서 옵니다.", "돈에 관한 대화가 소중한 팁이나 기회로 이어집니다.", "다재다능한 당신에게 다중 수입원이 잘 맞습니다. 분산하세요.", "지적 재산과 디지털 자산이 지금 수익성이 있을 수 있습니다."],
      Water: ["금전 결정에서 직감을 믿되 사실로 확인하세요.", "관대함이 뜻밖의 방식으로 돌아옵니다. 집착 없이 주세요.", "감정적 소비가 유혹할 수 있습니다 — 충동구매 전에 멈추세요.", "창작 활동에 숨은 금전적 가능성이 있습니다. 부드럽게 탐색하세요."],
    },
    energy: {
      Fire: ["신체 활동이 남는 에너지를 생산적으로 써줍니다. 몸을 움직이세요.", "활력이 정점입니다. 이 기세로 어려운 과제를 해치우세요.", "강도와 휴식의 균형으로 번아웃을 피하세요.", "햇빛 아래 야외 활동이 당신 본연의 불을 재충전합니다."],
      Earth: ["그라운딩 루틴이 에너지를 안정시킵니다. 건강한 습관을 유지하세요.", "자연 산책이나 정원 가꾸기가 오늘의 균형을 회복합니다.", "지금은 영양가 있는 홀푸드에 몸이 잘 반응합니다.", "수면은 양보다 질입니다. 편안한 취침 의식을 만드세요."],
      Air: ["정신적 자극이 에너지를 주지만, 과도한 생각을 피하려 쉬는 시간도 가지세요.", "맑은 공기와 탁 트인 공간이 머릿속의 안개를 걷어냅니다. 밖으로 나가세요.", "사회적 교류가 활력을 북돋웁니다. 기운을 주는 사람과 연결하세요.", "호흡 수련이나 명상이 산만할 때 명료함을 되찾아 줍니다."],
      Water: ["감정 처리에 에너지가 빠질 수 있습니다. 홀로 있는 시간을 존중하세요.", "물과 관련된 활동 — 목욕, 수영, 빗속 산책 — 이 깊이 회복시켜 줍니다.", "창의적 표현이 감정 에너지를 아름다운 것으로 변환합니다.", "오늘은 쉬는 것이 생산적입니다. 죄책감 없이 재충전하세요."],
    },
  },
  zh: {
    love: {
      Fire: ["激情在意外的瞬间燃起。对俏皮的调情保持开放。", "你的温暖吸引仰慕者。大胆表达你的爱意。", "浪漫能量高涨。毫不迟疑地从心表达。", "一次意外的吸引可能让你惊喜。对连接保持开放。"],
      Earth: ["忠诚与可靠深化今日的纽带。始终如一地在场。", "此刻细小的关心胜过宏大的宣言。", "稳定的存在感强化你最亲密的关系。", "实际的爱 — 做饭、修理、帮忙 — 今日胜过千言万语。"],
      Air: ["今日通往某人心的路,是有趣的对话。", "机智的交谈与共同的笑声,让你与特别的人更近。", "此刻最重要的是智识的契合。用想法相连。", "轻盈的恋爱态度打开了门。不要想太多。"],
      Water: ["深层情感的分享巩固你最重要的纽带。", "脆弱创造亲密。在可信之人面前卸下防备。", "直觉引导你在柔软的时刻找到合适的话。", "今日慈悲与耐心能疗愈一段旧的关系模式。"],
    },
    career: {
      Fire: ["在让你兴奋的项目上担任领导。你的主动令人印象深刻。", "大胆的提案获得牵引。别收住你雄心勃勃的想法。", "今日你的竞争优势是资产。建设性地运用它。", "一个领导机会出现了。自信地站出来。"],
      Earth: ["有条不紊的工作产出令人印象深刻的成果。专注于品质。", "财务规划与预算的努力今日结出果实。", "你的可靠赢得上级的信任。继续交付。", "对长期问题的务实解决方案提升你的地位。"],
      Air: ["人脉与分享想法带来宝贵的职业连接。", "你的沟通技能今日解决团队的难题。", "清晰地呈现你的想法赢得盟友与支持者。", "创造性的头脑风暴为老问题带来创新的切入。"],
      Water: ["读懂气氛给你会议中的战略优势。", "同理心帮你化解职场紧张。别人会注意到你的本事。", "对职业机会信任你的直觉。", "当你将情绪智力带上桌,合作项目便能蓬勃。"],
    },
    money: {
      Fire: ["大胆的财务动作可能有回报,但先计算风险。", "带着自信谈判,你的赚钱潜力会上升。", "将精力投入热情项目 —— 它们有未来的金钱价值。", "创业的冲动强烈。探索一个副业想法。"],
      Earth: ["细心的预算与储蓄创造未来的安全。检视你的财务。", "一个务实的投资机会今日值得关注。", "稳定的收入流最为有利。专注于可持续增长。", "物质资源齐备 —— 明智且高效地使用它们。"],
      Air: ["金钱的洞察来自研究与有依据的决策。", "一次关于钱的对话带来宝贵的提示或机会。", "多重收入流适合你的多面天性。分散配置。", "知识产权与数字资产此刻可能带来丰厚回报。"],
      Water: ["信任你对财务决策的直觉,但用事实验证。", "慷慨以意想不到的方式回到你身边。给予时不执着。", "情绪性消费可能诱惑你 —— 冲动购买前先停一停。", "创作中藏有金钱潜能。温柔地探索它。"],
    },
    energy: {
      Fire: ["身体活动高效地引导你的多余能量。动起来。", "你的活力处于高峰。用这股势头去处理吃力的任务。", "以强度与休息的平衡避免倦怠。", "阳光下的户外活动为你天生的火再充电。"],
      Earth: ["扎根的日常稳定你的能量。坚持健康的习惯。", "自然散步或园艺今日恢复你的平衡。", "此刻你的身体很响应滋养的全食物。", "睡眠质量比数量更重要。创建一个安宁的就寝仪式。"],
      Air: ["心智刺激给你能量,但留出休息避免过度思考。", "新鲜空气与开阔空间清除心智的雾气。走出去。", "社交互动提升你的活力。与鼓舞人心的人连接。", "当你感到涣散,呼吸练习或冥想会恢复清明。"],
      Water: ["情感的处理可能耗散你的能量。尊重独处的需要。", "与水相关的活动 —— 沐浴、游泳、雨中散步 —— 深深地修复你。", "创意表达将情感能量引导向美好的事物。", "今日休息就是高效。毫无愧疚地为自己充电。"],
    },
  },
};

// Do / avoid lists per element (3 words each, 3 variants)
export const DO_LISTS: Record<Locale, Record<Element, string[][]>> = {
  en: {
    Fire: [["Take initiative", "Express yourself", "Exercise"], ["Start something new", "Be spontaneous", "Embrace challenge"], ["Lead by example", "Try something bold", "Share your enthusiasm"]],
    Earth: [["Organize finances", "Cook a nourishing meal", "Declutter"], ["Plan ahead", "Build routine", "Invest in quality"], ["Connect with nature", "Finish a project", "Practice patience"]],
    Air: [["Call a friend", "Read something inspiring", "Journal"], ["Learn something new", "Share ideas", "Explore freely"], ["Network", "Write your thoughts", "Ask thoughtful questions"]],
    Water: [["Meditate", "Express emotions", "Rest deeply"], ["Create art", "Listen to music", "Be gentle with yourself"], ["Practice gratitude", "Nurture a relationship", "Trust your gut"]],
  },
  ja: {
    Fire: [["主導を取る", "自己表現する", "運動する"], ["新しいことを始める", "自発的に動く", "挑戦を受け入れる"], ["率先垂範する", "大胆に挑む", "熱意を分かち合う"]],
    Earth: [["家計を整える", "滋養ある食事を作る", "片付ける"], ["計画を立てる", "ルーティンを築く", "質に投資する"], ["自然とつながる", "プロジェクトを仕上げる", "忍耐を養う"]],
    Air: [["友人に電話する", "刺激的な本を読む", "日記を書く"], ["新しいことを学ぶ", "考えを共有する", "自由に探求する"], ["人脈を広げる", "思考を書き留める", "丁寧な質問をする"]],
    Water: [["瞑想する", "感情を表現する", "深く休む"], ["アートを作る", "音楽を聴く", "自分に優しくする"], ["感謝を実践する", "関係を育む", "直感を信じる"]],
  },
  ko: {
    Fire: [["주도하기", "자기 표현", "운동"], ["새로 시작하기", "즉흥적으로 움직이기", "도전 받아들이기"], ["모범 보이기", "과감히 시도", "열정 나누기"]],
    Earth: [["재정 정리", "영양 가득한 식사 요리", "정리"], ["미리 계획", "루틴 만들기", "품질에 투자"], ["자연과 연결", "프로젝트 마무리", "인내 연습"]],
    Air: [["친구에게 전화", "영감 주는 독서", "저널링"], ["새로운 것 배우기", "아이디어 공유", "자유롭게 탐색"], ["네트워킹", "생각 적기", "사려 깊은 질문"]],
    Water: [["명상", "감정 표현", "깊은 휴식"], ["예술 창작", "음악 감상", "자신에게 다정하게"], ["감사 실천", "관계 돌보기", "직감 신뢰"]],
  },
  zh: {
    Fire: [["主动出击", "自我表达", "锻炼"], ["开始新事物", "自发行动", "拥抱挑战"], ["以身作则", "勇敢尝试", "分享热情"]],
    Earth: [["整理财务", "烹调营养餐", "断舍离"], ["提前规划", "建立常规", "投资品质"], ["与自然连接", "完成项目", "练习耐心"]],
    Air: [["打电话给朋友", "阅读启发之作", "写日记"], ["学习新事物", "分享想法", "自由探索"], ["拓展人脉", "记录思绪", "提出深思的问题"]],
    Water: [["冥想", "表达情感", "深度休息"], ["创作艺术", "聆听音乐", "温柔待己"], ["练习感恩", "滋养一段关系", "信任直觉"]],
  },
};

export const AVOID_LISTS: Record<Locale, Record<Element, string[][]>> = {
  en: {
    Fire: [["Impulsive decisions", "Arguments for sport", "Overcommitting"], ["Burning bridges", "Skipping rest", "Dominating conversations"]],
    Earth: [["Stubbornness", "Overworking", "Material excess"], ["Resistance to change", "Overthinking details", "Neglecting play"]],
    Air: [["Gossip", "Overthinking", "Emotional avoidance"], ["Scattered attention", "Breaking commitments", "Cold detachment"]],
    Water: [["People-pleasing", "Escapism", "Emotional overwhelm"], ["Absorbing others' moods", "Avoiding tough truths", "Isolation"]],
  },
  ja: {
    Fire: [["衝動的な決断", "勝ち負けの口論", "抱え込みすぎ"], ["関係を断つこと", "休息を抜くこと", "会話を支配すること"]],
    Earth: [["頑固さ", "働きすぎ", "物の過剰"], ["変化への抵抗", "細部の考えすぎ", "遊びの軽視"]],
    Air: [["陰口", "考えすぎ", "感情の回避"], ["散漫な注意", "約束を破ること", "冷たく距離を置くこと"]],
    Water: [["人に合わせすぎ", "現実逃避", "感情の飲み込まれ"], ["他人の気分を吸収", "厳しい真実の回避", "孤立"]],
  },
  ko: {
    Fire: [["충동적 결정", "이기고 지는 논쟁", "과도한 약속"], ["다리 불태우기", "휴식 건너뛰기", "대화 독점"]],
    Earth: [["고집", "과로", "물질적 과잉"], ["변화 거부", "세부 과잉 사고", "놀이 소홀"]],
    Air: [["험담", "과도한 생각", "감정 회피"], ["산만함", "약속 어기기", "차가운 거리두기"]],
    Water: [["남에게 맞추기", "현실 도피", "감정의 압도"], ["타인 기분 흡수", "불편한 진실 회피", "고립"]],
  },
  zh: {
    Fire: [["冲动决策", "为争而争", "承担过多"], ["烧断桥梁", "跳过休息", "主导对话"]],
    Earth: [["固执", "过度工作", "物质过剩"], ["抗拒变化", "过度琢磨细节", "忽视玩乐"]],
    Air: [["搬弄是非", "过度思考", "回避情感"], ["注意力涣散", "违背承诺", "冷漠疏离"]],
    Water: [["讨好他人", "逃避现实", "情绪淹没"], ["吸收他人情绪", "回避难啃的真相", "孤立"]],
  },
};

export const POWER_MOVES: Record<Locale, Record<Element, string[]>> = {
  en: {
    Fire: ["Send that bold message you've been drafting in your head.", "Volunteer to lead a project or initiative.", "Set one ambitious goal and take the first step today.", "Express something you've been holding back."],
    Earth: ["Organize one area of your life that's been cluttered.", "Open a savings account or set up automatic transfers.", "Create a concrete plan for a goal you've been vaguely considering.", "Complete a task you've been procrastinating on."],
    Air: ["Reach out to someone you've lost touch with.", "Write down three innovative ideas, no matter how wild.", "Start a meaningful conversation you've been avoiding.", "Learn something new -- a skill, a language, a concept."],
    Water: ["Write an unsent letter to process a complex emotion.", "Practice a 10-minute meditation focused on self-compassion.", "Share a vulnerability with someone you deeply trust.", "Create something artistic, even if it's imperfect."],
  },
  ja: {
    Fire: ["頭の中で下書きしてきた大胆なメッセージを送る。", "プロジェクトや取り組みのリーダーに立候補する。", "野心的な目標を一つ決め、今日最初の一歩を踏み出す。", "これまで抑えていたことを表現する。"],
    Earth: ["散らかっている生活の一領域を整える。", "貯蓄口座を開くか、自動振替を設定する。", "ぼんやり考えてきた目標に、具体的な計画を作る。", "後回しにしてきたタスクを完了する。"],
    Air: ["疎遠になっていた誰かに連絡する。", "どんなに突飛でも、革新的なアイデアを三つ書き留める。", "避けてきた大切な会話を始める。", "新しいことを学ぶ — スキル、言語、概念。"],
    Water: ["複雑な感情を処理するため、送らない手紙を書く。", "自己への慈しみに焦点を当てた10分の瞑想をする。", "深く信頼する人に弱さを分かち合う。", "不完全でも、芸術的な何かを作る。"],
  },
  ko: {
    Fire: ["머릿속에서 다듬어 온 과감한 메시지를 보내세요.", "프로젝트나 활동의 리더를 자원하세요.", "야심 찬 목표 하나를 세우고 오늘 첫걸음을 내딛으세요.", "참아 온 것을 표현하세요."],
    Earth: ["정돈되지 않은 삶의 한 영역을 정리하세요.", "저축 계좌를 열거나 자동 이체를 설정하세요.", "막연히 생각해 온 목표에 구체적 계획을 세우세요.", "미뤄 온 일 하나를 끝내세요."],
    Air: ["연락이 끊긴 누군가에게 연락하세요.", "얼마나 과감하든, 혁신적 아이디어 세 가지를 적어 보세요.", "피해 온 의미 있는 대화를 시작하세요.", "새로운 것을 배우세요 — 기술, 언어, 개념."],
    Water: ["복잡한 감정을 풀기 위해 부치지 않을 편지를 쓰세요.", "자기 자비에 초점 맞춘 10분 명상을 하세요.", "깊이 신뢰하는 사람에게 약한 부분을 나누세요.", "불완전해도 예술적인 무언가를 만드세요."],
  },
  zh: {
    Fire: ["发送那条你在脑中草拟已久的大胆讯息。", "主动担任项目或行动的领导。", "定下一个雄心目标,今天迈出第一步。", "表达那些一直压抑着的话。"],
    Earth: ["整理生活中杂乱的一个角落。", "开一个储蓄账户或设置自动转账。", "把一个模糊的目标落成具体计划。", "完成一件你一直拖着的事。"],
    Air: ["联系一位久未联络的人。", "写下三个创新想法,再狂野也没关系。", "开启一段你一直回避的重要对话。", "学习新的东西 —— 技能、语言、概念。"],
    Water: ["写一封不寄出的信,处理复杂的情感。", "做十分钟以自我慈悲为焦点的冥想。", "与深深信任的人分享一份脆弱。", "创作一些艺术的东西,即便不完美。"],
  },
};

export const RITUALS: Record<Locale, Record<Element, string[]>> = {
  en: {
    Fire: ["Light a candle and set one clear intention for the day.", "Stand in sunlight for three minutes, breathing deeply and feeling revitalized.", "Write one bold affirmation on a card and carry it with you."],
    Earth: ["Hold a stone or crystal and take five grounding breaths.", "Walk barefoot on earth or grass for three minutes.", "Arrange a small altar with natural objects that bring you peace."],
    Air: ["Open a window and take seven deep breaths of fresh air.", "Write three things you're curious about on separate slips of paper.", "Sit quietly and observe your thoughts without engaging them for five minutes."],
    Water: ["Cup water in your hands and whisper an intention before drinking.", "Take a brief shower and imagine washing away what no longer serves you.", "Close your eyes and visualize yourself floating in calm, healing water."],
  },
  ja: {
    Fire: ["キャンドルに火を灯し、今日の明確な意図を一つ立てる。", "三分間日光に立ち、深く呼吸して活力を感じる。", "大胆なアファメーションをカードに書き、持ち歩く。"],
    Earth: ["石やクリスタルを手に取り、地に根差す呼吸を五回する。", "三分間、裸足で土や草の上を歩く。", "心を落ち着かせる自然の品で小さな祭壇を整える。"],
    Air: ["窓を開け、新鮮な空気を七回深く吸い込む。", "好奇心のあるものを紙片に三つ書き出す。", "五分間静かに座り、考えに巻き込まれず眺める。"],
    Water: ["手で水を受け、飲む前に意図をささやく。", "さっとシャワーを浴び、もう不要なものを洗い流す様子を想像する。", "目を閉じ、穏やかで癒しの水に浮かぶ自分を思い描く。"],
  },
  ko: {
    Fire: ["양초에 불을 붙이고 하루의 명확한 의도를 하나 세우세요.", "햇빛 아래 3분간 서서 깊게 숨쉬며 활력을 느끼세요.", "대담한 확언을 카드에 써서 지니고 다니세요."],
    Earth: ["돌이나 크리스털을 쥐고 지면에 뿌리내리는 호흡을 다섯 번 하세요.", "3분간 흙이나 풀 위를 맨발로 걸으세요.", "평화를 주는 자연의 물건들로 작은 제단을 꾸미세요."],
    Air: ["창문을 열고 신선한 공기를 일곱 번 깊이 들이마시세요.", "호기심이 가는 세 가지를 각각의 종이쪽에 적으세요.", "5분간 조용히 앉아 생각에 휘말리지 않고 바라보세요."],
    Water: ["물을 손에 받고, 마시기 전에 의도를 속삭이세요.", "짧은 샤워를 하며 더 이상 필요 없는 것을 씻어내는 모습을 그리세요.", "눈을 감고 고요하고 치유의 물 위에 떠 있는 자신을 그려 보세요."],
  },
  zh: {
    Fire: ["点燃一支蜡烛,为今日设定一个清晰的意图。", "在阳光下站三分钟,深呼吸,感受活力回归。", "在卡片上写下一句大胆的肯定语,随身携带。"],
    Earth: ["握住一块石头或水晶,做五次扎根的呼吸。", "赤脚在泥土或草地上走三分钟。", "用让你安宁的自然物品布置一座小祭坛。"],
    Air: ["打开窗户,深深吸入新鲜空气七次。", "将让你好奇的三件事,各写在一张纸条上。", "安静地坐五分钟,不介入地观察自己的念头。"],
    Water: ["双手捧水,饮下之前低声许下一个意图。", "洗一个简短的澡,想象自己洗掉不再滋养你的一切。", "闭上眼,想象自己漂浮在平静而疗愈的水中。"],
  },
};

export const JOURNAL_PROMPTS: Record<Locale, Record<Element, string[]>> = {
  en: {
    Fire: ["What would I do today if I weren't afraid?", "Where in my life am I holding back my true power?", "What passion have I been neglecting that deserves my attention?", "If I could change one thing about my life starting now, what would it be?"],
    Earth: ["What brings me the deepest sense of security and stability?", "What small daily habit would most improve my wellbeing?", "What am I building that future-me will be grateful for?", "Where can I simplify my life to create more space for what matters?"],
    Air: ["What idea has been circling my mind that deserves exploration?", "If I could have a conversation with anyone, who and about what?", "What beliefs am I ready to question and potentially release?", "How can I better communicate what I truly need?"],
    Water: ["What emotion am I carrying that needs acknowledgment?", "When did I last feel truly seen and understood?", "What would healing look like for the part of me that still hurts?", "What does my intuition keep whispering that my mind keeps overriding?"],
  },
  ja: {
    Fire: ["もし恐れがなければ、今日何をするだろう?", "人生のどこで自分の本当の力を抑えているだろう?", "見過ごしてきた、注意を向けるに値する情熱は何?", "今から人生の一つを変えられるなら、何を変える?"],
    Earth: ["私に最も深い安心と安定をもたらすものは何?", "私の健康を最も高める小さな日課は?", "未来の自分が感謝するような、何を築いているだろう?", "大切なもののための余白を作るため、どこを単純化できる?"],
    Air: ["頭を巡り続ける、探求に値するアイデアは何?", "誰とでも話せるなら、誰と何について話す?", "問い直し、手放してもよい信念はどれ?", "本当に必要なものをどう伝えれば良い?"],
    Water: ["認識されることを待つ感情を、私は抱えているだろうか?", "本当に見られ理解されたと最後に感じたのはいつ?", "まだ痛むところへの癒しは、どんな形をしているだろう?", "直感がささやき続け、頭が打ち消し続けているのは何?"],
  },
  ko: {
    Fire: ["두려움이 없다면 오늘 무엇을 할까?", "내 삶의 어디에서 진짜 힘을 억누르고 있는가?", "놓쳐 온, 주목받을 가치가 있는 열정은 무엇인가?", "지금부터 내 삶에서 한 가지를 바꿀 수 있다면 무엇을 바꾸겠는가?"],
    Earth: ["가장 깊은 안정과 안전감을 주는 것은 무엇인가?", "내 웰빙을 가장 향상시킬 작은 일상 습관은?", "미래의 내가 감사할, 나는 무엇을 쌓고 있는가?", "중요한 것에 공간을 더 내려면, 어디를 단순화할 수 있는가?"],
    Air: ["내 마음에 맴도는, 탐구할 가치가 있는 아이디어는?", "누구와든 대화할 수 있다면, 누구와 무엇을 이야기하겠는가?", "다시 묻고 내려놓을 준비가 된 믿음은 무엇인가?", "진정으로 필요한 것을 어떻게 더 잘 전할 수 있는가?"],
    Water: ["인정받아야 할, 내가 품고 있는 감정은 무엇인가?", "진정으로 보여지고 이해받는다고 느낀 가장 최근은 언제?", "여전히 아픈 내 부분에 치유는 어떤 모습일까?", "직감이 계속 속삭이고 마음이 계속 덮어 쓰는 것은 무엇인가?"],
  },
  zh: {
    Fire: ["若没有恐惧,我今天会做什么?", "我在生活的哪里压抑了真正的力量?", "我忽略了哪些值得关注的热情?", "若能从现在起改变人生的一件事,会是什么?"],
    Earth: ["什么给我最深的安定与稳固感?", "哪个小小的日常习惯最能提升我的健康?", "我正在搭建的、未来的我会感激的是什么?", "在哪里简化生活,能为真正重要的事腾出空间?"],
    Air: ["在我脑中盘旋、值得探索的想法是什么?", "若能与任何人对话,我想与谁谈什么?", "我准备质疑并可能放下的信念是什么?", "我如何能更好地表达真正需要的东西?"],
    Water: ["我承载的、需要被承认的情绪是什么?", "上一次真正被看见、被理解,是什么时候?", "对那个仍在痛的部分而言,疗愈是什么样子?", "直觉一直低语、而我一直压过它的是什么?"],
  },
};
