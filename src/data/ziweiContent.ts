// Zi Wei Dou Shu (紫微斗數) — interpretation content.
//
// CONTENT ONLY. This module holds no calculation: no lunar conversion, no
// palace placement, no star derivation. It is the text layer that a chart
// engine looks things up in once it knows which star sits in which palace.
//
// Voice notes for future edits: warm, second-person, specific. Describe a
// tendency and the work it asks for — never a fixed fate, never a verdict.
// 2-3 sentences per entry so the UI can render any entry inline without
// truncation.

/** The 14 major stars (十四主星) — the primary cast of a Zi Wei chart. */
export const STAR_MEANINGS: Record<string, { cn: string; title: string; text: string }> = {
  Ziwei: {
    cn: '紫微',
    title: 'The Emperor',
    text: 'Ziwei is the axis the rest of the chart arranges itself around — the star of natural authority, dignity, and the quiet expectation of being taken seriously. Wherever it sits, you carry a sense of responsibility that can feel like a birthright on good days and a weight on the others. Its gift is steadiness under pressure; its work is learning that real authority is service, not distance.',
  },
  Tianji: {
    cn: '天機',
    title: 'The Strategist',
    text: 'Tianji is the turning wheel of the mind — quick, analytical, and endlessly interested in how the pieces fit together. In its palace you think your way through life, spotting patterns and adjusting course long before anyone else notices the wind has changed. The invitation is to let some questions rest unsolved, because not every situation improves by being figured out.',
  },
  Taiyang: {
    cn: '太陽',
    title: 'The Sun',
    text: 'Taiyang gives without keeping accounts — warmth, visibility, and a generous instinct to light the room for other people. In its palace you tend to be seen, and you tend to be relied upon, sometimes more than feels fair. Learn to notice when giving has quietly become depletion, because a sun that burns without pause eventually dims.',
  },
  Wuqu: {
    cn: '武曲',
    title: 'The General',
    text: 'Wuqu is decisive, practical, and unsentimental — the star of executed plans and money handled with care. Where it sits you get things done, and you would rather build something solid than describe it beautifully. Its edge is a certain hardness: softness is not weakness, and letting people close does not cost you your discipline.',
  },
  Tiantong: {
    cn: '天同',
    title: 'The Peacemaker',
    text: 'Tiantong carries an easy, unforced sweetness — the ability to enjoy your life, recover from setbacks, and make peace feel like the natural state of things. In its palace comfort finds you, and conflict tends to dissolve rather than escalate. The growth edge is momentum, because contentment is a genuine gift but drifting is not the same as being at ease.',
  },
  Lianzhen: {
    cn: '廉貞',
    title: 'The Reformer',
    text: 'Lianzhen runs hot — principled, magnetic, and capable of both fierce discipline and sudden abandon, often in the same week. It is the most contradictory of the fourteen, giving you strong convictions and equally strong appetites. Its lesson is integration: the intensity was never the problem, the gap between what you preach and what you want is.',
  },
  Tianfu: {
    cn: '天府',
    title: 'The Steward',
    text: 'Tianfu is the storehouse — resourceful, measured, and instinctively good at keeping things safe and sufficient. Where it sits you gather and stabilise, and people come to you when they need solid ground under their feet. Watch for hoarding, whether that is money, options, or feelings you never quite spend.',
  },
  Taiyin: {
    cn: '太陰',
    title: 'The Moon',
    text: 'Taiyin works quietly and in the background, with a sensitivity that reads a room before anyone has spoken. Its palace is where you nurture, imagine, and keep your own counsel — the area where your inner life is richest and least visible to others. Because the moon has phases, expect this part of you to cycle; the low weeks are not failure, they are the shape of the thing.',
  },
  Tanlang: {
    cn: '貪狼',
    title: 'The Seeker',
    text: 'Tanlang is appetite in the best and most complicated sense — for beauty, experience, connection, and the next interesting thing. In its palace you are charming and adaptable, able to walk into almost any room and belong there. The work is depth, because wanting everything is a wonderful engine and a poor destination.',
  },
  Jumen: {
    cn: '巨門',
    title: 'The Questioner',
    text: 'Jumen is the star of the searching question — the one that refuses a smooth answer and keeps digging until something true is actually visible. Its palace is where you speak, argue, investigate, and occasionally wound people with your accuracy. Doubt here is a tool rather than a flaw, but it needs somewhere to point, or it turns around and starts on you.',
  },
  Tianxiang: {
    cn: '天相',
    title: 'The Minister',
    text: 'Tianxiang is the trusted second — fair, well-mannered, and reliable in the way that makes other people’s plans possible. In its palace you support, mediate, and care about doing things properly rather than loudly. The caution is borrowed direction: you are so good at serving a vision that you may forget to check whether it is yours.',
  },
  Tianliang: {
    cn: '天梁',
    title: 'The Elder',
    text: 'Tianliang is the shade tree — protective, principled, and somehow older than its years wherever it falls. This is the part of your chart that gives counsel, absorbs other people’s trouble, and stays calm when a crisis finally arrives. Its shadow is a moralising distance, because care turns into control the moment it stops asking what the other person actually wants.',
  },
  Qisha: {
    cn: '七殺',
    title: 'The Vanguard',
    text: 'Qisha moves first and explains afterwards — decisive, self-reliant, and most alive when something real is at stake. Its palace is where you take risks alone, and where you would rather break a situation open than sit inside it. The lesson is timing: courage that never rests becomes restlessness, and not every wall needs charging.',
  },
  Pojun: {
    cn: '破軍',
    title: 'The Pioneer',
    text: 'Pojun tears down what has stopped working, often before a replacement is ready. Its palace is the area of your life that refuses to stay settled — where you keep starting over, sometimes at real cost and sometimes because you were the only one honest enough to say the old form was already dead. Endings here are a function rather than a punishment; the skill worth building is choosing your demolitions deliberately.',
  },
  // ── 輔弼昌曲 — the four support stars (輔星). Not rulers of a palace the way
  // the fourteen majors are, but included because four of the ten year stems
  // send a 四化 to one of them, and because they are the supports every
  // traditional reading actually leans on.
  Zuofu: {
    cn: '左輔',
    title: 'The Left Support',
    text: 'Zuofu is help that arrives without being asked for — the mentor, the older colleague, the friend who quietly makes the introduction. Wherever it sits, things tend to go better than you managed alone, and people are inclined to back you. Its work is letting yourself be helped, and remembering to be that person for someone else.',
  },
  Youbi: {
    cn: '右弼',
    title: 'The Right Support',
    text: 'Youbi is the same generosity from the other side: allies, timing that works out, doors that happen to be open. It softens whatever it sits with, and in a difficult palace it is often the reason a hard chapter stays survivable. Its work is not mistaking good fortune for a plan.',
  },
  Wenchang: {
    cn: '文昌',
    title: 'The Scholar',
    text: 'Wenchang is the written word, the examination passed, the argument set down clearly. It brings a mind that organises well and an instinct for the formal, credentialed route. Its work is keeping the polish honest — Wenchang can make a thin idea sound finished.',
  },
  Wenqu: {
    cn: '文曲',
    title: 'The Artist',
    text: 'Wenqu is expression rather than documentation — music, performance, charm, the turn of phrase that lands. Where Wenchang studies, Wenqu feels its way, and it gives an ease with people that opens rooms. Its work is following through after the room is won.',
  },
};

