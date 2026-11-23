import type { StarterDef } from '../core/types';
import { circle, hills, sceneCategory, seeded, vertical } from './lib/art';

function tree(ctx: CanvasRenderingContext2D, x: number, base: number, size: number, leaves: string, trunk: string) {
  ctx.fillStyle = trunk;
  ctx.beginPath();
  ctx.roundRect(x - size * 0.12, base - size * 1.1, size * 0.24, size * 1.1, size * 0.05);
  ctx.fill();
  for (const [dx, dy, r] of [[0, -1.45, 0.62], [-0.42, -1.1, 0.48], [0.42, -1.1, 0.48], [0, -0.95, 0.5]]) {
    circle(ctx, x + dx * size, base + dy * size, r * size, leaves);
  }
}

export default {
  id: 'scene-forest', label: { pt: 'Floresta', en: 'Forest' }, category: sceneCategory,
  paper(ctx, w, h) {
    ctx.fillStyle = vertical(ctx, 0, 700, [[0, '#bfe6ee'], [1, '#eef8e6']]);
    ctx.fillRect(0, 0, w, h);
    const random = seeded(11);
    for (let x = -40; x < w + 80; x += 110) tree(ctx, x + random() * 40, 760, 210 + random() * 60, '#a7cfa0', '#b5a189');
    hills(ctx, w, h, 800, 25, 2, 1, vertical(ctx, 760, h, [[0, '#8fbf6c'], [1, '#6c9e52']]));
    ctx.beginPath();
    ctx.moveTo(620, h);
    ctx.bezierCurveTo(700, 1000, 900, 950, 800, 800);
    ctx.lineTo(860, 800);
    ctx.bezierCurveTo(1000, 950, 900, 1050, 1000, h);
    ctx.closePath();
    ctx.fillStyle = '#e3cd9c';
    ctx.fill();
    for (const [x, s] of [[110, 430], [330, 330], [1300, 340], [1510, 450]]) tree(ctx, x, 1130, s, '#4f9459', '#8a6547');
    for (let i = 0; i < 40; i++) {
      const x = random() * w;
      const y = 1080 + random() * 110;
      ctx.fillStyle = '#5e9a4a';
      ctx.beginPath();
      ctx.moveTo(x - 8, y);
      ctx.lineTo(x, y - 26);
      ctx.lineTo(x + 8, y);
      ctx.fill();
    }
  },
} satisfies StarterDef;
