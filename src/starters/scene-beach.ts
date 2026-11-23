import type { StarterDef } from '../core/types';
import { circle, cloud, sceneCategory, seeded, vertical } from './lib/art';

export default {
  id: 'scene-beach', label: { pt: 'Praia e mar', en: 'Beach and sea' }, category: sceneCategory,
  paper(ctx, w, h) {
    ctx.fillStyle = vertical(ctx, 0, 560, [[0, '#7ec8ef'], [1, '#d9f1fa']]);
    ctx.fillRect(0, 0, w, h);
    circle(ctx, 260, 190, 90, '#ffd968');
    cloud(ctx, 900, 170, 1.1);
    cloud(ctx, 1350, 280, 0.75);
    ctx.fillStyle = vertical(ctx, 540, 800, [[0, '#3f95c8'], [1, '#79c8e2']]);
    ctx.fillRect(0, 540, w, 300);
    ctx.save();
    ctx.strokeStyle = '#e9f7fb';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    const random = seeded(3);
    for (let i = 0; i < 26; i++) {
      const x = random() * w;
      const y = 580 + random() * 180;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 22, y - 12, x + 44, y);
      ctx.stroke();
    }
    ctx.restore();
    const shore = (offset: number) => {
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 20) ctx.lineTo(x, 790 + offset + Math.sin(x / 140) * 18 + Math.sin(x / 47) * 6);
      ctx.lineTo(w, h);
      ctx.closePath();
    };
    shore(-14);
    ctx.fillStyle = '#f7fbfb';
    ctx.fill();
    shore(0);
    ctx.fillStyle = vertical(ctx, 780, h, [[0, '#f5dfae'], [1, '#e8c587']]);
    ctx.fill();
    for (let i = 0; i < 9; i++) {
      const x = 80 + random() * (w - 160);
      const y = 1000 + random() * 160;
      if (x > 450 && x < 1150) continue;
      circle(ctx, x, y, 9, ['#f4b9a7', '#fff3dc', '#e7a86f'][i % 3]);
    }
  },
} satisfies StarterDef;
