import { expect, test, type Page } from '@playwright/test';

const white = [255, 255, 255, 255];
const black = [41, 42, 51, 255];
const red = [224, 87, 72, 255];

async function ready(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Pintar', exact: true })).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__garatuja));
}

function read(page: Page, x: number, y: number) {
  return page.evaluate(([x, y]) => window.__garatuja?.pixel(x, y), [x, y]);
}

async function paperLocation(page: Page, x: number, y: number) {
  const box = await page.getByRole('group', { name: 'Folha de desenho' }).boundingBox();
  if (!box) throw new Error('Missing sheet');
  return { x: box.x + box.width * x / 1600, y: box.y + box.height * y / 1200 };
}

async function tap(page: Page, x: number, y: number) {
  const point = await paperLocation(page, x, y);
  await page.mouse.click(point.x, point.y);
}

async function stroke(page: Page, x1: number, y1: number, x2: number, y2: number) {
  const from = await paperLocation(page, x1, y1);
  const to = await paperLocation(page, x2, y2);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
}

function choose(page: Page, name: string) {
  return page.getByRole('button', { name, exact: true }).click();
}

async function waitForBoat(page: Page) {
  await page.waitForFunction(() => {
    const canvas = document.querySelector('button[aria-label="Barco"] canvas');
    return canvas instanceof HTMLCanvasElement && canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height).data.some(value => value > 0);
  });
}

