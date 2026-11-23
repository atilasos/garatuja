import { expect, test, type Locator, type Page } from '@playwright/test';
import type { LabelObject } from '../../src/core/types';

async function ready(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Pintar', exact: true })).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__garatuja));
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

async function drag(page: Page, from: [number, number], to: [number, number]) {
  const a = await paperLocation(page, ...from);
  const b = await paperLocation(page, ...to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.mouse.up();
}

function choose(page: Page, name: string) {
  return page.getByRole('button', { name, exact: true }).click();
}

/** The labels as the surface holds them (private at compile time, plain data at run time). */
function labelsOf(page: Page) {
  return page.evaluate(() => {
    const surface = window.__garatuja?.app.surface as unknown as { labelObjects: LabelObject[] };
    return structuredClone(surface.labelObjects);
  });
}

/** Count painted pixels in a rectangle of the bitmap or of the label layer. */
function ink(page: Page, layer: 'bitmap' | 'labels', x: number, y: number, w: number, h: number) {
  return page.evaluate(([layer, x, y, w, h]) => {
    const surface = window.__garatuja?.app.surface;
    if (!surface) return 0;
    const data = (layer === 'bitmap' ? surface.ctx : surface.labels).getImageData(x, y, w, h).data;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (layer === 'labels' ? data[i + 3] > 0 : data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) count++;
    }
    return count;
  }, [layer, x, y, w, h] as const);
}

async function centre(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Missing box');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function makeLabel(page: Page, type: string, at: [number, number], text: string, from?: [number, number]) {
  await choose(page, type);
  if (from) await drag(page, from, at);
  else await tap(page, ...at);
  await page.keyboard.type(text);
  await choose(page, 'Pronto');
}

test('writes text with accents, new lines and wrapping on the paper, one undo step', async ({ page }) => {
  await ready(page);
  await choose(page, 'Texto');
  await expect(page.getByRole('button', { name: 'Texto', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await tap(page, 150, 200);
  const field = page.getByRole('textbox', { name: 'Escreve aqui' });
  await expect(field).toBeFocused();
  await page.keyboard.type('Maçã, água e coração');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Ação 😀');
  await expect(field).toHaveValue('Maçã, água e coração\nAção 😀');
  expect(await ink(page, 'bitmap', 100, 100, 1400, 400)).toBe(0);
  await choose(page, 'Pousar');
  await expect(field).toBeHidden();
  const first = await ink(page, 'bitmap', 100, 120, 1400, 140);
  const second = await ink(page, 'bitmap', 100, 280, 1400, 140);
  expect(first).toBeGreaterThan(300);
  expect(second).toBeGreaterThan(100);
  await choose(page, 'Desfazer');
  expect(await ink(page, 'bitmap', 100, 100, 1400, 400)).toBe(0);
  await expect(page.getByRole('button', { name: 'Desfazer' })).toBeDisabled();
  await choose(page, 'Refazer');
  expect(await ink(page, 'bitmap', 100, 120, 1400, 140)).toBe(first);

  await choose(page, 'Máximo');
  await tap(page, 700, 800);
  await page.keyboard.type('Uma frase comprida que muda de linha aqui');
  await choose(page, 'Pousar');
  expect(await ink(page, 'bitmap', 1584, 600, 16, 600)).toBe(0);
  await expect(field).toBeHidden();
  expect(await ink(page, 'bitmap', 650, 900, 930, 300)).toBeGreaterThan(500);
});

test('lands text when tapping elsewhere or switching tool; Escape cancels', async ({ page }) => {
  await ready(page);
  await choose(page, 'Texto');
  await tap(page, 200, 200);
  await page.keyboard.type('Primeiro');
  await tap(page, 200, 600);
  expect(await ink(page, 'bitmap', 150, 120, 800, 140)).toBeGreaterThan(100);
  const field = page.getByRole('textbox', { name: 'Escreve aqui' });
  await expect(field).toBeFocused();
  await expect(field).toHaveValue('');
  await page.keyboard.type('Segundo');
  await choose(page, 'Pintar');
  await expect(field).toBeHidden();
  expect(await ink(page, 'bitmap', 150, 520, 800, 140)).toBeGreaterThan(100);
  await choose(page, 'Texto');
  await tap(page, 200, 900);
  await page.keyboard.type('Nunca fica');
  await page.keyboard.press('Escape');
  await expect(field).toBeHidden();
  expect(await ink(page, 'bitmap', 150, 820, 800, 200)).toBe(0);
});

test('changing font, size and colour while typing is applied to the text', async ({ page }) => {
  await ready(page);
  await choose(page, 'Texto');
  await tap(page, 200, 300);
  await page.keyboard.type('Olá');
  await choose(page, 'Vermelho');
  await choose(page, 'Letra manuscrita');
  await choose(page, 'Grande');
  await expect(page.getByRole('textbox', { name: 'Escreve aqui' })).toHaveValue('Olá');
  await choose(page, 'Pousar');
  const red = await page.evaluate(() => {
    const data = window.__garatuja?.app.surface.ctx.getImageData(150, 200, 600, 300).data;
    if (!data) return 0;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i] > 200 && data[i + 1] < 120 && data[i + 2] < 100) count++;
    return count;
  });
  expect(red).toBeGreaterThan(200);
});

test('the four bundled fonts load locally and each draws differently', async ({ page }) => {
  await ready(page);
  const families = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].filter(face => face.status === 'loaded').map(face => face.family.replaceAll('"', ''));
  });
  for (const family of ['Andika', 'Playwrite PT', 'Fredoka', 'Courier Prime']) expect(families).toContain(family);
  await choose(page, 'Texto');
  const counts: number[] = [];
  let y = 150;
  for (const font of ['Letra de imprensa', 'Letra manuscrita', 'Título', 'Máquina de escrever']) {
    await choose(page, font);
    await tap(page, 100, y);
    await page.keyboard.type('Ação e emoção');
    await choose(page, 'Pousar');
    counts.push(await ink(page, 'bitmap', 60, y - 70, 1400, 200));
    y += 250;
  }
  expect(new Set(counts).size).toBe(4);
  for (const count of counts) expect(count).toBeGreaterThan(300);
});

