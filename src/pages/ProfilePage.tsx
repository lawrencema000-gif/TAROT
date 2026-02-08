import { useState, useEffect, useRef } from 'react';
import {
  User,
  Target,
  Crown,
  ChevronRight,
  Bookmark,
  Flame,
  Star,
  Edit2,
  Heart,
  Brain,
  Zap,
  MapPin,
  Search,
  Loader2,
  Check,
} from 'lucide-react';
import { Card, Button, Sheet, Input, ChipGroup, toast } from '../components/ui';
import { PaywallSheet } from '../components/premium/PaywallSheet';
import { useAuth } from '../context/AuthContext';
import { useGeocode } from '../hooks/useAstrology';
import { supabase } from '../lib/supabase';
import { getZodiacSign, zodiacData } from '../utils/zodiac';
import { getLevelThresholds, getXPProgress } from '../services/levelSystem';
import type { Goal } from '../types';
const goalOptions: { label: string; value: Goal }[] = [
  { label: 'Love', value: 'love' },
  { label: 'Career', value: 'career' },
  { label: 'Clarity', value: 'clarity' },
  { label: 'Growth', value: 'growth' },
  { label: 'Wellness', value: 'wellness' },
  { label: 'Creativity', value: 'creativity' },
];

const loveLanguageLabels: Record<string, string> = {
  'words-of-affirmation': 'Words of Affirmation',
  'quality-time': 'Quality Time',
  'receiving-gifts': 'Receiving Gifts',
  'acts-of-service': 'Acts of Service',
  'physical-touch': 'Physical Touch',
};

interface SavedHighlight {
  id: string;
  highlight_type: string;
  date: string;
  content: Record<string, unknown>;
}

