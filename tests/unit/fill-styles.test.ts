import { describe, expect, it } from 'vitest';
import type { Rgb } from '../../src/core/draw';
import { floodFill, floodRegion, paintRegion, type Painter } from '../../src/core/flood';
import {
  defaultGradient, fillPainter, gradientEnd, gradientPainter, patternPainter, patternPaper, type PatternKind,
} from '../../src/core/tooling/fill-styles';
import { timeBudget } from './time-budget';

const red: Rgb = { r: 200, g: 24, b: 28 };
const white: Rgb = { r: 255, g: 255, b: 255 };
const blue: Rgb = { r: 73, g: 125, b: 187 };

function pixels(width: number, height: number, fill = 255) {
  return { width, height, data: new Uint8ClampedArray(width * height * 4).fill(fill) };
}

function set(source: ReturnType<typeof pixels>, x: number, y: number, [r, g, b]: number[]) {
  source.data.set([r, g, b, 255], (y * source.width + x) * 4);
}

function get(data: Uint8ClampedArray, width: number, x: number, y: number) {
  const i = (y * width + x) * 4;
  return [data[i], data[i + 1], data[i + 2]];
}

const sample = (painter: Painter, x: number, y: number): Rgb => {
  const out = { r: 0, g: 0, b: 0 };
  painter(x, y, out);
  return { r: Math.round(out.r), g: Math.round(out.g), b: Math.round(out.b) };
};

describe('gradients', () => {
  const start = { r: 40, g: 80, b: 200 };
  const end = { r: 200, g: 120, b: 40 };

  it('run along the drag direction and hold their colours beyond both ends', () => {
    const painter = gradientPainter('linear', { from: { x: 100, y: 100 }, to: { x: 300, y: 100 } }, start, end);
    expect(sample(painter, 40, 500)).toEqual(start);
    expect(sample(painter, 100, 0)).toEqual({ r: 40, g: 80, b: 200 });
    expect(sample(painter, 200, 999)).toEqual({ r: 120, g: 100, b: 120 });
    expect(sample(painter, 900, 10)).toEqual(end);
    // Every pixel on a line perpendicular to the drag has the same colour.
    expect(sample(painter, 180, 20)).toEqual(sample(painter, 180, 900));
  });

  it('follows a diagonal drag', () => {
    const painter = gradientPainter('linear', { from: { x: 0, y: 0 }, to: { x: 100, y: 100 } }, start, end);
    expect(sample(painter, 49, 51)).toEqual(sample(painter, 51, 49));
    expect(sample(painter, 10, 10).r).toBeLessThan(sample(painter, 90, 90).r);
  });

  it('spreads from the press point outwards when radial', () => {
    const painter = gradientPainter('radial', { from: { x: 400, y: 300 }, to: { x: 500, y: 300 } }, start, end);
    // Pixels are sampled at their centres, so the press point itself is half a pixel from the exact centre.
    expect(sample(painter, 400, 300).r).toBeLessThanOrEqual(42);
    expect(sample(painter, 600, 300)).toEqual(end);
    expect(sample(painter, 400, 400)).toEqual(sample(painter, 500, 300));
    expect(sample(painter, 400, 250).r).toBeLessThan(sample(painter, 400, 350).r);
  });

  it('fade to a pale tint, or a darker tone when the colour is already pale', () => {
    const tint = gradientEnd(blue);
    expect(tint.r).toBeGreaterThan(blue.r);
    expect(tint.g).toBeGreaterThan(blue.g);
    expect(gradientEnd(white).r).toBeLessThan(255);
    expect(gradientEnd({ r: 250, g: 240, b: 200 }).g).toBeLessThan(240);
  });

  it('choose a sensible default when the child only taps', () => {
    const bounds = { x: 100, y: 200, w: 400, h: 300 };
    expect(defaultGradient('linear', bounds, { x: 250, y: 300 })).toEqual({ from: { x: 300, y: 200 }, to: { x: 300, y: 500 } });
    const radial = defaultGradient('radial', bounds, { x: 100, y: 200 });
    expect(radial.from).toEqual({ x: 100, y: 200 });
    // The radius reaches the farthest corner, so the whole region is covered.
    expect(radial.to.x - radial.from.x).toBeCloseTo(500);
  });
});

