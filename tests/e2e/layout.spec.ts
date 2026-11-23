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
    const visible = await paper.boundingBox();
    if (!visible) throw new Error('Missing sheet with text');
    expect(visible.width / visible.height).toBeCloseTo(4 / 3);
    expect(visible.width).toBeGreaterThanOrEqual(width === 1366 ? 700 : width === 1024 ? 580 : sheetWidth);
    expect(visible.height).toBeGreaterThanOrEqual(width === 1366 ? 525 : width === 1024 ? 435 : sheetHeight);
    await page.getByRole('button', { name: 'Recolher texto', exact: true }).click();
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
    await page.getByRole('button', { name: 'Mostrar texto', exact: true }).click();
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

for (const width of [1024, 1366, 1920]) {
  test(`labels fit at ${width} in normal, high contrast and uppercase settings`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 768 });
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__garatuja));
    await page.evaluate(() => document.fonts.ready);
    for (const mode of [{}, { highContrast: true }, { uppercase: true, highContrast: false }, { uppercase: true, highContrast: true }]) {
      await page.evaluate(mode => window.__garatuja?.app.configure(mode), mode);
      for (const tool of ['Pintar', 'Magia', 'Carimbo']) {
        await page.getByRole('button', { name: tool, exact: true }).click();
        const overflowing = await page.locator('button:visible').evaluateAll(buttons => buttons.flatMap(button =>
          button.scrollWidth > button.clientWidth ? [[button.getAttribute('aria-label'), button.scrollWidth, button.clientWidth]] : []));
        expect(overflowing, JSON.stringify({ mode, tool })).toEqual([]);
      }
    }
  });
}

for (const [width, height] of [[768, 1024], [390, 844]]) {
  test(`portrait file actions stay visible and tools scroll at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__garatuja));
    for (const name of ['Novo', 'Abrir', 'Guardar', 'Desfazer', 'Refazer']) {
      await expect(page.getByRole('button', { name, exact: true })).toBeInViewport({ ratio: 1 });
    }
    const deck = page.locator('.tool-deck');
    // The cut tool at the edge carries a «more» cue: a fade with an arrow over the deck's end.
    await expect.poll(() => deck.evaluate(el => {
      const cue = el.parentElement?.querySelector<HTMLElement>(':scope > .scroll-more-end');
      if (!cue || cue.hidden || el.scrollWidth <= el.clientWidth) return false;
      const strip = el.getBoundingClientRect();
      const mark = cue.getBoundingClientRect();
      return mark.width > 0 && Math.abs(mark.right - strip.right) <= 2 && Math.abs(mark.top - strip.top) <= 2 &&
        getComputedStyle(cue).backgroundImage.includes('linear-gradient');
    })).toBe(true);
    await page.getByRole('button', { name: 'Mover', exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: 'Mover', exact: true })).toBeInViewport({ ratio: 1 });
    for (const name of ['Novo', 'Abrir', 'Guardar']) {
      await expect(page.getByRole('button', { name, exact: true })).toBeInViewport({ ratio: 1 });
    }
    await page.getByRole('button', { name: 'Imprimir', exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: 'Imprimir', exact: true })).toBeInViewport({ ratio: 1 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}