test('uppercase setting turns typed text into capitals for text, labels and page writing', async ({ page }) => {
  await ready(page);
  await choose(page, 'Definições');
  await choose(page, 'Só maiúsculas');
  await page.keyboard.press('Escape');
  await choose(page, 'Texto');
  await tap(page, 200, 200);
  await page.keyboard.type('olá, é ação');
  await expect(page.getByRole('textbox', { name: 'Escreve aqui' })).toHaveValue('OLÁ, É AÇÃO');
  await choose(page, 'Cancelar');
  await choose(page, 'Legenda');
  await makeLabel(page, 'Balão de fala', [800, 600], 'cedilha ç');
  const [label] = await labelsOf(page);
  expect(label.text).toBe('CEDILHA Ç');
  await choose(page, 'O meu texto');
  const writing = page.getByRole('textbox', { name: 'O meu texto' });
  await writing.fill('ação à manhã');
  await expect(writing).toHaveValue('AÇÃO À MANHÃ');
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => window.__garatuja?.app.documents.page.text)).toBe('AÇÃO À MANHÃ');
});

test('arrow label: create, move, rewrite, undo and redo, and survive a reload', async ({ page }) => {
  await ready(page);
  await choose(page, 'Legenda');
  await makeLabel(page, 'Legenda com seta', [800, 500], 'raiz');
  let labels = await labelsOf(page);
  expect(labels).toHaveLength(1);
  expect(labels[0]).toMatchObject({ kind: 'callout', text: 'raiz', font: 'Andika' });
  expect(labels[0].target).toBeDefined();
  expect(await ink(page, 'labels', 0, 0, 1600, 1200)).toBeGreaterThan(500);
  expect(await ink(page, 'bitmap', 0, 0, 1600, 1200)).toBe(0);
  await expect(page.getByRole('button', { name: 'Desfazer' })).toBeEnabled();

  const item = page.getByRole('button', { name: /Legenda com seta: raiz/ });
  const start = await centre(item);
  await page.keyboard.press('Escape');
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 80, start.y + 60, { steps: 6 });
  await page.mouse.up();
  const moved = (await labelsOf(page))[0];
  expect(moved.x).toBeGreaterThan(labels[0].x + 100);
  expect(moved.y).toBeGreaterThan(labels[0].y + 80);
  expect(moved.target?.x).toBeCloseTo((labels[0].target?.x ?? 0) + (moved.x - labels[0].x), 0);

  await choose(page, 'Desfazer');
  expect((await labelsOf(page))[0].x).toBe(labels[0].x);
  await choose(page, 'Refazer');
  expect((await labelsOf(page))[0].x).toBe(moved.x);

  await choose(page, 'Escrever');
  await expect(page.getByRole('textbox', { name: 'Escreve aqui' })).toHaveValue('raiz');
  await page.keyboard.type(' principal');
  await choose(page, 'Pronto');
  labels = await labelsOf(page);
  expect(labels[0].text).toBe('raiz principal');
  await choose(page, 'Desfazer');
  expect((await labelsOf(page))[0].text).toBe('raiz');
  await choose(page, 'Refazer');
  expect((await labelsOf(page))[0].text).toBe('raiz principal');

  await choose(page, 'Guardar');
  await expect(page.getByRole('status')).toContainText('guardado');
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__garatuja));
  const reloaded = await labelsOf(page);
  expect(reloaded).toEqual(labels);
  expect(await ink(page, 'labels', 0, 0, 1600, 1200)).toBeGreaterThan(500);
});

