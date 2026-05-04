import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from '../components/ui';
import { setPageMeta } from '../utils/seo';

interface Position {
  name: string;
  meaning: string;
}

interface SavedSpread {
  id: string;
  name: string;
  description: string;
  positions: Position[];
  created_at: string;
}

const MAX_POSITIONS = 13;

export function SpreadBuilderPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [positions, setPositions] = useState<Position[]>([
    { name: '', meaning: '' },
    { name: '', meaning: '' },
    { name: '', meaning: '' },
  ]);
  const [saving, setSaving] = useState(false);
  const [savedSpreads, setSavedSpreads] = useState<SavedSpread[]>([]);

  useEffect(() => {
    setPageMeta('Custom Spread Builder', 'Design your own tarot spread with custom card positions and meanings.');
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from('custom_spreads')
      .select('id, name, description, positions, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (cancelled || !data) return;
        setSavedSpreads(data as SavedSpread[]);
      });
    return () => { cancelled = true; };
  }, [user]);

  const updatePosition = (i: number, field: keyof Position, value: string) => {
    setPositions((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));
  };

  const addPosition = () => {
    if (positions.length >= MAX_POSITIONS) return;
    setPositions((prev) => [...prev, { name: '', meaning: '' }]);
  };

  const removePosition = (i: number) => {
    if (positions.length <= 1) return;
    setPositions((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSave = async () => {
    if (!user) {
      toast('Sign in to save spreads', 'error');
      return;
    }
    if (!name.trim()) {
      toast('Give your spread a name', 'error');
      return;
    }
    const cleaned = positions.filter((p) => p.name.trim() && p.meaning.trim());
    if (cleaned.length < 1) {
      toast('Add at least one position with a name and meaning', 'error');
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from('custom_spreads')
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description.trim(),
        positions: cleaned,
      })
      .select('id, name, description, positions, created_at')
      .single();
    setSaving(false);
    if (error) {
      toast(error.message, 'error');
      return;
    }
    if (data) {
      setSavedSpreads((prev) => [data as SavedSpread, ...prev]);
      setName('');
      setDescription('');
      setPositions([{ name: '', meaning: '' }, { name: '', meaning: '' }, { name: '', meaning: '' }]);
      toast('Spread saved', 'success');
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('custom_spreads').delete().eq('id', id);
    if (error) {
      toast(error.message, 'error');
      return;
    }
    setSavedSpreads((prev) => prev.filter((s) => s.id !== id));
    toast('Spread deleted', 'info');
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-mystic-300 mb-4">Sign in to design custom spreads.</p>
        <button onClick={() => navigate('/signin')} className="px-5 py-2 rounded-xl bg-gradient-to-r from-gold via-gold-dark to-gold text-mystic-950 font-semibold">
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
      <button onClick={() => navigate('/spreads')} className="inline-flex items-center gap-1 text-xs text-mystic-500 hover:text-mystic-300 mb-3">
        <ArrowLeft className="w-3 h-3" /> All spreads
      </button>

      <header className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-gold" />
          <h1 className="heading-display-xl text-mystic-100">Custom spread builder</h1>
        </div>
        <p className="text-sm text-mystic-400">
          Design your own spread with up to {MAX_POSITIONS} positions. Save unlimited custom spreads tied to your account.
        </p>
      </header>

      <section className="rounded-2xl border border-mystic-800/60 bg-mystic-900/40 p-4 mb-6">
        <label className="block mb-3">
          <span className="text-xs uppercase tracking-wider text-mystic-500 mb-1 block">Spread name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Morning intention"
            className="w-full px-3 py-2 rounded-lg bg-mystic-950 border border-mystic-800 text-mystic-100 focus:border-gold/50 outline-none"
            maxLength={80}
          />
        </label>
        <label className="block mb-3">
          <span className="text-xs uppercase tracking-wider text-mystic-500 mb-1 block">Description (optional)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="When to use this spread, what kind of question it answers…"
            className="w-full px-3 py-2 rounded-lg bg-mystic-950 border border-mystic-800 text-mystic-100 focus:border-gold/50 outline-none min-h-[60px]"
            maxLength={500}
            rows={3}
          />
        </label>

        <h2 className="text-sm font-medium text-mystic-300 mb-2 mt-5">Positions</h2>
        <div className="space-y-3">
          {positions.map((p, i) => (
            <div key={i} className="rounded-xl border border-mystic-800/60 bg-mystic-950/40 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gold/15 border border-gold/30 text-gold text-xs flex items-center justify-center font-display">{i + 1}</span>
                <input
                  type="text"
                  value={p.name}
                  onChange={(e) => updatePosition(i, 'name', e.target.value)}
                  placeholder="Position name (e.g. The challenge)"
                  className="flex-1 px-2 py-1 rounded-lg bg-mystic-950 border border-mystic-800 text-mystic-100 focus:border-gold/50 outline-none text-sm"
                  maxLength={60}
                />
                {positions.length > 1 && (
                  <button onClick={() => removePosition(i)} className="p-1 text-mystic-500 hover:text-mystic-200" aria-label="Remove">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <textarea
                value={p.meaning}
                onChange={(e) => updatePosition(i, 'meaning', e.target.value)}
                placeholder="What this position represents…"
                className="w-full px-2 py-1 rounded-lg bg-mystic-950 border border-mystic-800 text-mystic-300 focus:border-gold/50 outline-none text-sm"
                rows={2}
                maxLength={300}
              />
            </div>
          ))}
        </div>

        {positions.length < MAX_POSITIONS && (
          <button
            onClick={addPosition}
            className="mt-3 w-full py-2 rounded-xl border border-dashed border-mystic-700 text-mystic-400 hover:text-mystic-200 hover:border-gold/40 transition-colors flex items-center justify-center gap-1 text-sm"
          >
            <Plus className="w-4 h-4" /> Add position ({positions.length}/{MAX_POSITIONS})
          </button>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-gold via-gold-dark to-gold text-mystic-950 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save spread'}
        </button>
      </section>

      {savedSpreads.length > 0 && (
        <section>
          <h2 className="font-display text-lg text-mystic-100 mb-3">Your saved spreads</h2>
          <div className="space-y-3">
            {savedSpreads.map((s) => (
              <div key={s.id} className="rounded-xl border border-mystic-800/60 bg-mystic-900/40 p-4">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h3 className="font-medium text-mystic-100">{s.name}</h3>
                  <button onClick={() => handleDelete(s.id)} className="p-1 text-mystic-500 hover:text-red-400" aria-label="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {s.description && <p className="text-xs text-mystic-400 mb-2">{s.description}</p>}
                <div className="text-xs text-mystic-500">
                  {s.positions.length} position{s.positions.length === 1 ? '' : 's'} · {new Date(s.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
