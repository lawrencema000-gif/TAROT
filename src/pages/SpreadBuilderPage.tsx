import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, Play } from 'lucide-react';
import { TarotCardIcon } from '../components/ui/NavIcons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Button, Page, PageHeader, EyebrowLabel, Sheet, toast } from '../components/ui';
import { setPageMeta } from '../utils/seo';
import { useT } from '../i18n/useT';
import { getLocale } from '../i18n/config';
import { MAX_AI_TAROT_CARDS } from '../services/readingInterpretation';
import { signInPathFor } from '../components/layout/authReturn';

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

/**
 * A custom spread is cast as a tarot reading, and generate-reading reads at
 * most ten tarot cards: an eleven-card spread could never have its AI
 * interpretation, however often the reader retried. The builder stops
 * where the reading can follow.
 */
const MAX_POSITIONS = MAX_AI_TAROT_CARDS;

export function SpreadBuilderPage() {
  const { t } = useT('app');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [positions, setPositions] = useState<Position[]>([
    { name: '', meaning: '' },
    { name: '', meaning: '' },
    { name: '', meaning: '' },
  ]);
  const [saving, setSaving] = useState(false);
  const [savedSpreads, setSavedSpreads] = useState<SavedSpread[]>([]);
  /** The saved spread whose delete is being confirmed (R5 M-8: destructive actions ask). */
  const [pendingDelete, setPendingDelete] = useState<SavedSpread | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setPageMeta(
      t('spreadBuilder.metaTitle', { defaultValue: 'Custom Spread Builder' }),
      t('spreadBuilder.metaDescription', { defaultValue: 'Design your own tarot spread with custom card positions and meanings.' }),
    );
  }, [t]);

  /** The saved date in the app's language ("2026年10月2日"), not the browser's. */
  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium' }).format(new Date(iso));

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
      toast(t('spreadBuilder.toasts.signInToSave', { defaultValue: 'Sign in to save this spread.' }), 'error');
      return;
    }
    if (!name.trim()) {
      toast(t('spreadBuilder.toasts.nameRequired', { defaultValue: 'Give your spread a name before saving.' }), 'error');
      return;
    }
    const cleaned = positions.filter((p) => p.name.trim() && p.meaning.trim());
    if (cleaned.length < 1) {
      toast(t('spreadBuilder.toasts.positionRequired', { defaultValue: 'Add at least one position with both a name and a meaning.' }), 'error');
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
      console.error('[SpreadBuilder] Save failed:', error.message);
      toast(t('spreadBuilder.toasts.saveFailed', { defaultValue: 'Couldn’t save your spread — check your connection and try again.' }), 'error');
      return;
    }
    if (data) {
      setSavedSpreads((prev) => [data as SavedSpread, ...prev]);
      setName('');
      setDescription('');
      setPositions([{ name: '', meaning: '' }, { name: '', meaning: '' }, { name: '', meaning: '' }]);
      toast(t('spreadBuilder.toasts.saved', { defaultValue: 'Spread saved — it’s listed under Your saved spreads.' }), 'success');
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const { error } = await supabase.from('custom_spreads').delete().eq('id', id);
      if (error) {
        console.error('[SpreadBuilder] Delete failed:', error.message);
        toast(t('spreadBuilder.toasts.deleteFailed', { defaultValue: 'Couldn’t delete that spread — check your connection and try again.' }), 'error');
        return;
      }
      setSavedSpreads((prev) => prev.filter((s) => s.id !== id));
      toast(t('spreadBuilder.toasts.deleted', { defaultValue: 'Spread deleted.' }), 'info');
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  if (!user) {
    return (
      <Page className="py-16 text-center">
        <p className="text-mystic-300 mb-4">{t('spreadBuilder.signInPrompt', { defaultValue: 'Custom spreads are saved to your account.' })}</p>
        <Button variant="gold" onClick={() => navigate(signInPathFor(pathname))}>
          {t('spreadBuilder.signInCta', { defaultValue: 'Sign in to build a spread' })}
        </Button>
      </Page>
    );
  }

  return (
    <Page className="py-6 sm:py-10">
      <PageHeader
        onBack={() => navigate('/spreads')}
        backLabel={t('spreadDetail.allSpreads', { defaultValue: 'All spreads' })}
        icon={<TarotCardIcon />}
        title={t('spreadBuilder.title', { defaultValue: 'Custom spread builder' })}
        subtitle={t('spreadBuilder.subtitle', {
          n: MAX_POSITIONS,
          defaultValue: 'Design your own spread with up to {{n}} positions. Save unlimited custom spreads tied to your account.',
        })}
      />

      <section className="rounded-card border border-mystic-800/60 bg-mystic-900/40 p-4">
        <label className="block mb-3">
          <EyebrowLabel className="block mb-1">{t('spreadBuilder.nameLabel', { defaultValue: 'Spread name' })}</EyebrowLabel>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('spreadBuilder.namePlaceholder', { defaultValue: 'e.g. Morning intention' })}
            className="w-full px-3 py-2 rounded-control bg-mystic-950 border border-mystic-800 text-mystic-100 focus:border-gold/50 outline-none"
            maxLength={80}
          />
        </label>
        <label className="block mb-3">
          <EyebrowLabel className="block mb-1">{t('spreadBuilder.descriptionLabel', { defaultValue: 'Description (optional)' })}</EyebrowLabel>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('spreadBuilder.descriptionPlaceholder', { defaultValue: 'When to use this spread, what kind of question it answers…' })}
            className="w-full px-3 py-2 rounded-control bg-mystic-950 border border-mystic-800 text-mystic-100 focus:border-gold/50 outline-none min-h-[60px]"
            maxLength={500}
            rows={3}
          />
        </label>

        <h2 className="text-ui font-medium text-mystic-300 mb-2 mt-5">{t('spreadBuilder.positions', { defaultValue: 'Positions' })}</h2>
        <div className="space-y-3">
          {positions.map((p, i) => (
            <div key={i} className="rounded-control border border-mystic-800/60 bg-mystic-950/40 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gold/15 border border-gold/30 text-gold text-caption font-semibold tabular-nums flex items-center justify-center">{i + 1}</span>
                <input
                  type="text"
                  value={p.name}
                  onChange={(e) => updatePosition(i, 'name', e.target.value)}
                  placeholder={t('spreadBuilder.positionNamePlaceholder', { defaultValue: 'Position name (e.g. The challenge)' })}
                  className="flex-1 px-2 py-1 rounded-control bg-mystic-950 border border-mystic-800 text-mystic-100 focus:border-gold/50 outline-none text-ui"
                  maxLength={60}
                />
                {positions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePosition(i)}
                    className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] -my-2 text-mystic-500 hover:text-mystic-200"
                    aria-label={t('spreadBuilder.removePosition', { n: i + 1, defaultValue: 'Remove position {{n}}' })}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden />
                  </button>
                )}
              </div>
              <textarea
                value={p.meaning}
                onChange={(e) => updatePosition(i, 'meaning', e.target.value)}
                placeholder={t('spreadBuilder.positionMeaningPlaceholder', { defaultValue: 'What this position represents…' })}
                className="w-full px-2 py-1 rounded-control bg-mystic-950 border border-mystic-800 text-mystic-300 focus:border-gold/50 outline-none text-ui"
                rows={2}
                maxLength={300}
              />
            </div>
          ))}
        </div>

        {positions.length < MAX_POSITIONS && (
          <button
            onClick={addPosition}
            className="mt-3 w-full py-2 min-h-[44px] rounded-control border border-dashed border-mystic-700 text-mystic-400 hover:text-mystic-200 hover:border-gold/40 transition-colors flex items-center justify-center gap-1 text-ui"
          >
            <Plus className="w-4 h-4" aria-hidden />
            {t('spreadBuilder.addPosition', { n: positions.length, max: MAX_POSITIONS, defaultValue: 'Add position ({{n}}/{{max}})' })}
          </button>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 w-full py-3 min-h-[48px] rounded-control bg-gold text-mystic-950 font-semibold text-ui disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? t('spreadBuilder.saving', { defaultValue: 'Saving…' }) : t('spreadBuilder.save', { defaultValue: 'Save spread' })}
        </button>
      </section>

      {savedSpreads.length > 0 && (
        <section>
          <h2 className="heading-display-md text-mystic-100 mb-3">{t('spreadBuilder.savedTitle', { defaultValue: 'Your saved spreads' })}</h2>
          <div className="space-y-3">
            {savedSpreads.map((s) => (
              <div key={s.id} className="rounded-card border border-mystic-800/60 bg-mystic-900/40 p-4">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h3 className="font-medium text-mystic-100">{s.name}</h3>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(s)}
                    className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] -my-2 -mr-2 rounded-full text-mystic-400 [@media(hover:hover)]:[&:hover:not(:active)]:text-coral active:text-coral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
                    aria-label={t('spreadBuilder.deleteSpread', { defaultValue: 'Delete {{name}}', name: s.name })}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden />
                  </button>
                </div>
                {s.description && <p className="text-meta text-mystic-400 mb-2">{s.description}</p>}
                <div className="text-meta text-mystic-500 mb-3 tabular-nums">
                  {t('spreadBuilder.positionCount', {
                    count: s.positions.length,
                    defaultValue_one: '{{count}} position',
                    defaultValue: '{{count}} positions',
                  })}
                  {' · '}
                  {formatDate(s.created_at)}
                </div>
                <button
                  onClick={() =>
                    navigate('/readings', {
                      state: {
                        customSpread: {
                          id: `custom:${s.id}`,
                          name: s.name,
                          positions: s.positions.map((p) => p.name),
                          count: s.positions.length,
                        },
                      },
                    })
                  }
                  className="w-full py-2 min-h-[44px] rounded-control bg-gold text-mystic-950 font-semibold text-ui flex items-center justify-center gap-2 motion-safe:active:scale-[0.98] transition-transform duration-fast"
                >
                  <Play className="w-4 h-4" aria-hidden /> {t('spreadBuilder.startReading', { defaultValue: 'Start a reading' })}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <Sheet
        open={!!pendingDelete}
        onClose={() => { if (!deleting) setPendingDelete(null); }}
        title={t('spreadBuilder.deleteTitle', { defaultValue: 'Delete {{name}}?', name: pendingDelete?.name ?? '' })}
      >
        {pendingDelete && (
          <div className="space-y-5">
            <p className="text-ui text-mystic-300">
              {t('spreadBuilder.deleteBody', { defaultValue: 'This removes the spread and its positions from your account. It can’t be undone.' })}
            </p>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setPendingDelete(null)} disabled={deleting}>
                {t('common:actions.cancel', { defaultValue: 'Cancel' })}
              </Button>
              <Button variant="destructive" className="flex-1" onClick={() => handleDelete(pendingDelete.id)} loading={deleting}>
                {t('common:actions.delete', { defaultValue: 'Delete' })}
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </Page>
  );
}
