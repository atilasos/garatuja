import type { StarterDef } from '../core/types';
import { guideStroke, panel, structureCategory } from './lib/art';

/** A central drawing zone with guide lines around it for labels (informative texts). */
export default {
  id: 'diagram', label: { pt: 'Esquema com legendas', en: 'Labelled diagram' }, category: structureCategory,
  paper(ctx, w) {
    ctx.save();
    ctx.fillStyle = '#9fb6cc';
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const y = 250 + i * 230;
        const x0 = side < 0 ? 70 : w - 70 - 300;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x0 + 300, y);
        guideStroke(ctx, '#a9bfd3', 4);
        const dotX = side < 0 ? x0 + 330 : x0 - 30;
        ctx.beginPath();
        ctx.arc(dotX, y, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  },
  foreground(ctx, w, h) {
    panel(ctx, { x: w / 2 - 340, y: h / 2 - 300, w: 680, h: 600 }, 60);
  },
} satisfies StarterDef;
