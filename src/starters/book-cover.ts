import type { StarterDef } from '../core/types';
import { guideStroke, inkStroke, panel, roundRect, structureCategory } from './lib/art';

export default {
  id: 'book-cover', label: { pt: 'Capa de livro', en: 'Book cover' }, category: structureCategory,
  paper(ctx, w, h) {
    ctx.beginPath();
    ctx.moveTo(300, 220);
    ctx.lineTo(w - 300, 220);
    ctx.moveTo(500, h - 120);
    ctx.lineTo(w - 500, h - 120);
    guideStroke(ctx, '#a9bfd3', 4);
  },
  foreground(ctx, w, h) {
    roundRect(ctx, { x: 40, y: 40, w: w - 80, h: h - 80 }, 30);
    inkStroke(ctx, 10);
    roundRect(ctx, { x: 70, y: 70, w: w - 140, h: h - 140 }, 18);
    inkStroke(ctx, 3);
    panel(ctx, { x: 220, y: 100, w: w - 440, h: 170 }, 85);
    panel(ctx, { x: 220, y: 320, w: w - 440, h: h - 520 }, 30);
  },
} satisfies StarterDef;
