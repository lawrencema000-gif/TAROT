import { useState } from 'react';
import { Loader2, Sparkles, Download, RefreshCw } from 'lucide-react';
import { Card, Button, toast } from '../ui';
import { useMoonstoneSpend } from '../../hooks/useMoonstoneSpend';
import { MoonstoneCostLine } from '../moonstones/MoonstoneCostLine';
import { supabase } from '../../lib/supabase';

interface Symbolism { label: string; value: string; meaning: string }
interface PortraitData { image: string; imageMime?: string; symbolism: Symbolism[]; caption: string }

const VIBES = [
  { key: 'romantic', label: 'Romantic' },
  { key: 'grounded', label: 'Grounded' },
  { key: 'electric', label: 'Electric' },
  { key: 'soulful', label: 'Soulful' },
] as const;

/**
 * Soulmate Portrait — a symbolic, illustrated artwork of the qualities your
 * chart reaches for in a partner (Descendant + Venus + Mars + Moon).
 *
 * It is deliberately NOT a photorealistic face. We show the exact symbolism
 * that shaped the image, so it reads as an interpretation of your chart
 * rather than a claim about a real person you'll meet.
 */
export function SoulmatePortrait() {
  const { tryConsume, EarnSheet } = useMoonstoneSpend('soulmate-portrait', { cost: 150 });
  const [vibe, setVibe] = useState<(typeof VIBES)[number]['key']>('romantic');
  const [data, setData] = useState<PortraitData | null>(null);
  const [loading, setLoading] = useState(false);

  const paint = async () => {
    const ok = await tryConsume();
    if (!ok) return;
    setLoading(true);
    const { data: res, error } = await supabase.functions.invoke('ai-soulmate-portrait', { body: { vibe } });
    setLoading(false);
    if (error) {
      const msg = (error as { message?: string })?.message || '';
      toast(msg.includes('INSUFFICIENT') ? 'Not enough Moonstones' : "The portrait couldn't be painted. Try again.", 'error');
      return;
    }
    const payload = (res?.data ?? res) as PortraitData;
    if (payload?.image) setData(payload);
    else toast("The portrait couldn't be painted. Try again.", 'error');
  };

  const download = () => {
    if (!data) return;
    const a = document.createElement('a');
    const mime = data.imageMime || 'image/jpeg';
    a.href = `data:${mime};base64,${data.image}`;
    a.download = `arcana-soulmate-portrait.${mime === 'image/png' ? 'png' : 'jpg'}`;
    a.click();
    toast('Saved', 'success');
  };

  return (
    <Card padding="lg" className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-gold" />
        <h3 className="heading-display-md text-mystic-100">Portrait of the beloved</h3>
      </div>

      {!data && (
        <>
          <p className="text-sm text-mystic-400 leading-relaxed">
            An illustrated portrait of the qualities your chart reaches for in love — painted from your
            Descendant, Venus, Mars, and Moon. Symbolic art, not a photo of a real person.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {VIBES.map((v) => (
              <button key={v.key} onClick={() => setVibe(v.key)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${vibe === v.key ? 'bg-gold/15 border-gold/50 text-gold' : 'border-mystic-700 text-mystic-400 hover:border-mystic-500'}`}>
                {v.label}
              </button>
            ))}
          </div>
          <Button variant="gold" fullWidth onClick={paint} disabled={loading} className="min-h-[48px]">
            {loading
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Painting your portrait…</>
              : <><Sparkles className="w-4 h-4 mr-2" /> Paint the portrait</>}
          </Button>
          <MoonstoneCostLine cost={150} />
        </>
      )}

      {data && (
        <div className="space-y-3">
          <img
            src={`data:${data.imageMime || 'image/jpeg'};base64,${data.image}`}
            alt="Symbolic illustrated portrait generated from your chart's relationship symbolism"
            className="w-full rounded-2xl border border-gold/20 shadow-lg"
          />
          <p className="text-sm text-mystic-300 leading-relaxed">{data.caption}</p>

          <div className="space-y-1.5 pt-1 border-t border-mystic-800/40">
            <p className="text-[10px] uppercase tracking-widest text-mystic-500 pt-2">Why it looks like this</p>
            {data.symbolism.map((s) => (
              <div key={s.label} className="text-[13px]">
                <span className="text-gold">{s.label} in {s.value}</span>
                <span className="text-mystic-400"> — {s.meaning}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={download}>
              <Download className="w-4 h-4 mr-2" /> Save
            </Button>
            <Button variant="ghost" className="flex-1" onClick={() => setData(null)}>
              <RefreshCw className="w-4 h-4 mr-2" /> Repaint
            </Button>
          </div>

          <p className="text-[11px] text-mystic-600 italic text-center">
            An artistic interpretation of your chart's symbolism — not a depiction of a real person.
          </p>
        </div>
      )}
      {EarnSheet}
    </Card>
  );
}
