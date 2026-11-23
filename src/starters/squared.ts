import type { StarterDef } from '../core/types';
import { guideStroke, paperCategory } from './lib/art';

export default {
  id: 'squared', label: { pt: 'Quadriculado', en: 'Squared' }, category: paperCategory,
  paper(ctx, w, h) {
    ctx.beginPath();
    for (let x = 50; x < w; x += 50) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = 50; y < h; y += 50) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    guideStroke(ctx, '#b6cbe0', 2);
  },
} satisfies StarterDef;