test('paints, changes color, undoes and redoes, fills, and reloads immediately', async ({ page }) => {
  await ready(page);
  await expect(page.getByRole('button', { name: 'Som desligado' })).toHaveAttribute('aria-pressed', 'false');
  await stroke(page, 300, 350, 1000, 350);
  expect(await read(page, 550, 350)).toEqual(black);
  await choose(page, 'Vermelho');
  await stroke(page, 300, 550, 1000, 550);
  expect(await read(page, 550, 550)).toEqual(red);
  await choose(page, 'Desfazer');
  expect(await read(page, 550, 550)).toEqual(white);
  expect(await read(page, 550, 350)).toEqual(black);
  await choose(page, 'Refazer');
  expect(await read(page, 550, 550)).toEqual(red);
  await choose(page, 'Azul');
  await choose(page, 'Encher');
  await tap(page, 150, 150);
  expect(await read(page, 150, 150)).toEqual([73, 125, 187, 255]);
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__garatuja));
  expect(await read(page, 150, 150)).toEqual([73, 125, 187, 255]);
  expect(await read(page, 550, 550)).toEqual(red);
  await expect(page.getByRole('button', { name: 'Encher' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Azul' })).toHaveAttribute('aria-pressed', 'true');
});

test('lines, shapes, eraser, magic and stamp alter the bitmap through their hosts', async ({ page }) => {
  await ready(page);
  await choose(page, 'Quadrado');
  await choose(page, 'Linhas');
  await expect(page.getByRole('button', { name: 'Quadrado', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await stroke(page, 250, 300, 700, 300);
  expect(await read(page, 500, 300)).toEqual(black);
  await choose(page, 'Borracha');
  await tap(page, 500, 300);
  expect(await read(page, 500, 300)).toEqual(white);
  await choose(page, 'Formas');
  await stroke(page, 750, 250, 1050, 500);
  expect(await read(page, 880, 360)).toEqual(black);
  await choose(page, 'Magia');
  await stroke(page, 250, 650, 600, 650);
  expect(await read(page, 400, 650)).not.toEqual(white);
  await choose(page, 'Desfocar');
  await stroke(page, 780, 250, 1000, 250);
  const blurred = await read(page, 900, 244);
  expect(blurred).not.toEqual(white);
  await choose(page, 'Negativo');
  await tap(page, 100, 90);
  expect(await read(page, 1500, 1100)).toEqual([0, 0, 0, 255]);
  await choose(page, 'Carimbo');
  await waitForBoat(page);
  const before = await read(page, 1100, 840);
  await tap(page, 1100, 800);
  expect(await read(page, 1100, 840)).not.toEqual(before);
});

test('switches pages and work, keeping original paper and author text', async ({ page }) => {
  await ready(page);
  await page.getByRole('textbox', { name: 'Título' }).fill('Um passeio');
  await page.getByRole('textbox', { name: 'Autor' }).fill('Lia');
  await choose(page, 'O meu texto');
  await page.getByRole('textbox', { name: 'Para quem é?' }).fill('A turma');
  await page.getByRole('textbox', { name: 'O meu texto' }).fill('Fomos ao jardim.');
  await page.keyboard.press('Escape');
  await tap(page, 480, 400);
  await choose(page, 'Adicionar página');
  await expect(page.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-pressed', 'true');
  expect(await read(page, 480, 400)).toEqual(white);
  await choose(page, 'Página 1');
  await choose(page, 'Desfazer');
  expect(await read(page, 480, 400)).toEqual(white);
  await choose(page, 'Refazer');
  expect(await read(page, 480, 400)).toEqual(black);
  await choose(page, 'Página 2');
  await expect(page.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-pressed', 'true');
  await choose(page, 'Página 1');
  await expect(page.getByRole('button', { name: 'Página 1' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Desfazer' })).toBeDisabled();
  expect(await read(page, 480, 400)).toEqual(black);
  await choose(page, 'Novo');
  await page.getByRole('combobox', { name: 'Modelo' }).selectOption('notebook');
  await choose(page, 'Criar trabalho');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await read(page, 500, 100)).not.toEqual(white);
  await choose(page, 'Abrir');
  await choose(page, 'Um passeio Lia');
  await expect(page.getByRole('textbox', { name: 'Autor' })).toHaveValue('Lia');
  await choose(page, 'O meu texto');
  await expect(page.getByRole('textbox', { name: 'O meu texto' })).toHaveValue('Fomos ao jardim.');
});

test('rolls back when a second finger touches the surface and supports fixed click', async ({ page, context }) => {
  await ready(page);
  const first = await paperLocation(page, 400, 430);
  const second = await paperLocation(page, 700, 610);
  const cdp = await context.newCDPSession(page);
  const firstTouch = { ...first, id: 1 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [firstTouch] });
  expect(await read(page, 400, 430)).toEqual(black);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [firstTouch, { ...second, id: 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect(await read(page, 400, 430)).toEqual(white);
  await expect(page.getByRole('button', { name: 'Desfazer' })).toBeDisabled();

  await choose(page, 'Definições');
  await page.getByRole('checkbox', { name: 'Clique fixo' }).check();
  await page.keyboard.press('Escape');
  await tap(page, 400, 430);
  await page.mouse.move(second.x, second.y, { steps: 7 });
  await expect(page.getByRole('button', { name: 'Desfazer' })).toBeDisabled();
  await tap(page, 700, 610);
  await expect(page.getByRole('button', { name: 'Desfazer' })).toBeEnabled();
  expect(await read(page, 550, 520)).toEqual(black);
});

test('uses no external requests and reopens offline', async ({ page, context, baseURL }) => {
  const external: string[] = [];
  const origin = new URL(baseURL ?? '').origin;
  context.on('request', request => {
    const url = new URL(request.url());
    if (['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) && url.origin !== origin) external.push(request.url());
  });
  page.on('websocket', socket => external.push(socket.url()));
  await ready(page);
  await choose(page, 'Carimbo');
  await waitForBoat(page);
  await stroke(page, 400, 430, 700, 610);
  const savedStamp = await read(page, 700, 650);
  expect(savedStamp).not.toEqual(white);
  await choose(page, 'Guardar');
  await expect(page.getByRole('status')).toContainText('guardado');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
    }
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Pintar', exact: true })).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__garatuja));
  expect(await read(page, 700, 650)).toEqual(savedStamp);
  await choose(page, 'Pintar');
  await tap(page, 400, 430);
  expect(await read(page, 400, 430)).toEqual(black);
  expect(external).toEqual([]);
});

test('supports keyboard drawing and keeps focus inside a dialog', async ({ page }) => {
  await ready(page);
  const sheet = page.getByRole('group', { name: 'Folha de desenho' });
  await sheet.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  expect(await read(page, 825, 600)).toEqual(black);
  const settings = page.getByRole('button', { name: 'Definições' });
  await settings.click();
  const close = page.getByRole('button', { name: 'Fechar', exact: true });
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('combobox', { name: 'Língua' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(settings).toBeFocused();
});

test.describe('high-density display', () => {
  test.use({ deviceScaleFactor: 2 });

  test('maps pen coordinates at DPR 2 and responds to pen pressure', async ({ page, context }) => {
    await ready(page);
    const cdp = await context.newCDPSession(page);
    const pen = async (x: number, force: number) => {
      const position = await paperLocation(page, x, 390);
      const event = { ...position, pointerType: 'pen' as const, button: 'left' as const, clickCount: 1 };
      await cdp.send('Input.dispatchMouseEvent', { ...event, type: 'mousePressed', buttons: 1, force });
      await cdp.send('Input.dispatchMouseEvent', { ...event, type: 'mouseReleased', buttons: 0 });
    };
    await pen(450, .2);
    await pen(650, .9);
    expect(await read(page, 450, 390)).toEqual(black);
    expect(await read(page, 450, 407)).toEqual(white);
    expect(await read(page, 650, 407)).toEqual(black);
  });
});
