import { expect, test } from '@playwright/test';

for (const [width, height] of [[1024, 768], [1366, 768], [1920, 1080], [768, 1024]]) {
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
    expect(sheet.x + sheet.width).toBeLessThanOrEqual(panel.x);
    if (width > height) expect(toolbox.x + toolbox.width).toBeLessThanOrEqual(sheet.x);
    else expect(toolbox.y).toBeGreaterThan(sheet.y + sheet.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await expect(page.getByRole('button', { name: 'Ouvir' })).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole('button', { name: 'Adicionar página' })).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole('button', { name: 'O meu texto' })).toBeInViewport({ ratio: 1 });
    if (width > height) await expect(page.getByRole('button', { name: 'Máximo' })).toBeInViewport({ ratio: 1 });
    const filename = `garatuja-${width}x${height}.png`;
    const capture = process.env.GARATUJA_CAPTURE_SCREENS === '1' && height === 768;
    await page.screenshot({ path: capture ? 'docs/screens/' + filename : testInfo.outputPath(filename) });
  });
}
