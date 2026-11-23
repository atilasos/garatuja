import type { StarterDef } from '../core/types';
import { paperCategory } from './lib/art';

export default {
  id: 'dotted', label: { pt: 'Pontilhado', en: 'Dotted' }, category: paperCategory,
  paper(ctx, w, h) {
    ctx.save();
    ctx.fillStyle = '#9fb6cc';
    ctx.beginPath();
    for (let y = 50; y < h; y += 50) {
      for (let x = 50; x < w; x += 50) {
        ctx.moveTo(x + 4, y);
        ctx.arc(x, y, 4, 0, Math.PI * 2);
      }
    }
    ctx.fill();
    ctx.restore();
  },
} satisfies StarterDef;
