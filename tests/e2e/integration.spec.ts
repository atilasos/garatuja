import { readFile } from 'node:fs/promises';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { fillDetails } from './work-details';

const white = [255, 255, 255, 255];
const control = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const choose = (page: Page, name: string) => control(page, name).click();
const tool = (page: Page, name: string) => page.getByRole('toolbar', { name: 'Ferramentas', exact: true })
  .getByRole('button', { name, exact: true }).click();
const pixel = (page: Page, x: number, y: number) => page.evaluate(([x, y]) => window.__garatuja?.pixel(x, y), [x, y]);

async function ready(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__garatuja));
}

async function shot(page: Page, info: TestInfo, name: string) {
  const { width, height } = page.viewportSize() ?? { width: 0, height: 0 };
  const filename = `final-${name}-${width}x${height}.png`;
  await page.mouse.move(1, 1);
  await page.screenshot({ path: process.env.GARATUJA_CAPTURE_SCREENS === '1'
    ? 'docs/screens/' + filename : info.outputPath(filename) });
}

async function at(page: Page, x: number, y: number) {
  const sheet = await page.locator('.sheet').boundingBox();
  if (!sheet) throw new Error('Drawing sheet is unavailable');
  return { x: sheet.x + sheet.width * x / 1600, y: sheet.y + sheet.height * y / 1200 };
}

async function tap(page: Page, x: number, y: number) {
  const point = await at(page, x, y);
  await page.mouse.click(point.x, point.y);
}

async function drag(page: Page, x1: number, y1: number, x2: number, y2: number) {
  const start = await at(page, x1, y1);
  const end = await at(page, x2, y2);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 6 });
  await page.mouse.up();
}

async function newWork(page: Page, template: string) {
  await choose(page, 'Novo');
  await choose(page, template);
  await choose(page, 'Começar');
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

async function addLabel(page: Page, text: string, x: number, y: number, target?: [number, number]) {
  if (target) await drag(page, ...target, x, y);
  else await tap(page, x, y);
  await page.getByRole('textbox', { name: 'Escreve aqui' }).fill(text);
  await choose(page, 'Pronto');
}

async function saveFile(page: Page, action: string) {
  const event = page.waitForEvent('download');
  await choose(page, action);
  return await readFile(await (await event).path());
}

test('simple desk draws, stamps, fills, undoes and reopens both online and offline', async ({ page, context }, info) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await ready(page);
  await expect(control(page, 'Pintar')).toHaveAttribute('aria-pressed', 'true');
  expect(await pixel(page, 800, 600)).toEqual(white);
  await choose(page, 'Definições');
  await choose(page, 'Interface simples');
  await page.keyboard.press('Escape');
  await expect(control(page, 'Mover')).toHaveCount(0);

  async function draw(y: number) {
    await tool(page, 'Pintar');
    await choose(page, 'Vermelho');
    await drag(page, 150, y, 480, y + 140);
    expect(await pixel(page, 300, y + 64)).toEqual([224, 87, 72, 255]);
    await tool(page, 'Carimbo');
    await expect(control(page, 'Barco')).not.toHaveAttribute('aria-busy', 'true');
    await tap(page, 600, y);
    expect(await pixel(page, 600, y + 40)).not.toEqual(white);
    await tool(page, 'Encher');
    await choose(page, 'Céu');
    await tap(page, 60, y);
    expect(await pixel(page, 60, y)).toEqual([145, 204, 235, 255]);
    await choose(page, 'Desfazer');
    expect(await pixel(page, 60, y)).toEqual(white);
  }

  await draw(250);
  await fillDetails(page, { title: 'O barco', author: 'Lia', audience: 'A turma' });
  await shot(page, info, 'simples');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
    }
  });
  await page.close();
  const reopened = await context.newPage();
  await ready(reopened);
  await choose(reopened, 'Abrir');
  await choose(reopened, 'O barco, Lia, 1 página');
  expect(await pixel(reopened, 600, 290)).not.toEqual(white);
  await context.setOffline(true);
  await reopened.reload();
  await reopened.waitForFunction(() => Boolean(window.__garatuja));
  // Use a fresh work while offline, then return to it from the gallery.
  await newWork(reopened, 'Liso');
  await tool(reopened, 'Pintar');
  await choose(reopened, 'Azul');
  await drag(reopened, 180, 420, 550, 420);
  await tool(reopened, 'Carimbo');
  await expect(control(reopened, 'Barco')).not.toHaveAttribute('aria-busy', 'true');
  await tap(reopened, 700, 650);
  await tool(reopened, 'Encher');
  await choose(reopened, 'Amarelo');
  await tap(reopened, 70, 100);
  expect(await pixel(reopened, 70, 100)).toEqual([255, 202, 73, 255]);
  await choose(reopened, 'Desfazer');
  await fillDetails(reopened, { title: 'O barco azul', author: 'Lia', audience: 'A turma' });
  await reopened.reload();
  await choose(reopened, 'Abrir');
  await choose(reopened, 'O barco azul, Lia, 1 página');
  expect(await pixel(reopened, 360, 420)).toEqual([73, 125, 187, 255]);
  expect(await pixel(reopened, 700, 690)).not.toEqual(white);
  expect(await pixel(reopened, 70, 100)).toEqual(white);
});

