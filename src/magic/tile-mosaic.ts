import { strokeBounds } from '../core/draw';
import type { MagicEffect } from '../core/types';
import { edgeShade, highlightTint, mixColors, rgba, shiftColor } from './_util/c-color';
import { cellHash, DirtyTracker, distanceToSegment } from './_util/c-geom';
import { traceRoundedRect } from './_util/c-shapes';

export default {
  id: 'tile-mosaic',
  label: { pt: 'Mosaico pintado', en: 'Painted mosaic' },
  hint: { pt: 'Arrasta para colocar pequenas pastilhas coloridas.', en: 'Drag to lay small colored mosaic tiles.' },
  category: 'pintar',
  level: 2,
  order: 130,
  usesColor: true,
  stroke(from, to, c, size) {
    const ctx = c.ctx;
    const cell = Math.max(9, Math.round(size * 0.34));
    const gap = Math.max(1.2, cell * 0.14);
    const radius = Math.max(size * 0.56, cell * 0.85);
    const bounds = strokeBounds(from, to, radius + cell);
    const dirty = new DirtyTracker();

    const grout = mixColors(c.color, '#ebe4d6', 0.86);
    const glint = rgba(highlightTint(c.color), 0.52);
    const rim = rgba(edgeShade(c.color), 0.45);

    const rowStart = Math.floor(bounds.y / cell);
    const rowEnd = Math.ceil((bounds.y + bounds.h) / cell);
    const colStart = Math.floor(bounds.x / cell);
    const colEnd = Math.ceil((bounds.x + bounds.w) / cell);

    ctx.save();
    for (let row = rowStart; row <= rowEnd; row++) {
      for (let col = colStart; col <= colEnd; col++) {
        const tx = col * cell;
        const ty = row * cell;
        const cx = tx + cell * 0.5;
        const cy = ty + cell * 0.5;
        if (distanceToSegment(cx, cy, from, to) > radius) continue;

        // Warm grout square
        ctx.fillStyle = grout;
        ctx.fillRect(tx, ty, cell, cell);

        // Glazed ceramic tessera with subtle per-tile color shift
        const h1 = cellHash(col, row, 11);
        const h2 = cellHash(col, row, 23);
        const tileColor = shiftColor(c.color, (h1 - 0.5) * 24, (h2 - 0.5) * 0.12, (h2 - 0.5) * 0.18);
        const ix = tx + gap;
        const iy = ty + gap;
        const iw = cell - gap * 2;
        const ih = cell - gap * 2;

        traceRoundedRect(ctx, ix, iy, iw, ih, Math.max(1.2, cell * 0.14));
        ctx.fillStyle = tileColor;
        ctx.fill();
        ctx.strokeStyle = rim;
        ctx.lineWidth = Math.max(0.8, cell * 0.06);
        ctx.stroke();

        // Diagonal glossy ceramic shine
        ctx.fillStyle = glint;
        ctx.beginPath();
        ctx.moveTo(ix + iw * 0.15, iy + ih * 0.15);
        ctx.lineTo(ix + iw * 0.65, iy + ih * 0.15);
        ctx.lineTo(ix + iw * 0.15, iy + ih * 0.65);
        ctx.closePath();
        ctx.fill();

        dirty.add({ x: tx - 1, y: ty - 1, w: cell + 2, h: cell + 2 });
      }
    }
    ctx.restore();
    dirty.flush(c);
  },
} satisfies MagicEffect;
