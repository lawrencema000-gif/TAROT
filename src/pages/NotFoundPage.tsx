import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Page, PageHeader, EmptyState, Button } from '../components/ui';
import { useT } from '../i18n/useT';

/**
 * The screen behind every path the router does not know.
 *
 * It used to be `<Navigate to="/" />`, so a mistyped share link, a stale
 * bookmark or a shortcut from an old build silently landed on Home — which
 * reads as the app having reset. Naming the miss and offering the way back
 * is the whole job; nothing is wrong with the account, and the copy says so.
 *
 * Rendered inside both route tables (signed in and the public shell), so it
 * carries no assumptions about the chrome around it.
 */
export function NotFoundPage() {
  const { t } = useT('app');
  const navigate = useNavigate();

  return (
    <Page spacing="md">
      <PageHeader
        title={t('notFound.title', { defaultValue: 'Page not found' })}
        divider
      />
      <EmptyState
        icon={<Compass />}
        title={t('notFound.heading', { defaultValue: 'This page doesn’t exist' })}
        description={t('notFound.body', {
          defaultValue: 'The link may be mistyped, or the page has moved. Nothing you have saved is affected.',
        })}
        action={
          <Button variant="gold" onClick={() => navigate('/')}>
            {t('notFound.backHome', { defaultValue: 'Back to Home' })}
          </Button>
        }
      />
    </Page>
  );
}
