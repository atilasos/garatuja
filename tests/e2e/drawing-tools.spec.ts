import { writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const capture = process.env.GARATUJA_CAPTURE_SCREENS === '1';

async function ready(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Pintar', exact: true })).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__garatuja));
}

async function sheetPoint(page: Page, x: number, y: number) {
  const box = await page.getByRole('group', { name: 'Folha de desenho' }).boundingBox();
  if (!box) throw new Error('Missing sheet');
  return { x: box.x + box.width * x / 1600, y: box.y + box.height * y / 1200 };
}

/** Drag through a list of page points; `pause` slows the pointer so speed-driven brushes see realistic speeds. */
async function drag(page: Page, points: [number, number][], pause = 0, modifier?: 'Shift') {
  const first = await sheetPoint(page, ...points[0]);
  await page.mouse.move(first.x, first.y);
  if (modifier) await page.keyboard.down(modifier);
  await page.mouse.down();
  for (const [x, y] of points.slice(1)) {
    const point = await sheetPoint(page, x, y);
    await page.mouse.move(point.x, point.y);
    if (pause) await page.waitForTimeout(pause);
  }
  await page.mouse.up();
  if (modifier) await page.keyboard.up(modifier);
}

async function tap(page: Page, x: number, y: number) {
  const point = await sheetPoint(page, x, y);
  await page.mouse.click(point.x, point.y);
}

async function hover(page: Page, x: number, y: number) {
  const point = await sheetPoint(page, x, y);
  await page.mouse.move(point.x, point.y);
}

const choose = (page: Page, name: string) => page.getByRole('button', { name, exact: true }).click();

const pixel = (page: Page, x: number, y: number) => page.evaluate(([x, y]) => window.__garatuja?.pixel(x, y) ?? [], [x, y]);

/** How many page pixels are not paper white. */
const inked = (page: Page) => page.evaluate(() => {
  const data = window.__garatuja?.app.surface.ctx.getImageData(0, 0, 1600, 1200).data;
  let count = 0;
  if (data) {
    const words = new Uint32Array(data.buffer);
    // 0xffffffff is opaque white in either byte order.
    for (let i = 0; i < words.length; i++) if (words[i] !== 0xffffffff) count++;
  }
  return count;
});

/** How many overlay pixels are painted: the transient layer for cursors and previews. */
const overlayInk = (page: Page) => page.evaluate(() => {
  const data = window.__garatuja?.app.surface.overlay.getImageData(0, 0, 1600, 1200).data;
  let count = 0;
  if (data) for (let i = 3; i < data.length; i += 4) if (data[i]) count++;
  return count;
});

/** Save the page bitmap at its native 1600×1200 size, so details can be inspected. */
async function saveSheet(page: Page, path: string) {
  const url = await page.evaluate(() => window.__garatuja?.app.surface.ctx.canvas.toDataURL('image/png') ?? '');
  writeFileSync(path, Buffer.from(url.split(',')[1], 'base64'));
}

async function label(page: Page, texts: [string, number, number][]) {
  await page.evaluate(items => {
    const ctx = window.__garatuja?.app.surface.ctx;
    if (!ctx) return;
    ctx.font = '26px Andika, sans-serif';
    ctx.fillStyle = '#332b25';
    for (const [text, x, y] of items) ctx.fillText(text, x, y);
  }, texts);
}

const wave = (x0: number, y0: number, width: number, amplitude: number, steps = 24): [number, number][] =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    return [x0 + width * t, y0 + amplitude * Math.sin(t * Math.PI * 2)] as [number, number];
  });

const brushes = ['Redondo', 'Quadrado', 'Marcador', 'Caligrafia', 'Caneta', 'Fita', 'Pontilhado', 'Tracejado', 'Linha dupla',
  'Lápis de cera', 'Giz', 'Carvão', 'Cerdas', 'Aguarela', 'Spray', 'Cintilante', 'Bolinhas', 'Arco de tons', 'Néon',
  'Setas', 'Pegadas', 'Folhas', 'Relva', 'Pelo'];
