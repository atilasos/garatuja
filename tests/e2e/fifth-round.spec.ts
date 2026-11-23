import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { deserializeWorks } from '../../src/features/exchange/format';

const control = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
async function ready(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__garatuja));
  await page.evaluate(() => document.fonts.ready);
}

async function tap(page: Page, x: number, y: number) {
  const box = await page.locator('.sheet').boundingBox();
  if (!box) throw new Error('Missing paper');
  await page.mouse.click(box.x + x * box.width, box.y + y * box.height);
}

async function drag(page: Page, from: [number, number], to: [number, number]) {
  const box = await page.locator('.sheet').boundingBox();
  if (!box) throw new Error('Missing paper');
  await page.mouse.move(box.x + box.width * from[0], box.y + box.height * from[1]);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * to[0], box.y + box.height * to[1], { steps: 8 });
  await page.mouse.up();
}

async function file(page: Page, click: () => Promise<void>) {
  const downloading = page.waitForEvent('download');
  await click();
  const path = await (await downloading).path();
  if (!path) throw new Error('Missing download');
  return readFile(path);
}

test('authored case survives reading, presentation, slides, thumbnails, print and exports', async ({ page }, info) => {
  await ready(page);
  const title = 'A viagem da Lia';
  const story = 'A Lia chegou ao Funchal.';
  await page.evaluate(({ title, story }) => {
    const { app } = window.__garatuja!;
    window.print = () => {};
    app.documents.editProject({ title, author: 'Rui e Lia' });
    app.documents.editText(story);
  }, { title, story });
  await control(page, 'Texto').click();
  await tap(page, .12, .25);
  await page.locator('.label-field').fill('Lia');
  await control(page, 'Pousar').click();
  await control(page, 'Legenda').click();
  await control(page, 'Só texto').click();
  await tap(page, .3, .6);
  await page.locator('.label-field').fill('Funchal');
  await control(page, 'Pronto').click();
  await control(page, 'Adicionar página').click();
  await expect(control(page, 'Página 2')).toHaveAttribute('aria-pressed', 'true');
  await control(page, 'Página 1').click();
  await expect(control(page, 'Página 1')).toHaveAttribute('aria-pressed', 'true');
  const thumb = () => control(page, 'Página 1').locator('img').evaluate(async img =>
    [...new Uint8Array(await (await fetch((img as HTMLImageElement).src)).arrayBuffer())]);
  const before = await thumb();
  const capture = async () => {
    await control(page, 'Abrir').click();
    const gallery = page.getByRole('dialog', { name: 'Abrir trabalho' });
    const png = await file(page, () => gallery.getByRole('button', { name: 'Guardar página em PNG' }).click());
    const archive = await file(page, () => gallery.getByRole('button', { name: /\.garatuja/ }).last().click());
    await page.keyboard.press('Escape');
    await control(page, 'Animar').click();
    const gif = await file(page, () => control(page, 'Guardar GIF').click());
    await page.keyboard.press('Escape');
    return { png, gif, archive };
  };
  const normal = await capture();
  await page.evaluate(() => window.__garatuja!.app.configure({ uppercase: true }));
  await expect(page.locator('.writing-preview .button-label')).toHaveText(story);
  await expect(page.locator('.writing-preview .button-label')).toHaveCSS('text-transform', 'none');
  expect(await thumb()).toEqual(before);
  const capitals = await capture();
  for (const format of ['png', 'gif', 'archive'] as const) expect(capitals[format].equals(normal[format]), format).toBe(true);
  const [work] = await deserializeWorks(new Blob([new Uint8Array(capitals.archive)]));
  expect(work).toMatchObject({ title, author: 'Rui e Lia', pages: [{ text: story, labels: [{ text: 'Funchal' }] }, { text: '' }] });

  for (const mode of ['Ler', 'Apresentar à turma', 'Diapositivos']) {
    if (mode === 'Diapositivos') {
      await control(page, 'Abrir').click();
      await control(page, mode).click();
      await page.getByRole('button', { name: /^A viagem da Lia, Rui e Lia/ }).click();
      await control(page, 'Reproduzir seleção').click();
    } else {
      await control(page, mode).click();
      await expect(page.locator('.book-cover-details h1')).toHaveCSS('text-transform', 'none');
      await page.keyboard.press('PageDown');
    }
    const copy = page.locator('.book-copy > p');
    await expect(copy).toHaveText(story);
    await expect(copy).toHaveCSS('text-transform', 'none');
    await expect(copy).toHaveCSS('overflow-wrap', 'normal');
    await page.keyboard.press('Escape');
  }

  await control(page, 'Imprimir').click();
  const print = page.getByRole('dialog', { name: 'Imprimir' });
  await control(page, 'Livro inteiro').click();
  await expect(print.locator('.print-work-copy').first()).toContainText(story);
  await print.getByRole('button', { name: 'Imprimir', exact: true }).click();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.print-only h1')).toHaveCSS('font-size', '48px');
  await expect(page.locator('.print-only .book-author')).toHaveCSS('font-size', '26.6667px');
  await expect(page.locator('.print-only .print-work-copy').first()).toHaveCSS('text-transform', 'none');
  await page.pdf({ preferCSSPageSize: true, path: info.outputPath('capa-e-texto.pdf') });
});

