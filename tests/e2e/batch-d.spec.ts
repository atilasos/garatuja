import { expect, test, type Page } from '@playwright/test';

const white = [255, 255, 255, 255];
const black = [41, 42, 51, 255];

function control(page: Page, name: string) {
  return page.getByRole('button', { name, exact: true });
}

async function ready(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__garatuja));
}

function pixel(page: Page, x: number, y: number) {
  return page.evaluate(([x, y]) => window.__garatuja?.pixel(x, y), [x, y]);
}

async function position(page: Page, x: number, y: number) {
  const box = await page.getByRole('group', { name: 'Folha de desenho' }).boundingBox();
  if (!box) throw new Error('Missing drawing sheet');
  return { x: box.x + box.width * x / 1600, y: box.y + box.height * y / 1200 };
}

async function tap(page: Page, x: number, y: number) {
  const p = await position(page, x, y);
  await page.mouse.click(p.x, p.y);
}

async function drag(page: Page, from: readonly [number, number], ...points: [number, number][]) {
  const p = await position(page, ...from);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  for (const point of points) {
    const next = await position(page, ...point);
    await page.mouse.move(next.x, next.y, { steps: 8 });
  }
  await page.mouse.up();
}

async function category(page: Page, name: string) {
  await control(page, 'Categorias').click();
  const list = page.getByRole('toolbar', { name: 'Categorias', exact: true });
  await expect(list.getByRole('button').first()).toHaveAccessibleName('Os meus carimbos');
  await list.getByRole('button', { name, exact: true }).click();
}

async function waitForThumbnail(page: Page, name: string) {
  await expect.poll(() => control(page, name).locator('canvas').evaluate(canvas => canvas instanceof HTMLCanvasElement &&
    canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height).data.some((value, index) => index % 4 === 3 && value > 0))).toBe(true);
}

test('stamps twice, with color, size, mirror, flip and stepped or free rotation', async ({ page }) => {
  await ready(page);
  await control(page, 'Carimbo').click();
  await category(page, 'Setas e símbolos');
  await control(page, 'Seta para a direita').click();
  await waitForThumbnail(page, 'Seta para a direita');
  await tap(page, 350, 400);
  await tap(page, 350, 700);
  expect(await pixel(page, 350, 400)).toEqual(black);
  expect(await pixel(page, 350, 700)).toEqual(black);
  expect(await pixel(page, 400, 377)).toEqual(black);
  expect(await pixel(page, 300, 377)).toEqual(white);

  await control(page, 'Espelhar').click();
  await control(page, 'Máximo').click();
  await control(page, 'Azul').click();
  await tap(page, 800, 400);
  const blue = [73, 125, 187, 255];
  expect(await pixel(page, 690, 345)).toEqual(blue);
  expect(await pixel(page, 910, 345)).toEqual(white);
  expect(await pixel(page, 940, 400)).toEqual(blue);

  await control(page, 'Espelhar').click();
  for (let step = 0; step < 6; step++) await control(page, 'Rodar à direita').click();
  await expect(page.locator('.stamp-angle-value')).toHaveText('90°');
  await tap(page, 1220, 400);
  expect(await pixel(page, 1275, 510)).toEqual(blue);
  expect(await pixel(page, 1275, 290)).toEqual(white);
  await control(page, 'Rodar à esquerda').click({ modifiers: ['Shift'] });
  await expect(page.getByRole('slider', { name: 'Rotação livre' })).toHaveValue('89');
  await page.getByRole('slider', { name: 'Rotação livre' }).fill('270');
  await expect(page.locator('.stamp-angle-value')).toHaveText('270°');
  await page.getByRole('slider', { name: 'Rotação livre' }).fill('0');
  await control(page, 'Visto').click();
  await waitForThumbnail(page, 'Visto');
  await control(page, 'Virar').click();
  await expect(control(page, 'Virar')).toHaveAttribute('aria-pressed', 'true');
  await tap(page, 1220, 900);
  expect(await pixel(page, 1324, 788)).toEqual(white);
  expect(await pixel(page, 1324, 1012)).toEqual(blue);
});

