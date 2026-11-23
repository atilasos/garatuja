import { describe, expect, it } from 'vitest';
import { hexToRgb } from '../../src/core/draw';
import { hsl, mix, rgba, shade, speedWidth, stepIndex } from '../../src/core/tooling/brush-kit';
import { BrushStroke, brushGroup } from '../../src/core/tooling/brush-stroke';
import type { BrushDab, BrushDef, PaintPointer } from '../../src/core/types';

const pointer = (x: number, y: number, t = 0, pressure = .5): PaintPointer => ({ x, y, t, pressure, pointerType: 'mouse', constrain: false });

/** A brush that only records where it was asked to paint. */
function recorder(spacing = .25, extent?: number) {
  const dabs: BrushDab[] = [];
  const brush: BrushDef = { id: 'test', label: { pt: 'Teste', en: 'Test' }, order: 1, level: 1, spacing, extent, dab: (_ctx, d) => { dabs.push({ ...d }); } };
  return { dabs, brush };
}

const ctx = {} as CanvasRenderingContext2D;
const random = () => .5;

function freehand(brush: BrushDef, size: number, points: PaintPointer[]) {
  const stroke = new BrushStroke(brush, size, '#000000', random);
  const rects = [stroke.start(ctx, points[0])];
  for (const p of points.slice(1)) rects.push(stroke.extend(ctx, p));
  rects.push(stroke.finish(ctx));
  return { stroke, rects };
}

describe('freehand strokes', () => {
  it('leave one dab for a tap', () => {
    const { dabs, brush } = recorder();
    freehand(brush, 40, [pointer(300, 200)]);
    expect(dabs).toHaveLength(1);
    expect(dabs[0]).toMatchObject({ x: 300, y: 200, travelled: 0 });
  });

  it('start only once the direction is known, and start facing the way the hand moves', () => {
    const { dabs, brush } = recorder();
    freehand(brush, 40, [pointer(100, 100), pointer(100, 400, 30)]);
    expect(dabs[0]).toMatchObject({ x: 100, y: 100 });
    // Moving straight down: every dab, the first included, faces down.
    for (const dab of dabs) expect(dab.angle).toBeCloseTo(Math.PI / 2, 1);
  });

  it('paint at once when given the page as it was, then repaint the first dab facing the right way', () => {
    const { dabs, brush } = recorder();
    const calls: unknown[][] = [];
    const surface = { canvas: { width: 1600, height: 1200 }, save() {}, restore() {}, setTransform() {}, beginPath() {}, rect() {}, clip() {},
      drawImage: (...args: unknown[]) => calls.push(args) } as unknown as CanvasRenderingContext2D;
    const snapshot = {} as CanvasImageSource;
    const stroke = new BrushStroke(brush, 40, '#000000', random);
    stroke.start(surface, pointer(100, 100), snapshot);
    // A press shows up straight away, before the hand has moved.
    expect(dabs).toHaveLength(1);
    expect(dabs[0]).toMatchObject({ x: 100, y: 100, angle: 0 });
    stroke.extend(surface, pointer(100, 400, 30));
    stroke.finish(surface);
    // Once the direction is known the pixels under the first dab are restored from the snapshot and it is painted again.
    expect(calls.some(call => call[0] === snapshot)).toBe(true);
    const again = dabs.filter(d => d.x === 100 && d.y === 100);
    expect(again).toHaveLength(2);
    expect(again[1].angle).toBeCloseTo(Math.PI / 2, 1);
  });

  it('space dabs evenly along the path, carrying the distance across samples', () => {
    const { dabs, brush } = recorder(.25);
    freehand(brush, 40, [pointer(0, 0), pointer(37, 0, 10), pointer(81, 0, 20), pointer(150, 0, 30), pointer(300, 0, 40)]);
    const xs = dabs.map(d => d.x);
    for (let i = 2; i < xs.length - 1; i++) expect(xs[i] - xs[i - 1]).toBeCloseTo(10, 0);
    expect(xs[xs.length - 1]).toBeGreaterThan(285);
    expect(dabs.map(d => d.travelled)).toEqual([...dabs.map(d => d.travelled)].sort((a, b) => a - b));
  });

  it('round off a corner instead of drawing it as two straight segments', () => {
    const { dabs, brush } = recorder(.1);
    freehand(brush, 20, [pointer(100, 400), pointer(500, 400, 20), pointer(500, 800, 40)]);
    const corner = { x: 500, y: 400 };
    const nearest = Math.min(...dabs.map(d => Math.hypot(d.x - corner.x, d.y - corner.y)));
    // The curve runs from (300,400) to (500,600) with the corner as control point: it passes (450,450),
    // about 71 px from the corner. A polyline would pass straight through it.
    expect(nearest).toBeGreaterThan(65);
    expect(nearest).toBeLessThan(78);
    const xs = dabs.map(d => d.x);
    const ys = dabs.map(d => d.y);
    expect(Math.max(...xs)).toBeLessThanOrEqual(500.5);
    expect(Math.max(...ys)).toBeGreaterThan(790);
    // The direction turns gradually through the corner, not in one jump.
    let biggestTurn = 0;
    for (let i = 1; i < dabs.length; i++) biggestTurn = Math.max(biggestTurn, Math.abs(dabs[i].angle - dabs[i - 1].angle));
    expect(biggestTurn).toBeLessThan(.25);
  });

  it('report a dirty area that covers every dab, whatever the brush reaches', () => {
    for (const extent of [undefined, 1, 3]) {
      const { dabs, brush } = recorder(.2, extent);
      const { rects, stroke } = freehand(brush, 30, [pointer(200, 200), pointer(260, 330, 10), pointer(150, 420, 20), pointer(400, 470, 30), pointer(420, 100, 40)]);
      const reach = 30 * (extent ?? 1.5);
      expect(stroke.padding).toBeGreaterThanOrEqual(reach);
      for (const dab of dabs) {
        const covering = rects.some(r => dab.x - reach >= r.x - 1 && dab.x + reach <= r.x + r.w + 1 && dab.y - reach >= r.y - 1 && dab.y + reach <= r.y + r.h + 1);
        expect(covering, `dab at ${dab.x.toFixed(0)},${dab.y.toFixed(0)} is outside every reported area`).toBe(true);
      }
    }
  });

  it('tell the brush how fast the hand is moving', () => {
    const slow = recorder(.2);
    freehand(slow.brush, 30, Array.from({ length: 12 }, (_, i) => pointer(100 + i * 5, 100, i * 20)));
    const fast = recorder(.2);
    freehand(fast.brush, 30, Array.from({ length: 12 }, (_, i) => pointer(100 + i * 60, 100, i * 10)));
    const last = (dabs: BrushDab[]) => dabs[dabs.length - 1].speed ?? 0;
    expect(last(fast.dabs)).toBeGreaterThan(last(slow.dabs) * 5);
    expect(speedWidth(last(fast.dabs))).toBeLessThan(speedWidth(last(slow.dabs)));
  });

  it('interpolate pressure along the stroke', () => {
    const { dabs, brush } = recorder(.2);
    freehand(brush, 30, [pointer(0, 0, 0, .2), pointer(200, 0, 10, .9), pointer(400, 0, 20, .9)]);
    expect(dabs[0].pressure).toBeCloseTo(.2, 1);
    expect(dabs[dabs.length - 1].pressure).toBeCloseTo(.9, 1);
    const mid = dabs.find(d => d.x > 190 && d.x < 210);
    expect(mid?.pressure).toBeGreaterThan(.3);
  });
});

