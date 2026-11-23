import { copyCanvas, viewport } from '../canvas';
import { seededRandom } from '../draw';
import type { MagicEffect, PaintPointer, ToolContext } from '../types';

const THUMB_W = 240;
const THUMB_H = 165;
const BATCH = 3;

interface Thumb {
  color: string;
  image: HTMLCanvasElement;
}

interface Waiter {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
}

interface Job {
  effect: MagicEffect;
  color: string;
  key: string;
  waiters: Waiter[];
}

const cache = new Map<string, Thumb>();
const queued = new Map<string, Job>();
const pending: Job[] = [];
let pumping = false;

function drawSample(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#7ec8e3';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#f6d365';
  ctx.beginPath();
  ctx.arc(w * 0.8, h * 0.22, h * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6fbf73';
  ctx.fillRect(0, h * 0.72, w, h * 0.28);
  ctx.fillStyle = '#8d6e63';
  ctx.fillRect(w * 0.16, h * 0.5, w * 0.045, h * 0.26);
  ctx.fillStyle = '#2e7d32';
  ctx.beginPath();
  ctx.arc(w * 0.18, h * 0.48, h * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e07a5f';
  ctx.fillRect(w * 0.4, h * 0.46, w * 0.3, h * 0.28);
  ctx.fillStyle = '#6d4c41';
  ctx.beginPath();
  ctx.moveTo(w * 0.36, h * 0.48);
  ctx.lineTo(w * 0.55, h * 0.26);
  ctx.lineTo(w * 0.74, h * 0.48);
  ctx.fill();
  ctx.fillStyle = '#f2cc8f';
  ctx.fillRect(w * 0.52, h * 0.58, w * 0.07, h * 0.16);
  ctx.fillStyle = '#f7fbff';
  ctx.fillRect(w * 0.44, h * 0.54, w * 0.07, h * 0.09);
}

function samplePointer(x: number, y: number, t: number): PaintPointer {
  return { x, y, t, pressure: .5, pointerType: 'mouse', constrain: false };
}

function makeThumbnail(effect: MagicEffect, color: string) {
  const width = THUMB_W;
  const height = THUMB_H;
  const ctx = viewport(width, height, true, true);
  const paper = viewport(width, height, true);
  const overlay = viewport(width, height);
  const snapshot = viewport(width, height, true, true);
  paper.fillStyle = '#fff8ee';
  paper.fillRect(0, 0, width, height);
  drawSample(ctx, width, height);
  copyCanvas(snapshot, ctx.canvas);
  const empty = () => {};
  const context: ToolContext = {
    width, height, ctx, color, overlay, paper: paper.canvas, snapshot: snapshot.canvas, foreground: null,
    opt<T extends string | number | boolean>(id: string) {
      if (id === 'size') return 32 as T;
      if (id === 'whole') return false as T;
      if (id === 'effect') return effect.id as T;
      return false as T;
    },
    markDirty: empty, markAllDirty: empty, clearOverlay: () => overlay.clearRect(0, 0, width, height),
    commit: empty, rollback: () => copyCanvas(ctx, snapshot.canvas),
    random: seededRandom(10), sound: empty, say: empty,
    labels: { list: () => [], add: empty, update: empty, remove: empty, at: () => undefined },
  };
  const house = samplePointer(width * 0.5, height * 0.6, 0);
  const whole = Boolean(effect.whole && (!effect.stroke || effect.category === 'cor' || effect.category === 'pagina'));
  if (whole) {
    effect.begin?.(house, context, 36);
    effect.whole?.(context);
    effect.end?.(house, context, 36);
  } else if (effect.stroke) {
    const brush = Math.round(Math.min(width, height) * 0.72);
    const start = samplePointer(width * 0.28, height * 0.58, 0);
    effect.begin?.(start, context, brush);
    effect.stroke(start, start, context, brush);
    let last = start;
    for (let i = 1; i <= 8; i++) {
      const next = samplePointer(width * (0.28 + i * 0.07), height * (0.56 - Math.sin(i / 8 * Math.PI) * 0.16), i * 20);
      effect.stroke(last, next, context, brush);
      last = next;
    }
    effect.end?.(last, context, brush);
  }
  ctx.drawImage(overlay.canvas, 0, 0);
  return ctx.canvas;
}

function paint(waiter: Waiter, image: HTMLCanvasElement) {
  waiter.ctx.drawImage(image, 0, 0, waiter.w, waiter.h);
  const node = waiter.ctx.canvas as HTMLCanvasElement & { sourceThumb?: HTMLCanvasElement };
  node.sourceThumb = image;
  node.dataset.magicReady = '1';
}

function placeholder(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#f4ead6';
  ctx.fillRect(0, 0, w, h);
}

function pump() {
  pumping = false;
  const started = performance.now();
  let count = 0;
  while (pending.length && count < BATCH && performance.now() - started < 12) {
    const job = pending.shift();
    if (!job) break;
    queued.delete(job.key);
    let image: HTMLCanvasElement;
    try {
      image = makeThumbnail(job.effect, job.color);
    } catch (error) {
      console.error(job.effect.id, error);
      const fallback = viewport(THUMB_W, THUMB_H, true);
      fallback.fillStyle = '#f4ead6';
      fallback.fillRect(0, 0, THUMB_W, THUMB_H);
      image = fallback.canvas;
    }
    cache.set(job.key, { color: job.color, image });
    for (const waiter of job.waiters) {
      if (waiter.ctx.canvas.isConnected) paint(waiter, image);
    }
    count++;
  }
  if (pending.length) schedule();
}

function schedule() {
  if (pumping) return;
  pumping = true;
  const next = () => pump();
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(next);
  else setTimeout(next, 16);
}

export function previewMagic(effect: MagicEffect, ctx: CanvasRenderingContext2D, w: number, h: number, color: string) {
  const key = effect.id + ':' + (effect.usesColor ? color : '');
  const cached = cache.get(key);
  if (cached) {
    paint({ ctx, w, h }, cached.image);
    return;
  }
  placeholder(ctx, w, h);
  const waiter = { ctx, w, h };
  const existing = queued.get(key);
  if (existing) {
    existing.waiters.push(waiter);
    return;
  }
  const job: Job = { effect, color, key, waiters: [waiter] };
  queued.set(key, job);
  pending.push(job);
  schedule();
}