test('native undo works in every writing field and desk Undo cancels sheet writing', async ({ page }) => {
  await ready(page);
  for (const caps of [false, true]) {
    await page.evaluate(uppercase => window.__garatuja!.app.configure({ uppercase }), caps);
    for (const tool of ['Texto', 'Legenda']) {
      await control(page, tool).click();
      if (tool === 'Legenda') await control(page, 'Balão de fala').click();
      await tap(page, .5, .5);
      const field = page.locator('.label-field');
      await field.pressSequentially('ola');
      await expect(field).toHaveValue(caps ? 'OLA' : 'ola');
      await field.press('Control+z');
      await expect(field).toBeVisible();
      expect((await field.inputValue()).length).toBeLessThan(3);
      await field.pressSequentially('a');
      await control(page, 'Desfazer').click();
      await expect(field).toBeHidden();
    }
  }
  await control(page, 'O meu texto').click();
  const undo = async (name: string) => {
    const field = page.getByRole('textbox', { name, exact: true });
    await field.pressSequentially('abc');
    await field.press('Control+z');
    expect((await field.inputValue()).length).toBeLessThan(3);
  };
  await undo('O meu texto');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^Dados do trabalho/ }).click();
  for (const name of ['Título', 'Autor', 'Para quem é?']) await undo(name);
  await page.keyboard.press('Escape');
  await control(page, 'Apresentar à turma').click();
  await page.keyboard.press('PageDown');
  for (const name of ['Quem diz?', 'Comentário']) await undo(name);
});

test('right-side bitmap writing shifts left and balloons keep whole words', async ({ page }) => {
  await ready(page);
  await control(page, 'Texto').click();
  await control(page, 'Grande').click();
  await tap(page, .93, .35);
  const field = page.locator('.label-field');
  const original = (await field.boundingBox())!.x;
  await field.fill('apanharam conchas extraordinárias');
  expect((await field.boundingBox())!.x).toBeLessThan(original);
  const { word, width } = await field.evaluate(node => {
    const css = getComputedStyle(node);
    const ctx = document.createElement('canvas').getContext('2d')!;
    ctx.font = [css.fontWeight, css.fontSize, css.fontFamily].join(' ');
    return { word: ctx.measureText('extraordinárias').width, width: node.clientWidth };
  });
  expect(width).toBeGreaterThanOrEqual(word - 1);
  await control(page, 'Pousar').click();

  await control(page, 'Legenda').click();
  await control(page, 'Balão de fala').click();
  await control(page, 'Grande').click();
  await tap(page, .93, .45);
  await field.fill('apanharam conchas extraordinárias');
  await control(page, 'Pronto').click();
  const [label] = await page.evaluate(() => window.__garatuja!.app.documents.snapshot().pages[0].labels);
  expect(label.text).toBe('apanharam conchas extraordinárias');
  expect(label.x).toBeLessThan(700);
});

test('light ink backs brush, line, shape, font and tintable stamp previews', async ({ page }) => {
  await ready(page);
  const preview = {
    Pintar: '[data-focus="brush:round"] canvas',
    Linhas: '[data-focus="brush:round"] canvas',
    Formas: '.options-scroll .choice-preview',
    Texto: '.options-scroll .choice-preview',
    Legenda: '.options-scroll .choice-preview',
    Carimbo: '[data-focus="stamp:cloud"] canvas',
  };
  for (const [tool, selector] of Object.entries(preview)) {
    await page.locator('.tool-deck').getByRole('button', { name: tool, exact: true }).click();
    if (tool === 'Carimbo') {
      await control(page, 'Categorias').click();
      await control(page, 'Tempo e céu').click();
    }
    const sample = page.locator(selector).first();
    for (const color of ['#ffffff', '#eeff00', '#fff18a', '#292a33']) {
      await page.evaluate(color => window.__garatuja!.app.setColor(color), color);
      await expect(sample).toHaveCSS('background-color', color === '#292a33' ? 'rgba(0, 0, 0, 0)' : 'rgb(81, 66, 54)');
    }
  }
});

