import type { MagicEffect } from '../core/types';
import { edgeShade, highlightTint, rgba, shiftColor } from './_util/c-color';
import { cellHash, paintClippedPattern } from './_util/c-geom';

export default {
  id: 'scales',
  label: { pt: 'Escamas', en: 'Scales' },
  hint: { pt: 'Arrasta para pintar escamas de peixe ou dragão.', en: 'Drag to paint fish or dragon scales.' },
  category: 'padroes',
  level: 2,
  order: 409,
  usesColor: true,
  stroke(from, to, c, size) {
    const radius = size * 0.58;
    const r = Math.max(9, Math.round(size * 0.34));
    const stepX = r * 1.92;
    const stepY = r * 0.92;
    const rim = edgeShade(c.color);
    const sheen = rgba(highlightTint(c.color), 0.42);

    paintClippedPattern(from, to, c, radius, (ctx, area) => {
      const rowStart = Math.floor((area.y - r * 2) / stepY);
      const rowEnd = Math.ceil((area.y + area.h + r * 2) / stepY);

      // Draw top-to-bottom so lower rows naturally overlap upper rows like real scales
      for (let row = rowStart; row <= rowEnd; row++) {
        const shiftX = (Math.abs(row) % 2) * (stepX * 0.5);
        const colStart = Math.floor((area.x - shiftX - r * 2) / stepX);
        const colEnd = Math.ceil((area.x + area.w - shiftX + r * 2) / stepX);
        for (let col = colStart; col <= colEnd; col++) {
          const cx = col * stepX + shiftX;
          const cy = row * stepY;
          const h = cellHash(col, row, 7);
          const scaleColor = shiftColor(c.color, (h - 0.5) * 18, 0.03, (h - 0.5) * 0.14);

          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fillStyle = scaleColor;
          ctx.fill();

          // Soft glossy highlight near the lower edge of the scale
          ctx.beginPath();
          ctx.arc(cx, cy + r * 0.18, r * 0.56, 0.25, Math.PI - 0.25);
          ctx.fillStyle = sheen;
          ctx.fill();

          // Crisp darker scalloped rim
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.strokeStyle = rim;
          ctx.lineWidth = Math.max(1.2, r * 0.13);
          ctx.stroke();
        }
      }
    });
  },
} satisfies MagicEffect;
