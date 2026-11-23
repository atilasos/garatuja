import type { MagicEffect, Point } from '../core/types';
import { highlightTint, rgba, shiftColor } from './_util/c-color';
import { DirtyTracker } from './_util/c-geom';

const folds = 8;

function rotateAround(p: Point, cx: number, cy: number, cos: number, sin: number): Point {
  const dx = p.x - cx;
  const dy = p.y - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

export default {
  id: 'mandala',
  label: { pt: 'Mandala', en: 'Mandala' },
  hint: { pt: 'Arrasta para desenhar uma mandala em oito partes.', en: 'Drag to draw an eight-fold mandala.' },
  category: 'padroes',
  level: 1,
  order: 403,
  usesColor: true,
  stroke(from, to, c, size) {
    const ctx = c.ctx;
    const dirty = new DirtyTracker();
    const cx = c.width * 0.5;
    const cy = c.height * 0.5;
    const width = Math.max(2.6, size * 0.28);
    const alt = shiftColor(c.color, 16, 0.04, 0.06);
    const shine = rgba(highlightTint(c.color), 0.34);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < folds; i++) {
      const angle = (i * Math.PI * 2) / folds;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const a = rotateAround(from, cx, cy, cos, sin);
      const b = rotateAround(to, cx, cy, cos, sin);

      ctx.strokeStyle = i % 2 === 0 ? c.color : alt;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x + 0.05, b.y);
      ctx.stroke();

      ctx.strokeStyle = shine;
      ctx.lineWidth = Math.max(1, width * 0.28);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x + 0.05, b.y);
      ctx.stroke();

      dirty.addSegment(a, b, width * 0.5 + 3);
    }

    ctx.restore();
    dirty.flush(c);
  },
} satisfies MagicEffect;
