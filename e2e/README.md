# E2E Testing with Playwright

This directory contains end-to-end tests for the Nonogram webapp, with a focus on mobile testing and visual feedback.

## Setup

Playwright is already installed. If you need to reinstall browsers:

```bash
npx playwright install chromium
```

## Running Tests

### Run all tests on all configured devices

```bash
npm run test:e2e
```

This will run tests on:
- Desktop Chrome (1280x720)
- iPhone 14
- iPhone 14 Pro Max
- Pixel 7
- iPad Pro
- Samsung Galaxy S9+

### Run tests only on mobile devices

```bash
npm run test:e2e:mobile
```

This runs tests specifically on iPhone 14 and Pixel 7.

### Run tests with interactive UI

```bash
npm run test:e2e:ui
```

This opens Playwright's UI mode where you can:
- See all tests
- Run tests individually
- Watch tests run in real-time
- Inspect elements
- View traces

### Debug tests

```bash
npm run test:e2e:debug
```

Opens tests in debug mode with Playwright Inspector.

### View test results

```bash
npm run test:e2e:report
```

Opens an HTML report of the last test run.

## Test Structure

### `app.spec.ts`
Basic smoke tests ensuring the app loads and core functionality works.

### `mobile-visual.spec.ts`
Visual regression tests that take screenshots at different viewport sizes. Screenshots are saved to the `screenshots/` directory with device names in the filename.

**Use these to:**
- Compare layouts across devices
- Spot responsive design issues
- Review visual appearance on mobile vs desktop

### `mobile-interaction.spec.ts`
Tests mobile-specific interactions like:
- Touch events
- Mode toggles (fill/mark)
- Scrolling behavior
- Navigation

## Mobile Testing Workflow

### Quick feedback loop during development:

1. **Start dev server in one terminal:**
   ```bash
   npm run dev
   ```

2. **Run mobile tests in watch mode:**
   ```bash
   npm run test:e2e:mobile -- --ui
   ```

3. **Make changes to your code** - tests will re-run automatically

4. **Review screenshots** in the `screenshots/` directory to see how your changes look on different devices

### Compare mobile vs desktop:

After running tests, check the `screenshots/` directory for files like:
- `puzzle-selection-Desktop Chrome.png`
- `puzzle-selection-iPhone 14.png`
- `puzzle-selection-Pixel 7.png`

Open them side-by-side to identify layout issues.

## Common Playwright Commands

### Run specific test file
```bash
npx playwright test mobile-visual.spec.ts
```

### Run specific test by name
```bash
npx playwright test -g "should display puzzle selection"
```

### Run on specific device only
```bash
npx playwright test --project="iPhone 14"
```

### Run in headed mode (see browser)
```bash
npx playwright test --headed
```

### Generate code (record interactions)
```bash
npx playwright codegen http://localhost:5173
```

## Testing Mobile Responsiveness

When you make CSS changes, run:

```bash
npm run test:e2e:mobile
```

Then review the screenshots to ensure:
- ✅ Text is readable (not too small)
- ✅ Buttons are large enough to tap (min 44x44px)
- ✅ Content doesn't overflow
- ✅ Spacing is appropriate
- ✅ Interactive elements are accessible

## Playwright Configuration

See `playwright.config.ts` for:
- Device configurations
- Viewport sizes
- Screenshot settings
- Timeout configurations

## Tips

1. **Use --ui mode** for the best development experience
2. **Screenshots are your friend** - they show exactly what users see
3. **Test on real devices too** - access your dev server on your phone via local network
4. **Check traces** - when tests fail, Playwright captures detailed traces you can replay

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Test Assertions](https://playwright.dev/docs/test-assertions)
- [Emulating Devices](https://playwright.dev/docs/emulation)
