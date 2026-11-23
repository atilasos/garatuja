import type { StarterDef } from '../core/types';
import { arrow, guideStroke, panel, structureCategory } from './lib/art';

export default {
  id: 'before-after', label: { pt: 'Antes e depois', en: 'Before and after' }, category: structureCategory,
  paper(ctx, w) {
    ctx.beginPath();
    for (const x of [70, w / 2 + 70]) { ctx.moveTo(x + 40, 140); ctx.lineTo(x + w / 2 - 180, 140); }
    guideStroke(ctx, '#a9bfd3', 4);
  },
  foreground(ctx, w, h) {
    const width = w / 2 - 140;
    panel(ctx, { x: 70, y: 210, w: width, h: h - 290 });
    panel(ctx, { x: w / 2 + 70, y: 210, w: width, h: h - 290 });
    arrow(ctx, w / 2 - 50, h / 2 + 60, w / 2 + 50, h / 2 + 60, 0, 9);
  },
} satisfies StarterDef;
