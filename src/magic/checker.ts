import { strokeBounds } from '../core/draw';
import type { MagicEffect } from '../core/types';
import { edgeShade, patternPartner, rgba } from './_util/c-color';
import { DirtyTracker, distanceToSegment } from './_util/c-geom';

export default {
  id: 'checker',
  label: { pt: 'Xadrez', en: 'Checkerboard' },
  hint: { pt: 'Arrasta para pintar quadrados em xadrez.', en: 'Drag to paint a checkerboard pattern.' },
  category: 'padroes',
  level: 2,
  order: 405,
  usesColor: true,
  stroke(from, to, c, size) {
    const ctx = c.ctx;
    const cell = Math.max(10, Math.round(size * 0.44));
    const radius = Math.max(size * 0.58, cell * 0.85);
    const bounds = strokeBounds(from, to, radius + cell);
    const dirty = new DirtyTracker();

    const light = patternPartner(c.color);
    const border = rgba(edgeShade(c.color), 0.25);

    const rowStart = Math.floor(bounds.y / cell);
    const rowEnd = Math.ceil((bounds.y + bounds.h) / cell);
    const colStart = Math.floor(bounds.x / cell);
    const colEnd = Math.ceil((bounds.x + bounds.w) / cell);

    ctx.save();
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    for (let row = rowStart; row <= rowEnd; row++) {
      for (let col = colStart; col <= colEnd; col++) {
        const x = col * cell;
        const y = row * cell;
        if (distanceToSegment(x + cell * 0.5, y + cell * 0.5, from, to) > radius) continue;

        const isDark = ((col + row) % 2 + 2) % 2 === 0;
        ctx.fillStyle = isDark ? c.color : light;
        ctx.fillRect(x, y, cell, cell);
        ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
        dirty.add({ x: x - 1, y: y - 1, w: cell + 2, h: cell + 2 });
      }
    }
    ctx.restore();
    dirty.flush(c);
  },
} satisfies MagicEffect;
