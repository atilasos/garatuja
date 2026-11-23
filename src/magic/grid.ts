import type { MagicEffect } from '../core/types';
import { edgeShade, patternPartner, rgba } from './_util/c-color';
import { paintClippedPattern } from './_util/c-geom';

export default {
  id: 'grid',
  label: { pt: 'Quadriculado', en: 'Grid' },
  hint: { pt: 'Arrasta para pintar uma grelha quadriculada.', en: 'Drag to paint a crisp grid pattern.' },
  category: 'padroes',
  level: 2,
  order: 413,
  usesColor: true,
  stroke(from, to, c, size) {
    const radius = size * 0.58;
    const step = Math.max(12, Math.round(size * 0.48));
    const bandW = Math.max(3, step * 0.34);
    const ground = patternPartner(c.color);
    const weave = rgba(c.color, 0.36);
    const lineColor = edgeShade(c.color);

    paintClippedPattern(from, to, c, radius, (ctx, area) => {
      ctx.fillStyle = ground;
      ctx.fillRect(area.x, area.y, area.w, area.h);

      const colStart = Math.floor((area.x - step) / step);
      const colEnd = Math.ceil((area.x + area.w + step) / step);
      const rowStart = Math.floor((area.y - step) / step);
      const rowEnd = Math.ceil((area.y + area.h + step) / step);

      // Soft woven gingham horizontal & vertical bands
      ctx.fillStyle = weave;
      for (let col = colStart; col <= colEnd; col++) {
        ctx.fillRect(col * step - bandW * 0.5, area.y, bandW, area.h);
      }
      for (let row = rowStart; row <= rowEnd; row++) {
        ctx.fillRect(area.x, row * step - bandW * 0.5, area.w, bandW);
      }

      // Crisp orthogonal grid lines
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = Math.max(1, step * 0.08);
      ctx.beginPath();
      for (let col = colStart; col <= colEnd; col++) {
        const x = col * step;
        ctx.moveTo(x, area.y);
        ctx.lineTo(x, area.y + area.h);
      }
      for (let row = rowStart; row <= rowEnd; row++) {
        const y = row * step;
        ctx.moveTo(area.x, y);
        ctx.lineTo(area.x + area.w, y);
      }
      ctx.stroke();
    });
  },
} satisfies MagicEffect;