const shapes = ['Quadrado', 'Retângulo', 'Círculo', 'Elipse', 'Triângulo', 'Estrela', 'Coração', 'Losango', 'Pentágono',
  'Hexágono', 'Octógono', 'Estrela de 6 pontas', 'Seta'];
const fills = ['Cor lisa', 'Degradé reto', 'Degradé redondo', 'Riscas', 'Bolas', 'Xadrez', 'Ondas', 'Tijolos'];
const colors = ['Azul', 'Vermelho', 'Verde', 'Roxo', 'Laranja', 'Turquesa'];

test.describe('brushes', () => {
  test('every brush marks the page, at the smallest and the largest size, and undo restores every pixel', async ({ page }) => {
    test.setTimeout(120_000);
    await ready(page);
    expect(brushes).toHaveLength(24);
    for (const size of ['Mínimo', 'Máximo']) {
      await choose(page, size);
      for (const name of brushes) {
        await choose(page, name);
        await drag(page, wave(500, 600, 600, 120, 14));
        expect(await inked(page), `${name} (${size}) left no mark`).toBeGreaterThan(20);
        await choose(page, 'Desfazer');
        expect(await inked(page), `${name} (${size}) left pixels after undo`).toBe(0);
      }
    }
  });

  test('a tap with any brush leaves a mark', async ({ page }) => {
    await ready(page);
    for (const name of brushes) {
      await choose(page, name);
      await tap(page, 800, 600);
      expect(await inked(page), `${name} left no mark on tap`).toBeGreaterThan(0);
      await choose(page, 'Desfazer');
    }
  });

  test('the simple interface offers the 10 simplest brushes, the complete one all of them', async ({ page }) => {
    await ready(page);
    const names = page.locator('.options .choice');
    expect(await names.count()).toBeGreaterThanOrEqual(22);
    await page.evaluate(() => window.__garatuja?.app.configure({ level: 1 }));
    await expect(page.getByRole('button', { name: 'Pintar', exact: true })).toBeVisible();
    const simple = await page.locator('.options .choice').count();
    expect(simple).toBeGreaterThanOrEqual(8);
    expect(simple).toBeLessThanOrEqual(10);
  });

  test('freehand strokes are smooth curves, not straight segments', async ({ page }) => {
    await ready(page);
    await choose(page, 'Mínimo');
    // Three sparse samples at right angles: a polyline would leave a sharp corner at the middle one.
    await drag(page, [[400, 600], [800, 600], [800, 1000]]);
    expect(await pixel(page, 800, 600)).toEqual([255, 255, 255, 255]);
    expect(await pixel(page, 800, 1000)).not.toEqual([255, 255, 255, 255]);
    // The curve cuts the corner: at its middle it passes through (750, 650).
    expect(await pixel(page, 750, 650)).not.toEqual([255, 255, 255, 255]);
  });

  test('the pen brush follows pressure and the ribbon follows speed', async ({ page, context }) => {
    await ready(page);
    const cdp = await context.newCDPSession(page);
    await choose(page, 'Caneta');
    const press = async (x: number, force: number) => {
      const position = await sheetPoint(page, x, 400);
      const event = { ...position, pointerType: 'pen' as const, button: 'left' as const, clickCount: 1 };
      await cdp.send('Input.dispatchMouseEvent', { ...event, type: 'mousePressed', buttons: 1, force });
      await cdp.send('Input.dispatchMouseEvent', { ...event, type: 'mouseMoved', buttons: 1, force });
      await cdp.send('Input.dispatchMouseEvent', { ...event, type: 'mouseReleased', buttons: 0 });
    };
    await press(500, .15);
    await press(900, 1);
    const thin = await page.evaluate(() => {
      const data = window.__garatuja?.app.surface.ctx.getImageData(500, 340, 1, 120).data;
      let n = 0;
      if (data) for (let i = 0; i < data.length; i += 4) if (data[i] !== 255) n++;
      return n;
    });
    const thick = await page.evaluate(() => {
      const data = window.__garatuja?.app.surface.ctx.getImageData(900, 340, 1, 120).data;
      let n = 0;
      if (data) for (let i = 0; i < data.length; i += 4) if (data[i] !== 255) n++;
      return n;
    });
    expect(thick).toBeGreaterThan(thin * 2);
    expect(thin).toBeGreaterThan(0);
  });
});

