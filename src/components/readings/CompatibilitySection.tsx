import { useState } from 'react';
import {
  Heart,
  Users,
  Briefcase,
  ChevronRight,
  Lock,
  Sparkles,
  AlertCircle,
  Info,
  Brain,
  Zap,

  Star,
  TrendingUp,
} from 'lucide-react';
import { Card, Button, Input, Chip } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { getZodiacSign, zodiacData, getCompatibility } from '../../utils/zodiac';
import type { ZodiacSign } from '../../types';

type CompatibilityMode = 'love' | 'friendship' | 'work';

interface CompatibilitySectionProps {
  onShowPaywall: (feature: string) => void;
}

const mbtiTypes = ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'];
const loveLanguages = ['Words of Affirmation', 'Acts of Service', 'Receiving Gifts', 'Quality Time', 'Physical Touch'];

const celebrityCouples: Record<string, string[]> = {
  'aries-aries': ['Sarah Michelle Gellar & Freddie Prinze Jr.'],
  'aries-leo': ['Reese Witherspoon & Jim Toth'],
  'aries-sagittarius': ['Lady Gaga & Taylor Kinney'],
  'taurus-taurus': ['David Beckham & Victoria Beckham'],
  'taurus-virgo': ['George Clooney & Amal Clooney'],
  'taurus-capricorn': ['Gigi Hadid & Zayn Malik'],
  'gemini-libra': ['Angelina Jolie & Brad Pitt'],
  'gemini-aquarius': ['Kanye West & Kim Kardashian'],
  'cancer-scorpio': ['Tom Hanks & Rita Wilson'],
  'cancer-pisces': ['Prince William & Kate Middleton'],
  'leo-sagittarius': ['Barack Obama & Michelle Obama'],
  'virgo-capricorn': ['Beyoncé & Jay-Z'],
  'libra-aquarius': ['Will Smith & Jada Pinkett Smith'],
  'scorpio-pisces': ['Ryan Reynolds & Blake Lively'],
};

interface CompatibilityResult {
  overallScore: number;
  connectionStyle: string;
  strengths: string[];
  frictionPoints: string[];
  advice: string;
  dimensions: {
    emotional: number;
    intellectual: number;
    physical: number;
    spiritual: number;
  };
  celebrityExample?: string;
}

