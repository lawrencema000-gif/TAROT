import { useState, type ReactNode } from 'react';
import { ListSkeleton } from '../ui';
import { useT } from '../../i18n/useT';
import { useCartomancyCorpus } from '../../i18n/localizePlayingCard';

/**
 * Holds a playing-card screen until its locale's corpus is in the store.
 *
 * The ja/ko/zh corpus is fetched on demand (see useCartomancyCorpus), so
 * the first render of a cartomancy screen in those languages would read
 * English card text and then swap it. This shows a skeleton for that one
 * round trip instead. English is ready at once and never sees it.
 *
 * It gates the FIRST mount only. Once its children have rendered they stay
 * mounted through a language change: unmounting them threw away a laid
 * reading, a paid AI interpretation and an unsaved table the moment the
 * reader switched language. The screens under it read the corpus through
 * their own `useCartomancyCorpus()`, so their text re-localizes in place
 * when the new locale's corpus lands (English until then).
 */
export function CartomancyCorpusGate({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const ready = useCartomancyCorpus();
  const [shown, setShown] = useState(ready);
  const { t } = useT('common');
  if (ready && !shown) setShown(true);
  if (ready || shown) return <>{children}</>;
  return (
    <div role="status" aria-busy="true" aria-label={t('labels.loading', { defaultValue: 'Loading…' })}>
      {fallback ?? (
        <div className="px-4 py-6">
          <ListSkeleton count={4} />
        </div>
      )}
    </div>
  );
}
