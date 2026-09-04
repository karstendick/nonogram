/**
 * Renders the PNG icons from the SVG masters in public/.
 *
 * The SVGs are the source of truth; these PNGs exist only because the web app
 * manifest and iOS want raster. They are committed, so a normal build stays a
 * build — run this whenever the artwork changes.
 *
 * The rasterizer is Playwright's Chromium, which the project already installs
 * for its e2e tests. Nothing else on the toolchain can read an SVG.
 *
 * Usage: npm run icons
 */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';

const PUBLIC = new URL('../public/', import.meta.url);

const TARGETS = [
  { source: 'icon.svg', out: 'pwa-192x192.png', size: 192 },
  { source: 'icon.svg', out: 'pwa-512x512.png', size: 512 },
  // iOS rounds this one itself, and treats transparency as black, so it wants
  // the square master on its opaque ground
  { source: 'icon.svg', out: 'apple-touch-icon.png', size: 180 },
  { source: 'icon-maskable.svg', out: 'pwa-maskable-512x512.png', size: 512 },
];

it('render icons', async () => {
  const browser = await chromium.launch();

  try {
    for (const { source, out, size } of TARGETS) {
      const svg = readFileSync(new URL(source, PUBLIC), 'utf8');
      const page = await browser.newPage({ viewport: { width: size, height: size } });

      // The page's own white ground fills the master's rounded corners, so
      // every PNG comes out opaque
      await page.setContent(
        `<style>html,body{margin:0;padding:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`
      );
      writeFileSync(new URL(out, PUBLIC), await page.screenshot());
      await page.close();

      console.log(`${out}  ${size}x${size}`);
    }
  } finally {
    await browser.close();
  }
});
