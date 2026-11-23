import type { StarterDef } from '../core/types';
import { circle, hills, sceneCategory, seeded, star, vertical } from './lib/art';

export default {
  id: 'scene-night', label: { pt: 'Noite estrelada', en: 'Starry night' }, category: sceneCategory,
  paper(ctx, w, h) {
    ctx.fillStyle = vertical(ctx, 0, h, [[0, '#182152'], [0.65, '#3b3f7e'], [1, '#5b4f8c']]);
    ctx.fillRect(0, 0, w, h);
    const random = seeded(21);
    for (let i = 0; i < 160; i++) circle(ctx, random() * w, random() * 820, 1.5 + random() * 2.5, `rgba(255,250,230,${0.4 + random() * 0.6})`);
    ctx.fillStyle = '#fff2b8';
    for (const [x, y, r] of [[240, 160, 26], [620, 300, 18], [980, 120, 22], [1180, 420, 16], [420, 520, 14]]) {
      star(ctx, x, y, r);
      ctx.fill();
    }
    const glow = ctx.createRadialGradient(1300, 230, 80, 1300, 230, 260);
    glow.addColorStop(0, '#fff7d655');
    glow.addColorStop(1, '#fff7d600');
    ctx.fillStyle = glow;
    ctx.fillRect(1000, 0, 600, 520);
    circle(ctx, 1300, 230, 110, '#fff3c7');
    circle(ctx, 1355, 195, 100, '#25295e');
    hills(ctx, w, h, 900, 70, 2.2, 0.8, '#2b3560');
    hills(ctx, w, h, 1010, 40, 1.4, 2.4, '#1f2849');
  },
} satisfies StarterDef;
