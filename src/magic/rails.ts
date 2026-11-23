import { interpolateDabs } from '../core/draw';
import type { MagicEffect, Point } from '../core/types';
import { DirtyTracker } from './_util/c-geom';

let remaining = 0;
let prevLeft: Point | null = null;
let prevRight: Point | null = null;

function drawSleeper(ctx: CanvasRenderingContext2D, p: Point, angle: number, size: number, dirty: DirtyTracker) {
  const halfLen = size * 0.48;
  const thick = Math.max(3, size * 0.15);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle + Math.PI / 2);

  // Wooden tie body
  ctx.fillStyle = '#7e5333';
  ctx.strokeStyle = '#4e311c';
  ctx.lineWidth = Math.max(1, size * 0.03);
  ctx.fillRect(-halfLen, -thick / 2, halfLen * 2, thick);
  ctx.strokeRect(-halfLen, -thick / 2, halfLen * 2, thick);

  // Subtle wood highlight
  ctx.fillStyle = 'rgba(205, 160, 114, 0.35)';
  ctx.fillRect(-halfLen + 1, -thick / 2 + 1, halfLen * 2 - 2, thick * 0.38);
  ctx.restore();

  dirty.addPoint(p.x, p.y, Math.hypot(halfLen, thick) + 3);
}

function drawRailSegment(
  ctx: CanvasRenderingContext2D,
  a: Point,
  b: Point,
  railW: number,
  dirty: DirtyTracker,
) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Steel outer rail
  ctx.strokeStyle = '#55606e';
  ctx.lineWidth = railW;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x + 0.05, b.y);
  ctx.stroke();

  // Metallic silver top highlight
  ctx.strokeStyle = '#d3dce6';
  ctx.lineWidth = Math.max(1, railW * 0.42);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x + 0.05, b.y);
  ctx.stroke();
  ctx.restore();
  dirty.addSegment(a, b, railW + 2);
}

export default {
  id: 'rails',
  label: { pt: 'Carris', en: 'Train tracks' },
  hint: { pt: 'Arrasta para desenhar carris de comboio.', en: 'Drag to lay train tracks.' },
  category: 'pintar',
  level: 1,
  order: 114,
  usesColor: false,
  begin() {
    remaining = 0;
    prevLeft = null;
    prevRight = null;
  },
  stroke(from, to, c, size) {
    const ctx = c.ctx;
    const dirty = new DirtyTracker();
    const gauge = size * 0.3;
    const railW = Math.max(2.5, size * 0.11);
    const sleeperSpacing = Math.max(7, size * 0.34);

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 0.5) {
      // Initial tap draws a neat horizontal mini-track piece
      const half = size * 0.25;
      drawSleeper(ctx, to, 0, size, dirty);
      const l1 = { x: to.x - half, y: to.y - gauge };
      const l2 = { x: to.x + half, y: to.y - gauge };
      const r1 = { x: to.x - half, y: to.y + gauge };
      const r2 = { x: to.x + half, y: to.y + gauge };
      drawRailSegment(ctx, l1, l2, railW, dirty);
      drawRailSegment(ctx, r1, r2, railW, dirty);
      remaining = sleeperSpacing * 0.5;
      dirty.flush(c);
      return;
    }

    const angle = Math.atan2(dy, dx);
    const nx = -dy / dist;
    const ny = dx / dist;

    // 1. Lay wooden sleepers underneath
    remaining = interpolateDabs(from, to, sleeperSpacing, remaining, p => {
      drawSleeper(ctx, p, angle, size, dirty);
    });

    // 2. Connect continuous steel rails on top of the sleepers
    const curLeft: Point = { x: to.x + nx * gauge, y: to.y + ny * gauge };
    const curRight: Point = { x: to.x - nx * gauge, y: to.y - ny * gauge };
    const startLeft = prevLeft ?? { x: from.x + nx * gauge, y: from.y + ny * gauge };
    const startRight = prevRight ?? { x: from.x - nx * gauge, y: from.y - ny * gauge };

    drawRailSegment(ctx, startLeft, curLeft, railW, dirty);
    drawRailSegment(ctx, startRight, curRight, railW, dirty);

    prevLeft = curLeft;
    prevRight = curRight;
    dirty.flush(c);
  },
} satisfies MagicEffect;
