import { describe, it, expect, afterAll } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import i18n from '../../../i18n/config';
import { SaturnIcon, PlanetGlyph, PLANET_ICONS } from '../PlanetIcons';

/**
 * A planet glyph is named in the reader's language (p8 F92, as the zodiac
 * glyphs are): the default used to be the English planet, and PlanetGlyph
 * added it again, so a Japanese screen reader heard "Saturn" beside a
 * visible 土星 wherever a caller passed no label.
 */
describe('planet glyph names', () => {
  afterAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('names the planet in the UI language, and follows a language change', async () => {
    await act(async () => {
      await i18n.changeLanguage('ja');
    });
    render(<SaturnIcon />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('土星');
    await act(async () => {
      await i18n.changeLanguage('ko');
    });
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('토성');
  });

  it('every planet has a localized default, and PlanetGlyph adds no English one', async () => {
    await act(async () => {
      await i18n.changeLanguage('zh');
    });
    const { container } = render(
      <div>
        {Object.values(PLANET_ICONS).map((Icon, i) => <Icon key={i} />)}
        <PlanetGlyph planet="Moon" />
      </div>,
    );
    const labels = [...container.querySelectorAll('svg')].map((s) => s.getAttribute('aria-label'));
    expect(labels).toEqual([
      '太阳', '月亮', '水星', '金星', '火星', '木星', '土星', '天王星', '海王星', '冥王星',
      '月亮',
    ]);
    for (const svg of container.querySelectorAll('svg')) expect(svg.getAttribute('role')).toBe('img');
  });

  it('English keeps the English names', async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
    });
    const { container } = render(<PlanetGlyph planet="Pluto" />);
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toBe('Pluto');
  });

  it('an explicit label wins; aria-hidden leaves no role and no name', () => {
    const { container } = render(
      <div>
        <SaturnIcon aria-label="Ruler of Capricorn" />
        <PlanetGlyph planet="Saturn" aria-label="Ruler of Capricorn" />
        <SaturnIcon aria-hidden />
        <PlanetGlyph planet="Saturn" aria-hidden />
      </div>,
    );
    const [named, namedGlyph, hidden, hiddenGlyph] = [...container.querySelectorAll('svg')];
    expect(named.getAttribute('aria-label')).toBe('Ruler of Capricorn');
    expect(namedGlyph.getAttribute('aria-label')).toBe('Ruler of Capricorn');
    for (const h of [hidden, hiddenGlyph]) {
      expect(h.getAttribute('aria-hidden')).toBe('true');
      expect(h.getAttribute('role')).toBeNull();
      expect(h.getAttribute('aria-label')).toBeNull();
    }
  });
});
