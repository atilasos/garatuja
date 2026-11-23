import type { StarterDef } from '../core/types';
import { circle, cloud, hills, sceneCategory, seeded, vertical } from './lib/art';

export default {
  id: 'scene-meadow', label: { pt: 'Céu e prado', en: 'Sky and meadow' }, category: sceneCategory,
  paper(ctx, w, h) {
    ctx.fillStyle = vertical(ctx, 0, 820, [[0, '#8fd0f2'], [1, '#e4f5fb']]);
    ctx.fillRect(0, 0, w, h);
    const glow = ctx.createRadialGradient(1340, 210, 60, 1340, 210, 260);
    glow.addColorStop(0, '#fff4c4');
    glow.addColorStop(1, '#fff4c400');
    ctx.fillStyle = glow;
    ctx.fillRect(1000, 0, 600, 500);
    circle(ctx, 1340, 210, 95, '#ffd45e');
    cloud(ctx, 300, 200, 1.3);
    cloud(ctx, 820, 120, 0.9);
    cloud(ctx, 1080, 360, 0.7, '#f7fcff');
    hills(ctx, w, h, 760, 60, 3, 0.4, '#b5dc93');
    hills(ctx, w, h, 860, 50, 2, 2.2, '#8cc76f');
    hills(ctx, w, h, 980, 30, 1.5, 1, vertical(ctx, 940, h, [[0, '#71b35c'], [1, '#5c9c4b']]));
    const random = seeded(7);
    for (let i = 0; i < 70; i++) {
      const x = random() * w;
      const y = 1010 + random() * 170;
      if (x > 420 && x < 1180 && y < 1090) continue;
      circle(ctx, x, y, 7 + random() * 5, ['#ffffff', '#ffe27a', '#f5a8c4', '#c9b6f0'][i % 4]);
      circle(ctx, x, y, 3, '#f4b13d');
    }
  },
} satisfies StarterDef;