test('double tap rewrites a label and Escape keeps the old text', async ({ page }) => {
  await ready(page);
  await choose(page, 'Legenda');
  await makeLabel(page, 'Legenda com seta', [800, 500], 'folha');
  await page.keyboard.press('Escape');
  const item = await centre(page.getByRole('button', { name: /Legenda com seta: folha/ }));
  await page.mouse.dblclick(item.x, item.y);
  const field = page.getByRole('textbox', { name: 'Escreve aqui' });
  await expect(field).toHaveValue('folha');
  await page.keyboard.type(' verde');
  await page.keyboard.press('Escape');
  expect((await labelsOf(page))[0].text).toBe('folha');
  await page.getByRole('button', { name: /Legenda com seta: folha/ }).focus();
  await page.keyboard.press('Enter');
  await expect(field).toHaveValue('folha');
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  await choose(page, 'Pronto');
  // Emptying the text removes the label.
  expect(await labelsOf(page)).toHaveLength(0);
});

test('dragging from the target to the text makes an arrow; the round handle re-aims it', async ({ page }) => {
  await ready(page);
  await choose(page, 'Legenda');
  await makeLabel(page, 'Legenda com seta', [1100, 300], 'flor', [500, 800]);
  const [label] = await labelsOf(page);
  expect(label.target?.x).toBeCloseTo(500, -1);
  expect(label.target?.y).toBeCloseTo(800, -1);
  const handle = page.locator('.label-handle');
  await expect(handle).toBeVisible();
  const box = await handle.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBeGreaterThanOrEqual(44);
  const grip = await centre(handle);
  const to = await paperLocation(page, 700, 950);
  await page.mouse.move(grip.x, grip.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 6 });
  await page.mouse.up();
  const aimed = (await labelsOf(page))[0];
  expect(aimed.target?.x).toBeCloseTo(700, -1);
  expect(aimed.target?.y).toBeCloseTo(950, -1);
  expect(aimed.x).toBe(label.x);
  await choose(page, 'Desfazer');
  expect((await labelsOf(page))[0].target).toEqual(label.target);
});

