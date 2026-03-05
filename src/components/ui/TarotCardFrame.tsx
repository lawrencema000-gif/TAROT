import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useImageLoader } from '../../hooks/useImageLoader';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface TarotCardFrameProps {
  name: string;
  image?: string;
  reversed?: boolean;
  revealed?: boolean;
  onReveal?: () => void;
  size?: 'sm' | 'md' | 'lg';
  glowOnHover?: boolean;
  priority?: 'high' | 'normal' | 'low';
}

const sizeConfig = {
  sm: { width: 'w-24', height: 'h-36', iconSize: 'w-6 h-6', textSize: 'text-xs' },
  md: { width: 'w-32', height: 'h-48', iconSize: 'w-8 h-8', textSize: 'text-sm' },
  lg: { width: 'w-40', height: 'h-60', iconSize: 'w-10 h-10', textSize: 'text-base' },
};

export function TarotCardFrame({
  name,
  image,
  reversed = false,
  revealed = true,
  onReveal,
  size = 'md',
  glowOnHover = true,
  priority = 'normal',
}: TarotCardFrameProps) {
  const [isFlipping, setIsFlipping] = useState(false);
  const config = sizeConfig[size];

  const { imageUrl, isLoading } = useImageLoader({
    url: revealed ? image : undefined,
    useCache: true,
    priority,
  });

  const handleClick = () => {
    if (!revealed && onReveal) {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
      setIsFlipping(true);
      setTimeout(() => {
        Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
        onReveal();
        setIsFlipping(false);
      }, 300);
    }
  };

  return (
    <div
      className={`
        relative ${config.width} ${config.height} perspective-1000
        ${!revealed && onReveal ? 'cursor-pointer' : ''}
      `}
      onClick={handleClick}
    >
      <div
        className={`
          relative w-full h-full preserve-3d transition-transform duration-500 ease-out
          ${isFlipping ? 'rotate-y-180' : ''}
          ${reversed && revealed ? 'rotate-180' : ''}
        `}
      >
        <div
          className={`
            absolute inset-0 rounded-xl overflow-hidden backface-hidden
            bg-gradient-to-br from-mystic-800 via-mystic-850 to-mystic-900
            border-2 border-gold/30 shadow-card
            ${glowOnHover ? 'hover:shadow-card-hover hover:border-gold/50 transition-all duration-300' : ''}
          `}
        >
          <div className="absolute inset-1 rounded-lg border border-gold/20" />
          <div className="absolute inset-2 rounded-md border border-gold/10" />

          {revealed ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-3">
              {image ? (
                <>
                  <img
                    src={imageUrl}
                    alt={name}
                    className={`w-full h-full object-cover rounded-lg transition-opacity duration-300 ${
                      isLoading ? 'opacity-0' : 'opacity-100'
                    }`}
                  />
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className={`${config.iconSize} text-gold animate-pulse`} />
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex-1 flex items-center justify-center">
                    <Sparkles className={`${config.iconSize} text-gold`} />
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 text-center">
                    <p className={`${config.textSize} font-display text-gold line-clamp-2`}>
                      {name}
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-full bg-gradient-to-br from-mystic-700 to-mystic-900 flex items-center justify-center">
                <div className="relative">
                  <Sparkles className={`${config.iconSize} text-gold animate-pulse-slow`} />
                  <div className="absolute inset-0 animate-spin-slow">
                    <div className="w-full h-full border-t border-gold/30 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {glowOnHover && (
            <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-t from-gold/5 to-transparent" />
            </div>
          )}
        </div>

        <div
          className={`
            absolute inset-0 rounded-xl overflow-hidden backface-hidden rotate-y-180
            bg-gradient-to-br from-mystic-700 via-mystic-800 to-mystic-900
            border-2 border-gold/20 shadow-card
          `}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3/4 h-3/4 border border-gold/30 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Sparkles className="w-8 h-8 text-gold/60 mx-auto mb-2" />
                <p className="text-xs text-gold/40 font-display">Arcana</p>
              </div>
            </div>
          </div>
          <div className="absolute inset-1 rounded-lg border border-gold/10" />
        </div>
      </div>

      {reversed && revealed && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-mystic-800 px-2 py-0.5 rounded text-xs text-mystic-400 border border-mystic-700">
          Reversed
        </div>
      )}
    </div>
  );
}
