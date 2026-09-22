import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Heart, Flag, HandHeart, X } from 'lucide-react';
import { Card, Button, Chip, Input, Page, Sheet, Tag, toast, PageHeader, EmptyState, MysticalStar } from '../components/ui';
import { WishSky } from '../components/wishes/WishSky';
import { wishes as wishesDal } from '../dal';
import {
  WISH_THEMES, buildLinks, findsContactDetails,
  type Wish, type WishEcho, type WishTheme,
} from '../dal/wishes';
import { useAuth } from '../context/AuthContext';
import { setPageMeta } from '../utils/seo';
import { useT } from '../i18n/useT';

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
  const { t } = useT('app');

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
    if (!res.ok) { toast(t(res.error), 'error'); return; }
    setSky((prev) => [res.data, ...prev]);
    setComposing(false);
    setText(''); setLabel(''); setOpenToHelp(false);
    toast(t('wishingSky.starLit', { defaultValue: 'Your star is lit.' }), 'success');
  };

  const toggleEcho = async (wish: Wish) => {
    if (!user) { toast(t('wishingSky.signInToEcho', { defaultValue: 'Sign in to echo a wish.' }), 'error'); return; }
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
    if (!res.ok) { toast(t(res.error), 'error'); load(); }
  };

  const sendOffer = async () => {
    if (!user || !selected || !offerMessage.trim()) return;
    setSaving(true);
    const res = await wishesDal.offerHelp(selected.id, user.id, offerMessage);
    setSaving(false);
    if (!res.ok) { toast(t(res.error), 'error'); return; }
    setOffering(false); setOfferMessage('');
    toast(t('wishingSky.offerSent', { defaultValue: 'Sent. They will see it privately and can reply if they want to.' }), 'success');
  };

  const reportWish = async (wish: Wish) => {
    if (!user) return;
    const res = await wishesDal.report(wish.id, user.id);
    toast(
      res.ok
        ? t('wishingSky.reported', { defaultValue: 'Reported. Thank you — we will look at it.' })
        : t('wishingSky.reportFailed', { defaultValue: "Couldn't send the report — try again." }),
      res.ok ? 'success' : 'error',
    );
  };

  const themeLabel = (k: WishTheme) => WISH_THEMES.find((th) => th.key === k)?.label ?? t('wishingSky.themeOther', { defaultValue: 'Something else' });

  return (
    <Page spacing="md">
      <PageHeader
        onBack={() => navigate(-1)}
        eyebrow={t('wishingSky.eyebrow', { defaultValue: 'The Wishing Sky' })}
        title={t('wishingSky.title', { defaultValue: "Everyone's wishes, in one sky" })}
        subtitle={t('wishingSky.subtitle', { defaultValue: "Every star here is someone's wish. Make one and yours joins them. When you echo a wish — say you want it for them too — a line is drawn between your star and theirs." })}
      />

      {/* The sky itself. Deliberately tall: it is the point of the page. */}
      <div className="relative rounded-2xl overflow-hidden border border-mystic-800/60 bg-[#070912]"
           style={{ height: 'min(60vh, 460px)' }}>
        {loading ? (
          <div className="absolute inset-0 grid place-items-center text-sm text-mystic-500">
            {t('wishingSky.loading', { defaultValue: 'Lighting the sky…' })}
          </div>
        ) : sky.length === 0 ? (
          <div className="absolute inset-0 grid place-items-center px-8">
            <EmptyState
              variant="inline"
              size="sm"
              icon={<Moon />}
              title={t('wishingSky.emptyTitle', { defaultValue: 'The sky is empty tonight.' })}
              description={t('wishingSky.emptyBody', { defaultValue: 'Make the first wish and light it.' })}
            />
          </div>
        ) : (
          <WishSky
            wishes={sky} links={links} myWishIds={myWishIds}
            selectedId={selected?.id ?? null} onSelect={setSelected}
          />
        )}

        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
          <Tag tone="neutral">
            {sky.length} {sky.length === 1 ? 'wish' : 'wishes'}
            {links.length > 0 && <> · {links.length} linked</>}
          </Tag>
          {user && (
            <Button variant="primary" size="sm" className="pointer-events-auto"
                    onClick={() => setComposing(true)}>
              <MysticalStar size={14} halo={false} className="mr-1.5" /> {t('wishingSky.makeWish', { defaultValue: 'Make a wish' })}
            </Button>
          )}
        </div>
      </div>

      {!user && (
        <Card className="p-4">
          <p className="text-sm text-mystic-300">
            {t('wishingSky.signInHint', { defaultValue: "Sign in to add your own star and to echo other people's wishes." })}
          </p>
        </Card>
      )}

      {/* The readable sky. A canvas is invisible to a screen reader, and some
          people simply prefer a list — so the wishes exist twice, in full. */}
      <Card className="p-4 space-y-1">
        <h2 className="heading-display-md text-mystic-100 mb-2">{t('wishingSky.recent', { defaultValue: 'Recent wishes' })}</h2>
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
              {w.openToHelp && <span className="text-teal">· {t('wishingSky.openToHelp', { defaultValue: 'open to help' })}</span>}
              {myWishIds.has(w.id) && <span className="text-gold">· {t('wishingSky.yours', { defaultValue: 'yours' })}</span>}
            </div>
          </button>
        ))}
        {sky.length === 0 && !loading && (
          <EmptyState variant="inline" size="sm" icon={<Moon />} title={t('wishingSky.noWishes', { defaultValue: 'No wishes yet.' })} />
        )}
      </Card>

      {/* ── compose ── */}
      <Sheet open={composing} onClose={() => setComposing(false)} title={t('wishingSky.makeWish', { defaultValue: 'Make a wish' })}>
        <div className="space-y-4">
          <div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_WISH))}
              rows={4}
              placeholder={t('wishingSky.placeholder', { defaultValue: 'I wish…' })}
              className="w-full rounded-xl bg-mystic-900/60 border border-mystic-700 p-3 text-sm text-mystic-100 placeholder:text-mystic-600 focus:border-gold/50 focus:outline-none"
            />
            <div className="flex justify-between items-start gap-2 mt-1">
              <p className="text-[11px] text-mystic-600">
                {t('wishingSky.publicNote', { defaultValue: 'Everyone using Arcana can read this.' })}
              </p>
              <span className="text-[11px] text-mystic-600 flex-shrink-0">{text.length}/{MAX_WISH}</span>
            </div>
            {contactWarning && (
              <p className="text-[12px] text-coral mt-2 leading-relaxed">
                {t('wishingSky.contactWarning', {
                  defaultValue: 'That looks like {{what}}. Please take it out — a wish is public, and contact details on a public wish are how scams find people. Turn on "open to help" below instead, and anyone kind can write to you privately.',
                  what: contactWarning === 'email'
                    ? t('wishingSky.anEmail', { defaultValue: 'an email address' })
                    : t('wishingSky.aPhone', { defaultValue: 'a phone number' }),
                })}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-mystic-500 mb-1.5 block">{t('wishingSky.themeLabel', { defaultValue: 'What is it about?' })}</label>
            <div className="flex flex-wrap gap-2">
              {WISH_THEMES.map((th) => (
                <Chip key={th.key} label={th.label} selected={theme === th.key} onSelect={() => setTheme(th.key)} />
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-mystic-800 p-3 space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={openToHelp}
                     onChange={(e) => setOpenToHelp(e.target.checked)}
                     className="mt-1 accent-gold w-4 h-4" />
              <span>
                <span className="text-sm text-mystic-200">{t('wishingSky.openToHelpLabel', { defaultValue: 'Let people offer to help' })}</span>
                <span className="block text-[12px] text-mystic-500 leading-relaxed mt-0.5">
                  {t('wishingSky.openToHelpBody', { defaultValue: 'Anyone can send you a private message about this wish. They never see your contact details — you read what they wrote and decide whether to reply.' })}
                </span>
              </span>
            </label>
            {openToHelp && (
              <Input
                label={t('wishingSky.nameLabel', { defaultValue: 'A name to go by (optional)' })}
                value={label}
                onChange={(e) => setLabel(e.target.value.slice(0, 40))}
                placeholder={t('wishingSky.namePlaceholder', { defaultValue: 'First name, a nickname, or nothing at all' })}
              />
            )}
          </div>

          <Button variant="primary" fullWidth disabled={!text.trim() || !!contactWarning || saving}
                  onClick={submitWish}>
            <MysticalStar size={16} halo={false} className="mr-2" />
            {saving ? t('wishingSky.lighting', { defaultValue: 'Lighting…' }) : t('wishingSky.lightStar', { defaultValue: 'Light my star' })}
          </Button>
        </div>
      </Sheet>

      {/* ── a single wish ── */}
      <Sheet open={!!selected && !offering} onClose={() => setSelected(null)} title={t('wishingSky.wishTitle', { defaultValue: 'A wish' })}>
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
                  {myEchoes.has(selected.id) ? t('wishingSky.echoed', { defaultValue: 'Echoed' }) : t('wishingSky.echo', { defaultValue: 'I wish this too' })}
                </Button>
              )}
              {user && selected.openToHelp && selected.userId !== user.id && (
                <Button variant="outline" size="sm" onClick={() => setOffering(true)}>
                  <HandHeart className="w-3.5 h-3.5 mr-1.5" /> {t('wishingSky.offerHelp', { defaultValue: 'Offer to help' })}
                </Button>
              )}
              {user && selected.userId !== user.id && (
                <Button variant="ghost" size="sm" onClick={() => reportWish(selected)}>
                  <Flag className="w-3.5 h-3.5 mr-1.5" /> {t('wishingSky.report', { defaultValue: 'Report this wish' })}
                </Button>
              )}
              {user && selected.userId === user.id && (
                <span className="text-xs text-mystic-500 self-center">{t('wishingSky.thisIsYours', { defaultValue: 'This one is yours.' })}</span>
              )}
            </div>

            {myEchoes.has(selected.id) && (
              <p className="text-[12px] text-mystic-500 leading-relaxed">
                {t('wishingSky.linked', { defaultValue: 'Your star and theirs are linked in the sky now.' })}
              </p>
            )}
          </div>
        )}
      </Sheet>

      {/* ── offer help ── */}
      <Sheet open={offering} onClose={() => setOffering(false)} title={t('wishingSky.offerHelp', { defaultValue: 'Offer to help' })}>
        <div className="space-y-4">
          <p className="text-sm text-mystic-400 leading-relaxed">
            {t('wishingSky.offerIntro', { defaultValue: 'This goes only to them. They will see your message and can reply if they want to — neither of you has to share anything you would rather not.' })}
          </p>
          <textarea
            value={offerMessage}
            onChange={(e) => setOfferMessage(e.target.value.slice(0, 500))}
            rows={4}
            placeholder={t('wishingSky.offerPlaceholder', { defaultValue: 'What you could do, and how you would like to help…' })}
            className="w-full rounded-xl bg-mystic-900/60 border border-mystic-700 p-3 text-sm text-mystic-100 placeholder:text-mystic-600 focus:border-gold/50 focus:outline-none"
          />
          <Button variant="primary" fullWidth disabled={!offerMessage.trim() || saving} onClick={sendOffer}>
            {saving ? t('wishingSky.sending', { defaultValue: 'Sending…' }) : t('wishingSky.sendPrivately', { defaultValue: 'Send privately' })}
          </Button>
          <button onClick={() => setOffering(false)}
                  className="w-full text-xs text-mystic-500 inline-flex items-center justify-center gap-1">
            <X className="w-3 h-3" /> {t('wishingSky.neverMind', { defaultValue: 'Never mind' })}
          </button>
        </div>
      </Sheet>

      <p className="text-center text-xs text-mystic-600 max-w-sm mx-auto">
        {t('wishingSky.footer', { defaultValue: 'Wishes are public and anyone can read them. Never put a phone number, an address or an email in one — if you are open to help, people can reach you privately instead.' })}
      </p>
    </Page>
  );
}