test('moves and duplicates a rectangular cutout with one undo, and Escape restores the paper', async ({ page }) => {
  await ready(page);
  await drag(page, [330, 375], [460, 375]);
  await control(page, 'Mover').click();
  await drag(page, [220, 260], [560, 490]);
  await expect(control(page, 'Pousar')).toBeEnabled();
  expect(await pixel(page, 370, 375)).toEqual(white);
  await page.keyboard.press('Escape');
  expect(await pixel(page, 370, 375)).toEqual(black);
  await expect(control(page, 'Pousar')).toBeDisabled();

  await drag(page, [220, 260], [560, 490]);
  await drag(page, [390, 375], [790, 575]);
  await control(page, 'Duplicar').click();
  await tap(page, 1470, 1020);
  await expect(control(page, 'Pousar')).toBeDisabled();
  expect(await pixel(page, 370, 375)).toEqual(white);
  expect(await pixel(page, 770, 575)).toEqual(black);
  await control(page, 'Desfazer').click();
  expect(await pixel(page, 370, 375)).toEqual(black);
  expect(await pixel(page, 770, 575)).toEqual(white);
  await control(page, 'Refazer').click();
  expect(await pixel(page, 770, 575)).toEqual(black);
});

test('clips a freehand lasso to its shape and keeps the cutout as a personal stamp after reload', async ({ page }) => {
  await ready(page);
  await tap(page, 350, 360);
  await tap(page, 630, 555);
  await tap(page, 585, 320);
  await control(page, 'Mover').click();
  await control(page, 'Laço').click();
  await drag(page, [215, 220], [680, 220], [390, 625], [215, 220]);
  expect(await pixel(page, 350, 360)).toEqual(white);
  expect(await pixel(page, 585, 320)).toEqual(white);
  expect(await pixel(page, 630, 555)).toEqual(black);
  await control(page, 'Fazer carimbo').click();
  await expect(page.getByRole('status').filter({ hasText: 'Guardado em Os meus carimbos' })).toBeVisible();
  await page.keyboard.press('Escape');
  await control(page, 'Carimbo').click();
  await category(page, 'Os meus carimbos');
  await waitForThumbnail(page, 'Carimbo 1');
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__garatuja));
  await waitForThumbnail(page, 'Carimbo 1');

  await control(page, 'Carimbo 1').click();
  await control(page, 'Máximo').click();
  await control(page, 'Vermelho').click();
  await control(page, 'Encher').click();
  await tap(page, 1100, 810);
  await control(page, 'Carimbo').click();
  await tap(page, 1100, 810);
  expect(await pixel(page, 1100, 810)).toEqual([224, 87, 72, 255]);
  expect(await page.evaluate(() => {
    const pixels = window.__garatuja?.app.surface.ctx.getImageData(875, 735, 450, 150).data;
    return pixels?.some((value, i) => i % 4 === 0 && value === 41 && pixels[i + 1] === 42 && pixels[i + 2] === 51);
  })).toBe(true);
  await control(page, 'Apagar carimbo').click();
  await expect(control(page, 'Carimbo 1')).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: 'Carimbo apagado.' })).toBeVisible();
  await control(page, 'Anular').click();
  await waitForThumbnail(page, 'Carimbo 1');
});

test('captures the stamp selector and an illustration with a floating cutout', async ({ page }, testInfo) => {
  await ready(page);
  await control(page, 'Carimbo').click();
  await control(page, 'Categorias').click();
  await expect(page.getByRole('toolbar', { name: 'Categorias', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('batch-d-categorias.png'), animations: 'disabled' });
  await control(page, 'Animais').click();
  await waitForThumbnail(page, 'Cão');
  await waitForThumbnail(page, 'Gato');
  await page.screenshot({ path: testInfo.outputPath('batch-d-animais.png'), animations: 'disabled' });
  await control(page, 'Grande').click();
  await tap(page, 620, 660);

  await category(page, 'Tempo e céu');
  await waitForThumbnail(page, 'Sol');
  await waitForThumbnail(page, 'Nuvem');
  await page.screenshot({ path: testInfo.outputPath('batch-d-tempo.png'), animations: 'disabled' });
  await control(page, 'Sol').click();
  await tap(page, 1270, 260);
  await category(page, 'Plantas e natureza');
  await control(page, 'Árvore').click();
  await waitForThumbnail(page, 'Árvore');
  await control(page, 'Máximo').click();
  await tap(page, 1080, 650);
  await control(page, 'Mover').click();
  await drag(page, [430, 460], [800, 840]);
  await drag(page, [615, 650], [520, 785]);
  await expect(control(page, 'Pousar')).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath('batch-d-recorte.png'), animations: 'disabled' });
});

