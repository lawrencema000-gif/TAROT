import { useState } from 'react';
import { Star, Sparkles, BookOpen, Brain, Filter } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { Chip } from '../ui/Chip';
import { useT } from '../../i18n/useT';

interface SavedSheetProps {
  open: boolean;
  onClose: () => void;
}

type SavedFilter = 'all' | 'readings' | 'journal' | 'quizzes';

const filters: { value: SavedFilter; labelKey: string }[] = [
  { value: 'all', labelKey: 'saved.filters.all' },
  { value: 'readings', labelKey: 'saved.filters.readings' },
  { value: 'journal', labelKey: 'saved.filters.journal' },
  { value: 'quizzes', labelKey: 'saved.filters.quizzes' },
];

const mockSavedItems = [
  {
    id: '1',
    type: 'reading',
    title: 'Three Card Spread',
    subtitle: 'Past, Present, Future',
    date: 'Dec 28, 2025',
    icon: Sparkles,
  },
  {
    id: '2',
    type: 'journal',
    title: 'Morning Reflection',
    subtitle: 'Gratitude and intentions',
    date: 'Dec 27, 2025',
    icon: BookOpen,
  },
  {
    id: '3',
    type: 'quiz',
    title: 'Love Language Result',
    subtitle: 'Words of Affirmation',
    date: 'Dec 25, 2025',
    icon: Brain,
  },
];

export function SavedSheet({ open, onClose }: SavedSheetProps) {
  const { t } = useT('app');
  const [activeFilter, setActiveFilter] = useState<SavedFilter>('all');

  const filteredItems = mockSavedItems.filter(
    item => activeFilter === 'all' || item.type === activeFilter.replace('s', '')
  );

  return (
    <Sheet open={open} onClose={onClose} title={t('saved.title')} variant="glow">
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-mystic-400" />
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {filters.map((filter) => (
              <Chip
                key={filter.value}
                label={t(filter.labelKey)}
                selected={activeFilter === filter.value}
                onSelect={() => setActiveFilter(filter.value)}
                size="sm"
              />
            ))}
          </div>
        </div>

        {filteredItems.length > 0 ? (
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className="w-full flex items-start gap-4 p-4 rounded-xl bg-mystic-800/50 border border-mystic-700/50 hover:border-gold/30 transition-all text-left"
                >
                  <div className="p-2 rounded-lg bg-gold/10">
                    <Icon className="w-5 h-5 text-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-mystic-100 truncate">
                      {item.title}
                    </h4>
                    <p className="text-sm text-mystic-400 truncate">
                      {item.subtitle}
                    </p>
                    <p className="text-xs text-mystic-500 mt-1">{item.date}</p>
                  </div>
                  <Star className="w-5 h-5 text-gold fill-gold flex-shrink-0" />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center">
            <Star className="w-12 h-12 text-mystic-600 mx-auto mb-3" />
            <p className="text-mystic-400">{t('saved.empty')}</p>
            <p className="text-sm text-mystic-500 mt-1">
              {t('saved.emptySubAlt')}
            </p>
          </div>
        )}
      </div>
    </Sheet>
  );
}
