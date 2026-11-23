import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { answerAdultChallenge, openAdultGate } from './teacher-access';

const control = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
async function ready(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__garatuja));
}
async function point(page: Page, x: number, y: number) {
  const sheet = await page.locator('.sheet').boundingBox();
  if (!sheet) throw new Error('Missing sheet');
  return { x: sheet.x + x * sheet.width / 1600, y: sheet.y + y * sheet.height / 1200 };
}
async function tap(page: Page, x: number, y: number) {
  const at = await point(page, x, y);
  await page.mouse.click(at.x, at.y);
}
function capture(page: Page, info: TestInfo, name: string) {
  const filename = `final-${name}-1366x768.png`;
  return page.screenshot({ path: process.env.GARATUJA_CAPTURE_SCREENS === '1' ? 'docs/screens/' + filename : info.outputPath(filename) });
}

for (const count of [1, 2]) {
  for (const view of ['Ler', 'Apresentar à turma', 'Diapositivos']) {
    test(`${view} traverses writing and page boundaries on ${count} pages`, async ({ page }) => {
      await ready(page);
      await page.evaluate(async count => {
        const { documents } = window.__garatuja!.app;
        const text = 'A horta tem couves, cenouras e muitas flores.\n\n'.repeat(12);
        documents.editText(text);
        if (count === 2) {
          await documents.add();
          documents.editText(text);
        }
        await documents.save();
      }, count);
      if (view === 'Diapositivos') {
        await control(page, 'Abrir').click();
        await control(page, view).click();
        await page.locator('.gallery-open').click();
        await control(page, 'Reproduzir seleção').click();
      } else {
        await control(page, view).click();
        if (count > 1) await control(page, 'Seguinte').click();
      }
      const copy = page.locator('.book-copy');
      const next = control(page, 'Seguinte');
      const previous = control(page, 'Anterior');
      const position = page.locator('.book-position');
      const scroll = () => copy.evaluate(area => area.scrollTop);
      const end = () => copy.evaluate(area => area.scrollHeight - area.clientHeight);
      await expect(position).toHaveText(`Página 1 de ${count}`);
      await expect(next).toBeEnabled();
      await next.click();
      expect(await scroll()).toBeGreaterThan(0);
      await expect(previous).toBeEnabled();
      await previous.click();
      expect(await scroll()).toBe(0);
      if (count === 1) await expect(previous).toBeDisabled();
      await page.keyboard.press('PageDown');
      expect(await scroll()).toBeGreaterThan(0);
      await copy.evaluate(area => { area.scrollTop = area.scrollHeight; });
      if (count === 2) {
        await next.click();
        await expect(position).toHaveText('Página 2 de 2');
        expect(await scroll()).toBe(0);
      }
      if (view === 'Apresentar à turma') {
        await copy.evaluate(area => { area.scrollTop = area.scrollHeight; });
        await next.click();
        await expect(position).toHaveText('Comentários');
        await previous.click();
        expect(await scroll()).toBe(await end());
      } else {
        await copy.evaluate(area => { area.scrollTop = area.scrollHeight; });
        await expect(next).toBeDisabled();
        await previous.click();
        expect(await scroll()).toBeLessThan(await end());
      }
    });
  }
}

test('slideshow autoplay stops at the bottom of its last page, after stepping through its text', async ({ page }) => {
  await ready(page);
  await page.evaluate(async () => {
    const { documents } = window.__garatuja!.app;
    documents.editText('A última página.\n\n'.repeat(12));
    await documents.save();
  });
  await control(page, 'Abrir').click();
  await control(page, 'Diapositivos').click();
  await page.locator('.gallery-open').click();
  await control(page, 'Reproduzir seleção').click();
  const copy = page.locator('.book-copy');
  await expect(copy).toBeVisible();
  await page.clock.install();
  await control(page, 'Depressa').click();
  const play = control(page, 'Avanço automático');
  await play.click();
  await page.clock.runFor(2700);
  const scroll = () => copy.evaluate(area => area.scrollTop);
  const bottom = await copy.evaluate(area => area.scrollHeight - area.clientHeight);
  expect(await scroll()).toBeGreaterThan(0);
  expect(await scroll()).toBeLessThan(bottom);
  await expect(play).toHaveAttribute('aria-pressed', 'true');
  for (let i = 0; i < 24 && await scroll() < bottom - 1; i++) await page.clock.runFor(2700);
  expect(await scroll()).toBeCloseTo(bottom, 0);
  await expect(play).toHaveAttribute('aria-pressed', 'false');
  await expect(control(page, 'Seguinte')).toBeDisabled();
});

