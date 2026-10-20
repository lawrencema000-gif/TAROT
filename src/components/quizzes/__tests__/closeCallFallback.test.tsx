import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import i18next from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { CloseCall } from '../shared';

/*
 * p10 d2-ja-07: the close-call box said every tie was a narrow gap, and
 * en/app.json now says an exact tie is one ("Tied", "… scored the same").
 * CloseCall's English fallbacks, which show wherever the strings are
 * missing, still called it a narrow gap ("Close call", "… scored within a
 * hair of each other"). A tie that is not exact (a dimensional quiz's 4.0
 * beside 3.8) keeps the close-call wording, under its own keys. Rendered
 * here with no strings loaded at all, each reads as en/app.json does.
 */

const sections = JSON.parse(readFileSync(join(process.cwd(), 'src', 'i18n', 'locales', 'en', 'app.json'), 'utf8')).quizzes
  .resultSections as Record<string, string>;

const bare = i18next.createInstance();
beforeAll(async () => {
  await bare.init({ lng: 'en', resources: {}, interpolation: { escapeValue: false }, react: { useSuspense: false } });
});
afterEach(() => cleanup());

const box = (names: string[], exact: boolean) =>
  render(
    <I18nextProvider i18n={bare}>
      <CloseCall names={names} exact={exact} />
    </I18nextProvider>,
  ).container;

describe('CloseCall without its strings (p10 d2-ja-07)', () => {
  it('an exact two-way tie: the heading and the body read as en/app.json', () => {
    const el = box(['Fire', 'Water'], true);
    expect(screen.getByText(sections.closeCall)).toBeInTheDocument();
    expect(el.querySelector('p')!.textContent).toBe(sections.closeCallBody.replace('{{a}}', 'Fire').replace('{{b}}', 'Water'));
  });

  it('an exact three-way tie names all three, as en/app.json reads', () => {
    const el = box(['Vata', 'Pitta', 'Kapha'], true);
    expect(el.querySelector('p')!.textContent).toBe(sections.closeCallBodyMany.replace('{{names}}', 'Vata, Pitta and Kapha'));
    expect(el.textContent).not.toMatch(/close call|within a hair/i);
  });

  it('a near two-way tie: the close-call heading and body, as en/app.json reads', () => {
    const el = box(['Dominance (D)', 'Influence (I)'], false);
    expect(screen.getByText(sections.closeCallNear)).toBeInTheDocument();
    expect(el.querySelector('p')!.textContent).toBe(
      sections.closeCallNearBody.replace('{{a}}', 'Dominance (D)').replace('{{b}}', 'Influence (I)'),
    );
    expect(el.textContent).not.toMatch(/\btied\b|the same/i);
  });

  it('a near three-way tie names all three, as en/app.json reads', () => {
    const el = box(['Dominance (D)', 'Influence (I)', 'Steadiness (S)'], false);
    expect(el.querySelector('p')!.textContent).toBe(
      sections.closeCallNearBodyMany.replace('{{names}}', 'Dominance (D), Influence (I) and Steadiness (S)'),
    );
  });
});