export function ProfilePage() {
  const { profile, user, updateProfile } = useAuth();
  const { results: geoResults, loading: geoLoading, error: geoError, search: geoSearch } = useGeocode();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedHighlights, setSavedHighlights] = useState<SavedHighlight[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [xpProgress, setXpProgress] = useState({ current: 0, required: 100, percentage: 0 });
  const [levelThresholds, setLevelThresholds] = useState<Map<number, number>>(new Map());
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lon: number; displayName: string } | null>(null);
  const [editData, setEditData] = useState({
    displayName: profile?.displayName || '',
    birthTime: profile?.birthTime || '',
    birthPlace: profile?.birthPlace || '',
    goals: (profile?.goals || []) as Goal[],
  });

  const zodiacSign = profile?.birthDate ? getZodiacSign(profile.birthDate) : null;
  const zodiacInfo = zodiacSign ? zodiacData[zodiacSign] : null;

  useEffect(() => {
    if (profile) {
      setEditData({
        displayName: profile.displayName || '',
        birthTime: profile.birthTime || '',
        birthPlace: profile.birthPlace || '',
        goals: profile.goals || [],
      });
      setLocationQuery(profile.birthPlace || '');
      if (profile.birthLat && profile.birthLon) {
        setSelectedLocation({
          lat: profile.birthLat,
          lon: profile.birthLon,
          displayName: profile.birthPlace || '',
        });
      } else {
        setSelectedLocation(null);
      }
    }
  }, [profile]);

  useEffect(() => {
    const loadLevelData = async () => {
      const thresholds = await getLevelThresholds();
      setLevelThresholds(thresholds);

      if (profile) {
        const progress = getXPProgress(profile.xp || 0, profile.level || 1, thresholds);
        setXpProgress(progress);
      }
    };
    loadLevelData();
  }, [profile]);

  const loadSavedHighlights = async () => {
    if (!user) return;
    setLoadingSaved(true);
    const { data } = await supabase
      .from('saved_highlights')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) {
      setSavedHighlights(data as SavedHighlight[]);
    }
    setLoadingSaved(false);
  };

  const handleLocationInput = (value: string) => {
    setLocationQuery(value);
    setEditData(d => ({ ...d, birthPlace: value }));
    setSelectedLocation(null);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.trim().length > 2) {
      debounceRef.current = setTimeout(() => {
        geoSearch(value);
      }, 500);
    }
  };

  const handleSelectLocation = (location: { lat: number; lon: number; displayName: string }) => {
    setSelectedLocation(location);
    setLocationQuery(location.displayName);
    setEditData(d => ({ ...d, birthPlace: location.displayName }));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    const updateData: Record<string, unknown> = {
      displayName: editData.displayName,
      birthTime: editData.birthTime || undefined,
      birthPlace: editData.birthPlace || undefined,
      goals: editData.goals,
    };

    if (selectedLocation) {
      updateData.birthLat = selectedLocation.lat;
      updateData.birthLon = selectedLocation.lon;
    }

    const { error } = await updateProfile(updateData);

    setSaving(false);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast('Profile updated', 'success');
      setShowEditProfile(false);
    }
  };

  const handleUpgrade = () => {
    setShowPaywall(true);
  };

  const formatBirthProfile = () => {
    if (!profile?.birthDate) return null;
    const date = new Date(profile.birthDate);
    const dateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const parts = [dateStr];
    if (profile.birthTime) parts.push(`at ${profile.birthTime}`);
    if (profile.birthPlace) parts.push(`in ${profile.birthPlace}`);
    return parts.join(' ');
  };

  return (
    <div className="space-y-4 pb-6">

      <Card variant="glow" padding="lg">
        <div className="flex items-start gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gold/30 via-mystic-700 to-cosmic-blue/30 flex items-center justify-center ring-2 ring-gold/20">
              {zodiacInfo ? (
                <span className="text-4xl">{zodiacInfo.symbol}</span>
              ) : (
                <User className="w-10 h-10 text-mystic-400" />
              )}
            </div>
            {profile?.isPremium && (
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-gold rounded-full flex items-center justify-center shadow-lg">
                <Crown className="w-4 h-4 text-mystic-950" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-xl text-mystic-100 truncate">{profile?.displayName || 'Seeker'}</h2>
            {zodiacInfo && (
              <p className="text-gold text-sm">{zodiacInfo.name}</p>
            )}
            <p className="text-sm text-mystic-500 truncate">{profile?.email}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowEditProfile(true)}>
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="bg-mystic-800/50 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Flame className="w-4 h-4 text-gold" />
              <span className="text-2xl font-display text-mystic-100">{profile?.streak || 0}</span>
            </div>
            <p className="text-xs text-mystic-500">Day Streak</p>
          </div>
          <div className="bg-mystic-800/50 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Star className="w-4 h-4 text-cosmic-blue" />
              <span className="text-2xl font-display text-mystic-100">Level {profile?.level || 1}</span>
            </div>
            <p className="text-xs text-mystic-500">{profile?.seekerRank || 'Novice Seeker'}</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-mystic-500">XP Progress</span>
            <span className="text-gold">{xpProgress.current} / {xpProgress.required} XP</span>
          </div>
          <div className="h-1.5 bg-mystic-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold to-gold-dark rounded-full transition-all"
              style={{ width: `${xpProgress.percentage}%` }}
            />
          </div>
        </div>
      </Card>

      {(profile?.mbtiType || profile?.loveLanguage) && (
        <Card padding="md">
          <h3 className="text-sm font-medium text-mystic-400 mb-3">Personality Badges</h3>
          <div className="flex flex-wrap gap-2">
            {profile?.mbtiType && (
              <div className="flex items-center gap-2 px-3 py-2 bg-cosmic-blue/10 border border-cosmic-blue/30 rounded-xl">
                <Brain className="w-4 h-4 text-cosmic-blue" />
                <span className="text-sm font-medium text-mystic-100">{profile.mbtiType}</span>
              </div>
            )}
            {profile?.loveLanguage && (
              <div className="flex items-center gap-2 px-3 py-2 bg-cosmic-rose/10 border border-cosmic-rose/30 rounded-xl">
                <Heart className="w-4 h-4 text-cosmic-rose" />
                <span className="text-sm font-medium text-mystic-100">
                  {loveLanguageLabels[profile.loveLanguage] || profile.loveLanguage}
                </span>
              </div>
            )}
          </div>
        </Card>
      )}

      {formatBirthProfile() && (
        <Card padding="md">
          <h3 className="text-sm font-medium text-mystic-400 mb-2">Birth Profile</h3>
          <div className="flex items-start gap-3">
            {zodiacInfo && (
              <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center text-xl">
                {zodiacInfo.symbol}
              </div>
            )}
            <div>
              <p className="text-mystic-200">{formatBirthProfile()}</p>
              <p className="text-sm text-mystic-500 mt-1">{zodiacInfo?.element} Sign</p>
            </div>
          </div>
        </Card>
      )}

      {profile?.goals && profile.goals.length > 0 && (
        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-mystic-500" />
            <h3 className="text-sm font-medium text-mystic-400">Your Goals</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.goals.map(goal => (
              <span key={goal} className="px-3 py-1.5 bg-gold/10 border border-gold/20 rounded-full text-sm text-gold capitalize">
                {goal}
              </span>
            ))}
          </div>
        </Card>
      )}

      <Card padding="none">
        {profile?.isPremium ? (
          <div className="p-4 flex items-center gap-4 border-b border-mystic-700 bg-gold/5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center flex-shrink-0">
              <Crown className="w-6 h-6 text-mystic-950" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gold">Premium Member</h3>
              <p className="text-sm text-mystic-400">Full access to all features</p>
            </div>
            <Zap className="w-5 h-5 text-gold" />
          </div>
        ) : (
          <button
            onClick={handleUpgrade}
            className="w-full p-4 flex items-center gap-4 border-b border-mystic-700 hover:bg-mystic-800/30 active:scale-[0.99] transition-all text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold/20 to-mystic-800 flex items-center justify-center flex-shrink-0">
              <Crown className="w-6 h-6 text-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-mystic-100">Upgrade to Premium</h3>
              <p className="text-sm text-mystic-400">Unlock all spreads, charts & more</p>
            </div>
            <ChevronRight className="w-5 h-5 text-mystic-500 flex-shrink-0" />
          </button>
        )}

        <button
          onClick={() => { setShowSaved(true); loadSavedHighlights(); }}
          className="w-full p-4 flex items-center gap-4 hover:bg-mystic-800/30 active:scale-[0.99] transition-all text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-mystic-800 flex items-center justify-center flex-shrink-0">
            <Bookmark className="w-6 h-6 text-mystic-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-mystic-100">Saved</h3>
            <p className="text-sm text-mystic-400">Your bookmarked readings & insights</p>
          </div>
          <ChevronRight className="w-5 h-5 text-mystic-500 flex-shrink-0" />
        </button>
      </Card>

      <p className="text-center text-xs text-mystic-600 px-4">
        This app is for entertainment and self-reflection purposes only.
      </p>

      <Sheet open={showEditProfile} onClose={() => setShowEditProfile(false)} title="Edit Profile">
        <div className="space-y-6">
          <Input
            label="Display Name"
            value={editData.displayName}
            onChange={e => setEditData(d => ({ ...d, displayName: e.target.value }))}
            placeholder="Your name"
          />

          <Input
            label="Birth Time (optional)"
            type="time"
            value={editData.birthTime}
            onChange={e => setEditData(d => ({ ...d, birthTime: e.target.value }))}
          />

          <div>
            <label className="block text-sm font-medium text-mystic-300 mb-2">Birth Place (optional)</label>
            <div className="relative">
              <Input
                value={locationQuery}
                onChange={e => handleLocationInput(e.target.value)}
                placeholder="Search city or town..."
                icon={geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              />
            </div>

            {selectedLocation && (
              <div className="flex items-center gap-2 p-3 mt-2 bg-gold/10 border border-gold/20 rounded-xl">
                <Check className="w-4 h-4 text-gold flex-shrink-0" />
                <span className="text-sm text-mystic-200 truncate">{selectedLocation.displayName}</span>
              </div>
            )}

            {!selectedLocation && geoResults.length > 0 && (
              <div className="space-y-1 mt-2 max-h-48 overflow-y-auto border border-mystic-700 rounded-xl bg-mystic-900">
                {geoResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectLocation(r)}
                    className="w-full text-left px-3 py-2.5 hover:bg-mystic-800/60 transition-colors text-sm text-mystic-300 truncate cursor-pointer first:rounded-t-xl last:rounded-b-xl"
                  >
                    <MapPin className="w-3.5 h-3.5 inline mr-2 text-mystic-500" />
                    {r.displayName}
                  </button>
                ))}
              </div>
            )}

            {!selectedLocation && !geoLoading && geoError && (
              <p className="text-xs text-amber-400/80 mt-1">{geoError}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-mystic-300 mb-3">Your Goals</label>
            <ChipGroup
              options={goalOptions}
              selected={editData.goals}
              onChange={goals => setEditData(d => ({ ...d, goals: goals as Goal[] }))}
              multiple
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="ghost" fullWidth onClick={() => setShowEditProfile(false)}>
              Cancel
            </Button>
            <Button variant="primary" fullWidth onClick={handleSaveProfile} loading={saving}>
              Save Changes
            </Button>
          </div>
        </div>
      </Sheet>

      <Sheet open={showSaved} onClose={() => setShowSaved(false)} title="Saved">
        <div className="space-y-3">
          {loadingSaved ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-mystic-800/30 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : savedHighlights.length === 0 ? (
            <div className="text-center py-12">
              <Bookmark className="w-12 h-12 text-mystic-700 mx-auto mb-3" />
              <p className="text-mystic-400">No saved items yet</p>
              <p className="text-sm text-mystic-500 mt-1">Bookmark readings and insights to see them here</p>
            </div>
          ) : (
            savedHighlights.map(highlight => (
              <Card key={highlight.id} padding="md">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    highlight.highlight_type === 'tarot' ? 'bg-cosmic-blue/20' :
                    highlight.highlight_type === 'horoscope' ? 'bg-gold/20' : 'bg-mystic-700'
                  }`}>
                    <span className="text-lg">
                      {highlight.highlight_type === 'tarot' ? '🎴' :
                       highlight.highlight_type === 'horoscope' ? '⭐' : '✨'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-mystic-200 capitalize">{highlight.highlight_type}</p>
                    <p className="text-xs text-mystic-500">{new Date(highlight.date).toLocaleDateString()}</p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </Sheet>

      <PaywallSheet
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
      />
    </div>
  );
}