test('numbered labels count 1, 2, 3 and reuse a freed number', async ({ page }) => {
  await ready(page);
  await choose(page, 'Legenda');
  await makeLabel(page, 'Número', [400, 200], 'flor', [800, 300]);
  await page.keyboard.press('Escape');
  await makeLabel(page, 'Número', [400, 500], 'caule', [800, 600]);
  await page.keyboard.press('Escape');
  await makeLabel(page, 'Número', [400, 800], 'raiz', [800, 900]);
  expect((await labelsOf(page)).map(label => label.badge)).toEqual(['1', '2', '3']);
  await page.getByRole('button', { name: /Número 2: caule/ }).focus();
  await page.keyboard.press('Delete');
  expect((await labelsOf(page)).map(label => label.badge)).toEqual(['1', '3']);
  await makeLabel(page, 'Número', [400, 1000], 'folha', [800, 1100]);
  expect((await labelsOf(page)).map(label => label.badge)).toEqual(['1', '3', '2']);
});

test('balloons: speech, thought, shout and narrator box with draggable tails', async ({ page }) => {
  await ready(page);
  await choose(page, 'Legenda');
  await makeLabel(page, 'Balão de fala', [450, 300], 'Olá! Bom dia!', [450, 650]);
  await page.keyboard.press('Escape');
  await makeLabel(page, 'Pensamento', [1150, 300], 'Será que vai chover?', [1150, 650]);
  await page.keyboard.press('Escape');
  await makeLabel(page, 'Grito', [450, 950], 'Socorro!', [650, 780]);
  await page.keyboard.press('Escape');
  await makeLabel(page, 'Narrador', [1150, 1000], 'Era uma vez…');
  const labels = await labelsOf(page);
  expect(labels.map(label => [label.kind, label.shape])).toEqual([
    ['balloon', 'speech'], ['balloon', 'thought'], ['balloon', 'shout'], ['balloon', 'box'],
  ]);
  expect(Object.keys(labels[0].target ?? {}).sort()).toEqual(['x', 'y']);
  expect(labels[0].target?.x).toBeCloseTo(450, 0);
  expect(labels[0].target?.y).toBeCloseTo(650, 0);
  expect(labels[3].target).toBeUndefined();
  for (const label of labels) expect(await ink(page, 'labels', Math.max(0, label.x), Math.max(0, label.y), 80, 80)).toBeGreaterThan(0);

  await page.keyboard.press('Escape');
  const speech = page.getByRole('button', { name: /Balão de fala: Olá/ });
  await speech.focus();
  await expect(page.locator('.label-handle')).toBeVisible();
  const grip = await centre(page.locator('.label-handle'));
  const to = await paperLocation(page, 250, 700);
  await page.mouse.move(grip.x, grip.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 6 });
  await page.mouse.up();
  expect((await labelsOf(page))[0].target?.x).toBeCloseTo(250, -1);
});

test('changing the kind, colour and size of a selected label edits it as one undo step each', async ({ page }) => {
  await ready(page);
  await choose(page, 'Legenda');
  await makeLabel(page, 'Legenda com seta', [800, 500], 'casa');
  expect((await labelsOf(page))[0].kind).toBe('callout');
  await choose(page, 'Balão de fala');
  expect(await labelsOf(page)).toMatchObject([{ kind: 'balloon', shape: 'speech', text: 'casa' }]);
  await choose(page, 'Vermelho');
  await choose(page, 'Grande');
  const edited = (await labelsOf(page))[0];
  expect(edited.color).toBe('#e05748');
  expect(edited.size).toBe(80);
  await choose(page, 'Desfazer');
  expect((await labelsOf(page))[0].size).toBe(60);
  await choose(page, 'Desfazer');
  expect((await labelsOf(page))[0].color).toBe('#292a33');
  await choose(page, 'Desfazer');
  expect((await labelsOf(page))[0].kind).toBe('callout');
  await choose(page, 'Letra manuscrita');
  expect((await labelsOf(page))[0].font).toBe('Playwrite PT');
});

