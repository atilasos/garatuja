import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { HISTORY_BUDGET } from '../../src/core/history';
import { fillDetails } from './work-details';

const control = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
async function ready(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__garatuja));
}
async function tap(page: Page, x: number, y: number) {
  const box = await page.locator('.sheet').boundingBox();
  if (!box) throw new Error('Missing paper');
  await page.mouse.click(box.x + x * box.width / 1600, box.y + y * box.height / 1200);
}
async function shot(page: Page, info: TestInfo, name: string) {
  const filename = 'final-' + name + '-1366x768.png';
  await page.mouse.move(0, 0);
  await page.screenshot({ path: process.env.GARATUJA_CAPTURE_SCREENS === '1' ? 'docs/screens/' + filename : info.outputPath(filename) });
}

test('bounds all retained undo and redo data while keeping thirty full-sheet steps active', async ({ page }) => {
  test.setTimeout(60_000);
  await ready(page);
  const history = await page.evaluate(async () => {
    const app = window.__garatuja?.app;
    if (!app) throw new Error('Missing app');
    const { surface, documents } = app;
    const context = surface.context({ color: () => '', opt: () => '', sound: () => {}, say: () => {} });
    const fill = (count: number) => {
      for (let i = 0; i < count; i++) {
        surface.begin();
        surface.ctx.fillStyle = i % 2 === 0 ? '#000000' : '#ffffff';
        surface.ctx.fillRect(0, 0, 1600, 1200);
        context.markAllDirty();
        surface.commit();
      }
    };
    const first = documents.page.id;
    fill(8);
    await documents.add();
    const second = documents.page.id;
    fill(8);
    await documents.add();
    const current = documents.page.id;
    fill(18);
    const afterFirstEviction = surface.historyBytes;
    fill(12);
    const after = surface.historyBytes;
    let undone = 0;
    while (surface.canUndo) { surface.undo(); undone++; }
    const redoBytes = surface.historyBytes;
    await documents.select(first);
    const firstEvicted = !surface.canUndo;
    await documents.select(second);
    const secondEvicted = !surface.canUndo;
    await documents.editPages(pages => pages.filter(page => page.id !== current));
    return { afterFirstEviction, after, undone, redoBytes, firstEvicted, secondEvicted, afterDeleting: surface.historyBytes };
  });
  expect(history).toEqual({
    afterFirstEviction: 26 * 1600 * 1200 * 3,
    after: 30 * 1600 * 1200 * 3, undone: 30, redoBytes: 30 * 1600 * 1200 * 3,
    firstEvicted: true, secondEvicted: true, afterDeleting: 0,
  });
  expect(history.after).toBeLessThanOrEqual(HISTORY_BUDGET);
  await tap(page, 150, 155);
  expect(await page.evaluate(() => window.__garatuja?.app.surface.historyBytes)).toBeGreaterThan(0);
  await control(page, 'Novo').click();
  await control(page, 'Começar').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => window.__garatuja?.app.surface.historyBytes)).toBe(0);
});

test('shows page writing next to the paper, marks its thumbnail and remembers collapse', async ({ page }, info) => {
  await ready(page);
  const strip = page.locator('.stage .writing-strip');
  await expect(strip).toContainText('Escreve aqui o teu texto');
  await expect(page.locator('.page-text-mark')).toBeHidden();
  await control(page, 'Editar o texto da página').click();
  await page.getByRole('textbox', { name: 'O meu texto' }).fill('O nosso barco saiu cedo do porto.\nAs velas encheram-se quando chegou o vento.');
  await page.keyboard.press('Escape');
  await expect(strip).toContainText('barco saiu cedo');
  await expect(strip.locator('.writing-preview .button-label')).toHaveCSS('-webkit-line-clamp', '2');
  const box = await page.locator('.sheet').boundingBox();
  const below = await strip.boundingBox();
  expect(below?.y).toBeGreaterThanOrEqual((box?.y ?? 0) + (box?.height ?? 0) - 1);
  await expect(page.locator('.page-text-mark')).toBeVisible();
  await expect(control(page, 'Página 1')).toHaveAccessibleDescription('Tem texto');
  await control(page, 'Carimbo').click();
  await expect(control(page, 'Barco')).not.toHaveAttribute('aria-busy', 'true');
  await tap(page, 760, 440);
  await control(page, 'Pintar').click();
  await shot(page, info, 'faixa-texto');
  await control(page, 'Recolher texto').click();
  await page.reload();
  await expect(strip).toHaveCount(0);
  await control(page, 'Mostrar texto').click();
  await expect(strip).toContainText('barco saiu cedo');
  await control(page, 'Adicionar página').click();
  await expect(strip).toContainText('Escreve aqui o teu texto');
  await control(page, 'Página 1').click();
  await expect(strip).toContainText('barco saiu cedo');
});

