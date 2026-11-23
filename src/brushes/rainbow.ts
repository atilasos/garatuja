import { hsl, hslOf } from '../core/tooling/brush-kit';
import { pressureSize } from '../core/tooling/brush-stroke';
import type { BrushDef } from '../core/types';

let start = { h: 0, s: .8, l: .55 };

export default {
  id: 'rainbow', label: { pt: 'Arco de tons', en: 'Rainbow' }, order: 220, level: 1, spacing: .1,
  hint: { pt: 'Desenha uma linha que muda de cor.', en: 'Draw a line that changes color.' },
  begin(color) {
    // The hue starts at the chosen colour and keeps turning along the stroke.
    const base = hslOf(color);
    start = { h: base.s < .12 ? 0 : base.h, s: Math.max(.75, base.s), l: Math.min(.62, Math.max(.48, base.l)) };
  },
  dab(ctx, d) {
    ctx.fillStyle = hsl(start.h + d.travelled * .7, start.s, start.l);
    ctx.beginPath();
    ctx.arc(d.x, d.y, pressureSize(d.size, d.pressure) / 2, 0, Math.PI * 2);
    ctx.fill();
  },
} satisfies BrushDef;
