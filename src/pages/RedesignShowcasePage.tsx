import { Heart, Feather } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  TextArea,
  Chip,
  InsightChip,
  EyebrowLabel,
  SectionDivider,
  HeroGreeting,
  HeroSubtitle,
  HairlineRule,
  SparkleFourPoint,
  StarBurst,
  OrnateDivider,
  BrandMark,
  BrandWordmark,
  BrandLockup,
  TarotCardIcon,
  DeckFan,
  CardBack,
  ListRow,
  ListRowGroup,
  Tag,
  Badge,
  KeywordRow,
  StarDivider,
  Paper,
  ResultSheet,
  AffirmationPanel,
  Disclaimer,
  PlayingCardIcon,
  ReadingProse,
  toast,
} from '../components/ui';
import { SpreadGlyph, SPREAD_LAYOUTS, SUIT_GLYPHS, PentacleGlyph, type SpreadGlyphId } from '../components/icons';
import { minorEnrichment } from '../data/tarotEnrichment';
import { HomeHero } from '../components/home/HomeHero';
import { StreakConstellation, type ConstellationNight } from '../components/celebration/StreakConstellation';
import { MoonPhaseGlyph } from '../components/icons/MoonPhaseGlyph';
import { HoroscopeCard, PromptCard } from '../components/ritual';
import { ChartWheel } from '../components/chart/ChartWheel';
import type { WheelChart } from '../types/astrology';

/** ASC at 15° Aries, a stellium on the Ascendant, one retrograde, no Jupiter longitude. */
const SHOWCASE_CHART: WheelChart = {
  ascendant: 15,
  houses: Array.from({ length: 12 }, (_, i) => (15 + i * 30) % 360),
  planets: [
    { planet: 'Sun', sign: 'Aries', degree: 15, longitude: 15, house: 1 },
    { planet: 'Moon', sign: 'Aries', degree: 17, longitude: 17, house: 1 },
    { planet: 'Mercury', sign: 'Aries', degree: 19, longitude: 19, house: 1 },
    { planet: 'Venus', sign: 'Libra', degree: 5, longitude: 185, house: 7, retrograde: true },
    { planet: 'Mars', sign: 'Cancer', degree: 10, longitude: 100, house: 3 },
    { planet: 'Jupiter', sign: 'Leo', degree: 10, house: 4 },
    { planet: 'Saturn', sign: 'Capricorn', degree: 0, longitude: 270, house: 9 },
    { planet: 'Uranus', sign: 'Aquarius', degree: 0, longitude: 300, house: 10 },
    { planet: 'Neptune', sign: 'Pisces', degree: 0, longitude: 330, house: 11 },
    { planet: 'Pluto', sign: 'Sagittarius', degree: 0, longitude: 240, house: 8 },
  ],
  aspects: [
    { planet1: 'Sun', planet2: 'Moon', type: 'conjunction', orb: 2, applying: true },
    { planet1: 'Sun', planet2: 'Venus', type: 'opposition', orb: 6, applying: false },
    { planet1: 'Mars', planet2: 'Sun', type: 'square', orb: 5, applying: true },
    { planet1: 'Moon', planet2: 'Saturn', type: 'trine', orb: 3, applying: true },
  ],
};

// A fortnight with a break in it, for the constellation.
const SHOWCASE_NIGHTS: ConstellationNight[] = (
  [3, 3, 3, 3, 3, 0, 2, 3, 3, 3, 3, 0, 0, 1] as const
).map((parts, i) => {
  const d = new Date(Date.UTC(2026, 8, 13 + i));
  return { date: d.toISOString().slice(0, 10), parts, completed: parts === 3 };
});
const SHOWCASE_TODAY = '2026-09-26';

/**
 * Redesign 2026 — Phase 1 showcase.
 *
 * Hidden behind /dev/redesign-showcase (no nav link). Renders every
 * primitive and ornament component (existing + newly added in Phase 1)
 * so we can review the foundation against the mockups before applying
 * the new building blocks across actual feature pages in Phase 3+.
 *
 * This page imports nothing from feature surfaces and modifies no
 * application state — it's pure presentation. Safe to keep in the bundle
 * indefinitely; it adds maybe ~3KB after gzip.
 */
