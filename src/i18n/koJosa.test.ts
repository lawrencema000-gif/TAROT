import { describe, it, expect } from 'vitest';
import { finalConsonant, koParticle, withKoParticle, resolveKoParticles, fillKoTemplate } from './koJosa';

/**
 * Korean particles follow the last syllable's final consonant (받침): 이/을/은/
 * 과/으로/이에요 after one, 가/를/는/와/로/예요 after a vowel, and 로 after ㄹ.
 * The transit lines printed both forms ("목성과(와) 달이(가)", Q26) and the
 * daily templates one form chosen for a different noun.
 */
describe('finalConsonant', () => {
  it('reads the jongseong of the last syllable', () => {
    expect(finalConsonant('목성')).toBe(21); // ㅇ
    expect(finalConsonant('달')).toBe(8); // ㄹ
    expect(finalConsonant('공기')).toBe(0);
    expect(finalConsonant('흙')).toBe(9); // ㄺ, not ㄹ
    expect(finalConsonant('두려움')).toBe(16); // ㅁ
  });

  it('looks through closing quotes and a parenthetical gloss', () => {
    expect(finalConsonant('간괘(토)')).toBe(0); // the particle follows 괘, not 토
    expect(finalConsonant('사주팔자(四柱八字)')).toBe(0);
    expect(finalConsonant('“자비”')).toBe(0);
    expect(finalConsonant('「용기」')).toBe(0);
  });

  it('reads numbers the Sino-Korean way', () => {
    expect(finalConsonant('3')).toBe(16); // 삼
    expect(finalConsonant('7')).toBe(8); // 칠
    expect(finalConsonant('2')).toBe(0); // 이
    expect(finalConsonant('10')).toBe(17); // 십
    expect(finalConsonant('120')).toBe(17); // 백이십
    expect(finalConsonant('100')).toBe(1); // 백
    expect(finalConsonant('1,000')).toBe(4); // 천
    expect(finalConsonant('20000')).toBe(4); // 이만
    expect(finalConsonant('0')).toBe(21); // 영
  });

  it('knows nothing about a Latin word or an empty one', () => {
    expect(finalConsonant('Jupiter')).toBeNull();
    expect(finalConsonant('')).toBeNull();
    expect(finalConsonant('물 ')).toBeNull(); // a particle never follows a space
  });
});

describe('koParticle', () => {
  it('이/가, 을/를, 은/는, 과/와 follow the final consonant, whichever form is asked for', () => {
    expect(koParticle('목성', '가')).toBe('이');
    expect(koParticle('공기', '이')).toBe('가');
    expect(koParticle('달', '를')).toBe('을');
    expect(koParticle('자비', '을')).toBe('를');
    expect(koParticle('물고기자리', '은')).toBe('는');
    expect(koParticle('태양', '는')).toBe('은');
    expect(koParticle('태양', '와')).toBe('과');
    expect(koParticle('공기', '과')).toBe('와');
  });

  it('으로/로 takes 로 after a vowel and after ㄹ', () => {
    expect(koParticle('달', '으로')).toBe('로');
    expect(koParticle('물', '으로')).toBe('로');
    expect(koParticle('관계', '으로')).toBe('로');
    expect(koParticle('자기 성장', '로')).toBe('으로');
    expect(koParticle('흙', '로')).toBe('으로');
  });

  it('the copula forms', () => {
    expect(koParticle('간괘(토)', '이에요')).toBe('예요');
    expect(koParticle('두려움', '예요')).toBe('이에요');
    expect(koParticle('꾸밈없는 표현', '라는')).toBe('이라는');
    expect(koParticle('차분한 쌓기', '이라는')).toBe('라는');
  });

  it('resolves a two-form marker', () => {
    expect(koParticle('목성', '이(가)')).toBe('이');
    expect(koParticle('달', '과(와)')).toBe('과');
    expect(koParticle('공기', '을(를)')).toBe('를');
    expect(koParticle('천왕성', '(으)로')).toBe('으로');
    expect(koParticle('수성', '와(과)')).toBe('과');
  });

  it('leaves what it cannot decide as it was given', () => {
    expect(koParticle('Jupiter', '이(가)')).toBe('이(가)');
    expect(koParticle('Jupiter', '이')).toBe('이');
    expect(koParticle('목성', '에')).toBe('에');
    expect(koParticle('목성', '의')).toBe('의');
  });

  it('withKoParticle joins the word and its particle', () => {
    expect(withKoParticle('해왕성', '가')).toBe('해왕성이');
    expect(withKoParticle('달', '으로')).toBe('달로');
  });
});

