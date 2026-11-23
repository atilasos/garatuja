import { expect, test } from '@playwright/test';

const viewports = [
  { width: 1024, height: 768, sheetWidth: 620, sheetHeight: 465 },
  { width: 1366, height: 768, sheetWidth: 740, sheetHeight: 555 },
  { width: 1920, height: 1080, sheetWidth: 1100, sheetHeight: 825 },
  { width: 768, height: 1024, sheetWidth: 740, sheetHeight: 555 },
];

for (const { width, height, sheetWidth, sheetHeight } of viewports) {
  test(`lays out the drawing desk at ${width}×${height}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    const paper = page.getByRole('group', { name: 'Folha de desenho' });
    const tools = page.getByRole('complementary', { name: 'Ferramentas' });
    const options = page.getByRole('complementary', { name: 'Opções' });
    await expect(paper).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const sheet = await paper.boundingBox();
    const toolbox = await tools.boundingBox();
    const panel = await options.boundingBox();
    if (!sheet || !toolbox || !panel) throw new Error('Missing workspace bounds');
    expect(sheet.width / sheet.height).toBeCloseTo(4 / 3);
    expect(sheet.width).toBeGreaterThanOrEqual(sheetWidth);
    expect(sheet.height).toBeGreaterThanOrEqual(sheetHeight);
    if (width > height) {
      expect(sheet.x + sheet.width).toBeLessThanOrEqual(panel.x);
      expect(toolbox.x + toolbox.width).toBeLessThanOrEqual(sheet.x);
    } else {
      expect(toolbox.y).toBeGreaterThan(sheet.y + sheet.height);
      expect(panel.y).toBeGreaterThanOrEqual(toolbox.y + toolbox.height);
    }
    const documentSize = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight]);
    expect(documentSize[0]).toBeLessThanOrEqual(width);
    expect(documentSize[1]).toBeLessThanOrEqual(height);
    for (const name of ['Ouvir', 'Adicionar página', 'O meu texto', 'Máximo', 'Desfazer', 'Refazer', 'Redondo']) {
      await expect(page.getByRole('button', { name, exact: true })).toBeInViewport({ ratio: 1 });
    }

    async function checkTargets() {
      const small = await page.locator('button:visible').evaluateAll(buttons => buttons.flatMap(button => {
        const { width, height } = button.getBoundingClientRect();
        return width < 48 || height < 48 ? [[button.getAttribute('aria-label'), width, height]] : [];
      }));
      expect(small).toEqual([]);
    }

    await checkTargets();
    const filename = `final-${width}x${height}.png`;
    await page.screenshot({ path: process.env.GARATUJA_CAPTURE_SCREENS === '1' ? 'docs/screens/' + filename : testInfo.outputPath(filename) });

    const settings = page.getByRole('button', { name: 'Definições', exact: true });
    await settings.click();
    await checkTargets();
    await page.getByRole('button', { name: 'Interface simples' }).click();
    await page.keyboard.press('Escape');
    await checkTargets();
    await page.getByRole('button', { name: 'Carimbo', exact: true }).click();
    await checkTargets();
    await page.getByRole('button', { name: 'Abrir', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await checkTargets();
  });
}
