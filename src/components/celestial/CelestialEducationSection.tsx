import { motion } from 'framer-motion';
import { Heart, Sun, Moon, Telescope, Compass } from 'lucide-react';
import { Disclosure } from '../ui';
import { useT } from '../../i18n/useT';

/**
 * Educational copy for the Celestial Map.
 *
 *   1. `CelestialAboutDisclosure` — the two-paragraph astrocartography
 *      lesson, behind a row that opens. It used to sit above the map (R5
 *      p-3); the map comes first now and the lesson waits for the curious.
 *   2. `LIFE_AREA_BLURBS` — one line per life area, shown under the filter
 *      chip row for the active theme. These were six tinted cards before
 *      the user saw any map; the chips already carry the same choice.
 *   3. `CelestialAnglesSection` — AC / DC / MC / IC, after the map.
 */

type LifeArea = 'love' | 'career' | 'travel' | 'healing' | 'home' | 'growth';

export const LIFE_AREA_BLURBS: Record<LifeArea, { titleKey: string; titleDefault: string; bodyKey: string; bodyDefault: string }> = {
  home: {
    titleKey: 'celestial.use.home.title',
    titleDefault: 'Where to settle',
    bodyKey: 'celestial.use.home.body',
    bodyDefault: 'Find the places that feel like home before you arrive — where your nervous system softens, family bonds deepen, and roots come naturally.',
  },
  career: {
    titleKey: 'celestial.use.career.title',
    titleDefault: 'Where your work shines',
    bodyKey: 'celestial.use.career.body',
    bodyDefault: 'Discover the cities where doors open, your reputation builds faster, and the right people notice. Best for relocations, sabbaticals, or job hunts.',
  },
  love: {
    titleKey: 'celestial.use.love.title',
    titleDefault: 'Where love finds you',
    bodyKey: 'celestial.use.love.body',
    bodyDefault: 'Map the places where romance arrives more easily, attractions deepen, and partnerships formed there tend to last.',
  },
  travel: {
    titleKey: 'celestial.use.travel.title',
    titleDefault: 'Where to roam',
    bodyKey: 'celestial.use.travel.body',
    bodyDefault: 'The destinations where adventure, expansion, and "this changed me" moments come unbidden. Plan vacations the universe co-signs.',
  },
  healing: {
    titleKey: 'celestial.use.healing.title',
    titleDefault: 'Where to heal',
    bodyKey: 'celestial.use.healing.body',
    bodyDefault: 'Quiet places where grief moves, anxiety eases, and the body remembers how to rest. Useful for retreats, recovery, and long-overdue stillness.',
  },
  growth: {
    titleKey: 'celestial.use.growth.title',
    titleDefault: 'Where you transform',
    bodyKey: 'celestial.use.growth.body',
    bodyDefault: 'Intense places that crack you open — best when you are ready for radical change, identity shifts, and the version of yourself that hasn\'t arrived yet.',
  },
};

/** The one-line theme hint under the filter chips. */
export function LifeAreaBlurb({ area }: { area: LifeArea }) {
  const { t } = useT('app');
  const blurb = LIFE_AREA_BLURBS[area];
  return (
    <p className="text-meta text-mystic-400">
      <span className="text-mystic-200 font-medium">{t(blurb.titleKey, { defaultValue: blurb.titleDefault })}</span>
      {' · '}
      {t(blurb.bodyKey, { defaultValue: blurb.bodyDefault })}
    </p>
  );
}

/** The astrocartography lesson, behind a row that opens. */
export function CelestialAboutDisclosure() {
  const { t } = useT('app');
  return (
    <Disclosure
      lazy
      icon={<Compass />}
      label={t('celestial.about.disclosureLabel', { defaultValue: 'What is astrocartography?' })}
      description={t('celestial.about.disclosureHint', { defaultValue: 'Two minutes on how the lines are drawn' })}
      contentClassName="reading-copy"
    >
      <p>
        {t('celestial.about.body', {
          defaultValue:
            'Astrocartography maps where every planet was rising, setting, or at its highest point at the exact moment you were born — and projects those positions across the world. The result: a personal atlas of places that resonate with different parts of you. Some cities make your career line bright. Others fall on your love line, your healing line, your spotlight line. Move there and the energy follows.',
        })}
      </p>
      <p>
        {t('celestial.about.tradition', {
          defaultValue:
            'Developed in the 1970s by astrologer Jim Lewis, astrocartography is now used by relocation consultants, traveler-astrologers, and curious humans planning their next chapter.',
        })}
      </p>
    </Disclosure>
  );
}

/**
 * Lower-page educational card explaining what AC / DC / MC / IC mean.
 * Rendered AFTER the map so readers absorb it as context, not gating.
 */
export function CelestialAnglesSection() {
  const { t } = useT('app');
  const angles = [
    {
      key: 'AC',
      icon: Sun,
      labelKey: 'celestial.angles.ac.label',
      labelDefault: 'AC · Rising',
      bodyKey: 'celestial.angles.ac.body',
      bodyDefault: 'Where the planet was on the eastern horizon — about identity, how others see you, your fresh start energy.',
    },
    {
      key: 'DC',
      icon: Heart,
      labelKey: 'celestial.angles.dc.label',
      labelDefault: 'DC · Setting',
      bodyKey: 'celestial.angles.dc.body',
      bodyDefault: 'Where the planet was on the western horizon — about partners, mirrors, and what arrives through other people.',
    },
    {
      key: 'MC',
      icon: Telescope,
      labelKey: 'celestial.angles.mc.label',
      labelDefault: 'MC · Midheaven',
      bodyKey: 'celestial.angles.mc.body',
      bodyDefault: 'Where the planet was at the top of the sky — about public reputation, career, and visible achievement.',
    },
    {
      key: 'IC',
      icon: Moon,
      labelKey: 'celestial.angles.ic.label',
      labelDefault: 'IC · Foundation',
      bodyKey: 'celestial.angles.ic.body',
      bodyDefault: 'Where the planet was at the bottom of the sky — about home, family roots, and your inner world.',
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="space-y-3"
    >
      <h2 className="heading-display-md text-mystic-100">
        {t('celestial.angles.title', { defaultValue: 'How to read the lines' })}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {angles.map((angle) => (
          <div
            key={angle.key}
            className="p-4 rounded-control bg-mystic-850 border border-mystic-700"
          >
            <div className="flex items-start gap-3">
              <angle.icon className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" aria-hidden />
              <div>
                <p className="font-display-eyebrow mb-1">
                  {t(angle.labelKey, { defaultValue: angle.labelDefault })}
                </p>
                <p className="text-ui text-mystic-300">
                  {t(angle.bodyKey, { defaultValue: angle.bodyDefault })}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
