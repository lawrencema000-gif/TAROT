import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import i18next from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { CloseCall } from '../shared';

/*
 * p10 d2-ja-07: the close-call box is shown only for a tie, and en/app.json
 * now says so ("Tied", "… scored the same"). CloseCall's English fallbacks,
 * which show wherever the strings are missing, still called it a narrow gap
 * ("Close call", "… scored within a hair of each other"). Rendered here with
 * no strings loaded at all, it reads as en/app.json does.
 */

const sections = JSON.parse(readFileSync(join(process.cwd(), 'src', 'i18n', 'locales', 'en', 'app.json'), 'utf8')).quizzes
  .resultSections as Record<string, string>;

const bare = i18next.createInstance();
beforeAll(async () => {
  await bare.init({ lng: 'en', resources: {}, interpolation: { escapeValue: false }, react: { useSuspense: false } });
});
afterEach(() => cleanup());

const box = (names: string[]) =>
  render(
    <I18nextProvider i18n={bare}>
      <CloseCall names={names} />
    </I18nextProvider>,
  ).container;

describe('CloseCall without its strings (p10 d2-ja-07)', () => {
  it('a two-way tie: the heading and the body read as en/app.json', () => {
    const el = box(['Fire', 'Water']);
    expect(screen.getByText(sections.closeCall)).toBeInTheDocument();
    expect(el.querySelector('p')!.textContent).toBe(sections.closeCallBody.replace('{{a}}', 'Fire').replace('{{b}}', 'Water'));
  });

  it('a three-way tie names all three, as en/app.json reads', () => {
    const el = box(['Vata', 'Pitta', 'Kapha']);
    expect(el.querySelector('p')!.textContent).toBe(sections.closeCallBodyMany.replace('{{names}}', 'Vata, Pitta and Kapha'));
    expect(el.textContent).not.toMatch(/close call|within a hair/i);
  });
});