test('onion skin leaves a current color pixel exact outside ghost marks', async ({ page }) => {
  await ready(page);
  await control(page, 'Preto').click();
  await tap(page, 95, 100);
  await control(page, 'Adicionar página').click();
  await expect(control(page, 'Página 2')).toHaveAttribute('aria-pressed', 'true');
  await control(page, 'Encher').click();
  await control(page, 'Vermelho').click();
  await tap(page, 800, 600);
  const sheet = page.locator('.sheet');
  async function screenPixel() {
    const png = (await sheet.screenshot()).toString('base64');
    return page.evaluate(async png => {
      const image = new Image();
      image.src = 'data:image/png;base64,' + png;
      await image.decode();
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      context?.drawImage(image, 0, 0);
      return Array.from(context?.getImageData(160, 130, 1, 1).data ?? []);
    }, png);
  }
  const before = await screenPixel();
  expect(before).toEqual([224, 87, 72, 255]);
  await control(page, 'Papel vegetal').click();
  await page.waitForFunction(() => window.__garatuja?.app.surface.onion.getImageData(95, 100, 1, 1).data[3] === 255);
  expect(await screenPixel()).toEqual(before);
});

test('book has a typographic cover only when needed and prints each illustration once', async ({ page }, info) => {
  await ready(page);
  await control(page, 'Ler').click();
  await expect(page.locator('.book-position')).toHaveText('Página 1 de 1');
  await page.keyboard.press('Escape');
  await control(page, 'Imprimir').click();
  await control(page, 'Livro inteiro').click();
  await expect(page.locator('.print-work-preview .print-work-sheet')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await fillDetails(page, { title: 'Um jardim de girassóis', author: 'Lia', audience: 'As famílias' });
  await page.evaluate(() => window.__garatuja?.app.configure({ className: '3.º B' }));
  await control(page, 'Ler').click();
  const cover = page.locator('.book-cover');
  await expect(cover).toContainText('Um jardim de girassóis');
  await expect(cover).toContainText('3.º B');
  await expect(cover).toContainText('Para quem é?');
  await expect(cover.locator('canvas, img')).toHaveCount(0);
  expect(await cover.locator('h1').evaluate(element =>
    element.getBoundingClientRect().height / parseFloat(getComputedStyle(element).lineHeight))).toBeLessThanOrEqual(2.1);
  await shot(page, info, 'capa');
  await page.keyboard.press('Escape');
  await control(page, 'Imprimir').click();
  await control(page, 'Livro inteiro').click();
  await expect(page.locator('.print-work-preview .print-work-sheet')).toHaveCount(2);
  await expect(page.locator('.print-work-preview img')).toHaveCount(1);
});

test('gallery presents selected works in order, including all pages and automatic advance', async ({ page }, info) => {
  await ready(page);
  await control(page, 'Novo').click();
  await control(page, 'Céu e prado').click();
  await control(page, 'Começar').click();
  await fillDetails(page, { title: 'Flores do jardim', author: 'Iara' });
  await tap(page, 600, 500);
  await control(page, 'Adicionar página').click();
  await expect(control(page, 'Página 2')).toHaveAttribute('aria-pressed', 'true');
  await control(page, 'Novo').click();
  await control(page, 'Praia e mar').click();
  await control(page, 'Começar').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await fillDetails(page, { title: 'A visita ao farol', author: 'Lia' });
  await control(page, 'Abrir').click();
  await control(page, 'Diapositivos').click();
  const gallery = page.getByRole('dialog', { name: 'Abrir trabalho' });
  const first = gallery.getByRole('button', { name: /Flores do jardim, Iara/ });
  const second = gallery.getByRole('button', { name: /A visita ao farol, Lia/ });
  await first.click();
  await second.click();
  await expect(first.locator('.gallery-slide-order')).toHaveText('1');
  await expect(second.locator('.gallery-slide-order')).toHaveText('2');
  await shot(page, info, 'diapositivos');
  await control(page, 'Reproduzir seleção').click();
  const presentation = page.getByRole('dialog', { name: 'Diapositivos' });
  await expect(presentation.locator('.slide-work')).toContainText('Iara');
  await page.waitForFunction(() => document.fullscreenElement?.classList.contains('class-presentation'));
  await expect(presentation.locator('.book-position')).toHaveText('Página 1 de 2');
  await page.waitForFunction(() => {
    const canvas = document.querySelector('.book-illustration canvas');
    return canvas instanceof HTMLCanvasElement && canvas.getContext('2d')?.getImageData(0, 0, 1, 1).data[3] === 255;
  });
  await shot(page, info, 'diapositivos-leitor');
  await page.keyboard.press('ArrowRight');
  await expect(presentation.locator('.book-position')).toHaveText('Página 2 de 2');
  await expect(presentation.locator('.slide-work')).toContainText('Flores do jardim');
  await page.keyboard.press('ArrowLeft');
  await expect(presentation.locator('.book-position')).toHaveText('Página 1 de 2');
  for (const speed of ['Devagar', 'Normal', 'Depressa']) {
    await control(page, speed).click();
    await expect(control(page, speed)).toHaveAttribute('aria-pressed', 'true');
  }
  await control(page, 'Avanço automático').click();
  await expect(presentation.locator('.slide-work')).toContainText('A visita ao farol', { timeout: 8_000 });
  await expect(presentation.locator('.slide-work')).toContainText('Lia');
  await expect(control(page, 'Avanço automático')).toHaveAttribute('aria-pressed', 'false');
});

test('bitmap text rises near the bottom and keeps an oversized draft editable', async ({ page }) => {
  await ready(page);
  await control(page, 'Texto').click();
  await control(page, 'Máximo').click();
  await tap(page, 300, 1120);
  const field = page.getByRole('textbox', { name: 'Escreve aqui' });
  const top = (await field.boundingBox())?.y ?? 0;
  await field.fill('Uma flor\nDois ramos\nTrês folhas');
  expect((await field.boundingBox())?.y).toBeLessThan(top - 50);
  await control(page, 'Pousar').click();
  await expect(field).toBeHidden();
  await expect(control(page, 'Desfazer')).toBeEnabled();
  await tap(page, 300, 1120);
  const long = Array.from({ length: 12 }, () => 'Uma flor').join('\n');
  await field.fill(long);
  const warning = page.locator('.label-fit-warning');
  await expect(warning).toHaveText('Não cabe. Escolhe uma letra mais pequena.');
  await expect(warning).toBeVisible();
  await control(page, 'Pousar').click();
  await expect(field).toHaveValue(long);
  await expect(warning).toBeVisible();
  await expect(page.locator('.toast').filter({ hasText: 'Não cabe.' })).toHaveCount(0);
  await control(page, 'Mínimo').click();
  await expect(warning).toBeHidden();
  await control(page, 'Pousar').click();
  await expect(field).toBeHidden();
});

test('magic has five fully visible categories and a contextual fixed whole-sheet switch', async ({ page }, info) => {
  await ready(page);
  await control(page, 'Magia').click();
  const categories = page.locator('.option-categories').getByRole('button');
  await expect(categories).toHaveCount(5);
  for (const tab of await categories.all()) await expect(tab).toBeInViewport({ ratio: 1 });
  await expect(control(page, 'Em toda a folha')).toHaveCount(0);
  await control(page, 'Clarear').click();
  const flag = page.locator('.options-fixed').getByRole('button', { name: 'Em toda a folha' });
  await expect(flag).toBeInViewport({ ratio: 1 });
  await flag.click();
  await expect(flag).toHaveAttribute('aria-pressed', 'true');
  await shot(page, info, 'magia');
  await control(page, 'Desfocar').click();
  await expect(flag).toHaveCount(0);
  await expect(control(page, 'Pincel caleidoscópio')).toHaveCount(1);
  await expect(control(page, 'Caleidoscópio')).toHaveCount(1);
});

test('whole-sheet flips are reversible, folds are separate and shifting wraps back to origin', async ({ page }) => {
  await ready(page);
  await tap(page, 300, 200);
  const sample = (x: number, y: number) => page.evaluate(([x, y]) => window.__garatuja?.pixel(x, y), [x, y]);
  const ink = await sample(300, 200);
  const white = [255, 255, 255, 255];
  expect(ink).not.toEqual(white);
  await control(page, 'Magia').click();
  await control(page, 'Virar').click();
  await tap(page, 800, 600);
  expect(await sample(300, 1000)).toEqual(ink);
  expect(await sample(300, 200)).toEqual(white);
  await tap(page, 800, 600);
  expect(await sample(300, 200)).toEqual(ink);
  expect(await sample(300, 1000)).toEqual(white);
  await control(page, 'Dobrar de cima').click();
  await tap(page, 800, 600);
  expect(await sample(300, 200)).toEqual(ink);
  expect(await sample(300, 1000)).toEqual(ink);
  await control(page, 'Desfazer').click();
  await control(page, 'Dobrar ao meio').click();
  await tap(page, 800, 600);
  expect(await sample(1300, 200)).toEqual(ink);
  expect(await sample(300, 200)).toEqual(ink);
  await control(page, 'Desfazer').click();
  await control(page, 'Deslocar').click();
  const box = await page.locator('.sheet').boundingBox();
  if (!box) throw new Error('Missing sheet');
  const x = (px: number) => box.x + px * box.width / 1600;
  const y = (px: number) => box.y + px * box.height / 1200;
  await page.mouse.move(x(400), y(160));
  await page.mouse.down();
  await page.mouse.move(x(1450), y(1110), { steps: 5 });
  expect(await sample(1350, 1150)).toEqual(ink);
  await page.mouse.move(x(250), y(20), { steps: 5 });
  expect(await sample(150, 60)).toEqual(ink);
  await page.mouse.move(x(400), y(160), { steps: 5 });
  await page.mouse.up();
  expect(await sample(300, 200)).toEqual(ink);
  expect(await sample(150, 60)).toEqual(white);
});

test('stamps have one scroll region and contextual guidance for an empty personal collection', async ({ page }, info) => {
  await ready(page);
  await control(page, 'Carimbo').click();
  await expect(page.locator('.stamp-gallery')).toBeVisible();
  expect(await page.locator('.stamp-gallery').evaluate(element => element.scrollHeight <= element.clientHeight)).toBe(true);
  const scroll = page.locator('.options-scroll');
  await control(page, 'Descer').click();
  await expect.poll(() => scroll.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  const rotation = page.getByRole('slider', { name: 'Rotação livre' });
  await rotation.scrollIntoViewIfNeeded();
  await expect(rotation).toBeInViewport({ ratio: 1 });
  await rotation.focus();
  await page.keyboard.press('ArrowRight');
  await expect(rotation).toHaveValue('1');
  await shot(page, info, 'carimbos');
  await page.evaluate(() => window.__garatuja?.app.configure({ level: 1 }));
  await control(page, 'Categorias').click();
  await control(page, 'Os meus carimbos').click();
  await expect(page.locator('.stamp-empty')).toContainText('Nas Categorias podes escolher outros carimbos.');
  await expect(control(page, 'Mover')).toHaveCount(0);
});

test('font samples preserve ink margins for the school and typewriter faces', async ({ page }) => {
  await ready(page);
  await control(page, 'Texto').click();
  await page.evaluate(() => document.fonts.ready);
  for (const name of ['Letra manuscrita', 'Máquina de escrever']) {
    const canvas = control(page, name).locator('canvas');
    await expect.poll(() => canvas.evaluate(el => {
      if (!(el instanceof HTMLCanvasElement)) return [];
      const pixels = el.getContext('2d')?.getImageData(0, 0, el.width, el.height).data;
      if (!pixels) return [];
      let left = el.width;
      let right = 0;
      let top = el.height;
      let bottom = 0;
      for (let y = 0; y < el.height; y++) for (let x = 0; x < el.width; x++) {
        if (!pixels[(y * el.width + x) * 4 + 3]) continue;
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
      return [left, top, el.width - right - 1, el.height - bottom - 1].map(value => value >= 4 && value < 30);
    })).toEqual([true, true, true, true]);
  }
});

const regions: [string, [number, number], [number, number]][] = [
  ['diagram', [800, 600], [400, 600]],
  ['timeline', [256, 350], [390, 400]],
  ['cycle', [800, 220], [810, 580]],
  ['before-after', [380, 500], [810, 500]],
  ['poster', [800, 550], [800, 300]],
  ['book-page', [800, 530], [800, 740]],
  ['postcard', [1400, 180], [1130, 180]],
];

test('structured templates keep flood fills inside their drawing zones', async ({ page }) => {
  await ready(page);
  for (const [model, inside, outside] of regions) {
    await control(page, 'Novo').click();
    await page.locator(`[data-starter="${model}"]`).click();
    await control(page, 'Começar').click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await control(page, 'Encher').click();
    await control(page, 'Vermelho').click();
    await tap(page, ...inside);
    expect(await page.evaluate(([x, y]) => window.__garatuja?.pixel(x, y), inside), model).toEqual([224, 87, 72, 255]);
    expect(await page.evaluate(([x, y]) => window.__garatuja?.pixel(x, y), outside), model).toEqual([255, 255, 255, 255]);
  }
});

test('unavailable tools explain what is missing and Move describes the chosen cutout mode', async ({ page }) => {
  await ready(page);
  const animate = control(page, 'Animar');
  await expect(animate).toBeDisabled();
  await animate.hover();
  const hint = page.locator('#pingo-hint');
  await expect(hint).toHaveText('Para animar, junta outra página.');
  const undo = control(page, 'Desfazer');
  await undo.click({ force: true });
  await expect(hint).toHaveText('Ainda não há nada para desfazer.');
  await control(page, 'Refazer').focus();
  await expect(hint).toContainText('Desfaz um passo');
  await control(page, 'Mover').click();
  await expect(hint).toContainText('Arrasta na diagonal');
  await control(page, 'Laço').click();
  await expect(hint).toContainText('Contorna');
  await control(page, 'Retângulo').click();
  await expect(hint).toContainText('Arrasta na diagonal');
});

test('upper case reaches controls and dialogs, orientation and settings icons differ, and Space is translated', async ({ page }) => {
  await ready(page);
  const markup = (name: string) => control(page, name).locator('svg').innerHTML();
  const original = await markup('Novo');
  await control(page, 'Imprimir').click();
  const portrait = await markup('Ao alto');
  const landscape = await markup('Ao baixo');
  expect(new Set([original, portrait, landscape]).size).toBe(3);
  await page.keyboard.press('Escape');
  await control(page, 'Definições').click();
  const options = page.getByRole('dialog', { name: 'Definições' });
  for (const [a, b] of [['Cursor grande', 'Clique fixo'], ['Interface simples', 'Interface completa'], ['Como se usa', 'Créditos']]) {
    expect(await markup(a)).not.toEqual(await markup(b));
  }
  await control(page, 'Só maiúsculas').click();
  await expect(options.locator('button').first()).toHaveCSS('text-transform', 'uppercase');
  await expect(options).toHaveCSS('text-transform', 'uppercase');
  await page.keyboard.press('Escape');
  await expect(control(page, 'Pintar')).toHaveCSS('text-transform', 'uppercase');
  await control(page, 'O meu texto').click();
  await expect(page.getByRole('textbox')).toHaveCSS('text-transform', 'none');
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.__garatuja?.app.configure({ locale: 'en', uppercase: false }));
  await page.keyboard.press('F1');
  await page.locator('summary').click();
  await expect(page.locator('kbd').getByText('Space', { exact: true })).toBeVisible();
  await expect(page.getByText('Espaço', { exact: true })).toHaveCount(0);
});
