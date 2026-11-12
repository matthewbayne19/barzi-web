// Renders design-src/og.html to img/og.png (1200x630). Run from repo root with a local server on :4173 (npx serve -l 4173 .)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.goto('http://localhost:4173/design-src/og');
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: 'img/og.png' });
  await b.close();
})();
