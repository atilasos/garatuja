import type { StarterDef } from '../core/types';
import { arrow, inkStroke, structureCategory } from './lib/art';

/** Four circles joined by arrows, for cycles (water, life of a plant…). */
export default {
  id: 'cycle', label: { pt: 'Ciclo', en: 'Cycle' }, category: structureCategory,
  paper() {},
  foreground(ctx, w, h) {
    const cx = w / 2;
    const cy = h / 2;
    const r = 175;
    const spots = [[cx, cy - 365], [cx + 520, cy], [cx, cy + 365], [cx - 520, cy]];
    for (const [x, y] of spots) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      inkStroke(ctx, 7);
    }
    for (let i = 0; i < 4; i++) {
      const [ax, ay] = spots[i];
      const [bx, by] = spots[(i + 1) % 4];
      const angle = Math.atan2(by - ay, bx - ax);
      const gap = r + 30;
      arrow(ctx, ax + Math.cos(angle + 0.55) * gap, ay + Math.sin(angle + 0.55) * gap,
        bx - Math.cos(angle - 0.55) * gap, by - Math.sin(angle - 0.55) * gap, 60);
    }
  },
} satisfies StarterDef;
