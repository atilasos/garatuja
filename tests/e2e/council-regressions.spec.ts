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
      const coordinates = async () => Promise.all(['Anterior', 'Seguinte'].map(async name => (await control(page, name).boundingBox())?.y));
      let navigation: (number | undefined)[] | undefined;
      if (view === 'Diapositivos') {
        await control(page, 'Abrir').click();
        await control(page, view).click();
        await page.locator('.gallery-open').click();
        await control(page, 'Reproduzir seleção').click();
      } else {
        await control(page, view).click();
        if (count > 1) {
          await expect(page.locator('.book-position')).toHaveText('Capa');
          navigation = await coordinates();
          await control(page, 'Seguinte').click();
        }
      }
      const copy = page.locator('.book-copy');
      const next = control(page, 'Seguinte');
      const previous = control(page, 'Anterior');
      const position = page.locator('.book-position');
      const scroll = () => copy.evaluate(area => area.scrollTop);
      const end = () => copy.evaluate(area => area.scrollHeight - area.clientHeight);
      await expect(position).toHaveText(`Página 1 de ${count}`);
      if (navigation) expect(await coordinates()).toEqual(navigation);
      navigation = await coordinates();
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
        expect(await coordinates()).toEqual(navigation);
        expect(await scroll()).toBe(0);
      }
      if (view === 'Apresentar à turma') {
        await copy.evaluate(area => { area.scrollTop = area.scrollHeight; });
        await next.click();
        await expect(position).toHaveText('Comentários');
        expect(await coordinates()).toEqual(navigation);
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

test('work details undo and redo in book order alongside page marks', async ({ page }) => {
  await ready(page);
  const details = async (title: string, author?: string, audience?: string) => {
    await page.locator('.work-card').click();
    await page.getByRole('textbox', { name: 'Título' }).fill(title);
    if (author) await page.getByRole('textbox', { name: 'Autor' }).fill(author);
    if (audience) await page.getByRole('textbox', { name: 'Para quem é?' }).fill(audience);
    await control(page, 'Pronto').click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  };
  await details('A ponte');
  await control(page, 'Adicionar página').click();
  await expect(control(page, 'Página 2')).toHaveAttribute('aria-pressed', 'true');
  await details('A ribeira', 'Lia', 'A turma');
  await control(page, 'Página 1').click();
  await expect(control(page, 'Página 1')).toHaveAttribute('aria-pressed', 'true');
  await tap(page, 800, 600);
  const pixel = () => page.evaluate(() => window.__garatuja!.app.surface.ctx.getImageData(800, 600, 1, 1).data[0]);
  const work = () => page.evaluate(() => {
    const { title, author, audience } = window.__garatuja!.app.store.get().project;
    return [title, author, audience];
  });
  await control(page, 'Desfazer').click();
  expect(await pixel()).toBe(255);
  expect(await work()).toEqual(['A ribeira', 'Lia', 'A turma']);
  await control(page, 'Desfazer').click();
  expect(await work()).toEqual(['A ponte', '', '']);
  await control(page, 'Desfazer').click();
  expect(await work()).toEqual(['', '', '']);
  await control(page, 'Refazer').click();
  expect(await work()).toEqual(['A ponte', '', '']);
  await control(page, 'Refazer').click();
  expect(await work()).toEqual(['A ribeira', 'Lia', 'A turma']);
  await control(page, 'Refazer').click();
  expect(await pixel()).toBeLessThan(100);
});

test('capital letters affect only new input in page text, labels and work details', async ({ page }) => {
  await ready(page);
  await page.evaluate(async () => {
    const app = window.__garatuja!.app;
    app.documents.editText('A ponte');
    app.documents.editProject({ title: 'A ribeira', author: 'Rui' });
    await app.documents.save();
    app.chooseTool('label');
    app.setOption('type', 'text');
  });
  const field = page.locator('.label-field');
  await tap(page, 400, 400);
  await field.fill('Lago azul');
  await control(page, 'Pronto').click();
  await page.evaluate(() => window.__garatuja!.app.configure({ uppercase: true }));
  const editLabel = async () => {
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.locator('.label-item').focus();
    await page.keyboard.press('Enter');
  };
  const editDetails = () => page.locator('.work-card').click();
  const editPage = () => control(page, 'O meu texto').click();
  const text = page.getByRole('textbox', { name: 'O meu texto' });
  const title = page.getByRole('textbox', { name: 'Título' });
  const author = page.getByRole('textbox', { name: 'Autor' });
  await editPage();
  await expect(text).toHaveValue('A ponte');
  await control(page, 'Fechar').click();
  await editDetails();
  await expect(title).toHaveValue('A ribeira');
  await expect(author).toHaveValue('Rui');
  await control(page, 'Pronto').click();
  await editLabel();
  await expect(field).toHaveValue('Lago azul');
  await control(page, 'Pronto').click();
  await control(page, 'Desfazer').click();
  await expect(page.locator('.label-item')).toHaveCount(0);
  await control(page, 'Refazer').click();

  await editPage();
  await text.press('End');
  await text.press('Space');
  await text.pressSequentially('nova');
  await expect(text).toHaveValue('A ponte NOVA');
  await control(page, 'Fechar').click();
  await editDetails();
  await title.press('End');
  await title.pressSequentially(' azul');
  await author.press('Home');
  await author.pressSequentially('ó ');
  await expect(title).toHaveValue('A ribeira AZUL');
  await expect(author).toHaveValue('Ó Rui');
  await control(page, 'Pronto').click();
  await editLabel();
  await expect(field).toHaveValue('Lago azul');
  await field.evaluate(element => {
    if (!(element instanceof HTMLTextAreaElement)) throw new Error('Missing label field');
    element.setSelectionRange(0, 0);
  });
  await page.keyboard.insertText('o ');
  await expect(field).toHaveValue('O Lago azul');
  await control(page, 'Pronto').click();
  await page.evaluate(() => window.__garatuja!.app.configure({ uppercase: false }));
  await expect(page.locator('.writing-preview')).toContainText('A ponte NOVA');
  await expect(page.locator('.work-title')).toHaveText('A ribeira AZUL');
  await expect(page.locator('.work-author')).toHaveText('Ó Rui');
  await expect(page.locator('.label-item')).toHaveAttribute('aria-label', 'Só texto: O Lago azul');
});

test('an oversized balloon stays open until it fits and its outline stays inside when moved', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => {
    const app = window.__garatuja!.app;
    app.chooseTool('label');
    app.setOption('type', 'speech');
    app.setOption('size', 108);
  });
  await tap(page, 960, 400);
  const field = page.locator('.label-field');
  const warning = page.locator('.label-fit-warning');
  await field.fill('Uma\nDuas\nTrês\nQuatro\nCinco\nSeis\nSete');
  await expect(warning).toBeVisible();
  await control(page, 'Pronto').click();
  await expect(field).toBeVisible();
  await page.keyboard.press('Control+Enter');
  await expect(field).toBeVisible();
  await field.fill('Cabe aqui');
  await expect(warning).toBeHidden();
  await control(page, 'Pronto').click();
  await expect(field).toBeHidden();
  const item = page.locator('.label-item');
  const original = await item.boundingBox();
  const sheet = await page.locator('.sheet').boundingBox();
  if (!original || !sheet) throw new Error('Missing label or sheet');
  await page.mouse.move(original.x + original.width / 2, original.y + original.height / 2);
  await page.mouse.down();
  await page.mouse.move(sheet.x + sheet.width + 60, sheet.y + sheet.height + 60, { steps: 8 });
  await page.mouse.up();
  const moved = await item.boundingBox();
  if (!moved) throw new Error('Missing moved label');
  expect(moved.x).toBeGreaterThan(original.x);
  expect(moved.y).toBeGreaterThan(original.y);
  expect(moved.x + moved.width).toBeLessThan(sheet.x + sheet.width - 2);
  expect(moved.y + moved.height).toBeLessThan(sheet.y + sheet.height - 2);
});

