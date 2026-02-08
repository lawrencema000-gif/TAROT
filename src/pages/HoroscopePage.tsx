import { useState } from 'react';
import { Lock, Sun, Moon, Star, Sparkles, Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, Card } from '../components/ui';
import { PaywallSheet } from '../components/premium';

export function HoroscopePage() {
  const { profile } = useAuth();
  const [showPaywall, setShowPaywall] = useState(false);

  const isPremium = profile?.isPremium || false;

  if (!isPremium) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-b from-mystic-900 via-mystic-800 to-mystic-900 pb-24">
          <div className="max-w-lg mx-auto p-6 space-y-6">
            <div className="text-center space-y-4 pt-8">
              <div className="relative w-32 h-32 mx-auto">
                <div className="absolute inset-0 bg-gradient-to-br from-gold/20 via-amber-500/10 to-gold/5 rounded-full animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sun className="w-16 h-16 text-gold drop-shadow-[0_0_20px_rgba(212,175,55,0.5)]" />
                </div>
              </div>

              <h1 className="text-3xl font-display font-bold text-white">
                Your Personal Horoscope
              </h1>
              <p className="text-lg text-mystic-300 max-w-md mx-auto">
                Unlock your complete astrological profile with personalized daily insights, birth chart analysis, and cosmic forecasts
              </p>
            </div>

            <Card className="bg-gradient-to-br from-gold/5 to-amber-500/5 border-gold/20 overflow-hidden relative">
              <div className="absolute top-3 right-3">
                <div className="flex items-center gap-1 px-2 py-1 bg-gold/20 rounded-full">
                  <Crown className="w-3 h-3 text-gold" />
                  <span className="text-xs font-medium text-gold">Premium</span>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <h3 className="text-xl font-semibold text-white mb-4">
                  What You'll Unlock
                </h3>
                <div className="space-y-3">
                  <FeatureItem
                    icon={Sun}
                    title="Daily Personalized Forecast"
                    description="Tailored daily horoscopes based on your unique birth chart, not generic sun signs"
                  />
                  <FeatureItem
                    icon={Star}
                    title="Complete Birth Chart"
                    description="Full natal chart with all planetary placements, houses, and aspects analyzed"
                  />
                  <FeatureItem
                    icon={Moon}
                    title="Transit Calendar"
                    description="Track upcoming cosmic shifts and how they'll affect your personal chart"
                  />
                  <FeatureItem
                    icon={Sparkles}
                    title="Weekly & Monthly Forecasts"
                    description="Extended predictions to plan ahead and make the most of cosmic timing"
                  />
                </div>
              </div>
            </Card>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-gold/0 via-gold/10 to-gold/0 blur-xl" />
              <Button
                onClick={() => setShowPaywall(true)}
                className="w-full relative bg-gradient-to-r from-gold to-amber-600 hover:from-gold/90 hover:to-amber-600/90 text-mystic-900 font-semibold py-4 text-lg shadow-lg shadow-gold/25"
              >
                <Crown className="w-5 h-5 mr-2" />
                Unlock Premium Access
              </Button>
            </div>

            <div className="text-center">
              <p className="text-sm text-mystic-500">
                Join thousands discovering their cosmic potential
              </p>
            </div>
          </div>
        </div>

        <PaywallSheet
          open={showPaywall}
          onClose={() => setShowPaywall(false)}
          feature="Horoscope Hub"
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-mystic-900 via-mystic-800 to-mystic-900 pb-24">
      <div className="max-w-lg mx-auto p-6">
        <div className="text-center py-12 space-y-4">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-gold/20 to-amber-500/10 rounded-full flex items-center justify-center">
            <Sun className="w-12 h-12 text-gold" />
          </div>
          <h2 className="text-2xl font-display font-bold text-white">
            Coming Soon
          </h2>
          <p className="text-mystic-400 max-w-sm mx-auto">
            Your personalized horoscope hub is being prepared. Check back soon for your cosmic insights!
          </p>
        </div>
      </div>
    </div>
  );
}

interface FeatureItemProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

function FeatureItem({ icon: Icon, title, description }: FeatureItemProps) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
        <Icon className="w-5 h-5 text-gold" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-white mb-1">{title}</h4>
        <p className="text-sm text-mystic-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
