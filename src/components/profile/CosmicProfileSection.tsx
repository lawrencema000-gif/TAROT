import { Share2 } from 'lucide-react';
import { Card, Button, EyebrowLabel, toast, Section } from '../ui';
import { ZODIAC_ICONS } from '../icons';
import { useT } from '../../i18n/useT';
import { localizeSignName } from '../../i18n/localizeNames';
import { getZodiacSign } from '../../utils/zodiac';
import { getChineseZodiacInfo, type ChineseZodiacAnimal } from '../../utils/chineseZodiac';
import { getLifePath, LIFE_PATH_INFO, getExpressionNumber, getSoulUrgeNumber, getPersonalityNumber, getNumberMeaning } from '../../utils/numerology';
import { renderShareCard, shareOrDownload } from '../../utils/shareableResultCard';
import type { ZodiacSign as AstroSign } from '../../types/astrology';

interface CosmicProfileSectionProps {
  birthDate: string | null | undefined;
  displayName: string | null | undefined;
  moonSign?: string | null;
  risingSign?: string | null;
}

/**
 * The twelve earthly branches — the character every CJK calendar writes
 * for a zodiac year (午 for the Horse). Text, not an icon: it is how the
 * sign is written, set in the display serif, with the animal's name under
 * it. Replaces the platform's animal emoji (R6 A18 / R7).
 */
const BRANCH_CHAR: Record<ChineseZodiacAnimal, string> = {
  rat: '子',
  ox: '丑',
  tiger: '寅',
  rabbit: '卯',
  dragon: '辰',
  snake: '巳',
  horse: '午',
  goat: '未',
  monkey: '申',
  rooster: '酉',
  dog: '戌',
  pig: '亥',
};

/**
 * Shows a compact "cosmic profile" panel on the profile page: Western sun
 * sign, Chinese zodiac animal, and numerology Life Path — all derived
 * automatically from the birth date. A Share button generates a 1080×1920
 * PNG for Instagram stories.
 */
