import { seededRandom } from '../core/draw';
import type { MagicEffect, Point } from '../core/types';
import { DirtyTracker } from './_util/c-geom';

let startPt: Point = { x: 0, y: 0 };
let boltSeed = 1;

function subdivideBolt(a: Point, b: Point, jitter: number, depth: number, rand: () => number): Point[] {
  if (depth <= 0) return [a, b];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const offset = (rand() - 0.5) * jitter;
  const mid: Point = {
    x: (a.x + b.x) * 0.5 + nx * offset,
    y: (a.y + b.y) * 0.5 + ny * offset,
  };
  const left = subdivideBolt(a, mid, jitter * 0.55, depth - 1, rand);
  const right = subdivideBolt(mid, b, jitter * 0.55, depth - 1, rand);
  return [...left.slice(0, -1), ...right];
}

function renderBolt(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  size: number,
  seed: number,
  dirty?: DirtyTracker,
) {
  const rand = seededRandom(seed);
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  // If user tapped in place, shoot a short downward crackle
  const end: Point = dist < 4 ? { x: from.x + size * 0.2, y: from.y + size * 1.1 } : to;
  const boltLen = Math.hypot(end.x - from.x, end.y - from.y);
  const depth = boltLen > 120 ? 5 : 4;
  const main = subdivideBolt(from, end, Math.min(boltLen * 0.32, size * 1.3), depth, rand);

  // Build 2-3 forked electric side branches
  const branches: Point[][] = [];
  const branchCount = boltLen > 70 ? 3 : 2;
  for (let i = 0; i < branchCount; i++) {
    const idx = Math.max(1, Math.min(main.length - 2, Math.floor(((i + 1) / (branchCount + 1)) * main.length)));
    const origin = main[idx];
    const baseAngle = Math.atan2(end.y - from.y, end.x - from.x);
    const side = i % 2 === 0 ? 1 : -1;
    const branchAngle = baseAngle + side * (0.45 + rand() * 0.55);
    const branchLen = boltLen * (0.24 + rand() * 0.22);
    const tip: Point = {
      x: origin.x + Math.cos(branchAngle) * branchLen,
      y: origin.y + Math.sin(branchAngle) * branchLen,
    };
    branches.push(subdivideBolt(origin, tip, branchLen * 0.28, 3, rand));
  }

  const strokePath = (pts: Point[]) => {
    ctx.beginPath();
    pts.forEach((pt, idx) => (idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
    ctx.stroke();
  };

  const outerW = Math.max(5, size * 0.34);
  const midW = Math.max(3, size * 0.17);
  const coreW = Math.max(1.4, size * 0.075);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Outer electric blue-violet glow
  ctx.strokeStyle = 'rgba(84, 148, 245, 0.32)';
  ctx.lineWidth = outerW;
  strokePath(main);
  ctx.lineWidth = outerW * 0.65;
  for (const b of branches) strokePath(b);

  // Vivid electric cyan-blue aura
  ctx.strokeStyle = 'rgba(116, 198, 255, 0.85)';
  ctx.lineWidth = midW;
  strokePath(main);
  ctx.lineWidth = midW * 0.62;
  for (const b of branches) strokePath(b);

  // Dazzling bright yellow-white bolt core
  ctx.strokeStyle = '#fffce0';
  ctx.lineWidth = coreW;
  strokePath(main);
  ctx.lineWidth = Math.max(1, coreW * 0.62);
  for (const b of branches) strokePath(b);

  ctx.restore();

  if (dirty) {
    const pad = outerW * 0.6 + 3;
    const record = (pts: Point[]) => {
      for (let i = 1; i < pts.length; i++) dirty.addSegment(pts[i - 1], pts[i], pad);
    };
    record(main);
    for (const b of branches) record(b);
  }
}

export default {
  id: 'lightning',
  label: { pt: 'Relâmpago', en: 'Lightning' },
  hint: { pt: 'Arrasta do início ao fim para lançar um relâmpago.', en: 'Drag from start to end to strike a lightning bolt.' },
  category: 'pintar',
  level: 2,
  order: 125,
  usesColor: false,
  begin(p, c) {
    startPt = { x: p.x, y: p.y };
    boltSeed = Math.max(1, Math.floor(c.random() * 0x7fffffff));
  },
  stroke(_from, to, c, size) {
    c.clearOverlay();
    renderBolt(c.overlay, startPt, to, size, boltSeed);
  },
  end(p, c, size) {
    c.clearOverlay();
    const dirty = new DirtyTracker();
    renderBolt(c.ctx, startPt, p, size, boltSeed, dirty);
    dirty.flush(c);
  },
} satisfies MagicEffect;
