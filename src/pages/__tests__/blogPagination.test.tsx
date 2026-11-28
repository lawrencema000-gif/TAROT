import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, renderHook } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { BlogPost } from '../../types/blog';

/*
 * WP-P1-13 (public-seo-23): the blog list keeps the reader's page.
 *  - the page number lives in the address (/blog?page=N, none for page 1),
 *    clamped to the pages there are;
 *  - "Next page" opens the new page at its top, keeping the current list on
 *    screen until the next one arrives;
 *  - "Back to news" from a post opened from the list returns to that page,
 *    at the place the reader left; a post opened directly goes to /blog;
 *  - an older page's answer arriving last never replaces the page asked for.
 */

const TOTAL = 133;

function makePost(i: number): BlogPost {
  const n = i + 1;
  return {
    id: `id-${n}`,
    slug: `post-${n}`,
    title: `Post ${n}`,
    excerpt: null,
    content: `<p>Body of post ${n}</p>`,
    cover_image: null,
    author: 'Arcana',
    tags: [],
    published: true,
    archived: false,
    published_at: '2026-11-01T00:00:00Z',
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
  };
}

/** ms to wait before answering a list request, by its `from`. */
let delays: Record<number, number> = {};
const delayFor = (from: number) => delays[from] ?? 0;

const listPublished = vi.fn(async ({ from, to }: { from: number; to: number }): Promise<
  { ok: true; data: { posts: BlogPost[]; total: number } } | { ok: false; error: string }
> => {
  await new Promise((r) => setTimeout(r, delayFor(from)));
  // Like PostgREST with count=exact: an offset past the total is HTTP 416
  // (PGRST103), which the DAL reports as an error.
  if (from >= TOTAL) return { ok: false as const, error: 'Requested range not satisfiable' };
  const posts: BlogPost[] = [];
  for (let i = from; i <= Math.min(to, TOTAL - 1); i += 1) posts.push(makePost(i));
  return { ok: true as const, data: { posts, total: TOTAL } };
});
const getBySlug = vi.fn(async (slug: string) => {
  const n = Number(slug.replace('post-', ''));
  return { ok: true as const, data: makePost(n - 1) };
});

vi.mock('../../dal', () => ({
  blogPosts: {
    listPublished: (...a: Parameters<typeof listPublished>) => listPublished(...a),
    getBySlug: (...a: Parameters<typeof getBySlug>) => getBySlug(...a),
  },
}));

import i18n from '../../i18n/config';
import { BlogPage } from '../BlogPage';
import { BlogPostPage } from '../BlogPostPage';
import { useBlogPosts } from '../../hooks/useBlogPosts';
import '@testing-library/jest-dom/vitest';

function memoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() { return store.size; },
    key: (i: number) => [...store.keys()][i] ?? null,
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  } as Storage;
}

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname + loc.search}</div>;
}

