import type { StarterDef } from '../core/types';
import { circle, cloud, sceneCategory, seeded, vertical } from './lib/art';

export default {
  id: 'scene-city', label: { pt: 'Cidade', en: 'Town' }, category: sceneCategory,
  paper(ctx, w, h) {
    ctx.fillStyle = vertical(ctx, 0, 900, [[0, '#a9dcf3'], [1, '#f5f0df']]);
    ctx.fillRect(0, 0, w, h);
    cloud(ctx, 380, 150, 0.9);
    cloud(ctx, 1220, 110, 1.1);
    const random = seeded(9);
    const colors = ['#f2b8a2', '#f6d58c', '#a9cfe6', '#c7b7e3', '#b9dcae', '#efc5d6'];
    let x = -20;
    let i = 0;
    while (x < w) {
      const width = 150 + random() * 110;
      const height = 300 + random() * 380;
      const top = 920 - height;
      ctx.fillStyle = colors[i++ % colors.length];
      ctx.beginPath();
      ctx.roundRect(x, top, width - 10, height, [14, 14, 0, 0]);
      ctx.fill();
      ctx.fillStyle = '#ffffffb8';
      for (let wy = top + 40; wy < 870; wy += 80) {
        for (let wx = x + 26; wx < x + width - 50; wx += 56) ctx.fillRect(wx, wy, 30, 42);
      }
      x += width;
    }
    ctx.fillStyle = '#d8cfc1';
    ctx.fillRect(0, 920, w, 70);
    ctx.fillStyle = '#76757c';
    ctx.fillRect(0, 990, w, h - 990);
    ctx.fillStyle = '#f4f1e8';
    for (let lx = 40; lx < w; lx += 200) ctx.fillRect(lx, 1088, 110, 14);
    for (const tx of [140, 760, 1420]) {
      ctx.fillStyle = '#8a6547';
      ctx.fillRect(tx - 9, 860, 18, 80);
      circle(ctx, tx, 840, 54, '#63a660');
    }
  },
} satisfies StarterDef;
