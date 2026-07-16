/**
 * Sign-to-sign compatibility content — 78 unordered pairs (12 same-sign +
 * 66 distinct), keyed "SignA-SignB" in zodiac order (lower index first).
 *
 * Scores are grounded in element + modality logic, not chosen at random:
 *   • same element (trine)           ~85-92
 *   • Fire/Air & Earth/Water sextile ~83-88
 *   • Fire/Air & Earth/Water opposition ~82-87 (complementary polarity)
 *   • same sign (conjunction)        ~80
 *   • semisextile / quincunx (adjacent or awkward, clashing elements) ~57-66
 *   • square (same modality, clashing elements) ~56-62
 *
 * Tone: Arcana's warm, second-person, insightful voice — never fatalistic,
 * never medical or financial advice. Entertainment and self-reflection.
 */

import { SignCompatibility } from './types';

export const SIGN_COMPATIBILITY: SignCompatibility = {
  // ── Aries ──────────────────────────────────────────────────────────
  'Aries-Aries': {
    score: 80,
    love: "Two spark-throwers who fall fast and burn bright — passion is instant, though someone eventually has to blink first when neither wants to back down.",
    friendship: "Endlessly game for the next adventure; your shared restlessness keeps things thrilling, if occasionally competitive.",
    work: "A high-energy duo that lights a hundred fires — the real skill is finishing what you both so eagerly begin.",
  },
  'Aries-Taurus': {
    score: 63,
    love: "Fire meeting earth asks patience on both sides — Aries wants it now, Taurus wants it to last, and that friction can be maddening or magnetic depending on the day.",
    friendship: "You balance each other neatly: Aries pulls Taurus off the sofa, Taurus keeps Aries from burning out.",
    work: "Aries launches, Taurus sees it through — a genuinely useful pairing once you agree on pace.",
  },
  'Aries-Gemini': {
    score: 85,
    love: "Air feeds this fire beautifully — Gemini's wit keeps Aries endlessly entertained, and the chemistry stays quick, playful, and rarely dull.",
    friendship: "A restless, curious pair forever chasing the next idea or road trip; boredom never stands a chance around you two.",
    work: "Aries drives while Gemini strategises — brainstorms move fast and seldom stall.",
  },
  'Aries-Cancer': {
    score: 58,
    love: "Tender-tough is the theme here, since Aries' bluntness can bruise Cancer's softness — real closeness arrives when Aries slows down and Cancer speaks up.",
    friendship: "Different rhythms, yet Cancer's care and Aries' loyalty can forge a surprisingly protective bond.",
    work: "Cancer reads the room Aries barrels into; respecting each other's instincts is what smooths the gap.",
  },
  'Aries-Leo': {
    score: 90,
    love: "Two fire signs who adore boldly and dramatically — mutual admiration runs high, and the romance rarely lacks heat or generosity.",
    friendship: "A loyal, larger-than-life friendship full of encouragement; you cheer each other on like nobody else can.",
    work: "Natural leaders who inspire a whole team — learning to share the spotlight is the only lesson on the table.",
  },
  'Aries-Virgo': {
    score: 60,
    love: "Impulse meets precision, and the two of you can genuinely baffle each other — but Virgo's steadiness grounds Aries, and Aries loosens Virgo up.",
    friendship: "You think differently enough to learn a great deal; patience with each other's pace is the price of admission.",
    work: "Aries acts, Virgo refines — a strong combination whenever neither judges the other's method.",
  },
  'Aries-Libra': {
    score: 84,
    love: "Opposite signs with undeniable pull — Aries brings the fire, Libra brings the grace, and between you the 'me' and the 'we' find balance.",
    friendship: "You round each other out: Aries teaches Libra to choose, Libra teaches Aries to consider.",
    work: "Aries decides while Libra diplomats — a partnership that both drives and harmonises.",
  },
  'Aries-Scorpio': {
    score: 62,
    love: "Both carry a Mars charge, so this pairing runs hot — desire flares quickly, and so can jealousy, making honesty about power essential.",
    friendship: "A fiercely all-in bond; you respect each other's strength even in the middle of a clash.",
    work: "Formidable when aligned — Aries' drive and Scorpio's focus can be unstoppable, as long as control isn't the battleground.",
  },
  'Aries-Sagittarius': {
    score: 91,
    love: "Two fire signs built for adventure — freedom-loving and optimistic, you fan each other's flames without ever feeling caged.",
    friendship: "Spontaneous, funny, and always up for the next escapade; this is one of the easiest bonds in the zodiac.",
    work: "Big-picture thinkers who move fast — you'll simply need someone to catch the details you both skip.",
  },
  'Aries-Capricorn': {
    score: 57,
    love: "Two strong wills at cross purposes — Aries wants passion now, Capricorn plays the long game, and bridging that tension takes real effort.",
    friendship: "Different speeds, but a shared hunger to win can turn rivalry into genuine mutual respect.",
    work: "Ambition squared — Aries' urgency and Capricorn's strategy build something big once you stop steering against each other.",
  },
  'Aries-Aquarius': {
    score: 86,
    love: "Fire and air spark easily here — Aquarius' originality fascinates Aries, and neither one smothers the other's need for independence.",
    friendship: "An inventive, free-spirited pair forever hatching plans; you give each other room to be fully yourselves.",
    work: "Aries executes what Aquarius dreams up — a genuinely innovative team.",
  },
  'Aries-Pisces': {
    score: 64,
    love: "Neighbouring signs with plenty to teach each other — Pisces softens Aries' edges, Aries emboldens Pisces, provided impatience doesn't get there first.",
    friendship: "Gentle meets bold: Aries protects, Pisces empathises, and the balance can be quietly sweet.",
    work: "Aries supplies the push, Pisces the imagination — clear roles keep the dreamier partner from being steamrolled.",
  },

  // ── Taurus ─────────────────────────────────────────────────────────
  'Taurus-Taurus': {
    score: 80,
    love: "Two sensualists who build a warm, comfortable love — devotion and steadiness abound, though two stubborn streaks can dig in hard.",
    friendship: "Reliable and easy, rooted in good food and shared comforts; you rarely let each other down.",
    work: "Patient and thorough — you finish what you start, so long as neither of you refuses to budge.",
  },
  'Taurus-Gemini': {
    score: 61,
    love: "Steady earth meets restless air — Taurus craves security while Gemini craves novelty, so trust here is built slowly and deliberately.",
    friendship: "Gemini brings the sparkle, Taurus the ballast; appreciating that difference is what makes it work.",
    work: "Gemini generates the ideas, Taurus makes them tangible — pace mismatches are the main hurdle to clear.",
  },
  'Taurus-Cancer': {
    score: 86,
    love: "Earth and water nourish each other tenderly — this is a home-loving bond where both of you feel safe enough to soften.",
    friendship: "Deeply caring and dependable; you show up for each other in the small, meaningful ways.",
    work: "A supportive, steady team that builds patiently and quietly looks after its people.",
  },
  'Taurus-Leo': {
    score: 58,
    love: "Two fixed signs who love loyally but stubbornly — Taurus wants calm, Leo wants flair, and pride can turn small things into standoffs.",
    friendship: "Warm and steadfast once trust is earned, though you'll both have to bend your immovable ways.",
    work: "Leo leads with vision, Taurus with persistence — powerful together if the egos don't lock horns.",
  },
  'Taurus-Virgo': {
    score: 90,
    love: "Two earth signs who ground each other beautifully — practical, sensual, and steady, this is a love built to last.",
    friendship: "Down-to-earth and dependable; you understand each other's need for order and calm.",
    work: "Meticulous and productive — a pairing that reliably turns plans into polished results.",
  },
  'Taurus-Libra': {
    score: 66,
    love: "Both are Venus-ruled and share a love of beauty and comfort — yet Taurus' need for security can chafe against Libra's need to weigh every option.",
    friendship: "A pleasure-loving pair drawn to art, food, and ease; shared charm bridges your differences.",
    work: "Taurus commits while Libra deliberates — patience with each other's tempo pays off in the end.",
  },
  'Taurus-Scorpio': {
    score: 85,
    love: "Opposite signs with magnetic depth — Taurus' steadiness anchors Scorpio's intensity, and the emotional and physical pull runs strong.",
    friendship: "Fiercely loyal once bonded; you keep each other's confidences and hold nothing back.",
    work: "A determined duo — Taurus builds, Scorpio strategises, and neither of you knows how to quit.",
  },
  'Taurus-Sagittarius': {
    score: 59,
    love: "Homebody meets wanderer — Taurus wants roots while Sagittarius wants the horizon, so compromise is basically the whole assignment.",
    friendship: "Sagittarius pulls Taurus toward adventure, Taurus offers a place to come home to; the contrast can be refreshing.",
    work: "Sagittarius aims big, Taurus grounds it — aligning on pace is the key that unlocks progress.",
  },
  'Taurus-Capricorn': {
    score: 91,
    love: "Two earth signs quietly building something solid — loyal, sensual, and devoted, this is a love with real staying power.",
    friendship: "Grounded and dependable; you respect each other's work ethic and steady nature.",
    work: "An ambitious, disciplined pairing that turns long-term goals into concrete reality.",
  },
  'Taurus-Aquarius': {
    score: 56,
    love: "Two fixed signs pulling in opposite directions — Taurus wants closeness and routine, Aquarius wants freedom and change, and both dig in.",
    friendship: "You challenge each other's whole worldview; curiosity, not agreement, is what keeps it interesting.",
    work: "Aquarius innovates, Taurus stabilises — a productive tension whenever neither insists on being right.",
  },
  'Taurus-Pisces': {
    score: 87,
    love: "Earth cradles water here — Taurus offers Pisces safety and grounding, Pisces offers Taurus tenderness and imagination.",
    friendship: "A gentle, caring bond; you soothe each other and rarely need many words to feel understood.",
    work: "Taurus turns Pisces' dreams into something real — a quietly effective partnership.",
  },

  // ── Gemini ─────────────────────────────────────────────────────────
  'Gemini-Gemini': {
    score: 80,
    love: "Two quick minds in constant conversation — playful and never dull, though feelings can occasionally get lost in all the talk.",
    friendship: "Endlessly curious together, forever swapping ideas and jokes; boredom is simply not an option.",
    work: "A brainstorming powerhouse — following through on the ideas is your shared challenge.",
  },
  'Gemini-Cancer': {
    score: 62,
    love: "Airy Gemini and watery Cancer feel love differently — Cancer wants emotional depth, Gemini wants mental spark, so tenderness sometimes needs translating.",
    friendship: "Gemini lightens Cancer's moods, Cancer deepens Gemini's world; the balance can be genuinely lovely.",
    work: "Cancer reads the people, Gemini reads the room — complementary once you value the other's instinct.",
  },
  'Gemini-Leo': {
    score: 85,
    love: "Air feeds fire delightfully — Gemini's wit enchants Leo, Leo's warmth flatters Gemini, and the romance stays fun and flirtatious.",
    friendship: "A sociable, playful pair who light up any room they walk into together.",
    work: "Leo leads with heart, Gemini with cleverness — a persuasive, energetic team.",
  },
  'Gemini-Virgo': {
    score: 62,
    love: "Both are ruled by Mercury and connect through the mind — but Gemini's scatter can unsettle Virgo's order, and criticism cuts both directions.",
    friendship: "Sharp, witty, and analytical together; you two can talk for hours and lose track of time.",
    work: "Gemini generates, Virgo perfects — excellent as long as Virgo doesn't over-edit Gemini's spark.",
  },
  'Gemini-Libra': {
    score: 90,
    love: "Two air signs who click mentally and socially — light, communicative, and full of shared ideas, this love feels easy and bright.",
    friendship: "Effortless conversation and a shared love of people; you understand each other almost instantly.",
    work: "Idea-rich and diplomatic — a smooth, articulate partnership.",
  },
  'Gemini-Scorpio': {
    score: 58,
    love: "Breezy Gemini meets intense Scorpio — one skims the surface, the other dives deep, and trust is the bridge you'll have to build carefully.",
    friendship: "Fascination draws you together even as your styles diverge; each finds the other a puzzle worth solving.",
    work: "Scorpio's focus can anchor Gemini's range — powerful once secrecy and openness find a truce.",
  },
  'Gemini-Sagittarius': {
    score: 83,
    love: "Opposite signs who adore ideas and freedom — restless, funny, and forever learning from each other, you rarely run out of things to explore.",
    friendship: "A pair of eternal students and adventurers; every conversation seems to end up somewhere new.",
    work: "Gemini handles the detail, Sagittarius the vision — a lively, big-thinking team.",
  },
  'Gemini-Capricorn': {
    score: 59,
    love: "Playful air meets serious earth — Gemini wants variety, Capricorn wants commitment, so this love asks each of you to stretch toward the other.",
    friendship: "Capricorn grounds Gemini's flights, Gemini loosens Capricorn's grip; the contrast can teach you both a lot.",
    work: "Gemini brings ideas, Capricorn brings discipline — a strong combination once your tempos align.",
  },
  'Gemini-Aquarius': {
    score: 91,
    love: "Two air signs on the same wavelength — intellectually electric and refreshingly free, you connect through curiosity rather than clinginess.",
    friendship: "Inventive, quirky, and endlessly stimulating; you give each other plenty of room to think.",
    work: "A future-facing team — Aquarius dreams it up, Gemini articulates it.",
  },
  'Gemini-Pisces': {
    score: 60,
    love: "Mutable air and water can be dreamy or confusing — Gemini rationalises, Pisces feels, and clarity is the thing worth nurturing.",
    friendship: "Imaginative and adaptable together; you drift easily between clever ideas and daydreams.",
    work: "Gemini structures Pisces' imagination — good output whenever focus is shared.",
  },

  // ── Cancer ─────────────────────────────────────────────────────────
  'Cancer-Cancer': {
    score: 80,
    love: "Two tender hearts who nurture deeply — emotionally attuned and devoted, though a shared moodiness needs airing before it quietly festers.",
    friendship: "Caring and intuitive; you sense each other's needs almost without a word being said.",
    work: "A protective, supportive team — though someone still has to face the outside world.",
  },
  'Cancer-Leo': {
    score: 64,
    love: "Neighbouring warmth: Leo's brightness lifts Cancer, Cancer's care steadies Leo, and both of you love loyally and generously.",
    friendship: "A cosy, affectionate bond; Leo brings the fun, Cancer brings the comfort.",
    work: "Leo leads out front while Cancer holds things together behind the scenes.",
  },
  'Cancer-Virgo': {
    score: 86,
    love: "Water and earth blend gently — Virgo's steadiness reassures Cancer, Cancer's warmth softens Virgo, and care flows both ways.",
    friendship: "Thoughtful and dependable; you look after each other in practical, understated ways.",
    work: "Detail-minded and caring — a conscientious, effective pairing.",
  },
  'Cancer-Libra': {
    score: 57,
    love: "Cardinal signs meeting at a right angle — Cancer wants emotional closeness, Libra wants harmony and space, so moods can collide with logic.",
    friendship: "You teach each other a great deal — Libra brings perspective, Cancer brings heart.",
    work: "Libra smooths, Cancer nurtures — workable once neither takes the other's style personally.",
  },
  'Cancer-Scorpio': {
    score: 91,
    love: "Two water signs bonded soul-deep — emotionally intense and intuitive, this is one of the zodiac's most devoted pairings.",
    friendship: "Fiercely loyal and protective; you trust each other with just about everything.",
    work: "Instinctive and determined — together you read situations and people with uncanny accuracy.",
  },
  'Cancer-Sagittarius': {
    score: 58,
    love: "Homebound water meets wandering fire — Cancer seeks security, Sagittarius seeks freedom, so this love asks for real give and take.",
    friendship: "Sagittarius coaxes Cancer out to play, Cancer offers a soft place to return; the difference can enrich you both.",
    work: "Cancer cares for the team, Sagittarius chases the goal — aligning priorities is the actual work.",
  },
  'Cancer-Capricorn': {
    score: 82,
    love: "Opposite signs that complete each other — Cancer's warmth softens Capricorn's reserve, while Capricorn gives Cancer's feelings a solid place to land.",
    friendship: "A loyal, grown-up bond; you cover each other's blind spots.",
    work: "A powerhouse pairing — Cancer nurtures the team, Capricorn builds the structure.",
  },
  'Cancer-Aquarius': {
    score: 57,
    love: "Feeling meets detachment — Cancer leads with the heart, Aquarius with the head, so warmth has to bridge a genuine gap.",
    friendship: "You broaden each other: Aquarius adds perspective, Cancer adds tenderness.",
    work: "Aquarius innovates while Cancer tends the morale — complementary when emotion and logic make peace.",
  },
  'Cancer-Pisces': {
    score: 92,
    love: "Two water signs in effortless emotional flow — compassionate, romantic, and intuitive, you seem to understand each other wordlessly.",
    friendship: "Gentle, empathetic, and deeply supportive; you're a safe harbour for one another.",
    work: "Imaginative and caring — you'll want a grounded ally on hand to manage the hard edges.",
  },

  // ── Leo ────────────────────────────────────────────────────────────
  'Leo-Leo': {
    score: 80,
    love: "Two suns sharing a single sky — passionate, generous, and dramatic, this love dazzles as long as you take turns shining.",
    friendship: "Loyal and larger-than-life; you champion each other fiercely and publicly.",
    work: "Bold, creative leaders — since the throne only fits one at a time, learning to share it is everything.",
  },
  'Leo-Virgo': {
    score: 63,
    love: "Fire beside earth: Leo's flair meets Virgo's modesty, and warmth grows once Leo values Virgo's care and Virgo eases up on the critique.",
    friendship: "Leo brings the colour, Virgo brings the substance; you balance each other well.",
    work: "Leo inspires, Virgo executes — a polished result whenever praise flows in both directions.",
  },
  'Leo-Libra': {
    score: 86,
    love: "Fire and air in graceful harmony — Libra adores Leo's confidence, Leo basks in Libra's charm, and romance comes easily.",
    friendship: "A sociable, stylish pair who love beauty, fun, and each other's company.",
    work: "Leo leads while Libra refines the presentation — a charismatic team.",
  },
  'Leo-Scorpio': {
    score: 59,
    love: "Two fixed signs of enormous intensity — passion runs deep, but so does the will to win, and pride can spark real power struggles.",
    friendship: "Fiercely loyal once trust is earned; you respect each other's undeniable strength.",
    work: "Formidable and driven — magnetic when aligned, combustible whenever control is at stake.",
  },
  'Leo-Sagittarius': {
    score: 91,
    love: "Two fire signs made for joy — warm, adventurous, and generous, you bring out each other's best without dimming the light.",
    friendship: "Fun-loving and optimistic; every day spent together feels a little like an occasion.",
    work: "Big-hearted, big-thinking leaders — you'll want a detail person somewhere in the room.",
  },
  'Leo-Capricorn': {
    score: 60,
    love: "Fire meets earth, warmth meets restraint — Leo wants applause, Capricorn wants results, so appreciation has to be spoken to be felt.",
    friendship: "You admire each other's ambition; the differences in style become strengths over time.",
    work: "Leo motivates, Capricorn organises — a commanding pair once ego yields to the goal.",
  },
  'Leo-Aquarius': {
    score: 84,
    love: "Opposite signs with electric attraction — Leo warms Aquarius' cool, Aquarius broadens Leo's world, and the polarity keeps things exciting.",
    friendship: "You balance heart and mind; Leo brings the passion, Aquarius brings the perspective.",
    work: "Leo leads with charisma, Aquarius with vision — an inspiring, forward-looking team.",
  },
  'Leo-Pisces': {
    score: 61,
    love: "Bold fire and gentle water — Leo's confidence shelters Pisces, Pisces' tenderness moves Leo, provided Leo remembers to stay gentle.",
    friendship: "A creative, affectionate pair; you spark each other's imagination.",
    work: "Leo drives, Pisces dreams — clear direction keeps the softer partner from quietly fading back.",
  },

  // ── Virgo ──────────────────────────────────────────────────────────
  'Virgo-Virgo': {
    score: 80,
    love: "Two careful hearts who show love through service — devoted and attentive, though you'll both have to quiet the inner critic now and then.",
    friendship: "Practical, dependable, and refreshingly honest; you keep each other organised.",
    work: "Precise and productive — a meticulous team that genuinely misses nothing.",
  },
  'Virgo-Libra': {
    score: 62,
    love: "Earth meets air: Virgo seeks order, Libra seeks harmony, and love grows once neither treats the other's approach as a flaw.",
    friendship: "Libra softens Virgo's edges, Virgo grounds Libra's indecision; the pairing can polish you both.",
    work: "Virgo perfects, Libra presents — a refined, quality-minded team.",
  },
  'Virgo-Scorpio': {
    score: 86,
    love: "Earth and water meeting in depth — Virgo's steadiness meets Scorpio's intensity, building a private, loyal, quietly passionate bond.",
    friendship: "Discreet and devoted; you trust each other with the real story behind the story.",
    work: "Analytical and focused — few problems survive the two of you working on them together.",
  },
  'Virgo-Sagittarius': {
    score: 58,
    love: "Mutable earth and fire pull in different directions — Virgo wants precision, Sagittarius wants freedom, so patience is the bridge.",
    friendship: "Sagittarius broadens Virgo's horizons, Virgo grounds Sagittarius' plans; the contrast can teach a lot.",
    work: "Sagittarius sees the vision, Virgo handles the fine print — effective once the pace is agreed.",
  },
  'Virgo-Capricorn': {
    score: 91,
    love: "Two earth signs building steadily — grounded, loyal, and practical, this love is understated but deeply reliable.",
    friendship: "Dependable and hardworking; you respect each other's discipline and dry humour.",
    work: "A high-achieving pair — organised, thorough, and relentlessly competent.",
  },
  'Virgo-Aquarius': {
    score: 59,
    love: "Earth meets air, detail meets big picture — Virgo grounds Aquarius' ideals, Aquarius stretches Virgo's thinking, as long as judgment stays at bay.",
    friendship: "Two analytical minds who enjoy dissecting the world; you learn from your differences.",
    work: "Aquarius innovates, Virgo implements — a smart pairing whenever standards and vision align.",
  },
  'Virgo-Pisces': {
    score: 85,
    love: "Opposite signs that complete each other — Virgo grounds Pisces' dreams, Pisces softens Virgo's practicality, and compassion flows both ways.",
    friendship: "Gentle and helpful; you look after each other's hearts and to-do lists alike.",
    work: "Virgo structures, Pisces imagines — a balanced, creative-yet-organised team.",
  },

  // ── Libra ──────────────────────────────────────────────────────────
  'Libra-Libra': {
    score: 80,
    love: "Two romantics devoted to harmony — charming and considerate, though two people who dread deciding can drift without direction.",
    friendship: "Sociable, fair, and easy company; you value the same beauty and balance.",
    work: "Diplomatic and collaborative — though someone still has to make the final call.",
  },
  'Libra-Scorpio': {
    score: 63,
    love: "Airy Libra meets watery Scorpio — charm meets depth, and attraction runs strong once Libra meets Scorpio's need for real intimacy.",
    friendship: "Scorpio deepens Libra, Libra lightens Scorpio; the pairing intrigues you both.",
    work: "Libra negotiates while Scorpio investigates — a shrewd, persuasive team.",
  },
  'Libra-Sagittarius': {
    score: 85,
    love: "Air feeds fire warmly — Sagittarius' zest excites Libra, Libra's grace charms Sagittarius, and the romance stays light and adventurous.",
    friendship: "Sociable and open-minded; you love ideas, people, and going places together.",
    work: "Libra connects, Sagittarius expands — an outgoing, opportunity-rich pair.",
  },
  'Libra-Capricorn': {
    score: 58,
    love: "Cardinal signs at odds — Libra wants harmony and ease, Capricorn wants structure and results, so this love asks for patience.",
    friendship: "Capricorn steadies Libra, Libra lightens Capricorn; you round each other out nicely.",
    work: "Libra handles the people, Capricorn handles the plan — productive once you sync your styles.",
  },
  'Libra-Aquarius': {
    score: 91,
    love: "Two air signs in bright accord — intellectually and socially in tune, this love feels progressive, friendly, and free.",
    friendship: "Idealistic and social; you share the same values and a bottomless well of conversation.",
    work: "Forward-thinking and collaborative — a fair, inventive team.",
  },
  'Libra-Pisces': {
    score: 60,
    love: "Gentle air and water can be dreamy — both of you are romantic and conflict-averse, so you'll need to name what's real beneath the niceness.",
    friendship: "Kind, artistic, and easygoing; you bring out each other's softer side.",
    work: "Libra structures Pisces' imagination — pleasant output once the decisions actually get made.",
  },

  // ── Scorpio ────────────────────────────────────────────────────────
  'Scorpio-Scorpio': {
    score: 80,
    love: "Two intense hearts merging completely — passionate, magnetic, and all-consuming, though two people who never fully let go can spar for control.",
    friendship: "Fiercely loyal and private; you trust each other with what no one else gets to see.",
    work: "Focused and formidable — nothing slips past you, provided the power stays shared.",
  },
  'Scorpio-Sagittarius': {
    score: 62,
    love: "Neighbouring signs of very different temperature — Scorpio wants depth, Sagittarius wants freedom, so both trust and space must be honoured.",
    friendship: "Sagittarius lightens Scorpio, Scorpio grounds Sagittarius; the contrast can be bracing.",
    work: "Scorpio's focus meets Sagittarius' vision — potent when aimed at the same target.",
  },
  'Scorpio-Capricorn': {
    score: 87,
    love: "Water and earth in powerful union — Scorpio's depth meets Capricorn's strength, forging a loyal, ambitious, quietly passionate bond.",
    friendship: "Serious, trustworthy, and steadfast; you respect each other's resilience.",
    work: "A strategic powerhouse — Scorpio reads the game, Capricorn builds the empire.",
  },
  'Scorpio-Aquarius': {
    score: 57,
    love: "Two fixed signs pulling apart — Scorpio wants emotional fusion, Aquarius wants independence, and neither is easily moved.",
    friendship: "You fascinate each other despite the friction; each sees a slice of the world the other can't.",
    work: "Aquarius innovates, Scorpio drives it deep — effective whenever neither battles for control.",
  },
  'Scorpio-Pisces': {
    score: 92,
    love: "Two water signs bonded at the soul — intuitive, romantic, and emotionally boundless, you understand each other's depths instinctively.",
    friendship: "Deeply empathetic and loyal; you feel safe being completely yourselves.",
    work: "Imaginative and perceptive — pair up with a pragmatist to keep the logistics on track.",
  },

  // ── Sagittarius ────────────────────────────────────────────────────
  'Sagittarius-Sagittarius': {
    score: 80,
    love: "Two free spirits chasing the horizon — adventurous, honest, and fun, though someone has to remember the practicalities you both cheerfully ignore.",
    friendship: "Spontaneous and optimistic; every plan somehow turns into an adventure.",
    work: "Visionary and energetic — you'll thrive with a detail-minded ally in the mix.",
  },
  'Sagittarius-Capricorn': {
    score: 62,
    love: "Fire meets earth, freedom meets structure — Sagittarius dreams big, Capricorn builds carefully, so this love asks each of you to meet in the middle.",
    friendship: "Capricorn grounds Sagittarius' schemes, Sagittarius lifts Capricorn's spirits; the balance can be great.",
    work: "Sagittarius spots the opportunity, Capricorn makes it real — a strong marriage of vision and discipline.",
  },
  'Sagittarius-Aquarius': {
    score: 86,
    love: "Fire and air in free-spirited harmony — independent and idealistic, you inspire each other without ever feeling tied down.",
    friendship: "Open-minded and adventurous; you share a real love of ideas and freedom.",
    work: "Aquarius innovates, Sagittarius expands — a bold, future-facing team.",
  },
  'Sagittarius-Pisces': {
    score: 60,
    love: "Mutable fire and water blur together — Sagittarius seeks truth, Pisces seeks meaning, and tenderness needs clear communication to thrive.",
    friendship: "Both dreamers and wanderers; you spark each other's imagination and wanderlust.",
    work: "Sagittarius aims, Pisces envisions — focus and grounding turn the dreams into work.",
  },

  // ── Capricorn ──────────────────────────────────────────────────────
  'Capricorn-Capricorn': {
    score: 80,
    love: "Two ambitious hearts building for the long haul — loyal, steady, and dependable, though you'll both need to let work rest and love breathe.",
    friendship: "Grounded and reliable; you respect each other's drive and understated, dry wit.",
    work: "Disciplined and relentless — a formidable, goal-crushing team.",
  },
  'Capricorn-Aquarius': {
    score: 61,
    love: "Neighbouring signs, tradition meeting innovation — Capricorn values structure, Aquarius values freedom, so this love grows through mutual respect.",
    friendship: "Aquarius stretches Capricorn's thinking, Capricorn grounds Aquarius' ideals; you balance each other.",
    work: "Capricorn builds the system, Aquarius reinvents it — productive tension at its most useful.",
  },
  'Capricorn-Pisces': {
    score: 86,
    love: "Earth cradles water — Capricorn offers Pisces security, Pisces offers Capricorn softness, and the two of you draw out each other's hidden warmth.",
    friendship: "Supportive and complementary; Capricorn steadies Pisces, Pisces gentles Capricorn.",
    work: "Capricorn turns Pisces' vision into reality — a quietly effective, imaginative-yet-grounded pairing.",
  },

  // ── Aquarius ───────────────────────────────────────────────────────
  'Aquarius-Aquarius': {
    score: 80,
    love: "Two original minds who love as friends first — inventive and free, though feelings can hide behind all that cool independence.",
    friendship: "Quirky, idealistic, and endlessly stimulating; you genuinely get each other's oddities.",
    work: "Innovative and visionary — you'll want a finisher on the team to ground the big ideas.",
  },
  'Aquarius-Pisces': {
    score: 61,
    love: "Neighbouring air and water, mind meeting heart — Aquarius thinks, Pisces feels, and warmth grows when each honours the other's language.",
    friendship: "Both are compassionate idealists; you dream up a better world together.",
    work: "Aquarius innovates, Pisces imagines — inspired output that still needs a grounding hand.",
  },

  // ── Pisces ─────────────────────────────────────────────────────────
  'Pisces-Pisces': {
    score: 80,
    love: "Two dreamers merging softly — romantic, compassionate, and intuitive, though two people who avoid hard truths must learn to surface them.",
    friendship: "Gentle, empathetic, and creative; you understand each other almost wordlessly.",
    work: "Imaginative and sensitive — a practical partner helps turn the dreams into plans.",
  },
};