export function CosmicProfileSection({
  birthDate,
  displayName,
  moonSign,
  risingSign,
}: CosmicProfileSectionProps) {
  const { t } = useT('app');

  if (!birthDate) return null;

  const sunSign = getZodiacSign(birthDate);
  // utils/zodiac keys signs in lower case; the glyph set and localizeSignName
  // use the astrology type's capitalised names.
  const sunAstro = sunSign ? ((sunSign.charAt(0).toUpperCase() + sunSign.slice(1)) as AstroSign) : null;
  const SunGlyph = sunAstro ? ZODIAC_ICONS[sunAstro] : null;
  const sunName = sunAstro ? localizeSignName(sunAstro) : '';
  const chinese = getChineseZodiacInfo(birthDate);
  const chineseName = chinese ? t(`chineseZodiac.${chinese.animal}.name`, { defaultValue: chinese.animal.charAt(0).toUpperCase() + chinese.animal.slice(1) }) : '';
  const lifePath = getLifePath(birthDate);
  const lifePathInfo = lifePath ? LIFE_PATH_INFO[lifePath] : null;

  /** A numerology title, through the lifePath keys where the number has one. */
  const numberTitle = (n: number) => {
    const meaning = getNumberMeaning(n);
    const fallback = meaning?.title ?? String(n);
    return t(`lifePath.${n}.title`, { defaultValue: fallback });
  };

  const handleShare = async () => {
    try {
      const chineseLabel = chinese ? `${BRANCH_CHAR[chinese.animal]} ${chineseName}` : '';
      const lifePathLabel = lifePathInfo ? `${lifePathInfo.number} · ${t(`lifePath.${lifePath}.title`, { defaultValue: lifePathInfo.title })}` : '';
      const parts = [sunName, chineseLabel, lifePathLabel].filter(Boolean);
      const bodyLines = parts.join(' · ');

      const blob = await renderShareCard({
        title: displayName || t('profile.cosmic.myProfile', { defaultValue: 'My cosmic profile' }),
        subtitle: t('profile.cosmic.shareSubtitle', { defaultValue: 'Sun · Animal · Life Path' }),
        tagline: bodyLines,
        affirmation: lifePathInfo ? t(`lifePath.${lifePath}.affirmation`, { defaultValue: lifePathInfo.affirmation }) : '',
        // The renderer prefixes the wordmark itself; this is just the surface.
        brand: t('share.brand.cosmicProfile', { defaultValue: 'Cosmic profile' }),
      });
      const outcome = await shareOrDownload(blob, 'arcana-cosmic-profile.png', t('profile.cosmic.shareTitle', { defaultValue: 'My cosmic profile — Arcana' }));
      if (outcome === 'downloaded') {
        toast(t('quizzes.share.downloaded', { defaultValue: 'Saved to your device' }), 'success');
      } else if (outcome === 'failed') {
        toast(t('common:actions.shareFailed'), 'error');
      }
    } catch {
      toast(t('quizzes.share.failed', { defaultValue: 'Couldn’t create the share image — try again in a moment.' }), 'error');
    }
  };

  const expression = displayName ? getExpressionNumber(displayName) : null;
  const soulUrge = displayName ? getSoulUrgeNumber(displayName) : null;
  const personality = displayName ? getPersonalityNumber(displayName) : null;
  const hasNameNumbers = Boolean(expression || soulUrge || personality);

  return (
    <Section headingLevel="h3" spacing="sm" title={t('profile.cosmic.title', { defaultValue: 'Cosmic profile' })}>
      <Card padding="md">
        <div className="grid grid-cols-3 gap-3">
          {SunGlyph && (
            <div className="text-center p-3 bg-mystic-800 rounded-control">
              <div className="flex justify-center mb-2 h-8 items-center text-gold">
                <SunGlyph size={28} strokeWidth={1.5} aria-label={sunName} />
              </div>
              <EyebrowLabel className="block mb-1">
                {t('profile.cosmic.sun', { defaultValue: 'Sun' })}
              </EyebrowLabel>
              <div className="text-meta text-mystic-200 font-medium">{sunName}</div>
            </div>
          )}
          {chinese && (
            <div className="text-center p-3 bg-mystic-800 rounded-control">
              <div className="h-8 flex items-center justify-center mb-2">
                <span className="heading-display-md heading-strong text-gold leading-none" lang="zh" aria-hidden>
                  {BRANCH_CHAR[chinese.animal]}
                </span>
              </div>
              <EyebrowLabel className="block mb-1">
                {t('profile.cosmic.animal', { defaultValue: 'Animal' })}
              </EyebrowLabel>
              <div className="text-meta text-mystic-200 font-medium">{chineseName}</div>
            </div>
          )}
          {lifePathInfo && (
            <div className="text-center p-3 bg-mystic-800 rounded-control">
              <div className="h-8 flex items-center justify-center mb-2">
                <span className="text-title font-semibold tabular-nums text-gold leading-none">{lifePathInfo.number}</span>
              </div>
              <EyebrowLabel className="block mb-1">
                {t('profile.cosmic.lifePath', { defaultValue: 'Life path' })}
              </EyebrowLabel>
              <div className="text-meta text-mystic-200 font-medium">
                {t(`lifePath.${lifePath}.title`, { defaultValue: lifePathInfo.title })}
              </div>
            </div>
          )}
        </div>

        {lifePathInfo && (
          <p className="text-meta text-mystic-400 italic mt-4">
            {t(`lifePath.${lifePath}.tagline`, { defaultValue: lifePathInfo.tagline })}
          </p>
        )}

        {hasNameNumbers && (
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-mystic-700">
            {expression && (
              <div className="text-center">
                <div className="text-ui font-semibold tabular-nums text-gold">{expression}</div>
                <EyebrowLabel className="block mt-0.5">
                  {t('profile.cosmic.expression', { defaultValue: 'Expression' })}
                </EyebrowLabel>
                <div className="text-caption text-mystic-400 mt-0.5">{numberTitle(expression)}</div>
              </div>
            )}
            {soulUrge && (
              <div className="text-center">
                <div className="text-ui font-semibold tabular-nums text-cosmic-violet-ink">{soulUrge}</div>
                <EyebrowLabel className="block mt-0.5">
                  {t('profile.cosmic.soulUrge', { defaultValue: 'Soul urge' })}
                </EyebrowLabel>
                <div className="text-caption text-mystic-400 mt-0.5">{numberTitle(soulUrge)}</div>
              </div>
            )}
            {personality && (
              <div className="text-center">
                <div className="text-ui font-semibold tabular-nums text-cosmic-blue-ink">{personality}</div>
                <EyebrowLabel className="block mt-0.5">
                  {t('profile.cosmic.personality', { defaultValue: 'Personality' })}
                </EyebrowLabel>
                <div className="text-caption text-mystic-400 mt-0.5">{numberTitle(personality)}</div>
              </div>
            )}
          </div>
        )}

        {(moonSign || risingSign) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-meta text-mystic-400 mt-4">
            {moonSign && <span>{t('profile.cosmic.moon', { defaultValue: 'Moon' })} · {moonSign}</span>}
            {risingSign && <span>{t('profile.cosmic.rising', { defaultValue: 'Rising' })} · {risingSign}</span>}
          </div>
        )}

        <Button variant="outline" fullWidth onClick={handleShare} className="mt-4">
          <Share2 className="w-4 h-4" aria-hidden />
          {t('profile.cosmic.shareButton', { defaultValue: 'Share cosmic profile' })}
        </Button>
      </Card>
    </Section>
  );
}