describe('patterns', () => {
  const ink = blue;
  const exact = patternPaper(blue);
  const paper = { r: Math.round(exact.r), g: Math.round(exact.g), b: Math.round(exact.b) };
  const kinds: PatternKind[] = ['stripes', 'dots', 'checks', 'waves', 'bricks'];

  it('use only the colour and its soft tint, never anything else', () => {
    for (const kind of kinds) {
      const painter = patternPainter(kind, ink, exact);
      let inked = 0;
      let papered = 0;
      for (let y = 0; y < 160; y++) {
        for (let x = 0; x < 160; x++) {
          const c = sample(painter, x, y);
          const within = (v: number, a: number, b: number) => v >= Math.min(a, b) - 1 && v <= Math.max(a, b) + 1;
          expect(within(c.r, ink.r, paper.r) && within(c.g, ink.g, paper.g) && within(c.b, ink.b, paper.b), `${kind} left the palette at ${x},${y}`).toBe(true);
          if (c.r === ink.r && c.g === ink.g) inked++;
          if (c.r === paper.r && c.g === paper.g) papered++;
        }
      }
      expect(inked, `${kind} has no ink`).toBeGreaterThan(1000);
      expect(papered, `${kind} has no paper`).toBeGreaterThan(1000);
    }
  });

  it('repeat, and are anchored to the page so neighbouring fills line up', () => {
    const periods: [PatternKind, number, number][] = [['checks', 72, 72], ['dots', 38, 76], ['bricks', 68, 56], ['waves', 0, 30]];
    for (const [kind, dx, dy] of periods) {
      const painter = patternPainter(kind, ink, exact);
      for (const [x, y] of [[13, 21], [200, 97], [411, 333]]) {
        if (dx) expect(sample(painter, x + dx, y), `${kind} horizontally`).toEqual(sample(painter, x, y));
        if (dy) expect(sample(painter, x, y + dy), `${kind} vertically`).toEqual(sample(painter, x, y));
      }
    }
  });

  it('draws diagonal stripes, a chessboard and offset bricks', () => {
    const stripes = patternPainter('stripes', ink, exact);
    expect(sample(stripes, 10, 10)).toEqual(sample(stripes, 11, 9));
    expect(sample(stripes, 10, 10)).toEqual(sample(stripes, 3, 17));
    const checks = patternPainter('checks', ink, exact);
    expect(sample(checks, 5, 5)).not.toEqual(sample(checks, 41, 5));
    expect(sample(checks, 5, 5)).toEqual(sample(checks, 41, 41));
    const bricks = patternPainter('bricks', ink, exact);
    // The mortar line of the next row sits half a brick further along.
    expect(sample(bricks, 1, 10)).toEqual(paper);
    expect(sample(bricks, 1, 38)).toEqual(ink);
    expect(sample(bricks, 35, 38)).toEqual(paper);
    const dots = patternPainter('dots', ink, exact);
    expect(sample(dots, 19, 19)).toEqual(ink);
    expect(sample(dots, 0, 0)).toEqual(paper);
  });

  it('stay readable when the colour is white', () => {
    const painter = fillPainter('stripes', '#ffffff');
    if (typeof painter !== 'function') throw new Error('expected a painter');
    const values = new Set<number>();
    for (let x = 0; x < 100; x++) values.add(sample(painter, x, 0).r);
    expect(values.size).toBeGreaterThan(1);
  });
});