test('delete, copy and stick-to-paper are single undo steps; painting tools leave labels alone', async ({ page }) => {
  await ready(page);
  await choose(page, 'Legenda');
  await makeLabel(page, 'Legenda com seta', [800, 500], 'caule');
  await choose(page, 'Duplicar');
  let labels = await labelsOf(page);
  expect(labels).toHaveLength(2);
  expect(labels[1].text).toBe('caule');
  expect(labels[1].id).not.toBe(labels[0].id);
  expect(labels[1].x).not.toBe(labels[0].x);
  await choose(page, 'Apagar');
  expect(await labelsOf(page)).toHaveLength(1);
  await choose(page, 'Desfazer');
  expect(await labelsOf(page)).toHaveLength(2);

  const before = await ink(page, 'labels', 0, 0, 1600, 1200);
  await choose(page, 'Borracha');
  await drag(page, [200, 200], [1500, 1100]);
  await choose(page, 'Pintar');
  await drag(page, [300, 1000], [1300, 1000]);
  expect(await ink(page, 'labels', 0, 0, 1600, 1200)).toBe(before);
  expect(await labelsOf(page)).toHaveLength(2);

  await choose(page, 'Legenda');
  await page.getByRole('button', { name: /Legenda com seta: caule/ }).first().focus();
  const bitmapBefore = await ink(page, 'bitmap', 0, 0, 1600, 1200);
  await choose(page, 'Colar na folha');
  labels = await labelsOf(page);
  expect(labels).toHaveLength(1);
  expect(await ink(page, 'bitmap', 0, 0, 1600, 1200)).toBeGreaterThan(bitmapBefore + 400);
  await choose(page, 'Desfazer');
  expect(await labelsOf(page)).toHaveLength(2);
  expect(await ink(page, 'bitmap', 0, 0, 1600, 1200)).toBe(bitmapBefore);
  await choose(page, 'Refazer');
  expect(await labelsOf(page)).toHaveLength(1);
});

test('labels are keyboard operable: Tab, arrows, Enter, Delete', async ({ page }) => {
  await ready(page);
  await choose(page, 'Legenda');
  await makeLabel(page, 'Legenda com seta', [500, 400], 'um');
  await page.keyboard.press('Escape');
  await makeLabel(page, 'Legenda com seta', [1100, 800], 'dois');
  await page.keyboard.press('Escape');
  const sheet = page.getByRole('group', { name: 'Folha de desenho' });
  await sheet.focus();
  await page.keyboard.press('Tab');
  const first = page.getByRole('button', { name: /Legenda com seta: um/ });
  await expect(first).toBeFocused();
  const x = (await labelsOf(page))[0].x;
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  expect((await labelsOf(page))[0].x).toBe(x + 40);
  await page.keyboard.press('Shift+ArrowDown');
  expect((await labelsOf(page))[0].y).toBeGreaterThan(0);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: /Legenda com seta: dois/ })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('textbox', { name: 'Escreve aqui' })).toHaveValue('dois');
  await page.keyboard.type('!');
  await page.keyboard.press('Control+Enter');
  expect((await labelsOf(page))[1].text).toBe('dois!');
  await expect(page.getByRole('button', { name: /Legenda com seta: dois!/ })).toBeFocused();
  await page.keyboard.press('Delete');
  expect(await labelsOf(page)).toHaveLength(1);
  for (const name of ['Escrever', 'Duplicar', 'Apagar', 'Colar na folha']) {
    await page.getByRole('button', { name: /Legenda com seta: um/ }).focus();
    await expect(page.getByRole('button', { name, exact: true })).toHaveAttribute('aria-label', name);
  }
});