describe('resolveKoParticles', () => {
  it('rewrites the transit lines the QA run quoted', () => {
    expect(resolveKoParticles('목성과(와) 달이(가) 한목소리로 말합니다.')).toBe('목성과 달이 한목소리로 말합니다.');
    expect(resolveKoParticles('수성과(와) 천왕성이(가) 조용히 협력합니다.')).toBe('수성과 천왕성이 조용히 협력합니다.');
    expect(resolveKoParticles('태양이(가) 당신의 금성을(를) 안에서부터 밝힙니다.')).toBe('태양이 당신의 금성을 안에서부터 밝힙니다.');
    expect(resolveKoParticles('금성이(가) 공기와(과) 만나요.')).toBe('금성이 공기와 만나요.');
  });

  it('handles (으)로 and the (이) copula forms', () => {
    expect(resolveKoParticles('테마가 미드나잇(으)로 바뀌었어요.')).toBe('테마가 미드나잇으로 바뀌었어요.');
    expect(resolveKoParticles('테마가 오로라(으)로 바뀌었어요.')).toBe('테마가 오로라로 바뀌었어요.');
    expect(resolveKoParticles('달(으)로 옮겨 갔어요.')).toBe('달로 옮겨 갔어요.');
    expect(resolveKoParticles('간괘(토)(이)라는 이름')).toBe('간괘(토)라는 이름');
  });

  it('keeps both forms after a name it cannot read', () => {
    expect(resolveKoParticles('Mina이(가) 이 카드를 뽑았어요.')).toBe('Mina이(가) 이 카드를 뽑았어요.');
  });

  it('leaves text without markers alone', () => {
    const plain = '오늘의 긴장점은 조급함. 알아차리는 것만으로도 녹기 시작해요.';
    expect(resolveKoParticles(plain)).toBe(plain);
  });
});

describe('fillKoTemplate', () => {
  it('re-picks the particle a template wrote for some other noun', () => {
    expect(fillKoTemplate('{challenge}이 자신감으로 가장하고 있지 않은지 살펴봐요.', { challenge: '거리 두기' }))
      .toBe('거리 두기가 자신감으로 가장하고 있지 않은지 살펴봐요.');
    expect(fillKoTemplate('{challenge}가 당신을 어디에서 붙잡고 있을까요?', { challenge: '두려움' }))
      .toBe('두려움이 당신을 어디에서 붙잡고 있을까요?');
    expect(fillKoTemplate('천상의 흐름이 {area}로 데려다줘요.', { area: '자기 성장' }))
      .toBe('천상의 흐름이 자기 성장으로 데려다줘요.');
    expect(fillKoTemplate('이해받고 싶어하는 {challenge}예요.', { challenge: '두려움' }))
      .toBe('이해받고 싶어하는 두려움이에요.');
    expect(fillKoTemplate('{approach}라는 형태로 찾아와요.', { approach: '꾸밈없는 표현' }))
      .toBe('꾸밈없는 표현이라는 형태로 찾아와요.');
  });

  it('looks through the closing quote after a slot', () => {
    expect(fillKoTemplate('"{strength}"을 손바닥이나 종이에 적어요.', { strength: '자비' }))
      .toBe('"자비"를 손바닥이나 종이에 적어요.');
  });

  it('resolves two-form markers written on a slot', () => {
    expect(fillKoTemplate('{transitPlanet}과(와) {natalPlanet}이(가) 한목소리로 말합니다.', { transitPlanet: '목성', natalPlanet: '달' }))
      .toBe('목성과 달이 한목소리로 말합니다.');
    expect(fillKoTemplate('{transitPlanet}에서 {natalPlanet}으로 흐르는 지원', { transitPlanet: '토성', natalPlanet: '달' }))
      .toBe('토성에서 달로 흐르는 지원');
  });

  it('touches no particle-like start of a longer word, and no invariant particle', () => {
    expect(fillKoTemplate('{sign}다운 직감', { sign: '사자자리' })).toBe('사자자리다운 직감');
    expect(fillKoTemplate('{sign}의 그림자', { sign: '양자리' })).toBe('양자리의 그림자');
    expect(fillKoTemplate('{area}에 마음을', { area: '관계' })).toBe('관계에 마음을');
    expect(fillKoTemplate('{element} 본성', { element: '물' })).toBe('물 본성');
  });

  it('leaves an unfilled slot, or fills it from the fallback', () => {
    expect(fillKoTemplate('{missing}이 와요', {})).toBe('{missing}이 와요');
    expect(fillKoTemplate('{missing}이 와요', {}, (k) => k)).toBe('missing이 와요');
  });
});
