import type { StarterDef } from '../core/types';
import { arrow, guideStroke, inkStroke, panel, structureCategory } from './lib/art';

export default {
  id: 'timeline', label: { pt: 'Linha do tempo', en: 'Timeline' }, category: structureCategory,
  paper(ctx, w) {
    const step = (w - 240) / 5;
    for (let i = 0; i < 5; i++) {
      const x = 120 + step * i + step / 2;
      ctx.beginPath();
      for (const y of [920, 1010, 1100]) { ctx.moveTo(x - step / 2 + 22, y); ctx.lineTo(x + step / 2 - 22, y); }
      guideStroke(ctx);
    }
  },
  foreground(ctx, w) {
    const y = 790;
    arrow(ctx, 70, y, w - 60, y, 0, 9);
    const step = (w - 240) / 5;
    for (let i = 0; i < 5; i++) {
      const x = 120 + step * i + step / 2;
      panel(ctx, { x: x - step / 2 + 16, y: 110, w: step - 32, h: 560 }, 24);
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      inkStroke(ctx, 7);
      ctx.beginPath();
      ctx.moveTo(x, 690);
      ctx.lineTo(x, y - 30);
      inkStroke(ctx, 5);
    }
  },
} satisfies StarterDef;
