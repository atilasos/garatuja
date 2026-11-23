import { fillDetails } from './work-details';
import { expect, test, type Page } from '@playwright/test';

function button(page: Page, name: string) {
  return page.getByRole('button', { name, exact: true });
}

async function illustrate(page: Page, frame: number) {
  await page.evaluate(frame => {
    const app = window.__garatuja?.app;
    if (!app) throw new Error('The studio is unavailable');
    const { surface } = app;
    const ctx = surface.ctx;
    const stroke = (color: string, width: number, d: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.stroke(new Path2D(d));
    };
    const paint = (color: string, d: string) => {
      ctx.fillStyle = color;
      ctx.fill(new Path2D(d));
    };
    const disc = (color: string, x: number, y: number, r: number) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    };
    surface.begin();
    ctx.save();
    ctx.lineCap = ctx.lineJoin = 'round';
    paint('#fcf4df', 'M0 0H1600V1200H0Z');
    const sunX = 355 + frame * 54;
    disc('#f5bc59', sunX, 245, 91);
    stroke('#f5bc59', 13, `M${sunX} 110v-39m-90 81-29-29m209 29 29-29m-248 121h-36m294 0h36`);
    paint('#9bc6c5', 'M0 630Q158 591 335 650t315-9q142-51 318 14t301-15q175-48 331-14v574H0Z');
    stroke('#75abad', 9, 'M70 835q100 36 211-8m560 160q105 37 232-8m-747 87q77 28 169-7M126 955q65 19 129-4');
    paint('#cfac84', 'M1600 814q-195-62-380 16t-255 13q-114 1-160 158 455 11 795-1Z');
    paint('#fff9ee', 'M1070 856 1109 353h177l52 503Z');
    paint('#dd7260', 'm1100 445 196 4 18 119-224-4Zm-24 250 250 2 12 159-268-4Z');
    paint('#3f6368', 'm1103 362 25-129h140l25 129Z');
    paint('#fae3a0', 'm1149 257 94 0 18 80h-126Z');
    paint('#c46152', 'm1097 235 101-91 93 91Z');
    paint('#3f6368', 'M1171 853v-100a38 38 0 0 1 76 0v100Z');
    stroke('#596d76', 9, 'M668 222q22-31 54 4 34-20 55 5m-222 97q25-20 46 7 28-19 46 3');
    ctx.save();
    ctx.translate(385 + 124 * frame, 760 - 14 * frame);
    paint('#385b6c', 'm-138 0 285-7-53 63-181 5Z');
    paint('#ed9364', 'M-2-175 112-20-2-20Z');
    paint('#fff9ed', 'M-15-149-102-21h87Z');
    stroke('#385b6c', 8, 'M-5-179v177');
    ctx.restore();
    ctx.restore();
    surface.context({ color: () => '#000000', opt: () => 0, sound: () => {}, say: () => {} }).markAllDirty();
    surface.commit();
  }, frame);
}

for (const width of [1366, 1024]) {
  test(`renders the page strip, animation, book, class presentation and print at ${width}×768`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 768 });
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__garatuja));
    await page.evaluate(() => document.fonts.ready);
    const capture = (name: string) => {
      const filename = `batch-f-${name}-${width}x768.png`;
      return page.screenshot({ path: process.env.GARATUJA_CAPTURE_SCREENS === '1' ? 'docs/screens/' + filename : testInfo.outputPath(filename) });
    };
    await fillDetails(page, { title: 'O farol', author: 'Lia', audience: 'A turma do 2.º ano' });
    const texts = ['Ao amanhecer, o nosso barco saiu devagar.',
      'Quando o vento cresceu, vimos a luz do farol.',
      'O barco seguiu a luz e encontrou o caminho.'];
    for (const [index, text] of texts.entries()) {
      if (index) await button(page, 'Adicionar página').click();
      await expect(button(page, `Página ${index + 1}`)).toHaveAttribute('aria-pressed', 'true');
      await button(page, 'O meu texto').click();
      await page.getByRole('textbox', { name: 'O meu texto' }).fill(text);
      await page.keyboard.press('Escape');
      await illustrate(page, index);
    }
    await button(page, 'Página 2').click();
    await button(page, 'Papel vegetal').click();
    await button(page, 'Organizar').click();
    await button(page, 'Ver seguinte').click();
    await page.keyboard.press('Escape');
    await expect(button(page, 'Página 1')).toBeInViewport({ ratio: 1 });
    await expect(button(page, 'Página 2')).toBeInViewport({ ratio: 1 });
    await expect(button(page, 'Página 3')).toBeInViewport({ ratio: 1 });
    await expect(button(page, 'Apresentar à turma')).toBeInViewport({ ratio: 1 });
    await expect(page.locator('.page-ghost-previous')).toBeInViewport({ ratio: 1 });
    await expect(page.locator('.page-ghost-next')).toBeInViewport({ ratio: 1 });
    await page.waitForFunction(() => {
      const red = window.__garatuja?.app.surface.onion.getImageData(0, 0, 1, 1).data[0] ?? 0;
      return red > 0 && red < 252;
    });
    await capture('paginas');

    await button(page, 'Animar').click();
    await expect(button(page, 'Guardar WebM')).toBeInViewport({ ratio: 1 });
    await page.waitForFunction(() => {
      const canvas = document.querySelector('.animation-screen canvas');
      return canvas instanceof HTMLCanvasElement && canvas.getContext('2d')?.getImageData(0, 0, 1, 1).data[0] === 252;
    });
    await capture('animacao');
    await page.keyboard.press('Escape');

    await button(page, 'Ler').click();
    await expect(page.getByRole('heading', { name: 'O farol' })).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('dialog').getByText(texts[1], { exact: true })).toBeInViewport({ ratio: 1 });
    await page.waitForFunction(() => {
      const canvas = document.querySelector('.book-illustration canvas');
      return canvas instanceof HTMLCanvasElement && canvas.getContext('2d')?.getImageData(0, 0, 1, 1).data[0] === 252;
    });
    await capture('livro');
    await page.keyboard.press('Escape');

    await button(page, 'Apresentar à turma').click();
    await expect(page.locator('.book-position')).toHaveText('Capa');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('dialog').getByText(texts[1], { exact: true })).toBeInViewport({ ratio: 1 });
    await page.waitForFunction(() => {
      const canvas = document.querySelector('.book-illustration canvas');
      return canvas instanceof HTMLCanvasElement && canvas.getContext('2d')?.getImageData(0, 0, 1, 1).data[0] === 252;
    });
    await capture('apresentacao');
    await page.keyboard.press('Escape');

    await button(page, 'Imprimir').click();
    await expect(page.locator('.print-work-preview')).toContainText(texts[1]);
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Imprimir', exact: true })).toBeEnabled();
    await capture('impressao');
  });
}
