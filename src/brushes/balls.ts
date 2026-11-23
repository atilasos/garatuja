import { hsl, hslOf, shade } from '../core/tooling/brush-kit';
import { pressureSize } from '../core/tooling/brush-stroke';
import type { BrushDef } from '../core/types';

export default {
  id: 'balls', label: { pt: 'Bolinhas', en: 'Beads' }, order: 210, level: 1, spacing: .5,
  dab(ctx, d) {
    const reach = pressureSize(d.size, d.pressure) / 2;
    const radius = Math.max(2, reach * (.34 + d.random() * .3));
    const angle = d.random() * Math.PI * 2;
    const distance = d.random() * (reach - radius * .6);
    const x = d.x + Math.cos(angle) * distance;
    const y = d.y + Math.sin(angle) * distance;
    // Each bead is a different tone of the chosen colour; grey and black give a full rainbow.
    const base = hslOf(d.color);
    const colour = base.s < .12 ? hsl(d.random() * 360, .75, .55)
      : hsl(base.h + (d.random() - .5) * 80, Math.max(.5, base.s), Math.min(.65, Math.max(.4, base.l)));
    const body = ctx.createRadialGradient(x - radius * .35, y - radius * .35, radius * .1, x, y, radius);
    body.addColorStop(0, shade(colour, .28));
    body.addColorStop(.55, colour);
    body.addColorStop(1, shade(colour, -.14));
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  },
} satisfies BrushDef;
