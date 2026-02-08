import { useState, useRef, useEffect } from 'react';
import { MapPin, ChevronRight, Search, Check, Loader2, Sparkles } from 'lucide-react';
import { Button, Card, Input } from '../ui';
import { useGeocode, useNatalChart } from '../../hooks/useAstrology';
import { useAuth } from '../../context/AuthContext';
import { SIGN_SYMBOLS } from '../../types/astrology';
import type { ZodiacSign, ChartMode } from '../../types/astrology';

interface Props {
  onComplete: () => void;
}

export function HoroscopeOnboarding({ onComplete }: Props) {
  const { profile, updateProfile } = useAuth();
  const { results: geoResults, loading: geoLoading, search: geoSearch } = useGeocode();
  const { computeChart } = useNatalChart();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const hasBirthDate = !!profile?.birthDate;
  const hasBirthTime = !!profile?.birthTime;
  const hasCoordinates = !!(profile?.birthLat && profile?.birthLon);
  const hasBirthPlace = !!profile?.birthPlace;

  const needsLocation = !hasCoordinates;
  const canAutoCompute = hasBirthDate && hasCoordinates;

  const [locationQuery, setLocationQuery] = useState(profile?.birthPlace || '');
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lon: number; displayName: string } | null>(
    hasCoordinates ? { lat: profile!.birthLat!, lon: profile!.birthLon!, displayName: profile?.birthPlace || '' } : null
  );
  const [computing, setComputing] = useState(false);
  const [computeError, setComputeError] = useState('');
  const [autoComputeAttempted, setAutoComputeAttempted] = useState(false);
  const initialSearchDone = useRef(false);

  useEffect(() => {
    if (canAutoCompute && !autoComputeAttempted) {
      setAutoComputeAttempted(true);
      handleAutoCompute();
    }
  }, [canAutoCompute, autoComputeAttempted]);

  useEffect(() => {
    if (profile?.birthPlace && locationQuery !== profile.birthPlace) {
      setLocationQuery(profile.birthPlace);
    }
  }, [profile?.birthPlace]);

  useEffect(() => {
    if (initialSearchDone.current) return;
    if (profile?.birthPlace && !profile?.birthLat && !profile?.birthLon) {
      initialSearchDone.current = true;
      geoSearch(profile.birthPlace);
    }
  }, [profile?.birthPlace, profile?.birthLat, profile?.birthLon]);

  const handleAutoCompute = async () => {
    if (!profile?.birthDate || !profile?.birthLat || !profile?.birthLon) return;
    setComputing(true);
    setComputeError('');
    try {
      const tz = profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      const chartMode: ChartMode = profile.birthTime ? 'exact' : 'unknown';
      await computeChart({
        birthDate: profile.birthDate,
        birthTime: chartMode === 'unknown' ? null : (profile.birthTime || null),
        lat: profile.birthLat,
        lon: profile.birthLon,
        timezone: tz,
        chartMode,
      });
      onComplete();
    } catch {
      setComputeError('Could not compute your chart automatically. Please confirm your birth location below.');
      setComputing(false);
    }
  };

  const handleLocationInput = (value: string) => {
    setLocationQuery(value);
    setSelectedLocation(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { geoSearch(value); }, 400);
  };

  const handleCompute = async () => {
    if (!selectedLocation || !profile?.birthDate) return;
    setComputing(true);
    setComputeError('');
    try {
      const tz = profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      const chartMode: ChartMode = profile.birthTime ? 'exact' : 'unknown';

      await updateProfile({
        birthPlace: selectedLocation.displayName,
        birthLat: selectedLocation.lat,
        birthLon: selectedLocation.lon,
      });

      await computeChart({
        birthDate: profile.birthDate,
        birthTime: chartMode === 'unknown' ? null : (profile.birthTime || null),
        lat: selectedLocation.lat,
        lon: selectedLocation.lon,
        timezone: tz,
        chartMode,
      });
      onComplete();
    } catch {
      setComputeError('Could not compute your chart. Please try a different location.');
    } finally {
      setComputing(false);
    }
  };

  if (computing && !computeError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold/20 to-mystic-800 flex items-center justify-center animate-pulse">
          <Sparkles className="w-8 h-8 text-gold" />
        </div>
        <p className="text-mystic-300 text-sm">Computing your natal chart...</p>
        <Loader2 className="w-5 h-5 text-gold animate-spin" />
      </div>
    );
  }

  if (needsLocation) {
    return (
      <div className="space-y-6 py-4">
        <div className="text-center space-y-2">
          <h2 className="font-display text-2xl font-semibold text-mystic-100">One More Detail</h2>
          <p className="text-mystic-400 text-sm">
            We need your birth location to compute an accurate natal chart.
            {hasBirthDate && (
              <span className="block mt-1 text-mystic-500">
                Your other birth details are already saved from your profile.
              </span>
            )}
          </p>
        </div>

        {profile?.birthDate && (
          <div className="flex gap-3 justify-center text-xs">
            <div className="px-3 py-1.5 bg-mystic-800/40 rounded-lg border border-mystic-700/30">
              <span className="text-mystic-500">Date:</span>{' '}
              <span className="text-mystic-200">{profile.birthDate}</span>
            </div>
            {profile.birthTime && (
              <div className="px-3 py-1.5 bg-mystic-800/40 rounded-lg border border-mystic-700/30">
                <span className="text-mystic-500">Time:</span>{' '}
                <span className="text-mystic-200">{profile.birthTime}</span>
              </div>
            )}
          </div>
        )}

        <Card padding="lg" className="space-y-4">
          <div className="flex items-center gap-3 text-gold">
            <MapPin className="w-5 h-5" />
            <span className="font-display text-lg font-semibold text-mystic-100">Birth Location</span>
          </div>

          <div className="relative">
            <Input
              value={locationQuery}
              onChange={(e) => handleLocationInput(e.target.value)}
              placeholder="Search city or town..."
              icon={geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            />
          </div>

          {selectedLocation && (
            <div className="flex items-center gap-2 p-3 bg-gold/10 border border-gold/20 rounded-xl">
              <Check className="w-4 h-4 text-gold flex-shrink-0" />
              <span className="text-sm text-mystic-200 truncate">{selectedLocation.displayName}</span>
            </div>
          )}

          {!selectedLocation && geoResults.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {geoResults.map((r, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedLocation(r);
                    setLocationQuery(r.displayName);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-mystic-800/60 transition-colors text-sm text-mystic-300 truncate cursor-pointer"
                >
                  {r.displayName}
                </button>
              ))}
            </div>
          )}

          {computeError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {computeError}
            </div>
          )}
        </Card>

        <Button
          variant="gold"
          fullWidth
          onClick={handleCompute}
          loading={computing}
          disabled={!selectedLocation}
        >
          Compute My Chart
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return null;
}

export function BigThreeDisplay({ bigThree }: { bigThree: { sun: { sign: ZodiacSign }; moon: { sign: ZodiacSign }; rising: { sign: ZodiacSign } | null } }) {
  const items = [
    { label: 'Sun', sign: bigThree.sun.sign },
    { label: 'Moon', sign: bigThree.moon.sign },
    ...(bigThree.rising ? [{ label: 'Rising', sign: bigThree.rising.sign }] : []),
  ];

  return (
    <div className="flex gap-3 justify-center">
      {items.map((item) => (
        <div key={item.label} className="text-center px-4 py-3 bg-mystic-800/40 rounded-xl border border-mystic-700/30">
          <div className="text-2xl mb-1" style={{ fontFamily: 'serif' }}>{SIGN_SYMBOLS[item.sign]}</div>
          <div className="text-xs text-mystic-400">{item.label}</div>
          <div className="text-sm font-medium text-mystic-200">{item.sign}</div>
        </div>
      ))}
    </div>
  );
}
