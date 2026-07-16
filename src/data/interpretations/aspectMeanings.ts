/**
 * Aspect interpretation content — the ANGLE (essence) between two planets and
 * the DYNAMIC of each planetary pair, composed at render into a single reading.
 *
 * Keys align exactly with the natal-chart aspect output: essence keys are the
 * five aspect types; pairs keys are the 45 unordered planet pairs, joined
 * alphabetically with '-' (see planetPairKey in ./types).
 *
 * Tone: Arcana's voice — warm, second-person, insightful, never fatalistic.
 */

import { AspectMeanings } from './types';

export const ASPECT_MEANINGS: AspectMeanings = {
  essence: {
    conjunction:
      "Two planets sitting together fuse into a single, concentrated force — their energies blend so completely that you rarely feel one without the other. This is intensity and emphasis; whatever these planets touch becomes a defining thread in how you move through the world.",
    opposition:
      "Planets facing each other across the chart pull in opposite directions, and you often feel the tension as something to balance rather than resolve. You may meet one side in yourself and the other out in the world through people who mirror it back — the work is learning to hold both ends at once.",
    trine:
      "When planets sit in easy angle, their energies flow together without friction, giving you a natural talent that can feel so effortless you barely notice it. It's a genuine gift, though one that grows richer when you choose to use it rather than take it for granted.",
    square:
      "Planets at right angles grind against each other, creating an inner friction that keeps asking for effort and adjustment. That tension is also your engine — the discomfort prompts you to grow, and much of your drive and resilience is forged right here.",
    sextile:
      "Planets in supportive angle open a door of opportunity, offering ease that still asks you to walk through it. The talent is available rather than automatic; make a little effort and cooperation tends to meet you halfway.",
  },
  pairs: {
    'Jupiter-Mars':
      "Jupiter enlarges whatever Mars pursues, pairing bold action with big vision and a taste for the grand gesture. Together they generate enthusiasm and courage; how cleanly that drive lands depends on the angle between them.",
    'Jupiter-Mercury':
      "Mercury's quick mind meets Jupiter's love of the big picture, stretching your thinking toward meaning, philosophy, and the sweeping idea. This pairing loves to learn, teach, and connect the dots — the angle decides whether it stays grounded or races ahead of the details.",
    'Jupiter-Moon':
      "Jupiter warms and widens the emotional world of the Moon, giving your feelings a generous, hopeful, sometimes larger-than-life quality. There's an instinct for abundance and comfort here; the angle shapes whether it nourishes you or tips into excess.",
    'Jupiter-Neptune':
      "Two dreamers meet when Jupiter and Neptune combine, weaving faith, imagination, and a yearning for something transcendent. This is the pairing of the mystic and the idealist — inspiring at its best, hazy about limits when the angle runs rough.",
    'Jupiter-Pluto':
      "Jupiter's reach amplifies Pluto's depth, giving you a powerful urge to transform, influence, and go all the way to the root of things. Ambition runs deep with this contact; the angle colours whether that power feels empowering or all-consuming.",
    'Jupiter-Saturn':
      "Saturn's discipline and Jupiter's expansion are the great balancing act — one says grow, the other says build it to last. Held well, they let you dream big and still lay solid foundations; the angle sets how easily the two agree.",
    'Jupiter-Sun':
      "Jupiter shines confidence and optimism onto your core identity, enlarging your sense of what's possible and your appetite for life. Warmth, generosity, and faith in yourself are the gifts here — the angle tunes whether it reads as gracious or over-reaching.",
    'Jupiter-Uranus':
      "When Jupiter meets Uranus, sudden opportunity and the thrill of the new light each other up, sparking breakthroughs and lucky leaps. You're drawn to freedom and the future here; the angle decides whether the timing feels inspired or simply restless.",
    'Jupiter-Venus':
      "Venus and Jupiter are the chart's two benefics, and together they turn up warmth, pleasure, generosity, and a genuine love of the good things. Affection and abundance flow easily with this pair — the angle just fine-tunes how much is enough.",
    'Mars-Mercury':
      "Mercury sharpens into a blade when it joins Mars, quickening your thoughts and giving your words real force and conviction. This is the mind in action — decisive and persuasive at best, sharp-tongued or impatient when the angle bites.",
    'Mars-Moon':
      "Mars stirs the emotional waters of the Moon, lending passion, protectiveness, and a quick emotional reflex. Your feelings move into action fast with this pairing; the angle shapes whether that reads as spirited or easily provoked.",
    'Mars-Neptune':
      "Mars supplies the drive and Neptune the dream, so your energy flows toward inspiration, ideals, and things you can't quite name. At its finest this is creative or spiritual devotion in motion — the angle decides whether the aim stays clear or slips through your fingers.",
    'Mars-Pluto':
      "Few pairings run hotter than Mars and Pluto, fusing raw drive with deep, transformative power and formidable staying force. You don't do things by halves here; the angle governs whether that intensity empowers you or hardens into a battle of wills.",
    'Mars-Saturn':
      "Saturn disciplines the fire of Mars, channelling raw drive into patience, endurance, and deliberate, controlled effort. This is the mark of the marathoner rather than the sprinter — the angle sets whether it feels like focus or frustration.",
    'Mars-Sun':
      "Mars pours fuel onto your core identity, giving your sense of self courage, drive, and a strong will to act. Vitality and assertiveness are the gifts here; the angle tunes whether that energy feels bold or combative.",
    'Mars-Uranus':
      "Mars and Uranus together are electric — sudden, daring, and impatient with anything that holds you back. This pairing loves the bold, unexpected move; the angle decides whether it lands as brilliant timing or reckless impulse.",
    'Mars-Venus':
      "Mars and Venus braid desire and attraction — the chase and the surrender, passion and tenderness. When they meet in your chart, love and drive fuel each other; how smoothly depends on the angle between them.",
    'Mercury-Moon':
      "Mercury and the Moon link what you think with what you feel, weaving intellect and emotion into a single conversation. This pairing gives your mind an intuitive, personal touch — the angle shapes whether head and heart cooperate or compete.",
    'Mercury-Neptune':
      "Neptune softens Mercury's edges, blending logic with imagination, intuition, and a poet's sensitivity to the unspoken. Ideas turn dreamy and inspired here; the angle decides whether that's visionary or simply hard to pin down.",
    'Mercury-Pluto':
      "Mercury dives deep when it meets Pluto, giving your mind penetrating focus and a hunger to uncover what lies beneath the surface. This is the researcher and the detective — the angle colours whether that intensity feels insightful or obsessive.",
    'Mercury-Saturn':
      "Saturn steadies Mercury into careful, structured, thorough thinking that takes ideas seriously. You build thoughts to last with this pairing; the angle sets whether the discipline sharpens your mind or weighs it down with doubt.",
    'Mercury-Sun':
      "Mercury close to the Sun ties your thinking tightly to your identity — you are, in large part, how you communicate and reason. Curiosity and self-expression run together here; the angle fine-tunes how clearly the two speak as one.",
    'Mercury-Uranus':
      "Mercury and Uranus spark the mind into sudden insight, quick wit, and thinking that leaps ahead of the crowd. Originality is the gift here; the angle decides whether your brilliance feels grounded or scattered and impatient.",
    'Mercury-Venus':
      "Mercury and Venus give words a graceful, charming touch, pairing clear thought with an eye for beauty and harmony. This is the diplomat and the artist of language — the angle simply adjusts how easily the charm flows.",
    'Moon-Neptune':
      "The Moon's feelings meet Neptune's ocean, deepening your sensitivity, imagination, and capacity for compassion. You pick up the unspoken currents around you with this pairing — the angle governs whether that's tender intuition or emotional overwhelm.",
    'Moon-Pluto':
      "The Moon and Pluto plunge your emotions to their depths, giving your feelings intensity, staying power, and a talent for transformation. Nothing stays shallow here; the angle shapes whether that depth feels healing or overwhelming.",
    'Moon-Saturn':
      "Saturn brings gravity to the Moon, lending your emotions seriousness, loyalty, and a protective self-restraint. You take feelings and commitments to heart with this pairing — the angle sets whether that reads as steadfast or guarded.",
    'Moon-Sun':
      "The Moon and Sun weave who you are together with what you need, your outer will meeting your inner instinct. When they connect, identity and emotion move in step; the angle decides how naturally the two find their rhythm.",
    'Moon-Uranus':
      "The Moon meets Uranus and your emotional life turns quicksilver — spontaneous, independent, and allergic to being fenced in. Feelings arrive suddenly and honestly here; the angle governs whether that's refreshing freedom or restless unpredictability.",
    'Moon-Venus':
      "The Moon and Venus are among the chart's softest pairings, blending emotional warmth with affection, beauty, and a gift for making others feel cared for. Tenderness comes naturally here — the angle just shapes how freely it's given and received.",
    'Neptune-Pluto':
      "Neptune and Pluto work on the deepest, slowest levels, blending spiritual longing with the power to transform from the roots up. This is a generational undercurrent as much as a personal one; where it touches your chart, it stirs profound, quiet change.",
    'Neptune-Saturn':
      "Saturn and Neptune marry the dream to the blueprint — one imagines, the other insists it be made real. Balanced well, they let you build your ideals into something solid; the angle decides whether vision and reality reinforce or frustrate each other.",
    'Neptune-Sun':
      "Neptune veils your identity in imagination, sensitivity, and a longing for something greater than the everyday self. Inspiration and compassion light your core here — the angle shapes whether you feel quietly guided or a little unsure of who you are.",
    'Neptune-Uranus':
      "Neptune and Uranus mingle the visionary with the revolutionary, dissolving old structures while dreaming up what could replace them. This is a generational tide of awakening; in your chart it points toward where you sense the future stirring.",
    'Neptune-Venus':
      "Venus and Neptune spin love into something dreamy, idealised, and almost otherworldly, heightening romance, art, and compassion. This is enchantment itself — the angle decides whether that magic uplifts you or blurs the line between the beloved and the ideal.",
    'Pluto-Saturn':
      "Saturn and Pluto together are relentless — discipline meeting depth, endurance meeting the will to transform completely. This pairing rebuilds from the foundation up; the angle governs whether that power feels like hard-won mastery or crushing pressure.",
    'Pluto-Sun':
      "Pluto intensifies your very identity, giving you magnetism, willpower, and an instinct to reinvent yourself again and again. Personal power is the theme here — the angle colours whether you wield it with quiet confidence or wrestle with control.",
    'Pluto-Uranus':
      "Pluto and Uranus are the great disruptors, fusing the drive to transform with the shock of sudden change. Together they overturn whatever has grown stagnant; a generational force, it marks in your chart where you're called to break new ground.",
    'Pluto-Venus':
      "Venus and Pluto turn love into something profound and all-or-nothing, blending affection with depth, magnetism, and the power to be utterly changed by connection. Nothing stays casual here — the angle shapes whether that intensity deepens intimacy or tips toward obsession.",
    'Saturn-Sun':
      "Saturn brings discipline and structure to your core identity, asking you to earn your confidence through effort and time. Maturity and integrity are the reward here; the angle sets whether that responsibility steadies you or feels like a weight you must prove yourself against.",
    'Saturn-Uranus':
      "Saturn and Uranus stage the classic standoff between tradition and revolution — one preserves, the other breaks free. Held well, they let you innovate with staying power; the angle decides whether structure and freedom collaborate or collide.",
    'Saturn-Venus':
      "Saturn brings seriousness to Venus, grounding love and pleasure in loyalty, commitment, and the long view. Affection becomes durable and earned here — the angle governs whether that reads as steadfast devotion or a caution that holds warmth at arm's length.",
    'Sun-Uranus':
      "Uranus electrifies your identity with independence, originality, and a refusal to be anyone but yourself. You're wired for freedom and the unconventional here; the angle shapes whether that individuality feels liberating or restlessly rebellious.",
    'Sun-Venus':
      "The Sun and Venus warm your identity with charm, affection, and a genuine love of beauty and harmony. Grace and likeability come naturally with this pairing — the angle simply tunes how effortlessly your warmth shines through.",
    'Uranus-Venus':
      "Uranus and Venus bring a spark of the unexpected to love, drawing you toward excitement, freedom, and unconventional connection. Attraction arrives suddenly and thrives on space here; the angle decides whether that's exhilarating or hard to hold steady.",
  },
};
