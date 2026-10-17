import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card, EyebrowLabel } from '../ui';
import { useT } from '../../i18n/useT';
import { getLocale } from '../../i18n/config';
import { useContentOverlay } from '../../i18n/contentOverlay';
import { localizeHanzi, writesHanzi, hanziLang } from '../../i18n/localizeHanzi';
import {
  readLiuYao, RELATIVE_INFO, SPIRIT_INFO, PALACE_INFO, type LiuYaoLine, type Relative,
} from '../../data/liuYao';
import { liuYaoNotes, relativeText, spiritText, palaceText } from '../../data/ichingLiuYaoReading';
import type { LineValue } from '../../data/ichingHexagrams';

/** The panel's fixed glyphs, in the data's traditional characters (localizeHanzi gives the reader's script). */
const GLYPH = { eyebrow: '六爻 · 納甲筮法', moving: '動', world: '世', response: '應', day: '日辰' } as const;

/**
 * 六爻 — the same cast, read as a diagnostic instrument.
 *
 * Classical I Ching reads the hexagram's wisdom text; 納甲筮法 tags each line
 * with a stem-branch, a family role and a spirit and reads the interaction. We
 * show it as a second layer on the cast the user already made rather than a
 * separate ritual, because re-casting for a second method would imply the two
 * answers are independent when they are readings of one moment.
 *
 * In the reader's language: the prose is the 'liuyao' content overlay
 * (src/data/ichingLiuYaoReading.ts), the chrome is liuyao.* UI strings, and
 * every hanzi on the panel goes through localizeHanzi — simplified for zh,
 * shinjitai for ja, the data's traditional forms (hanja) for en and ko.
 * Chinese and Japanese read a role's glyph as its name (父母, 妻财); English
 * and Korean get the name beside it (父母 Parent, 父母 부모).
 */
