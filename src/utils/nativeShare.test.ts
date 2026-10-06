import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The platform switch and the two Capacitor plugins, so both paths run here.
const platform = vi.hoisted(() => ({ native: false }));
vi.mock('./platform', () => ({ isNative: () => platform.native }));

const capacitor = vi.hoisted(() => ({
  writeFile: vi.fn<(opts: { path: string; data: string }) => Promise<{ uri: string }>>(async () => ({ uri: 'file:///cache/share/x' })),
  share: vi.fn<(opts: { files?: string[] }) => Promise<object>>(async () => ({})),
}));
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: { writeFile: capacitor.writeFile },
  Directory: { Cache: 'CACHE' },
}));
vi.mock('@capacitor/share', () => ({ Share: { share: capacitor.share } }));

import { sharePng, shareFile } from './nativeShare';

const png = () => new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' });

function domError(name: string): Error {
  const err = new Error(name);
  err.name = name;
  return err;
}

describe('nativeShare', () => {
  let created: Blob[];
  let clicks: string[];

  beforeEach(() => {
    platform.native = false;
    created = [];
    clicks = [];
    capacitor.writeFile.mockClear();
    capacitor.share.mockReset();
    capacitor.share.mockResolvedValue({});
    URL.createObjectURL = vi.fn((b: Blob) => {
      created.push(b);
      return 'blob:test';
    }) as typeof URL.createObjectURL;
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicks.push(this.download);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // navigator.share / canShare are set per test
    delete (navigator as { share?: unknown }).share;
    delete (navigator as { canShare?: unknown }).canShare;
  });

  function stubWebShare(impl: () => Promise<void>) {
    Object.defineProperty(navigator, 'share', { value: vi.fn(impl), configurable: true, writable: true });
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true, writable: true });
  }

  it('sharePng: a second tap while a share is open (InvalidStateError) is cancelled, not a download', async () => {
    stubWebShare(() => Promise.reject(domError('InvalidStateError')));
    await expect(sharePng(png(), 'card.png')).resolves.toBe('cancelled');
    expect(clicks).toEqual([]);
    expect(created).toEqual([]);
  });

  it('sharePng: a dismissed sheet (AbortError) is cancelled', async () => {
    stubWebShare(() => Promise.reject(domError('AbortError')));
    await expect(sharePng(png(), 'card.png')).resolves.toBe('cancelled');
    expect(clicks).toEqual([]);
  });

  it('sharePng: a refused file share (NotAllowedError) still saves the image', async () => {
    stubWebShare(() => Promise.reject(domError('NotAllowedError')));
    await expect(sharePng(png(), 'card.png')).resolves.toBe('downloaded');
    expect(clicks).toEqual(['card.png']);
  });

  it('shareFile on the web downloads the file with the type it names', async () => {
    stubWebShare(() => Promise.resolve());
    const blob = new Blob(['{"a":1}']);
    await expect(shareFile(blob, 'export.json', 'application/json')).resolves.toBe('downloaded');
    expect(clicks).toEqual(['export.json']);
    expect(created[0].type).toBe('application/json');
    // a non-image file never goes to the browser's share sheet
    expect(navigator.share).not.toHaveBeenCalled();
  });

  it('shareFile on Android/iOS writes the file to the cache and opens the share sheet', async () => {
    platform.native = true;
    const blob = new Blob(['BEGIN:VCALENDAR'], { type: 'text/calendar;charset=utf-8' });
    await expect(shareFile(blob, 'dates.ics', 'text/calendar;charset=utf-8', { title: 'Wedding' })).resolves.toBe('shared');
    expect(capacitor.writeFile).toHaveBeenCalledTimes(1);
    expect(capacitor.writeFile.mock.calls[0][0].path).toBe('share/dates.ics');
    expect(capacitor.share.mock.calls[0][0].files).toEqual(['file:///cache/share/x']);
    expect(clicks).toEqual([]);
  });

  it('shareFile on Android/iOS: closing the sheet is cancelled, any other failure is failed', async () => {
    platform.native = true;
    capacitor.share.mockRejectedValueOnce(new Error('Share canceled'));
    await expect(shareFile(new Blob(['x']), 'a.json', 'application/json')).resolves.toBe('cancelled');
    capacitor.share.mockRejectedValueOnce(new Error('No activity found'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(shareFile(new Blob(['x']), 'a.json', 'application/json')).resolves.toBe('failed');
    expect(clicks).toEqual([]);
  });
});
