import { copyCanvas, viewport } from '../canvas';
import { seededRandom } from '../draw';
import type { MagicEffect, PaintPointer, ToolContext } from '../types';

const thumbnails = new Map<MagicEffect, { color: string; image: HTMLCanvasElement }>();

function makeThumbnail(effect: MagicEffect, color: string) {
  const width = 144;
  const height = 100;
  const ctx = viewport(width, height, true, true);
  const paper = viewport(width, height, true);
  const overlay = viewport(width, height);
  const snapshot = viewport(width, height, true, true);
  paper.fillStyle = '#f8eed7';
  paper.fillRect(0, 0, width, height);
  copyCanvas(ctx, paper.canvas);
  ctx.fillStyle = '#4b9687';
  ctx.beginPath();
  ctx.arc(54, 45, 25, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = '#bd6264';
  ctx.fillRect(70, 37, 43, 42);
  ctx.fillStyle = '#f1b960';
  ctx.fillRect(34, 60, 81, 13);
  copyCanvas(snapshot, ctx.canvas);

  const empty = () => {};
  const context: ToolContext = {
    width, height, ctx, color, overlay, paper: paper.canvas, snapshot: snapshot.canvas, foreground: null,
    opt() { throw new Error('Magic effects receive their size as an argument'); },
    markDirty: empty, markAllDirty: empty, clearOverlay: () => overlay.clearRect(0, 0, width, height),
    commit: empty, rollback: () => copyCanvas(ctx, snapshot.canvas),
    random: seededRandom(10), sound: empty, say: empty,
    labels: { list: () => [], add: empty, update: empty, remove: empty, at: () => undefined },
  };
  const sample = (x: number, y: number, t: number): PaintPointer =>
    ({ x, y, t, pressure: .5, pointerType: 'mouse', constrain: false });
  if (effect.stroke) {
    const start = sample(20, 67, 0);
    effect.begin?.(start, context, 25);
    effect.stroke(start, start, context, 25);
    let last = start;
    for (let i = 1; i <= 13; i++) {
      const next = sample(20 + i * 8, 67 - Math.sin(i * Math.PI / 16) * 36, i * 16);
      effect.stroke(last, next, context, 25);
      last = next;
    }
    effect.end?.(last, context, 25);
  } else effect.whole?.(context);
  ctx.drawImage(overlay.canvas, 0, 0);
  return ctx.canvas;
}

export function previewMagic(effect: MagicEffect, ctx: CanvasRenderingContext2D, w: number, h: number, color: string) {
  const key = effect.usesColor ? color : '#342a28';
  let cached = thumbnails.get(effect);
  if (cached?.color !== key) {
    cached = { color: key, image: makeThumbnail(effect, key) };
    thumbnails.set(effect, cached);
  }
  ctx.drawImage(cached.image, 0, 0, w, h);
}