export function RedesignShowcasePage() {
  return (
    <div className="space-y-12 pb-12">
      {/* Banner */}
      <header className="text-center space-y-3">
        <EyebrowLabel rules>Redesign 2026 · showcase</EyebrowLabel>
        <HeroGreeting>Design system foundation</HeroGreeting>
        <HeroSubtitle>
          New ornaments, typography, brand mark + wordmark, and home-row
          primitives. Pulled from the redesign mockups + ad campaign;
          gold stays the brand CTA color.
        </HeroSubtitle>
      </header>

      {/* Phase 7: the reading surface */}
      <section className="space-y-8" data-showcase="phase7">
        <EyebrowLabel rules>Phase 7 · Reading surface</EyebrowLabel>

        <div className="space-y-2" data-showcase="p7-resultsheet">
          <p className="text-mystic-400 text-meta">
            ResultSheet — glyph, eyebrow, title, three stars, summary, body, Disclaimer — on Paper
          </p>
          <ResultSheet
            glyph={<PentacleGlyph />}
            eyebrow="Your question"
            title="How will my day go?"
            summary="A steady, grounded day: the Ace of Pentacles puts something real in your hands. Take the practical step you have been circling and let the rest follow from it."
            disclaimer="tarot"
          >
            <div className="space-y-6">
              <div className="space-y-3 text-center">
                <Tag>Position 1 · The heart of it</Tag>
                <h3 className="heading-display-md heading-strong">Ace of Pentacles</h3>
                <KeywordRow keywords={['Opportunity', 'Prosperity', 'New venture', 'Manifestation']} />
              </div>
              <ReadingProse
                lede={false}
                text={
                  'The Ace of Pentacles is a seed in an open hand. Whatever you have been weighing — a job, a move, a habit — this card says the ground will hold if you plant it now.\n\nKeep the scale small today. One concrete action, finished, is worth more than a plan for ten. Notice what feels solid under your feet and build from there.'
                }
              />
              <AffirmationPanel text={minorEnrichment['ace-of-pentacles'].affirmation} />
              <p className="reading-meta flex flex-wrap justify-center gap-x-4 gap-y-1 text-center">
                <span data-probe="ink-muted" className="text-ink-muted">ink-muted</span>
                <span data-probe="ink-teal" className="text-ink-teal">Upright · ink-teal</span>
                <span data-probe="ink-coral" className="text-ink-coral">ink-coral</span>
                <span data-probe="ink-violet" className="text-ink-violet">ink-violet</span>
                <span data-probe="ink-blue" className="text-ink-blue">ink-blue</span>
                <span data-probe="ink-rose" className="text-ink-rose">ink-rose</span>
                <span data-probe="stray-gold" className="text-gold">stray text-gold becomes ink-gold</span>
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button variant="gold">Save reading</Button>
                <Button variant="secondary">Share</Button>
              </div>
            </div>
          </ResultSheet>
        </div>

        <div className="space-y-3" data-showcase="p7-keywords">
          <p className="text-mystic-400 text-meta">KeywordRow — the canvas tint, and the ink-gold fill it becomes inside Paper</p>
          <KeywordRow keywords={['Opportunity', 'Prosperity', 'New venture', 'Manifestation']} />
          <Paper className="space-y-4">
            <h3 className="heading-display-lg heading-strong text-center">Ace of Pentacles</h3>
            <KeywordRow keywords={['Opportunity', 'Prosperity', 'New venture', 'Manifestation']} />
            <StarDivider />
            <p className="reading-copy mx-auto text-center">
              heading-strong is Cormorant 600 at −0.01em. The three stars are the one ornament a result gets, and
              inside Paper they take ink-gold without being told.
            </p>
          </Paper>
        </div>

        <div className="space-y-3">
          <p className="text-mystic-400 text-meta">StarDivider on the canvas · the regular display weight beside heading-strong</p>
          <h3 className="heading-display-lg text-mystic-100 text-center">Reading summary</h3>
          <StarDivider />
          <h3 className="heading-display-lg heading-strong text-mystic-100 text-center">Reading summary</h3>
        </div>

        <div className="space-y-4" data-showcase="p7-glyphs">
          <p className="text-mystic-400 text-meta">SpreadGlyph — the six castable spreads, canvas tile and paper tile</p>
          <div className="flex flex-wrap gap-4">
            {(Object.keys(SPREAD_LAYOUTS) as SpreadGlyphId[]).map((id) => (
              <div key={id} className="flex flex-col items-center gap-1.5">
                <SpreadGlyph layout={SPREAD_LAYOUTS[id]} tile="canvas" />
                <span className="text-caption text-mystic-400">{id}</span>
              </div>
            ))}
          </div>
          <Paper className="!py-4">
            <div className="flex flex-wrap justify-center gap-4">
              {(Object.keys(SPREAD_LAYOUTS) as SpreadGlyphId[]).map((id) => (
                <SpreadGlyph key={id} layout={SPREAD_LAYOUTS[id]} tile="paper" />
              ))}
            </div>
          </Paper>
          <p className="text-mystic-400 text-meta">SuitGlyphs at 20 and 28 · PlayingCardIcon beside TarotCardIcon</p>
          <div className="flex flex-wrap items-center gap-5 text-gold">
            {Object.entries(SUIT_GLYPHS).map(([k, G]) => (
              <G key={k} role="img" aria-label={k} />
            ))}
            <span className="w-px h-6 bg-mystic-700" aria-hidden />
            {Object.entries(SUIT_GLYPHS).map(([k, G]) => (
              <G key={`${k}-lg`} className="w-7 h-7" />
            ))}
            <span className="w-px h-6 bg-mystic-700" aria-hidden />
            <TarotCardIcon className="w-6 h-6 text-mystic-300" />
            <PlayingCardIcon className="w-6 h-6 text-mystic-300" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="violet">Premium</Badge>
            <Badge tone="violet">Try</Badge>
            <Badge tone="gold">New</Badge>
            <span className="text-caption text-mystic-400">Badge tone=&quot;violet&quot; is the one monetisation hue</span>
          </div>
        </div>

        <div className="space-y-3" data-showcase="p7-disclaimers">
          <p className="text-mystic-400 text-meta">Disclaimer — one per kind</p>
          {(['tarot', 'astrology', 'quiz', 'ai', 'cartomancy', 'general'] as const).map((k) => (
            <Disclaimer key={k} kind={k} />
          ))}
        </div>

        <div className="space-y-3">
          <p className="text-mystic-400 text-meta">Toast — the same message three times shows once</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" data-testid="p7-toast-same" onClick={() => toast('Saved · +15 XP', 'success')}>
              Fire the same toast
            </Button>
            <Button
              variant="outline"
              onClick={() => toast('Could not load the feed', 'error', { label: 'Try again', onClick: () => toast('Retrying', 'info') })}
            >
              Error with an action
            </Button>
          </div>
        </div>
      </section>

      {/* Phase 5: signature moments */}
      <section className="space-y-6" data-showcase="phase5">
        <EyebrowLabel rules>Phase 5 · Signature moments</EyebrowLabel>

        <div className="space-y-2">
          <p className="text-mystic-400 text-sm">HomeHero — the deck, before the ritual</p>
          <HomeHero
            greeting="Good evening"
            name="Lawrence"
            subline={<p className="text-caption text-mystic-400 mt-1.5"><span className="text-gold">Level 4</span><span className="text-mystic-600"> · </span>Seeker</p>}
            started={false}
            progress={{ horoscope: false, tarot: false, prompt: false }}
            progressLabel="0 of 3 parts done"
            title="Today’s ritual"
            lede="Three parts: your horoscope, one card, one question."
            cta="Start today’s ritual"
            onStart={() => {}}
            aside={
              <span className="shrink-0 inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-full bg-mystic-850 border border-mystic-700 text-meta text-mystic-300">
                <SparkleFourPoint size={12} className="text-gold" />
                <span className="font-semibold text-gold">7</span>
                <span>day streak</span>
              </span>
            }
          />
        </div>

        <div className="space-y-2">
          <p className="text-mystic-400 text-sm">HomeHero — started, two of three parts done</p>
          <HomeHero
            greeting="Good evening"
            name={null}
            started
            progress={{ horoscope: true, tarot: true, prompt: false }}
            progressLabel="2 of 3 parts done"
            title="Today’s ritual"
            cta="Start today’s ritual"
            onStart={() => {}}
          />
        </div>

        <div className="space-y-2">
          <p className="text-mystic-400 text-sm">The ritual trio — HoroscopeCard (card-ritual) and PromptCard (Card)</p>
          <HoroscopeCard sign="leo" onRead={() => {}} />
          <PromptCard prompt="What did you avoid saying today, and to whom?" onWrite={() => {}} />
        </div>

        <div className="space-y-2">
          <p className="text-mystic-400 text-sm">StreakConstellation — 14 nights, one break, tonight partial</p>
          <Card padding="md" variant="accent">
            <StreakConstellation nights={SHOWCASE_NIGHTS} today={SHOWCASE_TODAY} className="w-full text-gold" height={120} />
          </Card>
        </div>

        <div className="space-y-2">
          <p className="text-mystic-400 text-sm">DeckFan — sm / md / lg</p>
          <div className="flex items-end justify-between">
            <DeckFan size="sm" />
            <DeckFan size="md" />
          </div>
          <DeckFan size="lg" />
        </div>

        <div className="space-y-2">
          <p className="text-mystic-400 text-sm">CardBack — full and quiet, as inline SVG</p>
          <div className="flex gap-4">
            <CardBack className="w-24 rounded-inset border border-gold/30" />
            <CardBack detail="quiet" className="w-24 rounded-inset border border-gold/30" />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-mystic-400 text-sm">MoonPhaseGlyph — waxing 0 → 1, then waning gibbous and crescent</p>
          <div className="flex flex-wrap gap-3 text-gold">
            {[0, 0.12, 0.25, 0.5, 0.75, 0.9, 1].map((f) => (
              <MoonPhaseGlyph key={f} illumination={f} waxing size={40} />
            ))}
            <MoonPhaseGlyph illumination={0.75} waxing={false} size={40} />
            <MoonPhaseGlyph illumination={0.2} waxing={false} size={40} />
          </div>
        </div>


        <div className="space-y-2" data-showcase="wheel">
          <p className="text-mystic-400 text-sm">ChartWheel — the one wheel: ASC at 9 o’clock, seam sign 30°, stellium spread, ℞, legend</p>
          <ChartWheel chart={SHOWCASE_CHART} />
        </div>

        <div className="space-y-2">
          <p className="text-mystic-400 text-sm">Shortcuts — one ListRowGroup instead of five coloured tiles</p>
          <ListRowGroup>
            <ListRow icon={<TarotCardIcon />} tone="gold" label="Pick a card" meta="30-second daily draw. One card calls to you." onClick={() => {}} />
            <ListRow icon={<Heart />} tone="rose" label="Love Tree" meta="Your attachment style as a living tree." onClick={() => {}} />
          </ListRowGroup>
        </div>
      </section>

      {/* Phase 2: Brand identity */}
      <section className="space-y-6">
        <EyebrowLabel rules>Phase 2 · Brand identity</EyebrowLabel>

        <div className="space-y-2">
          <p className="text-mystic-400 text-sm">BrandMark — arched-window glyph (size scales)</p>
          <div className="flex items-end gap-6 text-gold">
            <BrandMark size={32} />
            <BrandMark size={48} />
            <BrandMark size={64} />
            <BrandMark size={96} />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-mystic-400 text-sm">BrandWordmark — gold serif with sparkle interpunct</p>
          <div className="space-y-3">
            <BrandWordmark size={28} />
            <div><BrandWordmark size={42} /></div>
            <div><BrandWordmark size={56} /></div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-mystic-400 text-sm">BrandWordmark · sparkle off · foil off</p>
          <BrandWordmark size={36} sparkle={false} foil={false} />
        </div>

        <div className="space-y-2">
          <p className="text-mystic-400 text-sm">BrandLockup — for splash, landing, auth</p>
          <Card variant="ritual" padding="lg">
            <BrandLockup size={56} tagline="Know yourself, one ritual a day" />
          </Card>
        </div>
      </section>


      {/* Phase 2 retheme: shell components */}
      <section className="space-y-3">
        <EyebrowLabel rules>Phase 2 · Shell retheme</EyebrowLabel>
        <p className="text-mystic-400 text-sm">
          Header, BottomNav, and Sheet wrapper got refined treatments — the
          changes show up across every authenticated page automatically.
          Compare on Home, Settings sheet, etc.
        </p>
        <Card variant="default" padding="md">
          <ul className="text-mystic-300 text-sm space-y-2">
            <li>· Header — bigger Cormorant title, hairline-gold icon buttons</li>
            <li>· BottomNav — gold separator hairline, gold dot below active label, sparkle drop-shadow</li>
            <li>· Sheet — slimmer drag handle, eyebrow-style title, gold inner-edge highlight</li>
          </ul>
        </Card>
      </section>

      {/* New ornaments */}
      <section className="space-y-6">
        <EyebrowLabel rules>New ornaments</EyebrowLabel>

        <div className="space-y-2">
          <p className="text-mystic-400 text-sm">SectionDivider — primary section break</p>
          <SectionDivider />
        </div>

        <div className="space-y-2">
          <p className="text-mystic-400 text-sm">SectionDivider · mystic tone — quiet break</p>
          <SectionDivider tone="mystic" />
        </div>

        <div className="space-y-2">
          <p className="text-mystic-400 text-sm">HairlineRule — micro break</p>
          <HairlineRule />
        </div>

        <div className="space-y-2">
          <p className="text-mystic-400 text-sm">SparkleFourPoint · StarBurst (existing) — inline glyphs</p>
          <div className="flex items-center gap-6 text-gold">
            <SparkleFourPoint size={14} />
            <SparkleFourPoint size={20} />
            <SparkleFourPoint size={28} />
            <span className="text-mystic-700">|</span>
            <StarBurst size={20} />
            <StarBurst size={28} />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-mystic-400 text-sm">OrnateDivider (existing) — for ornate frames only</p>
          <div className="text-gold flex justify-center">
            <OrnateDivider />
          </div>
        </div>
      </section>

      {/* Display typography */}
      <section className="space-y-4">
        <EyebrowLabel rules>Display typography</EyebrowLabel>

        <div className="space-y-1">
          <p className="text-mystic-500 text-xs font-mono">.heading-display-xl</p>
          <h2 className="heading-display-xl text-mystic-100">Good evening</h2>
        </div>

        <div className="space-y-1">
          <p className="text-mystic-500 text-xs font-mono">.heading-display-lg</p>
          <h3 className="heading-display-lg text-mystic-100">Astrology Insights</h3>
        </div>

        <div className="space-y-1">
          <p className="text-mystic-500 text-xs font-mono">.heading-display-md</p>
          <h4 className="heading-display-md text-mystic-100">Daily Tarot</h4>
        </div>

        <div className="space-y-1">
          <p className="text-mystic-500 text-xs font-mono">.text-gold-foil (existing)</p>
          <h3 className="heading-display-lg text-gold-foil">The Star</h3>
        </div>

        <div className="space-y-1">
          <p className="text-mystic-500 text-xs font-mono">.font-display-eyebrow (existing) · EyebrowLabel</p>
          <div className="flex flex-wrap items-center gap-6">
            <EyebrowLabel>Today's ritual</EyebrowLabel>
            <EyebrowLabel rules>Daily streak</EyebrowLabel>
            <EyebrowLabel align="left">Your progress</EyebrowLabel>
          </div>
        </div>
      </section>

      {/* New Card variant: ritual */}
      <section className="space-y-4">
        <EyebrowLabel rules>Card · ritual variant (new)</EyebrowLabel>
        <p className="text-mystic-400 text-sm">
          Tappable feature card matching the mockup's "Daily Tarot" / "Reflection" rows.
          Hover lift + active feedback baked in.
        </p>

        <Card variant="ritual" interactive padding="lg">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="heading-display-md text-mystic-100">Daily Tarot</h4>
              <p className="text-sm text-mystic-300">Draw your card and receive guidance</p>
            </div>
            <TarotCardIcon className="w-7 h-7 text-gold" />
          </div>
        </Card>

        <Card variant="ritual" interactive padding="lg">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="heading-display-md text-mystic-100">Reflection</h4>
              <p className="text-sm text-mystic-300">Journaling time to center your mind</p>
            </div>
            <Feather className="w-7 h-7 text-gold/80" />
          </div>
        </Card>
      </section>

      {/* Existing Card variants (regression check) */}
      <section className="space-y-4">
        <EyebrowLabel rules>Card · existing variants (regression check)</EyebrowLabel>

        <Card variant="default" padding="md">
          <CardHeader>
            <CardTitle>default</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-mystic-300 text-sm">
              The standard panel — used everywhere across the app.
            </p>
          </CardContent>
        </Card>

        <Card variant="glow" padding="md">
          <CardHeader>
            <CardTitle>glow</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-mystic-300 text-sm">
              Gold-edged panel with a soft halo — for daily highlights and call-outs.
            </p>
          </CardContent>
        </Card>

        <Card variant="elevated" padding="md">
          <CardHeader>
            <CardTitle>elevated</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-mystic-300 text-sm">
              Higher contrast surface — used in modals, sheets, and floating contexts.
            </p>
          </CardContent>
        </Card>

        <Card variant="ornate" padding="lg">
          <CardHeader>
            <CardTitle>ornate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-mystic-300 text-sm">
              The premium reading frame — corner flourishes, layered borders.
            </p>
            <div className="flex justify-center text-gold">
              <OrnateDivider />
            </div>
            <p className="text-mystic-300 text-sm">
              Reserved for reading reveals and reports.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Buttons */}
      <section className="space-y-4">
        <EyebrowLabel rules>Buttons</EyebrowLabel>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="gold">Gold gradient</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      {/* Inputs */}
      <section className="space-y-4">
        <EyebrowLabel rules>Inputs</EyebrowLabel>
        <Input label="Email address" placeholder="seeker@arcana.app" />
        <Input label="With error" error="Please enter a valid email" placeholder="seeker@arcana" />
        <TextArea label="Reflection" placeholder="What are you grateful for today?" rows={3} />
      </section>

      {/* Chips */}
      <section className="space-y-4">
        <EyebrowLabel rules>Chips</EyebrowLabel>
        <div className="flex flex-wrap gap-2">
          <Chip label="Default" />
          <Chip label="Selected" selected />
          <Chip label="Gold" variant="gold" />
          <Chip label="Outline" variant="outline" />
          <Chip label="Outline · selected" variant="outline" selected />
        </div>
        <div className="flex flex-wrap gap-2">
          <InsightChip category="love" />
          <InsightChip category="career" />
          <InsightChip category="clarity" />
          <InsightChip category="confidence" selected />
          <InsightChip category="growth" />
          <InsightChip category="connection" />
        </div>
      </section>

      {/* Inset frame demo */}
      <section className="space-y-4">
        <EyebrowLabel rules>Inset frame · gold (new utility)</EyebrowLabel>
        <Card variant="ritual" padding="lg">
          <div className="space-y-3">
            <h4 className="heading-display-md text-mystic-100">Today's energy</h4>
            <SectionDivider tone="mystic" />
            <div className="rounded-2xl border border-gold/20 p-4">
              <p className="text-mystic-300 italic">
                "Trust the light within you. It knows the way."
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* Footer note */}
      <footer className="text-center pt-6">
        <SectionDivider />
        <p className="text-mystic-500 text-xs mt-4">
          Phase 1 of the redesign. No production pages have been changed yet —
          these are building blocks for Phase 3 onward.
        </p>
      </footer>
    </div>
  );
}

export default RedesignShowcasePage;
