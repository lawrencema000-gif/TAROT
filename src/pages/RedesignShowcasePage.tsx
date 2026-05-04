import { Sparkles, Feather, Sun, BookOpen, Flower } from 'lucide-react';
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
  FeaturePill,
  FeaturePillGroup,
  RitualRow,
  AvailableNowLabel,
} from '../components/ui';

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
        <EyebrowLabel rules>Redesign 2026 · Phase 1 + 2</EyebrowLabel>
        <HeroGreeting>Design system foundation</HeroGreeting>
        <HeroSubtitle>
          New ornaments, typography, brand mark + wordmark, and home-row
          primitives. Pulled from the redesign mockups + ad campaign;
          gold stays the brand CTA color.
        </HeroSubtitle>
      </header>

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

      {/* Phase 2: Home row primitives */}
      <section className="space-y-4">
        <EyebrowLabel rules>Phase 2 · Home-row primitives</EyebrowLabel>

        <div className="space-y-2">
          <p className="text-mystic-400 text-sm">FeaturePillGroup — 3-up feature shortcuts</p>
          <FeaturePillGroup>
            <FeaturePill icon={<Sun />} label="Astrology" />
            <FeaturePill icon={<Sparkles />} label="Tarot" />
            <FeaturePill icon={<BookOpen />} label="Journal" />
          </FeaturePillGroup>
        </div>

        <div className="space-y-2">
          <p className="text-mystic-400 text-sm">RitualRow — daily-ritual horizontal pill (gold accent)</p>
          <RitualRow
            icon={<Sparkles />}
            label="Today's reading"
            meta="Tap to draw your card"
            accent="gold"
          />
        </div>

        <div className="space-y-2">
          <p className="text-mystic-400 text-sm">RitualRow — purple accent (matches Ad 1's lotus pill)</p>
          <RitualRow
            icon={<Flower />}
            label="Daily ritual"
            meta="7 day streak"
            accent="purple"
          />
        </div>

        <div className="space-y-2">
          <p className="text-mystic-400 text-sm">RitualRow — teal &amp; coral variants</p>
          <RitualRow icon={<Feather />} label="Reflection" meta="2 entries this week" accent="teal" />
          <RitualRow icon={<Sparkles />} label="Compatibility" meta="New invite from Maya" accent="coral" />
        </div>

        <div className="space-y-2">
          <p className="text-mystic-400 text-sm">AvailableNowLabel — marketing trust strip</p>
          <div className="flex flex-col items-center gap-2 py-4">
            <AvailableNowLabel />
            <AvailableNowLabel>Apple version coming soon</AvailableNowLabel>
          </div>
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
            <Sparkles className="w-7 h-7 text-gold" />
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
            <div className="inset-frame-gold p-4">
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
