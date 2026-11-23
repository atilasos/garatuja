import type { MagicEffect } from '../core/types';
import { edgeShade, patternPartner, shiftColor } from './_util/c-color';
import { paintClippedPattern } from './_util/c-geom';

export default {
  id: 'wave-pattern',
  label: { pt: 'Ondas repetidas', en: 'Repeated waves' },
  hint: { pt: 'Arrasta para pintar um padrão de ondas.', en: 'Drag to paint a rhythmic wave pattern.' },
  category: 'padroes',
  level: 2,
  order: 411,
  usesColor: true,
  stroke(from, to, c, size) {
    const radius = size * 0.58;
    const r = Math.max(12, Math.round(size * 0.44));
    const stepX = r * 2;
    const stepY = r * 0.56;
    const partner = patternPartner(c.color);
    const mid = shiftColor(c.color, 6, -0.04, 0.14);
    const rim = edgeShade(c.color);

    paintClippedPattern(from, to, c, radius, (ctx, area) => {
      ctx.fillStyle = partner;
      ctx.fillRect(area.x, area.y, area.w, area.h);

      const rowStart = Math.floor((area.y - r * 1.5) / stepY);
      const rowEnd = Math.ceil((area.y + area.h + r * 2) / stepY);

      // Overlapping concentric wave fans (seigaiha rhythm), top-to-bottom
      for (let row = rowStart; row <= rowEnd; row++) {
        const shiftX = (Math.abs(row) % 2) * r;
        const colStart = Math.floor((area.x - shiftX - r * 2) / stepX);
        const colEnd = Math.ceil((area.x + area.w - shiftX + r * 2) / stepX);
        for (let col = colStart; col <= colEnd; col++) {
          const cx = col * stepX + shiftX;
          const cy = row * stepY;

          const rings: [number, string][] = [
            [1.0, c.color],
            [0.78, partner],
            [0.58, mid],
            [0.38, partner],
            [0.2, rim],
          ];
          for (const [frac, fill] of rings) {
            ctx.beginPath();
            ctx.arc(cx, cy, r * frac, 0, Math.PI * 2);
            ctx.fillStyle = fill;
            ctx.fill();
          }
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.strokeStyle = rim;
          ctx.lineWidth = Math.max(1, r * 0.06);
          ctx.stroke();
        }
      }
    });
  },
} satisfies MagicEffect;