describe('painting a region', () => {
  /** A white page with a black frame whose inside is the region to fill. */
  function framed() {
    const source = pixels(80, 60);
    for (let x = 10; x < 70; x++) for (const y of [10, 11, 49, 50]) set(source, x, y, [0, 0, 0]);
    for (let y = 10; y < 51; y++) for (const x of [10, 11, 68, 69]) set(source, x, y, [0, 0, 0]);
    return source;
  }

  it('keeps a pattern inside the area that was flooded', () => {
    const source = framed();
    const region = floodRegion(source, { x: 40, y: 30 }, 32);
    expect(region?.bounds).toEqual({ x: 12, y: 12, w: 56, h: 37 });
    for (const kind of ['stripes', 'dots', 'checks', 'waves', 'bricks'] as const) {
      const painter = fillPainter(kind, '#497dbb');
      const result = paintRegion(source, region!, painter, { fringe: true });
      expect(result).not.toBeNull();
      for (let y = 0; y < 60; y++) {
        for (let x = 0; x < 80; x++) {
          const inside = x >= 12 && x < 68 && y >= 12 && y < 49;
          const before = get(source.data, 80, x, y);
          const after = get(result!.data, 80, x, y);
          if (!inside) expect(after, `${kind} changed ${x},${y} outside the region`).toEqual(before);
          else expect(after, `${kind} left ${x},${y} unpainted`).not.toEqual([255, 255, 255]);
        }
      }
    }
  });

  it('does not change the pixels it was given', () => {
    const source = framed();
    const copy = new Uint8ClampedArray(source.data);
    const region = floodRegion(source, { x: 40, y: 30 })!;
    paintRegion(source, region, fillPainter('bricks', '#e05748'), { fringe: true });
    expect([...source.data]).toEqual([...copy]);
  });

  it('turns an anti-aliased edge into a mix of the new colour and the line, with no pale halo', () => {
    // A black line with a soft edge on each side: columns 4..11.
    const source = pixels(16, 3);
    const levels = [255, 255, 255, 255, 191, 64, 0, 0, 0, 0, 64, 191, 255, 255, 255, 255];
    for (let y = 0; y < 3; y++) levels.forEach((level, x) => set(source, x, y, [level, level, level]));
    const region = floodRegion(source, { x: 0, y: 1 }, 32)!;
    expect(region.bounds.x + region.bounds.w).toBe(4);
    const result = paintRegion(source, region, red, { fringe: true })!;
    // Pixel 4 was 75 % paper: it becomes 75 % red over the black line.
    const edge = get(result.data, 16, 4, 1);
    expect(edge[0]).toBeCloseTo(.749 * 200, -1);
    expect(edge[1]).toBeCloseTo(.749 * 24, -1);
    // The pixel after it is a quarter paper.
    expect(get(result.data, 16, 5, 1)[0]).toBeCloseTo(.251 * 200, -1);
    // Nothing between the red and the black is lighter than the red itself.
    for (let x = 4; x < 7; x++) expect(Math.max(...get(result.data, 16, x, 1))).toBeLessThanOrEqual(200);
    // The line core and the far side are untouched.
    expect(get(result.data, 16, 7, 1)).toEqual([0, 0, 0]);
    expect(get(result.data, 16, 13, 1)).toEqual([255, 255, 255]);
    // Without the fringe repair the soft pixels stay pale: that is the halo.
    const plain = floodFill(source, { x: 0, y: 1 }, red, 32)!;
    expect(get(plain.data, 16, 4, 1)).toEqual([191, 191, 191]);
  });

  it('does not bleed into a differently coloured neighbour', () => {
    const source = pixels(20, 4);
    for (let y = 0; y < 4; y++) for (let x = 10; x < 20; x++) set(source, x, y, [blue.r, blue.g, blue.b]);
    const region = floodRegion(source, { x: 0, y: 0 }, 32)!;
    const result = paintRegion(source, region, red, { fringe: true })!;
    expect(get(result.data, 20, 10, 1)).toEqual([blue.r, blue.g, blue.b]);
    expect(get(result.data, 20, 11, 1)).toEqual([blue.r, blue.g, blue.b]);
    expect(get(result.data, 20, 9, 1)).toEqual([200, 24, 28]);
  });

  it('fills underneath a guide so it never shows pale paper through its soft edge', () => {
    const source = pixels(12, 3);
    const guide = new Uint8ClampedArray(source.data.length);
    for (let y = 0; y < 3; y++) for (let x = 5; x < 8; x++) guide[(y * 12 + x) * 4 + 3] = 140;
    const region = floodRegion(source, { x: 0, y: 1 }, 32, guide)!;
    expect(region.bounds.w).toBe(5);
    const under = paintRegion(source, region, red, { foreground: guide, fringe: true })!;
    expect(get(under.data, 12, 5, 1)).toEqual([200, 24, 28]);
    expect(get(under.data, 12, 6, 1)).toEqual([200, 24, 28]);
    expect(get(under.data, 12, 7, 1)).toEqual([255, 255, 255]);
    expect(floodFill(source, { x: 0, y: 1 }, red, 32, guide)?.dirty).toEqual({ x: 0, y: 0, w: 5, h: 3 });
  });
});

describe('speed of a full-page fill', () => {
  /** A page with a line down one side, so the fringe repair has an edge to work on. */
  function page() {
    const source = pixels(1600, 1200);
    for (let y = 0; y < 1200; y++) {
      source.data.set([0, 0, 0, 255], (y * 1600 + 4) * 4);
      source.data.set([128, 128, 128, 255], (y * 1600 + 5) * 4);
    }
    return source;
  }

  it('takes under 150 ms for every kind of fill', () => {
    const source = page();
    const timings: Record<string, number> = {};
    for (const mode of ['solid', 'linear', 'radial', 'stripes', 'dots', 'checks', 'waves', 'bricks'] as const) {
      // Best of three, so a busy machine does not turn a timing into noise.
      let best = Infinity;
      for (let run = 0; run < 3; run++) {
        const start = performance.now();
        const region = floodRegion(source, { x: 800, y: 600 }, 32);
        const gradient = { from: { x: 100, y: 100 }, to: { x: 1500, y: 1100 } };
        const result = paintRegion(source, region!, fillPainter(mode, '#497dbb', gradient), { fringe: true });
        best = Math.min(best, performance.now() - start);
        expect(result?.dirty.w).toBeGreaterThan(1500);
      }
      timings[mode] = Math.round(best);
      expect(best, `${mode} took ${best} ms`).toBeLessThan(timeBudget(150));
    }
    console.info('full-page fill timings (ms):', JSON.stringify(timings));
  });
});
