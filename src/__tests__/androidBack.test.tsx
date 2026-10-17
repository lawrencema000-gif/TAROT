import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, act, cleanup, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';

/*
 * p9 RQB-3: Android Back closes the sheet on top first. It used to start
 * at the shell's overlay, so a reading opened from the Saved sheet closed
 * with the list instead of back to it, and with a sheet up on a page Back
 * left the page (or the app) under the sheet.
 *
 * App.tsx loads here with two things kept out: the shared zod schemas import
 * `npm:zod` (Deno's; the vite build aliases it, vitest does not), and the
 * Supabase client wants its environment.
 */
vi.mock('../schema', () => new Proxy({}, { get: (_t, k) => (k === 'then' ? undefined : { parse: (x: unknown) => x }), has: () => true }));
vi.mock('../lib/supabase', () => {
  const inert = (): unknown => new Proxy(function () {}, { get: (_t, k) => (k === 'then' ? undefined : inert()), apply: () => inert() });
  return { supabase: inert(), isSupabaseConfigured: true };
});

import { androidBack, type AndroidBackShell } from '../App';
import { Sheet } from '../components/ui/Sheet';

function shellOn(pathname: string, over: Partial<AndroidBackShell> = {}): AndroidBackShell {
  return {
    activeOverlay: null,
    closeOverlay: vi.fn(),
    pathname,
    navigateBack: vi.fn(),
    activeTab: 'home',
    goHome: vi.fn(),
    exitApp: vi.fn(),
    ...over,
  };
}

/** The Saved sheet (the shell's overlay) and a reading opened over it, as SavedSheet stacks them. */
function savedWithReading(listOpen: boolean, readingOpen: boolean, closeList: () => void, closeReading: () => void): ReactElement {
  return (
    <>
      <Sheet open={listOpen} onClose={closeList} title="Saved">
        <button type="button">The Star</button>
      </Sheet>
      <Sheet open={readingOpen} onClose={closeReading} title="The Star">
        <p>A reading</p>
      </Sheet>
    </>
  );
}

const back = (shell: AndroidBackShell) => act(() => androidBack(shell));

afterEach(() => cleanup());

describe('Android Back closes the sheet on top first (p9 RQB-3)', () => {
  it('a reading opened from the Saved sheet closes back to the list, then the list closes', async () => {
    const closeList = vi.fn();
    const closeReading = vi.fn();
    const shell = shellOn('/', { activeOverlay: 'saved', closeOverlay: closeList });
    const { rerender } = render(savedWithReading(true, false, closeList, closeReading));
    // The member opens a reading from the list.
    rerender(savedWithReading(true, true, closeList, closeReading));

    back(shell);
    expect(closeReading).toHaveBeenCalledTimes(1);
    expect(closeList).not.toHaveBeenCalled();
    expect(shell.navigateBack).not.toHaveBeenCalled();
    expect(shell.exitApp).not.toHaveBeenCalled();

    // The reading has closed: the next Back is the list's.
    rerender(savedWithReading(true, false, closeList, closeReading));
    back(shell);
    expect(closeList).toHaveBeenCalledTimes(1);
    expect(closeReading).toHaveBeenCalledTimes(1);

    // Both gone (after the exit): Back goes on to the app, here out of it.
    rerender(savedWithReading(false, false, closeList, closeReading));
    await waitFor(() => expect(document.body.classList.contains('sheet-open')).toBe(false));
    back(shellOn('/'));
    expect(closeList).toHaveBeenCalledTimes(1);
  });

  it('a sheet up on a deep page closes before Back leaves the page', async () => {
    const closeSheet = vi.fn();
    const shell = shellOn('/people/p1');
    const { rerender } = render(
      <Sheet open onClose={closeSheet} title="Edit">
        <p>Form</p>
      </Sheet>,
    );
    back(shell);
    expect(closeSheet).toHaveBeenCalledTimes(1);
    expect(shell.navigateBack).not.toHaveBeenCalled();

    rerender(
      <Sheet open={false} onClose={closeSheet} title="Edit">
        <p>Form</p>
      </Sheet>,
    );
    await waitFor(() => expect(document.body.classList.contains('sheet-open')).toBe(false));
    back(shell);
    expect(shell.navigateBack).toHaveBeenCalledTimes(1);
    expect(closeSheet).toHaveBeenCalledTimes(1);
  });

  it('with no sheet up, the order stands: overlay, deep page, home tab, out of the app', () => {
    const overlay = shellOn('/readings', { activeOverlay: 'settings', activeTab: 'readings' });
    back(overlay);
    expect(overlay.closeOverlay).toHaveBeenCalledTimes(1);
    expect(overlay.navigateBack).not.toHaveBeenCalled();

    const deep = shellOn('/reports/career');
    back(deep);
    expect(deep.navigateBack).toHaveBeenCalledTimes(1);

    const tab = shellOn('/readings', { activeTab: 'readings' });
    back(tab);
    expect(tab.goHome).toHaveBeenCalledTimes(1);
    expect(tab.exitApp).not.toHaveBeenCalled();

    const home = shellOn('/');
    back(home);
    expect(home.exitApp).toHaveBeenCalledTimes(1);
  });
});
