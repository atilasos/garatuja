import { strokeBounds } from '../core/draw';
import type { MagicEffect } from '../core/types';
import { edgeShade, highlightTint, mixColors, rgba, shiftColor } from './_util/c-color';
import { cellHash, DirtyTracker, distanceToSegment } from './_util/c-geom';
import { traceRoundedRect } from './_util/c-shapes';

export default {
  id: 'bricks',
  label: { pt: 'Tijolos', en: 'Bricks' },
  hint: { pt: 'Arrasta para construir uma parede de tijolos.', en: 'Drag to build a brick wall.' },
  category: 'pintar',
  level: 2,
  order: 105,
  usesColor: true,
  stroke(from, to, c, size) {
    const ctx = c.ctx;
    const bh = Math.max(10, Math.round(size * 0.42));
    const bw = bh * 2;
    const gap = Math.max(1.5, bh * 0.13);
    const radius = Math.max(size * 0.55, bh * 0.85);
    const bounds = strokeBounds(from, to, radius + bw);
    const dirty = new DirtyTracker();

    const rowStart = Math.floor(bounds.y / bh);
    const rowEnd = Math.ceil((bounds.y + bounds.h) / bh);
    const mortar = mixColors(c.color, '#dfd6c8', 0.84);
    const bevelLight = rgba(highlightTint(c.color), 0.42);
    const bevelDark = rgba(edgeShade(c.color), 0.45);

    ctx.save();
    for (let row = rowStart; row <= rowEnd; row++) {
      const shiftX = (Math.abs(row) % 2) * (bw * 0.5);
      const colStart = Math.floor((bounds.x - shiftX) / bw);
      const colEnd = Math.ceil((bounds.x + bounds.w - shiftX) / bw);
      for (let col = colStart; col <= colEnd; col++) {
        const bx = col * bw + shiftX;
        const by = row * bh;
        const cx = bx + bw * 0.5;
        const cy = by + bh * 0.5;
        if (distanceToSegment(cx, cy, from, to) > radius) continue;

        // Mortar bed
        ctx.fillStyle = mortar;
        ctx.fillRect(bx, by, bw, bh);

        // Individual brick with deterministic shade variation
        const h1 = cellHash(col, row, 1);
        const h2 = cellHash(col, row, 2);
        const brickColor = shiftColor(c.color, (h1 - 0.5) * 14, (h2 - 0.5) * 0.1, (h1 - 0.5) * 0.14);
        const ix = bx + gap;
        const iy = by + gap;
        const iw = bw - gap * 2;
        const ih = bh - gap * 2;

        traceRoundedRect(ctx, ix, iy, iw, ih, Math.max(1.5, bh * 0.12));
        ctx.fillStyle = brickColor;
        ctx.fill();

        // Top-left sunlit bevel & bottom-right shadow bevel
        ctx.strokeStyle = bevelLight;
        ctx.lineWidth = Math.max(1, bh * 0.09);
        ctx.beginPath();
        ctx.moveTo(ix + 1, iy + ih - 1);
        ctx.lineTo(ix + 1, iy + 1);
        ctx.lineTo(ix + iw - 1, iy + 1);
        ctx.stroke();

        ctx.strokeStyle = bevelDark;
        ctx.beginPath();
        ctx.moveTo(ix + iw - 1, iy + 1);
        ctx.lineTo(ix + iw - 1, iy + ih - 1);
        ctx.lineTo(ix + 1, iy + ih - 1);
        ctx.stroke();

        dirty.add({ x: bx - 1, y: by - 1, w: bw + 2, h: bh + 2 });
      }
    }
    ctx.restore();
    dirty.flush(c);
  },
} satisfies MagicEffect;
