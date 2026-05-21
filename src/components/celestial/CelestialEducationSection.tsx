import { motion } from 'framer-motion';
import { Home as HomeIcon, Heart, Briefcase, Plane, Sparkles, Sprout, Compass, Sun, Moon, Telescope } from 'lucide-react';
import { Card } from '../ui';
import { useT } from '../../i18n/useT';

/**
 * Static educational + value-prop sections for the Celestial Map.
 *
 * Three sub-sections, each animated in on scroll:
 *   1. "What this is" — one-paragraph explainer of astrocartography.
 *   2. "What you can divine" — 6 use-case mini-cards (one per life
 *      area). Each is tappable to set the active filter.
 *   3. "How to read the lines" — explainer of AC / DC / MC / IC.
 *
 * The use-case grid is the marketing centrepiece — it tells users
 * what they can actually DO with this feature, in their own words.
 */

type LifeArea = 'love' | 'career' | 'travel' | 'healing' | 'home' | 'growth';

interface Props {
  onPickLifeArea: (area: LifeArea) => void;
}

const USE_CASES: Array<{
  id: LifeArea;
  icon: typeof Heart;
  titleKey: string;
  titleDefault: string;
  bodyKey: string;
  bodyDefault: string;
  accent: string;
}> = [
  {
    id: 'home',
    icon: HomeIcon,
    titleKey: 'celestial.use.home.title',
    titleDefault: 'Where to settle',
    bodyKey: 'celestial.use.home.body',
    bodyDefault: 'Find the places that feel like home before you arrive — where your nervous system softens, family bonds deepen, and roots come naturally.',
    accent: 'from-emerald-400/15 to-mystic-900/60 border-emerald-400/20',
  },
  {
    id: 'career',
    icon: Briefcase,
    titleKey: 'celestial.use.career.title',
    titleDefault: 'Where your work shines',
    bodyKey: 'celestial.use.career.body',
    bodyDefault: 'Discover the cities where doors open, your reputation builds faster, and the right people notice. Best for relocations, sabbaticals, or job hunts.',
    accent: 'from-amber-400/15 to-mystic-900/60 border-amber-400/20',
  },
  {
    id: 'love',
    icon: Heart,
    titleKey: 'celestial.use.love.title',
    titleDefault: 'Where love finds you',
    bodyKey: 'celestial.use.love.body',
    bodyDefault: 'Map the places where romance arrives more easily, attractions deepen, and partnerships formed there tend to last. Real signal for the lonely traveller.',
    accent: 'from-rose-400/15 to-mystic-900/60 border-rose-400/20',
  },
  {
    id: 'travel',
    icon: Plane,
    titleKey: 'celestial.use.travel.title',
    titleDefault: 'Where to roam',
    bodyKey: 'celestial.use.travel.body',
    bodyDefault: 'The destinations where adventure, expansion, and "this changed me" moments come unbidden. Plan vacations the universe co-signs.',
    accent: 'from-sky-400/15 to-mystic-900/60 border-sky-400/20',
  },
  {
    id: 'healing',
    icon: Sparkles,
    titleKey: 'celestial.use.healing.title',
    titleDefault: 'Where to heal',
    bodyKey: 'celestial.use.healing.body',
    bodyDefault: 'Quiet places where grief moves, anxiety eases, and the body remembers how to rest. Useful for retreats, recovery, and long-overdue stillness.',
    accent: 'from-violet-400/15 to-mystic-900/60 border-violet-400/20',
  },
  {
    id: 'growth',
    icon: Sprout,
    titleKey: 'celestial.use.growth.title',
    titleDefault: 'Where you transform',
    bodyKey: 'celestial.use.growth.body',
    bodyDefault: 'Intense places that crack you open — best when you are ready for radical change, identity shifts, and the version of yourself that hasn\'t arrived yet.',
    accent: 'from-fuchsia-400/15 to-mystic-900/60 border-fuchsia-400/20',
  },
];

export function CelestialEducationSection({ onPickLifeArea }: Props) {
  const { t } = useT('app');

  return (
    <>
      {/* ── What this is ──────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="space-y-3"
      >
        <Card variant="ritual" padding="lg">
          <div className="flex items-start gap-3">
            <Compass className="w-5 h-5 text-gold flex-shrink-0 mt-1" aria-hidden />
            <div className="space-y-2">
              <h2 className="text-sm uppercase tracking-wider text-gold/90 font-medium">
                {t('celestial.about.eyebrow', { defaultValue: 'Astrocartography' })}
              </h2>
              <p className="text-sm text-mystic-200 leading-relaxed">
                {t('celestial.about.body', {
                  defaultValue:
                    'Astrocartography maps where every planet was rising, setting, or at its highest point at the exact moment you were born — and projects those positions across the world. The result: a personal atlas of places that resonate with different parts of you. Some cities make your career line bright. Others fall on your love line, your healing line, your spotlight line. Move there and the energy follows.',
                })}
              </p>
              <p className="text-xs text-mystic-400 leading-relaxed pt-1">
                {t('celestial.about.tradition', {
                  defaultValue:
                    'Developed in the 1970s by astrologer Jim Lewis, astrocartography is now used by relocation consultants, traveler-astrologers, and curious humans planning their next chapter.',
                })}
              </p>
            </div>
          </div>
        </Card>
      </motion.section>

      {/* ── What you can divine ──────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
        className="space-y-3"
      >
        <div className="space-y-1">
          <h2 className="text-sm uppercase tracking-wider text-gold/90 font-medium">
            {t('celestial.use.eyebrow', { defaultValue: 'What you can divine' })}
          </h2>
          <p className="text-xs text-mystic-400 leading-relaxed">
            {t('celestial.use.subtitle', {
              defaultValue: 'Tap a theme to filter the map for that intent.',
            })}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {USE_CASES.map((useCase, i) => (
            <motion.button
              key={useCase.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.05, duration: 0.3, ease: 'easeOut' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onPickLifeArea(useCase.id)}
              className={`text-left p-4 rounded-2xl bg-gradient-to-br ${useCase.accent} hairline-gold-soft border transition-all hover:hairline-gold focus:outline-none focus:ring-2 focus:ring-gold/30`}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-mystic-900/60 flex items-center justify-center flex-shrink-0">
                  <useCase.icon className="w-4 h-4 text-gold" aria-hidden />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-mystic-100 mb-1">
                    {t(useCase.titleKey, { defaultValue: useCase.titleDefault })}
                  </h3>
                  <p className="text-xs text-mystic-300 leading-relaxed">
                    {t(useCase.bodyKey, { defaultValue: useCase.bodyDefault })}
                  </p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.section>
    </>
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
      <h2 className="text-sm uppercase tracking-wider text-gold/90 font-medium text-center">
        {t('celestial.angles.title', { defaultValue: 'How to read the lines' })}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {angles.map((angle) => (
          <div
            key={angle.key}
            className="p-4 rounded-xl bg-mystic-900/40 hairline-gold-soft"
          >
            <div className="flex items-start gap-3">
              <angle.icon className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" aria-hidden />
              <div>
                <p className="text-xs uppercase tracking-wider text-gold/80 font-medium mb-1">
                  {t(angle.labelKey, { defaultValue: angle.labelDefault })}
                </p>
                <p className="text-xs text-mystic-300 leading-relaxed">
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
