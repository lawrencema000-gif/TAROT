import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

/*
 * polish 2026-11 (review i18n-2): the page a newsletter's unsubscribe link
 * opens had its tab title translated, and its body was English in every
 * language: "Processing your request…", "You're unsubscribed" and the address
 * that "will no longer receive Arcana emails", "Already unsubscribed", "Link
 * not recognised" and "Back to Arcana". The body reads in the reader's
 * language now, the address still set apart in its own colour, and English
 * reads as before, its apostrophes typographic.
 */

const rpc = vi.hoisted(() => vi.fn());
vi.mock('../../lib/supabase', () => ({ supabase: { rpc } }));

import i18n from '../../i18n/config';
import { UnsubscribePage } from '../UnsubscribePage';

type Lng = 'en' | 'ja' | 'ko' | 'zh';
type State = 'processing' | 'done' | 'already' | 'invalid';

const TOKEN = '6f1c2b9e-4d3a-4e5f-8a7b-9c0d1e2f3a4b';
const EMAIL = 'luna+tarot@example.com';
const STATES: State[] = ['processing', 'done', 'already', 'invalid'];

/** What the RPC answers for each state; an invalid link is one that is not a token, and never reaches it. */
function answer(state: State) {
  rpc.mockReset();
  if (state === 'processing') rpc.mockReturnValue(new Promise(() => {}));
  if (state === 'done') rpc.mockResolvedValue({ data: { ok: true, email: EMAIL }, error: null });
  if (state === 'already') rpc.mockResolvedValue({ data: { ok: false, reason: 'unknown_or_already_unsubscribed' }, error: null });
}

/** The page in `lng`, opened from a link with `token`, once it shows `state`. */
async function open(lng: Lng, state: State, token = state === 'invalid' ? 'not-a-token' : TOKEN) {
  await act(async () => { await i18n.changeLanguage(lng); });
  answer(state);
  const { container } = render(
    <MemoryRouter initialEntries={[`/unsubscribe?token=${token}`]}>
      <Routes><Route path="/unsubscribe" element={<UnsubscribePage />} /></Routes>
    </MemoryRouter>,
  );
  if (state !== 'processing') await screen.findByRole('heading', { level: 1 });
  return container;
}

/** The card as the reader sees it. */
function card(container: HTMLElement) {
  const header = container.querySelector('header');
  const body = header?.querySelector('p');
  const link = container.querySelector('a');
  return {
    title: header?.querySelector('h1')?.textContent ?? null,
    body: body?.innerHTML ?? null,
    note: container.querySelector('p.text-caption')?.textContent ?? null,
    link: link?.textContent ?? null,
    href: link?.getAttribute('href') ?? null,
  };
}

const address = `<span class="text-mystic-200">${EMAIL}</span>`;

afterEach(async () => {
  cleanup();
  await act(async () => { await i18n.changeLanguage('en'); });
});