test('resizes and rotates a floating selection using touch handles', async ({ page, context }) => {
  await ready(page);
  await tap(page, 390, 430);
  await control(page, 'Mover').click();
  const sheet = page.getByRole('group', { name: 'Folha de desenho' });
  const box = await sheet.boundingBox();
  if (!box) throw new Error('Missing sheet');
  const unit = 1600 / box.width;
  const cdp = await context.newCDPSession(page);
  async function touchDrag(from: readonly [number, number], to: readonly [number, number]) {
    const start = await position(page, ...from);
    const end = await position(page, ...to);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
    for (let step = 1; step <= 8; step++) {
      const x = start.x + (end.x - start.x) * step / 8;
      const y = start.y + (end.y - start.y) * step / 8;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }

  await touchDrag([300, 300], [640, 600]);
  expect(await pixel(page, 390, 430)).toEqual(white);
  const farX = 170 + 24 * unit;
  const farY = 150 + 24 * unit;
  await touchDrag([470 + farX, 450 + farY], [470 + 1.5 * farX, 450 + 1.5 * farY]);
  const turnX = 1.5 * 170 + 24 * unit;
  const turnY = 1.5 * 150 + 24 * unit;
  await touchDrag([470 + turnX, 450 - turnY], [470 + turnY, 450 + turnX]);
  await control(page, 'Pousar').click();
  expect(await pixel(page, 500, 330)).toEqual(black);
  expect(await pixel(page, 390, 430)).toEqual(white);
});

test('opens the credits and expands the bundled license texts', async ({ page }) => {
  await ready(page);
  await control(page, 'Definições').click();
  await control(page, 'Créditos').click();
  const credits = page.getByRole('dialog', { name: 'Créditos' });
  await expect(credits.getByRole('heading', { name: 'Noto Emoji' })).toBeVisible();
  await credits.getByText('Apache License 2.0', { exact: true }).click();
  await expect(credits.locator('pre').first()).toContainText('Copyright 2013 Google');
  for (const name of ['Andika', 'Playwrite PT', 'Fredoka', 'Courier Prime', 'gifenc']) {
    const entry = credits.locator('section').filter({ has: page.getByRole('heading', { name, exact: true }) });
    await expect(entry.getByRole('heading')).toBeVisible();
    await entry.locator('summary').click();
    await expect(entry.locator('pre')).toBeVisible();
    await expect(entry.locator('summary')).toHaveText(name === 'gifenc' ? 'MIT' : 'SIL Open Font License 1.1');
  }
});

test('opens a category for the first time offline', async ({ page, context }) => {
  await ready(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
    }
  });
  await context.setOffline(true);
  await control(page, 'Carimbo').click();
  await category(page, 'Ciência e espaço');
  await control(page, 'Saturno').click();
  await waitForThumbnail(page, 'Saturno');
  await tap(page, 800, 600);
  expect(await pixel(page, 800, 600)).not.toEqual(white);
});

test('upgrades the original database while retaining workspace records', async ({ page }) => {
  await page.goto('/pingo.svg');
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('garatuja', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('projects', { keyPath: 'id' });
      request.result.createObjectStore('workspace').put('v1', 'test-marker');
    };
    request.onsuccess = () => { request.result.close(); resolve(); };
    request.onerror = () => reject(request.error);
  }));
  await ready(page);
  const workspaceMarker = await page.evaluate(() => new Promise<unknown>((resolve, reject) => {
    const request = indexedDB.open('garatuja', 2);
    request.onsuccess = () => {
      const db = request.result;
      const record = db.transaction(['workspace', 'stamps']).objectStore('workspace').get('test-marker');
      record.onsuccess = () => { db.close(); resolve(record.result); };
      record.onerror = () => { db.close(); reject(record.error); };
    };
    request.onerror = () => reject(request.error);
  }));
  expect(workspaceMarker).toBe('v1');
});
