import type { Planet, ZodiacSign } from '../types/astrology';

interface PlanetInSignInterp {
  core: string;
  strengths: string[];
  blindSpots: string[];
}

const interpretations: Record<string, PlanetInSignInterp> = {
  'Sun-Aries': {
    core: 'You lead with fire and instinct, moving through the world like someone who was born knowing how to begin things. There is a raw courage in your identity that others find both inspiring and intimidating. You are at your best when you have something to fight for.',
    strengths: ['Natural initiative and courage', 'Infectious enthusiasm', 'Fearless authenticity'],
    blindSpots: ['Impatience with slower-moving people', 'Mistaking aggression for assertiveness'],
  },
  'Sun-Taurus': {
    core: 'Your identity is rooted in what endures. You build your life slowly and deliberately, trusting the body and the senses over abstract ideas. There is a deep steadiness in you that becomes an anchor for everyone around you.',
    strengths: ['Remarkable patience and persistence', 'Strong aesthetic sensibility', 'Grounded reliability'],
    blindSpots: ['Stubbornness disguised as consistency', 'Resisting change long past its due date'],
  },
  'Sun-Gemini': {
    core: 'Your mind is a living, restless thing that needs constant stimulation and variety. You understand the world by naming it, questioning it, and then questioning your own answers. People are drawn to your wit, but few realize how deeply you actually think.',
    strengths: ['Quick adaptability', 'Gift for communication and connection', 'Intellectual curiosity that never fades'],
    blindSpots: ['Scattered energy across too many interests', 'Using humor to deflect from vulnerability'],
  },
  'Sun-Cancer': {
    core: 'You feel the world before you think about it, and your emotional intelligence is your greatest compass. Home, family, and belonging are not just preferences but core needs woven into your identity. Your sensitivity is not weakness; it is your superpower.',
    strengths: ['Profound emotional intuition', 'Fierce protectiveness of loved ones', 'Ability to create safety anywhere'],
    blindSpots: ['Taking things personally that are not about you', 'Retreating into your shell instead of communicating'],
  },
  'Sun-Leo': {
    core: 'You were born to shine, and when you dim your light to make others comfortable, everyone loses. Your warmth is genuine, your generosity is instinctive, and your need to be seen is not vanity but a deep desire to share your gifts with the world.',
    strengths: ['Magnetic presence and warmth', 'Creative self-expression', 'Generous spirit that uplifts others'],
    blindSpots: ['Needing external validation to feel worthy', 'Struggling when not in the spotlight'],
  },
  'Sun-Virgo': {
    core: 'You notice what others miss, and this gift for discernment shapes everything about how you move through the world. Your desire to improve things comes from genuine care, not criticism. You are quietly one of the most devoted people in any room.',
    strengths: ['Extraordinary attention to detail', 'Humble dedication to service', 'Practical problem-solving ability'],
    blindSpots: ['Perfectionism that leads to paralysis', 'Being harder on yourself than anyone else'],
  },
  'Sun-Libra': {
    core: 'You experience yourself most fully through your relationships and the art of creating harmony. Beauty, fairness, and balance are not superficial concerns for you but genuine guiding principles. You have a rare ability to see every side of a situation.',
    strengths: ['Natural diplomacy and grace', 'Deep appreciation for beauty and art', 'Gift for making others feel valued'],
    blindSpots: ['Indecisiveness from seeing all perspectives', 'Losing yourself in the desire to please'],
  },
  'Sun-Scorpio': {
    core: 'You live at a depth that most people are afraid to visit. Truth is your currency, and you would rather face something painful than live with a comfortable lie. Your intensity is not something to tone down; it is the engine of your transformation.',
    strengths: ['Unflinching emotional honesty', 'Powerful capacity for transformation', 'Fierce loyalty to those you trust'],
    blindSpots: ['Holding onto resentment as a form of control', 'Testing people before trusting them'],
  },
  'Sun-Sagittarius': {
    core: 'Your spirit is fundamentally oriented toward expansion, adventure, and meaning. You need to feel that life is going somewhere, that there is always a new horizon to chase. Your optimism is contagious, and your honesty, while sometimes blunt, is always refreshing.',
    strengths: ['Boundless optimism and enthusiasm', 'Natural philosophical insight', 'Ability to inspire others to dream bigger'],
    blindSpots: ['Restlessness that avoids commitment', 'Bluntness that lands as tactlessness'],
  },
  'Sun-Capricorn': {
    core: 'You understand that meaningful things take time, and you are willing to do the work that others are not. There is an old soul quality to you, a quiet authority that has been there since childhood. You earn your place in the world, and you know it.',
    strengths: ['Disciplined ambition', 'Quiet resilience under pressure', 'Strategic long-term vision'],
    blindSpots: ['Equating your worth with your achievements', 'Difficulty letting yourself rest or play'],
  },
  'Sun-Aquarius': {
    core: 'You see the world not as it is but as it could be, and this visionary quality sets you apart from the crowd even when you desperately want to belong to it. Your independence is not aloofness; it is the price of thinking differently.',
    strengths: ['Original and progressive thinking', 'Deep commitment to fairness', 'Ability to befriend anyone'],
    blindSpots: ['Intellectualizing emotions instead of feeling them', 'Detaching when things get too intimate'],
  },
  'Sun-Pisces': {
    core: 'You absorb the world like a sponge, feeling the joy and pain of everyone around you as if it were your own. Your imagination is vast and your compassion is boundless, but you need to learn that you cannot save everyone without first saving yourself.',
    strengths: ['Extraordinary empathy and compassion', 'Rich creative imagination', 'Spiritual depth and intuition'],
    blindSpots: ['Difficulty maintaining boundaries', 'Escapism when reality becomes overwhelming'],
  },

  'Moon-Aries': {
    core: 'Your emotional world moves fast. You feel things intensely and immediately, and you need to act on your feelings to process them. Sitting with difficult emotions is your biggest challenge, but your emotional courage is unmatched.',
    strengths: ['Quick emotional recovery', 'Brave in expressing feelings', 'Instinctive protectiveness'],
    blindSpots: ['Reacting before fully understanding what you feel', 'Impatience with emotional complexity'],
  },
  'Moon-Taurus': {
    core: 'Emotional security is everything to you, and you find it through comfort, routine, and physical presence. You process feelings slowly and deeply, like roots growing underground. Once you feel safe, you are the most nurturing presence imaginable.',
    strengths: ['Deeply calming presence', 'Emotional steadfastness', 'Ability to create comfort and warmth'],
    blindSpots: ['Emotional resistance to necessary change', 'Comfort-seeking as avoidance'],
  },
  'Moon-Gemini': {
    core: 'You process emotions by talking about them, thinking about them, and sometimes by talking about thinking about them. Your emotional life is linked to your mental life in a way that can be both a gift and a complication. You need variety in how you nurture yourself.',
    strengths: ['Emotional versatility and adaptability', 'Ability to articulate complex feelings', 'Lightness that helps others through heavy moments'],
    blindSpots: ['Rationalizing feelings instead of truly feeling them', 'Emotional restlessness and inconsistency'],
  },
  'Moon-Cancer': {
    core: 'Your emotional world is your homeland, and you navigate it with a fluency that others can barely comprehend. You feel the moods of a room the moment you walk in, and you carry the emotional history of your family in your bones.',
    strengths: ['Profound emotional intelligence', 'Natural nurturing instinct', 'Deep memory and sentimental loyalty'],
    blindSpots: ['Moodiness that confuses those around you', 'Clinging to emotional patterns from childhood'],
  },
  'Moon-Leo': {
    core: 'You need to feel special, admired, and emotionally celebrated, and there is nothing wrong with that. Your emotional generosity is enormous; you love with your whole chest. When you feel appreciated, you become the warmest light in the room.',
    strengths: ['Warm and generous emotional expression', 'Loyalty that never wavers', 'Ability to make others feel like royalty'],
    blindSpots: ['Taking emotional slights very personally', 'Needing constant reassurance of love'],
  },
  'Moon-Virgo': {
    core: 'You show love through acts of service and quiet attentiveness. Your emotional world is organized around being useful, and you process feelings by analyzing them carefully. You care deeply but often struggle to let yourself receive the same care you give.',
    strengths: ['Thoughtful emotional support', 'Calm under emotional pressure', 'Devotion expressed through daily acts'],
    blindSpots: ['Self-criticism when emotions feel messy', 'Difficulty accepting care from others'],
  },
  'Moon-Libra': {
    core: 'Harmony in your relationships is not a luxury; it is an emotional need. You feel most at peace when the people around you are at peace, which can lead you to absorb conflict that is not yours to carry. Your emotional grace is genuine and rare.',
    strengths: ['Emotional diplomacy and fairness', 'Ability to see both sides in conflicts', 'Creating beauty as emotional nourishment'],
    blindSpots: ['Suppressing your own needs for harmony', 'Codependency disguised as love'],
  },
  'Moon-Scorpio': {
    core: 'Your feelings run deeper than most people will ever understand. You experience emotions as transformative forces, and you are not interested in surface-level connections. Trust is sacred to you, and betrayal is the one wound you carry longest.',
    strengths: ['Emotional depth and fearlessness', 'Powerful instincts about people', 'Capacity for total emotional commitment'],
    blindSpots: ['Jealousy and possessiveness in love', 'Difficulty letting go of past emotional wounds'],
  },
  'Moon-Sagittarius': {
    core: 'You need emotional freedom the way others need security. Your feelings are big, expansive, and optimistic, and you process them best through movement, travel, and laughter. You heal by seeking meaning in your pain rather than dwelling in it.',
    strengths: ['Emotional resilience and optimism', 'Ability to find humor in difficult times', 'Generous and open-hearted spirit'],
    blindSpots: ['Running from heavy emotions', 'Dismissing others feelings as overreactions'],
  },
  'Moon-Capricorn': {
    core: 'You learned early that emotions must be managed, and this has given you a remarkable composure that others admire and sometimes misread as coldness. Underneath that composed exterior lives a deeply feeling person who simply needs to feel safe before opening up.',
    strengths: ['Emotional maturity beyond your years', 'Reliability in crisis', 'Quiet depth of feeling'],
    blindSpots: ['Suppressing emotions until they erupt', 'Equating vulnerability with weakness'],
  },
  'Moon-Aquarius': {
    core: 'You process feelings through the lens of ideas and ideals, which gives you a unique emotional perspective but can also distance you from the raw experience of feeling. You care deeply about humanity while sometimes struggling with personal intimacy.',
    strengths: ['Emotional objectivity in crisis', 'Compassion for collective suffering', 'Freedom-respecting approach to love'],
    blindSpots: ['Intellectualizing emotions to avoid pain', 'Feeling alien in emotionally intense situations'],
  },
  'Moon-Pisces': {
    core: 'Your emotional boundaries are thin, and you absorb the feelings of everyone around you like a psychic sponge. This makes you extraordinarily compassionate but also vulnerable to emotional overwhelm. You need solitude and creative outlets to process what you carry.',
    strengths: ['Boundless empathy and compassion', 'Rich inner emotional world', 'Healing presence for others'],
    blindSpots: ['Difficulty distinguishing your feelings from others', 'Emotional escapism through fantasy or substances'],
  },

  'Rising-Aries': {
    core: 'You enter every room like you have somewhere important to be. Your first instinct is to act, to move, to lead, and people immediately sense your directness. Life keeps asking you to be brave, and you keep saying yes.',
    strengths: ['Commanding first impression', 'Quick to take initiative', 'Energizing presence'],
    blindSpots: ['Coming on too strong in new situations', 'Impatience with social pleasantries'],
  },
  'Rising-Taurus': {
    core: 'You move through the world with a calm, grounded steadiness that puts others at ease immediately. People sense your reliability before you even speak. Life keeps bringing you lessons about what truly holds value and what is just noise.',
    strengths: ['Naturally calming presence', 'Approachable and trustworthy demeanor', 'Strong sense of personal style'],
    blindSpots: ['Appearing resistant to new ideas', 'Slowness to adapt to new environments'],
  },
  'Rising-Gemini': {
    core: 'You are perpetually curious, and people sense your quick mind and versatile energy immediately upon meeting you. You adapt to social situations like water adapting to its container. Life keeps teaching you that depth and breadth can coexist.',
    strengths: ['Witty and engaging first impression', 'Social adaptability', 'Youthful energy at any age'],
    blindSpots: ['Appearing scattered or unreliable', 'Nervousness that masks itself as chattiness'],
  },
  'Rising-Cancer': {
    core: 'People sense your warmth and sensitivity from the first moment. You approach the world with your guard subtly up, testing the emotional waters before fully arriving. Life keeps teaching you that vulnerability is the doorway to the belonging you seek.',
    strengths: ['Warm and approachable energy', 'Intuitive read on new people', 'Naturally nurturing presence'],
    blindSpots: ['Withdrawing at the first sign of emotional risk', 'Resting face that reveals every mood'],
  },
  'Rising-Leo': {
    core: 'You walk into a room and the room notices. There is a natural radiance to your presence that draws attention whether you seek it or not. Life keeps inviting you to step into your full self-expression without apology.',
    strengths: ['Magnetic and confident presence', 'Natural ability to command attention', 'Warmth that puts people at ease'],
    blindSpots: ['Overidentifying with how others perceive you', 'Struggling when you do not receive immediate recognition'],
  },
  'Rising-Virgo': {
    core: 'You meet the world with a quiet, observant intelligence that takes everything in before responding. People sense your competence and your modesty simultaneously. Life keeps asking you to trust that you are enough exactly as you are.',
    strengths: ['Thoughtful and composed first impression', 'Keen observational skills', 'Helpful and approachable energy'],
    blindSpots: ['Coming across as overly critical or reserved', 'Anxiety that manifests as over-preparation'],
  },
  'Rising-Libra': {
    core: 'Grace is your default setting. You approach the world with charm, fairness, and an instinct for beauty that shapes everything from your appearance to your social style. Life keeps teaching you that real harmony includes your own needs.',
    strengths: ['Effortless social grace', 'Attractive and harmonious presentation', 'Natural mediation skills'],
    blindSpots: ['People-pleasing as a first response', 'Indecisiveness about your own path'],
  },
  'Rising-Scorpio': {
    core: 'You have an intensity that people feel before you say a single word. Your gaze is penetrating, your presence is magnetic, and you do not do anything halfway. Life keeps bringing you into situations that demand transformation and radical honesty.',
    strengths: ['Powerful and memorable presence', 'Ability to see through pretense', 'Magnetic intensity'],
    blindSpots: ['Intimidating people unintentionally', 'Guardedness that keeps connection at arm length'],
  },
  'Rising-Sagittarius': {
    core: 'You bring an infectious optimism and openness to every new encounter. People sense your adventurous spirit and your honesty immediately. Life keeps expanding your horizons and asking you to share what you discover with others.',
    strengths: ['Enthusiastic and open energy', 'Natural storytelling ability', 'Approachable warmth and humor'],
    blindSpots: ['Over-promising in the excitement of the moment', 'Restlessness that reads as disinterest'],
  },
  'Rising-Capricorn': {
    core: 'You present yourself to the world with a composed, ambitious seriousness that commands respect. People sense your maturity and your quiet determination. Life keeps teaching you that success means nothing if you forget to enjoy the climb.',
    strengths: ['Authoritative and trustworthy presence', 'Natural leadership energy', 'Polished self-presentation'],
    blindSpots: ['Appearing cold or unapproachable', 'Difficulty relaxing in casual settings'],
  },
  'Rising-Aquarius': {
    core: 'There is something unmistakably unique about how you present yourself, and people notice it immediately. You approach the world as an observer and a questioner, never quite fitting into any single box. Life keeps asking you to honor your individuality without isolating yourself.',
    strengths: ['Intriguingly unique presence', 'Open-minded approach to everyone', 'Progressive and forward-thinking energy'],
    blindSpots: ['Emotional detachment in first impressions', 'Rebelliousness for its own sake'],
  },
  'Rising-Pisces': {
    core: 'You meet the world with a soft, dreamy openness that makes people feel instantly seen and accepted. There is something ethereal about your presence, as if you are tuned into a frequency most people cannot hear. Life keeps teaching you how to stay grounded while remaining open.',
    strengths: ['Gentle and empathetic presence', 'Artistic and imaginative first impression', 'Ability to make anyone feel safe'],
    blindSpots: ['Absorbing the energy of every environment', 'Appearing vague or unfocused'],
  },

  'Mercury-Aries': {
    core: 'Your mind works at lightning speed, and your thoughts come out before you have time to edit them. You think in bold strokes rather than fine details, and your communication style is refreshingly direct. You are at your sharpest in debates and brainstorms.',
    strengths: ['Quick decisive thinking', 'Bold communication style', 'Ability to cut through overthinking'],
    blindSpots: ['Speaking before fully thinking', 'Dismissing ideas that take time to develop'],
  },
  'Mercury-Taurus': {
    core: 'You think slowly and deliberately, and your ideas are all the more solid for it. Your mind gravitates toward practical, tangible solutions, and you have a gift for making complex things simple. Once you have formed an opinion, it takes a lot to change it.',
    strengths: ['Grounded and practical thinking', 'Clear and steady communication', 'Excellent follow-through on ideas'],
    blindSpots: ['Mental stubbornness', 'Slowness to adapt to new information'],
  },
  'Mercury-Gemini': {
    core: 'Your mind is a perpetual motion machine, endlessly curious, constantly making connections between seemingly unrelated ideas. You learn by talking, asking, and exploring, and you communicate with a sparkle that keeps people engaged. Information is your playground.',
    strengths: ['Brilliant conversationalist', 'Rapid information processing', 'Versatile and curious mind'],
    blindSpots: ['Superficial knowledge across too many subjects', 'Difficulty focusing on one topic deeply'],
  },
  'Mercury-Cancer': {
    core: 'You think with your feelings, and your memory is tied to emotion in a way that makes your recall vivid and personal. Your communication style is intuitive and nurturing, and you have a gift for saying exactly what someone needs to hear in a difficult moment.',
    strengths: ['Emotionally intelligent communication', 'Strong emotional memory', 'Intuitive understanding of subtext'],
    blindSpots: ['Thinking clouded by mood swings', 'Difficulty being objective in emotional situations'],
  },
  'Mercury-Leo': {
    core: 'You think in stories and you communicate with flair. Your ideas are bold and your delivery is theatrical, which makes you a natural presenter and storyteller. You need your ideas to be heard and acknowledged to feel intellectually alive.',
    strengths: ['Compelling and dramatic communication', 'Creative thinking', 'Natural ability to inspire through words'],
    blindSpots: ['Taking intellectual disagreement personally', 'Overshadowing others ideas in conversation'],
  },
  'Mercury-Virgo': {
    core: 'Your mind is a precision instrument, capable of analyzing and organizing information with extraordinary skill. You notice errors and inconsistencies that others miss entirely, and you communicate with clarity and specificity. Your standards for accuracy are exceptionally high.',
    strengths: ['Exceptional analytical ability', 'Clear and precise communication', 'Talent for editing and improving'],
    blindSpots: ['Analysis paralysis', 'Overthinking that delays action'],
  },
  'Mercury-Libra': {
    core: 'You think in terms of balance, fairness, and how ideas relate to each other. Your communication style is diplomatic and measured, and you have a natural ability to see multiple sides of any argument. You genuinely enjoy the art of conversation and debate.',
    strengths: ['Diplomatic communication', 'Ability to mediate and find compromise', 'Elegant and persuasive reasoning'],
    blindSpots: ['Indecisiveness from weighing too many options', 'Avoiding confrontation in intellectual disputes'],
  },
  'Mercury-Scorpio': {
    core: 'Your mind goes straight to the hidden truth beneath the surface. You are a natural researcher, investigator, and strategist, and your communication carries a penetrating intensity. You do not do small talk; you want the real conversation.',
    strengths: ['Penetrating insight', 'Strategic and resourceful thinking', 'Ability to uncover hidden information'],
    blindSpots: ['Suspicion that borders on paranoia', 'Using words as weapons when threatened'],
  },
  'Mercury-Sagittarius': {
    core: 'You think in big pictures and grand philosophies. Your mind craves meaning and your communication style is enthusiastic and expansive. You are the one who asks the question that changes the entire direction of the conversation.',
    strengths: ['Visionary thinking', 'Inspiring and enthusiastic communication', 'Ability to synthesize broad concepts'],
    blindSpots: ['Overlooking important details', 'Exaggeration in service of a good story'],
  },
  'Mercury-Capricorn': {
    core: 'Your mind is structured, strategic, and oriented toward results. You do not waste words, and when you speak, people listen because they know you have thought it through. Your intellectual authority comes from discipline, not flash.',
    strengths: ['Structured and strategic thinking', 'Authoritative communication', 'Ability to plan long-term'],
    blindSpots: ['Dismissing ideas that seem impractical', 'Pessimistic thinking patterns'],
  },
  'Mercury-Aquarius': {
    core: 'You think in ways that genuinely surprise people. Your mind operates outside conventional frameworks, making unexpected connections and arriving at original conclusions. You communicate your ideas with conviction, even when they challenge the status quo.',
    strengths: ['Innovative and original thinking', 'Ability to think systemically', 'Unbiased intellectual openness'],
    blindSpots: ['Intellectual contrarianism for its own sake', 'Difficulty communicating ideas in accessible ways'],
  },
  'Mercury-Pisces': {
    core: 'Your mind works through images, feelings, and intuition rather than linear logic. You absorb information holistically and often know things without being able to explain how. Your communication is poetic, metaphorical, and deeply empathetic.',
    strengths: ['Intuitive and creative thinking', 'Poetic communication', 'Ability to understand unspoken feelings'],
    blindSpots: ['Difficulty with precise or technical communication', 'Absorbing others thoughts as your own'],
  },

  'Venus-Aries': {
    core: 'You love with urgency and passion, and you fall fast when someone catches your attention. You are drawn to bold, independent partners and you need excitement and novelty to stay engaged. In love, you are refreshingly honest about what you want.',
    strengths: ['Passionate and exciting lover', 'Direct about desires', 'Brave in pursuing love'],
    blindSpots: ['Losing interest after the chase', 'Confusing intensity with depth'],
  },
  'Venus-Taurus': {
    core: 'Love for you is a sensory experience, built on touch, shared meals, beauty, and presence. You are deeply loyal and you build relationships that last because you invest in them with patience and devotion. You know that real love is grown, not found.',
    strengths: ['Deeply loyal and devoted partner', 'Gift for creating beauty and comfort', 'Sensual and present in love'],
    blindSpots: ['Possessiveness in relationships', 'Staying in comfortable but stagnant situations'],
  },
  'Venus-Gemini': {
    core: 'You fall in love with minds first, and you need intellectual stimulation as much as emotional connection. Flirtation is an art form for you, and your charm is versatile and playful. You need a partner who can be your lover and your best friend.',
    strengths: ['Witty and charming partner', 'Keeps relationships fresh and interesting', 'Excellent communicator in love'],
    blindSpots: ['Difficulty with emotional depth in early relationships', 'Flirtatiousness that creates insecurity'],
  },
  'Venus-Cancer': {
    core: 'You love with your whole heart and you need emotional safety to truly open up. Your nurturing instinct extends to everyone you care about, and you express love through caretaking and emotional attunement. Home is where your love lives.',
    strengths: ['Deeply nurturing and devoted', 'Emotionally attuned to partners needs', 'Creates a loving home environment'],
    blindSpots: ['Clinginess when feeling insecure', 'Mothering partners instead of partnering with them'],
  },
  'Venus-Leo': {
    core: 'You love like it is a grand production, with big gestures, fierce loyalty, and unwavering devotion. You need to feel adored and special in your relationships, and in return, you make your partner feel like the center of the universe.',
    strengths: ['Generous and warm-hearted lover', 'Unwavering loyalty', 'Makes love feel like an adventure'],
    blindSpots: ['Need for constant admiration', 'Dramatic reactions to feeling unappreciated'],
  },
  'Venus-Virgo': {
    core: 'You show love through the small things: remembering preferences, helping with tasks, noticing when something is wrong before anyone says a word. Your love is humble and devoted, expressed through daily acts of care rather than grand gestures.',
    strengths: ['Thoughtful and attentive partner', 'Devoted to improving the relationship', 'Reliable and consistent in love'],
    blindSpots: ['Criticism disguised as help', 'Difficulty accepting imperfection in partners'],
  },
  'Venus-Libra': {
    core: 'Partnership is your natural state. You are at your most alive when you are sharing your life with someone, and you bring grace, fairness, and beauty to every relationship. You have an innate understanding of what makes relationships work.',
    strengths: ['Natural relationship harmony', 'Romantic and attentive partner', 'Fair and balanced in love'],
    blindSpots: ['Losing identity in relationships', 'Avoiding necessary conflict to keep the peace'],
  },
  'Venus-Scorpio': {
    core: 'You love with an intensity that can be overwhelming for those who are not ready for it. You want all or nothing, total emotional and physical merging with your partner. Trust is your love language, and once given, your devotion is absolute.',
    strengths: ['Deeply passionate and committed', 'Emotionally brave in love', 'Transformative intimacy'],
    blindSpots: ['Jealousy and control in relationships', 'Testing partners loyalty'],
  },
  'Venus-Sagittarius': {
    core: 'You need love to feel like an adventure, not a cage. You are drawn to partners who expand your world, challenge your beliefs, and are willing to explore alongside you. Your love is generous, honest, and delightfully spontaneous.',
    strengths: ['Adventurous and fun-loving partner', 'Honest and open in love', 'Generous with freedom and trust'],
    blindSpots: ['Fear of commitment and routine', 'Tactless honesty that hurts partners'],
  },
  'Venus-Capricorn': {
    core: 'You take love seriously and you build relationships with the same care and ambition you bring to everything else. You are not interested in flings; you want a partnership that stands the test of time. Your love deepens steadily with the years.',
    strengths: ['Loyal and committed partner', 'Builds lasting relationship foundations', 'Shows love through actions and stability'],
    blindSpots: ['Emotional reserve that feels like distance', 'Prioritizing achievement over connection'],
  },
  'Venus-Aquarius': {
    core: 'You love in unconventional ways and you need a partner who respects your independence above all. Friendship is the foundation of your romantic relationships, and you are drawn to people who are different, original, and unafraid to be themselves.',
    strengths: ['Respects partners individuality', 'Open-minded and accepting in love', 'Values friendship within romance'],
    blindSpots: ['Emotional detachment in intimate moments', 'Intellectualizing love instead of feeling it'],
  },
  'Venus-Pisces': {
    core: 'You love without boundaries, with a tenderness and compassion that can feel almost otherworldly. You see the best in your partners and you give yourself completely to love. Your romantic nature is one of the most beautiful and vulnerable in the zodiac.',
    strengths: ['Unconditional and compassionate love', 'Deep romantic imagination', 'Selfless devotion to partners'],
    blindSpots: ['Idealizing partners beyond reality', 'Sacrificing yourself to save a relationship'],
  },

  'Mars-Aries': {
    core: 'Your drive is raw, instinctive, and immediate. When you want something, you go after it without hesitation, and your competitive fire is a force of nature. You are at your most powerful when you have a clear target and the freedom to charge.',
    strengths: ['Explosive initiative and drive', 'Fearless in competition', 'Quick and decisive action'],
    blindSpots: ['Aggression that burns bridges', 'Starting things you do not finish'],
  },
  'Mars-Taurus': {
    core: 'Your drive is slow-building but unstoppable once it gets moving. You pursue your goals with a patient, relentless determination that outlasts everyone else. You will not be rushed, and once you commit, nothing short of an earthquake will move you.',
    strengths: ['Incredible stamina and persistence', 'Calm under pressure', 'Steady and reliable effort'],
    blindSpots: ['Stubbornness that prevents adaptation', 'Slow to act when urgency is needed'],
  },
  'Mars-Gemini': {
    core: 'Your energy is mental and versatile, expressed through words, ideas, and rapid multitasking. You fight with your intellect and you pursue your goals through communication and cleverness. You need variety in how you channel your energy.',
    strengths: ['Quick-witted under pressure', 'Versatile approach to challenges', 'Effective communicator in conflict'],
    blindSpots: ['Scattered effort across too many goals', 'Using words to avoid direct action'],
  },
  'Mars-Cancer': {
    core: 'Your drive is deeply emotional and protective. You are at your most powerful when you are defending someone you love or fighting for your sense of security. Your energy waxes and wanes with your moods, but when fully engaged, your tenacity is formidable.',
    strengths: ['Fierce protectiveness', 'Emotional stamina', 'Intuitive timing in action'],
    blindSpots: ['Passive-aggressive tendencies', 'Emotional volatility that disrupts focus'],
  },
  'Mars-Leo': {
    core: 'You pursue your ambitions with dramatic flair and unshakeable confidence. Your competitive drive is tied to your sense of pride and self-expression, and you perform best when people are watching. You were born to lead and inspire through action.',
    strengths: ['Confident and charismatic drive', 'Natural leadership in action', 'Courage that inspires others'],
    blindSpots: ['Ego-driven decisions', 'Difficulty accepting defeat gracefully'],
  },
  'Mars-Virgo': {
    core: 'Your drive is precise, methodical, and efficient. You pursue your goals through careful planning and flawless execution, and you channel your energy into being genuinely useful. Your work ethic is quietly extraordinary.',
    strengths: ['Meticulous and efficient effort', 'Disciplined work ethic', 'Problem-solving under pressure'],
    blindSpots: ['Perfectionism that slows progress', 'Critical of others methods and effort'],
  },
  'Mars-Libra': {
    core: 'You channel your energy into creating fairness, beauty, and harmony. You fight for justice and you pursue your goals through collaboration and charm. Direct confrontation is uncomfortable for you, so you achieve your aims through strategy and persuasion.',
    strengths: ['Diplomatic approach to conflict', 'Strategic and fair-minded action', 'Ability to motivate through charm'],
    blindSpots: ['Indecisiveness that stalls action', 'Passive avoidance of necessary confrontation'],
  },
  'Mars-Scorpio': {
    core: 'Your drive is intense, strategic, and relentless. When you set your sights on something, you pursue it with a laser focus that can be intimidating. You are not afraid of power, and you understand that real strength is quiet and controlled.',
    strengths: ['Intense focus and willpower', 'Strategic and resourceful action', 'Emotional power in pursuit of goals'],
    blindSpots: ['Vengeful tendencies when crossed', 'Obsessive pursuit that ignores cost'],
  },
  'Mars-Sagittarius': {
    core: 'Your energy is expansive, adventurous, and guided by a sense of purpose. You fight for your beliefs and you pursue goals that carry meaning beyond personal gain. Your enthusiasm is contagious and your courage knows few limits.',
    strengths: ['Adventurous and bold action', 'Enthusiastic pursuit of goals', 'Moral courage and conviction'],
    blindSpots: ['Overcommitting to too many ventures', 'Recklessness disguised as bravery'],
  },
  'Mars-Capricorn': {
    core: 'Your drive is disciplined, ambitious, and strategically focused on long-term success. You do not waste energy on things that will not get results, and your ability to work tirelessly toward your goals is one of your greatest assets.',
    strengths: ['Strategic and disciplined ambition', 'Exceptional endurance', 'Calm authority in action'],
    blindSpots: ['Ruthlessness in pursuit of goals', 'Suppressing personal needs for achievement'],
  },
  'Mars-Aquarius': {
    core: 'You channel your energy into innovation, rebellion, and collective progress. You fight for causes bigger than yourself and you pursue goals in unconventional ways. Your independence in action is fierce and non-negotiable.',
    strengths: ['Innovative approach to challenges', 'Fights for collective good', 'Independent and original action'],
    blindSpots: ['Contrarian actions that isolate you', 'Emotional detachment from personal drive'],
  },
  'Mars-Pisces': {
    core: 'Your drive is fluid, intuitive, and guided by inspiration rather than logic. You are most motivated when you are connected to a creative or spiritual purpose, and your energy works best when you surrender to flow rather than forcing outcomes.',
    strengths: ['Creative and inspired action', 'Compassionate motivation', 'Adaptable energy'],
    blindSpots: ['Difficulty with direct confrontation', 'Passive approach when assertiveness is needed'],
  },
};

export function getPlanetInSign(planet: Planet | 'Rising', sign: ZodiacSign): PlanetInSignInterp | null {
  return interpretations[`${planet}-${sign}`] || null;
}
