import { seededRandom } from '../../src/core/draw';
import { magic } from '../../src/core/registry';
import type { PaintPointer, ToolContext } from '../../src/core/types';
import { makeCanvas } from './soft-canvas';
import { describe, expect, it } from 'vitest';

function pointer(x: number, y: number): PaintPointer {
  return { x, y, t: 0, pressure: .5, pointerType: 'mouse', constrain: false };
}

function scene(width = 96, height = 64, color = '#118866') {
  const page = makeCanvas(width, height);
  const paper = makeCanvas(width, height);
  const snapshot = makeCanvas(width, height);
  const overlay = makeCanvas(width, height);
  const ctx = page.getContext('2d');
  const paperCtx = paper.getContext('2d');
  const snapCtx = snapshot.getContext('2d');
  if (!ctx || !paperCtx || !snapCtx) throw new Error('Canvas 2D is unavailable');
  const paint = (target: CanvasRenderingContext2D, quadrant: boolean) => {
    if (!quadrant) {
      target.fillStyle = '#fffdf8';
      target.fillRect(0, 0, width, height);
      return;
    }
    target.fillStyle = '#e23b3b';
    target.fillRect(0, 0, width / 2, height / 2);
    target.fillStyle = '#2f9e44';
    target.fillRect(width / 2, 0, width / 2, height / 2);
    target.fillStyle = '#1c7ed6';
    target.fillRect(0, height / 2, width / 2, height / 2);
    target.fillStyle = '#f59f00';
    target.fillRect(width / 2, height / 2, width / 2, height / 2);
  };
  paint(ctx, true);
  paint(paperCtx, false);
  snapCtx.drawImage(page, 0, 0);
  let dirty = false;
  const context: ToolContext = {
    width, height, ctx, color, overlay: overlay.getContext('2d') ?? ctx,
    paper, snapshot, foreground: null,
    opt<T extends string | number | boolean>(id: string) {
      if (id === 'size') return 32 as T;
      if (id === 'whole') return false as T;
      if (id === 'effect') return 'rainbow' as T;
      return false as T;
    },
    markDirty() { dirty = true; },
    markAllDirty() { dirty = true; },
    clearOverlay() { overlay.getContext('2d')?.clearRect(0, 0, width, height); },
    commit() {},
    rollback() { snapCtx.drawImage(page, 0, 0); },
    random: seededRandom(4),
    sound() {},
    say() {},
    labels: { list: () => [], add() {}, update() {}, remove() {}, at: () => undefined },
  };
  const pixels = () => Array.from(ctx.getImageData(0, 0, width, height).data);
  return { context, pixels, dirty: () => dirty };
}

describe('magic effects', () => {
  it('registers at least forty effects and ignores helper files', () => {
    const effects = magic.all();
    expect(effects.length).toBeGreaterThanOrEqual(40);
    expect(new Set(effects.map(effect => effect.id)).size).toBe(effects.length);
    expect(effects.every(effect => !effect.id.startsWith('_'))).toBe(true);
    expect(effects.filter(effect => effect.level === 1).length).toBeGreaterThanOrEqual(12);
  });

  it.each(magic.all().map(effect => [effect.id, effect] as const))('%s changes opaque pixels and marks the page dirty', (_id, effect) => {
    const { context, pixels, dirty } = scene();
    const before = pixels();
    const size = 28;
    if (effect.whole) {
      const point = pointer(12, 12);
      effect.begin?.(point, context, size);
      effect.whole(context);
      effect.end?.(point, context, size);
    } else if (effect.stroke) {
      const from = pointer(8, 16);
      const to = pointer(78, 46);
      effect.begin?.(from, context, size);
      effect.stroke(from, to, context, size);
      effect.end?.(to, context, size);
    }
    const after = pixels();
    expect(after).not.toEqual(before);
    expect(dirty()).toBe(true);
    for (let i = 3; i < after.length; i += 4) expect(after[i]).toBe(255);
  });

  it('filters a full page within the budget', () => {
    const { context } = scene(1600, 1200);
    const samples = ['gray', 'waves', 'frame'].map(id => magic.get(id));
    for (const effect of samples) {
      if (!effect?.whole) throw new Error('Missing whole-page sample');
      const started = performance.now();
      effect.whole(context);
      expect(performance.now() - started).toBeLessThan(500);
    }
  });
});
