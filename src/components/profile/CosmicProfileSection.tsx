import { Share2 } from 'lucide-react';
import { Card, Button, EyebrowLabel, toast } from '../ui';
import { HoroscopeWheelIcon } from '../ui/NavIcons';
import { ZODIAC_ICONS } from '../icons';
import { useT } from '../../i18n/useT';
import { getZodiacSign, zodiacData } from '../../utils/zodiac';
import { getChineseZodiacInfo } from '../../utils/chineseZodiac';
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
  const sunInfo = sunSign ? zodiacData[sunSign] : null;
  // utils/zodiac keys signs in lower case; the glyph set uses the astrology
  // type's capitalised names.
  const SunGlyph = sunSign ? ZODIAC_ICONS[(sunSign.charAt(0).toUpperCase() + sunSign.slice(1)) as AstroSign] : null;
  const sunName = sunInfo ? t(`zodiac.${sunSign}.name`, { defaultValue: sunInfo.name }) : '';
  const chinese = getChineseZodiacInfo(birthDate);
  const lifePath = getLifePath(birthDate);
  const lifePathInfo = lifePath ? LIFE_PATH_INFO[lifePath] : null;

  const handleShare = async () => {
    try {
      const chineseLabel = chinese ? `${chinese.emoji} ${t(`chineseZodiac.${chinese.animal}.name`, { defaultValue: chinese.animal })}` : '';
      const lifePathLabel = lifePathInfo ? `${lifePathInfo.number} · ${t(`lifePath.${lifePath}.title`, { defaultValue: lifePathInfo.title })}` : '';
      const parts = [sunName, chineseLabel, lifePathLabel].filter(Boolean);
      const bodyLines = parts.join(' · ');

      const blob = await renderShareCard({
        title: displayName || t('profile.cosmic.myProfile', { defaultValue: 'My Cosmic Profile' }),
        subtitle: t('profile.cosmic.shareSubtitle', { defaultValue: 'Sun · Animal · Life Path' }),
        tagline: bodyLines,
        affirmation: lifePathInfo ? t(`lifePath.${lifePath}.affirmation`, { defaultValue: lifePathInfo.affirmation }) : '',
        // The renderer prefixes the wordmark itself; this is just the surface.
        brand: t('share.brand.cosmicProfile', { defaultValue: 'Cosmic profile' }),
      });
      const outcome = await shareOrDownload(blob, 'arcana-cosmic-profile.png', 'My cosmic profile — Arcana');
      if (outcome === 'downloaded') {
        toast(t('quizzes.share.downloaded', { defaultValue: 'Saved to your device' }), 'success');
      } else if (outcome === 'failed') {
        toast(t('common:actions.shareFailed'), 'error');
      }
    } catch {
      toast(t('quizzes.share.failed', { defaultValue: 'Could not create share image' }), 'error');
    }
  };

  return (
    <Card padding="md" className="bg-gradient-to-br from-gold/5 via-mystic-900 to-mystic-900 border-gold/20">
      <div className="flex items-center gap-2 mb-4">
        <HoroscopeWheelIcon className="w-4 h-4 text-gold" />
        <h3 className="text-sm font-medium text-gold tracking-wide">
          {t('profile.cosmic.title', { defaultValue: 'Cosmic Profile' })}
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {sunInfo && SunGlyph && (
          <div className="text-center p-3 bg-mystic-800/30 rounded-control">
            <div className="flex justify-center mb-1 text-mystic-100">
              <SunGlyph size={28} strokeWidth={1.5} aria-label={sunName} />
            </div>
            <EyebrowLabel className="block mb-1">
              {t('profile.cosmic.sun', { defaultValue: 'Sun' })}
            </EyebrowLabel>
            <div className="text-meta text-mystic-200 font-medium">{sunName}</div>
          </div>
        )}
        {chinese && (
          <div className="text-center p-3 bg-mystic-800/30 rounded-control">
            <div className="text-2xl mb-1">{chinese.emoji}</div>
            <EyebrowLabel className="block mb-1">
              {t('profile.cosmic.animal', { defaultValue: 'Animal' })}
            </EyebrowLabel>
            <div className="text-meta text-mystic-200 font-medium">
              {t(`chineseZodiac.${chinese.animal}.name`, { defaultValue: chinese.animal })}
            </div>
          </div>
        )}
        {lifePathInfo && (
          <div className="text-center p-3 bg-mystic-800/30 rounded-control">
            <div className="text-2xl mb-1 text-gold font-display">{lifePathInfo.number}</div>
            <EyebrowLabel className="block mb-1">
              {t('profile.cosmic.lifePath', { defaultValue: 'Life Path' })}
            </EyebrowLabel>
            <div className="text-meta text-mystic-200 font-medium">
              {t(`lifePath.${lifePath}.title`, { defaultValue: lifePathInfo.title })}
            </div>
          </div>
        )}
      </div>

      {lifePathInfo && (
        <div className="mb-4">
          <p className="text-meta text-mystic-400 italic">
            "{t(`lifePath.${lifePath}.tagline`, { defaultValue: lifePathInfo.tagline })}"
          </p>
        </div>
      )}

      {displayName && (() => {
        const expression = getExpressionNumber(displayName);
        const soulUrge = getSoulUrgeNumber(displayName);
        const personality = getPersonalityNumber(displayName);
        if (!expression && !soulUrge && !personality) return null;
        return (
          <div className="grid grid-cols-3 gap-2 mb-4 pt-3 border-t border-mystic-800/50">
            {expression && (
              <div className="text-center">
                <div className="text-lg font-display text-gold">{expression}</div>
                <EyebrowLabel className="block mt-0.5">
                  {t('profile.cosmic.expression', { defaultValue: 'Expression' })}
                </EyebrowLabel>
                <div className="text-caption text-mystic-400 mt-0.5">
                  {getNumberMeaning(expression)?.title}
                </div>
              </div>
            )}
            {soulUrge && (
              <div className="text-center">
                <div className="text-lg font-display text-cosmic-violetLight">{soulUrge}</div>
                <EyebrowLabel className="block mt-0.5">
                  {t('profile.cosmic.soulUrge', { defaultValue: 'Soul Urge' })}
                </EyebrowLabel>
                <div className="text-caption text-mystic-400 mt-0.5">
                  {getNumberMeaning(soulUrge)?.title}
                </div>
              </div>
            )}
            {personality && (
              <div className="text-center">
                <div className="text-lg font-display text-cosmic-blue">{personality}</div>
                <EyebrowLabel className="block mt-0.5">
                  {t('profile.cosmic.personality', { defaultValue: 'Personality' })}
                </EyebrowLabel>
                <div className="text-caption text-mystic-400 mt-0.5">
                  {getNumberMeaning(personality)?.title}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {(moonSign || risingSign) && (
        <div className="flex gap-2 text-meta text-mystic-500 mb-3">
          {moonSign && <span>🌙 {moonSign}</span>}
          {risingSign && <span>↗ {risingSign}</span>}
        </div>
      )}

      <Button variant="outline" fullWidth onClick={handleShare}>
        <Share2 className="w-4 h-4 mr-2" />
        {t('profile.cosmic.shareButton', { defaultValue: 'Share Cosmic Profile' })}
      </Button>
    </Card>
  );
}
