import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import i18n from '../../../i18n/config';
import { CrisisBanner } from '../CrisisBanner';
import { CRISIS_RESOURCES } from '../../../../supabase/functions/_shared/crisis';

/*
 * social-ai-05: 741741 is Crisis Text Line's US short code only
 * (crisistextline.org/where-we-are), but the banner said "US/UK/CA/IE" on
 * every path: Journal and Dream (no server resources) and Community (the
 * server's resources lead in English). The Text link's number and keyword
 * come from the locale file, so a row's label must never advertise a line its
 * link does not dial.
 */

afterEach(cleanup);
afterAll(async () => {
  await i18n.changeLanguage('en');
});

const PATHS = [
  ['Journal / Dream (no server resources)', undefined],
  ['Community (the server leads)', CRISIS_RESOURCES],
] as const;

describe('the English banner labels 741741 as US only (social-ai-05)', () => {
  it.each(PATHS)('%s', async (_name, resources) => {
    await i18n.changeLanguage('en');
    render(<CrisisBanner open onClose={() => {}} resources={resources} />);
    const dialog = screen.getByRole('dialog', { name: 'You are not alone' });
    expect(dialog).toHaveTextContent('Text HOME to 741741 · 24/7 · US');
    expect(dialog.textContent).not.toMatch(/\b(?:UK|CA|IE)\b/);
    expect(within(dialog).getByRole('link', { name: 'Text' })).toHaveAttribute('href', 'sms:741741?body=HOME');
    expect(within(dialog).getByRole('link', { name: 'Call' })).toHaveAttribute('href', 'tel:988');
  });
});

describe('every row dials the number its label names', () => {
  const CASES = (['en', 'ja', 'ko', 'zh'] as const).flatMap((lng) =>
    PATHS.map(([name, resources]) => [lng, name, resources] as const),
  );

  it.each(CASES)('%s, %s', async (lng, _name, resources) => {
    await i18n.changeLanguage(lng);
    render(<CrisisBanner open onClose={() => {}} resources={resources} />);
    const dialog = screen.getByRole('dialog');
    const dialing = within(dialog)
      .getAllByRole('link')
      .filter((a) => /^(?:tel|sms):/.test(a.getAttribute('href') ?? ''));
    expect(dialing.length).toBeGreaterThanOrEqual(2);
    for (const link of dialing) {
      const number = (link.getAttribute('href') ?? '').replace(/^(?:tel|sms):/, '').replace(/\?body=.*$/, '');
      expect(link.parentElement?.textContent).toContain(number);
    }
  });
});