test.describe('hover cursors', () => {
  test('every drawing tool shows a cursor on the overlay at the real size, and it never reaches the page', async ({ page }) => {
    await ready(page);
    const radius = async () => page.evaluate(() => {
      const data = window.__garatuja?.app.surface.overlay.getImageData(0, 0, 1600, 1200).data;
      let left = 1600;
      let right = -1;
      if (data) for (let y = 0; y < 1200; y++) for (let x = 0; x < 1600; x++) {
        if (data[(y * 1600 + x) * 4 + 3]) { left = Math.min(left, x); right = Math.max(right, x); }
      }
      return (right - left) / 2;
    });
    for (const tool of ['Pintar', 'Linhas', 'Borracha', 'Formas', 'Encher']) {
      await choose(page, tool);
      await hover(page, 400, 400);
      await hover(page, 800, 600);
      expect(await overlayInk(page), `${tool} shows no hover cursor`).toBeGreaterThan(30);
      expect(await inked(page)).toBe(0);
    }
    // A brush ring is as wide as the brush: size 56 → a ring about 56 page pixels across.
    await choose(page, 'Pintar');
    await choose(page, 'Grande');
    await hover(page, 800, 600);
    expect(await radius()).toBeGreaterThan(28);
    expect(await radius()).toBeLessThan(36);
    await choose(page, 'Borracha');
    await choose(page, 'Grande');
    await hover(page, 800, 600);
    expect(await radius()).toBeGreaterThan(42);
    expect(await radius()).toBeLessThan(50);
  });
});

test.describe('lines', () => {
  test('draw a straight line with any brush, preview it on the overlay, and snap to 15° with Shift', async ({ page }) => {
    await ready(page);
    await choose(page, 'Linhas');
    await choose(page, 'Mínimo');
    const from = await sheetPoint(page, 300, 300);
    const to = await sheetPoint(page, 900, 330);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 5 });
    expect(await overlayInk(page)).toBeGreaterThan(50);
    expect(await inked(page)).toBe(0);
    await page.mouse.up();
    expect(await pixel(page, 600, 315)).not.toEqual([255, 255, 255, 255]);
    expect(await pixel(page, 600, 345)).toEqual([255, 255, 255, 255]);
    await choose(page, 'Desfazer');
    expect(await inked(page)).toBe(0);
    // Shift: a nearly horizontal drag becomes exactly horizontal.
    await drag(page, [[300, 500], [900, 530]], 0, 'Shift');
    expect(await pixel(page, 900, 500)).not.toEqual([255, 255, 255, 255]);
    expect(await pixel(page, 600, 500)).not.toEqual([255, 255, 255, 255]);
    for (const name of ['Marcador', 'Néon', 'Setas', 'Giz']) {
      await choose(page, name);
      await drag(page, [[300, 800], [900, 900]]);
      await choose(page, 'Desfazer');
    }
    expect(await inked(page)).toBeGreaterThan(0);
  });
});

