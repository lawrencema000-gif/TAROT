import { useState } from 'react';
import { Search, Sparkles, BookOpen, Brain, Clock } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { Input } from '../ui/Input';

interface SearchSheetProps {
  open: boolean;
  onClose: () => void;
}

const recentSearches = [
  'The Tower meaning',
  'Love compatibility Aries',
  'Three card spread',
];

const quickLinks = [
  { icon: Sparkles, label: 'Daily Horoscope', category: 'readings' },
  { icon: BookOpen, label: 'Journal Prompts', category: 'journal' },
  { icon: Brain, label: 'Personality Quiz', category: 'quizzes' },
];

export function SearchSheet({ open, onClose }: SearchSheetProps) {
  const [query, setQuery] = useState('');

  return (
    <Sheet open={open} onClose={onClose} title="Search">
      <div className="space-y-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-mystic-500" />
          <Input
            type="text"
            placeholder="Search readings, journal, quizzes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-11"
            autoFocus
          />
        </div>

        {!query && (
          <>
            <div>
              <h3 className="text-sm font-medium text-mystic-400 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Recent Searches
              </h3>
              <div className="space-y-2">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => setQuery(search)}
                    className="w-full text-left px-3 py-2 rounded-lg text-mystic-200 hover:bg-mystic-800/50 transition-colors"
                  >
                    {search}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-mystic-400 mb-3">
                Quick Links
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {quickLinks.map((link, index) => {
                  const Icon = link.icon;
                  return (
                    <button
                      key={index}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-mystic-800/50 border border-mystic-700/50 hover:border-gold/30 transition-all"
                    >
                      <Icon className="w-5 h-5 text-gold" />
                      <span className="text-mystic-100">{link.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {query && (
          <div className="py-8 text-center">
            <Search className="w-12 h-12 text-mystic-600 mx-auto mb-3" />
            <p className="text-mystic-400">
              Search results for "{query}" will appear here
            </p>
          </div>
        )}
      </div>
    </Sheet>
  );
}