test('labels move with the page: each page keeps its own, undo is per page', async ({ page }) => {
  await ready(page);
  await choose(page, 'Legenda');
  await makeLabel(page, 'Balão de fala', [800, 500], 'primeira');
  await choose(page, 'Adicionar página');
  await expect(page.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-pressed', 'true');
  expect(await labelsOf(page)).toHaveLength(0);
  await expect(page.getByRole('button', { name: 'Desfazer' })).toBeDisabled();
  await makeLabel(page, 'Pensamento', [800, 500], 'segunda');
  await choose(page, 'Página 1');
  await expect(page.getByRole('button', { name: 'Página 1' })).toHaveAttribute('aria-pressed', 'true');
  expect((await labelsOf(page)).map(label => label.text)).toEqual(['primeira']);
  await choose(page, 'Página 2');
  await expect(page.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-pressed', 'true');
  expect((await labelsOf(page)).map(label => label.text)).toEqual(['segunda']);
});

test('an unfinished label is kept when the page changes', async ({ page }) => {
  await ready(page);
  await choose(page, 'Legenda');
  await choose(page, 'Balão de fala');
  await tap(page, 800, 500);
  await page.keyboard.type('quase pronta');
  await choose(page, 'Adicionar página');
  await expect(page.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-pressed', 'true');
  await choose(page, 'Página 1');
  await expect(page.getByRole('button', { name: 'Página 1' })).toHaveAttribute('aria-pressed', 'true');
  expect((await labelsOf(page)).map(label => label.text)).toEqual(['quase pronta']);
});

test('labels stay sharp in the composite used for print and export', async ({ page }) => {
  await ready(page);
  await choose(page, 'Legenda');
  await makeLabel(page, 'Legenda com seta', [800, 500], 'nítida');
  const result = await page.evaluate(() => {
    const surface = window.__garatuja?.app.surface;
    if (!surface) return undefined;
    const canvas = document.createElement('canvas');
    canvas.width = 3200;
    canvas.height = 2400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 3200, 2400);
    surface.composite(ctx);
    const data = ctx.getImageData(0, 0, 3200, 2400).data;
    let dark = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i] < 90) dark++;
    // At 2x the strokes are 2x wider: far more dark pixels than the 1x layer could ever give.
    const base = surface.labels.getImageData(0, 0, 1600, 1200).data;
    let baseDark = 0;
    for (let i = 0; i < base.length; i += 4) if (base[i + 3] > 200 && base[i] < 90) baseDark++;
    return { dark, baseDark };
  });
  expect(result?.baseDark).toBeGreaterThan(200);
  expect(result?.dark).toBeGreaterThan((result?.baseDark ?? 0) * 3);
});

test('typed text is landed when the page changes or the tab is hidden', async ({ page }) => {
  await ready(page);
  await choose(page, 'Texto');
  await tap(page, 200, 300);
  await page.keyboard.type('Fica guardado');
  await choose(page, 'Adicionar página');
  await expect(page.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-pressed', 'true');
  await choose(page, 'Página 1');
  await expect(page.getByRole('button', { name: 'Página 1' })).toHaveAttribute('aria-pressed', 'true');
  expect(await ink(page, 'bitmap', 150, 220, 800, 200)).toBeGreaterThan(200);

  await choose(page, 'Legenda');
  await choose(page, 'Balão de fala');
  await tap(page, 800, 800);
  await page.keyboard.type('Ainda a escrever');
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  expect((await labelsOf(page)).map(label => label.text)).toEqual(['Ainda a escrever']);
});

test('a label can be created from the keyboard alone', async ({ page }) => {
  await ready(page);
  await choose(page, 'Legenda');
  await choose(page, 'Legenda com seta');
  await page.getByRole('group', { name: 'Folha de desenho' }).focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  const field = page.getByRole('textbox', { name: 'Escreve aqui' });
  await expect(field).toBeFocused();
  await page.keyboard.type('teclado');
  await page.keyboard.press('Control+Enter');
  const [label] = await labelsOf(page);
  expect(label.text).toBe('teclado');
  await expect(page.getByRole('button', { name: /Legenda com seta: teclado/ })).toBeFocused();
});

test('tapping empty paper lets go of a selected label before starting another', async ({ page }) => {
  await ready(page);
  await choose(page, 'Legenda');
  await makeLabel(page, 'Legenda com seta', [700, 400], 'um ramo');
  const label = page.getByRole('button', { name: /um ramo/ });
  await expect(label).toHaveAttribute('aria-pressed', 'true');
  await tap(page, 300, 900);
  await expect(label).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('textbox', { name: 'Escreve aqui' })).toBeHidden();
  await tap(page, 300, 900);
  await expect(page.getByRole('textbox', { name: 'Escreve aqui' })).toBeFocused();
});

