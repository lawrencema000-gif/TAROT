import { ELEMENT_COLOR } from '../../lib/chart';

const MODALITY_COLOR: Record<string, string> = {
  Cardinal: '#d4a853', Fixed: '#c98a9b', Mutable: '#7db0d8',
};

function Bars({ data, total, colors, label }: { data: Record<string, number>; total: number; colors: Record<string, string>; label: string }) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] uppercase tracking-wider text-mystic-500">{label}</div>
      {Object.entries(data).map(([key, val]) => {
        const pct = total > 0 ? Math.round((val / total) * 100) : 0;
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="w-16 text-xs text-mystic-300">{key}</span>
            <div className="flex-1 h-2 rounded-full bg-mystic-800/60 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: colors[key] }} />
            </div>
            <span className="w-8 text-right text-xs text-mystic-400 tabular-nums">{val}</span>
          </div>
        );
      })}
    </div>
  );
}

export function ElementBalance({ elements, modalities }: { elements: Record<string, number>; modalities: Record<string, number> }) {
  const elTotal = Object.values(elements).reduce((a, b) => a + b, 0);
  const modTotal = Object.values(modalities).reduce((a, b) => a + b, 0);
  return (
    <div className="grid sm:grid-cols-2 gap-5">
      <Bars data={elements} total={elTotal} colors={ELEMENT_COLOR} label="Elements" />
      <Bars data={modalities} total={modTotal} colors={MODALITY_COLOR} label="Modalities" />
    </div>
  );
}