function mount(initial: string) {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <LocationProbe />
      <Routes>
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const where = () => screen.getByTestId('where').textContent;
const nextButton = () => screen.getByRole('button', { name: 'Next page' });
const prevButton = () => screen.getByRole('button', { name: 'Previous page' });
const backToNews = () => screen.findByRole('button', { name: /Back to news/ });

let scrollTo: ReturnType<typeof vi.fn>;

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

beforeEach(() => {
  delays = {};
  listPublished.mockClear();
  getBySlug.mockClear();
  scrollTo = vi.fn();
  window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
  vi.stubGlobal('sessionStorage', memoryStorage());
  Object.defineProperty(window, 'sessionStorage', { value: globalThis.sessionStorage, configurable: true });
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('the page lives in the address', () => {
  it('opens /blog?page=2 on page 2', async () => {
    mount('/blog?page=2');
    expect(await screen.findByText('Post 13')).toBeInTheDocument();
    expect(listPublished).toHaveBeenCalledWith({ from: 12, to: 23 });
    expect(screen.getByText('2 / 12')).toBeInTheDocument();
    expect(where()).toBe('/blog?page=2');
  });

  it('"Next page" writes ?page=3, scrolls to the top and keeps the list until page 3 arrives', async () => {
    mount('/blog?page=2');
    await screen.findByText('Post 13');
    delays = { 24: 50 };
    scrollTo.mockClear();
    fireEvent.click(nextButton());
    expect(where()).toBe('/blog?page=3');
    expect(scrollTo).toHaveBeenCalledWith({ top: 0 });
    // No skeleton: the current list stays while the next one loads, and the pager waits.
    expect(screen.getByText('Post 13')).toBeInTheDocument();
    expect(nextButton()).toBeDisabled();
    expect(prevButton()).toBeDisabled();
    expect(await screen.findByText('Post 25')).toBeInTheDocument();
    expect(listPublished).toHaveBeenCalledWith({ from: 24, to: 35 });
    expect(screen.getByText('3 / 12')).toBeInTheDocument();
    expect(nextButton()).not.toBeDisabled();
    expect(prevButton()).not.toBeDisabled();
  });

  it('settles out-of-range and non-numeric values on one canonical form', async () => {
    mount('/blog?page=99');
    expect(await screen.findByText('Post 133')).toBeInTheDocument();
    await waitFor(() => expect(where()).toBe('/blog?page=12'));
    expect(screen.getByText('12 / 12')).toBeInTheDocument();
    cleanup();

    listPublished.mockClear();
    mount('/blog?page=abc');
    expect(await screen.findByText('Post 1')).toBeInTheDocument();
    expect(listPublished).toHaveBeenCalledWith({ from: 0, to: 11 });
    await waitFor(() => expect(where()).toBe('/blog'));
    cleanup();

    mount('/blog?page=1');
    expect(await screen.findByText('Post 1')).toBeInTheDocument();
    await waitFor(() => expect(where()).toBe('/blog'));
  });

  it('keeps other parameters such as ?lang=', async () => {
    mount('/blog?lang=ja&page=2');
    await screen.findByText('Post 13');
    fireEvent.click(nextButton());
    await screen.findByText('Post 25');
    expect(where()).toContain('lang=ja');
    expect(where()).toContain('page=3');
  });
});

describe('Back from a post returns to the reader’s page', () => {
  it('"Back to news" after paging returns to /blog?page=3', async () => {
    mount('/blog?page=2');
    await screen.findByText('Post 13');
    fireEvent.click(nextButton());
    fireEvent.click(await screen.findByText('Post 25'));
    expect(where()).toBe('/blog/post-25');
    fireEvent.click(await backToNews());
    expect(where()).toBe('/blog?page=3');
    expect(await screen.findByText('3 / 12')).toBeInTheDocument();
  });

  it('returns to the place the reader left on the list', async () => {
    mount('/blog?page=3');
    await screen.findByText('Post 25');
    Object.defineProperty(window, 'scrollY', { value: 900, configurable: true });
    fireEvent.click(screen.getByText('Post 25'));
    fireEvent.click(await backToNews());
    await screen.findByText('3 / 12');
    await waitFor(() => expect(scrollTo).toHaveBeenLastCalledWith({ top: 900 }));
  });

  it('a post opened directly goes "Back to news" to /blog', async () => {
    mount('/blog/post-5');
    fireEvent.click(await backToNews());
    expect(where()).toBe('/blog');
  });
});

describe('useBlogPosts', () => {
  it('an older page’s answer arriving last does not replace the page asked for', async () => {
    delays = { 12: 150, 0: 10 };
    const { result, rerender } = renderHook(({ page }) => useBlogPosts(page), { initialProps: { page: 2 } });
    rerender({ page: 1 });
    await new Promise((r) => setTimeout(r, 200));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.posts[0].title).toBe('Post 1');
  });

  it('a page past the end (PostgREST 416) reports the total, not an error', async () => {
    const { result } = renderHook(() => useBlogPosts(20));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(listPublished).toHaveBeenCalledWith({ from: 228, to: 239 });
    expect(listPublished).toHaveBeenCalledWith({ from: 0, to: 0 });
    expect(result.current.error).toBeNull();
    expect(result.current.total).toBe(133);
    expect(result.current.totalPages).toBe(12);
    expect(result.current.posts).toEqual([]);
  });
});