describe('straight strokes', () => {
  it('paint both ends, face along the line and stay straight', () => {
    const { dabs, brush } = recorder(.25);
    const stroke = new BrushStroke(brush, 40, '#000000', random);
    const bounds = stroke.line(ctx, pointer(100, 100), pointer(400, 100), 0);
    expect(dabs[0]).toMatchObject({ x: 100, y: 100, angle: 0 });
    expect(dabs[dabs.length - 1]).toMatchObject({ x: 400, y: 100 });
    expect(dabs.every(d => d.y === 100 && d.angle === 0)).toBe(true);
    expect(bounds.x).toBeLessThanOrEqual(100 - stroke.padding + 1);
  });
});

describe('brush helpers', () => {
  it('mix, shade and convert colours', () => {
    expect(mix('#000000', '#ffffff', .5)).toBe('#808080');
    expect(rgba('#ff0000', .5)).toBe('rgba(255,0,0,0.5)');
    expect(hexToRgb(shade('#808080', .2)).r).toBeGreaterThan(128);
    expect(hexToRgb(shade('#808080', -.2)).r).toBeLessThan(128);
    expect(hsl(120, 1, .5)).toBe('#00ff00');
  });

  it('alternates feet and leaves by distance', () => {
    expect(stepIndex(0, 40, 1.25)).toBe(0);
    expect(stepIndex(50, 40, 1.25)).toBe(1);
    expect(stepIndex(101, 40, 1.25)).toBe(2);
  });

  it('makes wide strokes for slow hands and thin ones for fast hands', () => {
    expect(speedWidth(0)).toBeGreaterThan(speedWidth(1));
    expect(speedWidth(1)).toBeGreaterThan(speedWidth(4));
    expect(speedWidth(100)).toBeGreaterThan(0);
    expect(speedWidth(undefined)).toBeGreaterThan(0);
  });

  it('groups brushes by order band', () => {
    const group = (order: number) => brushGroup({ order } as BrushDef).pt;
    expect(group(10)).toBe('Básicos');
    expect(group(150)).toBe('Texturas');
    expect(group(230)).toBe('Efeitos');
    expect(group(340)).toBe('Trilhos');
  });
});