test('missing voice and form errors are visible in their originating dialog', async ({ page }) => {
  await page.addInitScript(() => { speechSynthesis.getVoices = () => []; });
  await ready(page);
  await page.keyboard.press('F1');
  const help = page.getByRole('dialog', { name: 'Como se usa' });
  await help.getByRole('button', { name: 'Ouvir', exact: true }).click();
  await expect(help.locator('button[aria-label="Ouvir"] + .dialog-action-notice'))
    .toContainText('A leitura precisa de uma voz instalada neste dispositivo.');
  await page.keyboard.press('Escape');
  for (const locale of ['pt', 'en'] as const) {
    await page.evaluate(locale => window.__garatuja!.app.configure({ locale }), locale);
    const pt = locale === 'pt';
    await control(page, pt ? 'Apresentar à turma' : 'Present to the class').click();
    await page.keyboard.press('PageDown');
    const form = page.locator('.class-comment-form');
    const submit = form.getByRole('button', { name: pt ? 'Adicionar comentário' : 'Add comment' });
    await submit.click();
    await expect(form.getByRole('alert')).toHaveText(pt ? 'Escreve quem diz.' : 'Write who is speaking.');
    await expect(form.locator('input')).toBeFocused();
    await form.locator('input').fill('Lia');
    await submit.click();
    await expect(form.getByRole('alert')).toHaveText(pt ? 'Escreve o comentário.' : 'Write the comment.');
    await expect(form.locator('textarea')).toBeFocused();
    await expect(form.locator(':invalid')).toHaveCount(0);
    await page.keyboard.press('Escape');
  }
});

test('a new personal stamp is selected from a different category and Undo restores just that stamp', async ({ page, context }) => {
  await ready(page);
  await control(page, 'Carimbo').click();
  await control(page, 'Categorias').click();
  await control(page, 'Animais').click();
  await control(page, 'Pintar').click();
  await drag(page, [.36, .4], [.56, .4]);
  await control(page, 'Mover').click();
  await drag(page, [.28, .32], [.65, .5]);
  await control(page, 'Fazer carimbo').click();
  await expect(page.locator('.success-message')).toContainText('Os meus carimbos');
  await expect(control(page, 'Duplicar recorte')).not.toHaveAttribute('aria-disabled', 'true');
  await control(page, 'Carimbo').click();
  await expect(page.locator('.stamp-category-name')).toHaveText('Os meus carimbos');
  await expect(control(page, 'Carimbo 1')).toHaveAttribute('aria-pressed', 'true');
  await control(page, 'Apagar carimbo').click();
  const other = await context.newPage();
  await ready(other);
  await other.evaluate(async () => {
    const app = window.__garatuja!.app;
    const bitmap = app.documents.page.bitmap;
    await app.storage.createStamp('personal-independent', bitmap);
  });
  await page.bringToFront();
  await page.locator('.toast').getByRole('button', { name: 'Anular' }).click();
  await expect(control(page, 'Carimbo 1')).toBeVisible();
  await expect(control(page, 'Carimbo 2')).toBeVisible();
});

test('fill hints match the mode and the five brush sizes change the painted footprint', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => window.__garatuja!.app.configure({ level: 1 }));
  await control(page, 'Encher').click();
  await expect(page.locator('.hint')).toHaveText('Toca numa zona para a encher.');
  await expect(control(page, 'Degradé reto')).toHaveCount(0);
  await control(page, 'Pincel').click();
  await expect(page.locator('.hint')).toContainText('sem sair da zona');
  await expect(page.locator('.size-choice')).toHaveCount(5);
  await control(page, 'Mínimo').click();
  await tap(page, .5, .5);
  const pixel = () => page.evaluate(() => window.__garatuja!.pixel(840, 600));
  expect(await pixel()).toEqual([255, 255, 255, 255]);
  await control(page, 'Desfazer').click();
  await control(page, 'Máximo').click();
  await tap(page, .5, .5);
  expect(await pixel()).toEqual([41, 42, 51, 255]);
  await page.evaluate(() => window.__garatuja!.app.configure({ level: 2 }));
  await control(page, 'Degradé reto').click();
  await expect(page.locator('.hint')).toContainText('orientar o degradé');
});

test('brush spacing changes mark density in Paint and Lines and is hidden in simple mode', async ({ page }) => {
  await ready(page);
  for (const tool of ['Pintar', 'Linhas']) {
    await control(page, tool).click();
    await control(page, 'Pegadas').click();
    const ink: number[] = [];
    for (const gap of ['Junto', 'Normal', 'Afastado']) {
      await control(page, 'Espaçamento: ' + gap).click();
      await drag(page, [.2, .5], [.8, .5]);
      ink.push(await page.evaluate(() => {
        const data = window.__garatuja!.app.surface.ctx.getImageData(280, 500, 1050, 200).data;
        let painted = 0;
        for (let i = 0; i < data.length; i += 4) if (data[i] < 120) painted++;
        return painted;
      }));
      await control(page, 'Desfazer').click();
    }
    expect(ink[0]).toBeGreaterThan(ink[1]);
    expect(ink[1]).toBeGreaterThan(ink[2]);
  }
  await page.evaluate(() => window.__garatuja!.app.configure({ level: 1 }));
  await expect(page.getByRole('toolbar', { name: 'Espaçamento' })).toHaveCount(0);
});
