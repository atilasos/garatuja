import { fillDetails } from './work-details';
import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

function control(page: Page, name: string) {
  return page.getByRole('button', { name, exact: true });
}

async function ready(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__garatuja));
}

async function mark(page: Page) {
  const sheet = page.getByRole('group', { name: 'Folha de desenho' });
  await sheet.click({ position: { x: 78, y: 100 } });
}

function pngSize(bytes: Buffer) {
  expect(bytes.subarray(1, 4).toString()).toBe('PNG');
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

function gifFrames(bytes: Buffer) {
  expect(bytes.subarray(0, 6).toString()).toBe('GIF89a');
  expect([bytes.readUInt16LE(6), bytes.readUInt16LE(8)]).toEqual([800, 600]);
  const paletteSize = (flags: number) => flags & 0x80 ? 3 * (1 << ((flags & 7) + 1)) : 0;
  let p = 13 + paletteSize(bytes[10]);
  let frames = 0;
  while (p < bytes.length) {
    const block = bytes[p++];
    if (block === 0x3b) return frames;
    if (block === 0x2c) {
      frames++;
      p += 9 + paletteSize(bytes[p + 8]) + 1;
    } else {
      expect(block).toBe(0x21);
      p++;
    }
    while (p < bytes.length && bytes[p]) p += bytes[p] + 1;
    p++;
  }
  throw new Error('Missing GIF trailer');
}

async function getDownload(page: Page, name: string) {
  const download = page.waitForEvent('download');
  await control(page, name).click();
  return await download;
}

test('arranges pages, preserves paper and history, records animations, and exchanges a whole work', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await ready(page);
  await fillDetails(page, { title: 'A viagem' });
  await control(page, 'O meu texto').click();
  await page.getByRole('textbox', { name: 'O meu texto' }).fill('Era uma manhã de vento.');
  await page.keyboard.press('Escape');
  const first = control(page, 'Página 1');
  const beforeThumb = await first.locator('img').getAttribute('src');
  await mark(page);
  await expect(first.locator('img')).not.toHaveAttribute('src', beforeThumb ?? '');
  await control(page, 'Adicionar página').click();
  await expect(control(page, 'Página 2')).toHaveAttribute('aria-pressed', 'true');
  await mark(page);
  await control(page, 'Adicionar página').click();
  await expect(control(page, 'Página 3')).toHaveAttribute('aria-pressed', 'true');
  await control(page, 'Organizar').click();
  await control(page, 'Duplicar').click();
  await expect(control(page, 'Página 4')).toHaveAttribute('aria-pressed', 'true');
  await control(page, 'Mover à esquerda').click();
  await expect(control(page, 'Página 3')).toHaveAttribute('aria-pressed', 'true');
  const moved = await control(page, 'Página 3').getAttribute('data-focus');
  await page.keyboard.press('Escape');
  await control(page, 'Página 3').dragTo(control(page, 'Página 2'));
  await expect(control(page, 'Página 2')).toHaveAttribute('data-focus', moved ?? '');
  await control(page, 'Organizar').click();
  await control(page, 'Apagar').click();
  await expect(page.getByRole('status').filter({ hasText: 'Página apagada.' })).toBeVisible();
  await expect(control(page, 'Página 4')).toHaveCount(0);
  await control(page, 'Anular').click();
  await expect(control(page, 'Página 2')).toHaveAttribute('data-focus', moved ?? '');
  await expect(control(page, 'Página 4')).toBeVisible();
  await control(page, 'Página 1').focus();
  await page.keyboard.press('ArrowRight');
  await expect(control(page, 'Página 2')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(control(page, 'Página 2')).toHaveAttribute('aria-pressed', 'true');
  await control(page, 'Papel vegetal').click();
  await expect(page.locator('.page-ghost-previous')).toBeVisible();
  await control(page, 'Organizar').click();
  await control(page, 'Ver seguinte').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.page-ghost-next')).toBeVisible();
  await expect(page.locator('.page-ghost-next')).toHaveCSS('border-top-style', 'dashed');
  await page.waitForFunction(() => window.__garatuja?.app.surface.onion.getImageData(0, 0, 1, 1).data[3] === 255);
  const original = await page.evaluate(() => window.__garatuja?.app.store.get().project.id);

  await control(page, 'Animar').click();
  await control(page, 'Devagar').click();
  await control(page, 'Ciclo').click();
  await control(page, 'Reproduzir').click();
  await expect(page.getByText('Quadro 4 de 4')).toBeVisible();
  await expect(control(page, 'Reproduzir')).toBeVisible();
  await control(page, 'Quadro anterior').click();
  await expect(page.getByText('Quadro 3 de 4')).toBeVisible();
  const gif = await getDownload(page, 'Guardar GIF');
  expect(gif.suggestedFilename()).toBe('A viagem.gif');
  const gifPath = testInfo.outputPath('animation.gif');
  await gif.saveAs(gifPath);
  expect(gifFrames(await readFile(gifPath))).toBe(4);
  const webm = await getDownload(page, 'Guardar WebM');
  expect(webm.suggestedFilename()).toBe('A viagem.webm');
  const videoPath = testInfo.outputPath('animation.webm');
  await webm.saveAs(videoPath);
  const video = await readFile(videoPath);
  expect(video.subarray(0, 4).toString('hex')).toBe('1a45dfa3');
  const playback = await page.evaluate(async base64 => {
    const data = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
    const video = document.createElement('video');
    const url = URL.createObjectURL(new Blob([data], { type: 'video/webm' }));
    try {
      video.src = url;
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(video.error);
      });
      return [video.videoWidth, video.videoHeight, video.duration];
    } finally {
      URL.revokeObjectURL(url);
    }
  }, video.toString('base64'));
  expect(playback.slice(0, 2)).toEqual([800, 600]);
  expect(playback[2]).toBeGreaterThan(1);
  await page.keyboard.press('Escape');

  await control(page, 'Abrir').click();
  const png = await getDownload(page, 'Guardar página em PNG');
  const pngPath = testInfo.outputPath('page.png');
  await png.saveAs(pngPath);
  const image = await readFile(pngPath);
  expect(pngSize(image)).toEqual([1600, 1200]);
  const exportedPixel = await page.evaluate(async base64 => {
    const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
    const picture = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(picture, 0, 0);
    picture.close();
    return ctx && [...ctx.getImageData(0, 0, 1, 1).data];
  }, image.toString('base64'));
  expect(exportedPixel).toEqual([255, 255, 255, 255]);
  const archiveDownload = page.waitForEvent('download');
  await page.getByRole('listitem').filter({ hasText: 'A viagem' }).getByRole('button', { name: 'Guardar .garatuja' }).click();
  const archive = await archiveDownload;
  expect(archive.suggestedFilename()).toBe('A viagem.garatuja');
  const archivePath = testInfo.outputPath('project.garatuja');
  await archive.saveAs(archivePath);

  async function chooser() {
    const event = page.waitForEvent('filechooser');
    await control(page, 'Importar .garatuja').click();
    return await event;
  }
  await (await chooser()).setFiles({ name: 'inválido.garatuja', mimeType: 'application/json', buffer: Buffer.from('{"oops":true}') });
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('Escolhe um trabalho .garatuja válido.');
  await (await chooser()).setFiles(archivePath);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const imported = await page.evaluate(() => {
    const project = window.__garatuja?.app.store.get().project;
    return [project?.id, project?.fps, project?.pages.length];
  });
  expect(imported[0]).not.toBe(original);
  expect(imported.slice(1)).toEqual([3, 4]);
  await page.reload();
  await expect(first).toHaveAttribute('aria-pressed', 'true');
  await control(page, 'O meu texto').click();
  await expect(page.getByRole('textbox', { name: 'O meu texto' })).toHaveValue('Era uma manhã de vento.');
});

