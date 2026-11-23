import type { StarterDef } from '../core/types';
import { guideStroke, inkStroke, panel, roundRect, structureCategory, writingLines } from './lib/art';

export default {
  id: 'postcard', label: { pt: 'Postal ilustrado', en: 'Picture postcard' }, category: structureCategory,
  paper(ctx, w, h) {
    writingLines(ctx, { x: w / 2 + 60, y: 360, w: w / 2 - 140, h: h - 440 }, 100);
    roundRect(ctx, { x: w - 300, y: 80, w: 210, h: 240 }, 12);
    guideStroke(ctx, '#a9bfd3', 5, [6, 14]);
  },
  foreground(ctx, w, h) {
    panel(ctx, { x: 70, y: 70, w: w / 2 - 120, h: h - 140 }, 26);
    ctx.beginPath();
    ctx.moveTo(w / 2 + 10, 110);
    ctx.lineTo(w / 2 + 10, h - 110);
    inkStroke(ctx, 4);
  },
} satisfies StarterDef;
