import { useState, useRef } from 'react';
import { Calendar, Clock, MapPin, ChevronRight, ChevronLeft, Search, Check, Loader2, HelpCircle } from 'lucide-react';
import { Button, Card, Input } from '../ui';
import { useGeocode, useNatalChart } from '../../hooks/useAstrology';
import { SIGN_SYMBOLS } from '../../types/astrology';
import type { ZodiacSign, ChartMode } from '../../types/astrology';

interface Props {
  onComplete: () => void;
}

type Step = 'date' | 'time' | 'location' | 'confirm';
const STEPS: Step[] = ['date', 'time', 'location', 'confirm'];

export function HoroscopeOnboarding({ onComplete }: Props) {
  const [step, setStep] = useState<Step>('date');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [chartMode, setChartMode] = useState<ChartMode>('exact');
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lon: number; displayName: string } | null>(null);
  const [computing, setComputing] = useState(false);
  const [computeError, setComputeError] = useState('');

  const { results: geoResults, loading: geoLoading, search: geoSearch } = useGeocode();
  const { computeChart } = useNatalChart();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const stepIndex = STEPS.indexOf(step);

  const handleLocationInput = (value: string) => {
    setLocationQuery(value);
    setSelectedLocation(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { geoSearch(value); }, 400);
  };

  const handleNext = () => {
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next);
  };

  const handleBack = () => {
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev);
  };

  const handleCompute = async () => {
    if (!selectedLocation) return;
    setComputing(true);
    setComputeError('');
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await computeChart({
        birthDate,
        birthTime: chartMode === 'unknown' ? null : birthTime,
        lat: selectedLocation.lat,
        lon: selectedLocation.lon,
        timezone: tz,
        chartMode,
      });
      onComplete();
    } catch {
      setComputeError('Could not compute your chart. Please check your details and try again.');
    } finally {
      setComputing(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 'date': return !!birthDate;
      case 'time': return chartMode === 'unknown' || !!birthTime;
      case 'location': return !!selectedLocation;
      case 'confirm': return true;
      default: return false;
    }
  };

  return (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-2">
        <h2 className="font-display text-2xl font-semibold text-mystic-100">Your Cosmic Blueprint</h2>
        <p className="text-mystic-400 text-sm">Enter your birth details for a personalized chart</p>
      </div>

      <div className="flex gap-2 justify-center">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`h-1.5 w-10 rounded-full transition-all ${
              i <= stepIndex ? 'bg-gold' : 'bg-mystic-700'
            }`}
          />
        ))}
      </div>

      {step === 'date' && (
        <Card padding="lg" className="space-y-4">
          <div className="flex items-center gap-3 text-gold">
            <Calendar className="w-5 h-5" />
            <span className="font-display text-lg font-semibold text-mystic-100">Birth Date</span>
          </div>
          <Input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            label="When were you born?"
          />
        </Card>
      )}

      {step === 'time' && (
        <Card padding="lg" className="space-y-4">
          <div className="flex items-center gap-3 text-gold">
            <Clock className="w-5 h-5" />
            <span className="font-display text-lg font-semibold text-mystic-100">Birth Time</span>
          </div>

          <div className="flex gap-2">
            {(['exact', 'approximate', 'unknown'] as ChartMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setChartMode(mode)}
                className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  chartMode === mode
                    ? 'bg-gold/15 text-gold border border-gold/25'
                    : 'bg-mystic-800/60 text-mystic-400 border border-mystic-700/40'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          {chartMode !== 'unknown' && (
            <Input
              type="time"
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
              label={chartMode === 'approximate' ? 'Best guess' : 'Exact time'}
            />
          )}

          {chartMode === 'unknown' && (
            <div className="flex items-start gap-3 p-3 bg-mystic-800/40 rounded-xl">
              <HelpCircle className="w-4 h-4 text-mystic-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-mystic-400">
                Without birth time, your Rising sign and house placements won't be available. You can add it later.
              </p>
            </div>
          )}
        </Card>
      )}

      {step === 'location' && (
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
        </Card>
      )}

      {step === 'confirm' && (
        <Card padding="lg" className="space-y-4">
          <div className="text-center space-y-1">
            <span className="font-display text-lg font-semibold text-mystic-100">Confirm Details</span>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-mystic-800/50">
              <span className="text-mystic-400">Date</span>
              <span className="text-mystic-200">{birthDate}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-mystic-800/50">
              <span className="text-mystic-400">Time</span>
              <span className="text-mystic-200">
                {chartMode === 'unknown' ? 'Unknown' : `${birthTime} (${chartMode})`}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-mystic-800/50">
              <span className="text-mystic-400">Location</span>
              <span className="text-mystic-200 text-right max-w-[200px] truncate">
                {selectedLocation?.displayName}
              </span>
            </div>
          </div>

          {computeError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {computeError}
            </div>
          )}
        </Card>
      )}

      <div className="flex gap-3">
        {stepIndex > 0 && (
          <Button variant="ghost" onClick={handleBack} className="flex-shrink-0">
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
        )}
        <div className="flex-1" />
        {step === 'confirm' ? (
          <Button variant="gold" onClick={handleCompute} loading={computing} disabled={!canProceed()}>
            Compute My Chart
          </Button>
        ) : (
          <Button variant="primary" onClick={handleNext} disabled={!canProceed()}>
            Continue
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
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