/** The 12 palaces (十二宮) — the life areas a Zi Wei chart divides into. */
export const PALACE_MEANINGS: Record<string, { cn: string; en: string; text: string }> = {
  life: {
    cn: '命宮',
    en: 'Life',
    text: 'The Life palace is the front door of the whole chart — your core temperament, the face you meet the world with, and the instincts that fire before you have consciously decided anything. Stars here describe how you move rather than what happens to you. Read it as the weather you carry with you, which tints every other palace.',
  },
  siblings: {
    cn: '兄弟宮',
    en: 'Siblings',
    text: 'This palace covers brothers and sisters and, by extension, everyone who stands beside you rather than above or below — close collaborators, co-founders, the people in the same boat. It describes how you share space with equals: whether you compete, protect, or quietly keep score. It also hints at how much support is available once you stop trying to do everything alone.',
  },
  spouse: {
    cn: '夫妻宮',
    en: 'Spouse',
    text: 'The Spouse palace speaks to committed partnership — what draws you, who you become once you are inside a relationship, and the pattern that tends to repeat until you can see it clearly. It describes your half of the dynamic far more honestly than it predicts any particular person. Read it as a mirror, not a casting call.',
  },
  children: {
    cn: '子女宮',
    en: 'Children',
    text: 'This palace holds children in the literal sense and also everything else you raise: projects, students, work that will outlive your involvement in it. It shows how you nurture, how easily you let go, and what you quietly expect from the things you have made. Difficult stars here usually point at control rather than absence.',
  },
  wealth: {
    cn: '財帛宮',
    en: 'Wealth',
    text: 'The Wealth palace covers money in motion — how it arrives, how you handle it, and your emotional relationship to having and spending. It says far more about your financial temperament than about any final number. Two people on the same income with different stars here live noticeably different lives.',
  },
  health: {
    cn: '疾厄宮',
    en: 'Health',
    text: '疾厄 means illness and hardship together, and this palace covers both: your constitution, where stress tends to land in your body, and how you meet a difficult stretch. It is not a diagnosis and should never be read as one. Treat it as a map of where to pay attention early, and take anything that worries you to an actual doctor.',
  },
  travel: {
    cn: '遷移宮',
    en: 'Travel',
    text: 'The Travel palace covers everything beyond your familiar ground — relocation, journeys, and the version of you that appears when you are far from home. It also describes how the wider world receives you: whether opportunity finds you out there, or whether you do your best work close to your roots. Strong stars here often mean your life expands when you move.',
  },
  friends: {
    cn: '交友宮',
    en: 'Friends',
    text: 'This palace holds your wider circle — friends, colleagues, and the people you rely on without the intensity of family or partnership. It shows the quality of company you attract and how much of yourself you invest in keeping a network alive. It also asks a fair question: do you let these people actually know you?',
  },
  career: {
    cn: '官祿宮',
    en: 'Career',
    text: '官祿 covers your work in the world and the standing it earns you — vocation, ambition, and the particular way you like to be useful. This palace describes the shape of work that suits you rather than a job title. Read it alongside Wealth: one is what you do, the other is what it returns.',
  },
  property: {
    cn: '田宅宮',
    en: 'Property',
    text: 'The Property palace covers land, dwellings, and inheritance, but its deeper subject is your sense of a stable base. It shows how much you need a fixed place, what home means to you, and whether your roots feel chosen or handed down. Movement here is not instability — it may simply mean home is something you build more than once.',
  },
  fortune: {
    cn: '福德宮',
    en: 'Fortune',
    text: '福德 is the palace of inner wellbeing — your capacity for pleasure, your peace of mind, your spiritual life, and the texture of your private hours. Many readers treat it as the most telling palace in the chart, because it describes whether a good life actually feels good from the inside. It is where you meet yourself with nothing to do.',
  },
  parents: {
    cn: '父母宮',
    en: 'Parents',
    text: 'This palace covers your mother and father and, by extension, everyone who has held authority over you — teachers, bosses, institutions. It describes the shape of the support and the pressure you met early, and how that taught you to relate to power ever since. Hard stars here mark a pattern worth understanding, not a verdict on anyone’s love for you.',
  },
};

