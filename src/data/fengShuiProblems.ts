// Common feng shui problems + remedies.
//
// 30+ specific issues that come up in real homes. Each entry describes
// the problem, why it matters, and a concrete fix. Designed as a
// scrollable diagnostic — users can scan and check which apply to
// their space.

export interface FengShuiProblem {
  id: string;
  /** Where in the home this typically occurs. */
  location: 'Bedroom' | 'Office' | 'Front Door' | 'Kitchen' | 'Bathroom' | 'Living Room' | 'General';
  severity: 'high' | 'medium' | 'low';
  problem: string;
  why: string;
  remedy: string;
}

export const FENG_SHUI_PROBLEMS: FengShuiProblem[] = [
  // ─── Bedroom ────────────────────────────────────────────────────
  {
    id: 'bed-facing-door',
    location: 'Bedroom',
    severity: 'high',
    problem: 'Bed directly in line with the bedroom door (feet pointing toward door, head against opposite wall).',
    why: 'Called the "coffin position" because in old Chinese homes, the dead were laid out feet-toward-door. Energetically, the door\'s qi flow points straight at the body all night, disturbing sleep and inviting health issues.',
    remedy: 'Move the bed to the diagonal corner from the door (the "command position"). If the room layout makes that impossible, place a heavy footboard, a bench, or a sturdy plant at the foot of the bed to break the line.',
  },
  {
    id: 'mirror-facing-bed',
    location: 'Bedroom',
    severity: 'high',
    problem: 'A mirror reflects the bed.',
    why: 'The reflected energy creates a third presence in the room, often manifesting as relationship instability for couples and disturbed sleep for singles. The mirror also bounces qi back at the sleeping body all night.',
    remedy: 'Move the mirror so it does not reflect the bed. If you cannot, drape it with cloth at night. Inside-cabinet mirrors are fine.',
  },
  {
    id: 'beam-over-bed',
    location: 'Bedroom',
    severity: 'high',
    problem: 'Structural beam (or sloped ceiling) directly above the bed.',
    why: 'The compressive energy pushes down on whatever body part is below it. If above the head, headaches and mental fog. If above the chest, anxiety. If above the hips, reproductive or digestive issues.',
    remedy: 'Move the bed if possible. If not, install a four-poster bed with a solid canopy, or hang silk fabric to soften the visual line of the beam.',
  },
  {
    id: 'window-behind-headboard',
    location: 'Bedroom',
    severity: 'medium',
    problem: 'Headboard against a window (no solid wall behind the head).',
    why: 'No "mountain" backing. Qi escapes constantly, and the sleeper feels energetically unsupported, which surfaces as career instability and anxious decision-making.',
    remedy: 'Reposition the bed so the head is against a solid wall. If unavoidable, hang heavy blackout curtains and keep them closed at night to mimic the wall.',
  },
  {
    id: 'toilet-behind-headboard',
    location: 'Bedroom',
    severity: 'high',
    problem: 'A toilet sits directly on the other side of the wall behind the headboard.',
    why: 'Plumbing carries energy down and out — your head is pressed against a constant drain. Often correlates with chronic low-grade health issues and mental fatigue.',
    remedy: 'Move the bed off-axis so the headboard isn\'t directly aligned with the toilet. Place a metal bagua mirror flat on the wall behind the headboard, facing inward toward the bed (it acts as a barrier).',
  },
  {
    id: 'bed-under-window',
    location: 'Bedroom',
    severity: 'medium',
    problem: 'Bed positioned directly under a window (window above the headboard).',
    why: 'Same as window-behind-headboard but more severe — the qi flow over the head all night creates a feeling of impermanence and rootlessness.',
    remedy: 'Move the bed against a solid wall. If absolutely impossible, install heavy curtains and a substantial headboard.',
  },
  {
    id: 'electronics-bedroom',
    location: 'Bedroom',
    severity: 'low',
    problem: 'TV, large screen, or charging electronics by the bed.',
    why: 'Yang (active) energy disturbs the yin (restful) energy needed for deep sleep. Phones especially — the chargers create electromagnetic noise in your sleeping field.',
    remedy: 'Charge phones in another room, or at least across the room, not on the nightstand. Cover the TV with cloth at night. Remove anything with a blinking light.',
  },

  // ─── Office / Desk ──────────────────────────────────────────────
  {
    id: 'desk-back-to-door',
    location: 'Office',
    severity: 'high',
    problem: 'Desk facing a wall with your back to the door.',
    why: 'The "betrayal position" — you cannot see who enters, your back is exposed, and confidence erodes over months of working this way. Career stagnation often traces to this single layout choice.',
    remedy: 'Rotate the desk to face the door from across the room with a wall behind your back. If the room shape forces a back-to-door layout, place a small mirror on your monitor or on the wall in front of you so you can see the door reflected.',
  },
  {
    id: 'sharp-corner-pointed-at-desk',
    location: 'Office',
    severity: 'medium',
    problem: 'A piece of furniture (cabinet edge, shelf corner) points its sharp corner directly at where you sit.',
    why: 'Called "poison arrow" energy — the corner directs cutting qi at the worker. Manifests as recurring small injuries, friction with collaborators, deals that fall through at the last moment.',
    remedy: 'Move the offending furniture, place a plant in front of the corner to soften it, or drape fabric over the corner.',
  },
  {
    id: 'office-window-behind',
    location: 'Office',
    severity: 'medium',
    problem: 'Working with the window behind you.',
    why: 'Lack of solid backing for career. The view through the window pulls focus, and the unstable backing translates to wavering decisions.',
    remedy: 'Rotate the desk so the window is to your side or in front. The view in front is fine — the wall belongs behind.',
  },

  // ─── Front Door / Entry ─────────────────────────────────────────
  {
    id: 'front-door-facing-back-door',
    location: 'Front Door',
    severity: 'high',
    problem: 'Front door directly in line with back door (or large window) — qi enters and immediately exits.',
    why: 'No time for energy to circulate through the home before leaving. Often correlates with money flowing through the household without accumulating.',
    remedy: 'Place a piece of furniture, a screen, a tall plant, or a wind chime between the two doors to slow the flow. Even a runner rug can help break the line.',
  },
  {
    id: 'front-door-facing-stairs',
    location: 'Front Door',
    severity: 'high',
    problem: 'Front door opens directly onto a staircase going up.',
    why: 'Incoming opportunity goes straight up to the second floor and out, bypassing the main living levels. Often correlates with money "appearing" but never quite landing.',
    remedy: 'Place a low table or plant at the base of the stairs to slow the qi. Hang a faceted crystal between the door and the stairs to redirect.',
  },
  {
    id: 'mirror-facing-front-door',
    location: 'Front Door',
    severity: 'medium',
    problem: 'A mirror is positioned directly facing the front door.',
    why: 'Reflects incoming qi straight back out before it can enter and circulate. Opportunities visit but don\'t stay.',
    remedy: 'Move the mirror to a side wall (still in the entry but not facing the door). Mirrors on side walls are excellent — they expand the entry and welcome energy.',
  },
  {
    id: 'cluttered-entry',
    location: 'Front Door',
    severity: 'medium',
    problem: 'Shoes piled, jackets hanging in disorder, or general clutter at the front entry.',
    why: 'The mouth of qi is the most important threshold. Clutter here means every entering opportunity has to push past obstacles.',
    remedy: 'Install a closed shoe cabinet. Hang jackets on a discreet rack. Keep the floor clear within 3 feet of the door. This is the single highest-impact 30-minute fix in the entire feng shui practice.',
  },

  // ─── Kitchen ────────────────────────────────────────────────────
  {
    id: 'stove-facing-sink',
    location: 'Kitchen',
    severity: 'medium',
    problem: 'Stove burners directly face the sink.',
    why: 'Fire-water clash. Surfaces as arguments in the home, especially between partners during meal preparation hours.',
    remedy: 'Place a wood cutting board, a small wooden bowl, or a clay pot on the counter between them — wood is the mediating element between fire and water.',
  },
  {
    id: 'broken-stove-burner',
    location: 'Kitchen',
    severity: 'medium',
    problem: 'A broken or never-used burner on the stove.',
    why: 'The stove is symbolically tied to family wealth. Every working burner represents an active income stream.',
    remedy: 'Repair or replace immediately. If a burner truly cannot be fixed, rotate use of the working burners equally so they all see daily use.',
  },
  {
    id: 'bathroom-above-kitchen',
    location: 'Kitchen',
    severity: 'medium',
    problem: 'A bathroom on the floor above is directly over the kitchen.',
    why: 'Drainage above food preparation is energetically corrupting — the family\'s nourishment sits under what gets flushed away.',
    remedy: 'Paint the kitchen ceiling deep red, hang a heavy beam-patterned light fixture, or place a wide swathe of red fabric on the ceiling to symbolically "lift" the energy.',
  },

  // ─── Bathroom ───────────────────────────────────────────────────
  {
    id: 'bathroom-door-open',
    location: 'Bathroom',
    severity: 'medium',
    problem: 'Bathroom door routinely left open.',
    why: 'Continuous drain on the home\'s qi. The bathroom is the room most consistently set against the household — keeping its door open lets that draining energy bleed into the rest of the home.',
    remedy: 'Make closing the bathroom door (and the toilet lid) a habit. Train the household. This single rule resolves most bathroom-related feng shui issues.',
  },
  {
    id: 'leaky-faucet',
    location: 'Bathroom',
    severity: 'high',
    problem: 'A faucet, showerhead, or pipe with a slow leak.',
    why: 'Continuous slow drain on family finances. The correlation is uncannily reliable — fix the leak, and unexpected money tends to show up within weeks.',
    remedy: 'Repair immediately. Don\'t wait for the next plumber visit; this is the single most cost-effective feng shui fix in the home.',
  },
  {
    id: 'bathroom-in-wealth-corner',
    location: 'Bathroom',
    severity: 'medium',
    problem: 'The home\'s bathroom is located in the wealth corner (back-left from the front door).',
    why: 'The bagua wealth corner is where prosperity gathers — having a drain literally there creates constant outflow.',
    remedy: 'Keep the bathroom door closed at all times. Place a small full-length mirror on the OUTSIDE of the bathroom door to symbolically "skip over" the bathroom in the bagua. Add wood elements (plants) inside the bathroom to absorb the drain.',
  },

  // ─── General ────────────────────────────────────────────────────
  {
    id: 'broken-mirrors',
    location: 'General',
    severity: 'high',
    problem: 'Cracked, chipped, or damaged mirrors anywhere in the home.',
    why: 'Mirrors carry the qi of the space. Damaged mirrors fragment that qi and reflect distorted energy back. Living with a broken mirror is one of the worst-tolerated states in feng shui — even skeptics report better moods after replacing them.',
    remedy: 'Replace immediately. Don\'t hang the new one until the broken one is out of the home.',
  },
  {
    id: 'dead-plants',
    location: 'General',
    severity: 'medium',
    problem: 'Wilting, dead, or struggling plants kept in the home.',
    why: 'Plants represent vitality. Dying plants pump dying energy into the room. The intent of "I\'ll save it" is sweet but the energetic cost is real.',
    remedy: 'Compost dead plants. Replace struggling ones if you cannot revive them within 2 weeks. Healthy plants only.',
  },
  {
    id: 'clutter-storage',
    location: 'General',
    severity: 'low',
    problem: 'Cluttered closets, garage, or storage spaces hidden from view.',
    why: '"Out of sight" doesn\'t mean energetically inactive — your psyche knows what\'s in there. Hidden clutter creates a low-grade weight on decision-making, especially around big life moves.',
    remedy: 'Schedule a single weekend to declutter the worst storage area. Donate, sell, or compost. Once the worst is done, the rest gets easier. This is the slow-burn feng shui practice with the longest-lasting effects.',
  },
  {
    id: 'overhead-beams',
    location: 'General',
    severity: 'medium',
    problem: 'Exposed structural beams in main living areas, especially over seating or dining tables.',
    why: 'Compression from above creates chronic low-level fatigue and stuck-feeling for whoever sits below.',
    remedy: 'Drape soft fabric or hang lanterns from beams to soften their visual edge. Where furniture can be moved, do not place chairs or beds directly under beams.',
  },
  {
    id: 'sharp-corners-at-living-areas',
    location: 'General',
    severity: 'medium',
    problem: 'Sharp furniture corners pointing into walkways or seating.',
    why: 'Cutting qi creates micro-friction in the room\'s flow. People bicker more in rooms with too many sharp corners; tempers flare for unexplained reasons.',
    remedy: 'Round-corner-pad the worst offenders, or rotate the furniture so corners face walls rather than walkways.',
  },
  {
    id: 'too-many-electronics',
    location: 'General',
    severity: 'low',
    problem: 'Heavy concentration of electronics (multiple screens, server, large speakers) in a single room.',
    why: 'Yang energy concentration without yin balance — surfaces as restless thoughts and difficulty unwinding in that room.',
    remedy: 'Add yin elements: plants, fabric, books, soft lighting. Or relocate some electronics to spread the yang.',
  },
  {
    id: 'ringing-clocks',
    location: 'General',
    severity: 'low',
    problem: 'Loud ticking or chiming clocks in the bedroom or living areas.',
    why: 'Each tick is a micro-disturbance. The brain processes the sound even when consciously ignored, raising baseline stress.',
    remedy: 'Replace ticking clocks with silent ones. Chimes are fine in entries (announce arrival) but not in restful spaces.',
  },
  {
    id: 'paintings-of-water-near-bedroom',
    location: 'General',
    severity: 'low',
    problem: 'Paintings of large bodies of water (oceans, waterfalls, rivers) in the bedroom.',
    why: 'Active water imagery introduces yang motion into a yin space. People with rough oceans on bedroom walls report restless dreams.',
    remedy: 'Move water imagery to the entry (welcomes wealth) or the wealth corner. Keep bedroom imagery still and soft — landscapes, abstract art, calm scenes.',
  },
  {
    id: 'photos-of-deceased',
    location: 'General',
    severity: 'low',
    problem: 'Photos of deceased family members in the bedroom.',
    why: 'Mixes ancestral energy with the couple/individual\'s sleeping space. Better placed in shared family areas where ancestors are honoured collectively.',
    remedy: 'Move ancestor photos to a family altar, the living room, or a hallway — somewhere visible and honoured but not where you sleep.',
  },
  {
    id: 'too-bright-lighting',
    location: 'General',
    severity: 'low',
    problem: 'Harsh overhead lighting throughout the home (single bright bulb in each room).',
    why: 'No layered lighting means no mood differentiation between productive day-yang and restful evening-yin states.',
    remedy: 'Add lamps (table, floor, sconces). At least 3 light sources per main room. Use warmer bulbs in evenings.',
  },
];
