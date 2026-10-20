import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';

/*
 * p9 QT2 request 4: Zodiac Scholar counts the Astrology guide's sign pages
 * (/astrology/<sign>), and nothing inside the app led to them. The best
 * matches in Compatibility now open each sign's page, and the card links the
 * guide itself (/astrology, a member route that renders the guide in the
 * member shell).
 */

let birthDate = '1990-04-01';
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ profile: { birthDate, isPremium: false } }),
}));

import i18n from '../../../i18n/config';
import { CompatibilitySection } from '../CompatibilitySection';
import '@testing-library/jest-dom/vitest';

function SignPage() {
  const { slug } = useParams();
  return <p>sign page: {slug}</p>;
}

function mount() {
  return render(
    <MemoryRouter initialEntries={['/readings']}>
      <Routes>
        <Route path="/readings" element={<CompatibilitySection onShowPaywall={() => {}} />} />
        <Route path="/astrology" element={<p>astrology guide</p>} />
        <Route path="/astrology/:slug" element={<SignPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** The best-matches card: the one under the "Your best matches" heading. */
function bestMatchesCard(heading: string): HTMLElement {
  return screen.getByRole('heading', { name: heading }).parentElement as HTMLElement;
}

afterEach(() => cleanup());

describe('best matches open the Astrology guide', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('each sign links its guide page, and the card links the guide', () => {
    birthDate = '1990-04-01'; // Aries: Leo, Sagittarius (fire), Gemini (air)
    mount();
    const card = bestMatchesCard('Your best matches');
    const links = within(card).getAllByRole('link');
    expect(links.map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['Leo', '/astrology/leo'],
      ['Sagittarius', '/astrology/sagittarius'],
      ['Gemini', '/astrology/gemini'],
      ['All astrology entries', '/astrology'],
    ]);
  });

  it('a tap navigates inside the app', () => {
    birthDate = '1990-04-01';
    mount();
    fireEvent.click(within(bestMatchesCard('Your best matches')).getByRole('link', { name: 'Sagittarius' }));
    expect(screen.getByText('sign page: sagittarius')).toBeInTheDocument();
  });

  it('the guide link lands on the guide', () => {
    birthDate = '1990-04-01';
    mount();
    fireEvent.click(within(bestMatchesCard('Your best matches')).getByRole('link', { name: 'All astrology entries' }));
    expect(screen.getByText('astrology guide')).toBeInTheDocument();
  });
});

describe('in Japanese', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('ja');
  });
  afterAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('names the signs and the guide in Japanese, with the same paths', () => {
    birthDate = '1990-07-01'; // Cancer: Scorpio, Pisces (water), Taurus, Virgo (earth)
    mount();
    const card = bestMatchesCard('あなたのベストマッチ');
    expect(within(card).getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['蠍座', '/astrology/scorpio'],
      ['魚座', '/astrology/pisces'],
      ['牡牛座', '/astrology/taurus'],
      ['乙女座', '/astrology/virgo'],
      ['占星術の全項目', '/astrology'],
    ]);
  });
});
