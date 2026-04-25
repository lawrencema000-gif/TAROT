// Room-specific feng shui guidance.
//
// Beyond the bagua + Kua + flying-stars systems, there is a layer of
// extremely practical room-by-room feng shui that most apps skip. This
// module captures the highest-impact specifics — bedroom orientation,
// home-office placement, kitchen rules, front-door energy. These are
// the rules that actually change a person's day-to-day experience of
// their home.

export type Room = 'bedroom' | 'office' | 'kitchen' | 'front-door' | 'living-room' | 'bathroom';

export interface RoomGuidance {
  name: string;
  rules: Array<{ rule: string; why: string }>;
  /** Avoid list — common mistakes specific to this room. */
  avoid: string[];
}

export const ROOM_GUIDANCE: Record<Room, RoomGuidance> = {
  bedroom: {
    name: 'Bedroom',
    rules: [
      {
        rule: 'Place the bed in the "command position" — diagonally across from the door, not in line with it.',
        why: 'You should be able to see the door from bed without being directly in its path. The classical phrase: "see the door, but not be the door". Direct alignment with the door is called the coffin position; the energy of the doorway disturbs sleep.',
      },
      {
        rule: 'A solid wall behind the headboard. Never under a window.',
        why: 'The wall is the "mountain" — symbolic backing and support. A window behind the head means qi escapes constantly while you sleep. If the layout forces a window behind, hang heavy curtains to mimic the solid backing.',
      },
      {
        rule: 'Equal space on both sides of the bed for couples.',
        why: 'Beds pushed against a wall on one side disadvantage that partner — they have to climb over the other to get up. Even spacing gives both partners equal access and energetically equal status in the relationship.',
      },
      {
        rule: 'The bed should not share a wall with a bathroom on the other side, especially the toilet.',
        why: 'Plumbing carries energy down and out. A toilet directly behind the headboard drains vitality and causes recurring health niggles. If unavoidable, move the bed slightly off-axis or place a metal bagua mirror flat on the wall behind the headboard.',
      },
      {
        rule: 'Headboard direction: align with one of your favorable directions (from your Kua).',
        why: 'The head is the most receptive part of the body during sleep. Pointing toward your Sheng Qi or Tian Yi direction (depending on whether you are healthy or recovering) shapes 8 hours of energetic intake. This is the single most consequential bedroom decision.',
      },
    ],
    avoid: [
      'Mirror facing the bed — most contested rule in feng shui, but the consensus is to avoid it. The reflected energy disturbs sleep and can amplify relationship conflicts. If you must, cover with cloth at night.',
      'Beam directly over the bed — the structural pressure compresses the sleeper energetically. Place a four-poster bed with a solid canopy, or move the bed.',
      'TV facing the bed — the screen acts as a small mirror when off. If you must, cover with a cloth at night.',
      'Plants in the bedroom — wood energy is too active for sleep. One small plant is okay; a jungle is not.',
      'Storage under the bed — the stagnant energy under your sleeping body affects subconscious. Leave it clear, or store only soft things you love (linens, sweaters), never paperwork or shoes.',
      'Photos of children, parents, or extended family in the bedroom — the bedroom should be a couple\'s sanctuary or a single person\'s cocoon. Family photos belong in living areas.',
      'Exercise equipment — yang energy disrupts the yin needed for sleep. Move it to a different room.',
    ],
  },
  office: {
    name: 'Home Office / Desk',
    rules: [
      {
        rule: 'Desk in the "command position" — facing the door from across the room, with a solid wall behind your back.',
        why: 'Same principle as the bed. Seeing who enters without your back to the entrance is foundational. Career feng shui rests on this single position. If your desk currently faces a wall with the door behind you, swap it — you will feel the difference within days.',
      },
      {
        rule: 'Face one of your favorable directions (Sheng Qi for ambition, Fu Wei for focus).',
        why: 'The direction you face during the most cognitively demanding hours of your day shapes your output. Sheng Qi for sales / leadership / ambition-heavy roles; Fu Wei for writing, study, contemplative work.',
      },
      {
        rule: 'A solid wall behind, not a window.',
        why: 'Windows behind you mean unstable energetic backing — career feels precarious, decisions waver. If you have a great view through the window in front, that is fine; the wall belongs behind.',
      },
      {
        rule: 'The desk should not be directly under a beam or a sloped ceiling.',
        why: 'Compressive energy above creates chronic fatigue and creative block. Move the desk if you can; otherwise drape fabric to soften the visual line.',
      },
      {
        rule: 'Plants in the office — strongly recommended for wood energy and creative growth.',
        why: 'Office is the opposite of bedroom — wood energy supports productivity. One healthy plant on or near the desk improves output and idea generation. Avoid spiky plants (cacti) which create cutting energy.',
      },
    ],
    avoid: [
      'Desk facing a wall with your back to the door — corporate-cubicle position. Saps confidence over time.',
      'Sharp corners of furniture pointing at where you sit — "poison arrow" energy. Round furniture corners or move the offender.',
      'Clutter under the desk — stops the flow at your feet. Clear it monthly.',
      'Files stacked higher than your head — pressure from unfinished work.',
    ],
  },
  kitchen: {
    name: 'Kitchen',
    rules: [
      {
        rule: 'Stove and sink should not be directly facing each other.',
        why: 'Fire (stove) and water (sink) clash. If they face each other across a galley kitchen, conflict and arguments tend to surface in the household. Add a wooden or earth element between them — a wood cutting board on the counter, a clay pot — to mediate.',
      },
      {
        rule: 'Stove should not be directly under a window.',
        why: 'Cooking energy escapes outward, weakening wealth (the stove is symbolically tied to family wealth). A solid wall behind the stove anchors prosperity.',
      },
      {
        rule: 'Stove burner direction — face one of the cook\'s favorable directions if possible.',
        why: 'Traditionally the cook faces a Sheng Qi direction while preparing food, which energetically nourishes the family. Modern kitchens make this hard, but it is worth checking when buying / renovating.',
      },
      {
        rule: 'Keep the stove clean and in working order.',
        why: 'A broken stove or unused stove burners directly correlate with stagnant family wealth. Use all burners regularly. Repair or replace promptly.',
      },
    ],
    avoid: [
      'Knives visible on a magnetic strip — the cutting energy stays in the room. Store in a drawer.',
      'Trash bins under the stove or sink visible from the door.',
      'A bathroom directly above the kitchen — drainage above food preparation is energetically corrupting. Old houses sometimes have this layout; place a heavy beam-pattern carpet between, or paint the kitchen ceiling deep red to symbolically "lift" the energy.',
    ],
  },
  'front-door': {
    name: 'Front Door',
    rules: [
      {
        rule: 'The front door is "the mouth of qi" — most important single threshold in the home.',
        why: 'All energy entering the home passes through this door. A welcoming, clean, well-lit front door with a clear path inside translates to a smooth flow of opportunity, visitors, and good fortune.',
      },
      {
        rule: 'Path from the front door must not face a wall, a staircase going up, or a long straight corridor.',
        why: 'A wall directly facing the entrance blocks energy. A straight corridor accelerates qi too fast (energy "darts" through). A staircase going up directly across leads opportunity straight to the upper floor and out — money slips away. Place a screen, plant, or small piece of furniture to slow the flow.',
      },
      {
        rule: 'Door should open INTO the house, not out.',
        why: 'Inward-opening doors invite energy in. Doors that open outward push it away.',
      },
      {
        rule: 'Lighting at the front door — bright but not harsh.',
        why: 'Dim entrances cause stagnant qi. Bright entrances invite vitality. Add a warm light or two if your entrance is dark. Leave them on briefly each evening.',
      },
    ],
    avoid: [
      'A mirror facing the front door — reflects qi back out before it can enter. Move the mirror to a side wall.',
      'Shoes piled at the door — clogs the qi entry point. Keep them in a closed cabinet.',
      'A bathroom door directly facing the front door — incoming energy goes straight into the drain. Keep the bathroom door closed. Hang a small bell on the bathroom doorknob to disperse.',
      'A back door directly visible through the front door — energy enters and immediately leaves. Add a screen, plant, or piece of furniture to slow the line.',
    ],
  },
  'living-room': {
    name: 'Living Room',
    rules: [
      {
        rule: 'Sofa against a solid wall — never floating in the middle of the room.',
        why: 'Same command-position logic as bedroom and office. People relax better with a wall behind them. Floating sofas correlate with restless guests and family that drifts apart.',
      },
      {
        rule: 'Furniture arrangement should encourage conversation in a circle, not a row.',
        why: 'Sofas pointing at the TV with no facing chairs make the TV the energetic centre — it dominates the family. A loose conversation circle — even with the TV present — keeps human connection at the centre.',
      },
      {
        rule: 'Plants, art, and books in the living room.',
        why: 'This is the family\'s shared yang space. Wood energy (plants), creative energy (art), and intellect (books) all belong here. The room should feel ALIVE.',
      },
    ],
    avoid: [
      'A heavy beam directly over a frequently used sofa — same compressive issue as bedroom.',
      'Dead or dying plants — bring in new energy, replace immediately.',
      'Religious icons facing the front door — should face inward, blessing the home.',
    ],
  },
  bathroom: {
    name: 'Bathroom',
    rules: [
      {
        rule: 'Always close the bathroom door when not in use.',
        why: 'Bathrooms drain energy by design. An open door lets qi pour into the drain continuously. This single habit fixes 80% of bathroom feng shui issues.',
      },
      {
        rule: 'Toilet lid down when not flushing.',
        why: 'Same drainage principle. Keeps the wealth qi in the room rather than spiralling down the toilet.',
      },
      {
        rule: 'Repair leaks immediately.',
        why: 'A dripping faucet is a continuous slow drain on family finances. The correlation is uncanny — fix the leak and watch unexpected money show up within weeks.',
      },
      {
        rule: 'Plants and natural elements in the bathroom — they thrive on the moisture and absorb stagnant energy.',
        why: 'Plants in the bathroom convert otherwise-wasted energy into growth. Best feng shui investment per dollar in the home.',
      },
    ],
    avoid: [
      'Bathroom in the wealth corner of the home — drains money. Keep door closed at all times. Place a small mirror on the OUTSIDE of the door to symbolically "skip" the bathroom.',
      'Bathroom sharing a wall with the bed headboard — see bedroom rules.',
      'Cluttered counters — accumulated stagnation in a room that already has drainage issues.',
    ],
  },
};
