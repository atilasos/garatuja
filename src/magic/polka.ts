import type { MagicEffect } from '../core/types';
import { highlightTint, patternPartner, rgba } from './_util/c-color';
import { paintClippedPattern } from './_util/c-geom';

export default {
  id: 'polka',
  label: { pt: 'Bolas', en: 'Polka dots' },
  hint: { pt: 'Arrasta para pintar um padrão às bolas.', en: 'Drag to paint a polka dot pattern.' },
  category: 'padroes',
  level: 2,
  order: 406,
  usesColor: true,
  stroke(from, to, c, size) {
    const radius = size * 0.58;
    const step = Math.max(12, Math.round(size * 0.48));
    const dotR = step * 0.28;
    const ground = patternPartner(c.color);
    const glint = rgba(highlightTint(c.color), 0.55);

    paintClippedPattern(from, to, c, radius, (ctx, area) => {
      // Soft tinted backdrop inside brush capsule
      ctx.fillStyle = ground;
      ctx.fillRect(area.x, area.y, area.w, area.h);

      const rowStart = Math.floor((area.y - step) / step);
      const rowEnd = Math.ceil((area.y + area.h + step) / step);
      for (let row = rowStart; row <= rowEnd; row++) {
        const shiftX = (Math.abs(row) % 2) * (step * 0.5);
        const colStart = Math.floor((area.x - shiftX - step) / step);
        const colEnd = Math.ceil((area.x + area.w - shiftX + step) / step);
        for (let col = colStart; col <= colEnd; col++) {
          const cx = col * step + shiftX;
          const cy = row * step;

          ctx.fillStyle = c.color;
          ctx.beginPath();
          ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = glint;
          ctx.beginPath();
          ctx.arc(cx - dotR * 0.28, cy - dotR * 0.28, dotR * 0.24, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
  },
} satisfies MagicEffect;