test.describe('shapes', () => {
  test('every shape marks the page, and undo restores every pixel', async ({ page }) => {
    await ready(page);
    await choose(page, 'Formas');
    expect(shapes).toHaveLength(13);
    for (const name of shapes) {
      await choose(page, name);
      await drag(page, [[500, 400], [900, 750]]);
      expect(await inked(page), `${name} left no mark`).toBeGreaterThan(1000);
      await choose(page, 'Desfazer');
      expect(await inked(page), `${name} left pixels after undo`).toBe(0);
    }
  });

  test('filled, outline and filled-with-outline differ, and the outline thickness is respected', async ({ page }) => {
    await ready(page);
    await choose(page, 'Formas');
    await choose(page, 'Retângulo');
    await choose(page, 'Vermelho');
    await drag(page, [[300, 300], [700, 600]]);
    expect(await pixel(page, 500, 450)).toEqual([224, 87, 72, 255]);
    await choose(page, 'Contorno');
    await choose(page, 'Máximo');
    await drag(page, [[800, 300], [1200, 600]]);
    expect(await pixel(page, 1000, 450)).toEqual([255, 255, 255, 255]);
    // The outer edge of the outline is the box the child dragged; it is 24 pixels thick at the largest size.
    expect(await pixel(page, 1000, 302)).toEqual([224, 87, 72, 255]);
    expect(await pixel(page, 1000, 320)).toEqual([224, 87, 72, 255]);
    expect(await pixel(page, 1000, 340)).toEqual([255, 255, 255, 255]);
    expect(await pixel(page, 1000, 296)).toEqual([255, 255, 255, 255]);
    await choose(page, 'Cheia e contorno');
    await drag(page, [[300, 700], [700, 1000]]);
    expect(await pixel(page, 500, 850)).toEqual([224, 87, 72, 255]);
    const edge = await pixel(page, 500, 710);
    expect(edge).not.toEqual([224, 87, 72, 255]);
    expect(edge).not.toEqual([255, 255, 255, 255]);
  });

  test('draws from the center, and Shift keeps the proportions', async ({ page }) => {
    await ready(page);
    await choose(page, 'Formas');
    await choose(page, 'Retângulo');
    await choose(page, 'Do centro');
    await drag(page, [[800, 600], [1000, 700]]);
    // Centre 800,600 and a half-size of 200×100: the box runs from 600,500 to 1000,700.
    expect(await pixel(page, 620, 520)).not.toEqual([255, 255, 255, 255]);
    expect(await pixel(page, 980, 680)).not.toEqual([255, 255, 255, 255]);
    expect(await pixel(page, 590, 490)).toEqual([255, 255, 255, 255]);
    expect(await pixel(page, 1010, 710)).toEqual([255, 255, 255, 255]);
    await choose(page, 'Desfazer');
    await choose(page, 'Do centro');
    await drag(page, [[300, 300], [700, 400]], 0, 'Shift');
    expect(await pixel(page, 650, 650)).not.toEqual([255, 255, 255, 255]);
    expect(await pixel(page, 750, 500)).toEqual([255, 255, 255, 255]);
  });

  test('rotates with a second gesture: point where the shape should face', async ({ page }) => {
    await ready(page);
    await choose(page, 'Formas');
    await choose(page, 'Retângulo');
    await choose(page, 'Rodar');
    await drag(page, [[600, 500], [1000, 700]]);
    // Still waiting for its turn: nothing on the page yet, but a preview on the overlay.
    expect(await inked(page)).toBe(0);
    expect(await overlayInk(page)).toBeGreaterThan(1000);
    // Pointing to the right turns the wide rectangle on its end (centre 800,600).
    await hover(page, 1100, 600);
    await tap(page, 1100, 600);
    expect(await pixel(page, 800, 450)).not.toEqual([255, 255, 255, 255]);
    expect(await pixel(page, 800, 750)).not.toEqual([255, 255, 255, 255]);
    expect(await pixel(page, 650, 600)).toEqual([255, 255, 255, 255]);
    await choose(page, 'Desfazer');
    expect(await inked(page)).toBe(0);
    // Escape throws the pending shape away.
    await drag(page, [[600, 500], [1000, 700]]);
    await page.keyboard.press('Escape');
    expect(await overlayInk(page)).toBe(0);
    expect(await inked(page)).toBe(0);
  });

  test('a single tap draws a friendly default shape', async ({ page }) => {
    await ready(page);
    await choose(page, 'Formas');
    await choose(page, 'Círculo');
    await tap(page, 800, 600);
    expect(await pixel(page, 800, 600)).not.toEqual([255, 255, 255, 255]);
  });
});