/** The four transformations (四化) — how a star behaves once it is activated. */
export const TRANSFORMATION_MEANINGS: Record<
  'hua_lu' | 'hua_quan' | 'hua_ke' | 'hua_ji',
  { cn: string; en: string; text: string }
> = {
  hua_lu: {
    cn: '化祿',
    en: 'Fortune',
    text: '化祿 opens a channel: wherever it lands, resources, opportunities and goodwill move toward you with less friction than you have any right to expect. It is the easiest gift in the chart, which is exactly why it rewards being spent and shared rather than sat on.',
  },
  hua_quan: {
    cn: '化權',
    en: 'Power',
    text: '化權 hands you the controls — drive, influence, and a real ability to make things move in this part of your life. The force is genuine, so the live question is not whether you have power here but whether you can use it with a light enough hand.',
  },
  hua_ke: {
    cn: '化科',
    en: 'Reputation',
    text: '化科 polishes: it brings recognition, a good name, and an appetite for learning wherever it falls. It works slowly and in public, rewarding the parts of your life you are willing to do carefully and in the open.',
  },
  hua_ji: {
    cn: '化忌',
    en: 'Fixation',
    text: '化忌 marks where your attention sticks — the area you circle back to, worry over, and cannot quite put down. Traditionally read as obstruction, it is more useful to read as concentration: the friction is uncomfortable, but this is usually where your deepest competence and most honest growth end up being made.',
  },
};

/** The five bureaus (五行局) — the elemental tempo a chart runs at. */
export const BUREAU_MEANINGS: Record<'water2' | 'wood3' | 'metal4' | 'earth5' | 'fire6', string> = {
  water2:
    'Water Bureau (水二局) moves fastest and adapts first — you learn by immersion, take the shape of whatever container you are in, and tend to mature early. The caution is depth over drift: water always finds a way through, but it does its best work with banks to run between.',
  wood3:
    'Wood Bureau (木三局) grows steadily and upward, building on what already exists instead of starting from nothing. You are patient by construction, and your best results come from the things you were willing to let take years.',
  metal4:
    'Metal Bureau (金四局) is defined by structure, precision, and a certain necessary hardness — you cut cleanly and you hold your form under pressure. That strength is real, but metal that never yields eventually cracks instead of bending.',
  earth5:
    'Earth Bureau (土五局) is the slowest and most durable temperament — grounded, dependable, and comfortable carrying weight for other people. You tend to come into your own later than your peers, which is less lateness than a longer foundation.',
  fire6:
    'Fire Bureau (火六局) burns bright and works in bursts — sudden clarity, fast starts, and an intensity people feel the moment you walk in. Your real task is fuel management, because fire is generous with its light and careless with its own supply.',
};

/** Orientation text for readers arriving from a Western-astrology background. */
export const ZIWEI_INTRO: string =
  'Zi Wei Dou Shu (紫微斗數, “Purple Star Astrology”) is a Chinese charting system that will feel both familiar and strange if you already know Western astrology. Like a natal chart it divides a life into twelve sectors, but where Western houses are cast against the sky at your moment of birth, Zi Wei fills its twelve palaces — self, wealth, partnership, career and the rest — with a fixed cast of symbolic stars placed by formula from your lunar-calendar birth date and hour. Almost none of those stars are astronomical objects: 紫微 is not a body anyone has ever pointed a telescope at, and the system has never claimed to be measuring one. Treat it as a structured mirror rather than a forecast — a centuries-old symbolic language for looking at your own life from twelve angles, valuable for reflection and self-honesty, not for prediction.';
