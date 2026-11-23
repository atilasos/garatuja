import type { MagicEffect } from '../core/types';
import { edgeShade, patternPartner, shiftColor } from './_util/c-color';
import { paintClippedPattern } from './_util/c-geom';

export default {
  id: 'stripes',
  label: { pt: 'Riscas', en: 'Stripes' },
  hint: { pt: 'Arrasta para pintar riscas certinhas.', en: 'Drag to paint neat diagonal stripes.' },
  category: 'padroes',
  level: 2,
  order: 407,
  usesColor: true,
  stroke(from, to, c, size) {
    const radius = size * 0.58;
    const pitch = Math.max(10, Math.round(size * 0.42));
    const partner = patternPartner(c.color);
    const accent = shiftColor(edgeShade(c.color), 0, 0.04, 0.06);

    paintClippedPattern(from, to, c, radius, (ctx, area) => {
      ctx.fillStyle = partner;
      ctx.fillRect(area.x, area.y, area.w, area.h);

      // Diagonal stripes aligned to u = x + y in page coordinates
      const uMin = area.x + area.y - pitch * 2;
      const uMax = area.x + area.w + area.y + area.h + pitch * 2;
      const kStart = Math.floor(uMin / pitch);
      const kEnd = Math.ceil(uMax / pitch);
      const stripeW = pitch * 0.44;
      const pinW = Math.max(1.5, pitch * 0.09);
      const yTop = area.y - pitch;
      const yBot = area.y + area.h + pitch;

      for (let k = kStart; k <= kEnd; k++) {
        const u = k * pitch;
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.moveTo(u - yTop, yTop);
        ctx.lineTo(u + stripeW - yTop, yTop);
        ctx.lineTo(u + stripeW - yBot, yBot);
        ctx.lineTo(u - yBot, yBot);
        ctx.closePath();
        ctx.fill();

        // Crisp narrow pinstripe between bold stripes
        const pu = u + pitch * 0.68;
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.moveTo(pu - yTop, yTop);
        ctx.lineTo(pu + pinW - yTop, yTop);
        ctx.lineTo(pu + pinW - yBot, yBot);
        ctx.lineTo(pu - yBot, yBot);
        ctx.closePath();
        ctx.fill();
      }
    });
  },
} satisfies MagicEffect;