export function LiuYaoPanel({ lineValues }: { lineValues: LineValue[] }) {
  const { t } = useT('app');
  const [openLine, setOpenLine] = useState<number | null>(null);
  const reading = useMemo(() => readLiuYao(lineValues), [lineValues]);
  const { overlay, ready } = useContentOverlay('liuyao');
  // Until the prose has landed the panel stays closed, like its code's own
  // Suspense fallback: no English flash before the translation.
  if (!reading || !ready) return null;

  const locale = getLocale();
  const hz = (s: string) => localizeHanzi(s, locale);
  const lang = hanziLang(locale);
  /** A role as the 伏神 line names it: 妻财 / 妻財 in zh and ja, 妻財 (Wealth) / 妻財 (처재) in en and ko. */
  const roleLabel = (r: Relative) => {
    const glyph = hz(RELATIVE_INFO[r].cn);
    return writesHanzi(locale) ? glyph : `${glyph} (${relativeText(r, overlay).name})`;
  };
  const notes = liuYaoNotes(overlay);

  // A render function, not a component defined in render: a component type
  // made fresh each render remounts every row on each toggle, and the button
  // just pressed loses keyboard focus.
  const lineRow = (l: LiuYaoLine) => {
    const open = openLine === l.position;
    const rel = relativeText(l.relative, overlay);
    const spirit = spiritText(l.spirit, overlay);
    const relGlyph = hz(RELATIVE_INFO[l.relative].cn);
    const spiritGlyph = hz(SPIRIT_INFO[l.spirit].cn);
    return (
      <div key={l.position} className="border-b border-mystic-800/40 last:border-0">
        <button onClick={() => setOpenLine(open ? null : l.position)} aria-expanded={open} className="w-full min-h-[44px] flex items-center gap-2 py-2 text-left">
          {/* the line itself, drawn */}
          <span className="w-9 flex-shrink-0 flex items-center justify-center">
            {l.line === 'yang'
              ? <span className="block w-7 h-1 bg-mystic-200 rounded-full" />
              : (
                <span className="flex gap-1">
                  <span className="block w-3 h-1 bg-mystic-200 rounded-full" />
                  <span className="block w-3 h-1 bg-mystic-200 rounded-full" />
                </span>
              )}
          </span>
          <span className="text-meta text-mystic-400 w-10 flex-shrink-0" style={{ fontFamily: 'serif' }} lang={lang}>
            {hz(l.branchCn)}
          </span>
          <span className="flex-1 min-w-0">
            <span className="text-ui text-mystic-100" style={{ fontFamily: 'serif' }} lang={lang}>
              {relGlyph}
            </span>
            {!writesHanzi(locale) && <span className="text-meta text-mystic-400"> {rel.name}</span>}
          </span>
          <span className="text-meta text-mystic-400" style={{ fontFamily: 'serif' }} lang={lang}>
            {spiritGlyph}
          </span>
          {l.moving && <span className="text-gold text-caption" style={{ fontFamily: 'serif' }} lang={lang}>{hz(GLYPH.moving)}</span>}
          {l.isWorld && <span className="text-cosmic-violetLight text-caption" style={{ fontFamily: 'serif' }} lang={lang}>{hz(GLYPH.world)}</span>}
          {l.isResponse && <span className="text-mystic-400 text-caption" style={{ fontFamily: 'serif' }} lang={lang}>{hz(GLYPH.response)}</span>}
          <ChevronDown className={`w-4 h-4 text-mystic-600 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="reading-copy pb-3 pl-11 space-y-2">
            {/* Heading lines, then the prose: a joiner like " — " is English
                punctuation, and a Chinese or Japanese sentence would not take it. */}
            <p className="text-gold"><span lang={lang}>{relGlyph}</span> · {rel.title}</p>
            <p>{rel.text}</p>
            <p>{rel.asks}</p>
            <p className="text-cosmic-violetLight"><span lang={lang}>{spiritGlyph}</span> · {spirit.title}</p>
            <p>{spirit.text}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="space-y-2">
        <EyebrowLabel><span lang={lang}>{hz(GLYPH.eyebrow)}</span></EyebrowLabel>
        <p className="reading-copy">{notes.intro}</p>
      </div>

      <div className="text-ui text-mystic-300">
        <span style={{ fontFamily: 'serif' }} className="text-gold" lang={lang}>
          {hz(reading.palaceCn)}
        </span>
        <span> · {t(`bazi.elements.${PALACE_INFO[reading.palace].element}`, { defaultValue: PALACE_INFO[reading.palace].element })}</span>
        <span> · <span lang={lang}>{hz(reading.rankCn)}</span></span>
        <span className="text-mystic-400">
          {' · '}<span lang={lang}>{hz(GLYPH.day)} {hz(reading.dayPillar.cn)}</span>
        </span>
      </div>
      <p className="reading-copy">{palaceText(reading.palace, overlay)}</p>

      {/* Lines run bottom-to-top, as a hexagram is drawn. */}
      <div>
        {[...reading.lines].reverse().map(lineRow)}
      </div>

      <p className="reading-copy border-t border-mystic-800/40 pt-3">
        {notes.worldResponse}
      </p>
      {reading.movingLines.length > 0 && (
        <p className="reading-copy">{notes.movingLine}</p>
      )}

      {reading.hidden.length > 0 && (
        <div className="border-t border-mystic-800/40 pt-3 space-y-1">
          <EyebrowLabel className="block">{t('liuyao.hidden.eyebrow', { defaultValue: '伏神 · Hidden' })}</EyebrowLabel>
          <p className="reading-copy">
            {t('liuyao.hidden.body', {
              defaultValue: '{{list}} — roles absent from the cast, read from the palace’s parent hexagram. A missing role often matters as much as a present one.',
              list: reading.hidden
                .map((h) => t('liuyao.hidden.item', { defaultValue: '{{role}} under line {{n}}', role: roleLabel(h.relative), n: h.position }))
                .join(' · '),
            })}
          </p>
        </div>
      )}
    </Card>
  );
}
