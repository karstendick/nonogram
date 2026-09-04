# App Icons

> **Source:** [issue #22 — App has no icons: favicon and PWA icons are all missing](https://github.com/karstendick/nonogram/issues/22)

## Context

The app ships no artwork at all. `public/` contains a single file, `404.html`. Every icon the app
declares resolves to nothing.

**Favicon.** [index.html](../../index.html) still carries the Vite template's
`<link rel="icon" href="/vite.svg">`. Two independent faults: the file was never added, and the path
is root-absolute, so it points at `karstendick.github.io/vite.svg` rather than under the
`/nonogram/` base path. Confirmed against the built output — `dist/index.html` carries
`href="/vite.svg"` verbatim while the script and stylesheet next to it were rewritten to
`/nonogram/assets/…`. Vite leaves the icon href alone because it looks like a site-root URL.

**PWA icons.** The manifest in [vite.config.ts](../../vite.config.ts) declares `pwa-192x192.png` and
`pwa-512x512.png`. Neither file exists, so installing the app gets a generic placeholder. The
declared paths themselves are fine: they are relative, and the built manifest at
`/nonogram/manifest.webmanifest` resolves them to `/nonogram/pwa-192x192.png`.

**`includeAssets`.** Lists `favicon.ico`, `robots.txt` and `apple-touch-icon.png` for precaching.
None of the three exist.

Everything else about the PWA works — manifest, service worker, offline support, preview-deploy
handling. The artwork is the only thing between it and being properly installable.

## Requirements

1. An icon designed for this app: a nonogram motif, legible as a 16px favicon and as a 512px install
   icon.
2. The declared files exist in `public/`: `favicon.svg`, `apple-touch-icon.png`,
   `pwa-192x192.png`, `pwa-512x512.png`, and a maskable 512.
3. `index.html` references the favicon through the base path, so it resolves on the deployed site.
4. `includeAssets` lists only files that exist.
5. Installing on a phone puts a real icon on the home screen — checked by hand, since nothing
   automated can confirm it.

## Design Decisions

### The motif is a coarse nonogram, not the app's own 15×15 grid

A 15×15 grid is about one pixel per cell at favicon size and turns to mush. The icon uses a 5×5
grid — dark filled squares on white, thin grid lines, a few cells left empty to read as a puzzle
rather than a checkerboard — with one cell in the app's accent purple so it is identifiable at a
glance in a row of tabs.

The accent is Tailwind's `purple-600`, `#9333ea`, which is what the Quick Play button on the landing
page actually uses. (The issue estimated it as `#7c3aed`-ish, which is `violet-600`.)

### SVG is the source; the PNGs are rendered from it

One `icon.svg` is the master. The PNG sizes are generated from it by a script so they cannot drift
apart, and the generated files are committed to `public/` — the normal `npm run build` stays a plain
build with no rendering step and no new runtime dependency.

### Rendering uses Playwright's Chromium, which is already installed

No rasterizer is available on the machine — no `rsvg-convert`, ImageMagick or Inkscape — and `sips`
cannot read SVG. Playwright is already a devDependency and `postinstall` already runs
`playwright install chromium`, so a small `scripts/render-icons.ts` that loads the SVG at a fixed
viewport and screenshots it gets exact-size PNGs with nothing new added to the project.

### `favicon.svg` plus `apple-touch-icon.png`, and no `favicon.ico`

An SVG favicon is served to every browser that matters and stays sharp at any size; Safari and iOS
take `apple-touch-icon.png` at 180×180. `favicon.ico` exists for browsers this app does not support,
so it is dropped from `includeAssets` rather than authored.

### A maskable icon is added, beyond the issue's checklist

Android crops install icons to the launcher's shape. Without an icon entry declaring
`purpose: "maskable"`, it crops the standard icon and clips the artwork. A separate 512 with the
motif inset into the safe zone on a solid ground is what makes the installed icon look deliberate
instead of trimmed — which is the whole point of the issue.

### `%BASE_URL%` for the favicon href

Verified by building: `href="%BASE_URL%favicon.svg"` in `index.html` emits
`href="/nonogram/favicon.svg"` in `dist/index.html`, and the file is copied out of `public/`
alongside it. A bare relative href would ask Vite to resolve an asset that only exists in `public/`;
`%BASE_URL%` is substituted at build time and needs no resolution.

### `robots.txt` is written, not dropped

It is a public site on GitHub Pages, so a two-line allow-all is worth having, and it keeps the
existing `includeAssets` entry honest.

## Implementation Plan

1. **`public/icon.svg`** — the master artwork, plus a maskable variant with safe-zone padding.
2. **`scripts/render-icons.ts`** — render the master to `pwa-192x192.png`, `pwa-512x512.png` and
   `apple-touch-icon.png` (180×180), and the maskable variant to `pwa-maskable-512x512.png`, all
   into `public/`. Add an `npm run icons` script. Commit the output.
3. **`public/favicon.svg`** — the master, copied or re-exported at favicon proportions.
4. **`public/robots.txt`** — allow all.
5. **`index.html`** — `<link rel="icon" type="image/svg+xml" href="%BASE_URL%favicon.svg" />` and an
   `apple-touch-icon` link alongside it.
6. **`vite.config.ts`** — drop `favicon.ico` from `includeAssets`, add `favicon.svg`; add the
   maskable icon entry to the manifest.

## Test Plan

- `npm run build`, then assert against `dist/`: the icon href is `/nonogram/favicon.svg`, and every
  file named by the manifest and by `includeAssets` is present in the output.
- Confirm the rendered PNGs are exactly the declared pixel sizes.
- Eyeball the favicon at 16px in a real tab — the point of the design is legibility at that size,
  and nothing else will catch it if it fails.
- Install the app on a phone from the deployed site and confirm the home-screen icon (requirement 5,
  manual).

## Implementation notes (as built)

The automated check is `tests/icons.test.ts`, which asserts against `public/` and the declarations in
`vite.config.ts` and `index.html` rather than against `dist/` — building inside a unit test would put
a Vite build in the path of `npm test` for a check that is really "does the file we promised exist".
It reads the config as text, since `VitePWA()` returns constructed plugins rather than the options it
was given. The `dist/` assertions in the plan above were run by hand instead: the icon href comes out
as `/nonogram/favicon.svg`, the manifest carries all three icon entries, and every declared file is
copied into the build.

The masters are `public/icon.svg`, `public/icon-maskable.svg` and `public/favicon.svg`, generated
from one 5×5 pattern at three insets — the favicon gives up its margin, the maskable one pulls the
motif into the safe zone.

## Open Questions

- `theme_color` and the `index.html` `theme-color` meta are both `#ffffff`. Should they become the
  accent purple, which would tint the mobile browser chrome and the PWA splash? Default: leave them
  white — that is a visual change to the running app, not an icon fix. _Resolved: leave them
  white._
- The maskable icon needs a solid ground behind the motif. White, or the accent purple? Default:
  white, matching the app. _Resolved: white._
