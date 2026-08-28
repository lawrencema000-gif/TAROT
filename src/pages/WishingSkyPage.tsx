import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Heart, Flag, HandHeart, X } from 'lucide-react';
import { Card, Button, Input, EyebrowLabel, Sheet, toast } from '../components/ui';
import { WishSky } from '../components/wishes/WishSky';
import { wishes as wishesDal } from '../dal';
import {
  WISH_THEMES, buildLinks, findsContactDetails,
  type Wish, type WishEcho, type WishTheme,
} from '../dal/wishes';
import { useAuth } from '../context/AuthContext';
import { setPageMeta } from '../utils/seo';

const MAX_WISH = 280;

/**
 * The Wishing Sky.
 *
 * One sky, shared by everyone. A wish lights a star; echoing someone's wish
 * draws a line between your star and theirs.
 *
 * On contact details: a wish is public and permanent-feeling, and a public list
 * of people stating a need next to a phone number is how scams find their
 * marks. So a wisher can open themselves to help, and a helper writes to them
 * PRIVATELY — the wisher decides whether to answer and what to share. Same
 * kindness, no targeting list.
 */
export function WishingSkyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [sky, setSky] = useState<Wish[]>([]);
  const [echoes, setEchoes] = useState<WishEcho[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Wish | null>(null);
  const [composing, setComposing] = useState(false);
  const [offering, setOffering] = useState(false);

  const [text, setText] = useState('');
  const [theme, setTheme] = useState<WishTheme>('other');
  const [openToHelp, setOpenToHelp] = useState(false);
  const [label, setLabel] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPageMeta(
      'The Wishing Sky',
      'A shared sky where every wish is a star. Make a wish, and see it light up beside everyone else’s.',
    );
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [skyRes, echoRes] = await Promise.all([wishesDal.listSky(), wishesDal.listEchoes()]);
    if (skyRes.ok) setSky(skyRes.data);
    if (echoRes.ok) setEchoes(echoRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const links = useMemo(() => buildLinks(sky, echoes), [sky, echoes]);
  const myWishIds = useMemo(
    () => new Set(user ? sky.filter((w) => w.userId === user.id).map((w) => w.id) : []),
    [sky, user],
  );
  const myEchoes = useMemo(
    () => new Set(user ? echoes.filter((e) => e.userId === user.id).map((e) => e.wishId) : []),
    [echoes, user],
  );

  const contactWarning = findsContactDetails(text);

  const submitWish = async () => {
    if (!user || !text.trim()) return;
    setSaving(true);
    const res = await wishesDal.makeWish(user.id, {
      text, theme, openToHelp, wisherLabel: openToHelp ? label : null,
    });
    setSaving(false);
    if (!res.ok) { toast(res.error, 'error'); return; }
    setSky((prev) => [res.data, ...prev]);
    setComposing(false);
    setText(''); setLabel(''); setOpenToHelp(false);
    toast('Your star is lit.', 'success');
  };

  const toggleEcho = async (wish: Wish) => {
    if (!user) { toast('Sign in to echo a wish.', 'error'); return; }
    const had = myEchoes.has(wish.id);
    // Optimistic: the sky should respond instantly, and a failed echo is
    // recoverable by reloading.
    setEchoes((prev) => had
      ? prev.filter((e) => !(e.wishId === wish.id && e.userId === user.id))
      : [...prev, { wishId: wish.id, userId: user.id }]);
    setSky((prev) => prev.map((w) =>
      w.id === wish.id ? { ...w, echoCount: Math.max(0, w.echoCount + (had ? -1 : 1)) } : w));
    const res = had
      ? await wishesDal.unecho(wish.id, user.id)
      : await wishesDal.echo(wish.id, user.id);
    if (!res.ok) { toast(res.error, 'error'); load(); }
  };

  const sendOffer = async () => {
    if (!user || !selected || !offerMessage.trim()) return;
    setSaving(true);
    const res = await wishesDal.offerHelp(selected.id, user.id, offerMessage);
    setSaving(false);
    if (!res.ok) { toast(res.error, 'error'); return; }
    setOffering(false); setOfferMessage('');
    toast('Sent. They will see it privately and can reply if they want to.', 'success');
  };

  const reportWish = async (wish: Wish) => {
    if (!user) return;
    const res = await wishesDal.report(wish.id, user.id);
    toast(res.ok ? 'Reported. Thank you — we will look at it.' : 'Could not send the report.', res.ok ? 'success' : 'error');
  };

  const themeLabel = (k: WishTheme) => WISH_THEMES.find((t) => t.key === k)?.label ?? 'Something else';

  return (
    <div className="space-y-5 pb-28">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-mystic-400 hover:text-mystic-200">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="space-y-1">
        <EyebrowLabel>The Wishing Sky</EyebrowLabel>
        <h1 className="heading-display-xl text-mystic-100">Everyone’s wishes, in one sky</h1>
        <p className="text-sm text-mystic-400 leading-relaxed">
          Every star here is someone’s wish. Make one and yours joins them. When you echo a wish —
          say you want it for them too — a line is drawn between your star and theirs.
        </p>
      </div>

      {/* The sky itself. Deliberately tall: it is the point of the page. */}
      <div className="relative rounded-2xl overflow-hidden border border-mystic-800/60 bg-[#070912]"
           style={{ height: 'min(60vh, 460px)' }}>
        {loading ? (
          <div className="absolute inset-0 grid place-items-center text-sm text-mystic-500">
            Lighting the sky…
          </div>
        ) : sky.length === 0 ? (
          <div className="absolute inset-0 grid place-items-center text-center px-8">
            <div>
              <p className="text-mystic-300 text-sm">The sky is empty tonight.</p>
              <p className="text-mystic-500 text-xs mt-1">Make the first wish and light it.</p>
            </div>
          </div>
        ) : (
          <WishSky
            wishes={sky} links={links} myWishIds={myWishIds}
            selectedId={selected?.id ?? null} onSelect={setSelected}
          />
        )}

        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
          <span className="text-[11px] text-mystic-500 bg-black/40 rounded-full px-2 py-1 backdrop-blur-sm">
            {sky.length} {sky.length === 1 ? 'wish' : 'wishes'}
            {links.length > 0 && <> · {links.length} linked</>}
          </span>
          {user && (
            <Button variant="primary" size="sm" className="pointer-events-auto"
                    onClick={() => setComposing(true)}>
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Make a wish
            </Button>
          )}
        </div>
      </div>

      {!user && (
        <Card className="p-4">
          <p className="text-sm text-mystic-300">
            Sign in to add your own star and to echo other people’s wishes.
          </p>
        </Card>
      )}

      {/* The readable sky. A canvas is invisible to a screen reader, and some
          people simply prefer a list — so the wishes exist twice, in full. */}
      <Card className="p-4 space-y-1">
        <h2 className="heading-display-md text-mystic-100 mb-2">Recent wishes</h2>
        {sky.slice(0, 30).map((w) => (
          <button
            key={w.id}
            onClick={() => setSelected(w)}
            className="w-full text-left py-2.5 border-b border-mystic-800/40 last:border-0 hover:bg-mystic-900/40 rounded-lg px-2 -mx-2 transition-colors"
          >
            <p className="text-sm text-mystic-200 leading-relaxed">{w.text}</p>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-mystic-600">
              <span>{themeLabel(w.theme)}</span>
              {w.echoCount > 0 && <span>· {w.echoCount} {w.echoCount === 1 ? 'echo' : 'echoes'}</span>}
              {w.openToHelp && <span className="text-teal">· open to help</span>}
              {myWishIds.has(w.id) && <span className="text-gold">· yours</span>}
            </div>
          </button>
        ))}
        {sky.length === 0 && !loading && (
          <p className="text-sm text-mystic-500">No wishes yet.</p>
        )}
      </Card>

      {/* ── compose ── */}
      <Sheet open={composing} onClose={() => setComposing(false)} title="Make a wish">
        <div className="space-y-4">
          <div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_WISH))}
              rows={4}
              placeholder="I wish…"
              className="w-full rounded-xl bg-mystic-900/60 border border-mystic-700 p-3 text-sm text-mystic-100 placeholder:text-mystic-600 focus:border-gold/50 focus:outline-none"
            />
            <div className="flex justify-between items-start gap-2 mt-1">
              <p className="text-[11px] text-mystic-600">
                Everyone using Arcana can read this.
              </p>
              <span className="text-[11px] text-mystic-600 flex-shrink-0">{text.length}/{MAX_WISH}</span>
            </div>
            {contactWarning && (
              <p className="text-[12px] text-coral mt-2 leading-relaxed">
                That looks like {contactWarning === 'email' ? 'an email address' : 'a phone number'}.
                Please take it out — a wish is public, and contact details on a public wish are how
                scams find people. Turn on “open to help” below instead, and anyone kind can write to
                you privately.
              </p>
            )}
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-mystic-500 mb-1.5 block">What is it about?</label>
            <div className="flex flex-wrap gap-2">
              {WISH_THEMES.map((t) => (
                <button key={t.key} type="button" onClick={() => setTheme(t.key)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${theme === t.key ? 'bg-gold/15 border-gold/50 text-gold' : 'border-mystic-700 text-mystic-300 hover:border-mystic-500'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-mystic-800 p-3 space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={openToHelp}
                     onChange={(e) => setOpenToHelp(e.target.checked)}
                     className="mt-1 accent-gold w-4 h-4" />
              <span>
                <span className="text-sm text-mystic-200">Let people offer to help</span>
                <span className="block text-[12px] text-mystic-500 leading-relaxed mt-0.5">
                  Anyone can send you a private message about this wish. They never see your
                  contact details — you read what they wrote and decide whether to reply.
                </span>
              </span>
            </label>
            {openToHelp && (
              <Input
                label="A name to go by (optional)"
                value={label}
                onChange={(e) => setLabel(e.target.value.slice(0, 40))}
                placeholder="First name, a nickname, or nothing at all"
              />
            )}
          </div>

          <Button variant="primary" fullWidth disabled={!text.trim() || !!contactWarning || saving}
                  onClick={submitWish}>
            <Sparkles className="w-4 h-4 mr-2" />
            {saving ? 'Lighting…' : 'Light my star'}
          </Button>
        </div>
      </Sheet>

      {/* ── a single wish ── */}
      <Sheet open={!!selected && !offering} onClose={() => setSelected(null)} title="A wish">
        {selected && (
          <div className="space-y-4">
            <p className="text-base text-mystic-100 leading-relaxed">{selected.text}</p>
            <div className="text-xs text-mystic-500">
              {themeLabel(selected.theme)}
              {selected.wisherLabel && <> · {selected.wisherLabel}</>}
              {selected.echoCount > 0 && <> · {selected.echoCount} {selected.echoCount === 1 ? 'echo' : 'echoes'}</>}
            </div>

            <div className="flex flex-wrap gap-2">
              {user && selected.userId !== user.id && (
                <Button variant={myEchoes.has(selected.id) ? 'primary' : 'outline'} size="sm"
                        onClick={() => toggleEcho(selected)}>
                  <Heart className="w-3.5 h-3.5 mr-1.5" />
                  {myEchoes.has(selected.id) ? 'Echoed' : 'I wish this too'}
                </Button>
              )}
              {user && selected.openToHelp && selected.userId !== user.id && (
                <Button variant="outline" size="sm" onClick={() => setOffering(true)}>
                  <HandHeart className="w-3.5 h-3.5 mr-1.5" /> Offer to help
                </Button>
              )}
              {user && selected.userId !== user.id && (
                <Button variant="ghost" size="sm" onClick={() => reportWish(selected)}>
                  <Flag className="w-3.5 h-3.5 mr-1.5" /> Report
                </Button>
              )}
              {user && selected.userId === user.id && (
                <span className="text-xs text-mystic-500 self-center">This one is yours.</span>
              )}
            </div>

            {myEchoes.has(selected.id) && (
              <p className="text-[12px] text-mystic-500 leading-relaxed">
                Your star and theirs are linked in the sky now.
              </p>
            )}
          </div>
        )}
      </Sheet>

      {/* ── offer help ── */}
      <Sheet open={offering} onClose={() => setOffering(false)} title="Offer to help">
        <div className="space-y-4">
          <p className="text-sm text-mystic-400 leading-relaxed">
            This goes only to them. They will see your message and can reply if they want to —
            neither of you has to share anything you would rather not.
          </p>
          <textarea
            value={offerMessage}
            onChange={(e) => setOfferMessage(e.target.value.slice(0, 500))}
            rows={4}
            placeholder="What you could do, and how you would like to help…"
            className="w-full rounded-xl bg-mystic-900/60 border border-mystic-700 p-3 text-sm text-mystic-100 placeholder:text-mystic-600 focus:border-gold/50 focus:outline-none"
          />
          <Button variant="primary" fullWidth disabled={!offerMessage.trim() || saving} onClick={sendOffer}>
            {saving ? 'Sending…' : 'Send privately'}
          </Button>
          <button onClick={() => setOffering(false)}
                  className="w-full text-xs text-mystic-500 inline-flex items-center justify-center gap-1">
            <X className="w-3 h-3" /> Never mind
          </button>
        </div>
      </Sheet>

      <p className="text-center text-xs text-mystic-600 max-w-sm mx-auto">
        Wishes are public and anyone can read them. Never put a phone number, an address or an email
        in one — if you are open to help, people can reach you privately instead.
      </p>
    </div>
  );
}
