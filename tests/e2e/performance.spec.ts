import { expect, test, type Page } from '@playwright/test';

const runs = 5;

function button(page: Page, name: string) {
  return page.getByRole('button', { name, exact: true });
}

function stats(values: number[]) {
  const sorted = values.toSorted((a, b) => a - b);
  return { p95: Math.round(sorted[Math.ceil(sorted.length * .95) - 1]), median: Math.round(sorted[Math.floor(sorted.length / 2)]), min: Math.round(sorted[0]), max: Math.round(sorted.at(-1) ?? 0) };
}

test('measures the drawing desk at Chromium CPU 4× slowdown', async ({ page, context }) => {
  test.skip(process.env.GARATUJA_BENCHMARK !== '1', 'Run this timing check in isolation.');
  test.setTimeout(60_000);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const cold = [];
  const sheets = [];
  const stroke = [];
  const fill = [];
  const magic = [];
  const switchPage = [];

  for (let i = 0; i < runs; i++) {
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__garatuja));
    cold.push(await page.evaluate(() => performance.now()));
    const paper = await page.locator('.sheet').boundingBox();
    if (!paper) throw new Error('Drawing sheet is unavailable');
    const x = paper.x + paper.width / 2;
    const y = paper.y + paper.height / 2;

    // Start at the capture handler, then record the first frame due after the drawing handler ran.
    async function measure(event: 'pointerdown' | 'pointermove', action: () => Promise<unknown>) {
      await page.locator('.sheet').evaluate((sheet, event) => {
        const root = document.documentElement;
        delete root.dataset.inputMs;
        sheet.addEventListener(event, input => {
          requestAnimationFrame(() => { root.dataset.inputMs = String(performance.now() - input.timeStamp); });
        }, { capture: true, once: true });
      }, event);
      await action();
      await page.waitForFunction(() => document.documentElement.dataset.inputMs !== undefined);
      return Number(await page.locator('html').getAttribute('data-input-ms'));
    }
    await button(page, 'Pintar').click();
    await page.mouse.move(x - 80, y);
    await page.mouse.down();
    stroke.push(await measure('pointermove', () => page.mouse.move(x + 80, y - 30)));
    await page.mouse.up();
    await button(page, 'Desfazer').click();
    await button(page, 'Encher').click();
    await button(page, 'Azul').click();
    for (let sample = 0; sample < 4; sample++) {
      fill.push(await measure('pointerdown', () => page.mouse.click(x, y)));
      expect(await page.evaluate(() => window.__garatuja?.pixel(800, 600))).toEqual([73, 125, 187, 255]);
      if (sample < 3) {
        await button(page, 'Desfazer').click();
        expect(await page.evaluate(() => window.__garatuja?.pixel(800, 600))).toEqual([255, 255, 255, 255]);
      }
    }

    await button(page, 'Magia').click();
    await button(page, 'Negativo').click();
    await button(page, 'Em toda a folha').click();
    await page.waitForFunction(() => [...document.querySelectorAll('.choice-preview')]
      .every(canvas => canvas instanceof HTMLCanvasElement && canvas.dataset.magicReady === '1'));
    magic.push(await measure('pointerdown', () => page.mouse.click(x, y)));
    expect(await page.evaluate(() => window.__garatuja?.pixel(800, 600))).toEqual([182, 130, 68, 255]);
    await button(page, 'Desfazer').click();
    await button(page, 'Desfazer').click();

    if (i === 0) {
      await button(page, 'Adicionar página').click();
      await expect(button(page, 'Página 2')).toHaveAttribute('aria-pressed', 'true');
    }
    const pageButton = button(page, i % 2 ? 'Página 2' : 'Página 1');
    await pageButton.evaluate(element => {
      const root = document.documentElement;
      delete root.dataset.switchMs;
      element.addEventListener('click', event => {
        const start = event.timeStamp;
        const app = window.__garatuja?.app;
        const stop = app?.store.subscribe((state, previous) => {
          if (!state.busy && previous.busy) {
            stop?.();
            requestAnimationFrame(() => { root.dataset.switchMs = String(performance.now() - start); });
          }
        });
      }, { capture: true, once: true });
    });
    await pageButton.click();
    await page.waitForFunction(() => document.documentElement.dataset.switchMs !== undefined);
    switchPage.push(Number(await page.locator('html').getAttribute('data-switch-ms')));
  }

  for (const [width, height] of [[1024, 768], [1366, 768], [1920, 1080], [768, 1024]]) {
    await page.setViewportSize({ width, height });
    await button(page, 'Pintar').click();
    const rect = await page.locator('.sheet').boundingBox();
    sheets.push({ width, height, sheetWidth: rect?.width, sheetHeight: rect?.height });
  }
  expect(stats(fill).p95).toBeLessThan(150);
  console.log('GARATUJA_BENCHMARK', JSON.stringify({
    cold: stats(cold.slice(0, 1)), reload: stats(cold.slice(1)), stroke: stats(stroke), fill: stats(fill),
    negative: stats(magic), switchPage: stats(switchPage), sheets,
  }));
});