test('makes a four-page story with characters, speech, reading, presentation and print', async ({ page }, info) => {
  await ready(page);
  await newWork(page, 'Céu e prado');
  await fillDetails(page, { title: 'À procura de sombra', author: 'Lia', audience: 'A turma' });
  const texts = [
    'O coelho saiu para passear no prado.', 'A raposa encontrou-o junto ao caminho.',
    'Os dois procuraram um sítio fresco.', 'Encontraram sombra e ficaram a conversar.',
  ];
  for (const [i, text] of texts.entries()) {
    if (i) await choose(page, 'Adicionar página');
    await expect(control(page, `Página ${i + 1}`)).toHaveAttribute('aria-pressed', 'true');
    await tool(page, 'Carimbo');
    if (!i) {
      await choose(page, 'Categorias');
      await choose(page, 'Animais');
    }
    const animal = i % 2 ? 'Raposa' : 'Coelho';
    await choose(page, animal);
    await expect(control(page, animal)).not.toHaveAttribute('aria-busy', 'true');
    await choose(page, 'Grande');
    await tap(page, 510 + i * 145, 810);
    await tool(page, 'Legenda');
    await choose(page, 'Balão de fala');
    await addLabel(page, ['Está calor!', 'Vamos à sombra?', 'É por aqui.', 'Que fresquinho!'][i],
      600 + i * 125, 470, [530 + i * 145, 700]);
    await choose(page, 'O meu texto');
    await page.getByRole('textbox', { name: 'O meu texto' }).fill(text);
    await page.keyboard.press('Escape');
  }
  await choose(page, 'Ler');
  await expect(page.getByRole('heading', { name: 'À procura de sombra' })).toBeVisible();
  for (const text of texts) {
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.book-copy')).toHaveText(text);
  }
  await shot(page, info, 'leitura');
  await page.keyboard.press('Escape');

  await choose(page, 'Apresentar à turma');
  await expect(page.locator('.book-position')).toHaveText('Capa');
  await page.keyboard.press('PageDown');
  await expect(page.locator('.book-position')).toHaveText('Página 1 de 4');
  await shot(page, info, 'apresentacao');
  for (let i = 0; i < 4; i++) await page.keyboard.press('PageDown');
  await choose(page, 'Gostei…');
  await page.getByRole('textbox', { name: 'Quem diz?' }).fill('Rui');
  await page.getByRole('textbox', { name: 'Comentário' }).fill('Gostei de ler a conversa da raposa.');
  await choose(page, 'Adicionar comentário');
  await expect(page.getByText('Gostei de ler a conversa da raposa.', { exact: true })).toBeVisible();
  await shot(page, info, 'comentarios');
  await page.keyboard.press('Escape');
  await page.evaluate(() => { window.print = () => {}; });
  await choose(page, 'Imprimir');
  await choose(page, 'Livro inteiro');
  await expect(page.locator('.print-work-preview .print-work-sheet')).toHaveCount(5);
  await page.getByRole('dialog').getByRole('button', { name: 'Imprimir', exact: true }).click();
  expect((await page.pdf({ preferCSSPageSize: true })).toString('latin1').match(/\/Type \/Page\b/g)).toHaveLength(5);
  await shot(page, info, 'impressao');
});

