// Major Arcana Spreads Library
// Twenty-two themed tarot spreads, one per Major Arcana card. Each spread
// channels its card's archetypal energy into a focused question framework.
// Slugs end with "-spread" to clearly distinguish from existing /spreads/* slugs.

import type { TarotSpread } from './tarotSpreads';

export const majorArcanaSpreads: TarotSpread[] = [
  // ----------------------------------------------------------------------
  // 0. THE FOOL — New Beginning
  // ----------------------------------------------------------------------
  {
    slug: 'the-fool-spread',
    name: 'The Fool Spread',
    category: 'spiritual',
    cardCount: 3,
    difficulty: 'intermediate',
    durationMin: 15,
    shortDescription:
      'Three cards for the threshold moment — the call you hear, the leap you take, and what waits on the other side.',
    longDescription:
      'The Fool is card zero, the eternal beginner, standing at the cliff with one foot in the air. This spread is built for moments when you are being asked to start something — a new chapter, a new identity, a new life — without the certainty of where it lands. Three cards trace the arc of any honest beginning: the call that woke you up, the leap that takes courage, and the territory that opens once you commit. It is a spread for naming what is actually being born, rather than what you think you should be doing.',
    bestFor: [
      'Standing on the edge of a major life change',
      'Naming a calling that has been quietly insisting on you',
      'When fear of starting is louder than any other voice',
      'New jobs, new cities, new relationships, new selves',
      'Breaking out of a chapter that has clearly ended',
    ],
    whenToUse:
      'Pull this spread when you feel the tug of a new direction but cannot yet see where it leads. Best used at thresholds — birthdays, anniversaries, the morning after a decision feels inevitable. Avoid it when you are running from something rather than toward something; the Fool walks toward, not away.',
    history:
      'The Fool has been read as the soul before incarnation in mystical tarot traditions, the wanderer who has not yet been numbered into the story. Modern teachers from Rachel Pollack to Mary Greer treat the Fool as the energy of pure potential, the one card that exists outside the sequence entirely.',
    positions: [
      {
        position: 1,
        name: 'The call',
        meaning:
          'What is calling you forward — the quiet voice, the recurring image, the inner pull that refuses to leave you alone. This card names the beginning that wants to happen through you.',
      },
      {
        position: 2,
        name: 'The leap',
        meaning:
          'The specific act of courage required. Not the dream — the move. What you would actually have to do, say, or release for this beginning to take its first real breath.',
      },
      {
        position: 3,
        name: 'What awaits',
        meaning:
          'The territory that opens once you commit. Not a guaranteed outcome — the energetic field you step into the moment your foot leaves the cliff. Often very different from what you imagined.',
      },
    ],
    exampleQuestions: [
      'What new chapter is trying to begin in my life right now?',
      'I keep feeling pulled toward something but I cannot name it — what is it?',
      'What would happen if I actually took this leap I keep postponing?',
      'How do I move from dreaming about this to starting it?',
      'What identity is asking to be born in me?',
    ],
    faqs: [
      {
        q: 'What if my "call" card looks dark or scary?',
        a: 'A difficult call card is still a call. The Fool does not promise pleasant beginnings — only honest ones. A scary card often points to a calling that requires you to face something specific before it can fully arrive.',
      },
      {
        q: 'How do I know the difference between a true calling and impulsiveness?',
        a: 'Compare cards 1 and 2. A true calling tends to produce a leap card that is concrete and inconvenient. Pure impulse usually produces a leap card that is fantasy-shaped or dramatic but vague.',
      },
      {
        q: 'The "what awaits" card looks worse than where I am now. Should I not leap?',
        a: 'Read the card as energetic territory, not verdict. The Fool sometimes leaps into discomfort that is necessary growth. Ask whether the difficulty is the lesson, or whether the card is showing the wrong leap.',
      },
      {
        q: 'Can I use this spread for small beginnings, like a new project?',
        a: 'Yes, but it is designed for thresholds you actually feel in your body. For a small project, a One Card Daily or Three Card spread is usually enough.',
      },
    ],
    relatedSpreads: [
      'the-magician-spread',
      'the-star-spread',
      'judgement-spread',
    ],
  },

  // ----------------------------------------------------------------------
  // I. THE MAGICIAN — Manifesting Power
  // ----------------------------------------------------------------------
  {
    slug: 'the-magician-spread',
    name: 'The Magician Spread',
    category: 'spiritual',
    cardCount: 4,
    difficulty: 'intermediate',
    durationMin: 20,
    shortDescription:
      'Four cards to align intention, tools, will, and outcome — the alchemy of bringing something real into the world.',
    longDescription:
      'The Magician is the card of focused power, the one who points up to spirit and down to earth and lets energy move through. This spread is for moments when you have a vision but the wires between intention and result feel tangled. Four cards walk you through the Magician\'s formula: what do you actually intend, what do you have to work with, where is your will being spent, and what is the most likely manifestation under current conditions. Use it when you are tired of dreaming and ready to direct.',
    bestFor: [
      'Naming and clarifying a goal you actually want to manifest',
      'Auditing the tools and resources already in your hands',
      'Finding where your will is being leaked or scattered',
      'Launches, bids, applications, creative offerings',
      'Moving from "someday" to "starting now"',
    ],
    whenToUse:
      'Use this spread when you are ready to commit energy to a specific manifestation. Best at the start of a project, a quarter, a lunar cycle, or any clean reset. Not useful when your intention is still fully unformed — pull a Fool Spread first to find the call before you try to shape it.',
    history:
      'Early occult tarot traditions tied the Magician to Mercury and to Hermetic correspondence — "as above, so below." The four suits on his table (cup, sword, wand, pentacle) became a standard symbol for the four elements available to any creator with focus.',
    positions: [
      {
        position: 1,
        name: 'Intention',
        meaning:
          'What you actually want, beneath the polished version. The truest aim of the work, including the parts of it you may be embarrassed to admit. Manifestation begins with naming this honestly.',
      },
      {
        position: 2,
        name: 'Tools',
        meaning:
          'The resources, skills, relationships, and timing already available to you. The Magician does not need new tools — only awareness of the ones already on the table.',
      },
      {
        position: 3,
        name: 'Will',
        meaning:
          'How your focused energy is currently being directed — or scattered. This card often surfaces the leak: the distraction, the doubt, the second project you are secretly carrying.',
      },
      {
        position: 4,
        name: 'Outcome',
        meaning:
          'What is most likely to manifest given the current alignment of intention, tools, and will. Not a fixed prediction — a forecast that updates the moment you adjust any of the prior three.',
      },
    ],
    exampleQuestions: [
      'How do I bring this idea into the real world?',
      'What is blocking my creative work from launching?',
      'Where is my energy actually going compared to where I think it is going?',
      'What do I already have that I have been overlooking?',
      'What would it take to make this offer actually land?',
    ],
    faqs: [
      {
        q: 'What if my intention card and outcome card disagree?',
        a: 'That is the whole point of the spread. Disagreement between cards 1 and 4 means your tools or will are not yet aligned with what you say you want. Read cards 2 and 3 carefully — that is where the adjustment lives.',
      },
      {
        q: 'My "tools" card looks scarce. Does that mean I should wait?',
        a: 'Often it means the opposite. The Magician thrives on what is in front of him, not what is missing. A scarce-looking tools card usually points to one underused resource you are dismissing.',
      },
      {
        q: 'How is this different from a generic outcome spread?',
        a: 'This spread is specifically diagnostic. The Magician asks you to take responsibility for the result by examining the components. A pure outcome reading just tells you the weather.',
      },
      {
        q: 'Can I redo this spread weekly for the same project?',
        a: 'Yes, and it is one of the best uses of it. The intention card should stay relatively stable; the tools and will cards will shift as you act, and watching them move is itself the practice.',
      },
    ],
    relatedSpreads: [
      'the-fool-spread',
      'the-emperor-spread',
      'the-chariot-spread',
    ],
  },

  // ----------------------------------------------------------------------
  // II. THE HIGH PRIESTESS — Inner Knowing
  // ----------------------------------------------------------------------
  {
    slug: 'the-high-priestess-spread',
    name: 'The High Priestess Spread',
    category: 'spiritual',
    cardCount: 5,
    difficulty: 'advanced',
    durationMin: 30,
    shortDescription:
      'Five cards for the gap between what you see and what you already know — pierce the veil and listen.',
    longDescription:
      'The High Priestess sits between the pillars, behind a veil, holding a scroll only half-revealed. She is the keeper of what you know but have not yet admitted to yourself. This spread is for situations where logic has done its work and stalled — where the missing information is not external but inward. Five cards map the conscious view, the unconscious knowing, the veil between them, the hidden truth, and what you can actually trust right now. It is a quiet, slow spread that rewards stillness and refuses to be rushed.',
    bestFor: [
      'Decisions where your gut and your head disagree',
      'Surfacing what you already know but have been refusing to say',
      'Reading between the lines of a situation that "feels off"',
      'Spiritual or psychic development practice',
      'Sitting with mystery instead of forcing an answer',
    ],
    whenToUse:
      'Use this spread when you have already gathered the facts and the answer still has not landed. Best in dim light, in silence, with phone away. Avoid it when you are emotionally activated — wait for your nervous system to settle, or the veil card will only reflect your panic.',
    history:
      'The High Priestess descends from the older Papess card and was reframed by the Hermetic Order of the Golden Dawn as the lunar feminine principle — keeper of the moon\'s reflective wisdom. Pamela Colman Smith\'s scroll, partly hidden, became the iconic symbol of selective revelation.',
    positions: [
      {
        position: 1,
        name: 'What the conscious mind sees',
        meaning:
          'The version of the situation your daylight self is working with. The story you would tell out loud. Not wrong — partial.',
      },
      {
        position: 2,
        name: 'What the unconscious knows',
        meaning:
          'The deeper read your body, dreams, and intuition have already made. Often the card you most want to argue with. Pay attention to what you instinctively dismiss.',
      },
      {
        position: 3,
        name: 'The veil',
        meaning:
          'What is between the two — the specific resistance, fear, or socialization that keeps the conscious and unconscious knowings separate. The thing the Priestess asks you to acknowledge before she lifts the scroll.',
      },
      {
        position: 4,
        name: 'Hidden truth',
        meaning:
          'The piece of the picture that has not been spoken aloud yet. Sometimes about another person, sometimes about you, sometimes about the situation itself. Read this card slowly.',
      },
      {
        position: 5,
        name: 'What to trust',
        meaning:
          'The signal worth following from here. Not a directive — a tuning. Where the Priestess is pointing your inner ear right now.',
      },
    ],
    exampleQuestions: [
      'What do I already know about this situation that I have not let myself say?',
      'My intuition has been loud lately — what is it actually telling me?',
      'What is being hidden in this dynamic — by them, or by me?',
      'How do I tell the difference between fear and a real warning?',
      'What does my higher knowing want me to stop arguing with?',
    ],
    faqs: [
      {
        q: 'My "veil" card seems vague. How do I read it?',
        a: 'The veil is supposed to be subtle. Read it as a quality, not an event — shame, urgency, distraction, performance. Whatever quality is between cards 1 and 2 is what is keeping the truth obscured.',
      },
      {
        q: 'What if cards 1 and 2 are nearly identical?',
        a: 'A rare and powerful result. It means your conscious and unconscious are unusually aligned — the hidden truth and trust cards become especially actionable, because there is no internal conflict in the way.',
      },
      {
        q: 'Can I use this spread to read someone else\'s hidden motives?',
        a: 'Carefully. The Priestess prefers honesty about your own perception over speculation about theirs. Frame the question as "what am I not seeing about this dynamic" rather than "what are they hiding from me."',
      },
      {
        q: 'How long should I sit with this spread before interpreting?',
        a: 'At least ten minutes of silent observation before reaching for words. The High Priestess responds to patience the way other spreads respond to questions.',
      },
    ],
    relatedSpreads: [
      'the-moon-spread',
      'the-hermit-spread',
      'the-hanged-man-spread',
    ],
  },

  // ----------------------------------------------------------------------
  // III. THE EMPRESS — Creative Abundance
  // ----------------------------------------------------------------------
  {
    slug: 'the-empress-spread',
    name: 'The Empress Spread',
    category: 'spiritual',
    cardCount: 5,
    difficulty: 'intermediate',
    durationMin: 25,
    shortDescription:
      'Five cards to follow a creation from seed to harvest — what to plant, what to nurture, and what fertilizes the soil.',
    longDescription:
      'The Empress is the card of generative abundance, the lush garden, the body that grows things. This spread is for any creative or life endeavor that is not yet fully formed — a project, a relationship, a child, a body of work, a season of yourself. Five cards trace the cycle of creation: the seed you are planting, what nurtures it, where it grows, what it harvests, and the deeper soil that fertilizes the whole field. It is a spread that asks you to slow down to the speed of growing things.',
    bestFor: [
      'Long-arc creative work — books, businesses, gardens, families',
      'Tracking a project from concept through completion',
      'Reconnecting with pleasure, sensuality, and the body as a creative force',
      'Pregnancy, parenting, and any season of literal nurturing',
      'When you have been all yang and need to remember yin',
    ],
    whenToUse:
      'Use this spread at the start or midpoint of any creative cycle that requires patience. Especially powerful in spring, around the new moon, or when you have just finished one project and need to feel into the next. Avoid when you are in pure crisis mode — the Empress reads slow energies, not fires.',
    history:
      'The Empress has been associated with Demeter, Venus, and the great mother goddesses across traditions. In Marseille decks she sits enthroned and pregnant; in Waite-Smith decks she reclines in a wheat field. The card is read as the principle of nature creating itself through abundance.',
    positions: [
      {
        position: 1,
        name: 'The seed',
        meaning:
          'The actual creative impulse at the heart of this work. Not the marketing version — the living thing that wants to grow. Often smaller and more specific than the dream around it.',
      },
      {
        position: 2,
        name: 'How to nurture',
        meaning:
          'The daily care this creation requires. Watering schedule rather than grand gesture. The unglamorous practice that keeps the seed alive.',
      },
      {
        position: 3,
        name: 'The growth',
        meaning:
          'The form this creation is taking on as it develops. How it is changing shape, what it is becoming, where it is growing in directions you did not plant.',
      },
      {
        position: 4,
        name: 'The harvest',
        meaning:
          'What this creation will yield when it ripens — including the parts that are not what you originally imagined. The Empress harvests what was actually grown, not what was originally planned.',
      },
      {
        position: 5,
        name: 'What fertilizes',
        meaning:
          'The deeper soil — your relationships, rest, joy, body, lineage — that feeds everything in the garden. The most important card to honor and the one most often neglected.',
      },
    ],
    exampleQuestions: [
      'What does this creative project actually need from me right now?',
      'How is this work actually growing, beyond what I can measure?',
      'What kind of harvest am I really moving toward?',
      'What part of my life am I starving to feed this project?',
      'How do I bring more pleasure, body, and abundance into what I am building?',
    ],
    faqs: [
      {
        q: 'My "harvest" card looks meager. Should I abandon this project?',
        a: 'Not necessarily. A small harvest card sometimes points to a smaller-than-expected return that still matters, or to a delayed yield. Read it alongside the seed card — sometimes the seed itself was never going to grow into what you wanted.',
      },
      {
        q: 'How is "nurture" different from the "tools" card in the Magician Spread?',
        a: 'Tools are what you wield. Nurture is what you give. The Magician directs energy outward; the Empress lets energy grow through her. Different physics entirely.',
      },
      {
        q: 'Can I use this spread for a relationship, not a project?',
        a: 'Yes — relationships are one of its strongest uses. Treat the relationship itself as the seed and read the harvest card as what kind of bond is actually being grown between you.',
      },
      {
        q: 'What if the "fertilizes" card surprises me?',
        a: 'Trust it. The Empress often reveals that the deepest source of your creative life is something you do not credit — a friendship, a habit, a forgotten place. Honor whatever shows up.',
      },
    ],
    relatedSpreads: [
      'the-emperor-spread',
      'the-sun-spread',
      'the-world-spread',
    ],
  },

  // ----------------------------------------------------------------------
  // IV. THE EMPEROR — Building Structure
  // ----------------------------------------------------------------------
  {
    slug: 'the-emperor-spread',
    name: 'The Emperor Spread',
    category: 'spiritual',
    cardCount: 5,
    difficulty: 'intermediate',
    durationMin: 25,
    shortDescription:
      'Five cards to build something that lasts — vision, boundaries, discipline, authority, and legacy.',
    longDescription:
      'The Emperor is the card of structure, sovereignty, and the architecture that holds a life or a kingdom together. This spread is for moments when you are being asked to take the throne in your own life — to set the rules, draw the lines, and build something that will still stand in ten years. Five cards examine the vision you are organizing your life around, the boundaries that protect it, the discipline that maintains it, the authority you wield over it, and the legacy it is on track to leave. It is a serious spread for serious building.',
    bestFor: [
      'Founders, leaders, parents, and anyone holding structural responsibility',
      'Setting or repairing boundaries in work and life',
      'Long-term planning — career, finances, family, health',
      'When chaos has become a habit and order is overdue',
      'Stepping into your own authority after years of deferring',
    ],
    whenToUse:
      'Use this spread when you are tired of operating reactively and ready to build a frame. Best read at the start of a year, fiscal quarter, or new role. Avoid it during grief or destabilization — the Emperor reads cleanly when the ground is steady, not when it is shaking.',
    history:
      'The Emperor card has been associated with worldly authority, the Roman imperial archetype, and Aries energy in astrological tarot. In esoteric traditions he is often paired with the Empress — she creates, he organizes; she is the field, he is the wall around it.',
    positions: [
      {
        position: 1,
        name: 'Vision',
        meaning:
          'The kingdom you are actually trying to build. The long shape of the life or work, beyond this quarter\'s targets. What this is all in service of.',
      },
      {
        position: 2,
        name: 'Boundaries',
        meaning:
          'Where the lines need to hold. What is inside the wall, what is outside, who has access, who does not. Often the most uncomfortable card to act on.',
      },
      {
        position: 3,
        name: 'Discipline',
        meaning:
          'The daily structure that maintains the kingdom. The non-negotiable practices, schedules, and rules that hold the vision in place when motivation runs out.',
      },
      {
        position: 4,
        name: 'Authority',
        meaning:
          'How you are wielding power right now — well, poorly, or not at all. Whether you are abdicating, overreaching, or actually inhabiting the seat. The most personal card in the spread.',
      },
      {
        position: 5,
        name: 'Legacy',
        meaning:
          'What this structure will leave behind if you keep building it as is. Not just outcome — inheritance. What the next decade or generation will receive from your work.',
      },
    ],
    exampleQuestions: [
      'What kind of life am I actually building, structurally?',
      'Where do I need to draw a harder line in my work?',
      'What discipline is missing from how I run my days?',
      'Am I stepping into my authority or hiding from it?',
      'What will my career or family actually have built in ten years?',
    ],
    faqs: [
      {
        q: 'My "authority" card looks weak or shadowed. What does that mean?',
        a: 'It usually means you are deferring power that is yours to hold, or wielding it from fear instead of clarity. Read it next to the boundaries card — the two are deeply connected.',
      },
      {
        q: 'How is the Emperor Spread different from a career-planning spread?',
        a: 'It is broader. The Emperor builds whole lives, not just careers. Use career spreads for tactics; use this spread when you are designing the frame everything else hangs on.',
      },
      {
        q: 'What if I do not feel like an authority figure at all?',
        a: 'That is exactly when the spread is most useful. The Emperor is not a personality type — it is a function. Read the authority card as instruction in how to begin holding the seat, not as judgment.',
      },
      {
        q: 'Can the Emperor be too rigid?',
        a: 'Yes, and the discipline card often warns of it. If the discipline card is heavy or restrictive, ask what it is overprotecting — sometimes the kingdom needs fewer walls, not more.',
      },
    ],
    relatedSpreads: [
      'the-empress-spread',
      'the-hierophant-spread',
      'the-world-spread',
    ],
  },

  // ----------------------------------------------------------------------
  // V. THE HIEROPHANT — Sacred Tradition
  // ----------------------------------------------------------------------
  {
    slug: 'the-hierophant-spread',
    name: 'The Hierophant Spread',
    category: 'spiritual',
    cardCount: 5,
    difficulty: 'advanced',
    durationMin: 25,
    shortDescription:
      'Five cards on tradition, teachers, and the spiritual lineage you are inheriting or breaking from.',
    longDescription:
      'The Hierophant stands between two pillars and two kneeling students, holding the keys to a tradition. This spread is for moments when you are reckoning with what you have been taught — by your culture, family, religion, or chosen tradition — and discerning what to carry forward and what to leave behind. Five cards examine the teacher you have been listening to, the teaching itself, what is worth keeping, what to question, and the spiritual path that is actually yours. It is a spread for people thoughtful enough to know that not all inheritance is theirs to keep.',
    bestFor: [
      'Reckoning with religious or cultural upbringing',
      'Choosing or evaluating a teacher, mentor, or community',
      'Spiritual seekers between traditions',
      'When inherited rules no longer fit but the love for the source remains',
      'Building your own sacred practice from many sources',
    ],
    whenToUse:
      'Use this spread when a tradition you were given is in question — religious, family, professional, or spiritual. Best read in a quiet, ritualized space; the Hierophant responds to seriousness. Avoid it as a way to justify rebellion you have already decided on; the spread is for honest inquiry, not for collecting evidence.',
    history:
      'The Hierophant was originally the Pope card and represented church authority. Modern decks softened him into an archetype of any orthodox teacher — guru, priest, professor, elder. He is the keeper of consensus reality, which can be a refuge or a cage depending on the seeker.',
    positions: [
      {
        position: 1,
        name: 'The teacher',
        meaning:
          'The voice or institution that has been shaping your spiritual or moral worldview — chosen or not. May be a person, a church, a family lineage, an internet community, or your own internalized authority.',
      },
      {
        position: 2,
        name: 'The teaching',
        meaning:
          'The core lesson or doctrine being transmitted. What you have actually been taking in, beneath the surface message.',
      },
      {
        position: 3,
        name: 'What to keep',
        meaning:
          'The genuine wisdom in the tradition — the part that has kept you alive, oriented, or whole. What deserves to be carried forward.',
      },
      {
        position: 4,
        name: 'What to question',
        meaning:
          'What no longer serves, or never did. The piece of the tradition that needs to be examined, challenged, or quietly released. Read this card carefully and without performance.',
      },
      {
        position: 5,
        name: 'Your spiritual path',
        meaning:
          'The shape of your own practice as it is becoming — which may include the tradition, transform it, or move beyond it entirely. The Hierophant blesses honest paths even when they leave his temple.',
      },
    ],
    exampleQuestions: [
      'How do I make peace with the religion I was raised in?',
      'Is this teacher or guide actually right for me?',
      'What do I want to keep from my family\'s spiritual life?',
      'What inherited belief is no longer true for me?',
      'What kind of practice is mine to build now?',
    ],
    faqs: [
      {
        q: 'What if my "teacher" card is harsh or shadowed?',
        a: 'A shadowed teacher card often points to an authority figure whose influence has been more controlling than nourishing. Read it without flinching, but also without rushing to vilify — the Hierophant teaches discernment, not blame.',
      },
      {
        q: 'How do I tell "what to keep" from "what to question" if both look beautiful?',
        a: 'Ask which one still feels alive in your body when you imagine practicing it ten years from now. The keep card holds; the question card flickers, however lovely.',
      },
      {
        q: 'Can this spread be used for secular traditions like a profession?',
        a: 'Absolutely. The Hierophant reads any inherited orthodoxy — medicine, law, academia, family business. Substitute "spiritual path" with "your own way of practicing this" and the spread holds.',
      },
      {
        q: 'What if my path card looks heretical?',
        a: 'It may be, and that may be exactly right. Many genuine spiritual paths begin as heresies to the tradition that grew them. The Hierophant respects honest deviation more than dishonest conformity.',
      },
    ],
    relatedSpreads: [
      'the-emperor-spread',
      'the-hermit-spread',
      'judgement-spread',
    ],
  },

  // ----------------------------------------------------------------------
  // VI. THE LOVERS — Conscious Choice
  // ----------------------------------------------------------------------
  {
    slug: 'the-lovers-spread',
    name: 'The Lovers Spread',
    category: 'spiritual',
    cardCount: 5,
    difficulty: 'intermediate',
    durationMin: 25,
    shortDescription:
      'Five cards for the moment of conscious choice — your values, theirs, where they meet, where they part, and the choice itself.',
    longDescription:
      'The Lovers is not a romance card so much as a card of choice — the moment when two paths, two people, or two values stand in front of you and you are asked to pick consciously. This spread maps any significant choice between two options or two relationships. Five cards examine your values, the values of the other (person, path, or option), where the two genuinely meet, where they diverge, and the actual choice that wants to be made. It is a spread for honest decisions, not for confirmation of what you already wanted to hear.',
    bestFor: [
      'Decisions between two people, two jobs, two paths',
      'Relationship audits — values alignment, deal-makers, deal-breakers',
      'Choosing between staying and leaving',
      'Big collaborations, partnerships, business or creative pairings',
      'Any choice where you keep flip-flopping',
    ],
    whenToUse:
      'Use this spread when you have two real options on the table and avoidance has run out of room. Best read when you can name both options in a single sentence each. Avoid when your choices are still abstract; clarify them with a Fool or Magician spread first.',
    history:
      'The Lovers card has been read across centuries as the moment of moral choice — in older decks, the man chooses between two women, vice and virtue. Modern readings often expand this into any conscious choice between two paths or values.',
    positions: [
      {
        position: 1,
        name: 'Your values',
        meaning:
          'What you actually care about most in this choice — beyond what sounds good. The values doing the real driving, named honestly.',
      },
      {
        position: 2,
        name: 'Their values',
        meaning:
          'The values of the other person, path, or option. Not what you wish they were — what they actually are. Read this card without softening.',
      },
      {
        position: 3,
        name: 'Where they meet',
        meaning:
          'The genuine overlap. The shared ground that could carry a real bond or a real partnership. Often smaller than romance imagines, but truer.',
      },
      {
        position: 4,
        name: 'Where they diverge',
        meaning:
          'Where the two value systems do not match — and will not, no matter how much love or effort is applied. The honest fault line.',
      },
      {
        position: 5,
        name: 'The choice',
        meaning:
          'What is being asked of you in this moment. Not a verdict — a clarifying signal about which way to lean and what kind of choice this actually is.',
      },
    ],
    exampleQuestions: [
      'Should I stay in this relationship or leave?',
      'Are we actually compatible at the level of values, not just chemistry?',
      'Which of these two paths is mine to walk?',
      'What is the real difference between what I want and what they want?',
      'Am I about to make this choice from love or from fear?',
    ],
    faqs: [
      {
        q: 'What if the "where they meet" card is very small or weak?',
        a: 'A small meeting card means the genuine overlap is narrow. That is information — narrow overlaps can sustain bonds if both parties honor the gap, but cannot survive being treated as wide.',
      },
      {
        q: 'My "their values" card looks much harder than I expected. Should I trust it?',
        a: 'Yes. The Lovers refuses to flatter. A harsher than expected partner card usually reflects a truth you have been editing in real life. Sit with it before reacting.',
      },
      {
        q: 'Can I use this for non-romantic choices, like jobs?',
        a: 'Absolutely. Substitute "your values" and "the role\'s values" for the two parties. The spread reads any choice with two options that have their own logic.',
      },
      {
        q: 'What if the choice card seems to contradict the meeting card?',
        a: 'That contradiction is often the actual lesson. The Lovers sometimes shows that the strongest match is not the right next step, or that the weaker overlap holds a more honest path forward. Read both with care.',
      },
    ],
    relatedSpreads: [
      'the-hierophant-spread',
      'the-chariot-spread',
      'justice-spread',
    ],
  },

  // ----------------------------------------------------------------------
  // VII. THE CHARIOT — Driving Forward
  // ----------------------------------------------------------------------
  {
    slug: 'the-chariot-spread',
    name: 'The Chariot Spread',
    category: 'spiritual',
    cardCount: 5,
    difficulty: 'intermediate',
    durationMin: 25,
    shortDescription:
      'Five cards to mobilize victory — the goal, the opposing forces, your will, what to leave behind, and the path to win.',
    longDescription:
      'The Chariot is the card of focused movement — two sphinxes pulling in different directions while the charioteer holds the reins through pure will. This spread is for moments when you have a goal, you have obstacles, and you need to move. Five cards lay out the actual goal, the forces pulling against you, the will required to pilot through, what must be left behind to gain speed, and the path to genuine victory. It is a spread for warriors and finishers, not for dreamers or planners.',
    bestFor: [
      'Active campaigns — launches, deadlines, training cycles, battles',
      'Pushing a stalled project across the finish line',
      'Decisions where you must stop weighing and start moving',
      'Athletic, competitive, or high-stakes performance contexts',
      'Recovery and reclamation — taking back lost ground',
    ],
    whenToUse:
      'Use this spread when you need momentum, not contemplation. Best when the goal is already clear and the question is execution. Avoid when you are exhausted or burnt out — the Chariot drives, and you will misread the cards if you have nothing left to drive with.',
    history:
      'In early decks the Chariot represented victory in literal warfare; later occult readings reframed it as the conquest of self. The two sphinxes (or horses) — light and dark — represent opposing internal forces the charioteer must hold in tension to move forward.',
    positions: [
      {
        position: 1,
        name: 'The goal',
        meaning:
          'What you are actually moving toward. Specific, achievable, named in one sentence. The destination, not the dream around it.',
      },
      {
        position: 2,
        name: 'Opposing forces',
        meaning:
          'The two strongest forces working against your forward motion — internal, external, or both. The sphinxes pulling in different directions. Naming them is half the work.',
      },
      {
        position: 3,
        name: 'Your will',
        meaning:
          'The quality and direction of the willpower you are bringing to bear. Whether your reins are tight, loose, or being dragged. The most personal card in the spread.',
      },
      {
        position: 4,
        name: 'What to leave behind',
        meaning:
          'The weight you must shed to gain speed. A relationship, a habit, a self-image, a backup plan. The Chariot does not arrive at victory carrying everything.',
      },
      {
        position: 5,
        name: 'Victory path',
        meaning:
          'The actual route to genuine arrival. Not the easy path — the path that uses your strengths and the moment\'s tailwind together. The line of clearest momentum.',
      },
    ],
    exampleQuestions: [
      'How do I push this project across the finish line?',
      'What is actually pulling me off course right now?',
      'Where is my willpower being scattered or misused?',
      'What do I need to drop to gain speed?',
      'What does the actual path to winning this look like?',
    ],
    faqs: [
      {
        q: 'My opposing forces card surprised me. How seriously should I take it?',
        a: 'Very. The Chariot often reveals one obvious obstacle and one hidden one. The hidden one is usually internal — fear of success, secret loyalty to the old situation, exhaustion. Take it as seriously as the visible one.',
      },
      {
        q: 'What if my "what to leave behind" card hurts to read?',
        a: 'That is normal. The Chariot does not ask you to leave behind what you do not love. It asks you to leave behind what is slowing the chariot. Grieve it, then act.',
      },
      {
        q: 'How is this different from a goal-setting spread?',
        a: 'Goal-setting spreads design destinations. This spread mobilizes you toward one. Use a Magician spread to plan; use this one to drive.',
      },
      {
        q: 'Can the Chariot ever say "do not move yet"?',
        a: 'Rarely. Almost always the Chariot says move; the question is just how. If your will card is fully depleted, however, the spread will read it honestly — and the answer is rest before driving, not driving on empty.',
      },
    ],
    relatedSpreads: [
      'the-magician-spread',
      'strength-spread',
      'the-tower-spread',
    ],
  },

  // ----------------------------------------------------------------------
  // VIII. STRENGTH — Inner Power
  // ----------------------------------------------------------------------
  {
    slug: 'strength-spread',
    name: 'Strength Spread',
    category: 'spiritual',
    cardCount: 5,
    difficulty: 'intermediate',
    durationMin: 25,
    shortDescription:
      'Five cards to face the beast within — what frightens you, how to meet it, your strength, what tames it, and the gentle victory.',
    longDescription:
      'Strength shows a woman closing the lion\'s mouth not by force but by gentle, infinite patience. This spread is for the moments when something inside you — fear, addiction, anger, grief — feels larger than you. Five cards walk you through the inner encounter: what is actually frightening you, how to meet it, the strength you already have, what tames the beast, and the quiet victory waiting on the other side. It is the spread for inner work, not outer battle.',
    bestFor: [
      'Facing recurring fears, anxieties, or compulsions',
      'Anger work, addiction recovery, panic management',
      'Befriending a part of yourself you have been at war with',
      'Coming back to your body after dissociation or shutdown',
      'Quiet courage in long-arc emotional work',
    ],
    whenToUse:
      'Use this spread when something inner is loud and you want to stop fighting and start meeting it. Best read in a calm setting after some grounding. Avoid when in active crisis — call a human first; tarot supports inner work, it does not replace it.',
    history:
      'In Marseille decks Strength is card eleven; in Waite-Smith it was moved to eight to align with Leo. Across decks the central image is the same — a woman without weapons taming a lion through presence, often read as the integration of conscious and instinctual selves.',
    positions: [
      {
        position: 1,
        name: 'What frightens you',
        meaning:
          'The actual beast — fear, urge, wound, anger — that has been running the background of your life. Named without softening, without performance.',
      },
      {
        position: 2,
        name: 'How to meet it',
        meaning:
          'The posture of the meeting. Not how to fight it — how to approach it. Often gentler and slower than your instinct expects.',
      },
      {
        position: 3,
        name: 'Your strength',
        meaning:
          'The genuine inner resource you already have for this encounter. The capacity you tend to undervalue. The hand that closes the lion\'s mouth.',
      },
      {
        position: 4,
        name: 'What tames the beast',
        meaning:
          'The specific quality, practice, or recognition that softens the inner force. Sometimes a need it has been waiting for; sometimes a story it has been waiting to be told.',
      },
      {
        position: 5,
        name: 'The gentle victory',
        meaning:
          'What integration looks like — not the absence of the beast, but the new partnership. The strength card never kills the lion. It walks beside it.',
      },
    ],
    exampleQuestions: [
      'How do I work with this fear instead of fighting it?',
      'What is my anger actually trying to tell me?',
      'How do I stop running from this part of myself?',
      'What inner strength have I been overlooking?',
      'What does real courage look like in this situation?',
    ],
    faqs: [
      {
        q: 'My "what frightens you" card looks small. Is that wrong?',
        a: 'Not at all. Often the most disruptive inner forces are small in image and large in life — a single insistent shame, a recurring small panic. Trust the size the spread gives you.',
      },
      {
        q: 'What if my "strength" card looks weak?',
        a: 'A weak-looking strength card usually points to a quiet, unrecognized capacity — patience, honesty, the ability to wait. The spread is correcting your sense that strength has to look heroic.',
      },
      {
        q: 'How is this different from facing fears in the Moon Spread?',
        a: 'The Moon explores illusion and intuition through fear. Strength is the relationship with the inner force itself. Read the Moon when fear is fog; read Strength when fear is a creature you can name.',
      },
      {
        q: 'What if I have been fighting this beast for years and the spread says "meet it gently"?',
        a: 'Then that is the new instruction. Strength is the card that breaks long wars by changing posture. Try it for one week and see what shifts.',
      },
    ],
    relatedSpreads: [
      'the-devil-spread',
      'the-moon-spread',
      'the-chariot-spread',
    ],
  },

  // ----------------------------------------------------------------------
  // IX. THE HERMIT — Solitude & Wisdom
  // ----------------------------------------------------------------------
  {
    slug: 'the-hermit-spread',
    name: 'The Hermit Spread',
    category: 'spiritual',
    cardCount: 5,
    difficulty: 'advanced',
    durationMin: 30,
    shortDescription:
      'Five cards for retreat and return — what to step back from, what to seek inwardly, the lantern, the wisdom, and what to bring back.',
    longDescription:
      'The Hermit holds a lantern at the top of a snowy mountain. He has stepped away from the village to find a particular kind of clarity that only solitude makes possible. This spread is for any season of intentional retreat — from work, from relationships, from noise. Five cards trace the shape of a true withdrawal: what you are stepping back from, what you are seeking inwardly, the lantern that guides you, the wisdom that arrives, and what you carry back down the mountain. It is a slow, serious spread for serious seekers.',
    bestFor: [
      'Sabbaticals, retreats, periods of intentional solitude',
      'Burned-out professionals needing real rest, not vacation',
      'Spiritual seekers in a quiet phase',
      'Recovering from a major life event by going inward',
      'Discernment about whether you need community or solitude right now',
    ],
    whenToUse:
      'Use this spread before, during, or at the end of a retreat — physical, emotional, or seasonal. Best read in a quiet space, alone, with no agenda. Avoid using it to justify avoidance; the Hermit retreats to listen, not to hide.',
    history:
      'The Hermit traces back to early decks as the old man with a lantern, sometimes labeled "the time" or "the hunchback." Esoteric traditions read him as Virgo energy, as Diogenes searching for an honest man, and as the inner sage every soul carries.',
    positions: [
      {
        position: 1,
        name: 'What to retreat from',
        meaning:
          'The specific noise — relationships, environments, demands, identities — you are being asked to step away from for a season. Often something you have been performing rather than living.',
      },
      {
        position: 2,
        name: 'What to seek inwardly',
        meaning:
          'The inner question worth taking up the mountain. The thing that cannot be answered while you are still inside the village.',
      },
      {
        position: 3,
        name: 'The lantern',
        meaning:
          'The inner light or practice that guides you in the dark of the retreat. Could be a teaching, a memory, a question, a body practice. What keeps you oriented when the world goes quiet.',
      },
      {
        position: 4,
        name: 'The wisdom found',
        meaning:
          'The genuine insight that arrives once you are alone with yourself. Often quieter and more specific than expected. Often something you already knew but had not heard cleanly.',
      },
      {
        position: 5,
        name: 'What to bring back',
        meaning:
          'The piece of wisdom worth carrying down to the village. Not all of it — only what others can actually use. The Hermit returns selective.',
      },
    ],
    exampleQuestions: [
      'What am I actually being asked to step back from right now?',
      'What inner question is asking to be asked?',
      'How do I do this retreat without escaping?',
      'What truth has been waiting for me to be quiet enough to hear it?',
      'When I return from this season, what do I bring with me?',
    ],
    faqs: [
      {
        q: 'I cannot literally retreat — does this spread still work?',
        a: 'Yes. The Hermit\'s retreat can be a daily hour, a weekend, a phone-off morning. The lantern card will tell you the smallest faithful version of solitude available to you right now.',
      },
      {
        q: 'My "what to seek" card is uncomfortable. Should I really sit with it?',
        a: 'Especially then. The Hermit does not retreat to sit with what is comfortable. The discomfort is often the doorway to the wisdom card.',
      },
      {
        q: 'How is this different from the High Priestess Spread?',
        a: 'The Priestess is about piercing a veil between conscious and unconscious. The Hermit is about removing yourself from noise to hear your own voice clearly. Different motions — one inward through the inner mind, one outward away from the world.',
      },
      {
        q: 'What if my "what to bring back" card is very small?',
        a: 'Trust it. Hermits often return with one sentence, not a sermon. A small return card is usually a sign the wisdom is real.',
      },
    ],
    relatedSpreads: [
      'the-high-priestess-spread',
      'the-moon-spread',
      'judgement-spread',
    ],
  },

  // ----------------------------------------------------------------------
  // X. THE WHEEL OF FORTUNE — Cycles & Fate
  // ----------------------------------------------------------------------
  {
    slug: 'the-wheel-of-fortune-spread',
    name: 'The Wheel of Fortune Spread',
    category: 'spiritual',
    cardCount: 5,
    difficulty: 'advanced',
    durationMin: 25,
    shortDescription:
      'Five cards for the cycle you are inside — where the wheel was, where it is, where it turns, what is fixed, and what you can change.',
    longDescription:
      'The Wheel of Fortune turns. It always has and always will. This spread is for moments when your life is clearly inside a cycle — luck, hardship, a recurring pattern, a generational arc — and you want to read your position on the wheel honestly. Five cards map the recent past of the cycle, where you are now, where it is turning next, what is fixed in it (the axle, fate), and what is genuinely yours to change. It is a spread that asks you to take fate seriously without surrendering your agency.',
    bestFor: [
      'Recurring patterns in love, work, money, or family',
      'Moments of unexpected luck or unexpected loss',
      'Reading large life cycles — Saturn returns, decade markers, half-life points',
      'Generational patterns and inherited cycles',
      'When you want to know what to ride and what to push',
    ],
    whenToUse:
      'Use this spread when you sense you are inside a larger arc and need perspective. Best read on birthdays, eclipses, or major life transitions. Avoid when you are looking for a predictive verdict; the Wheel reveals the shape of cycles, not their final stop.',
    history:
      'The Wheel of Fortune card descends from medieval imagery of Fortuna spinning lives up and down at random. Hermetic tarot tied it to Jupiter and to the karmic law of cycles — what rises must fall, what falls will rise, all motion contains its return.',
    positions: [
      {
        position: 1,
        name: 'Where the wheel was',
        meaning:
          'The recent past phase of the cycle — what was rising or falling before this moment. The arc you have been riding without naming.',
      },
      {
        position: 2,
        name: 'Where it is',
        meaning:
          'Your current position on the wheel — top, bottom, ascending, descending, or paused. Read with precision; the Wheel rewards clarity about where you actually are.',
      },
      {
        position: 3,
        name: 'Where it turns',
        meaning:
          'The next movement of the cycle. Not a verdict about whether life gets "better" — a description of which way the wheel is rolling next.',
      },
      {
        position: 4,
        name: 'What is fixed',
        meaning:
          'The axle of the wheel — what cannot be changed in this cycle no matter what you do. Sometimes timing, sometimes lineage, sometimes the law of the situation itself. The card you must accept.',
      },
      {
        position: 5,
        name: 'What you can change',
        meaning:
          'Your degree of freedom inside the cycle. Not whether the wheel turns — how you ride it. Where genuine agency lives in this season.',
      },
    ],
    exampleQuestions: [
      'What cycle am I actually inside right now?',
      'Why do I keep arriving at the same crossroads?',
      'What part of this is fate and what part is mine to shape?',
      'How do I work with this turn instead of fighting it?',
      'What is the larger arc of this decade of my life?',
    ],
    faqs: [
      {
        q: 'My "fixed" card feels harsh. Do I really have to accept it?',
        a: 'Yes — but acceptance is not surrender. The Wheel asks you to stop spending energy fighting what cannot move so you can use that energy where you actually have agency. Read card 5 in light of card 4 and the freedom becomes visible.',
      },
      {
        q: 'How is this different from a past-present-future reading?',
        a: 'A timeline reading treats time as a line. The Wheel treats time as a cycle. Use this spread when the situation is clearly recurring or seasonal; use a timeline spread when it is genuinely linear.',
      },
      {
        q: 'What if "where it turns" looks worse than "where it is"?',
        a: 'Then the cycle is descending, and the spread is offering you the dignity of preparation. Knowing the wheel is rolling down lets you choose how you meet the lower ground.',
      },
      {
        q: 'Can I use this for someone else\'s cycle?',
        a: 'Carefully. The Wheel reads observable cycles cleanly, but the agency card belongs to whoever is on the wheel. Read it for them only with consent and only as offering, not advice.',
      },
    ],
    relatedSpreads: [
      'justice-spread',
      'the-tower-spread',
      'the-world-spread',
    ],
  },

  // ----------------------------------------------------------------------
  // XI. JUSTICE — Truth & Balance
  // ----------------------------------------------------------------------
  {
    slug: 'justice-spread',
    name: 'Justice Spread',
    category: 'spiritual',
    cardCount: 5,
    difficulty: 'intermediate',
    durationMin: 25,
    shortDescription:
      'Five cards for honest accounting — the truth, what was just, what was unfair, the cause, and the consequence.',
    longDescription:
      'Justice holds the sword and the scales. She does not flinch and she does not flatter. This spread is for moments when something needs an honest accounting — a relationship, a decision, a wrong done or received, a karmic weight that has been demanding to be looked at. Five cards lay out the actual truth, what part of the situation was just, what part was unfair, the cause underneath it all, and the consequence in motion. It is a spread that refuses to spin the story for either side.',
    bestFor: [
      'Conflicts where you want the truth, not the comfortable version',
      'Reckoning with a wrong you did or one done to you',
      'Legal, contractual, or formal disputes',
      'Karmic patterns asking to be cleared',
      'Auditing the fairness of a relationship or workplace',
    ],
    whenToUse:
      'Use this spread when you can promise yourself you will not flinch. Best read with a journal, in a sober mood, when you are willing to be wrong. Avoid when you are in active anger or hurt; wait until your nervous system can hold the scales without tipping them.',
    history:
      'Justice has been associated with the Greek Themis and the Egyptian Ma\'at — both goddesses of cosmic order weighing the heart against truth. Esoteric traditions tie the card to Libra and to the karmic law that what is set in motion eventually returns balanced.',
    positions: [
      {
        position: 1,
        name: 'The truth',
        meaning:
          'The actual fact of the situation as it stands — not your version, not their version, but the part both would have to admit if pressed. The neutral fact.',
      },
      {
        position: 2,
        name: 'What was just',
        meaning:
          'The part of what happened that was fair, deserved, or honestly earned by someone in the situation — including possibly yourself.',
      },
      {
        position: 3,
        name: 'What was unfair',
        meaning:
          'The part of what happened that violated balance. The genuine wrong, on either side. The card most resistant to being read honestly.',
      },
      {
        position: 4,
        name: 'Cause',
        meaning:
          'The deeper origin of the imbalance. Not the inciting incident — the underlying condition, pattern, or pressure that made the wrong possible.',
      },
      {
        position: 5,
        name: 'Consequence',
        meaning:
          'What is in motion now as a result. The bill that has come due — sometimes for someone else, sometimes for you, sometimes for the system itself. The Justice card always collects.',
      },
    ],
    exampleQuestions: [
      'What is actually true about this conflict?',
      'Am I owed something, or is something being asked of me?',
      'What part of this was my doing, honestly?',
      'What deeper pattern made this situation possible?',
      'What consequence is already in motion that I should be ready for?',
    ],
    faqs: [
      {
        q: 'What if "what was just" looks favorable to the other side?',
        a: 'Then read it without flinching. Justice does not exist to confirm your innocence. Some readings will show that the very part of the situation that hurt you was earned. Sit with it.',
      },
      {
        q: 'What if I am the one in the wrong?',
        a: 'Then the spread is doing its work. Read the consequence card carefully — it will tell you what restoration is now yours to offer.',
      },
      {
        q: 'How is this different from a relationship spread?',
        a: 'Relationship spreads explore dynamics. The Justice spread audits a specific event or pattern for fairness. Use it after a relationship spread surfaces a wrong that needs accounting.',
      },
      {
        q: 'Can the consequence card change?',
        a: 'Some can. Some cannot. Justice often shows which ones are alterable through restitution and which ones are simply the ground you must walk on for a season.',
      },
    ],
    relatedSpreads: [
      'the-wheel-of-fortune-spread',
      'the-lovers-spread',
      'judgement-spread',
    ],
  },

  // ----------------------------------------------------------------------
  // XII. THE HANGED MAN — Surrender & Perspective
  // ----------------------------------------------------------------------
  {
    slug: 'the-hanged-man-spread',
    name: 'The Hanged Man Spread',
    category: 'spiritual',
    cardCount: 5,
    difficulty: 'advanced',
    durationMin: 25,
    shortDescription:
      'Five cards for inversion — what to let go of, the new view, what suspends you, what is gained, and what is lost.',
    longDescription:
      'The Hanged Man hangs by one foot, content, with a halo. He is not a victim. He has chosen this position because seeing the world upside down was the only way to see it at all. This spread is for moments when forward motion has stopped and the lesson is in the surrender. Five cards examine what you are being asked to release, the new perspective that opens, what is suspending you, what you gain by hanging here, and what you are losing in the process. It is a spread for sacred pauses, not for stuck phases dressed up as wisdom.',
    bestFor: [
      'Plateaus, suspensions, and unwanted pauses',
      'Spiritual surrender and letting go practices',
      'Reframing a stuck situation by inverting your perspective',
      'Sabbaticals where productivity is no longer the point',
      'Grief, illness, or transitions that demand stillness',
    ],
    whenToUse:
      'Use this spread when life has stopped you and you do not know what to do with the stillness. Best read after the initial frustration of being stopped has passed. Avoid when you are using "surrender" as an excuse to avoid action that is genuinely yours.',
    history:
      'The Hanged Man is one of the strangest cards in tarot — peaceful while inverted. Esoteric traditions tie him to Norse Odin hanging on the world tree for wisdom and to the alchemical principle of voluntary sacrifice for higher knowledge.',
    positions: [
      {
        position: 1,
        name: 'What to let go',
        meaning:
          'The specific grip — control, narrative, identity, urgency — you are being asked to release in this season. Naming it begins the surrender.',
      },
      {
        position: 2,
        name: 'The new view',
        meaning:
          'The perspective that becomes available once you stop trying to right yourself. Often the situation looks entirely different upside down.',
      },
      {
        position: 3,
        name: 'What suspends',
        meaning:
          'The force or condition holding you in this pause. Sometimes external (a system, a season, a body), sometimes internal (a vow, a wound, a deep yes that has not finished landing).',
      },
      {
        position: 4,
        name: 'What is gained',
        meaning:
          'The genuine gift of the suspension. Not the consolation prize — the actual wisdom or capacity that only this position could give you.',
      },
      {
        position: 5,
        name: 'What is lost',
        meaning:
          'The honest cost. The Hanged Man does not pretend the price is nothing. Naming what is lost is part of receiving the gift cleanly.',
      },
    ],
    exampleQuestions: [
      'I have been stalled for months — what is this pause actually for?',
      'How do I let go of the version of this I had planned?',
      'What is this period of forced rest trying to teach me?',
      'How do I see this situation differently?',
      'What am I clinging to that needs to fall?',
    ],
    faqs: [
      {
        q: 'How is this different from a "stuck" spread?',
        a: 'Stuck spreads diagnose obstacles. The Hanged Man spread accepts that the stuckness is sacred and looks for the wisdom inside it. Use it when you are ready to stop trying to escape the pause.',
      },
      {
        q: 'My "what is lost" card is heavy. Should I refuse the surrender?',
        a: 'Not necessarily. The Hanged Man is honest about cost precisely because the gift is real. Read the gain and loss cards together; if loss outweighs gain unmistakably, the surrender being asked may be the wrong one.',
      },
      {
        q: 'Can I be in this energy too long?',
        a: 'Yes. The Hanged Man is a card of seasonal surrender, not lifelong inversion. If years pass and the new view never integrates, the spread will start showing it as Death — a different surrender entirely.',
      },
      {
        q: 'What if the new view contradicts everything I thought I knew?',
        a: 'That is often the gift. The Hanged Man dethrones assumptions cleanly. Sit with the contradiction for at least a week before acting on it.',
      },
    ],
    relatedSpreads: [
      'death-spread',
      'the-hermit-spread',
      'the-moon-spread',
    ],
  },

  // ----------------------------------------------------------------------
  // XIII. DEATH — Endings & Rebirth
  // ----------------------------------------------------------------------
  {
    slug: 'death-spread',
    name: 'Death Spread',
    category: 'spiritual',
    cardCount: 5,
    difficulty: 'advanced',
    durationMin: 25,
    shortDescription:
      'Five cards for endings and rebirth — what is dying, why it must, what survives, what is born, and how to grieve.',
    longDescription:
      'Death is rarely about literal dying. It is the card of necessary endings — the relationship that has run its course, the identity you have outgrown, the chapter that needs to close so the next can open. This spread is for moments when something is genuinely ending and you are tired of pretending otherwise. Five cards walk you through the transformation: what is dying, why it must, what survives the transition, what is being born in the wake, and the grief itself, named and honored. It is a spread for endings done well.',
    bestFor: [
      'Endings of relationships, jobs, identities, chapters',
      'Major life transitions where the old form has clearly ended',
      'Letting go after long denial',
      'Grief work, including for losses you have not been allowed to mourn',
      'Discerning between a real ending and a difficult phase',
    ],
    whenToUse:
      'Use this spread when something has ended and you need to honor that fact rather than fight it. Best read at funerals, anniversaries of losses, or the official end of a chapter. Avoid using it to push through something that is merely difficult; the Hanged Man Spread fits better when the question is suspension, not death.',
    history:
      'The Death card has terrified seekers for centuries despite never literally meaning physical death. Hermetic readings tie it to Scorpio and to alchemical putrefaction — the necessary decomposition before transformation. Most schools agree: where Death is, the new cannot enter until the old is allowed to leave.',
    positions: [
      {
        position: 1,
        name: 'What is dying',
        meaning:
          'The specific structure — relationship, identity, role, belief — that has come to its end. Named with precision so it can be released cleanly.',
      },
      {
        position: 2,
        name: 'Why it must',
        meaning:
          'The deeper reason this ending is necessary. Not "because it failed" — because something else cannot be born until this one releases.',
      },
      {
        position: 3,
        name: 'What survives',
        meaning:
          'The thread that carries through. The love, lesson, or capacity that does not die with the form. The seed that travels between chapters.',
      },
      {
        position: 4,
        name: 'What is born',
        meaning:
          'The new life waiting on the other side of the threshold. Often quieter and more specific than imagined. The genuine offering of the transformation.',
      },
      {
        position: 5,
        name: 'How to grieve',
        meaning:
          'The actual practice of mourning this ending — what you need, what to do with the loss, how to honor what was. The card most often skipped and most often essential.',
      },
    ],
    exampleQuestions: [
      'Is this relationship truly ending, or just changing form?',
      'What chapter of my life is actually closing?',
      'How do I let this version of myself go?',
      'What is being asked to die in me that I keep trying to revive?',
      'How do I grieve this properly so I can move forward?',
    ],
    faqs: [
      {
        q: 'I am terrified of the Death card. Should I be?',
        a: 'No. Death is one of the most honest cards in the deck. It is feared because it does not lie — but what it tells the truth about is transformation, not catastrophe. The card you should fear is one that flatters you when something is dying.',
      },
      {
        q: 'What if "what is dying" surprises me?',
        a: 'Trust it. Death often names the ending we have been refusing to see — sometimes a small relationship inside a larger one, an identity inside a role, a story inside a friendship. The naming is half the work.',
      },
      {
        q: 'How is this different from the Tower?',
        a: 'Death is invited and slow; the Tower is sudden and uninvited. Death asks you to participate in the ending. The Tower simply ends it for you. Different spreads for different kinds of collapse.',
      },
      {
        q: 'Can I refuse the ending?',
        a: 'You can delay it; you cannot cancel it. Death describes endings already in motion. Refusing them generally just makes the grieving longer and the rebirth slower.',
      },
    ],
    relatedSpreads: [
      'the-tower-spread',
      'the-hanged-man-spread',
      'judgement-spread',
    ],
  },

  // ----------------------------------------------------------------------
  // XIV. TEMPERANCE — Alchemy & Patience
  // ----------------------------------------------------------------------
  {
    slug: 'temperance-spread',
    name: 'Temperance Spread',
    category: 'spiritual',
    cardCount: 5,
    difficulty: 'advanced',
    durationMin: 25,
    shortDescription:
      'Five cards for sacred blending — what to combine, the opposing elements, the right measure, the patience required, and the alchemical result.',
    longDescription:
      'Temperance shows an angel pouring liquid between two cups, one foot on land and one in water. She is the alchemist of the deck — slow, patient, holding paradox until it integrates into something new. This spread is for moments when two seemingly opposite things in your life need to be blended rather than chosen between. Five cards examine what you are blending, the opposing elements at play, the right measure for the mixture, the patience required, and the alchemical result that emerges over time. It is a spread for nuance and synthesis.',
    bestFor: [
      'Integrating opposing parts of yourself or your work',
      'Recovery, healing, and slow rebuilding',
      'Long-term partnerships where balance has been off',
      'Crafts, practices, and disciplines that require patience',
      'Decisions that have been framed as either/or but might be both/and',
    ],
    whenToUse:
      'Use this spread when you are tired of choosing between two things that both belong in your life. Best read when you have time to sit with a slow answer. Avoid when urgency is real; Temperance does not match emergency timelines.',
    history:
      'Temperance has been associated with alchemical mixing, the Greek goddess Iris (rainbow bridge between worlds), and Sagittarius in astrological tarot. The image of pouring between vessels comes from older virtue iconography — one of the cardinal virtues, here transmuted into something more mystical.',
    positions: [
      {
        position: 1,
        name: 'What to blend',
        meaning:
          'The two parts of your life or self that are being asked to integrate rather than separate. Named clearly so the alchemy can begin.',
      },
      {
        position: 2,
        name: 'Opposing elements',
        meaning:
          'The specific tension between them — fire and water, structure and freedom, grief and gratitude. The honest difficulty of the blending.',
      },
      {
        position: 3,
        name: 'The right measure',
        meaning:
          'The proportion required. Rarely fifty-fifty. Temperance is a master of ratios — sometimes more of one element, sometimes a single drop of the other. The card teaches calibration.',
      },
      {
        position: 4,
        name: 'The patience required',
        meaning:
          'The time and stillness this alchemy needs. Not the timeline you wish — the timeline the work actually demands. Often the most important card in the spread.',
      },
      {
        position: 5,
        name: 'The alchemical result',
        meaning:
          'The third thing that emerges from the blending. Not a compromise — a new substance entirely. What becomes possible when both elements are honored.',
      },
    ],
    exampleQuestions: [
      'How do I integrate these two opposing parts of myself?',
      'What is the right balance between rest and ambition for me right now?',
      'How do I bring the spiritual and practical sides of my work together?',
      'I keep being asked to choose — what if I am supposed to blend instead?',
      'What is this slow phase actually building?',
    ],
    faqs: [
      {
        q: 'My "patience required" card looks long. How do I sit with that?',
        a: 'By stopping the search for shortcuts. Temperance is the card most ruined by impatience — the alchemy genuinely requires the time it requires. Read the patience card as instruction, not punishment.',
      },
      {
        q: 'What if the "opposing elements" feel impossible to blend?',
        a: 'Many real alchemies feel that way at first. Trust the right-measure card; sometimes the answer is a drop of one in a sea of the other, not equal parts.',
      },
      {
        q: 'How is this different from the Lovers Spread?',
        a: 'The Lovers asks you to choose between two paths. Temperance asks you to combine them. Use the Lovers when the answer is binary; use Temperance when the answer is integration.',
      },
      {
        q: 'Can the alchemy fail?',
        a: 'It can, but rarely from the wrong elements — usually from rushed measure or skipped patience. If the result card looks weak, read cards 3 and 4 again.',
      },
    ],
    relatedSpreads: [
      'the-star-spread',
      'the-empress-spread',
      'the-world-spread',
    ],
  },

  // ----------------------------------------------------------------------
  // XV. THE DEVIL — Shadow & Liberation
  // ----------------------------------------------------------------------
  {
    slug: 'the-devil-spread',
    name: 'The Devil Spread',
    category: 'spiritual',
    cardCount: 5,
    difficulty: 'advanced',
    durationMin: 25,
    shortDescription:
      'Five cards for the chains you can take off — the chain, what binds you, your shadow gift, the key, and liberation.',
    longDescription:
      'The Devil shows two figures chained to a pedestal — but the chains are loose enough to lift over their heads. They have not noticed. This spread is for moments when you are reckoning with patterns of bondage in your own life: addictions, unhealthy attachments, internalized shame, the fears that have been running you. Five cards examine the chain itself, what specifically binds you, the shadow gift hidden inside the bondage, the key already in your hands, and the liberation that becomes available the moment you use it. It is a spread that does not flinch and does not flatter.',
    bestFor: [
      'Addiction recovery and pattern breaking',
      'Toxic relationships, work, or environments',
      'Shadow work and shame liberation',
      'Recognizing where you are giving away your power',
      'Chronic patterns you have tried to think your way out of',
    ],
    whenToUse:
      'Use this spread when you are ready to look at something you have been avoiding and you have support — therapeutic, spiritual, or social — to hold what arises. Best read in a sober, courageous mood. Avoid in active crisis; the Devil reveals patterns, not emergencies.',
    history:
      'The Devil card has nothing to do with literal evil; the figure is more accurately Pan, the Greek god of nature and instinct demonized by later Christian readings. Hermetic traditions tie the card to Capricorn and to material attachment — the chains are made of forgetting, not of metal.',
    positions: [
      {
        position: 1,
        name: 'The chain',
        meaning:
          'The pattern itself — addiction, attachment, shame, fear. The form of the bondage as it shows up in your life.',
      },
      {
        position: 2,
        name: 'What binds you',
        meaning:
          'The deeper need or wound the chain has been serving. The Devil is rarely random; the bondage almost always meets some genuine need that has not yet been met another way.',
      },
      {
        position: 3,
        name: 'Your shadow gift',
        meaning:
          'The hidden capacity, energy, or wisdom inside the very thing you have been ashamed of. The gold buried in the chain. The Devil holds gifts other cards cannot.',
      },
      {
        position: 4,
        name: 'The key',
        meaning:
          'What is already in your hand. The specific recognition, action, or relationship that lifts the chain. Often something you have been told before but have not yet done.',
      },
      {
        position: 5,
        name: 'Liberation',
        meaning:
          'What freedom actually looks like for you here — not abstract liberation, but the specific shape of life on the other side of this particular chain.',
      },
    ],
    exampleQuestions: [
      'What pattern is actually running my life right now?',
      'What is this addiction or attachment really protecting?',
      'Where is my shame hiding a gift?',
      'What would freedom from this look like, specifically?',
      'I have known this is bad for me for years — what is the actual key?',
    ],
    faqs: [
      {
        q: 'My "what binds you" card is sad rather than dark. Is that right?',
        a: 'Yes. The Devil\'s deepest chains are made of unmet needs and old hurts, not malevolence. A sad binding card usually points to a wound that has been outsourced to a substance, person, or behavior.',
      },
      {
        q: 'What if my "shadow gift" card surprises me?',
        a: 'It usually will. The Devil specializes in revealing that what you have been ashamed of contains real power once it is integrated. Trust the gift the spread names.',
      },
      {
        q: 'Why does the "key" feel so simple?',
        a: 'Because it is. The Devil\'s keys are almost always small — one phone call, one boundary, one truth told. The drama lives in the chain, not in the freedom.',
      },
      {
        q: 'Can I refuse to use the key?',
        a: 'Yes, and many do. The Devil never forces. He only reveals. If the key sits unused, the spread will keep returning until it does.',
      },
    ],
    relatedSpreads: [
      'strength-spread',
      'the-tower-spread',
      'the-moon-spread',
    ],
  },

  // ----------------------------------------------------------------------
  // XVI. THE TOWER — Sudden Change
  // ----------------------------------------------------------------------
  {
    slug: 'the-tower-spread',
    name: 'The Tower Spread',
    category: 'spiritual',
    cardCount: 5,
    difficulty: 'advanced',
    durationMin: 25,
    shortDescription:
      'Five cards for sudden collapse — what is falling, what was built on lies, the lightning, what is revealed, and how to rebuild.',
    longDescription:
      'The Tower shows a structure struck by lightning, figures falling from its windows, the crown blown off the top. It is the most feared card in the deck and one of the most clarifying. This spread is for moments when something in your life has just collapsed — or is clearly about to — and you need to read the wreckage honestly. Five cards examine what is falling, what was built on a lie, the lightning that struck, what is being revealed by the collapse, and the specific shape of rebuilding from here. It is a spread for after the storm, not for averting it.',
    bestFor: [
      'Sudden upheavals — job loss, breakups, illness, scandal',
      'Foundations collapsing that you suspected were unstable',
      'Painful revelations that change everything',
      'Aftermath of a Tower event when you need to make sense of it',
      'Discerning what to rebuild and what to leave in rubble',
    ],
    whenToUse:
      'Use this spread after the immediate shock of a Tower moment has begun to settle — usually a few days to a few weeks after the event. Best read with grounding practices nearby. Avoid using it to predict Towers; it works much better in the wake of one than as warning.',
    history:
      'The Tower card has been read across traditions as the lightning of divine truth striking the false structure. Hermetic readings tie it to Mars, to sudden Saturnian collapse, and to the necessary destruction that precedes any honest rebuilding.',
    positions: [
      {
        position: 1,
        name: 'What is collapsing',
        meaning:
          'The specific structure that is falling — relationship, identity, career, story, illusion. The form of what was that is no longer.',
      },
      {
        position: 2,
        name: 'What was built on lies',
        meaning:
          'The dishonest foundation underneath the structure. Not always conscious deception; often a story you were told or told yourself that could not bear weight. The reason the lightning could land at all.',
      },
      {
        position: 3,
        name: 'The lightning strike',
        meaning:
          'The actual event or revelation that brought the structure down. The moment of collapse named clearly. Sometimes external, sometimes internal, always sudden.',
      },
      {
        position: 4,
        name: 'What is revealed',
        meaning:
          'The truth visible in the wreckage. The Tower destroys precisely so that what was hidden can be seen. This card is the gift of the storm.',
      },
      {
        position: 5,
        name: 'How to rebuild',
        meaning:
          'The shape of honest reconstruction from here. Not "back to normal" — a new structure built on the ground that survived. The path forward.',
      },
    ],
    exampleQuestions: [
      'What just happened to me, and why?',
      'What was actually false in the life I was building?',
      'What is this collapse trying to show me?',
      'What part of my old life can I keep, and what cannot come?',
      'How do I rebuild without rebuilding the same lie?',
    ],
    faqs: [
      {
        q: 'My "what was built on lies" card is uncomfortable. Should I trust it?',
        a: 'Yes — the Tower collapses what cannot bear truth. The discomfort is the spread\'s honesty, not its cruelty. Sit with the card before defending against it.',
      },
      {
        q: 'How is this different from the Death spread?',
        a: 'Death is invited and gradual; the Tower is sudden and uninvited. Use this spread for shock-collapses; use Death for endings you can feel coming and can participate in.',
      },
      {
        q: 'What if I do not want to rebuild?',
        a: 'Then the rebuild card may name a smaller, slower reconstruction — not a return to what was. The Tower never asks you to rebuild the same building. Read the card with that in mind.',
      },
      {
        q: 'Can a Tower be a blessing?',
        a: 'In hindsight, almost always. In the moment, almost never. Both are true. The spread holds both without forcing the gratitude.',
      },
    ],
    relatedSpreads: [
      'death-spread',
      'the-star-spread',
      'judgement-spread',
    ],
  },

  // ----------------------------------------------------------------------
  // XVII. THE STAR — Hope & Renewal
  // ----------------------------------------------------------------------
  {
    slug: 'the-star-spread',
    name: 'The Star Spread',
    category: 'spiritual',
    cardCount: 5,
    difficulty: 'intermediate',
    durationMin: 25,
    shortDescription:
      'Five cards for hope after the storm — the wound, what restores, what to pour out, what to receive, and your guiding star.',
    longDescription:
      'The Star follows the Tower. A naked figure kneels by water under a great star, pouring liquid from two vessels — one onto land, one into the river. She is renewal, hope, reconnection with the deeper current after collapse. This spread is for moments when something has just ended and you are ready to begin to drink from your own well again. Five cards examine the wound that needs tending, what restores you, what you are ready to release, what you are ready to receive, and the long-arc star that guides you forward. It is a spread for tender, honest hope.',
    bestFor: [
      'After a Tower event, when restoration begins',
      'Recovery from burnout, heartbreak, or grief',
      'Reconnecting with hope, faith, or vocation',
      'Long-arc orientation toward a vision after losing your way',
      'Slow seasons of healing where small renewal matters',
    ],
    whenToUse:
      'Use this spread when the worst has passed and you are ready to drink water again. Best read by candlelight, near actual water if possible, with no rush. Avoid when you are still in shock; the Star reads tender ground, not fresh wounds.',
    history:
      'The Star has been associated with the goddess Isis pouring the Nile, with the seven Pleiades, and with hope itself in classical virtue iconography. Esoteric tarot ties it to Aquarius and to the return of light after the Tower\'s destruction.',
    positions: [
      {
        position: 1,
        name: 'The wound',
        meaning:
          'What in you is most asking for tending right now. Not necessarily fresh — sometimes very old. The place where renewal needs to begin.',
      },
      {
        position: 2,
        name: 'What restores',
        meaning:
          'The specific medicine for this wound. Often quieter than expected — water, sleep, a person, a place, a return to a forgotten practice.',
      },
      {
        position: 3,
        name: 'What to pour out',
        meaning:
          'What you are ready to release from your vessel. The grief, the story, the resentment, the version of you that no longer fits. Pouring this onto the ground frees the cup.',
      },
      {
        position: 4,
        name: 'What to receive',
        meaning:
          'What is finally allowed to enter the empty cup. Often something you have been refusing — care, beauty, rest, hope. The Star insists on receiving.',
      },
      {
        position: 5,
        name: 'Your guiding star',
        meaning:
          'The long-arc light orienting your next chapter. Not a goal — a direction. The vision worth walking toward over years.',
      },
    ],
    exampleQuestions: [
      'How do I begin healing from what just happened?',
      'What is my actual medicine right now?',
      'What grief am I finally ready to set down?',
      'What am I ready to let in that I have been refusing?',
      'What vision is calling me forward in the long view?',
    ],
    faqs: [
      {
        q: 'My "wound" card is older than I expected. Is that right?',
        a: 'Often it is. The Star tends not just the latest wound but the deepest one ready to be tended. Trust the card the spread names.',
      },
      {
        q: 'What if "what to receive" feels uncomfortable?',
        a: 'Receiving is harder than giving for many people. Discomfort here usually means the spread has named exactly what you need. Sit with it.',
      },
      {
        q: 'How is this different from the Sun Spread?',
        a: 'The Star is hope in the dark; the Sun is joy in the light. Use the Star for restoration; use the Sun once you are already standing in the brightness.',
      },
      {
        q: 'Can my guiding star change over time?',
        a: 'Yes. The Star is the long arc, but life still bends arcs. Re-read the spread once a year and watch how the guiding star sharpens, softens, or shifts as you walk toward it.',
      },
    ],
    relatedSpreads: [
      'the-tower-spread',
      'the-sun-spread',
      'temperance-spread',
    ],
  },

  // ----------------------------------------------------------------------
  // XVIII. THE MOON — Illusion & Intuition
  // ----------------------------------------------------------------------
  {
    slug: 'the-moon-spread',
    name: 'The Moon Spread',
    category: 'spiritual',
    cardCount: 6,
    difficulty: 'advanced',
    durationMin: 30,
    shortDescription:
      'Six cards for the foggy path — what is unclear, your fear, the illusion, the real, dream guidance, and the path through.',
    longDescription:
      'The Moon shows a path between two towers, a dog and a wolf howling, a crayfish emerging from the water. It is the card of fog, dreams, illusion, and the truths only the deep self knows. This spread is for moments when you cannot tell what is real, what is fear, and what is intuition speaking. Six cards examine the unclear situation, your fear, the illusion at play, what is actually real, the guidance available through dreams and deep knowing, and the specific path through the fog. It is the most psychologically demanding spread in this set.',
    bestFor: [
      'Situations clouded by anxiety, paranoia, or confusion',
      'Distinguishing fear from intuition',
      'Working with dreams, recurring imagery, and unconscious material',
      'Navigating gaslighting, manipulation, or unclear truth',
      'Mental health spirals where reality testing is slipping',
    ],
    whenToUse:
      'Use this spread when something feels off but you cannot name what. Best read at night, alone, with phone away and journal nearby. Avoid in active anxiety attack; the Moon reflects whatever you bring, and panic distorts the read. Settle the body first, then approach the cards.',
    history:
      'The Moon has been read across traditions as the lunar mirror — neither true light nor true dark, but reflection that can clarify or deceive. Hermetic readings tie it to Pisces and to the journey through the unconscious before the dawn of the Sun card.',
    positions: [
      {
        position: 1,
        name: 'What is unclear',
        meaning:
          'The specific area of fog. Not the whole situation — the precise piece that cannot yet be seen. Naming it tightens the focus.',
      },
      {
        position: 2,
        name: 'Your fear',
        meaning:
          'The fear coloring your perception right now. Read this card honestly; the Moon will not let you separate signal from noise until you have named the noise.',
      },
      {
        position: 3,
        name: 'What is illusion',
        meaning:
          'The specific story or image distorting the situation. Sometimes from outside, sometimes from inside, sometimes both. The fog itself, named.',
      },
      {
        position: 4,
        name: 'What is real',
        meaning:
          'The actual fact under the fog. Often smaller and more ordinary than feared. The ground, named.',
      },
      {
        position: 5,
        name: 'Your dream guidance',
        meaning:
          'The intuitive or unconscious wisdom available to you. The dog and wolf howling — what your deep self has been signaling through dreams, body sensations, recurring imagery, or quiet inner voice.',
      },
      {
        position: 6,
        name: 'The path through fog',
        meaning:
          'The actual movement forward. Not a leap — the next step that can be taken even with limited visibility. The Moon does not promise full clarity, only enough light for the next stride.',
      },
    ],
    exampleQuestions: [
      'Am I in danger or am I anxious?',
      'What is real about this situation, and what am I imagining?',
      'My intuition is loud but so is my fear — how do I tell the difference?',
      'What have my dreams been trying to tell me?',
      'How do I keep walking forward when I cannot see clearly?',
    ],
    faqs: [
      {
        q: 'My fear card and dream guidance card look similar. What does that mean?',
        a: 'It often means your fear is responding to a real signal — your intuition is afraid because something is genuinely off. Read cards 4 and 6 carefully; the Moon is confirming, not dismissing, your unease.',
      },
      {
        q: 'How do I tell illusion from intuition in real life?',
        a: 'Illusions intensify when you focus on them. Intuitions stay steady whether you focus or look away. The Moon spread teaches the difference by giving them separate cards.',
      },
      {
        q: 'What if my "what is real" card feels boring or anti-climactic?',
        a: 'That is usually a good sign. The Moon\'s reality card often deflates the drama the fear card was inflating. The boring truth is frequently the actual truth.',
      },
      {
        q: 'How is this different from the High Priestess Spread?',
        a: 'The Priestess pierces a veil between conscious and unconscious. The Moon walks through fog where neither side can see clearly. Use the Priestess when you suspect inner knowing; use the Moon when you cannot yet tell what is yours and what is the fog itself.',
      },
    ],
    relatedSpreads: [
      'the-high-priestess-spread',
      'strength-spread',
      'the-star-spread',
    ],
  },

  // ----------------------------------------------------------------------
  // XIX. THE SUN — Joy & Clarity
  // ----------------------------------------------------------------------
  {
    slug: 'the-sun-spread',
    name: 'The Sun Spread',
    category: 'spiritual',
    cardCount: 5,
    difficulty: 'intermediate',
    durationMin: 20,
    shortDescription:
      'Five cards for radiant clarity — what is now visible, your gift, how you shine, what celebrates, and the sun\'s blessing.',
    longDescription:
      'The Sun is the card of full light. The fog is gone, the storm is over, the child rides the white horse under the bright sun. This spread is for moments when something has finally become clear, joy is genuinely available, and you want to read your life from the brightness instead of the shadow. Five cards examine what is now visible, the gift you are bringing into the world, how you actually shine, what is asking to be celebrated, and the deeper blessing of this season. It is a spread for joyful seriousness — not for forced positivity.',
    bestFor: [
      'Celebrating after a long hard chapter',
      'Naming what you have actually become',
      'Recognizing your real gifts and how to share them',
      'Marking joyful turning points — births, recoveries, completions',
      'Reading life from light instead of shadow',
    ],
    whenToUse:
      'Use this spread when something has clearly turned bright and you want to honor it without skimming over it. Best read in actual sunlight, ideally outdoors. Avoid using it to force optimism while the Moon or Tower energies are still active; the Sun does not arrive on demand.',
    history:
      'The Sun in tarot has been read across traditions as the return of solar consciousness — Apollo\'s clarity, the alchemist\'s gold, the dawn after the Moon\'s long night. Hermetic decks associate it with the literal sun and with the integration that follows the Star\'s renewal.',
    positions: [
      {
        position: 1,
        name: 'What is now visible',
        meaning:
          'The specific clarity that has arrived. The thing you can finally see in full light. Often something you suspected but could not confirm until now.',
      },
      {
        position: 2,
        name: 'Your gift',
        meaning:
          'The capacity you have been growing — sometimes through every previous Major Arcana card. What you carry that the world is waiting for.',
      },
      {
        position: 3,
        name: 'How you shine',
        meaning:
          'The specific way your gift wants to be expressed. Not theoretical — the actual quality, posture, or practice through which you radiate.',
      },
      {
        position: 4,
        name: 'What celebrates',
        meaning:
          'What in your life is asking to be celebrated, named, marked. The Sun does not skip the parade — it leads it.',
      },
      {
        position: 5,
        name: 'The sun\'s blessing',
        meaning:
          'The deeper gift of this season. What is being given to you simply because the light is what it is. The blessing without the bargain.',
      },
    ],
    exampleQuestions: [
      'What can I finally see clearly now?',
      'What gift have I actually grown?',
      'How does my joy want to be expressed?',
      'What in my life deserves to be celebrated that I have been minimizing?',
      'What is being given to me in this bright season?',
    ],
    faqs: [
      {
        q: 'My "what is visible" card looks dim. Is that wrong?',
        a: 'Not necessarily — the Sun sometimes illuminates very ordinary truths. A dim-looking visibility card often points to a small clarity that quietly changes everything.',
      },
      {
        q: 'I do not feel like I am in a Sun phase. Should I still pull this spread?',
        a: 'Probably not. The Sun reads from light, not toward it. If you are still in fog, the Moon or Star spread fits better. Save the Sun for when the light has actually arrived.',
      },
      {
        q: 'How is this different from the World Spread?',
        a: 'The Sun is bright clarity in the middle of the chapter. The World is completion at the end of one. Use the Sun for radiance now; use the World when something has fully integrated and a cycle is closing.',
      },
      {
        q: 'Can the Sun ever warn me of something?',
        a: 'Rarely directly, but sometimes the "celebrates" card warns of a celebration being skipped — a milestone you have been brushing past. That is a softer warning, but a real one.',
      },
    ],
    relatedSpreads: [
      'the-star-spread',
      'the-world-spread',
      'judgement-spread',
    ],
  },

  // ----------------------------------------------------------------------
  // XX. JUDGEMENT — Awakening & Calling
  // ----------------------------------------------------------------------
  {
    slug: 'judgement-spread',
    name: 'Judgement Spread',
    category: 'spiritual',
    cardCount: 5,
    difficulty: 'advanced',
    durationMin: 30,
    shortDescription:
      'Five cards for the great awakening — the call, what is rising, what to release, your true name, and your purpose.',
    longDescription:
      'Judgement shows figures rising from coffins as an angel sounds a trumpet. It is the card of awakening — not afterlife judgement, but the moment in this life when you are called to rise into who you truly are. This spread is for the deep calling moments. Five cards examine the call you are hearing, what is rising in you, what must be released to answer, your true name (the deepest identity asking to be claimed), and the purpose that organizes the rest of your life around it. It is the most demanding spread in this set, and the most clarifying.',
    bestFor: [
      'Major life recalibrations — vocation, identity, purpose',
      'Spiritual awakenings or significant inner shifts',
      'Naming a calling that has been quietly insisting for years',
      'Mid-life reorientation, second-half-of-life work',
      'When old answers no longer fit and a deeper question is rising',
    ],
    whenToUse:
      'Use this spread when something inside you is pushing on the lid of the coffin and you can no longer ignore it. Best read in a quiet, ritualized space with time after for journaling. Avoid using it casually; Judgement is not a daily card and the spread should not be a daily spread.',
    history:
      'Judgement in tarot was originally tied to Christian last-judgement imagery but reframed by esoteric traditions as the personal awakening to one\'s vocation. Hermetic readings tie it to Pluto and Mars and to the trumpet that calls each soul into its true work.',
    positions: [
      {
        position: 1,
        name: 'The call',
        meaning:
          'The trumpet you are hearing right now — the calling that has been quietly insisting. Not the should — the must. The summons your deeper self is making.',
      },
      {
        position: 2,
        name: 'What is rising',
        meaning:
          'The part of you that has been waiting and is now standing up. The capacity, voice, or self that is being born through this awakening.',
      },
      {
        position: 3,
        name: 'What to release',
        meaning:
          'The old identity, story, or life that cannot rise into the new. What stays in the coffin for the new self to walk free.',
      },
      {
        position: 4,
        name: 'Your true name',
        meaning:
          'The deepest identity you are being asked to claim. Not a title or a role — the inner truth of who you are. Often a quiet, simple sentence.',
      },
      {
        position: 5,
        name: 'Your purpose',
        meaning:
          'The work, contribution, or way of being that organizes the rest of your life around your true name. The why this awakening is happening at all.',
      },
    ],
    exampleQuestions: [
      'What is my actual calling, beyond what I have been told it is?',
      'Who am I being asked to become?',
      'What in my life has died that I am still carrying around?',
      'What is my real name, in the deepest sense?',
      'What is my work in this lifetime?',
    ],
    faqs: [
      {
        q: 'How do I know if this is a real Judgement moment or just a mood?',
        a: 'Real Judgement moments do not pass with rest, distraction, or time. The call card stays loud across weeks. If a few days of rest dissolve the urgency, this was probably a Hermit moment, not a Judgement one.',
      },
      {
        q: 'My "true name" card surprises me. Should I trust it?',
        a: 'Trust it more than your familiar self-image. Judgement specializes in surfacing identities you have been refusing to claim because they feel too large or too true. The shock of the card is often the confirmation.',
      },
      {
        q: 'How is this different from the Fool Spread?',
        a: 'The Fool begins a new chapter. Judgement reorganizes a whole life. Use the Fool for thresholds; use Judgement when the threshold is the entire architecture of who you are.',
      },
      {
        q: 'What if I am not ready to answer the call?',
        a: 'Then the spread is honest about that. The release card will tell you what is in the way; the rising card will keep waiting. Judgement does not punish delay — but the trumpet does not stop sounding.',
      },
    ],
    relatedSpreads: [
      'the-fool-spread',
      'the-world-spread',
      'death-spread',
    ],
  },

  // ----------------------------------------------------------------------
  // XXI. THE WORLD — Completion & Wholeness
  // ----------------------------------------------------------------------
  {
    slug: 'the-world-spread',
    name: 'The World Spread',
    category: 'spiritual',
    cardCount: 5,
    difficulty: 'advanced',
    durationMin: 25,
    shortDescription:
      'Five cards for the closing of a cycle — what is complete, what you have integrated, what to celebrate, what is next, and the new dance.',
    longDescription:
      'The World shows a dancer in a wreath surrounded by the four elemental beings — bull, lion, eagle, angel. It is the card of completion, integration, and the dance that arrives when a whole cycle has been honestly walked. This spread is for the end of a chapter — a project, a season of life, a long arc of becoming. Five cards examine what is complete, what you have actually integrated through it, what is asking to be celebrated, what the next cycle is, and the new dance you carry forward into it. It is the spread for honest endings that are also honest beginnings.',
    bestFor: [
      'Completing a long arc — degree, decade, project, recovery',
      'Year-end and decade-end reviews',
      'Marking integration after deep inner work',
      'Marking the literal completion of something significant',
      'Discerning what to carry into the next cycle and what to leave behind',
    ],
    whenToUse:
      'Use this spread when something has genuinely completed and you can name what. Best read at thresholds — birthdays, year-ends, finished books, finished healings. Avoid forcing it on something that has not yet finished; the World rewards honesty about what is actually whole.',
    history:
      'The World is the final Major Arcana card and has been read across traditions as the soul\'s return after the full journey of the Fool — round, complete, and now ready to begin again at a higher turn of the spiral. Hermetic decks tie it to Saturn and to the integration of all four elements.',
    positions: [
      {
        position: 1,
        name: 'What is complete',
        meaning:
          'The specific cycle, project, identity, or chapter that has genuinely closed. Named cleanly so the completion can be honored, not dragged into the next chapter.',
      },
      {
        position: 2,
        name: 'What you have integrated',
        meaning:
          'The actual capacity, wisdom, or wholeness you have grown through this cycle. Not what you set out to gain — what you actually became.',
      },
      {
        position: 3,
        name: 'What to celebrate',
        meaning:
          'The marking that this completion deserves. The ritual, the gathering, the rest, the gift to yourself. The World refuses to skip the celebration.',
      },
      {
        position: 4,
        name: 'What is next',
        meaning:
          'The shape of the next cycle that the integration has earned. Not a return to the start — the next turn of the spiral, opening from a higher altitude.',
      },
      {
        position: 5,
        name: 'The new dance',
        meaning:
          'The way of being you carry into the new cycle. The integrated self that walks into the next chapter — different from who began the last one, freer, more whole.',
      },
    ],
    exampleQuestions: [
      'What chapter of my life has actually completed?',
      'Who have I become through this long arc?',
      'How do I honor this ending properly?',
      'What is the next cycle the universe is opening for me?',
      'What integrated self do I now carry into what comes next?',
    ],
    faqs: [
      {
        q: 'My "what is complete" card surprises me. Should I trust it?',
        a: 'Yes. The World often names completions we have not yet acknowledged — a friendship that has quietly finished, an identity that has aged out, a calling that has fulfilled itself. Trust the spread\'s naming.',
      },
      {
        q: 'What if my "what is next" card looks small?',
        a: 'Small next cycles are often the deepest. The World does not always lead to bigger; sometimes it leads to truer. A small next chapter is no less honored than a grand one.',
      },
      {
        q: 'How is this different from the Sun Spread?',
        a: 'The Sun is radiant clarity in a chapter. The World is completion of one. Use the Sun for joy mid-stream; use the World when something has genuinely finished its turn.',
      },
      {
        q: 'Can I be in the World energy for a long time?',
        a: 'Yes — the dance can last a season before the next Fool moment arrives. The spread is not a deadline. It is permission to actually stand in completion before rushing into the next thing.',
      },
    ],
    relatedSpreads: [
      'judgement-spread',
      'the-fool-spread',
      'the-sun-spread',
    ],
  },
];