test('tapping elsewhere finishes the label being typed and starts the next one', async ({ page }) => {
  await ready(page);
  await choose(page, 'Legenda');
  await choose(page, 'Legenda com seta');
  await tap(page, 500, 300);
  await page.keyboard.type('primeira');
  await tap(page, 1000, 800);
  const field = page.getByRole('textbox', { name: 'Escreve aqui' });
  await expect(field).toBeFocused();
  await expect(field).toHaveValue('');
  await page.keyboard.type('segunda');
  await choose(page, 'Pronto');
  expect((await labelsOf(page)).map(label => label.text)).toEqual(['primeira', 'segunda']);
  await choose(page, 'Desfazer');
  expect((await labelsOf(page)).map(label => label.text)).toEqual(['primeira']);
  await choose(page, 'Desfazer');
  expect(await labelsOf(page)).toHaveLength(0);
  // A tap that is abandoned leaves no empty label and no undo step behind.
  await tap(page, 700, 700);
  await choose(page, 'Cancelar');
  expect(await labelsOf(page)).toHaveLength(0);
  await expect(page.getByRole('button', { name: 'Desfazer' })).toBeDisabled();
});

test.describe('touch', () => {
  test.use({ hasTouch: true });

  test('creates, drags and re-aims a balloon with a finger', async ({ page, context }) => {
    await ready(page);
    await choose(page, 'Legenda');
    await choose(page, 'Balão de fala');
    const spot = await paperLocation(page, 700, 400);
    await page.touchscreen.tap(spot.x, spot.y);
    await expect(page.getByRole('textbox', { name: 'Escreve aqui' })).toBeFocused();
    await page.keyboard.type('Olá!');
    await page.getByRole('button', { name: 'Pronto', exact: true }).tap();
    const [label] = await labelsOf(page);
    expect(label.text).toBe('Olá!');

    const cdp = await context.newCDPSession(page);
    const touch = async (from: { x: number; y: number }, to: { x: number; y: number }) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...from, id: 1 }] });
      for (let i = 1; i <= 6; i++) {
        const point = { x: from.x + (to.x - from.x) * i / 6, y: from.y + (to.y - from.y) * i / 6, id: 1 };
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] });
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    const body = await centre(page.getByRole('button', { name: /Balão de fala: Olá/ }));
    await touch(body, { x: body.x + 70, y: body.y + 40 });
    const moved = (await labelsOf(page))[0];
    expect(moved.x).toBeGreaterThan(label.x + 100);

    const grip = await centre(page.locator('.label-handle'));
    const box = await page.locator('.label-handle').boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    const to = await paperLocation(page, 300, 900);
    await touch(grip, to);
    const aimed = (await labelsOf(page))[0];
    expect(aimed.target?.x).toBeCloseTo(300, -1);
    expect(aimed.x).toBe(moved.x);
  });
});
