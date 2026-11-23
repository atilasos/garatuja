import type { MagicEffect } from '../core/types';
import { edgeShade, patternPartner, shiftColor } from './_util/c-color';
import { paintClippedPattern } from './_util/c-geom';

export default {
  id: 'zigzag',
  label: { pt: 'Ziguezague', en: 'Zigzag' },
  hint: { pt: 'Arrasta para pintar ondas em ziguezague.', en: 'Drag to paint chevron zigzag bands.' },
  category: 'padroes',
  level: 2,
  order: 408,
  usesColor: true,
  stroke(from, to, c, size) {
    const radius = size * 0.58;
    const period = Math.max(16, Math.round(size * 0.64));
    const halfP = period * 0.5;
    const amp = period * 0.32;
    const rowH = Math.max(12, Math.round(size * 0.44));
    const partner = patternPartner(c.color);
    const mid = shiftColor(c.color, 6, -0.05, 0.14);
    const dark = edgeShade(c.color);

    paintClippedPattern(from, to, c, radius, (ctx, area) => {
      ctx.fillStyle = partner;
      ctx.fillRect(area.x, area.y, area.w, area.h);

      const xStart = Math.floor((area.x - period) / period) * period;
      const xEnd = Math.ceil((area.x + area.w + period) / period) * period;
      const rowStart = Math.floor((area.y - amp - rowH) / rowH);
      const rowEnd = Math.ceil((area.y + area.h + amp + rowH) / rowH);

      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      const traceWave = (yBase: number) => {
        ctx.beginPath();
        let first = true;
        for (let x = xStart; x <= xEnd; x += halfP) {
          const isPeak = Math.abs(Math.round(x / halfP)) % 2 === 0;
          const y = yBase + (isPeak ? -amp : amp);
          if (first) {
            ctx.moveTo(x, y);
            first = false;
          } else {
            ctx.lineTo(x, y);
          }
        }
      };

      for (let row = rowStart; row <= rowEnd; row++) {
        const yBase = row * rowH;
        const mainColor = ((row % 2) + 2) % 2 === 0 ? c.color : mid;
        traceWave(yBase);
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = rowH * 0.48;
        ctx.stroke();

        // Crisp thin chevron accent line
        traceWave(yBase + rowH * 0.25);
        ctx.strokeStyle = dark;
        ctx.lineWidth = Math.max(1.2, rowH * 0.1);
        ctx.stroke();
      }
    });
  },
} satisfies MagicEffect;
