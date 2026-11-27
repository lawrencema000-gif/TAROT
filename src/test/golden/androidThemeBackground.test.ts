/**
 * Since Capacitor 8.1.0 the SystemBars plugin paints the window's decor view
 * with the activity theme's android:windowBackground. On WebView < 140 the
 * decor view is padded by the system-bar insets, so that colour is what the
 * status and navigation bars sit on. The DayNight theme's default is white in
 * light mode, which put the app's light status-bar icons on white
 * (WP-F-02 emulator check, API 34 / WebView 113). The activity theme
 * (MainActivity → AppTheme.NoActionBar) must keep the app's dark canvas.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const RES = 'android/app/src/main/res';

function styleBlock(file: string, name: string): string {
  const xml = readFileSync(join(process.cwd(), RES, file), 'utf8');
  const start = xml.indexOf(`<style name="${name}"`);
  expect(start, `${name} in ${file}`).toBeGreaterThanOrEqual(0);
  return xml.slice(start, xml.indexOf('</style>', start));
}

describe('Android activity theme keeps a dark window background', () => {
  it('colorPrimaryDark is the app canvas colour', () => {
    const colors = readFileSync(join(process.cwd(), RES, 'values/colors.xml'), 'utf8');
    expect(colors).toMatch(/<color name="colorPrimaryDark">#07070f<\/color>/i);
  });

  for (const file of ['values/styles.xml', 'values-v31/themes.xml']) {
    it(`AppTheme.NoActionBar in ${file} sets android:windowBackground to the canvas`, () => {
      expect(styleBlock(file, 'AppTheme.NoActionBar')).toMatch(
        /<item name="android:windowBackground">@color\/colorPrimaryDark<\/item>/,
      );
    });
  }
});