for (const kind of ['text', 'box']) {
  test(`fixed click creates ${kind} at once and keeps move and handle gestures open`, async ({ page }) => {
    await ready(page);
    const setup = (kind: string, fixedClick: boolean) => page.evaluate(({ kind, fixedClick }) => {
      const app = window.__garatuja!.app;
      app.chooseTool('label');
      app.setOption('type', kind);
      app.configure({ fixedClick });
    }, { kind, fixedClick });
    await setup('callout', false);
    await tap(page, 400, 400);
    const field = page.locator('.label-field');
    await field.fill('Uma seta');
    await control(page, 'Pronto').click();
    await setup(kind, true);
    await tap(page, 1100, 620);
    await expect(field).toBeVisible();
    await field.fill('Novo');
    await control(page, 'Pronto').click();
    const item = page.getByRole('button', { name: /Uma seta/ });
    const original = await item.boundingBox();
    if (!original) throw new Error('Missing arrow label');
    await page.mouse.click(original.x + original.width / 2, original.y + original.height / 2);
    await page.mouse.move(original.x + original.width / 2 + 75, original.y + original.height / 2, { steps: 4 });
    await expect.poll(async () => (await item.boundingBox())?.x).toBeGreaterThan(original.x + 50);
    await page.mouse.click(original.x + original.width / 2 + 75, original.y + original.height / 2);

    const handle = page.locator('.label-handle');
    const start = await handle.boundingBox();
    if (!start) throw new Error('Missing handle');
    await page.mouse.click(start.x + start.width / 2, start.y + start.height / 2);
    await page.mouse.move(start.x + start.width / 2 + 65, start.y + start.height / 2, { steps: 4 });
    await expect.poll(async () => (await handle.boundingBox())?.x).toBeGreaterThan(start.x + 50);
    await page.mouse.click(start.x + start.width / 2 + 65, start.y + start.height / 2);
    await expect(field).toBeHidden();
  });
}

