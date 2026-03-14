import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, ChevronRight, Search, Check, Loader2, Sparkles, RefreshCw, AlertCircle, Globe, Home, Triangle, Star } from 'lucide-react';
import { Button, Card, Input } from '../ui';
import { useGeocode } from '../../hooks/useAstrology';
import { useAuth } from '../../context/AuthContext';
import { SIGN_SYMBOLS } from '../../types/astrology';
import type { ZodiacSign, ChartMode } from '../../types/astrology';

interface Props {
  onComplete: () => void;
  computeChart: (params: {
    birthDate: string;
    birthTime: string | null;
    lat: number;
    lon: number;
    timezone: string;
    chartMode: string;
  }) => Promise<unknown>;
}

export function HoroscopeOnboarding({ onComplete, computeChart }: Props) {
  const { profile, updateProfile } = useAuth();
  const { results: geoResults, loading: geoLoading, error: geoError, search: geoSearch } = useGeocode();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const hasBirthDate = !!profile?.birthDate;
  const hasCoordinates = !!(profile?.birthLat && profile?.birthLon);

  const [forceLocationEntry, setForceLocationEntry] = useState(false);
  const needsLocation = !hasCoordinates || forceLocationEntry;
  const canAutoCompute = hasBirthDate && hasCoordinates && !forceLocationEntry;

  const [locationQuery, setLocationQuery] = useState(profile?.birthPlace || '');
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lon: number; displayName: string } | null>(
    hasCoordinates ? { lat: profile!.birthLat!, lon: profile!.birthLon!, displayName: profile?.birthPlace || '' } : null
  );
  const [computing, setComputing] = useState(false);
  const [computeError, setComputeError] = useState('');
  const [autoComputeAttempted, setAutoComputeAttempted] = useState(false);
  const autoResolveAttempted = useRef(false);

  useEffect(() => {
    if (canAutoCompute && !autoComputeAttempted) {
      setAutoComputeAttempted(true);
      handleAutoCompute();
    }
  }, [canAutoCompute, autoComputeAttempted]);

  useEffect(() => {
    if (autoResolveAttempted.current) return;
    if (profile?.birthPlace && !profile?.birthLat && !profile?.birthLon) {
      autoResolveAttempted.current = true;
      handleAutoResolveLocation(profile.birthPlace);
    }
  }, [profile?.birthPlace, profile?.birthLat, profile?.birthLon]);

  const handleAutoResolveLocation = async (place: string) => {
    setComputing(true);
    setComputeError('');
    try {
      await geoSearch(place);
    } catch {
      setComputing(false);
    }
  };

  useEffect(() => {
    if (!autoResolveAttempted.current || !computing) return;
    if (geoLoading) return;

    if (geoResults.length > 0 && !selectedLocation && profile?.birthDate) {
      const best = geoResults[0];
      setSelectedLocation(best);
      setLocationQuery(best.displayName);
      doCompute(best);
    } else if (!geoLoading && geoResults.length === 0 && computing) {
      setComputing(false);
      setComputeError('Could not find your birth location. Please search below.');
    }
  }, [geoResults, geoLoading]);

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

  const doCompute = async (loc: { lat: number; lon: number; displayName: string }) => {
    if (!profile?.birthDate) return;
    setComputing(true);
    setComputeError('');
    try {
      const tz = profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      const chartMode: ChartMode = profile.birthTime ? 'exact' : 'unknown';

      await updateProfile({
        birthPlace: loc.displayName,
        birthLat: loc.lat,
        birthLon: loc.lon,
      });

      await computeChart({
        birthDate: profile.birthDate,
        birthTime: chartMode === 'unknown' ? null : (profile.birthTime || null),
        lat: loc.lat,
        lon: loc.lon,
        timezone: tz,
        chartMode,
      });
      onComplete();
    } catch {
      setComputeError('Could not compute your chart. Please try a different location.');
      setComputing(false);
    }
  };

  const handleLocationInput = (value: string) => {
    setLocationQuery(value);
    setSelectedLocation(null);
    setComputeError('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length >= 2) {
      debounceRef.current = setTimeout(() => { geoSearch(value); }, 400);
    }
  };

  const handleCompute = () => {
    if (!selectedLocation) return;
    doCompute(selectedLocation);
  };

  if (computing && !computeError) {
    return <ChartComputeProgress />;
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
            <div className="rounded-xl border border-mystic-700/60 bg-mystic-900/80 overflow-hidden max-h-48 overflow-y-auto">
              {geoResults.map((r, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedLocation(r);
                    setLocationQuery(r.displayName);
                  }}
                  className="w-full text-left px-3 py-3 hover:bg-mystic-800/60 transition-colors text-sm text-mystic-300 cursor-pointer flex items-start gap-2 border-b border-mystic-800/40 last:border-b-0"
                >
                  <MapPin className="w-3.5 h-3.5 text-mystic-500 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{r.displayName}</span>
                </button>
              ))}
            </div>
          )}

          {!selectedLocation && !geoLoading && geoError && (
            <p className="text-xs text-amber-400/80">{geoError}</p>
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

        {!selectedLocation && !computing && (
          <p className="text-center text-xs text-mystic-500">Select a location above to continue</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-3">
        <div className="w-14 h-14 mx-auto rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertCircle className="w-7 h-7 text-red-400" />
        </div>
        <h2 className="font-display text-xl font-semibold text-mystic-100">Chart Computation Failed</h2>
        <p className="text-mystic-400 text-sm max-w-sm mx-auto">
          {computeError || 'We could not compute your natal chart. Please try again or update your birth location.'}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          variant="gold"
          fullWidth
          onClick={() => {
            setAutoComputeAttempted(false);
            setComputeError('');
          }}
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </Button>
        <Button
          variant="ghost"
          fullWidth
          onClick={() => {
            setSelectedLocation(null);
            setLocationQuery('');
            setComputeError('');
            setAutoComputeAttempted(true);
            setForceLocationEntry(true);
          }}
        >
          <MapPin className="w-4 h-4" />
          Change Birth Location
        </Button>
      </div>
    </div>
  );
}

const COMPUTE_STEPS = [
  { label: 'Calculating planetary positions...', icon: Globe },
  { label: 'Computing house cusps...', icon: Home },
  { label: 'Analyzing aspects...', icon: Triangle },
  { label: 'Preparing your chart...', icon: Star },
] as const;

function ChartComputeProgress() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev < COMPUTE_STEPS.length - 1 ? prev + 1 : prev));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-8">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold/20 to-mystic-800 flex items-center justify-center animate-pulse">
        <Sparkles className="w-8 h-8 text-gold" />
      </div>

      <div className="w-full max-w-xs space-y-3">
        {COMPUTE_STEPS.map((s, i) => {
          const StepIcon = s.icon;
          const isActive = i === step;
          const isDone = i < step;

          return (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-500 ${
                isActive
                  ? 'bg-gold/10 border border-gold/25'
                  : isDone
                  ? 'bg-mystic-800/20 border border-transparent'
                  : 'border border-transparent opacity-40'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                isActive
                  ? 'bg-gold/20'
                  : isDone
                  ? 'bg-teal/20'
                  : 'bg-mystic-800/40'
              }`}>
                {isDone ? (
                  <Check className="w-3.5 h-3.5 text-teal" />
                ) : isActive ? (
                  <Loader2 className="w-3.5 h-3.5 text-gold animate-spin" />
                ) : (
                  <StepIcon className="w-3.5 h-3.5 text-mystic-500" />
                )}
              </div>
              <span className={`text-sm transition-all duration-500 ${
                isActive
                  ? 'text-gold font-medium'
                  : isDone
                  ? 'text-mystic-400'
                  : 'text-mystic-500'
              }`}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div className="h-1 bg-mystic-800/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gold to-teal rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${((step + 1) / COMPUTE_STEPS.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
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
