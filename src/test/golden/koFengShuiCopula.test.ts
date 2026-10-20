import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { koParticle } from '../../i18n/koJosa';

/**
 * The Kua result sentence ends "…{{trigram}}({{element}})예요." The copula
 * agrees with the trigram's name (a parenthetical gloss does not move it),
 * and every Korean trigram name — 건괘, 곤괘, 감괘, 이괘, 진괘, 손괘, 간괘, 태괘 —
 * ends in 괘, which has no final consonant: 예요, never 이에요 (Q26, "간괘(토)이에요").
 * If a name ever changes to one that ends in a consonant, this fails.
 */
const ko = JSON.parse(readFileSync(join(process.cwd(), 'src/i18n/locales/ko/app.json'), 'utf8'));

describe('ko Feng Shui Kua sentence', () => {
  const intro: string = ko.fengshui.kuaResultIntro;
  const trigrams: Record<string, string> = ko.fengshui.trigrams;
  const elements: Record<string, string> = ko.fengshui.elements;

  it('has eight trigram names', () => {
    expect(Object.keys(trigrams).sort()).toEqual(['Dui', 'Gen', 'Kan', 'Kun', 'Li', 'Qian', 'Xun', 'Zhen']);
  });

  it('takes the copula every trigram name needs', () => {
    const copula = /\{\{trigram\}\}\(\{\{element\}\}\)(이에요|예요)/.exec(intro);
    expect(copula, intro).not.toBeNull();
    for (const [key, name] of Object.entries(trigrams)) {
      for (const element of Object.values(elements)) {
        expect(koParticle(`${name}(${element})`, copula![1]), `${key}: ${name}(${element})`).toBe(copula![1]);
      }
    }
    expect(copula![1]).toBe('예요');
  });
});
