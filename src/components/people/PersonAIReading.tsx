import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Card, Button, toast } from '../ui';
import { useMoonstoneSpend } from '../../hooks/useMoonstoneSpend';
import { MoonstoneCostLine } from '../moonstones/MoonstoneCostLine';
import { supabase } from '../../lib/supabase';

const FOCUS = [
  { key: 'overview', label: 'Overview' },
  { key: 'love', label: 'Love' },
  { key: 'career', label: 'Career' },
  { key: 'growth', label: 'Growth' },
] as const;

/** AI chart reading for a saved person — moonstone-gated (server does the
 *  authoritative debit; this hook only gate-checks + shows the earn sheet). */
export function PersonAIReading({ personId, personName }: { personId: string; personName: string }) {
  const { tryConsume, EarnSheet } = useMoonstoneSpend('person-reading');
  const [focus, setFocus] = useState<(typeof FOCUS)[number]['key']>('overview');
  const [reading, setReading] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reveal = async () => {
    const ok = await tryConsume();
    if (!ok) return;
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('ai-person-reading', { body: { personId, focus } });
    setLoading(false);
    if (error) {
      const msg = (error as { message?: string })?.message || '';
      toast(msg.includes('INSUFFICIENT') ? 'Not enough Moonstones' : 'Reading failed. Try again.', 'error');
      return;
    }
    setReading((data?.data?.reading ?? data?.reading) as string);
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-gold" />
        <h3 className="heading-display-md text-mystic-100">AI reading</h3>
      </div>

      {!reading && (
        <>
          <div className="flex flex-wrap gap-2">
            {FOCUS.map((f) => (
              <button key={f.key} onClick={() => setFocus(f.key)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${focus === f.key ? 'bg-gold/15 border-gold/50 text-gold' : 'border-mystic-700 text-mystic-400 hover:border-mystic-500'}`}>
                {f.label}
              </button>
            ))}
          </div>
          <p className="text-sm text-mystic-400">A personal, chart-grounded interpretation of {personName}'s stars.</p>
          <Button variant="primary" size="md" fullWidth onClick={reveal} disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Reading the stars…</> : <>Reveal reading</>}
          </Button>
          <MoonstoneCostLine cost={50} />
        </>
      )}

      {reading && (
        <div className="space-y-3">
          <p className="text-[15px] text-mystic-200 leading-relaxed whitespace-pre-line">{reading}</p>
          <button onClick={() => setReading(null)} className="text-xs text-gold hover:text-gold-light">Read another focus →</button>
        </div>
      )}
      {EarnSheet}
    </Card>
  );
}