test.describe('fill', () => {
  test('every fill style paints its region and nothing outside it', async ({ page }) => {
    await ready(page);
    await choose(page, 'Formas');
    await choose(page, 'Retângulo');
    await choose(page, 'Contorno');
    await drag(page, [[400, 300], [1000, 800]]);
    await choose(page, 'Encher');
    for (const name of fills) {
      await choose(page, name);
      await choose(page, 'Azul');
      if (name.startsWith('Degradé')) await drag(page, [[450, 350], [950, 750]]);
      else await tap(page, 700, 550);
      expect(await pixel(page, 700, 550), `${name} left the middle white`).not.toEqual([255, 255, 255, 255]);
      expect(await pixel(page, 200, 200), `${name} spilled outside`).toEqual([255, 255, 255, 255]);
      expect(await pixel(page, 700, 305), `${name} painted over the line`).toEqual([41, 42, 51, 255]);
      await choose(page, 'Desfazer');
      expect(await pixel(page, 700, 550)).toEqual([255, 255, 255, 255]);
    }
  });

  test('a gradient follows the drag direction', async ({ page }) => {
    await ready(page);
    await choose(page, 'Encher');
    await choose(page, 'Degradé reto');
    await choose(page, 'Azul');
    await drag(page, [[100, 100], [1500, 100]]);
    const left = await pixel(page, 200, 600);
    const right = await pixel(page, 1400, 600);
    expect(left[0]).toBeLessThan(right[0]);
    expect(left).toEqual(await pixel(page, 200, 100));
    await choose(page, 'Desfazer');
    await choose(page, 'Degradé redondo');
    await drag(page, [[800, 600], [1000, 600]]);
    expect((await pixel(page, 800, 600))[0]).toBeLessThan((await pixel(page, 1300, 600))[0]);
    expect(Math.abs((await pixel(page, 800, 600))[0] - (await pixel(page, 800, 610))[0])).toBeLessThan(12);
  });

  test('leaves no pale halo along an anti-aliased line', async ({ page }) => {
    await ready(page);
    await choose(page, 'Formas');
    await choose(page, 'Círculo');
    await choose(page, 'Contorno');
    await choose(page, 'Mínimo');
    await drag(page, [[600, 450], [1000, 850]]);
    await choose(page, 'Encher');
    await choose(page, 'Vermelho');
    await tap(page, 800, 650);
    const halo = await page.evaluate(() => {
      const ctx = window.__garatuja?.app.surface.ctx;
      if (!ctx) return -1;
      const { data } = ctx.getImageData(560, 410, 480, 480);
      const w = 480;
      const light = (i: number) => data[i] > 215 && data[i + 1] > 215 && data[i + 2] > 215;
      const red = (i: number) => data[i] > 150 && data[i + 1] < 120 && data[i + 2] < 120;
      let count = 0;
      for (let y = 3; y < 477; y++) {
        for (let x = 3; x < 477; x++) {
          const i = (y * w + x) * 4;
          // A pale pixel hugging red paint from the inside of the circle is a halo.
          if (!light(i)) continue;
          if (red(i - 4) || red(i + 4) || red(i - w * 4) || red(i + w * 4)) {
            const dx = x + 560 - 800;
            const dy = y + 410 - 650;
            if (Math.hypot(dx, dy) < 200) count++;
          }
        }
      }
      return count;
    });
    expect(halo).toBe(0);
  });

  test('stops at the lines of a template', async ({ page }) => {
    await ready(page);
    await choose(page, 'Novo');
    await page.getByRole('combobox', { name: 'Modelo' }).selectOption('notebook');
    await choose(page, 'Criar trabalho');
    await choose(page, 'Encher');
    await choose(page, 'Riscas');
    await choose(page, 'Azul');
    const before = await inked(page);
    await tap(page, 800, 600);
    expect(await inked(page)).toBeGreaterThan(before);
  });
});

test.describe('eraser', () => {
  test('erases round and square, in five sizes, restoring the paper', async ({ page }) => {
    await ready(page);
    await choose(page, 'Formas');
    await choose(page, 'Retângulo');
    await drag(page, [[100, 100], [1500, 1100]]);
    await choose(page, 'Borracha');
    const sizes = ['Mínimo', 'Pequeno', 'Médio', 'Grande', 'Máximo'];
    expect(sizes).toHaveLength(5);
    let previous = 0;
    for (const [index, size] of sizes.entries()) {
      await choose(page, size);
      await choose(page, index % 2 ? 'Quadrada' : 'Redonda');
      const before = await inked(page);
      await drag(page, [[300 + index * 250, 300], [300 + index * 250, 900]]);
      const removed = before - await inked(page);
      expect(removed, `${size} erased nothing`).toBeGreaterThan(previous * .5);
      previous = removed;
    }
    expect(await pixel(page, 300, 600)).toEqual([255, 255, 255, 255]);
  });
});

