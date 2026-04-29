// Crystals Learn Hub
// Source tradition: Robert Simmons (Book of Stones), Judy Hall (Crystal Bible),
// Cassandra Eason (New Encyclopedia of Magical Crystals).
// Mohs hardness values follow standard mineralogical references.

export type CrystalCategory =
  | 'love'
  | 'protection'
  | 'abundance'
  | 'clarity'
  | 'healing'
  | 'spirituality'
  | 'grounding';

export type ChakraName =
  | 'Root'
  | 'Sacral'
  | 'Solar Plexus'
  | 'Heart'
  | 'Throat'
  | 'Third Eye'
  | 'Crown';

export interface CrystalEntry {
  slug: string;
  name: string;
  category: CrystalCategory;
  hardness: number;
  zodiac: string[];
  chakras: ChakraName[];
  element: 'Fire' | 'Earth' | 'Air' | 'Water' | 'Spirit';
  color: string;
  shortDescription: string;
  longDescription: string;
  keywords: string[];
  metaphysicalProperties: string;
  inLove: string;
  inHealing: string;
  inSpirituality: string;
  howToUse: string[];
  cleansingMethods: string[];
  pairsWith: string[];
  tarotConnection: string;
  faqs: Array<{ q: string; a: string }>;
  relatedEntries: string[];
}

