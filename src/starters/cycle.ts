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
      // Bow each arrow outwards, away from the centre, so the cycle reads as a ring.
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2;
      const out = Math.hypot(mx - cx, my - cy);
      const qx = mx + (mx - cx) / out * 120;
      const qy = my + (my - cy) / out * 120;
      const towards = (x: number, y: number) => {
        const d = Math.hypot(qx - x, qy - y);
        return [x + (qx - x) / d * (r + 26), y + (qy - y) / d * (r + 26)] as const;
      };
      const [sx, sy] = towards(ax, ay);
      const [ex, ey] = towards(bx, by);
      arrow(ctx, sx, sy, ex, ey, -Math.hypot(qx - (sx + ex) / 2, qy - (sy + ey) / 2) * 1.4);
    }
  },
} satisfies StarterDef;
