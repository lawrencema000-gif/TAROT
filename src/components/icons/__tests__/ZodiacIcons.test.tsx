import { describe, it, expect, afterAll } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import i18n from '../../../i18n/config';
import { AriesIcon, ZodiacGlyph, ZODIAC_ICONS } from '../ZodiacIcons';

/**
 * A glyph is named in the reader's language (p8 F92): the default used to
 * be the English sign, so a Japanese screen reader heard "Aries" beside a
 * visible 牡羊座 wherever a caller passed no label.
 */
describe('zodiac glyph names', () => {
  afterAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('names the sign in the UI language, and follows a language change', async () => {
    await act(async () => {
      await i18n.changeLanguage('ja');
    });
    render(<AriesIcon />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('牡羊座');
    await act(async () => {
      await i18n.changeLanguage('ko');
    });
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('양자리');
  });

  it('every sign has a localized default, and ZodiacGlyph adds no English one', async () => {
    await act(async () => {
      await i18n.changeLanguage('zh');
    });
    const { container } = render(
      <div>
        {Object.values(ZODIAC_ICONS).map((Icon, i) => <Icon key={i} />)}
        <ZodiacGlyph sign="Pisces" />
      </div>,
    );
    const labels = [...container.querySelectorAll('svg')].map((s) => s.getAttribute('aria-label') ?? '');
    expect(labels).toHaveLength(13);
    for (const l of labels) expect(l).toMatch(/座$/);
    expect(labels[12]).toBe('双鱼座');
  });

  it('an explicit label wins; aria-hidden leaves no role and no name', () => {
    const { container } = render(
      <div>
        <AriesIcon aria-label="Mars-ruled sign" />
        <AriesIcon aria-hidden />
      </div>,
    );
    const [named, hidden] = [...container.querySelectorAll('svg')];
    expect(named.getAttribute('aria-label')).toBe('Mars-ruled sign');
    expect(hidden.getAttribute('aria-hidden')).toBe('true');
    expect(hidden.getAttribute('role')).toBeNull();
    expect(hidden.getAttribute('aria-label')).toBeNull();
  });
});
