import { Sparkles } from 'lucide-react';
import { Card, Button, toast } from '../ui';
import { useT } from '../../i18n/useT';
import { getZodiacSign, zodiacData } from '../../utils/zodiac';
import { getChineseZodiacInfo } from '../../utils/chineseZodiac';
import { getLifePath, LIFE_PATH_INFO } from '../../utils/numerology';
import { renderShareCard, shareOrDownload } from '../../utils/shareableResultCard';

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
  const chinese = getChineseZodiacInfo(birthDate);
  const lifePath = getLifePath(birthDate);
  const lifePathInfo = lifePath ? LIFE_PATH_INFO[lifePath] : null;

  const handleShare = async () => {
    try {
      const sunLabel = sunInfo ? `${sunInfo.symbol} ${t(`zodiac.${sunSign}.name`, { defaultValue: sunInfo.name })}` : '';
      const chineseLabel = chinese ? `${chinese.emoji} ${t(`chineseZodiac.${chinese.animal}.name`, { defaultValue: chinese.animal })}` : '';
      const lifePathLabel = lifePathInfo ? `${lifePathInfo.number} · ${t(`lifePath.${lifePath}.title`, { defaultValue: lifePathInfo.title })}` : '';
      const parts = [sunLabel, chineseLabel, lifePathLabel].filter(Boolean);
      const bodyLines = parts.join(' · ');

      const blob = await renderShareCard({
        title: displayName || t('profile.cosmic.myProfile', { defaultValue: 'My Cosmic Profile' }),
        subtitle: t('profile.cosmic.shareSubtitle', { defaultValue: 'Sun · Animal · Life Path' }),
        tagline: bodyLines,
        affirmation: lifePathInfo ? t(`lifePath.${lifePath}.affirmation`, { defaultValue: lifePathInfo.affirmation }) : '',
        brand: 'Arcana · Cosmic Profile',
      });
      const outcome = await shareOrDownload(blob, 'arcana-cosmic-profile.png', 'My cosmic profile — Arcana');
      if (outcome === 'downloaded') {
        toast(t('quizzes.share.downloaded', { defaultValue: 'Saved to your device' }), 'success');
      }
    } catch {
      toast(t('quizzes.share.failed', { defaultValue: 'Could not create share image' }), 'error');
    }
  };

  return (
    <Card padding="md" className="bg-gradient-to-br from-gold/5 via-mystic-900 to-mystic-900 border-gold/20">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-gold" />
        <h3 className="text-sm font-medium text-gold tracking-wide">
          {t('profile.cosmic.title', { defaultValue: 'Cosmic Profile' })}
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {sunInfo && (
          <div className="text-center p-3 bg-mystic-800/30 rounded-xl">
            <div className="text-2xl mb-1">{sunInfo.symbol}</div>
            <div className="text-[10px] uppercase tracking-wider text-mystic-500 mb-1">
              {t('profile.cosmic.sun', { defaultValue: 'Sun' })}
            </div>
            <div className="text-xs text-mystic-200 font-medium">
              {t(`zodiac.${sunSign}.name`, { defaultValue: sunInfo.name })}
            </div>
          </div>
        )}
        {chinese && (
          <div className="text-center p-3 bg-mystic-800/30 rounded-xl">
            <div className="text-2xl mb-1">{chinese.emoji}</div>
            <div className="text-[10px] uppercase tracking-wider text-mystic-500 mb-1">
              {t('profile.cosmic.animal', { defaultValue: 'Animal' })}
            </div>
            <div className="text-xs text-mystic-200 font-medium">
              {t(`chineseZodiac.${chinese.animal}.name`, { defaultValue: chinese.animal })}
            </div>
          </div>
        )}
        {lifePathInfo && (
          <div className="text-center p-3 bg-mystic-800/30 rounded-xl">
            <div className="text-2xl mb-1 text-gold font-display">{lifePathInfo.number}</div>
            <div className="text-[10px] uppercase tracking-wider text-mystic-500 mb-1">
              {t('profile.cosmic.lifePath', { defaultValue: 'Life Path' })}
            </div>
            <div className="text-xs text-mystic-200 font-medium">
              {t(`lifePath.${lifePath}.title`, { defaultValue: lifePathInfo.title })}
            </div>
          </div>
        )}
      </div>

      {lifePathInfo && (
        <div className="mb-4">
          <p className="text-xs text-mystic-400 italic leading-relaxed">
            "{t(`lifePath.${lifePath}.tagline`, { defaultValue: lifePathInfo.tagline })}"
          </p>
        </div>
      )}

      {(moonSign || risingSign) && (
        <div className="flex gap-2 text-xs text-mystic-500 mb-3">
          {moonSign && <span>🌙 {moonSign}</span>}
          {risingSign && <span>↗ {risingSign}</span>}
        </div>
      )}

      <Button variant="outline" fullWidth onClick={handleShare} className="min-h-[44px]">
        <Sparkles className="w-4 h-4 mr-2" />
        {t('profile.cosmic.shareButton', { defaultValue: 'Share Cosmic Profile' })}
      </Button>
    </Card>
  );
}
