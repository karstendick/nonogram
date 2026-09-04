import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The app once declared five icons and shipped none of them: the manifest and
 * index.html named files that were never added, and nothing failed — a missing
 * icon is a 404 in someone else's browser, not a build error.
 *
 * So these tests read the declarations as text and check the files are really
 * there. Parsing the config module itself would not help: `VitePWA()` returns
 * constructed plugins, not the options it was given.
 */
// Vitest runs from the project root
const ROOT = process.cwd();
const PUBLIC = join(ROOT, 'public');
const read = (file: string) => readFileSync(join(ROOT, file), 'utf8');

const inPublic = (file: string) => existsSync(join(PUBLIC, file));

// Width and height live at a fixed offset in a PNG's IHDR chunk
const pngSize = (file: string) => {
  const bytes = readFileSync(join(PUBLIC, file));
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
};

describe('icons', () => {
  const viteConfig = read('vite.config.ts');
  const indexHtml = read('index.html');

  const declaredInConfig = [...viteConfig.matchAll(/'([\w.-]+\.(?:png|svg|ico|txt))'/g)].map(
    ([, file]) => file
  );

  it('declares icons in the vite config at all', () => {
    // Guards the regex above: a silent no-match would make the next test vacuous
    expect(declaredInConfig.length).toBeGreaterThanOrEqual(6);
  });

  it.each(declaredInConfig)('ships %s, which the vite config declares', (file) => {
    expect(inPublic(file)).toBe(true);
  });

  it('links icons from index.html through the base path', () => {
    const hrefs = [
      ...indexHtml.matchAll(/<link rel="(?:icon|apple-touch-icon)"[^>]*href="([^"]+)"/g),
    ].map(([, href]) => href);

    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      // A root-absolute href ignores the /nonogram/ base and 404s on the
      // deployed site, which is how the Vite template's /vite.svg went unnoticed
      expect(href.startsWith('%BASE_URL%')).toBe(true);
      expect(inPublic(href.replace('%BASE_URL%', ''))).toBe(true);
    }
  });

  it.each([
    ['pwa-192x192.png', 192],
    ['pwa-512x512.png', 512],
    ['pwa-maskable-512x512.png', 512],
    ['apple-touch-icon.png', 180],
  ])('renders %s at %ipx square', (file, size) => {
    expect(pngSize(file)).toEqual({ width: size, height: size });
  });
});