export const crystalEntries: CrystalEntry[] = [
  // =====================================================================
  // LOVE
  // =====================================================================
  {
    slug: 'rose-quartz',
    name: 'Rose Quartz',
    category: 'love',
    hardness: 7,
    zodiac: ['Taurus', 'Libra'],
    chakras: ['Heart'],
    element: 'Water',
    color: 'Pale pink to dusky rose',
    shortDescription:
      'A pink variety of macrocrystalline quartz long associated with the heart chakra and the cultivation of unconditional love.',
    longDescription:
      'Rose quartz is a translucent to opaque pink quartz coloured by trace amounts of titanium, manganese, or microscopic dumortierite inclusions. It has been used as an amulet of love and beauty since at least 600 BCE, with Roman, Egyptian, and Mesopotamian sources referencing pink quartz beads. Within the Western metaphysical tradition codified by Judy Hall and Melody, rose quartz is considered the principal heart chakra stone. It is described as a gentle but persistent radiator of soft pink light, dissolving emotional armour and inviting compassion. Practitioners often place it in the bedroom or hold it during grief work, and it is the canonical stone given to those learning to love themselves.',
    keywords: ['unconditional love', 'self-love', 'compassion', 'forgiveness', 'gentleness'],
    metaphysicalProperties:
      'Rose quartz is held to open and soothe the heart chakra, releasing stored grief and resentment. It is considered a stone of emotional repair, supporting reconciliation, the dissolution of old wounds, and the slow rebuilding of trust. Cassandra Eason calls it the great healer of romantic disappointment.',
    inLove:
      'Traditionally placed under the pillow to attract a tender partner or beside a photograph to soften an argument. It is recommended for those recovering from heartbreak more than for those seeking passion.',
    inHealing:
      'Folk practice associates rose quartz with the physical heart, circulation, and the chest area, and it is commonly used in grief support and after surgery as an emotional comfort stone.',
    inSpirituality:
      'Considered a doorway to the higher heart and to the Mother archetype across many traditions. It is used in self-forgiveness rituals and in meditations on universal compassion.',
    howToUse: [
      'Hold over the heart for ten to twenty minutes during meditation',
      'Place a piece on the bedside table to support emotional rest',
      'Wear as a pendant near the sternum for daily heart support',
      'Add to a bath with sea salt for emotional cleansing',
      'Place on a photograph during forgiveness work',
      'Carry a tumbled stone in the pocket during difficult conversations',
    ],
    cleansingMethods: [
      'Moonlight, especially the full moon, is the traditional cleanse',
      'Running water for one to two minutes (rose quartz is water safe)',
      'Smoke from white sage, rosemary, or mugwort',
      'Sound bath using a singing bowl or tuning fork',
      'Bury overnight in dry rose petals',
    ],
    pairsWith: ['rhodonite', 'rhodochrosite', 'amethyst', 'green-aventurine', 'clear-quartz'],
    tarotConnection:
      'Rose quartz resonates strongly with The Empress, the card of fertile, unconditional love and natural abundance. It is also called upon when working with the Two of Cups for partnership and the Six of Cups for healing childhood memories of love.',
    faqs: [
      {
        q: 'Does rose quartz fade in sunlight?',
        a: 'Yes. Prolonged direct sunlight can cause the pink colour to lighten because the colour centres are unstable to UV. Cleanse it in moonlight or indirect light instead.',
      },
      {
        q: 'Can rose quartz get wet?',
        a: 'Brief contact with water is fine because quartz is hardness 7 and not water soluble, but avoid long soaks in salt water as the salt can pit the surface over time.',
      },
      {
        q: 'Is rose quartz only for romantic love?',
        a: 'No. The tradition emphasises self-love, parental love, and friendship at least as much as romance. It is often called the stone of universal love.',
      },
      {
        q: 'What is the difference between rose quartz and pink quartz?',
        a: 'Rose quartz is the common massive variety. True pink quartz is a rarer crystalline form that fades quickly and is mostly a collector specimen.',
      },
    ],
    relatedEntries: ['rhodonite', 'rhodochrosite', 'amethyst'],
  },
  {
    slug: 'rhodonite',
    name: 'Rhodonite',
    category: 'love',
    hardness: 6,
    zodiac: ['Taurus'],
    chakras: ['Heart', 'Root'],
    element: 'Fire',
    color: 'Pink to rose red with black manganese oxide veining',
    shortDescription:
      'A manganese inosilicate prized for emotional first aid, forgiveness, and the recovery of self after betrayal.',
    longDescription:
      'Rhodonite is a manganese silicate (MnSiO3) named from the Greek rhodon, rose, in 1819. It typically forms dense pink masses with characteristic black dendritic veins of manganese oxide. Russia, Australia, and Sweden produce notable specimens. Within metaphysical tradition rhodonite is treated as a rescue stone for the heart, applied where there has been shock, betrayal, or long held grief. Judy Hall describes it as a stone that anchors love in the body so that it is not merely an idea but a felt grounded reality. Because of the black manganese oxide it carries both heart energy and a steadying root pulse.',
    keywords: ['forgiveness', 'reconciliation', 'emotional balance', 'self-worth', 'first aid'],
    metaphysicalProperties:
      'Held to clear emotional wounds and scars from the heart chakra while drawing root chakra strength upward. It is regarded as a stone of compassionate boundaries, allowing love without self abandonment. Cassandra Eason associates it with rebuilding self trust after relational injury.',
    inLove:
      'Used for reconciliation after a fight, for releasing resentment, and for staying centred when an old partner reappears. Often given to someone leaving an unhealthy relationship.',
    inHealing:
      'Folk associations include mosquito bites, scarring, and emotional shock. It is commonly carried after bereavement or breakup as a steadying companion.',
    inSpirituality:
      'Used in shadow work, particularly the integration of anger and resentment. Considered a teacher of how to forgive without forgetting the lesson.',
    howToUse: [
      'Carry a tumbled stone after an argument until the charge subsides',
      'Place over the heart during meditation on a specific resentment',
      'Wear as a pendant during family gatherings that may be tense',
      'Lay on the solar plexus to settle anxiety about a relationship',
      'Hold while writing a letter you do not intend to send',
    ],
    cleansingMethods: [
      'Smoke cleanse with sage or palo santo',
      'Brief rinse in cool running water',
      'Place on a bed of hematite or selenite overnight',
      'Sound cleanse using a low pitched bell',
      'Earth burial for twenty four hours when heavily charged',
    ],
    pairsWith: ['rose-quartz', 'rhodochrosite', 'black-tourmaline', 'hematite', 'smoky-quartz'],
    tarotConnection:
      'Rhodonite aligns with the Three of Swords moving toward the Star, the journey through heartbreak into renewed faith. It is also useful with the Lovers reversed, supporting honest reckoning with relationship patterns.',
    faqs: [
      {
        q: 'Why does my rhodonite have black lines?',
        a: 'Those are veins of manganese oxide, usually pyrolusite. They are normal and considered part of the stone, often increasing its grounding action.',
      },
      {
        q: 'Is rhodonite the same as rhodochrosite?',
        a: 'No. Rhodonite is a silicate, harder, with black veins. Rhodochrosite is a softer carbonate with white banding.',
      },
      {
        q: 'Can rhodonite get wet?',
        a: 'Short rinses are fine. Avoid long salt water exposure because manganese minerals can dull over time.',
      },
      {
        q: 'How do I know it is real?',
        a: 'Real rhodonite is dense, cool to the touch, and the black veins follow natural fracture lines rather than printed patterns.',
      },
    ],
    relatedEntries: ['rose-quartz', 'rhodochrosite', 'black-tourmaline'],
  },
  {
    slug: 'rhodochrosite',
    name: 'Rhodochrosite',
    category: 'love',
    hardness: 4,
    zodiac: ['Leo', 'Scorpio'],
    chakras: ['Heart', 'Solar Plexus'],
    element: 'Fire',
    color: 'Raspberry pink with white banding',
    shortDescription:
      'A soft manganese carbonate considered the stone of the inner child and of remembering joy.',
    longDescription:
      'Rhodochrosite is manganese carbonate (MnCO3), forming in hydrothermal veins and stalactitic deposits. The famous banded specimens come from the Capillitas mine in Argentina and from Sweet Home Mine in Colorado. It is soft, only Mohs 4, and reacts to acid like other carbonates. Metaphysically it is described as the stone of the inner child and of joy reclaimed. Robert Simmons writes that rhodochrosite calls the lost soul fragments home, particularly those abandoned in childhood. It is a warmer and more vulnerable energy than rose quartz, often producing strong emotional release in sensitive users.',
    keywords: ['inner child', 'joy', 'soul retrieval', 'emotional healing', 'self-worth'],
    metaphysicalProperties:
      'Considered to bridge the heart and solar plexus, it is held to restore the natural confidence and joy of childhood. Practitioners use it for soul retrieval work and for healing the wounds that block adult intimacy.',
    inLove:
      'Used to attract a soulmate connection rather than a casual partner. Many traditions describe it as the stone of the deepest love that arrives once self love is in place.',
    inHealing:
      'Associated with the heart, lungs, and circulation in folk practice. More importantly it is used for emotional release work and for reconnecting with playfulness.',
    inSpirituality:
      'A primary stone for inner child meditation, dreamwork on early memories, and soul fragment recovery. It is often paired with journaling and somatic practice.',
    howToUse: [
      'Hold during a meditation visualising your younger self',
      'Place at the heart while listening to childhood music',
      'Set a tumbled stone on a journal during inner child writing',
      'Use as a touchstone during therapy sessions',
      'Carry in a soft pouch since it scratches easily',
    ],
    cleansingMethods: [
      'Smoke cleanse with sage or sweetgrass',
      'Brief moonlight bath, no direct sun',
      'Place on selenite overnight',
      'Sound cleanse with chimes',
      'Avoid water and salt because it is soft and acid sensitive',
    ],
    pairsWith: ['rose-quartz', 'rhodonite', 'citrine', 'amethyst', 'selenite'],
    tarotConnection:
      'Rhodochrosite resonates with the Six of Cups, the card of innocence, memory, and reunion with what was sweet. It also pairs with the Sun, the card of restored joy and visible vitality.',
    faqs: [
      {
        q: 'Why is my rhodochrosite scratched?',
        a: 'Mohs 4 is soft. Quartz dust, keys, or other crystals will mark it. Store it separately in a soft pouch.',
      },
      {
        q: 'Can I put it in water?',
        a: 'Avoid soaking. As a carbonate it can react slowly with acidic or salty water and lose polish.',
      },
      {
        q: 'What is the difference between banded and clear rhodochrosite?',
        a: 'The banded Argentine material is most common. Transparent red Colorado crystals are rare collector pieces with the same metaphysical reputation but a sharper energy.',
      },
      {
        q: 'Is rhodochrosite better than rose quartz for love?',
        a: 'Different work. Rose quartz soothes. Rhodochrosite excavates and reclaims. Many people use them in sequence.',
      },
    ],
    relatedEntries: ['rose-quartz', 'rhodonite', 'citrine'],
  },
  {
    slug: 'malachite',
    name: 'Malachite',
    category: 'love',
    hardness: 4,
    zodiac: ['Scorpio', 'Capricorn'],
    chakras: ['Heart', 'Solar Plexus'],
    element: 'Earth',
    color: 'Green with concentric banding from light to deep emerald',
    shortDescription:
      'A green copper carbonate of fierce, transformational heart energy, traditionally used as a stone of truth and protection in love.',
    longDescription:
      'Malachite is hydrated copper carbonate (Cu2CO3(OH)2), recognisable by its botryoidal banding and intense green hues. It has been mined for over six thousand years, used in Egyptian eye paint, Russian tsarist columns, and as a guardian amulet across cultures. Because it contains copper its dust is toxic and it should never be ingested or used in unsealed elixirs. Metaphysically malachite is treated as a stone of decisive transformation. Judy Hall calls it a strong cleanser and amplifier that pulls suppressed emotions to the surface. It is loved for its ability to expose what has been hidden, including in matters of the heart.',
    keywords: ['transformation', 'truth', 'protection', 'emotional risk', 'heart power'],
    metaphysicalProperties:
      'Considered to cleanse and activate the heart chakra forcefully and to draw out unbalanced energy. It is a mirror stone, bringing patterns to consciousness so they can change. Cassandra Eason calls it the stone of the conscious heart.',
    inLove:
      'Used to surface what is hidden in a relationship and to support breaking destructive patterns. Not a soothing stone, more a reckoning stone.',
    inHealing:
      'Folk associations include cramps, joints, and detoxification, though such uses are symbolic since the dust is toxic. Always use polished sealed pieces.',
    inSpirituality:
      'A stone of the bold heart that refuses to lie to itself. Used in shadow work, in setting boundaries, and in moving on from a long phase of life.',
    howToUse: [
      'Place a polished piece over the heart for short sessions, ten minutes maximum at first',
      'Carry for difficult conversations where truth is needed',
      'Set on a desk during decisions that require honesty',
      'Use as a meditation focus for life transitions',
      'Pair with rose quartz to soften its intensity',
    ],
    cleansingMethods: [
      'Smoke cleanse with sage or cedar',
      'Sound cleanse with bells or bowls',
      'Place on a piece of selenite overnight',
      'Brief earth burial in dry soil',
      'Avoid water, salt, and acids because of copper content',
    ],
    pairsWith: ['rose-quartz', 'rhodonite', 'green-aventurine', 'jade', 'black-tourmaline'],
    tarotConnection:
      'Malachite resonates with the Tower for sudden necessary breakage and with Death for deep transformation. In matters of love it pairs with the Three of Swords when the heart needs to face a truth before it can heal.',
    faqs: [
      {
        q: 'Is malachite toxic?',
        a: 'Raw malachite dust is toxic because of soluble copper. Polished sealed pieces are safe to handle. Wash hands after handling raw stone and never make ingestible elixirs.',
      },
      {
        q: 'Can malachite get wet?',
        a: 'No, prolonged water can release copper and dull the polish. Wipe with a dry cloth.',
      },
      {
        q: 'Why is malachite called a mirror stone?',
        a: 'Tradition holds that it reflects the holder back to themselves and exposes whatever is being avoided emotionally.',
      },
      {
        q: 'Is dyed howlite sold as malachite?',
        a: 'Dyed howlite and resin imitations exist. Real malachite has even temperature, true botryoidal banding, and weight from copper content.',
      },
    ],
    relatedEntries: ['rose-quartz', 'green-aventurine', 'jade'],
  },
  {
    slug: 'emerald',
    name: 'Emerald',
    category: 'love',
    hardness: 8,
    zodiac: ['Taurus', 'Cancer', 'Gemini'],
    chakras: ['Heart'],
    element: 'Earth',
    color: 'Green, from light to deep grass green',
    shortDescription:
      'The green gem variety of beryl, called the stone of successful love and the queen of the heart chakra.',
    longDescription:
      'Emerald is the green chromium and vanadium bearing variety of beryl, beryllium aluminium silicate. It has been treasured since the time of Cleopatra, who is recorded to have favoured Egyptian emeralds, and Mughal emperors who inscribed them with prayers. Mohs hardness is 7.5 to 8 but emeralds are typically included and brittle, hence careful handling. Metaphysically it has been called the stone of successful love by Judy Hall, signifying loyalty, friendship, and partnership built on truth. It is associated with the goddess Venus and with the planet Mercury in some Vedic traditions, where it is the gem of the planet Budha.',
    keywords: ['loyalty', 'truth in love', 'partnership', 'memory', 'unity'],
    metaphysicalProperties:
      'Considered to open and activate the heart with discernment, bringing in love that is grounded in honesty rather than fantasy. It is described as a stone of equilibrium, restoring balance to long partnerships.',
    inLove:
      'Traditionally given to mark a long term commitment. Believed to expose unfaithfulness and to deepen mutual respect when truth is welcome.',
    inHealing:
      'Folk traditions associate emerald with the eyes, the heart, and the immune system. Vedic uses include calming nervous tension and supporting communication.',
    inSpirituality:
      'A stone of the divine feminine, of Venus, of mercy. Used in meditations on universal love and on the marriage of inner masculine and feminine.',
    howToUse: [
      'Wear set in silver or gold close to the throat or heart',
      'Place over the heart during meditations on a current relationship',
      'Use during anniversaries and renewals of commitment',
      'Hold during prayers for a loved one',
      'Set on a written intention about partnership',
    ],
    cleansingMethods: [
      'Lukewarm water and soft cloth, avoid steam and ultrasonic cleaners',
      'Moonlight is the safest cleanse',
      'Smoke cleanse with frankincense',
      'Sound bath',
      'Avoid salt and acidic cleaners which can damage oiled stones',
    ],
    pairsWith: ['rose-quartz', 'green-aventurine', 'jade', 'sapphire', 'clear-quartz'],
    tarotConnection:
      'Emerald aligns with the Empress for fertile abundant love, and with the Two of Cups for sacred partnership. In Vedic tarot crossovers it links with cards of Mercury, especially those of clear honest speech.',
    faqs: [
      {
        q: 'Why is emerald often included?',
        a: 'Emeralds form in turbulent geological conditions and almost always carry inclusions, called the jardin or garden. This is normal and inclusions help authenticate natural stones.',
      },
      {
        q: 'Can I use emerald for elixirs?',
        a: 'Use the indirect method, placing the gem next to but not in the water. Most emeralds are oiled and the oil should not enter the body.',
      },
      {
        q: 'Is emerald durable for daily wear?',
        a: 'Hard but brittle. It chips more easily than diamond or sapphire, so protective settings are recommended for rings.',
      },
      {
        q: 'How does emerald compare to green aventurine?',
        a: 'Emerald is the precious focused variant. Green aventurine is the broad daily working stone. Many practitioners use aventurine as an emerald substitute.',
      },
    ],
    relatedEntries: ['rose-quartz', 'green-aventurine', 'jade'],
  },

  // =====================================================================
  // PROTECTION
  // =====================================================================
  {
    slug: 'black-tourmaline',
    name: 'Black Tourmaline',
    category: 'protection',
    hardness: 7,
    zodiac: ['Capricorn'],
    chakras: ['Root'],
    element: 'Earth',
    color: 'Opaque black with vertical striations',
    shortDescription:
      'Also called schorl, the most widely used protective and grounding stone in modern crystal practice.',
    longDescription:
      'Black tourmaline, mineral name schorl, is a complex iron rich aluminium borosilicate crystallising in long striated prisms. It is pyroelectric and piezoelectric, generating a small electric charge under pressure or temperature change, a property known since the eighteenth century. In metaphysical tradition it is the standard stone of psychic protection and energetic grounding. Robert Simmons describes it as a portable energetic shield. Practitioners place it at the four corners of a room to create a protected space, carry it through crowded environments, and use it to offload the day at night.',
    keywords: ['protection', 'grounding', 'EMF', 'shielding', 'absorption'],
    metaphysicalProperties:
      'Held to absorb and transmute negative energy from people, places, and electronics. It is associated with sealing the auric field and anchoring the user to the earth, creating a calm steady baseline.',
    inLove:
      'Used to clear the residue of past relationships before opening to new love and to protect a current relationship from outside negativity.',
    inHealing:
      'Folk associations include adrenal fatigue, stress, and chronic overstimulation. Often placed near beds of those who do not sleep well.',
    inSpirituality:
      'A foundation stone for ritual circles, for entering meditation safely, and for psychic work. Considered necessary before any opening practice that risks energetic exposure.',
    howToUse: [
      'Place at the four corners of a bedroom for a protective grid',
      'Set near the router or main electronics',
      'Carry in the left pocket through public spaces',
      'Hold at the base of the spine before meditation',
      'Wear as a pendant during emotionally heavy work',
      'Bury small pieces at the perimeter of a property',
    ],
    cleansingMethods: [
      'Run under cool water for one minute',
      'Smoke cleanse with sage or cedar',
      'Earth burial for twenty four hours',
      'Sound cleanse with a low drum',
      'Charge in morning sunlight, brief exposure only',
    ],
    pairsWith: ['hematite', 'smoky-quartz', 'obsidian', 'jet', 'selenite'],
    tarotConnection:
      'Black tourmaline pairs with the Devil card, supporting the user to break unhealthy bonds and to refuse manipulation. It is also called upon with the Nine of Wands, the card of weary but watchful defence.',
    faqs: [
      {
        q: 'Does black tourmaline really block EMF?',
        a: 'There is no peer reviewed evidence that it blocks measurable EMF. The traditional use is energetic. Many people use it as a meaningful focus rather than a Faraday cage.',
      },
      {
        q: 'Why does my tourmaline feel sticky or heavy?',
        a: 'Tradition says it absorbs heavily and needs frequent cleansing. If it feels dull or heavy it is time to cleanse.',
      },
      {
        q: 'Can it get wet?',
        a: 'Yes, brief rinsing is fine. Long salt water exposure can dull the surface.',
      },
      {
        q: 'Is it the same as black obsidian?',
        a: 'No. Tourmaline is a striated crystal mineral. Obsidian is volcanic glass. Both protect, with different temperaments.',
      },
    ],
    relatedEntries: ['hematite', 'smoky-quartz', 'obsidian'],
  },
  {
    slug: 'obsidian',
    name: 'Obsidian',
    category: 'protection',
    hardness: 5,
    zodiac: ['Scorpio', 'Sagittarius'],
    chakras: ['Root'],
    element: 'Fire',
    color: 'Glassy black, sometimes with rainbow, snowflake, or mahogany variants',
    shortDescription:
      'A natural volcanic glass formed when felsic lava cools without crystallising, used as a mirror of truth and a sharp protector.',
    longDescription:
      'Obsidian is amorphous volcanic glass, typically rhyolitic in composition. It cleaves to a sharp conchoidal fracture and was used in ancient toolmaking, divinatory mirrors, and ritual blades from Mesoamerica to East Africa. Aztec and Mayan cultures associated it with the god Tezcatlipoca, the smoking mirror. In modern metaphysical practice obsidian is treated as an uncompromising protector and a mirror that exposes shadow. It is fierce rather than gentle and is generally not given to highly sensitive beginners without preparation. Subtypes include snowflake, mahogany, rainbow, and apache tear, each with a slightly softer or specialised energy.',
    keywords: ['truth', 'shadow work', 'protection', 'mirror', 'sharp boundaries'],
    metaphysicalProperties:
      'Considered to draw out and reveal hidden negativity, repressed memories, and unresolved trauma. It is held to provide strong psychic shielding and to cut energetic cords that drain.',
    inLove:
      'Used to end a damaging cycle and to refuse manipulation. Often placed between two photos of an entanglement to be released.',
    inHealing:
      'Folk uses include digestive blockages, circulation, and the breaking of stagnant patterns. Emotionally a stone for facing what is avoided.',
    inSpirituality:
      'A scrying stone, traditionally polished into mirrors. Used for shadow integration, for visiting underworld archetypes, and for cord cutting rituals.',
    howToUse: [
      'Use a polished sphere or mirror for scrying in candlelight',
      'Place at thresholds, doors, and windows to seal a space',
      'Carry an apache tear for grief and emotional release',
      'Hold during cord cutting visualisations',
      'Set at the foot of the bed for nightmare protection',
    ],
    cleansingMethods: [
      'Smoke cleanse with sage or copal',
      'Brief water rinse, never prolonged',
      'Earth burial overnight',
      'Sound cleanse with a deep drum',
      'Avoid salt because it can pit the surface',
    ],
    pairsWith: ['black-tourmaline', 'hematite', 'jet', 'smoky-quartz', 'clear-quartz'],
    tarotConnection:
      'Obsidian aligns with the Moon and with Death. It supports descent work and the willingness to look at what has been hidden, including the Devil card themes of attachment and shadow.',
    faqs: [
      {
        q: 'Is obsidian a crystal?',
        a: 'Mineralogically it is a glass, not a crystal, because it has no ordered atomic lattice. It is still treated as a working stone in tradition.',
      },
      {
        q: 'Can obsidian cut me?',
        a: 'Yes, broken edges are extremely sharp, sharper than steel. Handle polished pieces and check for chips.',
      },
      {
        q: 'What is the difference between snowflake and rainbow obsidian?',
        a: 'Snowflake has white cristobalite inclusions and is gentler. Rainbow obsidian has iridescent layers and is used for joy retrieval.',
      },
      {
        q: 'Should beginners use obsidian?',
        a: 'Apache tear and snowflake are friendlier starting points. Pure black obsidian can be intense for sensitive users.',
      },
    ],
    relatedEntries: ['black-tourmaline', 'hematite', 'jet'],
  },
  {
    slug: 'hematite',
    name: 'Hematite',
    category: 'protection',
    hardness: 6,
    zodiac: ['Aries', 'Aquarius'],
    chakras: ['Root'],
    element: 'Earth',
    color: 'Metallic silver grey to red brown, leaves a red streak',
    shortDescription:
      'An iron oxide of unmistakable weight, traditionally used as a grounding shield and a stone for the blood.',
    longDescription:
      'Hematite is iron three oxide, Fe2O3, the principal ore of iron. Its name derives from haima, blood, because of its rust red streak. It is dense, cool, and metallic in appearance. Ancient cultures, including the Egyptians, used it for amulets and for the eye paint of warriors. In metaphysical tradition it is treated as one of the strongest grounding stones, anchoring the user firmly into the body and into the earth. It is also classically associated with the blood, with circulation, and with courage in the face of conflict. So called magnetic hematite is a man made ferrite, not natural hematite, but is sold under the same name.',
    keywords: ['grounding', 'courage', 'iron', 'focus', 'shielding'],
    metaphysicalProperties:
      'Held to ground excess energy through the root chakra, to anchor scattered minds, and to deflect lower vibrations. Considered a stone of the warrior, supporting steady action under pressure.',
    inLove:
      'Used for grounding overwhelming emotion and for staying calm in confrontation. Helpful when a relationship triggers anxiety.',
    inHealing:
      'Folk associations include anaemia, circulation, and energetic drain. Often used as a worry stone for nervous systems on overload.',
    inSpirituality:
      'A foundation stone for any opening practice. Brings the practitioner back into the body after meditation, journey work, or ritual.',
    howToUse: [
      'Hold a tumbled stone in each hand for grounding before meditation',
      'Wear a hematite ring on the non dominant hand to settle anxious energy',
      'Place at the base of the spine while lying down',
      'Carry through high stress meetings',
      'Use to seal the field after psychic or healing work',
    ],
    cleansingMethods: [
      'Smoke cleanse with sage or rosemary',
      'Brief water rinse, dry immediately to prevent rust',
      'Earth burial overnight',
      'Sound cleanse',
      'Avoid prolonged salt water exposure',
    ],
    pairsWith: ['black-tourmaline', 'smoky-quartz', 'obsidian', 'jet', 'tigers-eye'],
    tarotConnection:
      'Hematite aligns with the Knight of Pentacles, steady disciplined effort, and with the Strength card, courageous restraint. It is a useful pull during the Tower for staying embodied through change.',
    faqs: [
      {
        q: 'Is magnetic hematite real hematite?',
        a: 'No. Magnetised pieces are man made ferrite. Real hematite is only weakly magnetic at most.',
      },
      {
        q: 'Why does it leave red marks on skin?',
        a: 'Iron content can leave a faint red mark, especially when wet. This is normal and not harmful.',
      },
      {
        q: 'Can hematite rust?',
        a: 'It is already oxidised, but moisture trapped under polish can cause surface tarnish. Keep it dry.',
      },
      {
        q: 'Is hematite safe to wear daily?',
        a: 'Yes, it is durable. Some people remove it at night because the energy is strongly grounding.',
      },
    ],
    relatedEntries: ['black-tourmaline', 'smoky-quartz', 'obsidian'],
  },
  {
    slug: 'jet',
    name: 'Jet',
    category: 'protection',
    hardness: 3,
    zodiac: ['Capricorn'],
    chakras: ['Root'],
    element: 'Earth',
    color: 'Velvet to glossy black',
    shortDescription:
      'A fossilised wood and one of the oldest mourning and protection stones in European tradition.',
    longDescription:
      'Jet is not a true mineral but a form of lignite, fossilised wood from the Jurassic period, hard enough to take a polish. The Whitby jet of Yorkshire was famous from Roman times and again in Victorian mourning jewellery. It is light, warm to the touch, and electrostatic when rubbed. Pliny the Elder mentions it as a charm against snakes and the evil eye. In folk practice across Europe it is paired with amber, the male and female amulet pair, jet for protection and amber for warmth. Modern witchcraft retains jet as a primary stone of psychic shielding and grief support.',
    keywords: ['protection', 'mourning', 'absorption', 'old magic', 'evil eye'],
    metaphysicalProperties:
      'Held to absorb dense emotion, particularly grief and fear, and to shield the wearer from psychic attack. Considered a strongly absorbent stone that requires regular cleansing.',
    inLove:
      'Used after bereavement and during long separations. Considered a stone for keeping faithful through difficulty.',
    inHealing:
      'Folk uses include migraines, depression, and stomach pain. Most strongly associated with grief work and with helping the bereaved sleep.',
    inSpirituality:
      'A traditional witch stone, used in protective amulets, in sacred bundles, and at funerals. Pairs with amber as a balance of dark and light old magic.',
    howToUse: [
      'Wear as a pendant during mourning',
      'Carry through cemeteries or funerals',
      'Hold while breathing through grief',
      'Place under the pillow to ease nightmares',
      'Add to a charm bag with amber and rosemary',
    ],
    cleansingMethods: [
      'Smoke cleanse with mugwort or rosemary',
      'Sound cleanse with bells',
      'Place on selenite overnight',
      'Earth burial in dry soil',
      'Avoid water and never use harsh chemicals',
    ],
    pairsWith: ['black-tourmaline', 'obsidian', 'hematite', 'smoky-quartz', 'amethyst'],
    tarotConnection:
      'Jet pairs with the Five of Cups, the card of grief faced honestly, and with the Hermit, the long inward journey through loss toward integration. It is also a card of the Death card lived through, not feared.',
    faqs: [
      {
        q: 'Is jet a stone or a fossil?',
        a: 'It is a fossilised wood, technically a mineraloid. It still functions as a stone in metaphysical practice.',
      },
      {
        q: 'How do I test if jet is real?',
        a: 'Real jet is warm and light, gives a brown streak on unglazed porcelain, and smells faintly of coal when rubbed firmly. Plastic imitations are common.',
      },
      {
        q: 'Can jet get wet?',
        a: 'Avoid water. Jet can crack or lose polish from prolonged moisture.',
      },
      {
        q: 'Why is it paired with amber?',
        a: 'In old European witchcraft jet is the dark protector, amber the warm enlivener. Together they balance.',
      },
    ],
    relatedEntries: ['black-tourmaline', 'obsidian', 'amethyst'],
  },
  {
    slug: 'smoky-quartz',
    name: 'Smoky Quartz',
    category: 'protection',
    hardness: 7,
    zodiac: ['Capricorn', 'Scorpio', 'Sagittarius'],
    chakras: ['Root'],
    element: 'Earth',
    color: 'Pale grey to deep brown black, transparent to translucent',
    shortDescription:
      'A naturally irradiated quartz, considered the premier grounding crystal of the quartz family.',
    longDescription:
      'Smoky quartz is quartz coloured by natural gamma radiation acting on traces of aluminium, producing colour centres ranging from pale champagne to almost black. The Scottish Cairngorm variety has been worn in Highland regalia for centuries. Smoky quartz from Brandberg in Namibia and from the Swiss Alps is highly prized. Metaphysically it is a foundation stone, often described as the bridge between root chakra grounding and crown chakra clarity, since it is still quartz. It transmutes rather than absorbs, allowing energy to move through and into the earth.',
    keywords: ['grounding', 'transmutation', 'calm', 'practical magic', 'detox'],
    metaphysicalProperties:
      'Considered to ground excess energy, transmute negative emotion, and bring scattered thoughts back into focus. Unlike some absorbing stones it is held to release into the earth rather than store.',
    inLove:
      'Used to settle anxious attachment and to ground new relationships into reality rather than fantasy.',
    inHealing:
      'Folk associations include detoxification, lower back pain, and abdominal discomfort. Strongly used for anxiety and overstimulation.',
    inSpirituality:
      'Acts as a programmable grounding stone. Many practitioners pair clear quartz for vision with smoky quartz for grounded action.',
    howToUse: [
      'Place a point at the feet during meditation, tip pointing away',
      'Hold during anxiety to direct it down and out',
      'Set at the four corners of a workspace',
      'Carry through travel for nervous systems on edge',
      'Use as a programmed stone for releasing a specific worry',
    ],
    cleansingMethods: [
      'Running water for one to two minutes',
      'Smoke cleanse with cedar or sage',
      'Sound bath',
      'Earth burial',
      'Avoid prolonged direct sun, which can fade the colour',
    ],
    pairsWith: ['black-tourmaline', 'hematite', 'clear-quartz', 'amethyst', 'jet'],
    tarotConnection:
      'Smoky quartz aligns with the Hermit and the Four of Pentacles, both cards of inward grounding and stable resources. It is also useful with the Hanged Man, supporting surrender without dissociation.',
    faqs: [
      {
        q: 'Is smoky quartz radioactive?',
        a: 'No. It is the result of past natural radiation, not active radioactivity. It is safe to wear.',
      },
      {
        q: 'Are dark smoky quartz pieces irradiated artificially?',
        a: 'Some commercial pieces are, especially uniformly very dark ones. Most natural smoky has subtle variation.',
      },
      {
        q: 'Will smoky quartz fade?',
        a: 'Yes, prolonged direct sunlight can lighten it. Cleanse in moonlight or indirect light.',
      },
      {
        q: 'Can it replace black tourmaline?',
        a: 'They overlap but smoky quartz transmutes through the lattice while tourmaline absorbs. Many people use both.',
      },
    ],
    relatedEntries: ['black-tourmaline', 'clear-quartz', 'amethyst'],
  },

  // =====================================================================
  // ABUNDANCE
  // =====================================================================
  {
    slug: 'citrine',
    name: 'Citrine',
    category: 'abundance',
    hardness: 7,
    zodiac: ['Leo', 'Aries', 'Gemini'],
    chakras: ['Solar Plexus', 'Sacral'],
    element: 'Fire',
    color: 'Pale yellow to deep amber, naturally occurring or heat treated from amethyst',
    shortDescription:
      'The yellow variety of quartz, traditionally called the merchant stone for its association with success and confidence.',
    longDescription:
      'Citrine is a quartz coloured by ferric iron, ranging from soft champagne to deep madeira. Genuine natural citrine is comparatively rare and most commercial citrine is heat treated amethyst, which produces a more saturated orange yellow. Both are considered effective in tradition, although purists prefer the natural Brazilian, Russian, or Congolese material. Citrine has been associated with wealth and success since at least ancient Greek and Roman times, when it was carved into intaglios. It is sometimes called the merchant stone because shopkeepers traditionally placed a piece in the till.',
    keywords: ['abundance', 'confidence', 'will', 'creativity', 'optimism'],
    metaphysicalProperties:
      'Held to ignite the solar plexus, fueling personal will, creative drive, and the courage to act on personal value. Considered a stone that does not absorb negativity and does not need cleansing in the same way as some others.',
    inLove:
      'Used to attract a confident equal partnership and to stop self abandonment around money or worth in a relationship.',
    inHealing:
      'Folk associations include digestion, metabolism, and seasonal affective conditions. Used for restoring vitality after burnout.',
    inSpirituality:
      'A solar stone, used in sun rituals, in manifestation work, and in restoring will after long depression.',
    howToUse: [
      'Place a piece in the cash drawer or wallet',
      'Set at the south or east corner of a workspace',
      'Hold during morning intentions about work',
      'Wear during pitches, interviews, or negotiations',
      'Use in manifestation grids with clear quartz points',
    ],
    cleansingMethods: [
      'Sunlight for short periods, though it can fade in prolonged sun',
      'Running water briefly',
      'Smoke cleanse',
      'Sound bath',
      'Tradition says citrine self cleanses, though many still cleanse periodically',
    ],
    pairsWith: ['pyrite', 'green-aventurine', 'tigers-eye', 'clear-quartz', 'jade'],
    tarotConnection:
      'Citrine aligns with the Sun, the Magician, and the Nine of Pentacles, all cards of confident manifestation. It is the stone reached for when working with the Wheel of Fortune turning upward.',
    faqs: [
      {
        q: 'Is heat treated citrine still effective?',
        a: 'Most practitioners say yes. Some prefer natural citrine for fine work. Both are real quartz.',
      },
      {
        q: 'How do I tell natural from heat treated?',
        a: 'Heat treated citrine is usually a stronger orange and often has white bases from the original amethyst geode. Natural citrine is softer and more even in colour.',
      },
      {
        q: 'Will citrine fade in sunlight?',
        a: 'Yes, prolonged direct sun can lighten it. Brief charging is fine.',
      },
      {
        q: 'Why is it called the merchant stone?',
        a: 'A traditional folk practice is to place a piece in the till to keep money flowing, drawing on its solar plexus association with confidence and value.',
      },
    ],
    relatedEntries: ['pyrite', 'tigers-eye', 'green-aventurine'],
  },
  {
    slug: 'pyrite',
    name: 'Pyrite',
    category: 'abundance',
    hardness: 6,
    zodiac: ['Leo'],
    chakras: ['Solar Plexus'],
    element: 'Fire',
    color: 'Brassy gold metallic, often in cubic crystals',
    shortDescription:
      'Iron sulphide of striking metallic lustre, called fools gold, used as a stone of will, action, and material manifestation.',
    longDescription:
      'Pyrite is iron disulphide, FeS2, often forming perfect cubic or octahedral crystals. The name comes from the Greek pyr, fire, because it sparks when struck against steel. It was used as a fire starter long before flint. Spanish miners called it fools gold because of its colour, though it is denser and harder than real gold. Metaphysically it is treated as a stone of action, will, and material confidence. Robert Simmons describes it as a positive masculine stone that supports doing rather than dreaming. It is a primary abundance stone in the modern toolkit, often paired with citrine and green aventurine.',
    keywords: ['action', 'will', 'manifestation', 'wealth', 'shielding'],
    metaphysicalProperties:
      'Held to charge the solar plexus, defeat lethargy, and reflect negativity back to its source. Considered a stone of focused practical effort and of energetic protection during the day.',
    inLove:
      'Used to encourage decisive action when love requires courage. Less a stone of romance, more of follow through.',
    inHealing:
      'Folk associations include circulation, low energy, and the recovery from illness. Often used to break the spell of long inertia.',
    inSpirituality:
      'A stone for those who tend to live in the head and avoid embodied action. Pairs with grounding stones for steady drive.',
    howToUse: [
      'Set a cube on your desk facing the screen',
      'Carry during a job search',
      'Hold while writing financial goals',
      'Place near the front door to greet you with vitality each morning',
      'Use in abundance grids with citrine and clear quartz',
    ],
    cleansingMethods: [
      'Smoke cleanse with sage or palo santo',
      'Sound bath',
      'Brief earth burial in dry soil',
      'Place on selenite overnight',
      'Avoid water because pyrite can rust and oxidise',
    ],
    pairsWith: ['citrine', 'tigers-eye', 'green-aventurine', 'hematite', 'clear-quartz'],
    tarotConnection:
      'Pyrite aligns with the Magician, the wielder of focused will, and with the Eight of Pentacles, the apprentice doing the work. It supports any card asking for action over reflection.',
    faqs: [
      {
        q: 'Why is pyrite called fools gold?',
        a: 'Spanish miners and gold rush prospectors mistook it for gold. It is denser than fakes but lighter and harder than gold itself.',
      },
      {
        q: 'Can pyrite get wet?',
        a: 'Avoid water. Pyrite oxidises and can produce sulphuric acid in damp storage, damaging itself and other minerals.',
      },
      {
        q: 'What is the white powder on my pyrite?',
        a: 'That is pyrite decay, usually iron sulphate. Store in low humidity and away from other minerals.',
      },
      {
        q: 'Is pyrite safe to handle?',
        a: 'Yes, polished pieces are safe. Wash hands after handling raw clusters and avoid ingestion or elixirs.',
      },
    ],
    relatedEntries: ['citrine', 'tigers-eye', 'hematite'],
  },
  {
    slug: 'green-aventurine',
    name: 'Green Aventurine',
    category: 'abundance',
    hardness: 7,
    zodiac: ['Taurus', 'Virgo', 'Libra'],
    chakras: ['Heart'],
    element: 'Earth',
    color: 'Light to medium green with subtle sparkle from fuchsite mica inclusions',
    shortDescription:
      'A fuchsite included quartz, called the stone of opportunity for its reputation of bringing fortunate outcomes.',
    longDescription:
      'Green aventurine is a variety of quartz containing tiny platelets of green fuchsite, a chromium rich muscovite mica, which give it a soft glittering effect known as aventurescence. The name comes from the Italian a ventura, by chance, referring to the accidental discovery of aventurine glass in the eighteenth century, which was then applied to the natural stone. Metaphysically it is the most popular general purpose abundance stone, called the stone of opportunity. It is gentler than pyrite or citrine and is widely used for entering new ventures, gambling moments, job searches, and for steady financial growth.',
    keywords: ['opportunity', 'luck', 'growth', 'optimism', 'comfort'],
    metaphysicalProperties:
      'Held to soothe the heart and open the field to favourable outcomes. Considered a stone that draws gentle steady abundance rather than dramatic wealth.',
    inLove:
      'Used to bring kind partners and to soften approach in dating. Pairs well with rose quartz for confidence in being lovable.',
    inHealing:
      'Folk associations include the heart, blood pressure, and stress related conditions. Often used for nervousness around finances.',
    inSpirituality:
      'A stone of trust in life. Used in meditations on receiving, on letting go of scarcity, and on returning to natural optimism.',
    howToUse: [
      'Carry in the left pocket on days of opportunity',
      'Hold while applying for jobs or grants',
      'Place in the wallet near cash',
      'Set on a written list of intentions',
      'Use in plant pots to support garden vitality, a folk tradition',
    ],
    cleansingMethods: [
      'Running water briefly',
      'Moonlight',
      'Smoke cleanse',
      'Earth burial in dry soil',
      'Sound cleanse',
    ],
    pairsWith: ['citrine', 'jade', 'rose-quartz', 'tigers-eye', 'pyrite'],
    tarotConnection:
      'Green aventurine aligns with the Wheel of Fortune for favourable turns, and with the Page of Pentacles for new material beginnings. It is also called upon with the Star, gentle hope after difficulty.',
    faqs: [
      {
        q: 'Is green aventurine the same as jade?',
        a: 'No. Aventurine is quartz with mica inclusions. Jade is jadeite or nephrite, a different mineral entirely. They share some metaphysical themes.',
      },
      {
        q: 'Can it get wet?',
        a: 'Yes, water safe and stable.',
      },
      {
        q: 'Why does mine sparkle?',
        a: 'The fuchsite mica reflects light. That sparkle is called aventurescence and is the defining feature.',
      },
      {
        q: 'Are blue and red aventurine the same family?',
        a: 'Yes. Different inclusions give different colours. Red is hematite, blue is dumortierite or similar minerals.',
      },
    ],
    relatedEntries: ['citrine', 'jade', 'rose-quartz'],
  },
  {
    slug: 'jade',
    name: 'Jade',
    category: 'abundance',
    hardness: 7,
    zodiac: ['Taurus', 'Aries', 'Gemini', 'Libra'],
    chakras: ['Heart'],
    element: 'Earth',
    color: 'Most often green, also white, lavender, yellow, and black',
    shortDescription:
      'A traditional Chinese stone of virtue, harmony, and steady prosperity, comprising two distinct minerals, jadeite and nephrite.',
    longDescription:
      'The name jade covers two minerals, jadeite, a sodium aluminium pyroxene, and nephrite, a calcium magnesium amphibole. Imperial jade is a fine emerald green jadeite from Burma. Nephrite, slightly softer and tougher, is the historic Chinese jade and is also found from New Zealand to Wyoming. Jade has been carved for over seven thousand years and in Confucian thought it represented the eleven virtues. Modern metaphysical practice retains jade as the stone of harmony, purity, and quiet abundance. It is given at births, weddings, and milestones across Chinese culture and is considered protective of children.',
    keywords: ['harmony', 'virtue', 'longevity', 'wisdom', 'prosperity'],
    metaphysicalProperties:
      'Held to balance the heart with calm wisdom and to attract abundance through right action rather than force. Considered a stone of long life and stable fortune.',
    inLove:
      'Used in family love and intergenerational care more than romantic love. Considered a stone of fidelity and steady commitment.',
    inHealing:
      'Folk associations include the kidneys, hips, and immune system. The word nephrite comes from the Latin for kidney.',
    inSpirituality:
      'A Daoist and Confucian stone of virtue. Used in meditations on right conduct, ancestor honour, and the long view.',
    howToUse: [
      'Wear as a pendant or bangle daily',
      'Place on the desk during long term planning',
      'Hold while honouring ancestors',
      'Set in a baby room as a guardian, a Chinese tradition',
      'Use in gua sha tools for face and body, a long established practice',
    ],
    cleansingMethods: [
      'Moonlight',
      'Running water',
      'Smoke cleanse',
      'Sound cleanse',
      'Avoid harsh chemicals as polished or oiled jade can be sensitive',
    ],
    pairsWith: ['green-aventurine', 'rose-quartz', 'citrine', 'clear-quartz', 'jet'],
    tarotConnection:
      'Jade aligns with the Empress for fertile abundance, and with the Ten of Pentacles for inherited prosperity and family wealth. It also resonates with the Hierophant for tradition and right conduct.',
    faqs: [
      {
        q: 'Is jadeite or nephrite better?',
        a: 'They are both jade. Jadeite is denser and rarer, often used for fine carvings. Nephrite is tougher, the historical Chinese carving stone.',
      },
      {
        q: 'Is dyed quartzite sold as jade?',
        a: 'Yes, often. Genuine jade is heavy, cool, and has a fine fibrous texture. Treated stones are common in cheap markets.',
      },
      {
        q: 'Can jade get wet?',
        a: 'Yes, water safe. Avoid harsh detergents and ultrasonic cleaners on treated jade.',
      },
      {
        q: 'Why is jade given at birth in Chinese culture?',
        a: 'It is believed to protect the child and mark a life of virtue and harmony.',
      },
    ],
    relatedEntries: ['green-aventurine', 'rose-quartz', 'citrine'],
  },
  {
    slug: 'tigers-eye',
    name: 'Tigers Eye',
    category: 'abundance',
    hardness: 7,
    zodiac: ['Capricorn', 'Leo'],
    chakras: ['Solar Plexus', 'Sacral'],
    element: 'Earth',
    color: 'Golden brown with silky chatoyant bands',
    shortDescription:
      'A pseudomorph of quartz after crocidolite asbestos, prized for chatoyancy and used as a stone of courageous practical action.',
    longDescription:
      'Tigers eye is a metamorphic stone formed when quartz replaces fibrous crocidolite, preserving the parallel fibre orientation that produces its characteristic chatoyant cats eye effect. The original asbestos has been replaced and is no longer a hazard in finished pieces, though raw crocidolite should be handled with care. Tigers eye is mainly mined in South Africa. Related stones include hawks eye, the blue grey form, and pietersite, a brecciated tigers eye. In tradition it is a stone of practical courage, balancing solar plexus drive with earth chakra steadiness, and is widely used for confidence in money matters.',
    keywords: ['courage', 'practical action', 'discernment', 'will', 'protection'],
    metaphysicalProperties:
      'Held to balance polarities, to bring scattered intention into focus, and to support clear discernment in financial decisions. Considered a stone that watches like a tiger before acting.',
    inLove:
      'Used to navigate complicated relationship choices with discernment and to overcome shyness in approach.',
    inHealing:
      'Folk associations include the eyes, throat, and reproductive system. Often used for confidence in body image and assertiveness.',
    inSpirituality:
      'A stone for grounding solar work into practical results. Pairs the courage of fire with the stability of earth.',
    howToUse: [
      'Carry during financial decisions',
      'Hold during interviews',
      'Place on the desk during entrepreneurial planning',
      'Wear for confidence in public speaking',
      'Use in grids for grounded manifestation with citrine and pyrite',
    ],
    cleansingMethods: [
      'Smoke cleanse',
      'Sunlight in short bursts',
      'Sound bath',
      'Earth burial',
      'Brief water rinse, dry promptly',
    ],
    pairsWith: ['citrine', 'pyrite', 'hematite', 'green-aventurine', 'clear-quartz'],
    tarotConnection:
      'Tigers eye aligns with the Chariot, controlled willpower in motion, and with the King of Pentacles, mastered material mastery. It is also a stone for the Strength card, particularly the courage of measured action.',
    faqs: [
      {
        q: 'Is tigers eye dangerous because of asbestos?',
        a: 'Polished tigers eye is safe. The crocidolite has been replaced by quartz. Avoid breathing dust from raw crocidolite or cutting unpolished material without protection.',
      },
      {
        q: 'What is hawks eye?',
        a: 'The blue grey unoxidised parent of tigers eye, before iron oxidation turns it golden.',
      },
      {
        q: 'Can it get wet?',
        a: 'Yes briefly, but prolonged water can dull the chatoyancy. Wipe dry.',
      },
      {
        q: 'Why does mine seem to move when I tilt it?',
        a: 'That is chatoyancy, the cats eye effect. The parallel fibres reflect a moving band of light.',
      },
    ],
    relatedEntries: ['citrine', 'pyrite', 'hematite'],
  },

  // =====================================================================
  // CLARITY
  // =====================================================================
  {
    slug: 'clear-quartz',
    name: 'Clear Quartz',
    category: 'clarity',
    hardness: 7,
    zodiac: ['Aries', 'Leo', 'Taurus', 'Gemini'],
    chakras: ['Crown', 'Third Eye'],
    element: 'Spirit',
    color: 'Colourless to milky white, transparent',
    shortDescription:
      'The master stone of the mineral kingdom, used for amplification, clarity, and programmable intention.',
    longDescription:
      'Clear quartz is silicon dioxide, SiO2, the most abundant mineral on the earth crust. It is piezoelectric and pyroelectric, and the basis of modern timekeeping in the quartz watch. Pure clear specimens are often called rock crystal. Across cultures it has been used for divination, scrying, and as a focus for healers. Robert Simmons calls it the universal crystal because of its capacity to amplify, store, and direct intention. In modern practice it is the foundation stone, used to amplify any other crystal and to hold programmed intentions. Subtypes include Lemurian, Herkimer diamond, phantom, included, and Tibetan quartz, each with refined uses.',
    keywords: ['amplification', 'clarity', 'programming', 'master stone', 'energy'],
    metaphysicalProperties:
      'Held to amplify thought, intention, and the energy of nearby stones. Considered a programmable stone, accepting and holding a clear directive set with attention.',
    inLove:
      'Used to amplify the work of softer heart stones and to clarify intentions in relationship.',
    inHealing:
      'A general purpose energiser, used in layouts at the crown and at any blocked area as a focusing tool.',
    inSpirituality:
      'The principal stone for meditation, programming, and grid work. Single terminated points direct energy from base to tip.',
    howToUse: [
      'Program by holding under running water then stating an intention',
      'Place a point on each chakra during a layout',
      'Use as the centre stone of a crystal grid',
      'Hold during meditation to clarify thought',
      'Wear as a pendant for general energetic clarity',
    ],
    cleansingMethods: [
      'Running water for one to two minutes',
      'Sunlight or moonlight',
      'Smoke cleanse',
      'Sound bath',
      'Selenite overnight',
    ],
    pairsWith: ['amethyst', 'rose-quartz', 'citrine', 'smoky-quartz', 'selenite'],
    tarotConnection:
      'Clear quartz pairs with the Magician, the wielder of focused will, and with the High Priestess for clear inner sight. It also amplifies any card it is placed on, used as a tarot working stone.',
    faqs: [
      {
        q: 'How do I program clear quartz?',
        a: 'Cleanse first, then hold the stone, breathe steadily, and state a clear specific intention out loud or silently. Reset only when the intention has changed.',
      },
      {
        q: 'What is the difference between clear quartz and Herkimer diamond?',
        a: 'Herkimer is a doubly terminated quartz from New York with extreme clarity. It is considered a high vibration variant.',
      },
      {
        q: 'Can clear quartz fade in the sun?',
        a: 'No, pure clear quartz is sun stable. Some included quartzes can fade.',
      },
      {
        q: 'Is glass sold as quartz?',
        a: 'Yes. Real quartz is cooler to the touch, heavier, and often has natural inclusions or rainbows. Glass tends to have bubbles and feels lighter.',
      },
    ],
    relatedEntries: ['amethyst', 'smoky-quartz', 'selenite'],
  },
  {
    slug: 'fluorite',
    name: 'Fluorite',
    category: 'clarity',
    hardness: 4,
    zodiac: ['Pisces', 'Capricorn'],
    chakras: ['Third Eye', 'Throat'],
    element: 'Air',
    color: 'Multicoloured, often green, purple, blue, yellow in banded zones',
    shortDescription:
      'Calcium fluoride, called the genius stone for its association with mental order and learning.',
    longDescription:
      'Fluorite is calcium fluoride, CaF2, often forming perfect cubic crystals and famously fluorescent under UV light, the property that gave fluorescence its name. It comes in dramatic banded forms, especially the green and purple Chinese material and the rainbow English Blue John. It is soft, only Mohs 4, and has perfect octahedral cleavage, which means it splits easily. Metaphysically fluorite is treated as a stone of mental clarity and structured thinking. Judy Hall calls it the genius stone for its reputation in supporting study, complex problem solving, and the integration of new information. Different colours are used for different mental functions.',
    keywords: ['mental clarity', 'study', 'order', 'discernment', 'integration'],
    metaphysicalProperties:
      'Held to organise scattered thinking, support memory, and dissolve mental fog. Considered a stone of structured intelligence and of clear discernment between truth and illusion.',
    inLove:
      'Used to gain perspective in confusing relationships and to think clearly about emotional patterns rather than be ruled by them.',
    inHealing:
      'Folk associations include the bones, teeth, and immune system. It is most often used for mental fatigue and concentration.',
    inSpirituality:
      'A stone of structured insight. Used in study of esoteric subjects and in integrating spiritual experiences into ordinary life.',
    howToUse: [
      'Place on the desk during study',
      'Hold during meditation on a complex question',
      'Use a green piece for new learning, purple for intuition, blue for clear speech',
      'Place under the pillow for vivid integrative dreams',
      'Carry through exams or important meetings',
    ],
    cleansingMethods: [
      'Smoke cleanse',
      'Moonlight',
      'Sound bath',
      'Place on selenite overnight',
      'Avoid water and salt because fluorite can dull and is acid sensitive',
    ],
    pairsWith: ['amethyst', 'clear-quartz', 'sodalite', 'lapis-lazuli', 'selenite'],
    tarotConnection:
      'Fluorite aligns with the High Priestess for clear inner knowing, and with the Hermit for the lamp of structured study. It is also useful with the Eight of Pentacles, mastery through patient work.',
    faqs: [
      {
        q: 'Why does fluorite glow under UV?',
        a: 'Trace impurities cause it to fluoresce. The mineral itself is the source of the term fluorescence.',
      },
      {
        q: 'Can fluorite get wet?',
        a: 'Avoid prolonged water, especially salt water. It is soft and acid sensitive.',
      },
      {
        q: 'What does the colour mean?',
        a: 'Tradition assigns green for new learning, purple for intuition and meditation, blue for clear communication, yellow for confident expression.',
      },
      {
        q: 'Why does mine break easily?',
        a: 'Fluorite has perfect octahedral cleavage and is soft. Drops, knocks, and even sudden temperature changes can split it.',
      },
    ],
    relatedEntries: ['amethyst', 'sodalite', 'lapis-lazuli'],
  },
  {
    slug: 'sodalite',
    name: 'Sodalite',
    category: 'clarity',
    hardness: 6,
    zodiac: ['Sagittarius'],
    chakras: ['Throat', 'Third Eye'],
    element: 'Air',
    color: 'Royal blue with white calcite veining',
    shortDescription:
      'A sodium aluminium silicate of the feldspathoid group, used as a stone of rational thought and clear honest speech.',
    longDescription:
      'Sodalite is a sodium chloride bearing aluminium silicate of the feldspathoid family, often confused with lapis lazuli. Sodalite lacks the gold pyrite of lapis and is generally a more uniform royal blue. It was first identified in Greenland and is now mined notably in Brazil and Canada. Metaphysically it is treated as a stone of the rational mind, supporting logic, structure, and grounded honest communication. It is more cerebral and less mystical than lapis lazuli, more about clarity in expression than about deep esoteric vision.',
    keywords: ['rational thought', 'honest speech', 'logic', 'calm communication', 'study'],
    metaphysicalProperties:
      'Held to stimulate the throat and third eye chakras, supporting clear thinking and the courage to speak truthfully without aggression. Considered a stone of teachers, writers, and analysts.',
    inLove:
      'Used to support honest conversations, including hard ones, without escalation. A stone for couples therapy.',
    inHealing:
      'Folk associations include the throat, thyroid, and metabolism. Used for blood pressure related to anxiety in some traditions.',
    inSpirituality:
      'A stone for those who tend toward over emotion or over imagination, bringing language and order to spiritual experience.',
    howToUse: [
      'Hold over the throat during difficult conversations',
      'Place on the desk during writing',
      'Use during therapy sessions or mediation',
      'Carry to public speaking events',
      'Set on study notes overnight',
    ],
    cleansingMethods: [
      'Smoke cleanse',
      'Moonlight',
      'Sound bath',
      'Brief water rinse',
      'Avoid salt and direct sunlight for long periods',
    ],
    pairsWith: ['lapis-lazuli', 'clear-quartz', 'fluorite', 'amethyst', 'angelite'],
    tarotConnection:
      'Sodalite resonates with the King of Swords, clear sovereign judgement, and with the Justice card, balanced impartial truth. It is also useful with the Hierophant for teaching with integrity.',
    faqs: [
      {
        q: 'How do I tell sodalite from lapis lazuli?',
        a: 'Lapis usually has gold pyrite flecks and a deeper blue. Sodalite is more uniform, often with white calcite veins, no pyrite.',
      },
      {
        q: 'Can it get wet?',
        a: 'Briefly. Avoid salt water and prolonged soaking.',
      },
      {
        q: 'Is hackmanite a sodalite?',
        a: 'Yes. It is a colour changing variety that fades in light and recovers in darkness, called tenebrescence.',
      },
      {
        q: 'Is sodalite good for anxiety?',
        a: 'It is more about mental ordering than nervous system calm. Pair with grounding stones if anxiety is somatic.',
      },
    ],
    relatedEntries: ['lapis-lazuli', 'fluorite', 'amethyst'],
  },
  {
    slug: 'lapis-lazuli',
    name: 'Lapis Lazuli',
    category: 'clarity',
    hardness: 5,
    zodiac: ['Sagittarius'],
    chakras: ['Third Eye', 'Throat'],
    element: 'Air',
    color: 'Deep ultramarine blue with golden pyrite and white calcite',
    shortDescription:
      'A rock of lazurite, calcite, and pyrite, the celebrated royal blue stone of pharaohs, philosophers, and esoteric tradition.',
    longDescription:
      'Lapis lazuli is a metamorphic rock, not a single mineral, composed mainly of lazurite with calcite and pyrite. The finest lapis still comes from the Sar e Sang mines of Afghanistan, in continuous use for at least seven thousand years. It was used in the burial mask of Tutankhamun and ground into the precious pigment ultramarine. Metaphysically it has been called the stone of truth, of inner kingship, and of the celestial wisdom. It is a stone of philosophers more than scholars, of inner knowing rather than information. Many traditions reserve it for spiritual leadership and the courage to speak the deeper truth.',
    keywords: ['truth', 'inner kingship', 'wisdom', 'mystic vision', 'speech of the soul'],
    metaphysicalProperties:
      'Held to open the third eye and throat together, integrating vision with the courage to voice it. Considered a stone of authentic personal authority and of timeless wisdom.',
    inLove:
      'Used to speak from the soul rather than the wound, and to recognise spiritual contracts. Less about romance, more about partnership of purpose.',
    inHealing:
      'Folk associations include throat, thyroid, and headaches related to repressed expression.',
    inSpirituality:
      'A stone of the mystic, of dream incubation, and of remembering past spiritual lives. Long associated with Egyptian, Sumerian, and Tibetan ritual.',
    howToUse: [
      'Hold over the third eye in meditation',
      'Wear as a pendant on the throat for important speech',
      'Place under the pillow for visionary dreams',
      'Set on the desk during creative writing',
      'Use in initiation rituals and personal vows',
    ],
    cleansingMethods: [
      'Smoke cleanse with frankincense',
      'Moonlight',
      'Sound bath',
      'Place on selenite overnight',
      'Avoid water and salt because of calcite content',
    ],
    pairsWith: ['sodalite', 'clear-quartz', 'amethyst', 'sapphire', 'selenite'],
    tarotConnection:
      'Lapis aligns with the High Priestess and the Hierophant, the inner and outer faces of sacred wisdom. It also resonates with the Star, the constellation of true vocation.',
    faqs: [
      {
        q: 'Why does mine have gold flecks?',
        a: 'Those are pyrite, a key marker of genuine high grade lapis. Stones without pyrite may still be real but are sometimes dyed sodalite.',
      },
      {
        q: 'Can lapis get wet?',
        a: 'No prolonged water. The calcite reacts and the colour can leach in dyed stones. Wipe with a dry cloth.',
      },
      {
        q: 'How do I know if my lapis is dyed?',
        a: 'Dyed pieces leave blue marks on a damp cotton swab, and are too uniformly blue. Real lapis has subtle variation and pyrite.',
      },
      {
        q: 'Is lapis good for beginners?',
        a: 'Yes, though many feel its energy is best honoured slowly. It is a serious stone, not a casual amulet.',
      },
    ],
    relatedEntries: ['sodalite', 'sapphire', 'amethyst'],
  },
  {
    slug: 'sapphire',
    name: 'Sapphire',
    category: 'clarity',
    hardness: 9,
    zodiac: ['Virgo', 'Libra', 'Sagittarius'],
    chakras: ['Throat', 'Third Eye'],
    element: 'Air',
    color: 'Most often deep blue, also yellow, pink, white, and others',
    shortDescription:
      'The blue gem variety of corundum, called the stone of wisdom and the divinely sanctioned mind.',
    longDescription:
      'Sapphire is corundum, aluminium oxide, coloured by trace iron and titanium for the classic blue. Mohs 9 makes it second only to diamond in hardness. Historic sources include Kashmir, Burma, and Sri Lanka. Sapphire has been the stone of priests, kings, and judges across cultures, set in royal regalia and ecclesiastical rings. The biblical sapphire of Exodus may have been lapis lazuli, but modern usage has long meant blue corundum. Metaphysically it is treated as the stone of the disciplined wise mind, supporting clear judgement, integrity, and devoted service. In Vedic astrology blue sapphire is the gem of Saturn and is treated with respect because of its strength.',
    keywords: ['wisdom', 'integrity', 'devotion', 'discipline', 'truth'],
    metaphysicalProperties:
      'Held to focus the mind on truth, support contemplative discipline, and align speech with deeper conviction. Considered a stone that does not flatter the user.',
    inLove:
      'Used in commitments of marriage and lifelong service. Considered a stone of fidelity and of love elevated beyond infatuation.',
    inHealing:
      'Folk associations include the eyes, throat, and fevers. In Vedic tradition treated with caution because of its strong Saturnian energy.',
    inSpirituality:
      'A stone of contemplative orders, of vows, and of the disciplined inner life. Used in meditation on truth and on the practice of integrity.',
    howToUse: [
      'Wear as a ring on the dominant hand for steadfast judgement',
      'Hold during vows or important commitments',
      'Place over the third eye in meditation',
      'Use during long contemplative practice',
      'Set on a written rule of life or personal code',
    ],
    cleansingMethods: [
      'Lukewarm water and soft cloth',
      'Moonlight',
      'Smoke cleanse',
      'Sound bath',
      'Avoid harsh chemicals on heat treated stones',
    ],
    pairsWith: ['lapis-lazuli', 'clear-quartz', 'amethyst', 'emerald', 'selenite'],
    tarotConnection:
      'Sapphire aligns with Justice, the disciplined truth, and with the Hermit, the long lamp lit search. In Vedic crossovers it links with cards of Saturn, especially those of patient endurance.',
    faqs: [
      {
        q: 'Are all sapphires blue?',
        a: 'No. Yellow, pink, white, and many other colours occur. Padparadscha is a famous orange pink variety.',
      },
      {
        q: 'Can it be worn daily?',
        a: 'Yes. Mohs 9 makes it one of the most durable gems for daily wear.',
      },
      {
        q: 'Is blue sapphire dangerous in Vedic astrology?',
        a: 'It is considered powerful and traditionally tested before long term wear. It is not dangerous physically.',
      },
      {
        q: 'How does sapphire compare to lapis?',
        a: 'Sapphire is a precious gem and a sharper, cooler energy. Lapis is a rock with deeper mythic warmth. Both are stones of wisdom in different keys.',
      },
    ],
    relatedEntries: ['lapis-lazuli', 'amethyst', 'emerald'],
  },

  // =====================================================================
  // HEALING
  // =====================================================================
  {
    slug: 'amethyst',
    name: 'Amethyst',
    category: 'healing',
    hardness: 7,
    zodiac: ['Pisces', 'Virgo', 'Aquarius', 'Capricorn'],
    chakras: ['Third Eye', 'Crown'],
    element: 'Air',
    color: 'Pale lilac to deep purple',
    shortDescription:
      'A purple variety of quartz, the most widely used healing and spiritual stone in Western tradition.',
    longDescription:
      'Amethyst is the violet variety of quartz, coloured by iron and natural irradiation. The name comes from the Greek a methystos, not drunken, because Greeks believed it prevented intoxication and carved wine cups from it. It has been used since ancient times by Egyptian, Greek, Roman, and Christian cultures, set in bishops rings as a symbol of sober integrity. In modern metaphysical practice amethyst is the most widely sold healing crystal, used for sleep, calm, sobriety, and spiritual opening. It is considered the bridge between earthly clarity and higher awareness. Famous sources include Brazil, Uruguay, and Zambia.',
    keywords: ['calm', 'spiritual protection', 'sobriety', 'sleep', 'higher awareness'],
    metaphysicalProperties:
      'Held to soothe the nervous system, support the third eye, and create a buffer between the user and chaotic external energy. Considered a stone of spiritual sobriety and of sustainable practice.',
    inLove:
      'Used to keep a clear head in intoxicating relationships and to hold space for partners through hard nights.',
    inHealing:
      'Folk associations include insomnia, headaches, anxiety, and addiction recovery. Often the first stone given to those starting healing work.',
    inSpirituality:
      'The classic meditation stone. Used at the third eye for vision, on the crown for connection, and under the pillow for restful spiritual dreams.',
    howToUse: [
      'Place a cluster on the bedside table for sleep',
      'Hold during meditation at the third eye',
      'Carry a tumbled stone through stressful days',
      'Set in the home as a calming centrepiece',
      'Use in addiction recovery as a focus stone',
    ],
    cleansingMethods: [
      'Moonlight, especially full moon',
      'Smoke cleanse',
      'Running water briefly',
      'Sound bath',
      'Avoid prolonged direct sunlight which can fade the colour',
    ],
    pairsWith: ['clear-quartz', 'rose-quartz', 'selenite', 'smoky-quartz', 'lapis-lazuli'],
    tarotConnection:
      'Amethyst aligns with the High Priestess for sustained inner sight and with Temperance for the careful blending of spiritual and earthly life. It is also a quiet companion for the Hermit.',
    faqs: [
      {
        q: 'Will amethyst fade in the sun?',
        a: 'Yes. Prolonged direct sunlight gradually lightens it. Cleanse in moonlight or indirect light.',
      },
      {
        q: 'What is the difference between amethyst and ametrine?',
        a: 'Ametrine is amethyst and citrine in the same crystal, naturally found mainly in Bolivia.',
      },
      {
        q: 'Is amethyst good for sleep?',
        a: 'It is the traditional sleep stone. Place by the bed or under the pillow with a soft pouch.',
      },
      {
        q: 'Can it get wet?',
        a: 'Yes. It is durable quartz and water safe.',
      },
    ],
    relatedEntries: ['clear-quartz', 'rose-quartz', 'selenite'],
  },
  {
    slug: 'selenite',
    name: 'Selenite',
    category: 'healing',
    hardness: 2,
    zodiac: ['Taurus', 'Cancer'],
    chakras: ['Crown'],
    element: 'Air',
    color: 'Translucent white to colourless, fibrous and pearly',
    shortDescription:
      'A gypsum mineral, soft at Mohs 2 and water soluble, traditionally linked to mental clarity and Crown chakra activation.',
    longDescription:
      'Selenite is a variety of gypsum, hydrated calcium sulphate, named for the Greek goddess of the moon, Selene. It is very soft, only Mohs 2, and dissolves slowly in water. It commonly forms long satin spar wands or large cathedral plates. The famous Cave of the Crystals at Naica in Mexico contains gypsum crystals up to twelve metres long. In modern metaphysical practice selenite is treated as a primary stone of the crown chakra and as a cleanser for other crystals. It is described by Robert Simmons as a stone of liquid light, holding a clean bright field. It does not need cleansing in the traditional sense and is often used to cleanse other stones.',
    keywords: ['clarity', 'crown', 'cleansing', 'light', 'angelic'],
    metaphysicalProperties:
      'Held to clear the auric field, support the crown chakra, and bring high mental clarity. Considered self cleansing and used as a charging plate for other crystals.',
    inLove:
      'Used to cleanse residual energy after relationships and to keep a partnership field clear of accumulated noise.',
    inHealing:
      'Folk associations include the spinal column, headaches, and the energetic field. Often used in scanning the aura with a wand.',
    inSpirituality:
      'A primary tool for opening the crown, communicating with higher guides, and clearing sacred space. Common in meditation rooms and altars.',
    howToUse: [
      'Place other crystals on a selenite plate to cleanse and charge them overnight',
      'Sweep a selenite wand through the auric field, head to toe',
      'Set at the corners of a bed for an energetic clean field',
      'Hold at the crown during meditation',
      'Use in altar work as a base for other tools',
    ],
    cleansingMethods: [
      'Generally self cleansing',
      'Moonlight refreshes its charge',
      'Smoke cleanse',
      'Sound cleanse',
      'Never use water, it dissolves selenite over time',
    ],
    pairsWith: ['amethyst', 'clear-quartz', 'rose-quartz', 'angelite', 'kyanite'],
    tarotConnection:
      'Selenite aligns with the Moon for liquid intuition, and with the Star for clear hope after difficulty. It is also a quiet companion for the Judgement card, supporting awakening.',
    faqs: [
      {
        q: 'Can selenite get wet?',
        a: 'No. It dissolves in water. Even high humidity can damage polished surfaces over time.',
      },
      {
        q: 'Is satin spar the same as selenite?',
        a: 'They are both gypsum varieties. Most market selenite wands are satin spar. The metaphysical use is treated as the same.',
      },
      {
        q: 'Why does my selenite scratch?',
        a: 'Mohs 2 is very soft. A fingernail can scratch it. Store separately in a soft cloth.',
      },
      {
        q: 'How often do I cleanse other crystals on selenite?',
        a: 'Tradition suggests overnight after heavy use, or weekly for crystals worn daily.',
      },
    ],
    relatedEntries: ['amethyst', 'clear-quartz', 'angelite'],
  },
  {
    slug: 'bloodstone',
    name: 'Bloodstone',
    category: 'healing',
    hardness: 7,
    zodiac: ['Aries', 'Pisces'],
    chakras: ['Root', 'Heart'],
    element: 'Earth',
    color: 'Dark green chalcedony with red iron oxide spots',
    shortDescription:
      'Also called heliotrope, a green chalcedony with red flecks, traditionally a stone of courage and physical vitality.',
    longDescription:
      'Bloodstone is a variety of chalcedony, a microcrystalline quartz, with characteristic red spots of iron oxide. The classic name heliotrope means turning of the sun, from the way it was thought to redden water under sunlight. In Christian tradition the red spots were said to be the blood of Christ at the crucifixion, and bloodstone was used in carved seals throughout the medieval and Renaissance periods. Pliny the Elder mentions it as a stone of warriors and athletes. Metaphysically it is a stone of physical courage, vitality, and the willingness to bleed for what matters. It supports recovery, endurance, and the integrity of the body.',
    keywords: ['courage', 'vitality', 'endurance', 'sacrifice', 'recovery'],
    metaphysicalProperties:
      'Held to anchor strength in the root chakra and bring lifeforce to the heart. Considered a stone of warriors, mothers, and those recovering from physical strain.',
    inLove:
      'Used during difficult committed seasons, for partners caring for the ill, for those choosing love through hardship.',
    inHealing:
      'Folk associations include circulation, anaemia, recovery from surgery, and the strengthening of the immune system.',
    inSpirituality:
      'A stone of grounded sacrifice, the willingness to give without losing self. Used in dedications to a path that asks for endurance.',
    howToUse: [
      'Carry during physical training',
      'Hold during convalescence',
      'Place at the base of the spine in healing layouts',
      'Use during long term commitments to a difficult goal',
      'Wear as a ring on the dominant hand',
    ],
    cleansingMethods: [
      'Running water',
      'Smoke cleanse',
      'Earth burial',
      'Sound bath',
      'Brief sunlight is acceptable',
    ],
    pairsWith: ['hematite', 'carnelian', 'rose-quartz', 'turquoise', 'tigers-eye'],
    tarotConnection:
      'Bloodstone aligns with Strength, the steady courage of the heart, and with the Nine of Wands, the wounded but standing defender. It is also useful with the Five of Pentacles for getting through hard times.',
    faqs: [
      {
        q: 'Why is it called bloodstone?',
        a: 'The red iron oxide spots looked like drops of blood. Medieval Christian tradition tied this to the crucifixion.',
      },
      {
        q: 'Is bloodstone the same as heliotrope?',
        a: 'Yes. Heliotrope is the older name.',
      },
      {
        q: 'Can it get wet?',
        a: 'Yes. It is durable chalcedony, water safe.',
      },
      {
        q: 'Does bloodstone really help anaemia?',
        a: 'There is no medical evidence. The traditional usage is symbolic and emotional, supporting energetic resilience during recovery.',
      },
    ],
    relatedEntries: ['hematite', 'carnelian', 'turquoise'],
  },
  {
    slug: 'carnelian',
    name: 'Carnelian',
    category: 'healing',
    hardness: 7,
    zodiac: ['Taurus', 'Cancer', 'Leo', 'Virgo'],
    chakras: ['Sacral', 'Root'],
    element: 'Fire',
    color: 'Translucent orange to deep red brown',
    shortDescription:
      'An orange chalcedony, traditionally a stone of life force, sexuality, and creative drive.',
    longDescription:
      'Carnelian is a translucent orange to red variety of chalcedony, coloured by iron oxide. It has been carved into seals and amulets since ancient Egyptian and Mesopotamian times and was set in the breastplate of the Hebrew high priest. In Islamic tradition it was favoured by the prophet Muhammad. Metaphysically it is a stone of warm vital energy, of the sacral chakra, of fertility, sexuality, and creative passion. Where amethyst calms, carnelian stirs. Where rose quartz softens, carnelian engages.',
    keywords: ['vitality', 'creativity', 'sexuality', 'courage', 'life force'],
    metaphysicalProperties:
      'Held to ignite the sacral chakra, restore vitality after fatigue, and stoke creative and sexual energy. Considered a stone of warm enthusiasm and felt aliveness.',
    inLove:
      'Used to restore desire in long term partnerships and to reawaken the body after illness or grief.',
    inHealing:
      'Folk associations include reproductive health, lower back pain, low energy, and convalescence. Often used after grief to bring colour back.',
    inSpirituality:
      'A stone of embodied spirituality, of the body as sacred. Used in fertility rituals, creative dedications, and life force restoration.',
    howToUse: [
      'Place over the lower abdomen during meditation',
      'Carry through creative projects',
      'Hold during exercise to support stamina',
      'Wear during dance, performance, or sexual practice',
      'Use in fertility altars',
    ],
    cleansingMethods: [
      'Running water',
      'Smoke cleanse',
      'Brief sunlight',
      'Sound bath',
      'Earth burial',
    ],
    pairsWith: ['citrine', 'tigers-eye', 'rose-quartz', 'bloodstone', 'turquoise'],
    tarotConnection:
      'Carnelian aligns with the Empress for embodied creative life, the Knight of Wands for forward driving passion, and the Sun for restored vitality.',
    faqs: [
      {
        q: 'Is carnelian dyed?',
        a: 'Many on the market are heat treated chalcedony or sard. Natural carnelian shows subtle colour zoning. Heat treatment is considered acceptable in most traditions.',
      },
      {
        q: 'What is the difference between sard and carnelian?',
        a: 'Sard is darker brownish red, carnelian a brighter orange red. Both are chalcedony.',
      },
      {
        q: 'Can it fade?',
        a: 'Slight fading in long sun exposure is possible. Brief charging is fine.',
      },
      {
        q: 'Is it good for shyness?',
        a: 'Yes. It is traditionally used to embolden quieter natures.',
      },
    ],
    relatedEntries: ['citrine', 'tigers-eye', 'bloodstone'],
  },
  {
    slug: 'turquoise',
    name: 'Turquoise',
    category: 'healing',
    hardness: 5,
    zodiac: ['Sagittarius', 'Pisces', 'Scorpio'],
    chakras: ['Throat', 'Heart'],
    element: 'Air',
    color: 'Sky blue to blue green, often with brown or black matrix',
    shortDescription:
      'A hydrated copper aluminium phosphate, sacred across Native American, Persian, and Tibetan traditions as a stone of protection, health, and truth.',
    longDescription:
      'Turquoise is a hydrated copper and aluminium phosphate, copper giving the blue, iron the green. It is one of the oldest known gemstones, used by Egyptians, Persians, Aztecs, Tibetans, and the Pueblo and Navajo peoples. The name comes from Old French Turquoise meaning Turkish, because it reached Europe through Turkey from Persian mines. Persian sky blue, Sleeping Beauty, and Kingman are well known sources. Metaphysically it is a stone of protection, healing, and truthful speech. Many traditions consider it a master healer that links heaven, earth, and the human throat. It changes colour with body chemistry and time, considered evidence of its sympathy with the wearer.',
    keywords: ['protection', 'truth', 'master healer', 'unity', 'sky'],
    metaphysicalProperties:
      'Held to bridge the heart and throat, supporting truthful loving speech and broad spectrum healing. Considered a stone of integration of earth and sky.',
    inLove:
      'Used in long term partnerships, in protective gifts between loved ones, and in honest speaking when love asks for truth.',
    inHealing:
      'Folk associations include lungs, immune system, throat, and recovery from chronic conditions. Many indigenous traditions consider it the master healing stone.',
    inSpirituality:
      'A stone of sky communion, used in shamanic practice, in vision quest, and as protection for travellers physical and astral.',
    howToUse: [
      'Wear as a pendant or ring as a continuous ally',
      'Place over the throat during truth telling',
      'Carry during travel for safety',
      'Hold during ceremony connecting heaven and earth',
      'Set near the bed during illness',
    ],
    cleansingMethods: [
      'Smoke cleanse with sage or cedar',
      'Moonlight',
      'Sound bath',
      'Avoid water, perfume, and oils which can discolour it',
      'Brief earth burial',
    ],
    pairsWith: ['carnelian', 'lapis-lazuli', 'jade', 'amethyst', 'angelite'],
    tarotConnection:
      'Turquoise aligns with the World, integration of body, heart, mind, and spirit, and with the High Priestess for sacred protection. It is also linked to the Star, healing under open sky.',
    faqs: [
      {
        q: 'Why does turquoise change colour?',
        a: 'It is porous and absorbs oils, soap, and skin chemistry over time. Tradition treats this as the stone bonding with its wearer.',
      },
      {
        q: 'Is stabilised turquoise real?',
        a: 'Yes, it is real turquoise infused with resin to harden it. Untreated natural turquoise is rare and expensive.',
      },
      {
        q: 'How do I tell real from fake?',
        a: 'Fakes are often dyed howlite or magnesite. Real turquoise has subtle colour variation and natural matrix patterns rather than uniform print.',
      },
      {
        q: 'Can it get wet?',
        a: 'Avoid prolonged water and soap. Wipe with a soft dry cloth.',
      },
    ],
    relatedEntries: ['carnelian', 'lapis-lazuli', 'jade'],
  },

  // =====================================================================
  // SPIRITUALITY
  // =====================================================================
  {
    slug: 'moonstone',
    name: 'Moonstone',
    category: 'spirituality',
    hardness: 6,
    zodiac: ['Cancer', 'Scorpio', 'Libra'],
    chakras: ['Crown', 'Third Eye'],
    element: 'Water',
    color: 'White, peach, grey, or rainbow with adularescent sheen',
    shortDescription:
      'A potassium feldspar of the orthoclase family, named for the soft moonlike sheen called adularescence.',
    longDescription:
      'Moonstone is a sodium potassium aluminium silicate of the feldspar family, with thin alternating layers of orthoclase and albite that scatter light to produce the characteristic floating glow called adularescence. The finest blue sheen moonstone comes from Sri Lanka and southern India. Rainbow moonstone, technically white labradorite, comes from Madagascar and India. In Indian tradition it is the sacred stone of Chandra, the moon, and is associated with goddesses across cultures, from Diana to Selene to Isis. Metaphysically it is the canonical feminine stone, used for cycles, intuition, dream work, and the deep wisdom of the body.',
    keywords: ['feminine', 'cycles', 'intuition', 'dreams', 'tides'],
    metaphysicalProperties:
      'Held to attune the user to lunar cycles, support intuition, and gentle the emotional tides. Considered a stone of receptivity rather than projection.',
    inLove:
      'Used in new beginnings, in fertility work, in long distance love. Traditionally exchanged by lovers in the East to ensure passion remains tender.',
    inHealing:
      'Folk associations include menstrual and hormonal cycles, fertility, and digestion in the lunar tradition that connects gut and emotion.',
    inSpirituality:
      'A primary stone for moon rituals, for goddess work, and for working with cycles of beginning, fullness, and release.',
    howToUse: [
      'Wear during the days around the new and full moon',
      'Hold during dreamwork and journaling on the moon cycle',
      'Place on the lower belly during cycle attunement',
      'Carry through travel as a traditional traveller stone',
      'Use in altars to lunar deities',
    ],
    cleansingMethods: [
      'Moonlight, especially the full moon',
      'Sound bath',
      'Smoke cleanse',
      'Brief water rinse',
      'Avoid prolonged sun and harsh chemicals',
    ],
    pairsWith: ['labradorite', 'selenite', 'rose-quartz', 'amethyst', 'angelite'],
    tarotConnection:
      'Moonstone is the natural stone of the Moon card, the realm of dreams, tides, and inner mystery. It also pairs with the High Priestess and the Empress in their lunar aspect.',
    faqs: [
      {
        q: 'Is rainbow moonstone real moonstone?',
        a: 'Mineralogically it is white labradorite, but it is widely accepted as moonstone in trade and in metaphysical use.',
      },
      {
        q: 'Why does mine glow blue?',
        a: 'That is adularescence, the scattering of light by the layered feldspar structure. Strong blue sheen is the most prized.',
      },
      {
        q: 'Is moonstone only for women?',
        a: 'No. Many men use it for intuition and cyclic awareness. It is associated with the feminine principle in everyone.',
      },
      {
        q: 'Can it get wet?',
        a: 'Briefly. Avoid prolonged soaking and chemicals.',
      },
    ],
    relatedEntries: ['labradorite', 'selenite', 'rose-quartz'],
  },
  {
    slug: 'labradorite',
    name: 'Labradorite',
    category: 'spirituality',
    hardness: 6,
    zodiac: ['Leo', 'Scorpio', 'Sagittarius'],
    chakras: ['Third Eye', 'Crown'],
    element: 'Water',
    color: 'Grey base with iridescent flashes of blue, gold, green, violet',
    shortDescription:
      'A plagioclase feldspar prized for the iridescent flash called labradorescence, used as a stone of magic and inner truth.',
    longDescription:
      'Labradorite is a plagioclase feldspar discovered in 1770 in Labrador, Canada, where it remains a major source. The aurora like flash, called labradorescence, is caused by light scattering at lamellar twin planes within the crystal. Inuit tradition holds that labradorite is the frozen fire of the aurora borealis, released when a warrior struck a piece with a spear. In modern metaphysical practice it is treated as the stone of magic and the magician, used to access deeper layers of consciousness, to develop psychic ability, and to recognise destiny. It has a more enigmatic temperament than moonstone, more visionary and less domestic.',
    keywords: ['magic', 'transformation', 'intuition', 'destiny', 'inner fire'],
    metaphysicalProperties:
      'Held to awaken latent psychic abilities, protect the auric field during inner work, and reveal the deeper purpose under everyday life. Considered the stone of becoming who you are.',
    inLove:
      'Used to recognise soul level connections rather than surface attractions. A stone of fated meetings.',
    inHealing:
      'Folk associations include eyes, the brain, and stress related conditions in those who suppress imagination.',
    inSpirituality:
      'A stone of the inner magician. Used in deep meditation, in shamanic journey, in the discovery of one true work in the world.',
    howToUse: [
      'Hold during deep meditation on life direction',
      'Place at the third eye during psychic development practice',
      'Wear during ritual, divination, or tarot reading',
      'Set on a journal during dream incubation',
      'Carry through life transitions',
    ],
    cleansingMethods: [
      'Moonlight',
      'Smoke cleanse',
      'Sound bath',
      'Brief water rinse',
      'Avoid prolonged sun and harsh chemicals',
    ],
    pairsWith: ['moonstone', 'amethyst', 'selenite', 'kyanite', 'opal'],
    tarotConnection:
      'Labradorite aligns with the Magician for actualised inner power, with the High Priestess for the veil parted, and with the Star for destiny becoming visible.',
    faqs: [
      {
        q: 'What causes labradorescence?',
        a: 'Microscopic twin layers in the feldspar scatter light to produce the flashing colour. The angle of view changes which colours appear.',
      },
      {
        q: 'Is spectrolite different from labradorite?',
        a: 'Spectrolite is a Finnish variety with full spectrum flash. It is the same mineral, exceptional quality.',
      },
      {
        q: 'Can it get wet?',
        a: 'Briefly. Avoid soaking and harsh detergents.',
      },
      {
        q: 'Is labradorite scary?',
        a: 'Some find it intense at first. It tends to amplify whatever is unresolved beneath the surface, which can feel sharp before it clears.',
      },
    ],
    relatedEntries: ['moonstone', 'kyanite', 'opal'],
  },
  {
    slug: 'opal',
    name: 'Opal',
    category: 'spirituality',
    hardness: 6,
    zodiac: ['Cancer', 'Libra', 'Pisces', 'Scorpio'],
    chakras: ['Crown', 'Heart'],
    element: 'Water',
    color: 'Variable, often white, black, blue, or fire with rainbow play of colour',
    shortDescription:
      'A hydrated silica mineraloid prized for play of colour, traditionally a stone of imagination and emotional truth.',
    longDescription:
      'Opal is hydrated silica, SiO2 nH2O, an amorphous mineraloid, not a true crystal. Precious opal contains ordered spheres of silica that diffract light to produce play of colour. Australian black, white, and crystal opals dominate the market, with Ethiopian Welo material and Mexican fire opal also prominent. Roman writers called it the queen of gems for its rainbow within. In medieval Europe superstitions briefly turned against opal, partly because it was rumoured unlucky for those not born in October, a superstition with no real tradition behind it. Metaphysically opal is the stone of amplified emotion, imagination, and the mirroring of the inner state. Robert Simmons calls it a stone that intensifies what one already is.',
    keywords: ['imagination', 'emotional amplification', 'creativity', 'inner mirror', 'play'],
    metaphysicalProperties:
      'Held to amplify whatever is felt, both desired and undesired. Considered a stone of honest emotion and creative inspiration that asks for self awareness.',
    inLove:
      'Used in passionate connections, in artistic partnerships, in creative collaborations. Asks for emotional honesty.',
    inHealing:
      'Folk associations include the eyes, the lungs, and emotional release. Best used when one is willing to feel rather than suppress.',
    inSpirituality:
      'A stone of the imagination as a sacred faculty. Used in creative dedication, in dreamwork, and in the play of consciousness.',
    howToUse: [
      'Wear during creative work',
      'Hold during journaling or art making',
      'Place on the bedside table for vivid dreams',
      'Use during tarot reading or oracle work',
      'Set on a written prayer of true desire',
    ],
    cleansingMethods: [
      'Moonlight',
      'Sound bath',
      'Smoke cleanse with gentle herbs',
      'Avoid heat, sudden temperature change, and prolonged dryness which can crack the stone',
      'Store in a cool place with a small piece of moist cotton if dry climate',
    ],
    pairsWith: ['moonstone', 'labradorite', 'amethyst', 'selenite', 'rose-quartz'],
    tarotConnection:
      'Opal aligns with the Empress for fertile creative imagination, with the Moon for inner tides, and with the Fool for the play of the new.',
    faqs: [
      {
        q: 'Why does opal sometimes crack?',
        a: 'It contains water and is sensitive to heat and rapid drying. Treat it like a living thing, away from heaters and direct sun.',
      },
      {
        q: 'Is opal really unlucky?',
        a: 'No. The superstition is largely traceable to a single nineteenth century novel and a market protecting diamonds. Cultures across the world have long honoured opal.',
      },
      {
        q: 'What is the difference between common and precious opal?',
        a: 'Precious opal has play of colour. Common opal is opaque and lacks fire but can still carry the soft opal energy.',
      },
      {
        q: 'Can opal get wet?',
        a: 'Solid Australian opals tolerate brief water. Ethiopian Welo opal is hydrophane and can change colour temporarily when wet. Avoid soaking.',
      },
    ],
    relatedEntries: ['moonstone', 'labradorite', 'amethyst'],
  },
  {
    slug: 'kyanite',
    name: 'Kyanite',
    category: 'spirituality',
    hardness: 6,
    zodiac: ['Aries', 'Taurus', 'Libra'],
    chakras: ['Throat', 'Third Eye', 'Crown'],
    element: 'Air',
    color: 'Most often blue, also black and green, in long blade like crystals',
    shortDescription:
      'A polymorphic aluminium silicate, considered self cleansing and aligning, used to balance the chakras.',
    longDescription:
      'Kyanite is aluminium silicate, Al2SiO5, with an unusual property called anisotropic hardness, measuring around 4 along its length and 7 across, depending on the direction. It crystallises in long blue blades, with classic localities in Brazil, Nepal, and Switzerland. Black kyanite is fan shaped and brittle. Green kyanite is rare and prized for heart work. Metaphysically it is one of the few stones traditionally said never to need cleansing because it does not retain negative energy. Robert Simmons describes it as a stone of instant alignment of the subtle bodies. It is often used as a final tuning stone after deeper crystal work.',
    keywords: ['alignment', 'self cleansing', 'communication', 'cord cutting', 'tuning'],
    metaphysicalProperties:
      'Held to align all chakras, particularly the throat and third eye, and to clear stuck energy. Considered self cleansing and useful for cleansing other stones.',
    inLove:
      'Used to tune communication after misunderstanding and to cut energetic cords from past relationships.',
    inHealing:
      'Folk associations include the throat, brain, and nervous system. Often used to ease stuck patterns in body or mind.',
    inSpirituality:
      'A stone of the bridge, used to tune the field after meditation, journey work, or healing. Pairs as a finishing stone with deeper opening crystals.',
    howToUse: [
      'Sweep a blade through the auric field for tuning',
      'Place across the throat for clear communication',
      'Use black kyanite fans for cord cutting',
      'Set on other crystals to refresh them',
      'Hold during meditation as a final clearing tool',
    ],
    cleansingMethods: [
      'Generally self cleansing',
      'Smoke cleanse',
      'Sound bath',
      'Moonlight to charge',
      'Avoid water and impacts as kyanite blades are fragile',
    ],
    pairsWith: ['amethyst', 'selenite', 'lapis-lazuli', 'labradorite', 'angelite'],
    tarotConnection:
      'Kyanite aligns with the Hanged Man for new perspective and surrender, and with Temperance for the gentle blending of forces. It also resonates with the King of Swords for clear truthful expression.',
    faqs: [
      {
        q: 'Does kyanite really not need cleansing?',
        a: 'Tradition says so. Many practitioners still occasionally cleanse it as a respectful practice, though it is not strictly required.',
      },
      {
        q: 'Why is the hardness uneven?',
        a: 'Kyanite is anisotropic. Along the length it is softer, around Mohs 4. Across the length it is closer to Mohs 7. This is also why it is used as a tuning blade.',
      },
      {
        q: 'Can kyanite get wet?',
        a: 'Avoid prolonged water. The blades can split along their cleavage.',
      },
      {
        q: 'What is black kyanite used for?',
        a: 'Especially for cord cutting and clearing. The fan shape is swept through the field like a brush.',
      },
    ],
    relatedEntries: ['selenite', 'amethyst', 'lapis-lazuli'],
  },
  {
    slug: 'angelite',
    name: 'Angelite',
    category: 'spirituality',
    hardness: 4,
    zodiac: ['Aquarius'],
    chakras: ['Throat', 'Crown'],
    element: 'Air',
    color: 'Pale sky blue, opaque',
    shortDescription:
      'A trade name for compressed pale blue anhydrite, used as a stone of angelic communication and gentle peace.',
    longDescription:
      'Angelite is anhydrite, anhydrous calcium sulphate, in its pale blue compressed form, mainly from Peru. It is the same mineral family as gypsum but without water. Mohs hardness is around 3.5, soft enough to scratch with a fingernail edge. Anhydrite slowly absorbs water and converts to gypsum, which is one reason angelite must be kept dry. The trade name angelite emerged in the 1980s and the stone has been adopted as the modern stone of angelic and spirit guide communication. It is gentler than lapis or labradorite, more about quiet peace than dramatic vision.',
    keywords: ['angels', 'peace', 'gentle communication', 'forgiveness', 'serenity'],
    metaphysicalProperties:
      'Held to open soft communication with guides, ease anxiety, and hold a quiet protected field. Considered a stone of acceptance and benevolent connection.',
    inLove:
      'Used to soften communication, especially with those who have passed, and to hold faith in the rightness of the connection.',
    inHealing:
      'Folk associations include the throat, thyroid, and nervous system. Often used in grief support after the loss of a loved one.',
    inSpirituality:
      'A primary modern stone for angel work, for prayer, for connecting with deceased loved ones, and for serenity practice.',
    howToUse: [
      'Hold during prayer or angel meditation',
      'Place over the throat to soften speech',
      'Set on the bedside table for peaceful sleep',
      'Carry through grief',
      'Use in altar work alongside white candles',
    ],
    cleansingMethods: [
      'Moonlight',
      'Smoke cleanse',
      'Sound bath',
      'Place on selenite overnight',
      'Never use water, it converts back to gypsum and dulls',
    ],
    pairsWith: ['selenite', 'amethyst', 'rose-quartz', 'kyanite', 'moonstone'],
    tarotConnection:
      'Angelite aligns with the Star, hope and serenity after difficulty, and with Temperance, the angelic blending of inner forces. It also pairs with Judgement for forgiveness and reconciliation.',
    faqs: [
      {
        q: 'Can angelite get wet?',
        a: 'No. It is anhydrite and absorbs water, converting to gypsum and ruining the polish.',
      },
      {
        q: 'Is angelite the same as celestite?',
        a: 'No. Celestite is strontium sulphate and forms transparent blue crystals. Angelite is opaque anhydrite. Both are used for angelic energy.',
      },
      {
        q: 'Is angelite good for beginners?',
        a: 'Yes. It is one of the gentler high vibration stones, well suited to those starting prayer or meditation.',
      },
      {
        q: 'How do I tell real from fake?',
        a: 'Real angelite is opaque, soft, slightly waxy, and sometimes shows white anhydrite veins. Bright glassy pieces are usually dyed quartz or glass.',
      },
    ],
    relatedEntries: ['selenite', 'amethyst', 'moonstone'],
  },
];

export function getCrystalEntry(slug: string): CrystalEntry | null {
  return crystalEntries.find(entry => entry.slug === slug) ?? null;
}

export function getCrystalsByCategory(category: CrystalCategory): CrystalEntry[] {
  return crystalEntries.filter(entry => entry.category === category);
}
