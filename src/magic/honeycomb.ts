import { strokeBounds } from '../core/draw';
import type { MagicEffect } from '../core/types';
import { edgeShade, highlightTint, rgba, shiftColor } from './_util/c-color';
import { cellHash, DirtyTracker, distanceToSegment } from './_util/c-geom';

function traceHex(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export default {
  id: 'honeycomb',
  label: { pt: 'Favo de mel', en: 'Honeycomb' },
  hint: { pt: 'Arrasta para pintar um favo de hexágonos.', en: 'Drag to paint a honeycomb of hexagons.' },
  category: 'padroes',
  level: 2,
  order: 410,
  usesColor: true,
  stroke(from, to, c, size) {
    const ctx = c.ctx;
    const hexR = Math.max(8, Math.round(size * 0.32));
    const dx = hexR * 1.5;
    const dy = hexR * Math.sqrt(3);
    const radius = Math.max(size * 0.56, hexR * 1.2);
    const bounds = strokeBounds(from, to, radius + hexR * 2);
    const dirty = new DirtyTracker();

    const wall = edgeShade(c.color);
    const sheen = rgba(highlightTint(c.color), 0.45);
    const wallW = Math.max(1.5, hexR * 0.16);

    const colStart = Math.floor(bounds.x / dx) - 1;
    const colEnd = Math.ceil((bounds.x + bounds.w) / dx) + 1;

    ctx.save();
    ctx.lineJoin = 'round';
    for (let col = colStart; col <= colEnd; col++) {
      const shiftY = (Math.abs(col) % 2) * (dy * 0.5);
      const rowStart = Math.floor((bounds.y - shiftY) / dy) - 1;
      const rowEnd = Math.ceil((bounds.y + bounds.h - shiftY) / dy) + 1;
      for (let row = rowStart; row <= rowEnd; row++) {
        const cx = col * dx;
        const cy = row * dy + shiftY;
        if (distanceToSegment(cx, cy, from, to) > radius) continue;

        const h = cellHash(col, row, 19);
        const fill = shiftColor(c.color, (h - 0.5) * 14, 0.04, (h - 0.48) * 0.16);

        // Filled hexagonal cell with crisp wax border
        traceHex(ctx, cx, cy, hexR);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = wall;
        ctx.lineWidth = wallW;
        ctx.stroke();

        // Inner glossy honey facet
        traceHex(ctx, cx - hexR * 0.08, cy - hexR * 0.08, hexR * 0.56);
        ctx.fillStyle = sheen;
        ctx.fill();

        dirty.addPoint(cx, cy, hexR + wallW + 2);
      }
    }
    ctx.restore();
    dirty.flush(c);
  },
} satisfies MagicEffect;
