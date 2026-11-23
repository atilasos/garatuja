import type { MagicEffect, Point } from '../core/types';
import { highlightTint, rgba, shiftColor } from './_util/c-color';
import { DirtyTracker } from './_util/c-geom';

const sectors = 6;
let travelled = 0;

function transformPt(p: Point, cx: number, cy: number, cos: number, sin: number, mirror: boolean): Point {
  const dx = p.x - cx;
  const dy = mirror ? -(p.y - cy) : p.y - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

export default {
  id: 'paint-kaleidoscope',
  label: { pt: 'Pincel caleidoscópio', en: 'Kaleidoscope brush' },
  hint: { pt: 'Arrasta para pintar um caleidoscópio colorido.', en: 'Drag to paint a colorful kaleidoscope.' },
  category: 'padroes',
  level: 2,
  order: 404,
  usesColor: true,
  begin() {
    travelled = 0;
  },
  stroke(from, to, c, size) {
    const ctx = c.ctx;
    const dirty = new DirtyTracker();
    const cx = c.width * 0.5;
    const cy = c.height * 0.5;
    const width = Math.max(2.4, size * 0.26);
    travelled += Math.hypot(to.x - from.x, to.y - from.y);

    const baseHueShift = (travelled * 0.65) % 360;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < sectors; i++) {
      const angle = (i * Math.PI * 2) / sectors;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const petalColor = shiftColor(c.color, baseHueShift + i * 28, 0.08, 0);
      const innerShine = rgba(highlightTint(petalColor), 0.42);

      for (const mirror of [false, true]) {
        const a = transformPt(from, cx, cy, cos, sin, mirror);
        const b = transformPt(to, cx, cy, cos, sin, mirror);

        ctx.strokeStyle = petalColor;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x + 0.05, b.y);
        ctx.stroke();

        ctx.strokeStyle = innerShine;
        ctx.lineWidth = Math.max(1, width * 0.32);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x + 0.05, b.y);
        ctx.stroke();

        dirty.addSegment(a, b, width * 0.5 + 3);
      }
    }

    ctx.restore();
    dirty.flush(c);
  },
} satisfies MagicEffect;
