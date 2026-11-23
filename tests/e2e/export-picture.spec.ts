import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

const control = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
async function ready(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__garatuja));
}

test('Exportar sits next to Guardar and downloads the page as a PNG picture', async ({ page }) => {
  await ready(page);
  const files = await page.locator('.file-actions button').allInnerTexts();
  expect(files.map(name => name.trim())).toEqual(['Novo', 'Abrir', 'Guardar', 'Exportar', 'Imprimir']);

  const sheet = await page.locator('.sheet').boundingBox();
  if (!sheet) throw new Error('Missing sheet');
  await page.mouse.move(sheet.x + 80, sheet.y + 80);
  await page.mouse.down();
  await page.mouse.move(sheet.x + 260, sheet.y + 220, { steps: 8 });
  await page.mouse.up();

  const downloading = page.waitForEvent('download');
  await control(page, 'Exportar').click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/\.png$/);
  const bytes = await readFile(await download.path());
  expect(bytes.subarray(1, 4).toString('latin1')).toBe('PNG');
  expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([1600, 1200]);
  // A blank 1600×1200 page compresses to a few kilobytes; the stroke makes the file larger.
  expect(bytes.length).toBeGreaterThan(8_000);
  await expect(page.locator('.help')).toContainText('A imagem desta página está nas transferências.');
});

for (const [width, height] of [[768, 1024], [390, 844]]) {
  test(`Exportar stays in view at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await ready(page);
    await expect(control(page, 'Exportar')).toBeInViewport({ ratio: 1 });
    await expect(control(page, 'Guardar')).toBeInViewport({ ratio: 1 });
  });
}
