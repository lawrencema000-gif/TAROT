import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, ChevronDown, Sun } from 'lucide-react';
import { Card, Button, Input, EyebrowLabel, SectionDivider } from '../components/ui';
import {
  MANSIONS, MANSION_ACTIVITIES, QUADRANT_INFO, PLANET7_INFO,
  mansionForDate, mansionForBirth, sukuyoMansionForBirth,
  type Mansion, type Quadrant,
} from '../data/lunarMansions';
import {
  MANSION_MEANINGS, MANSION_DAILY_ADVICE, QUADRANT_MEANINGS, MANSION_INTRO,
} from '../data/lunarMansionsContent';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n/useT';
import { setPageMeta } from '../utils/seo';

/**
 * 二十八宿 — the Twenty-Eight Lunar Mansions.
 *
 * Two readings, kept visibly separate rather than blended: the mansion
 * governing today (the Chinese 值日 cycle, which almanacs use for choosing when
 * to act) and the mansion of your birth day, which describes temperament.
 */
export function MansionsPage() {
  const navigate = useNavigate();
  const { t } = useT();
  const { profile } = useAuth();
  const [birthDate, setBirthDate] = useState(profile?.birthDate ?? '');
  // The 值日 cycle turns at midnight, so only the date matters here. We still
  // pass the profile's time through for the sukuyō reading, which is defined on
  // the lunar day and can shift across a day boundary.
  const birthTime = profile?.birthTime ?? '';
  const [submitted, setSubmitted] = useState(!!profile?.birthDate);
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    setPageMeta(
      'Lunar Mansions — 二十八宿',
      'The Chinese division of the sky the Moon passes through: today’s governing mansion, and the mansion of the day you were born.',
    );
  }, []);

  const today = useMemo(() => mansionForDate(new Date()), []);
  const birth = useMemo(
    () => (submitted && birthDate ? mansionForBirth(birthDate, birthTime || undefined) : null),
    [submitted, birthDate, birthTime],
  );
  const sukuyo = useMemo(
    () => (submitted && birthDate ? sukuyoMansionForBirth(birthDate, birthTime || undefined) : null),
    [submitted, birthDate, birthTime],
  );

  const byQuadrant = useMemo(() => {
    const out: Record<Quadrant, Mansion[]> = {
      azureDragon: [], blackTortoise: [], whiteTiger: [], vermilionBird: [],
    };
    for (const m of MANSIONS) out[m.quadrant].push(m);
    return out;
  }, []);

  const renderActivities = (m: Mansion) => {
    const acts = MANSION_ACTIVITIES[m.key];
    if (!acts) return null;
    return (
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-emerald-400/80 mb-1">{t('mansions.favoured', { defaultValue: '宜 · Favoured' })}</div>
          {acts.favourable.length === 0 ? (
            <p className="text-[13px] text-mystic-500 italic">
              The almanacs record nothing favoured here — a day to keep small rather than start.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {acts.favourable.map((a) => (
                <li key={a} className="text-[13px] text-mystic-300">{a}</li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-rose-400/80 mb-1">{t('mansions.avoided', { defaultValue: '忌 · Avoided' })}</div>
          {acts.unfavourable.length === 0 ? (
            <p className="text-[13px] text-mystic-500 italic">Nothing particular to avoid.</p>
          ) : (
            <ul className="space-y-0.5">
              {acts.unfavourable.map((a) => (
                <li key={a} className="text-[13px] text-mystic-300">{a}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-28">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-mystic-400 hover:text-mystic-200">
        <ArrowLeft className="w-4 h-4" /> {t('common.back', { defaultValue: 'Back' })}
      </button>

      <div className="space-y-2">
        <EyebrowLabel>二十八宿</EyebrowLabel>
        <h1 className="heading-display-xl text-mystic-100">{t('mansions.title', { defaultValue: 'The Lunar Mansions' })}</h1>
        <p className="text-sm text-mystic-400 leading-relaxed">{MANSION_INTRO}</p>
        <SectionDivider tone="gold" />
      </div>

      {/* Today's governing mansion */}
      {today && (
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-gold" />
            <EyebrowLabel>{t('mansions.today', { defaultValue: 'Today' })}</EyebrowLabel>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl text-gold" style={{ fontFamily: 'serif' }}>{today.cn}</span>
            <span className="text-mystic-100">{MANSION_MEANINGS[today.key]?.title}</span>
            <span className="text-xs text-mystic-500">
              {today.cn}{PLANET7_INFO[today.planet].cn}{today.animalCn}
            </span>
          </div>
          <p className="text-sm text-mystic-300 leading-relaxed">{MANSION_DAILY_ADVICE[today.key]}</p>
          {renderActivities(today)}
        </Card>
      )}

      {/* Birth mansion */}
      {!birth && (
        <Card className="p-4 space-y-4">
          <h3 className="heading-display-md text-mystic-100">{t('mansions.birthHeading', { defaultValue: 'Your birth mansion' })}</h3>
          <Input
            type="date"
            label={t('mansions.birthDate', { defaultValue: 'Birth date' })}
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
          />
          <Button variant="primary" size="md" fullWidth disabled={!birthDate} onClick={() => setSubmitted(true)}>
            <Sparkles className="w-4 h-4 mr-2" /> {t('mansions.find', { defaultValue: 'Find my mansion' })}
          </Button>
          <p className="text-[11px] text-mystic-600">
            The 值日 mansion turns over at midnight, so the date is all this needs — a birth time changes nothing here.
          </p>
        </Card>
      )}

      {birth && (
        <>
          <Card className="p-4 space-y-3">
            <EyebrowLabel>{t('mansions.birthHeading', { defaultValue: 'Your birth mansion' })}</EyebrowLabel>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl text-gold" style={{ fontFamily: 'serif' }}>{birth.cn}</span>
              <div>
                <div className="text-mystic-100">{MANSION_MEANINGS[birth.key]?.title}</div>
                <div className="text-xs text-mystic-500">
                  {birth.cn}{PLANET7_INFO[birth.planet].cn}{birth.animalCn} · {QUADRANT_INFO[birth.quadrant].cn}
                </div>
              </div>
            </div>
            <p className="text-sm text-mystic-300 leading-relaxed">{MANSION_MEANINGS[birth.key]?.text}</p>
            <p className="text-[13px] text-mystic-400 leading-relaxed border-t border-mystic-800/40 pt-3">
              <span className="text-gold/80">{QUADRANT_INFO[birth.quadrant].en}</span> — {QUADRANT_MEANINGS[birth.quadrant]?.text}
            </p>
          </Card>

          {sukuyo && sukuyo.key !== birth.key && (
            <Card className="p-4 space-y-2">
              <EyebrowLabel>宿曜 · the Japanese reading</EyebrowLabel>
              <p className="text-sm text-mystic-300 leading-relaxed">
                The Japanese 宿曜道 tradition counts differently — from your lunar month and day rather than
                the running day cycle — and puts you in{' '}
                <span className="text-gold">{sukuyo.cn} {MANSION_MEANINGS[sukuyo.key]?.title}</span>.
                Both are genuine; they answer slightly different questions, so we show them separately
                rather than pick one for you.
              </p>
            </Card>
          )}

          <Button variant="ghost" fullWidth onClick={() => setSubmitted(false)}>{t('mansions.recast', { defaultValue: 'Use a different date' })}</Button>
        </>
      )}

      {/* The full sky, by quadrant */}
      <Card className="p-4 space-y-4">
        <h3 className="heading-display-md text-mystic-100">{t('mansions.all', { defaultValue: 'All twenty-eight' })}</h3>
        {(Object.keys(byQuadrant) as Quadrant[]).map((q) => (
          <div key={q} className="space-y-1">
            <div className="text-xs text-gold/80">
              {QUADRANT_INFO[q].cn} · {QUADRANT_INFO[q].en}
              <span className="text-mystic-600"> — {QUADRANT_INFO[q].season}, {QUADRANT_INFO[q].element}</span>
            </div>
            {byQuadrant[q].map((m) => {
              const open = openKey === m.key;
              return (
                <div key={m.key} className="border-b border-mystic-800/40 last:border-0">
                  <button onClick={() => setOpenKey(open ? null : m.key)} className="w-full flex items-center gap-2 py-2 text-left">
                    <span className="w-6 text-center text-gold" style={{ fontFamily: 'serif' }}>{m.cn}</span>
                    <span className="flex-1">
                      <span className="text-mystic-100 text-sm">{MANSION_MEANINGS[m.key]?.title}</span>
                      <span className="text-mystic-600 text-xs"> · {m.animal}</span>
                    </span>
                    <span className={`text-[10px] uppercase tracking-wider ${m.fortune === 'auspicious' ? 'text-emerald-400/70' : 'text-rose-400/70'}`}>
                      {m.fortune === 'auspicious' ? '吉' : '凶'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-mystic-600 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && (
                    <div className="pb-3 pl-8 space-y-2">
                      <p className="text-[13px] text-mystic-300 leading-relaxed">{MANSION_MEANINGS[m.key]?.text}</p>
                      {renderActivities(m)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </Card>

      <p className="text-center text-xs text-mystic-600 max-w-sm mx-auto">
        The 值日 cycle is a calendrical count that has run unbroken for centuries — not a live measurement of
        where the Moon is tonight. For reflection, not prediction.
      </p>
    </div>
  );
}
