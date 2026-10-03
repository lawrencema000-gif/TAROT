import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Page, PageHeader } from '../components/ui';
import { PaywallSheet } from '../components/premium/PaywallSheet';
import { CartomancySection } from '../components/cartomancy/CartomancySection';
import { useT } from '../i18n/useT';
import { setPageMeta } from '../utils/seo';
import { CartomancyCorpusGate } from '../components/cartomancy/CartomancyCorpusGate';

/**
 * /cartomancy/reading — the table. `?spread=carto-wish` begins that spread
 * at once (the hub's spread rows link here); without it the section opens
 * on its own picker. Auth-only: the reading counts against the free tier
 * and saves to the reader's library.
 */
function CartomancyReadingPageBody() {
  const { t } = useT('app');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [paywall, setPaywall] = useState<string | null>(null);

  useEffect(() => {
    setPageMeta(
      t('cartomancy.seo.readingTitle', { defaultValue: 'Playing card reading' }),
      t('cartomancy.seo.readingDesc', { defaultValue: 'Shuffle an ordinary deck and read it the old way: suit, number and color, card by card.' }),
    );
  }, [t]);

  return (
    <Page spacing="md">
      <PageHeader eyebrow={t('cartomancy.eyebrow', { defaultValue: 'Cartomancy' })} title={t('cartomancy.title', { defaultValue: 'Playing cards' })} divider />
      <CartomancySection initialSpread={params.get('spread')} onShowPaywall={setPaywall} onExit={() => navigate('/cartomancy')} />
      <PaywallSheet open={paywall !== null} onClose={() => setPaywall(null)} feature={paywall ?? ''} />
    </Page>
  );
}

/** The page, once the playing-card corpus for the active locale is loaded (English: at once). */
export function CartomancyReadingPage() {
  return (
    <CartomancyCorpusGate>
      <CartomancyReadingPageBody />
    </CartomancyCorpusGate>
  );
}
