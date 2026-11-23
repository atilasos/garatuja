import type { BrushDef } from '../core/types';

export default {
  id: 'double', label: { pt: 'Linha dupla', en: 'Double line' }, order: 90, level: 2, spacing: .07,
  dab(ctx, d) {
    const offset = d.size * .32;
    const radius = Math.max(1.1, d.size * .1);
    const nx = -Math.sin(d.angle) * offset;
    const ny = Math.cos(d.angle) * offset;
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.arc(d.x + nx, d.y + ny, radius, 0, Math.PI * 2);
    ctx.moveTo(d.x - nx + radius, d.y - ny);
    ctx.arc(d.x - nx, d.y - ny, radius, 0, Math.PI * 2);
    ctx.fill();
  },
} satisfies BrushDef;
