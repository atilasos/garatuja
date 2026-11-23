import type { StarterDef } from '../core/types';
import { guideStroke, panel, structureCategory } from './lib/art';

export default {
  id: 'poster', label: { pt: 'Cartaz', en: 'Poster' }, category: structureCategory,
  paper(ctx, w) {
    ctx.beginPath();
    ctx.moveTo(180, 210);
    ctx.lineTo(w - 180, 210);
    guideStroke(ctx, '#a9bfd3', 4);
  },
  foreground(ctx, w, h) {
    panel(ctx, { x: 60, y: 50, w: w - 120, h: 220 }, 40);
    panel(ctx, { x: 60, y: 320, w: w - 120, h: h - 370 }, 26);
  },
} satisfies StarterDef;