test('reader loads a real thumbnail before the full image and book print sizes writing by length', async ({ page }) => {
  await ready(page);
  await page.evaluate(async () => {
    const app = window.__garatuja!.app;
    app.documents.editText('A flor cresce.');
    await app.documents.add();
    app.documents.editText('Mais uma linha para imprimir.\n'.repeat(22));
    await app.documents.save();
    const composite = app.surface.compositePage.bind(app.surface);
    app.surface.compositePage = async (...args) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      await composite(...args);
    };
  });
  await control(page, 'Ler').click();
  await control(page, 'Seguinte').click();
  const thumbnail = page.locator('.book-illustration img');
  await expect(thumbnail).toBeVisible();
  expect(await thumbnail.evaluate(img => img instanceof HTMLImageElement ? img.decode().then(() => img.naturalWidth) : 0)).toBe(240);
  await expect(page.locator('.book-illustration canvas')).toBeVisible();
  await expect(thumbnail).toHaveCount(0);
  await page.keyboard.press('Escape');
  await control(page, 'Imprimir').click();
  await control(page, 'Livro inteiro').click();
  await expect(page.locator('.print-work-copy')).toHaveCount(2);
  await page.evaluate(() => { window.print = () => {}; });
  await page.getByRole('dialog', { name: 'Imprimir' }).getByRole('button', { name: 'Imprimir', exact: true }).click();
  await page.emulateMedia({ media: 'print' });
  const sizes = await page.locator('.print-only .print-work-copy').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).fontSize));
  expect(sizes.map(Number.parseFloat)).toEqual([24, expect.closeTo(21.333, 2)]);
});

for (const [paper, starter] of [['Noite', 'Liso'], ['Céu', 'Liso'], ['Branco', 'Floresta']]) {
  test(`onion skin uses differences against ${paper} / ${starter}`, async ({ page }, info) => {
    await ready(page);
    await control(page, 'Novo').click();
    await page.getByRole('dialog', { name: 'Novo trabalho' }).getByRole('button', { name: paper, exact: true }).click();
    await control(page, starter).click();
    await control(page, 'Começar').click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await control(page, 'Amarelo').click();
    await control(page, 'Máximo').click();
    await tap(page, 400, 380);
    await control(page, 'Adicionar página').click();
    await expect(control(page, 'Página 2')).toHaveAttribute('aria-pressed', 'true');
    const before = await page.locator('.sheet').screenshot();
    await control(page, 'Papel vegetal').click();
    const alpha = (x: number, y: number) => page.evaluate(({ x, y }) => window.__garatuja!.app.surface.onion.getImageData(x, y, 1, 1).data[3], { x, y });
    await expect.poll(() => alpha(400, 380)).toBeGreaterThan(60);
    expect(await alpha(800, 600)).toBe(0);
    expect(await alpha(1300, 950)).toBe(0);
    const after = await page.locator('.sheet').screenshot();
    expect(after.equals(before)).toBe(false);
    if (paper === 'Noite') await capture(page, info, 'papel-vegetal-noite');
  });
}

test('mixes two primary paints, counts drops, adds white and retains the last six named colors', async ({ page }, info) => {
  await ready(page);
  await control(page, 'Misturar cor').click();
  const paints = page.getByRole('toolbar', { name: 'Junta tintas' });
  await expect(page.locator('input[type=color]')).toHaveCount(0);
  const red = paints.getByRole('button', { name: /Vermelho, gotas/ });
  await red.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  const puddle = page.locator('.mix-puddle');
  await expect(puddle).toHaveText('Laranja');
  await red.click();
  await expect(red).toHaveAccessibleName('Vermelho, gotas: 2');
  const sample = () => puddle.evaluate(element => element.style.getPropertyValue('--mix-color'));
  const withoutWhite = await sample();
  await paints.getByRole('button', { name: /Branco, gotas/ }).click();
  const selected = await sample();
  expect(selected).not.toBe(withoutWhite);
  await capture(page, info, 'misturador');
  await control(page, 'Usar esta cor').click();
  expect(await page.evaluate(() => window.__garatuja!.app.store.get().color)).toBe(selected);
  for (let i = 0; i < 6; i++) {
    await control(page, 'Misturar cor').click();
    await page.getByRole('toolbar', { name: 'Arco-íris' }).getByRole('button').nth(i).click();
    await control(page, 'Usar esta cor').click();
  }
  await page.reload();
  await control(page, 'Misturar cor').click();
  const shelf = page.getByRole('toolbar', { name: 'As minhas cores' }).getByRole('button');
  await expect(shelf).toHaveCount(6);
  expect(await shelf.evaluateAll(items => items.map(item => item.style.getPropertyValue('--mix-color')))).not.toContain(selected);
});

