import type { StarterDef } from '../core/types';
import { circle, sceneCategory, seeded, vertical } from './lib/art';

function weed(ctx: CanvasRenderingContext2D, x: number, base: number, height: number, color: string, phase: number) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 18;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, base);
  for (let y = 0; y <= height; y += 20) ctx.lineTo(x + Math.sin(y / 60 + phase) * 26, base - y);
  ctx.stroke();
  ctx.restore();
}

export default {
  id: 'scene-sea', label: { pt: 'Fundo do mar', en: 'Under the sea' }, category: sceneCategory,
  paper(ctx, w, h) {
    ctx.fillStyle = vertical(ctx, 0, h, [[0, '#6fd0df'], [0.55, '#2d8db7'], [1, '#1d5f8e']]);
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.fillStyle = '#ffffff16';
    for (const x of [180, 520, 900, 1260]) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 140, 0);
      ctx.lineTo(x + 380, 900);
      ctx.lineTo(x + 160, 900);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 20) ctx.lineTo(x, 1020 + Math.sin(x / 210) * 30);
    ctx.lineTo(w, h);
    ctx.fillStyle = vertical(ctx, 990, h, [[0, '#e9d49d'], [1, '#d3b679']]);
    ctx.fill();
    circle(ctx, 200, 1050, 90, '#7f8aa0');
    circle(ctx, 300, 1080, 60, '#98a2b5');
    circle(ctx, 1420, 1060, 80, '#8a93a7');
    weed(ctx, 90, 1100, 420, '#3f9c6b', 0);
    weed(ctx, 150, 1090, 300, '#58b47c', 1);
    weed(ctx, 1470, 1090, 470, '#3f9c6b', 2);
    weed(ctx, 1530, 1110, 320, '#7ac78f', 3);
    const random = seeded(5);
    ctx.save();
    ctx.strokeStyle = '#e6fbff';
    ctx.lineWidth = 4;
    for (let i = 0; i < 22; i++) {
      const x = i < 11 ? 220 + random() * 120 : 1290 + random() * 120;
      ctx.beginPath();
      ctx.arc(x, 150 + random() * 800, 7 + random() * 14, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  },
} satisfies StarterDef;
