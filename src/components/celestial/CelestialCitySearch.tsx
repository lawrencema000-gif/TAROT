import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin } from 'lucide-react';
import { GLOBAL_CITIES } from '../../data/citiesGlobal';
import { ccToFlag, type City } from '../../utils/celestialGeo';
import { useT } from '../../i18n/useT';

/**
 * Autocomplete city picker for the Celestial Map.
 *
 * Searches our curated 280-city dataset by name (case-insensitive
 * substring match, prefix-prioritised). Hands back the chosen city
 * to the parent so the map can centre on it and the City Insight
 * Panel can open at its lat/lon.
 *
 * Match ranking:
 *   1. Exact case-insensitive name match
 *   2. Name starts-with the query (then by population desc)
 *   3. Name contains the query (then by population desc)
 *   4. Country starts-with the query (so "France" → Paris first)
 */

interface Props {
  onPick: (city: City) => void;
}

const MAX_RESULTS = 6;

export function CelestialCitySearch({ onPick }: Props) {
  const { t } = useT('app');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Close the dropdown on outside click / Escape — needs both because
  // mobile touch doesn't always fire blur reliably across browsers.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const results = useMemo<City[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const exact: City[] = [];
    const prefixName: City[] = [];
    const containsName: City[] = [];
    const prefixCountry: City[] = [];
    for (const c of GLOBAL_CITIES) {
      const name = c.name.toLowerCase();
      const country = c.country.toLowerCase();
      if (name === q) exact.push(c);
      else if (name.startsWith(q)) prefixName.push(c);
      else if (name.includes(q)) containsName.push(c);
      else if (country.startsWith(q)) prefixCountry.push(c);
    }
    const byPop = (a: City, b: City) => b.pop - a.pop;
    return [
      ...exact.sort(byPop),
      ...prefixName.sort(byPop),
      ...containsName.sort(byPop),
      ...prefixCountry.sort(byPop),
    ].slice(0, MAX_RESULTS);
  }, [query]);

  function handlePick(c: City) {
    setQuery('');
    setOpen(false);
    onPick(c);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-mystic-400"
          aria-hidden
        />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={t('celestial.search.placeholder', {
            defaultValue: 'Search a city or country…',
          }) as string}
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-mystic-800/50 hairline-gold-soft text-mystic-100 placeholder-mystic-500 text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 transition-all"
          aria-label={t('celestial.search.label', { defaultValue: 'Search a city' }) as string}
        />
      </div>

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-20 left-0 right-0 mt-2 rounded-xl bg-mystic-900/95 backdrop-blur-md hairline-gold-soft overflow-hidden shadow-xl shadow-black/40"
          >
            {results.map((city, i) => (
              <button
                key={`${city.name}-${city.cc}`}
                onClick={() => handlePick(city)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-mystic-800/70 transition-colors ${
                  i > 0 ? 'border-t border-mystic-800/60' : ''
                }`}
              >
                <span className="text-xl flex-shrink-0" aria-hidden>
                  {ccToFlag(city.cc) || <MapPin className="w-4 h-4 text-gold" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-mystic-100 truncate">{city.name}</p>
                  <p className="text-xs text-mystic-500 truncate">{city.country}</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
