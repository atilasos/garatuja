import { expect, it } from 'vitest';
import { applyDelta, bitmapDelta, History, pixelPatch } from '../../src/core/history';

it('retains byte-identical before and after pixels in the smallest rectangle', () => {
  const before = new Uint8ClampedArray(5 * 4 * 4).fill(255);
  const after = before.slice();
  after.set([40, 90, 100, 255], (5 + 2) * 4);
  after.set([15, 60, 150, 255], (10 + 3) * 4);
  const area = { x: 19, y: 45, w: 5, h: 4 };
  const patch = pixelPatch(area, before, after);
  expect(patch?.area).toEqual({ x: 21, y: 46, w: 2, h: 2 });
  expect(pixelPatch(area, before, before)).toBeUndefined();
  const history = new History();
  if (!patch) throw new Error('Missing patch');
  expect(history.add({ bitmap: bitmapDelta(patch) })).toBe(true);
  const page = after.slice();
  const apply = (direction: 'before' | 'after') => {
    const step = (direction === 'before' ? history.undo() : history.redo())?.bitmap;
    if (!step) throw new Error('Missing patch');
    for (let row = 0; row < step.area.h; row++) {
      const width = step.area.w * 4;
      const offset = ((step.area.y - area.y + row) * area.w + step.area.x - area.x) * 4;
      applyDelta(page.subarray(offset, offset + width), {
        ...step, xor: step.xor.subarray(row * step.area.w * 3, (row + 1) * step.area.w * 3),
      });
    }
  };
  apply('before');
  expect(page).toEqual(before);
  apply('after');
  expect(page).toEqual(after);
});

it('keeps at least 30 steps, bounds memory, and clears redo when branching', () => {
  const patch = pixelPatch({ x: 0, y: 0, w: 1, h: 1 }, new Uint8ClampedArray([0, 0, 0, 255]), new Uint8ClampedArray([3, 6, 7, 255]));
  if (!patch) throw new Error('Missing patch');
  const bitmap = bitmapDelta(patch);
  const history = new History(3 * 30);
  for (let i = 0; i < 40; i++) history.add({ bitmap });
  for (let i = 0; i < 30; i++) expect(history.undo()?.bitmap).toBe(bitmap);
  expect(history.canUndo).toBe(false);
  expect(history.canRedo).toBe(true);
  history.add({ bitmap });
  expect(history.canRedo).toBe(false);
});

it('can undo and redo a label-only gesture', () => {
  const history = new History();
  const labels = { before: [], after: [{ id: 'label', kind: 'text', x: 2, y: 3, text: 'Olá', font: 'Andika', size: 20, color: '#000000' }] } as const;
  history.add({ labels: { before: [], after: [...labels.after] } });
  expect(history.undo()?.labels?.before).toEqual([]);
  expect(history.redo()?.labels?.after).toEqual(labels.after);
});