test('Fill brush clips the gesture to the chosen region and Fill erase restores its original paper', async ({ page }) => {
  await ready(page);
  await control(page, 'Novo').click();
  await page.getByRole('dialog', { name: 'Novo trabalho' }).getByRole('button', { name: 'Céu', exact: true }).click();
  await control(page, 'Banda desenhada: 2 vinhetas').click();
  await control(page, 'Começar').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await control(page, 'Encher').click();
  await control(page, 'Vermelho').click();
  await control(page, 'Pincel').click();
  const a = await point(page, 380, 500);
  const b = await point(page, 1250, 500);
  const pixel = (x: number, y: number) => page.evaluate(({ x, y }) => window.__garatuja!.pixel(x, y).slice(0, 3), { x, y });
  const paper = await pixel(1250, 500);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 10 });
  await page.mouse.up();
  expect(await pixel(520, 500)).toEqual([224, 87, 72]);
  expect(await pixel(1250, 500)).toEqual(paper);
  expect(await pixel(520, 400)).toEqual(paper);
  await control(page, 'Apagar zona').click();
  await tap(page, 520, 500);
  expect(await pixel(520, 500)).toEqual(paper);
  await control(page, 'Desfazer').click();
  expect(await pixel(520, 500)).toEqual([224, 87, 72]);
});

test('disabled tools are absent from help and personal stamp advice and language has its own icon', async ({ page }) => {
  await ready(page);
  await openAdultGate(page);
  await answerAdultChallenge(page);
  const teacher = page.getByRole('dialog', { name: 'Área do professor' });
  const language = teacher.getByRole('toolbar', { name: 'Língua', exact: true });
  const pt = await language.getByRole('button', { name: 'Português' }).locator('svg').innerHTML();
  expect(await language.getByRole('button', { name: 'English' }).locator('svg').innerHTML()).toBe(pt);
  expect(await teacher.getByRole('button', { name: 'Simples', exact: true }).locator('svg').innerHTML()).not.toBe(pt);
  await teacher.getByRole('checkbox', { name: 'Mover', exact: true }).uncheck();
  await teacher.getByRole('checkbox', { name: 'Magia', exact: true }).uncheck();
  await page.keyboard.press('Escape');
  await page.keyboard.press('F1');
  await expect(page.locator('.help-card strong').filter({ hasText: /^(Mover|Magia)$/ })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await control(page, 'Carimbo').click();
  await control(page, 'Categorias').click();
  await control(page, 'Os meus carimbos').click();
  await expect(page.locator('.stamp-empty')).toContainText('Categorias');
  await expect(page.locator('.stamp-empty')).not.toContainText('Mover');
  await page.evaluate(() => {
    const app = window.__garatuja!.app;
    app.configure({ disabledTools: { move: false, stamp: true } });
  });
  await control(page, 'Mover').click();
  await expect(control(page, 'Fazer carimbo')).toHaveCount(0);
});

test('visible actions distinguish page duplication, cutout duplication and plain labels', async ({ page }) => {
  await ready(page);
  await control(page, 'Legenda').click();
  await expect(control(page, 'Só texto')).toBeVisible();
  await expect(control(page, 'Texto')).toHaveCount(1);
  await control(page, 'Mover').click();
  await control(page, 'Organizar').click();
  await expect(control(page, 'Duplicar página')).toBeVisible();
  await expect(control(page, 'Duplicar recorte')).toBeVisible();
  await expect(control(page, 'Duplicar')).toHaveCount(0);
});

test('changing language updates desk text and accessibility in place, in both directions', async ({ page }) => {
  await ready(page);
  await control(page, 'Legenda').click();
  await control(page, 'Organizar').click();
  await page.evaluate(() => window.__garatuja!.app.notify(
    { pt: 'Verifica o desenho.', en: 'Check the drawing.' },
    { label: { pt: 'Anular', en: 'Undo' }, run: () => {} }));
  const snapshot = () => page.evaluate(() =>
    [...document.querySelectorAll('#app :is(button, [aria-label], [aria-description]), .toast :is(button, [role="status"])')].map(element =>
      [element.textContent?.trim(), element.getAttribute('aria-label'), element.getAttribute('aria-description')].join('|')).join('\n'));
  const portuguese = await snapshot();
  await page.evaluate(() => window.__garatuja!.app.configure({ locale: 'en' }));
  const english = await snapshot();
  expect(english).toContain('Arrange pages');
  expect(english).toContain('Scroll through options');
  expect(english).toContain('Check the drawing.');
  expect(english).not.toContain('Verifica o desenho.');
  await expect(page.locator('.toast').getByRole('button', { name: 'Close' })).toBeVisible();
  expect(english).not.toMatch(/(?:Organizar páginas|Percorrer opções|Folha de desenho|Desfazer|Só texto)/);
  await page.evaluate(() => window.__garatuja!.app.configure({ locale: 'pt' }));
  expect(await snapshot()).toBe(portuguese);
});
