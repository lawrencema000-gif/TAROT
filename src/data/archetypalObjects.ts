// 10 archetypal Western objects for the 3D sandbox. Each is a simple
// primitive geometry + color + name so users can place them without
// heavy asset downloads. Meanings drive the AI-prompted interpretation
// when the arrangement is submitted.

export interface ArchetypalObject {
  id: string;
  name: string;
  geometry: 'sphere' | 'cone' | 'cylinder' | 'box' | 'torus' | 'octahedron';
  color: string;   // hex
  scale: number;
  meaning: string;
}

export const ARCHETYPAL_OBJECTS: ArchetypalObject[] = [
  { id: 'owl',    name: 'Owl',    geometry: 'sphere',     color: '#8e6eb5', scale: 0.6,
    meaning: 'Inner wisdom, night vision, patience with the unknown.' },
  { id: 'sword',  name: 'Sword',  geometry: 'cylinder',   color: '#cbd5e1', scale: 1.2,
    meaning: 'Discernment, clarity, the cut between truth and untruth.' },
  { id: 'crown',  name: 'Crown',  geometry: 'torus',      color: '#d4af37', scale: 0.7,
    meaning: 'Sovereignty, responsibility, what you are ready to own.' },
  { id: 'tree',   name: 'Tree',   geometry: 'cone',       color: '#4ade80', scale: 1.0,
    meaning: 'Growth rooted in the past; patience; cycles.' },
  { id: 'stone',  name: 'Stone',  geometry: 'octahedron', color: '#94a3b8', scale: 0.8,
    meaning: 'Foundation, weight, what holds steady when everything shifts.' },
  { id: 'water',  name: 'Water',  geometry: 'sphere',     color: '#60a5fa', scale: 0.9,
    meaning: 'Emotion, flow, unconscious material rising.' },
  { id: 'spiral', name: 'Spiral', geometry: 'torus',      color: '#c084fc', scale: 0.8,
    meaning: 'Cycle, return, the same lesson at a new altitude.' },
  { id: 'flame',  name: 'Flame',  geometry: 'cone',       color: '#f97316', scale: 0.7,
    meaning: 'Will, courage, the thing you will not let die.' },
  { id: 'key',    name: 'Key',    geometry: 'cylinder',   color: '#fbbf24', scale: 0.5,
    meaning: 'Access, a threshold waiting to be crossed.' },
  { id: 'eye',    name: 'Eye',    geometry: 'sphere',     color: '#fda4af', scale: 0.5,
    meaning: 'Witness, self-awareness, being seen.' },
];