describe('the Unsubscribe page in the reader’s language (review i18n-2)', { timeout: 30_000 }, () => {
  it('English reads as before: processing', async () => {
    const page = await open('en', 'processing');
    expect(page.textContent).toBe('Processing your request…');
    expect(rpc).toHaveBeenCalledWith('newsletter_unsubscribe', { p_token: TOKEN });
  });

  it('English reads as before: done, the address set apart in its own colour', async () => {
    expect(card(await open('en', 'done'))).toEqual({
      title: 'You’re unsubscribed',
      body: `${address} will no longer receive Arcana emails.`,
      note: 'If this was a mistake, just sign up again at any time.',
      link: 'Back to Arcana',
      href: '/',
    });
  });

  it('English reads as before: already unsubscribed', async () => {
    expect(card(await open('en', 'already'))).toEqual({
      title: 'Already unsubscribed',
      body: 'No further emails will be sent.',
      note: null,
      link: 'Back to Arcana',
      href: '/',
    });
  });

  const INVALID_EN = {
    title: 'Link not recognised',
    body: 'This unsubscribe link looks invalid or has expired. If you keep receiving emails you didn’t expect, reply to one of them — we’ll handle it manually.',
    note: null,
    link: 'Back to Arcana',
    href: '/',
  };

  it('English reads as before: a link that is not a token, unasked', async () => {
    expect(card(await open('en', 'invalid'))).toEqual(INVALID_EN);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('English reads as before: a token the RPC refuses', async () => {
    await act(async () => { await i18n.changeLanguage('en'); });
    rpc.mockReset();
    rpc.mockResolvedValue({ data: null, error: { message: 'invalid input syntax for type uuid' } });
    render(
      <MemoryRouter initialEntries={[`/unsubscribe?token=${TOKEN}`]}>
        <Routes><Route path="/unsubscribe" element={<UnsubscribePage />} /></Routes>
      </MemoryRouter>,
    );
    await screen.findByRole('heading', { level: 1, name: INVALID_EN.title });
    expect(card(document.body)).toEqual(INVALID_EN);
  });

  // Needs the polish unsub locale delta (app:unsubscribe.* in ja/ko/zh).
  it('Japanese: processing', async () => {
    expect((await open('ja', 'processing')).textContent).toBe('リクエストを処理しています…');
  });

  it('Japanese: done, the address set apart in its own colour', async () => {
    expect(card(await open('ja', 'done'))).toEqual({
      title: '配信を停止しました',
      body: `${address} には、今後Arcanaからのメールは届きません。`,
      note: '間違えて停止した場合は、いつでも登録し直せます。',
      link: 'Arcanaに戻る',
      href: '/',
    });
  });

  it('Japanese: already unsubscribed', async () => {
    expect(card(await open('ja', 'already'))).toEqual({
      title: 'すでに配信停止済みです',
      body: '今後メールをお送りすることはありません。',
      note: null,
      link: 'Arcanaに戻る',
      href: '/',
    });
  });

  it('Japanese: a link not recognised', async () => {
    expect(card(await open('ja', 'invalid'))).toEqual({
      title: 'リンクを確認できませんでした',
      body: 'この配信停止リンクは無効か、有効期限が切れているようです。心当たりのないメールが届き続ける場合は、そのうちの1通に返信してください。こちらで個別に対応します。',
      note: null,
      link: 'Arcanaに戻る',
      href: '/',
    });
  });

  it('Korean and Chinese: done, the address set apart in its own colour', async () => {
    expect(card(await open('ko', 'done'))).toEqual({
      title: '구독을 취소했어요',
      body: `${address} 주소로 더 이상 Arcana 이메일이 오지 않아요.`,
      note: '실수였다면 언제든 다시 구독하면 돼요.',
      link: 'Arcana로 돌아가기',
      href: '/',
    });
    cleanup();
    expect(card(await open('zh', 'done'))).toEqual({
      title: '你已退订',
      body: `${address} 将不再收到 Arcana 的邮件。`,
      note: '如果是误操作，随时可以重新订阅。',
      link: '返回 Arcana',
      href: '/',
    });
  });

  it('Korean and Chinese: a link not recognised', async () => {
    expect(card(await open('ko', 'invalid'))).toEqual({
      title: '링크를 확인할 수 없어요',
      body: '이 구독 취소 링크가 유효하지 않거나 만료된 것 같아요. 예상하지 못한 이메일이 계속 온다면 그중 한 통에 답장해 주세요. 직접 처리해 드릴게요.',
      note: null,
      link: 'Arcana로 돌아가기',
      href: '/',
    });
    cleanup();
    expect(card(await open('zh', 'invalid'))).toEqual({
      title: '无法识别此链接',
      body: '这个退订链接似乎无效或已过期。如果你一直收到意料之外的邮件，请回复其中任意一封——我们会人工处理。',
      note: null,
      link: '返回 Arcana',
      href: '/',
    });
  });

  it.each((['ja', 'ko', 'zh'] as const).flatMap((lng) => STATES.map((state) => [lng, state] as const)))(
    '%s %s: no English left but the brand and the address',
    async (lng, state) => {
      const text = (await open(lng, state)).textContent ?? '';
      expect(text.trim()).not.toBe('');
      expect(text.split(EMAIL).join('').replace(/Arcana/g, '').match(/[A-Za-z]+/g) ?? []).toEqual([]);
    },
  );
});