test('makes a numbered diagram on a template with a bitmap title and exports PNG', async ({ page }, info) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await ready(page);
  await newWork(page, 'Esquema com legendas');
  await fillDetails(page, { title: 'Uma planta', author: 'Inês', audience: 'O jornal' });
  await choose(page, 'Verde');
  await choose(page, 'Máximo');
  await drag(page, 800, 350, 800, 900);
  await drag(page, 800, 580, 955, 465);
  await drag(page, 800, 685, 615, 570);
  await choose(page, 'Rosa');
  await tap(page, 800, 360);
  await choose(page, 'Castanho');
  await drag(page, 800, 890, 680, 1020);
  await drag(page, 800, 890, 930, 1020);
  await tool(page, 'Texto');
  await choose(page, 'Título');
  await choose(page, 'Preto');
  await tap(page, 560, 100);
  await page.getByRole('textbox', { name: 'Escreve aqui' }).fill('Uma planta');
  await choose(page, 'Pousar');
  await tool(page, 'Legenda');
  await choose(page, 'Número');
  await addLabel(page, 'Flor', 205, 185, [765, 345]);
  await addLabel(page, 'Folha', 1200, 420, [950, 465]);
  await addLabel(page, 'Caule', 185, 650, [795, 680]);
  await addLabel(page, 'Raiz', 1200, 890, [925, 995]);
  await expect(page.locator('.label-item')).toHaveCount(4);
  await page.keyboard.press('Escape');
  await shot(page, info, 'esquema');
  await choose(page, 'Abrir');
  const image = await saveFile(page, 'Guardar página em PNG');
  expect(image.subarray(1, 4).toString()).toBe('PNG');
  expect([image.readUInt32BE(16), image.readUInt32BE(20)]).toEqual([1600, 1200]);
});

test('animates eight duplicated and moved pages at three speeds and exports GIF and WebM', async ({ page }, info) => {
  await ready(page);
  await fillDetails(page, { title: 'A bola', author: 'Rui', audience: 'A turma' });
  await choose(page, 'Laranja');
  await choose(page, 'Máximo');
  let x = 220;
  const y = 620;
  await tap(page, x, y);
  for (let i = 1; i <= 7; i++) {
    await choose(page, 'Organizar');
    await page.getByRole('button', { name: 'Duplicar', exact: true }).filter({ visible: true }).first().click();
    await expect(control(page, `Página ${i + 1}`)).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Escape');
    if (i === 1) await choose(page, 'Papel vegetal');
    await tool(page, 'Mover');
    await drag(page, x - 76, y - 76, x + 76, y + 76);
    await drag(page, x, y, x + 150, y);
    await choose(page, 'Pousar');
    x += 150;
    expect(await pixel(page, x, y)).toEqual([241, 142, 67, 255]);
  }
  await expect(page.locator('.page-ghost-previous')).toBeVisible();
  await shot(page, info, 'papel-vegetal');
  await control(page, 'Página 1').focus();
  await choose(page, 'Página 1');
  await expect(control(page, 'Página 1')).toHaveAttribute('aria-pressed', 'true');
  await tool(page, 'Legenda');
  await page.locator('.options').getByRole('button', { name: 'Texto', exact: true }).click();
  await choose(page, 'Preto');
  await addLabel(page, 'A bola', 600, 270);
  await choose(page, 'Animar');
  const animation = page.locator('.animation-screen canvas');
  await expect.poll(() => animation.evaluate(element => {
    if (!(element instanceof HTMLCanvasElement)) return false;
    const data = element.getContext('2d')?.getImageData(300, 135, 94, 42).data;
    return data?.some((channel, index) => index % 4 === 0 && channel < 120) &&
      data.some((channel, index) => index % 4 === 0 && channel > 245);
  })).toBe(true);
  await choose(page, 'Ciclo');
  for (const speed of ['Devagar', 'Normal', 'Depressa']) {
    await choose(page, speed);
    await expect(control(page, speed)).toHaveAttribute('aria-pressed', 'true');
    await choose(page, 'Reproduzir');
    await expect(control(page, 'Pausar')).toBeVisible();
    await expect(page.locator('.animation-position')).toHaveText('Quadro 8 de 8');
    await expect(control(page, 'Reproduzir')).toBeVisible();
  }
  for (let frame = 7; frame >= 1; frame--) {
    await choose(page, 'Quadro anterior');
    await expect(page.locator('.animation-position')).toHaveText(`Quadro ${frame} de 8`);
  }
  await shot(page, info, 'animacao');
  const gif = await saveFile(page, 'Guardar GIF');
  expect(gif.subarray(0, 6).toString()).toBe('GIF89a');
  const includesLabel = await page.evaluate(async encoded => {
    const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
    const image = await createImageBitmap(new Blob([bytes], { type: 'image/gif' }));
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(image, 0, 0);
    image.close();
    return ctx?.getImageData(300, 135, 94, 42).data.some((channel, index) => index % 4 === 0 && channel < 120);
  }, gif.toString('base64'));
  expect(includesLabel).toBe(true);
  expect((await saveFile(page, 'Guardar WebM')).subarray(0, 4).toString('hex')).toBe('1a45dfa3');
});
