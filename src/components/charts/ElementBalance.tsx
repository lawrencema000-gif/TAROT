import { Progress, type ProgressProps } from '../ui';

type Tone = NonNullable<ProgressProps['tone']>;

// Nearest primitive tone to each chart colour (lib/chart ELEMENT_COLOR and the
// old modality hexes): Fire coral, Earth teal, Air blue, Water violet;
// Cardinal gold, Fixed rose, Mutable blue.
const ELEMENT_TONE: Record<string, Tone> = {
  Fire: 'coral', Earth: 'teal', Air: 'blue', Water: 'violet',
};

const MODALITY_TONE: Record<string, Tone> = {
  Cardinal: 'gold', Fixed: 'rose', Mutable: 'blue',
};

function Bars({ data, total, tones, label }: { data: Record<string, number>; total: number; tones: Record<string, Tone>; label: string }) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] uppercase tracking-wider text-mystic-500">{label}</div>
      {Object.entries(data).map(([key, val]) => (
        <div key={key} className="flex items-center gap-2">
          <span className="w-16 text-xs text-mystic-300">{key}</span>
          <Progress value={val} max={total} size="md" tone={tones[key] ?? 'neutral'} label={key} className="flex-1" />
          <span className="w-8 text-right text-xs text-mystic-400 tabular-nums">{val}</span>
        </div>
      ))}
    </div>
  );
}

export function ElementBalance({ elements, modalities }: { elements: Record<string, number>; modalities: Record<string, number> }) {
  const elTotal = Object.values(elements).reduce((a, b) => a + b, 0);
  const modTotal = Object.values(modalities).reduce((a, b) => a + b, 0);
  return (
    <div className="grid sm:grid-cols-2 gap-5">
      <Bars data={elements} total={elTotal} tones={ELEMENT_TONE} label="Elements" />
      <Bars data={modalities} total={modTotal} tones={MODALITY_TONE} label="Modalities" />
    </div>
  );
}