test('Pingo returns to the active tool when closing dialogs and canceling rotation', async ({ page }) => {
  await ready(page);
  const hint = page.locator('.hint');
  const toolHint = () => page.evaluate(() => window.__garatuja!.app.toolHint().pt);
  await control(page, 'Definições').click();
  await control(page, 'Fechar').click();
  await expect(hint).toHaveText(await toolHint());
  await control(page, 'Misturar cor').click();
  await page.getByRole('dialog').getByRole('button', { name: /Vermelho/ }).first().click();
  await expect(hint).not.toHaveText(await toolHint());
  await page.keyboard.press('Escape');
  await expect(hint).toHaveText(await toolHint());
  await control(page, 'Formas').click();
  await control(page, 'Rodar').click();
  const from = await point(page, 400, 400);
  const to = await point(page, 700, 750);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y);
  await page.mouse.up();
  await expect(hint).toContainText('Agora aponta');
  await page.keyboard.press('Escape');
  await expect(hint).toHaveText(await toolHint());
});

test('using a work as a template restores its first illustration with the eraser', async ({ page }) => {
  await ready(page);
  await page.evaluate(async () => {
    const app = window.__garatuja!.app;
    app.documents.editProject({ title: 'A ponte' });
    app.documents.editText('A primeira página.');
    app.setColor('#ff0000');
  });
  await tap(page, 800, 600);
  await control(page, 'Adicionar página').click();
  await expect(control(page, 'Página 2')).toHaveAttribute('aria-pressed', 'true');
  const source = await page.evaluate(() => window.__garatuja!.app.store.get().project.id);
  await control(page, 'Abrir').click();
  await page.locator(`[data-project="${source}"]`).getByRole('button', { name: 'Usar como modelo' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const state = await page.evaluate(() => {
    const { project } = window.__garatuja!.app.store.get();
    return { id: project.id, pages: project.pages.length, text: project.pages[0].text };
  });
  expect(state).toEqual({ id: expect.not.stringMatching(source), pages: 1, text: '' });
  const pixel = () => page.evaluate(() => [...window.__garatuja!.app.surface.ctx.getImageData(800, 600, 1, 1).data]);
  expect(await pixel()).toEqual([255, 0, 0, 255]);
  await control(page, 'Preto').click();
  await tap(page, 800, 600);
  expect(await pixel()).toEqual([41, 42, 51, 255]);
  await control(page, 'Borracha').click();
  await tap(page, 800, 600);
  expect(await pixel()).toEqual([255, 0, 0, 255]);
  const original = await page.evaluate(async id => (await window.__garatuja!.app.storage.get(id))?.pages.map(page => page.text), source);
  expect(original).toEqual(['A primeira página.', '']);
});

test('A4 book print keeps the footer with the final lines', async ({ page }, info) => {
  await ready(page);
  await page.evaluate(() => { window.print = () => {}; });
  for (const [lines, tall, wide] of [[1, 2, 2], [10, 2, 3], [30, 3, 3], [60, 4, 5]]) {
    await page.evaluate(lines => {
      const { documents } = window.__garatuja!.app;
      documents.editProject({ title: 'A ponte', author: 'Rui' });
      documents.editText(Array.from({ length: lines }, (_, i) => `Linha ${i + 1} junto da ponte.`).join('\n'));
    }, lines);
    await control(page, 'Imprimir').click();
    const dialog = page.getByRole('dialog', { name: 'Imprimir' });
    await control(page, 'Livro inteiro').click();
    const print = dialog.getByRole('button', { name: 'Imprimir', exact: true });
    for (const [orientation, views] of [['Ao alto', tall], ['Ao baixo', wide]] as const) {
      await control(page, orientation).click();
      await print.click();
      const pdf = await page.pdf({ preferCSSPageSize: true, path: info.outputPath(`a4-${lines}-${orientation}.pdf`) });
      const bytes = pdf.toString('latin1');
      expect.soft(bytes.match(/\/Type\s*\/Page\b/g)?.length, `${orientation}, ${lines} lines`).toBe(views);
      const a4 = orientation === 'Ao alto' ? [595, 842] : [842, 595];
      const mediaBox = bytes.match(/\/MediaBox\s*\[0 0 ([\d.]+) ([\d.]+)\]/);
      expect.soft(mediaBox?.slice(1).map(value => Math.round(Number(value)))).toEqual(a4);
    }
    await control(page, 'Fechar').click();
  }
});
