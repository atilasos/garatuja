import { strokeBounds } from '../core/draw';
import type { MagicEffect } from '../core/types';
import { edgeShade, highlightTint, mixColors, rgba, shiftColor } from './_util/c-color';
import { cellHash, DirtyTracker, distanceToSegment } from './_util/c-geom';

export default {
  id: 'cobblestones',
  label: { pt: 'Calçada', en: 'Cobblestones' },
  hint: { pt: 'Arrasta para pavimentar um caminho de pedras.', en: 'Drag to pave a cobblestone path.' },
  category: 'pintar',
  level: 2,
  order: 106,
  usesColor: true,
  stroke(from, to, c, size) {
    const ctx = c.ctx;
    const cell = Math.max(11, Math.round(size * 0.44));
    const radius = Math.max(size * 0.56, cell * 0.85);
    const bounds = strokeBounds(from, to, radius + cell);
    const dirty = new DirtyTracker();

    const stoneBase = mixColors('#969188', c.color, 0.35);
    const mortar = mixColors('#4f4a43', edgeShade(c.color), 0.25);

    const rowStart = Math.floor(bounds.y / cell);
    const rowEnd = Math.ceil((bounds.y + bounds.h) / cell);

    ctx.save();
    for (let row = rowStart; row <= rowEnd; row++) {
      const offset = (Math.abs(row) % 2) * (cell * 0.48);
      const colStart = Math.floor((bounds.x - offset) / cell);
      const colEnd = Math.ceil((bounds.x + bounds.w - offset) / cell);
      for (let col = colStart; col <= colEnd; col++) {
        const jx = (cellHash(col, row, 1) - 0.5) * cell * 0.16;
        const jy = (cellHash(col, row, 2) - 0.5) * cell * 0.16;
        const cx = col * cell + offset + cell * 0.5 + jx;
        const cy = row * cell + cell * 0.5 + jy;
        if (distanceToSegment(cx, cy, from, to) > radius) continue;

        const rx = cell * (0.4 + cellHash(col, row, 3) * 0.08);
        const ry = cell * (0.34 + cellHash(col, row, 4) * 0.09);
        const rot = (cellHash(col, row, 5) - 0.5) * 0.32;
        const hShade = cellHash(col, row, 6);
        const stoneColor = shiftColor(stoneBase, (hShade - 0.5) * 14, (hShade - 0.5) * 0.08, (hShade - 0.48) * 0.22);

        // Dark mortar cushion behind each cobble
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.fillStyle = mortar;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx + cell * 0.1, ry + cell * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rounded cobble stone body
        ctx.fillStyle = stoneColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();

        // Subtle sunlit upper bevel
        ctx.fillStyle = rgba(highlightTint(stoneColor), 0.36);
        ctx.beginPath();
        ctx.ellipse(-rx * 0.18, -ry * 0.22, rx * 0.55, ry * 0.38, -0.15, 0, Math.PI * 2);
        ctx.fill();

        // Lower stone shadow rim
        ctx.strokeStyle = rgba(edgeShade(stoneColor), 0.45);
        ctx.lineWidth = Math.max(1, cell * 0.07);
        ctx.beginPath();
        ctx.ellipse(0, 0, rx * 0.92, ry * 0.92, 0, 0.2, Math.PI - 0.2);
        ctx.stroke();

        ctx.restore();
        dirty.addPoint(cx, cy, Math.max(rx, ry) + cell * 0.14 + 2);
      }
    }
    ctx.restore();
    dirty.flush(c);
  },
} satisfies MagicEffect;