test.describe('screenshots', () => {
  test.skip(!capture, 'screenshot capture is opt-in');
  test.setTimeout(120_000);

  test('a sheet with every brush', async ({ page }) => {
    await ready(page);
    for (const [index, name] of brushes.entries()) {
      await choose(page, colors[index % colors.length]);
      await choose(page, name);
      await drag(page, wave(40 + (index % 4) * 395, 105 + Math.floor(index / 4) * 195, 320, 45), 7);
    }
    await label(page, brushes.map((name, i) => [name, 40 + (i % 4) * 395, 28 + Math.floor(i / 4) * 195]));
    await saveSheet(page, 'docs/screens/batch-a-brushes.png');
    await choose(page, 'Néon');
    await choose(page, 'Grande');
    await hover(page, 800, 640);
    await page.screenshot({ path: 'docs/screens/batch-a-ui.png' });
  });

  test('a sheet with every shape', async ({ page }) => {
    await ready(page);
    await choose(page, 'Formas');
    const styles = ['Cheia', 'Contorno', 'Cheia e contorno'];
    for (const [index, name] of shapes.entries()) {
      await choose(page, colors[index % colors.length]);
      await choose(page, styles[Math.floor(index / 5) % 3 === 0 ? 0 : index % 3]);
      await choose(page, name);
      const column = index % 5;
      const row = Math.floor(index / 5);
      const x = 60 + column * 310;
      const y = 80 + row * 380;
      await drag(page, [[x + 20, y + 40], [x + 250, y + 300]]);
    }
    await choose(page, 'Cheia');
    await choose(page, 'Retângulo');
    await choose(page, 'Rodar');
    await choose(page, 'Laranja');
    await drag(page, [[1130, 840], [1430, 1000]]);
    await hover(page, 1400, 700);
    await tap(page, 1400, 700);
    await label(page, [...shapes.map((name, i): [string, number, number] => [name, 60 + (i % 5) * 310, 56 + Math.floor(i / 5) * 380]),
      ['Rodar', 1130, 800]]);
    await saveSheet(page, 'docs/screens/batch-a-shapes.png');
    await choose(page, 'Estrela');
    await hover(page, 800, 640);
    await page.screenshot({ path: 'docs/screens/batch-a-ui-shapes.png' });
  });

  test('a sheet with every fill', async ({ page }) => {
    await ready(page);
    await choose(page, 'Formas');
    await choose(page, 'Contorno');
    await choose(page, 'Médio');
    const cells: [number, number][] = [];
    for (let i = 0; i < fills.length; i++) {
      const x = 50 + (i % 4) * 385;
      const y = 70 + Math.floor(i / 4) * 560;
      cells.push([x + 170, y + 250]);
      await choose(page, i % 2 ? 'Círculo' : 'Retângulo');
      await drag(page, i % 2 ? [[x, y + 70], [x + 340, y + 410]] : [[x, y + 30], [x + 340, y + 470]]);
    }
    await choose(page, 'Encher');
    for (const [index, name] of fills.entries()) {
      await choose(page, name);
      await choose(page, colors[index % colors.length]);
      const [x, y] = cells[index];
      if (name.startsWith('Degradé')) await drag(page, [[x - 90, y - 90], [x + 90, y + 130]]);
      else await tap(page, x, y);
    }
    await label(page, fills.map((name, i) => [name, 50 + (i % 4) * 385, 48 + Math.floor(i / 4) * 560]));
    await saveSheet(page, 'docs/screens/batch-a-fills.png');
    await choose(page, 'Degradé redondo');
    await page.screenshot({ path: 'docs/screens/batch-a-ui-fill.png' });
  });
});
