/**
 * Render the original Pingo SVG icons to the PNG sizes the web manifest needs.
 * Run with `npx tsx scripts/make-icons.ts` or `node --experimental-strip-types`;
 * the PNGs are committed, so this only runs when the artwork changes.
 */
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const jobs = [
  ['public/icons/pingo-app.svg', 'public/icons/pingo-192.png', 192],
  ['public/icons/pingo-app.svg', 'public/icons/pingo-512.png', 512],
  ['public/icons/pingo-maskable.svg', 'public/icons/pingo-maskable-512.png', 512],
  ['public/icons/pingo-app.svg', 'public/icons/apple-touch-icon.png', 180],
] as const;

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [source, target, size] of jobs) {
  const svg = readFileSync(source, 'utf8').replace('<svg ', `<svg width="${size}" height="${size}" `);
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0;background:transparent}</style>${svg}`);
  await page.locator('svg').screenshot({ path: target, omitBackground: true });
}
await browser.close();