export function CompatibilitySection({ onShowPaywall }: CompatibilitySectionProps) {
  const { profile } = useAuth();
  const [mode, setMode] = useState<CompatibilityMode>('love');
  const [partnerName, setPartnerName] = useState('');
  const [partnerBirthDate, setPartnerBirthDate] = useState('');
  const [partnerMbti, setPartnerMbti] = useState('');
  const [partnerLoveLanguage, setPartnerLoveLanguage] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<CompatibilityResult | null>(null);
  const [showAllMbti, setShowAllMbti] = useState(false);

  const userSign = profile?.birthDate ? getZodiacSign(profile.birthDate) : 'aries';
  const userInfo = zodiacData[userSign];

  const handleCalculate = () => {
    if (!profile?.isPremium && mode !== 'love') {
      onShowPaywall('Full Compatibility Analysis');
      return;
    }

    if (!partnerBirthDate) return;

    const partnerSign = getZodiacSign(partnerBirthDate);
    const partnerInfo = zodiacData[partnerSign];
    const compatibility = getCompatibility(userSign, partnerSign);

    const modeModifier = mode === 'love' ? 1 : mode === 'friendship' ? 0.9 : 0.85;
    const score = Math.min(100, Math.round(compatibility * modeModifier));

    const connectionStyles: Record<string, string> = {
      fire: 'Passionate and dynamic',
      earth: 'Stable and grounded',
      air: 'Intellectually stimulating',
      water: 'Emotionally deep',
    };

    const elementMatch = userInfo.element === partnerInfo.element;
    const complementary = (
      (userInfo.element === 'fire' && partnerInfo.element === 'air') ||
      (userInfo.element === 'air' && partnerInfo.element === 'fire') ||
      (userInfo.element === 'earth' && partnerInfo.element === 'water') ||
      (userInfo.element === 'water' && partnerInfo.element === 'earth')
    );

    let connectionStyle = '';
    if (elementMatch) {
      connectionStyle = `Deeply ${connectionStyles[userInfo.element]}`;
    } else if (complementary) {
      connectionStyle = 'Beautifully complementary';
    } else {
      connectionStyle = 'Challenging but growth-oriented';
    }

    const strengths: string[] = [];
    const frictionPoints: string[] = [];

    if (score >= 70) {
      strengths.push('Natural understanding and rapport');
      strengths.push('Shared values and communication style');
      strengths.push('Mutual respect and admiration');
    } else if (score >= 50) {
      strengths.push('Potential for balanced partnership');
      strengths.push('Opportunity for personal growth');
      frictionPoints.push('May require extra communication effort');
    } else {
      strengths.push('Unique perspectives to share');
      frictionPoints.push('Different approaches to life');
      frictionPoints.push('May need patience and understanding');
    }

    if (mode === 'love') {
      if (complementary) strengths.push('Strong romantic chemistry');
      else frictionPoints.push('Romance may need intentional nurturing');
    } else if (mode === 'work') {
      if (elementMatch) strengths.push('Similar work styles');
      else frictionPoints.push('Different approaches to tasks');
    }

    const advices = [
      'Focus on open communication and shared experiences.',
      'Appreciate your differences as opportunities for growth.',
      'Create space for both togetherness and independence.',
      'Practice active listening and validation.',
    ];

    const calculateDimensions = () => {
      const base = score / 100;
      return {
        emotional: Math.min(100, Math.round((base + (complementary ? 0.1 : 0) + (userInfo.element === 'water' ? 0.15 : 0)) * 100)),
        intellectual: Math.min(100, Math.round((base + (elementMatch ? 0.15 : 0) + (userInfo.element === 'air' ? 0.1 : 0)) * 100)),
        physical: Math.min(100, Math.round((base + (userInfo.element === 'fire' ? 0.15 : 0) + (complementary ? 0.1 : 0)) * 100)),
        spiritual: Math.min(100, Math.round((base + (userInfo.element === 'water' ? 0.1 : 0) + (partnerInfo.element === 'earth' ? 0.1 : 0)) * 100)),
      };
    };

    const getCelebrityExample = () => {
      const pairKey1 = `${userSign}-${partnerSign}`;
      const pairKey2 = `${partnerSign}-${userSign}`;
      const couples = celebrityCouples[pairKey1] || celebrityCouples[pairKey2];
      return couples ? couples[Math.floor(Math.random() * couples.length)] : undefined;
    };

    setResult({
      overallScore: score,
      connectionStyle,
      strengths,
      frictionPoints,
      advice: advices[Math.floor(Math.random() * advices.length)],
      dimensions: calculateDimensions(),
      celebrityExample: getCelebrityExample(),
    });
    setShowResult(true);
  };

  const handleReset = () => {
    setShowResult(false);
    setResult(null);
    setPartnerName('');
    setPartnerBirthDate('');
    setPartnerMbti('');
    setPartnerLoveLanguage('');
  };

  if (showResult && result) {
    const partnerSign = getZodiacSign(partnerBirthDate);
    const partnerInfo = zodiacData[partnerSign];

    return (
      <div className="space-y-6">
        <button
          onClick={handleReset}
          className="text-sm text-mystic-400 hover:text-mystic-300"
        >
          Start Over
        </button>

        <div className="text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-mystic-800 flex items-center justify-center text-2xl mb-1">
                {userInfo.symbol}
              </div>
              <p className="text-xs text-mystic-400">You</p>
            </div>
            <Heart className="w-6 h-6 text-cosmic-rose" />
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-mystic-800 flex items-center justify-center text-2xl mb-1">
                {partnerInfo.symbol}
              </div>
              <p className="text-xs text-mystic-400">{partnerName || partnerInfo.name}</p>
            </div>
          </div>

          <div className="relative w-32 h-32 mx-auto mb-4">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-mystic-800"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(result.overallScore / 100) * 352} 352`}
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#d4af37" />
                  <stop offset="100%" stopColor="#f5d67b" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-display text-gold">{result.overallScore}%</span>
              <span className="text-xs text-mystic-400">Match</span>
            </div>
          </div>

          <h2 className="font-display text-xl text-mystic-100">{result.connectionStyle}</h2>
        </div>

        {result.celebrityExample && (
          <Card padding="md" className="bg-gold/5 border-gold/20">
            <div className="flex items-center gap-2 justify-center">
              <Star className="w-4 h-4 text-gold" />
              <p className="text-sm text-mystic-300">
                Famous pairing: <span className="text-gold font-medium">{result.celebrityExample}</span>
              </p>
            </div>
          </Card>
        )}

        <Card padding="md">
          <h3 className="font-medium text-mystic-200 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gold" />
            Relationship Dimensions
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-cosmic-rose" />
                  <span className="text-sm text-mystic-300">Emotional</span>
                </div>
                <span className="text-sm text-gold font-medium">{result.dimensions.emotional}%</span>
              </div>
              <div className="h-2 bg-mystic-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cosmic-rose to-cosmic-rose/70 rounded-full transition-all"
                  style={{ width: `${result.dimensions.emotional}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-cosmic-blue" />
                  <span className="text-sm text-mystic-300">Intellectual</span>
                </div>
                <span className="text-sm text-gold font-medium">{result.dimensions.intellectual}%</span>
              </div>
              <div className="h-2 bg-mystic-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cosmic-blue to-cosmic-blue/70 rounded-full transition-all"
                  style={{ width: `${result.dimensions.intellectual}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-gold" />
                  <span className="text-sm text-mystic-300">Physical</span>
                </div>
                <span className="text-sm text-gold font-medium">{result.dimensions.physical}%</span>
              </div>
              <div className="h-2 bg-mystic-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-gold to-gold/70 rounded-full transition-all"
                  style={{ width: `${result.dimensions.physical}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal" />
                  <span className="text-sm text-mystic-300">Spiritual</span>
                </div>
                <span className="text-sm text-gold font-medium">{result.dimensions.spiritual}%</span>
              </div>
              <div className="h-2 bg-mystic-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal to-teal/70 rounded-full transition-all"
                  style={{ width: `${result.dimensions.spiritual}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <h3 className="font-medium text-gold mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Strengths
          </h3>
          <ul className="space-y-2">
            {result.strengths.map((strength, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-mystic-300">
                <span className="text-gold mt-1">+</span>
                {strength}
              </li>
            ))}
          </ul>
        </Card>

        {result.frictionPoints.length > 0 && (
          <Card padding="md">
            <h3 className="font-medium text-mystic-300 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Friction Points
            </h3>
            <ul className="space-y-2">
              {result.frictionPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-mystic-400">
                  <span className="text-mystic-500 mt-1">-</span>
                  {point}
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card padding="md" className="bg-gold/5 border-gold/20">
          <h3 className="font-medium text-gold mb-2">Do this today</h3>
          <p className="text-sm text-mystic-300">{result.advice}</p>
        </Card>

        <p className="text-xs text-mystic-500 text-center italic">
          This is a reflection tool - not a verdict. Use it to spark conversation and understanding.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 p-3 bg-mystic-800/50 border border-mystic-700 rounded-lg">
        <Info className="w-4 h-4 text-mystic-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-mystic-500 leading-relaxed">
          This app is for reflection and entertainment. It does not provide medical, legal, or financial advice.
        </p>
      </div>

      <div className="relative -mx-4 px-4">
        <div
          className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory scroll-smooth"
          style={{
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          <Chip
            selected={mode === 'love'}
            onClick={() => setMode('love')}
          >
            <Heart className="w-3.5 h-3.5" />
            Love
          </Chip>
          <Chip
            selected={mode === 'friendship'}
            onClick={() => {
              if (!profile?.isPremium) {
                onShowPaywall('Friendship Compatibility');
                return;
              }
              setMode('friendship');
            }}
          >
            {!profile?.isPremium && <Lock className="w-3 h-3" />}
            <Users className="w-3.5 h-3.5" />
            Friendship
          </Chip>
          <Chip
            selected={mode === 'work'}
            onClick={() => {
              if (!profile?.isPremium) {
                onShowPaywall('Work Compatibility');
                return;
              }
              setMode('work');
            }}
          >
            {!profile?.isPremium && <Lock className="w-3 h-3" />}
            <Briefcase className="w-3.5 h-3.5" />
            Work
          </Chip>
        </div>
      </div>

      <Card variant="glow" padding="lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-14 h-14 rounded-full bg-mystic-800 flex items-center justify-center text-2xl">
            {userInfo.symbol}
          </div>
          <div>
            <p className="text-xs text-mystic-500">You</p>
            <h3 className="font-display text-lg text-gold">{userInfo.name}</h3>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-mystic-400 mb-2">Their Name</label>
            <Input
              type="text"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              placeholder="Enter their name"
            />
          </div>

          <div>
            <label className="block text-sm text-mystic-400 mb-2">
              Their Birth Date <span className="text-gold">*</span>
            </label>
            <Input
              type="date"
              value={partnerBirthDate}
              onChange={(e) => setPartnerBirthDate(e.target.value)}
            />
          </div>

          <div className="pt-2 border-t border-mystic-700">
            <p className="text-xs text-mystic-500 mb-3">Optional: More details for deeper insight</p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-mystic-400 mb-2">Their MBTI Type</label>
                <div className="flex flex-wrap gap-1.5">
                  {(showAllMbti ? mbtiTypes : mbtiTypes.slice(0, 8)).map(type => (
                    <button
                      key={type}
                      onClick={() => setPartnerMbti(partnerMbti === type ? '' : type)}
                      className={`px-2 py-1 rounded text-xs transition-colors ${
                        partnerMbti === type
                          ? 'bg-gold/20 text-gold border border-gold/30'
                          : 'bg-mystic-800 text-mystic-400 border border-transparent hover:border-mystic-600'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                  {!showAllMbti && (
                    <button
                      onClick={() => setShowAllMbti(true)}
                      className="px-2 py-1 text-xs text-mystic-500 hover:text-gold transition-colors"
                    >
                      +8 more
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm text-mystic-400 mb-2">Their Love Language</label>
                <select
                  value={partnerLoveLanguage}
                  onChange={(e) => setPartnerLoveLanguage(e.target.value)}
                  className="w-full px-4 py-3 bg-mystic-800 border border-mystic-700 rounded-xl text-mystic-100 focus:border-gold/50 focus:ring-1 focus:ring-gold/50 outline-none"
                >
                  <option value="">Select...</option>
                  {loveLanguages.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Button
        variant="gold"
        fullWidth
        disabled={!partnerBirthDate}
        onClick={handleCalculate}
        className="min-h-[52px]"
      >
        Calculate Compatibility
        <ChevronRight className="w-4 h-4" />
      </Button>

      <Card padding="md">
        <h3 className="font-medium text-mystic-200 mb-3">Your Best Matches</h3>
        <p className="text-sm text-mystic-400 mb-4">As a {userInfo.name}, you're most compatible with:</p>
        <div className="flex gap-2 flex-wrap">
          {getTopMatches(userSign).map(sign => (
            <span key={sign} className="px-3 py-1.5 bg-mystic-800 rounded-full text-sm text-mystic-300">
              {zodiacData[sign].name}
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}

function getTopMatches(sign: ZodiacSign): ZodiacSign[] {
  const element = zodiacData[sign].element;

  const sameElement: ZodiacSign[] = (Object.keys(zodiacData) as ZodiacSign[])
    .filter(s => zodiacData[s].element === element && s !== sign)
    .slice(0, 2);

  const complementary: ZodiacSign[] = [];
  if (element === 'fire' || element === 'air') {
    complementary.push(
      ...(Object.keys(zodiacData) as ZodiacSign[])
        .filter(s => (zodiacData[s].element === 'fire' || zodiacData[s].element === 'air') && s !== sign)
        .slice(0, 2)
    );
  } else {
    complementary.push(
      ...(Object.keys(zodiacData) as ZodiacSign[])
        .filter(s => (zodiacData[s].element === 'earth' || zodiacData[s].element === 'water') && s !== sign)
        .slice(0, 2)
    );
  }

  return [...new Set([...sameElement, ...complementary])].slice(0, 4);
}