test('reads a cover and spread, navigates a presentation with the keyboard and saves qualitative comments', async ({ page }) => {
  await ready(page);
  await fillDetails(page, { title: 'O vento', author: 'Mariana', audience: 'A turma' });
  await control(page, 'O meu texto').click();
  await page.getByRole('textbox', { name: 'O meu texto' }).fill('O vento levou o meu chapéu.');
  await page.keyboard.press('Escape');
  await control(page, 'Ler').click();
  await expect(page.getByRole('heading', { name: 'O vento' })).toBeVisible();
  await expect(page.getByText('A turma', { exact: true })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('dialog').getByText('O vento levou o meu chapéu.', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');

  await control(page, 'Apresentar à turma').click();
  await expect(page.locator('.book-position')).toHaveText('Capa');
  await page.waitForFunction(() => document.fullscreenElement?.classList.contains('class-presentation'));
  await page.keyboard.press('PageDown');
  await expect(page.locator('.book-position')).toHaveText('Página 1 de 1');
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.book-position')).toHaveText('Capa');
  await page.keyboard.press('Space');
  await expect(page.getByRole('dialog').getByText('O vento levou o meu chapéu.', { exact: true })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('heading', { name: 'O que dizem os colegas' })).toBeVisible();
  await control(page, 'Pergunto…').click();
  await page.getByRole('textbox', { name: 'Quem diz?' }).fill('Rui');
  await page.getByRole('textbox', { name: 'Comentário' }).fill('Onde caiu o chapéu?');
  await control(page, 'Adicionar comentário').click();
  await expect(page.getByText('Onde caiu o chapéu?', { exact: true })).toBeVisible();
  await control(page, 'Apagar comentário').click();
  await expect(page.getByText('Onde caiu o chapéu?', { exact: true })).toHaveCount(0);
  await control(page, 'Anular').click();
  await expect(page.getByText('Onde caiu o chapéu?', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await control(page, 'Apresentar à turma').click();
  await expect(page.locator('.book-position')).toHaveText('Capa');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText('Onde caiu o chapéu?', { exact: true })).toBeVisible();
});

test('inherits a template and prints a cover and each page on separate A4 sheets', async ({ page }, testInfo) => {
  await ready(page);
  await control(page, 'Novo').click();
  await control(page, 'Linhas de caderno').click();
  await control(page, 'Começar').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const paper = await page.evaluate(() => window.__garatuja?.pixel(500, 100));
  expect(paper).not.toEqual([255, 255, 255, 255]);
  await control(page, 'Adicionar página').click();
  await expect(control(page, 'Página 2')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => window.__garatuja?.pixel(500, 100))).toEqual(paper);
  await control(page, 'O meu texto').click();
  await page.getByRole('textbox', { name: 'O meu texto' }).fill('Uma página pautada.');
  await page.keyboard.press('Escape');

  await page.evaluate(() => {
    window.print = () => {};
  });
  await control(page, 'Imprimir').click();
  await expect(page.locator('.print-work-preview')).toContainText('Uma página pautada.');
  await control(page, 'Livro inteiro').click();
  await expect(page.locator('.print-work-preview .print-work-sheet')).toHaveCount(3);
  await page.getByRole('dialog').getByRole('button', { name: 'Imprimir', exact: true }).click();
  const portrait = await page.pdf({ preferCSSPageSize: true });
  expect(portrait.toString('latin1').match(/\/Type \/Page\b/g)).toHaveLength(3);
  expect(portrait.toString('latin1')).toMatch(/\/MediaBox \[0 0 59[3-7](?:\.\d+)? 84[0-3](?:\.\d+)?\]/);
  await control(page, 'Ao baixo').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Imprimir', exact: true }).click();
  await expect(page.locator('body > .print-work-landscape')).toBeAttached();
  const pdf = await page.pdf({ preferCSSPageSize: true, path: testInfo.outputPath('book.pdf') });
  const structure = pdf.toString('latin1');
  expect(structure.match(/\/Type \/Page\b/g)).toHaveLength(3);
  expect(structure).toMatch(/\/MediaBox \[0 0 84[0-3](?:\.\d+)? 59[3-7](?:\.\d+)?\]/);
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.__garatuja?.app.configure({ allowPrint: false }));
  await expect(control(page, 'Imprimir')).toHaveCount(0);
});

test('«Ver seguinte» becomes available again when onion skin is switched on while the paper is busy', async ({ page }) => {
  await ready(page);
  await control(page, 'Adicionar página').click();
  await expect(control(page, 'Página 2')).toHaveAttribute('aria-pressed', 'true');
  await control(page, 'Página 1').click();
  await expect(control(page, 'Página 1')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(() => window.__garatuja?.app.store.get().busy)).toBe(false);
  await page.evaluate(() => window.__garatuja?.app.store.set({ busy: true }));
  // A tap that lands while the next page is still loading.
  await control(page, 'Papel vegetal').dispatchEvent('click');
  await expect(control(page, 'Papel vegetal')).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => window.__garatuja?.app.store.set({ busy: false }));
  await control(page, 'Organizar').click();
  await expect(control(page, 'Ver seguinte')).toBeEnabled();
});
