// Renders design-src/screens/*.html to img/screens/*.webp (via PNG + Pillow).
// Run from repo root: node design-src/render-screens.js
const { chromium } = require('playwright');
const path = require('path');
const { execFileSync } = require('child_process');
const names = ['Tonight', 'Discover', 'Map', 'BarTonight', 'BarAbout', 'Profile', 'TonightDay', 'Share'];
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  for (const n of names) {
    await page.goto('file://' + path.resolve(__dirname, 'screens', n + '.html'));
    await page.evaluate(() => document.fonts.ready);
    const png = path.resolve(__dirname, '..', 'img', 'screens', n.toLowerCase() + '.png');
    await page.locator('.scr').screenshot({ path: png });
    execFileSync('python3', ['-c', `from PIL import Image;im=Image.open('${png}').convert('RGB');im.save('${png.replace('.png', '.webp')}','WEBP',quality=86,method=6)`]);
    require('fs').unlinkSync(png);
  }
  await browser.close();
})();
