import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

const white = [255, 255, 255, 255];
const black = [41, 42, 51, 255];

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

async function waitForThumbs(page: Page) {
  await page.waitForFunction(() => {
    const canvases = [...document.querySelectorAll<HTMLCanvasElement>('.choice-preview')];
    return canvases.length >= 40 && canvases.every(canvas => canvas.dataset.magicReady === '1');
  }, undefined, { timeout: 30_000 });
}

test('magic selector groups effects, previews them, and undoes a whole page', async ({ page }) => {
  await ready(page);
  await choose(page, 'Formas');
  await stroke(page, 100, 300, 400, 520);
  expect(await read(page, 200, 420)).toEqual(black);
  expect(await read(page, 1400, 420)).toEqual(white);

  await choose(page, 'Magia');
  await expect(page.locator('h4.choice-group')).toHaveText(['Pintar', 'Cor', 'Distorcer', 'Página inteira']);
  for (const name of ['Mínimo', 'Pequeno', 'Médio', 'Grande', 'Máximo']) {
    await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  }
  await expect(page.getByRole('button', { name: 'Página inteira', exact: true })).toBeHidden();
  await waitForThumbs(page);

  await choose(page, 'Clarear');
  await expect(page.locator('#pingo-hint')).toHaveText('Arrasta para tornar as cores mais claras.');
  await expect(page.getByRole('button', { name: 'Página inteira', exact: true })).toBeVisible();
  await choose(page, 'Desfocar');
  await expect(page.getByRole('button', { name: 'Página inteira', exact: true })).toBeHidden();

  await choose(page, 'Espelho');
  await tap(page, 80, 80);
  expect(await read(page, 1400, 420)).toEqual(black);
  await choose(page, 'Desfazer');
  expect(await read(page, 1400, 420)).toEqual(white);
  expect(await read(page, 200, 420)).toEqual(black);

  await choose(page, 'Clarear');
  await choose(page, 'Página inteira');
  const before = await read(page, 200, 420);
  await tap(page, 80, 80);
  const lightened = await read(page, 200, 420);
  expect(lightened).not.toEqual(before);
  expect(lightened?.[0]).toBeGreaterThan(before?.[0] ?? 0);
  await choose(page, 'Desfazer');
  expect(await read(page, 200, 420)).toEqual(black);
  expect(await read(page, 1400, 420)).toEqual(white);
});

test('writes a contact sheet of every magic thumbnail', async ({ page }) => {
  test.setTimeout(60_000);
  await ready(page);
  await choose(page, 'Azul');
  await choose(page, 'Magia');
  await waitForThumbs(page);
  const sheet = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll<HTMLElement>('.options-scroll h4.choice-group, .options-scroll button.choice')];
    const groups: { name: string; items: { label: string; thumb: HTMLCanvasElement }[] }[] = [];
    let current: { name: string; items: { label: string; thumb: HTMLCanvasElement }[] } | undefined;
    for (const node of nodes) {
      if (node.tagName === 'H4') {
        current = { name: node.textContent ?? '', items: [] };
        groups.push(current);
      } else if (current) {
        const thumb = (node.querySelector('canvas') as (HTMLCanvasElement & { sourceThumb?: HTMLCanvasElement }) | null)?.sourceThumb;
        if (!thumb) throw new Error(`Missing thumbnail for ${node.getAttribute('aria-label')}`);
        const data = thumb.getContext('2d')?.getImageData(0, 0, thumb.width, thumb.height).data;
        if (!data) throw new Error('Missing thumbnail pixels');
        let min = 255 * 3;
        let max = 0;
        for (let i = 0; i < data.length; i += 4) {
          const tone = data[i] + data[i + 1] + data[i + 2];
          if (tone < min) min = tone;
          if (tone > max) max = tone;
        }
        if (max - min < 40) throw new Error(`Flat thumbnail for ${node.getAttribute('aria-label')}`);
        current.items.push({ label: node.getAttribute('aria-label') ?? '', thumb });
      }
    }
    const columns = 4;
    const thumbW = 220;
    const thumbH = 150;
    const labelH = 28;
    const gap = 12;
    const head = 36;
    const width = columns * (thumbW + gap) + gap;
    let height = gap;
    for (const group of groups) height += head + Math.ceil(group.items.length / columns) * (thumbH + labelH + gap);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Missing sheet');
    ctx.fillStyle = '#f6efe4';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#3a2e28';
    ctx.font = '16px sans-serif';
    let y = gap;
    for (const group of groups) {
      ctx.fillStyle = '#3a2e28';
      ctx.font = '700 22px sans-serif';
      ctx.fillText(group.name, gap, y + 24);
      y += head;
      ctx.font = '14px sans-serif';
      group.items.forEach((item, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const x = gap + column * (thumbW + gap);
        const top = y + row * (thumbH + labelH + gap);
        ctx.drawImage(item.thumb, x, top, thumbW, thumbH);
        ctx.strokeStyle = '#c8b8a8';
        ctx.strokeRect(x + 0.5, top + 0.5, thumbW - 1, thumbH - 1);
        ctx.fillStyle = '#3a2e28';
        ctx.fillText(item.label, x, top + thumbH + 18);
      });
      y += Math.ceil(group.items.length / columns) * (thumbH + labelH + gap);
    }
    return canvas.toDataURL('image/png');
  });
  const buffer = Buffer.from(sheet.split(',')[1] ?? '', 'base64');
  await mkdir('docs/screens', { recursive: true });
  await writeFile('docs/screens/batch-b-magic.png', buffer);
  expect(buffer.byteLength).toBeGreaterThan(10_000);
});
