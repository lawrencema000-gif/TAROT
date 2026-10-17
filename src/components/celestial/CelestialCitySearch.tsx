import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { GLOBAL_CITIES } from '../../data/citiesGlobal';
import { ccToFlag, type City } from '../../utils/celestialGeo';
import { useGeocode } from '../../hooks/useAstrology';
import { useT } from '../../i18n/useT';
import { localizeCountry } from './placeNames';

/**
 * Autocomplete city picker for the Celestial Map and the People form.
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
 *   4. Country starts-with the query, in English or in the reader's
 *      language (so "France" or "日本" lists that country's cities)
 *
 * The list spells its cities in English. A query it cannot answer — a city
 * typed in Japanese, Korean or Chinese (東京, 서울, 上海), or a town it does
 * not carry — goes to the place search the birth-place fields use
 * (astrology-geocode), which answers in the reader's language (p8 F25:
 * those queries used to return nothing, with no word why, and a person
 * saved without a place was cast in UTC). A query nothing answers says so.
 */

interface Props {
  /** `source`: 'list' is the curated list (the nearest listed city); 'search' is the place itself. */
  onPick: (city: City, source: 'list' | 'search') => void;
}

const MAX_RESULTS = 6;

/** A place-search row as a City: its first part is the name, the rest is region and country. No code, no population. */
function toCity(r: { lat: number; lon: number; displayName: string }): City {
  const parts = r.displayName.split(/[,，、]/).map((s) => s.trim()).filter(Boolean);
  return {
    name: parts[0] ?? r.displayName,
    country: parts.slice(1).join(', '),
    cc: '',
    lat: r.lat,
    lon: r.lon,
    pop: 0,
  };
}

export function CelestialCitySearch({ onPick }: Props) {
  const { t } = useT('app');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  // `geoQuery`: the query the place search's rows answer (its results carry no query of their own).
  const { results: geoResults, query: geoQuery, loading: geoLoading, error: geoError, search: geoSearch } = useGeocode();

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

  const q = query.trim();

  const listResults = useMemo<City[]>(() => {
    const lq = q.toLowerCase();
    if (lq.length < 2) return [];
    const exact: City[] = [];
    const prefixName: City[] = [];
    const containsName: City[] = [];
    const prefixCountry: City[] = [];
    for (const c of GLOBAL_CITIES) {
      const name = c.name.toLowerCase();
      const country = c.country.toLowerCase();
      const localCountry = localizeCountry(c.cc, c.country).toLowerCase();
      if (name === lq) exact.push(c);
      else if (name.startsWith(lq)) prefixName.push(c);
      else if (name.includes(lq)) containsName.push(c);
      else if (country.startsWith(lq) || localCountry.startsWith(lq)) prefixCountry.push(c);
    }
    const byPop = (a: City, b: City) => b.pop - a.pop;
    return [
      ...exact.sort(byPop),
      ...prefixName.sort(byPop),
      ...containsName.sort(byPop),
      ...prefixCountry.sort(byPop),
    ].slice(0, MAX_RESULTS);
  }, [q]);

  // Nothing in the list: ask the place search, once the typing pauses.
  const needsSearch = q.length >= 2 && listResults.length === 0;
  useEffect(() => {
    if (!needsSearch) return;
    const timer = setTimeout(() => {
      void geoSearch(q);
    }, 400);
    return () => clearTimeout(timer);
  }, [needsSearch, q, geoSearch]);

  // Rows are listed only as the answer to the text now typed (p9 R32: an
  // earlier search that finished last used to show its places under it).
  const answered = needsSearch && geoQuery === q && !geoLoading;
  const searching = needsSearch && !answered;
  const searchResults = useMemo<City[]>(() => {
    if (!answered) return [];
    // One row per place the reader can tell apart: the search can answer
    // the same town twice (Paris the city and Paris the département).
    const seen = new Set<string>();
    return geoResults
      .map(toCity)
      .filter((c) => {
        const key = `${c.name}\u0000${c.country}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, MAX_RESULTS);
  }, [answered, geoResults]);
  const rows: { city: City; source: 'list' | 'search' }[] = needsSearch
    ? searchResults.map((city) => ({ city, source: 'search' as const }))
    : listResults.map((city) => ({ city, source: 'list' as const }));
  // The search's own word on what went wrong (no match, offline, or only
  // same-name places outside the region typed), else a plain "no match".
  const notice = answered
    ? geoError ?? (rows.length === 0
      ? t('celestial.search.noResults', {
          query: q,
          defaultValue: 'No places matched “{{query}}”. Check the spelling, or try a larger city nearby.',
        })
      : null)
    : null;

  function handlePick(c: City, source: 'list' | 'search') {
    setQuery('');
    setOpen(false);
    onPick(c, source);
  }

  const showDropdown = open && (rows.length > 0 || searching || !!notice);

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
          className="w-full pl-11 pr-4 py-3 rounded-control bg-mystic-800/50 hairline-gold-soft text-mystic-100 placeholder-mystic-500 text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 transition-all"
          aria-label={t('celestial.search.label', { defaultValue: 'Search a city' }) as string}
        />
      </div>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-20 left-0 right-0 mt-2 rounded-control bg-mystic-900 hairline-gold-soft overflow-hidden"
          >
            {rows.map(({ city, source }, i) => (
              <button
                key={`${source}-${city.name}-${city.cc}-${i}`}
                onClick={() => handlePick(city, source)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-mystic-800/70 transition-colors ${
                  i > 0 ? 'border-t border-mystic-800/60' : ''
                }`}
              >
                <span className="text-xl flex-shrink-0" aria-hidden>
                  {ccToFlag(city.cc) || <MapPin className="w-4 h-4 text-gold" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-mystic-100 truncate">{city.name}</p>
                  {city.country && (
                    <p className="text-meta text-mystic-500 truncate">
                      {source === 'list' ? localizeCountry(city.cc, city.country) : city.country}
                    </p>
                  )}
                </div>
              </button>
            ))}
            {searching && (
              <p className="flex items-center gap-2 px-4 py-3 text-meta text-mystic-400" role="status">
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
                {t('celestial.search.searching', { defaultValue: 'Searching places…' })}
              </p>
            )}
            {notice && (
              <p className={`px-4 py-3 text-meta text-mystic-300 ${rows.length > 0 ? 'border-t border-mystic-800/60' : ''}`} role="status">
                {notice}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
