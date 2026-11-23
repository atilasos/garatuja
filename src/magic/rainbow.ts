import type { MagicEffect, Point } from '../core/types';
import { DirtyTracker } from './_util/c-geom';

const colors = ['#e55b54', '#f09d3e', '#f7d459', '#4fad7b', '#529cd6', '#9d6cc4'];

let lastPerp: Point = { x: 0, y: 1 };
let lastBands: Point[] | null = null;

export default {
  id: 'rainbow',
  label: { pt: 'Arco-íris', en: 'Rainbow' },
  hint: { pt: 'Arrasta para pintar uma fita de arco-íris.', en: 'Drag to paint a rainbow ribbon.' },
  category: 'pintar',
  level: 1,
  order: 10,
  usesColor: false,
  begin() {
    lastPerp = { x: 0, y: 1 };
    lastBands = null;
  },
  stroke(from, to, c, size) {
    const ctx = c.ctx;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.5) {
      let nx = -dy / dist;
      let ny = dx / dist;
      if (nx * lastPerp.x + ny * lastPerp.y < 0) {
        nx = -nx;
        ny = -ny;
      }
      lastPerp = {
        x: lastPerp.x * 0.45 + nx * 0.55,
        y: lastPerp.y * 0.45 + ny * 0.55,
      };
      const len = Math.hypot(lastPerp.x, lastPerp.y) || 1;
      lastPerp = { x: lastPerp.x / len, y: lastPerp.y / len };
    }

    const band = size / colors.length;
    const dirty = new DirtyTracker();
    const nextBands: Point[] = [];
    const pad = band * 0.65 + 2;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = band + 0.8;

    colors.forEach((color, i) => {
      const offset = (i + 0.5) * band - size / 2;
      const start = lastBands ? lastBands[i] : { x: from.x + lastPerp.x * offset, y: from.y + lastPerp.y * offset };
      const end = { x: to.x + lastPerp.x * offset, y: to.y + lastPerp.y * offset };
      nextBands.push(end);

      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x + 0.05, end.y);
      ctx.stroke();

      dirty.addSegment(start, end, pad);
    });

    // Subtle sunlit shimmer down the center of the ribbon
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = Math.max(1, size * 0.08);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x + 0.05, to.y);
    ctx.stroke();
    dirty.addSegment(from, to, size * 0.08 + 2);

    ctx.restore();
    lastBands = nextBands;
    dirty.flush(c);
  },
} satisfies MagicEffect;
