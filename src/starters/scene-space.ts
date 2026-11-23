import type { StarterDef } from '../core/types';
import { circle, sceneCategory, seeded, star } from './lib/art';

export default {
  id: 'scene-space', label: { pt: 'Espaço', en: 'Outer space' }, category: sceneCategory,
  paper(ctx, w, h) {
    const sky = ctx.createRadialGradient(w / 2, h / 2, 100, w / 2, h / 2, 1000);
    sky.addColorStop(0, '#2a2160');
    sky.addColorStop(1, '#0c0e2c');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    for (const [x, y, r, color] of [[420, 360, 420, '#7b4fb04a'], [1150, 820, 460, '#2fa3a83a']] as const) {
      const cloud = ctx.createRadialGradient(x, y, 0, x, y, r);
      cloud.addColorStop(0, color);
      cloud.addColorStop(1, '#00000000');
      ctx.fillStyle = cloud;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const random = seeded(42);
    for (let i = 0; i < 220; i++) circle(ctx, random() * w, random() * h, 1 + random() * 2.6, `rgba(255,255,255,${0.35 + random() * 0.65})`);
    ctx.fillStyle = '#fff1b0';
    for (const [x, y] of [[1000, 140], [180, 900], [760, 1080], [1460, 520]]) { star(ctx, x, y, 16, 4, 0.3); ctx.fill(); }
    const ring = (from: number, to: number) => {
      ctx.save();
      ctx.strokeStyle = '#f6dca9';
      ctx.lineWidth = 20;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.ellipse(270, 960, 420, 86, -0.28, from, to);
      ctx.stroke();
      ctx.restore();
    };
    ring(Math.PI, Math.PI * 2);
    const planet = ctx.createRadialGradient(190, 880, 30, 270, 960, 260);
    planet.addColorStop(0, '#ffc58a');
    planet.addColorStop(1, '#d9735a');
    circle(ctx, 270, 960, 240, planet);
    ctx.save();
    ctx.strokeStyle = '#c8644f';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.arc(270, 960, 200, Math.PI * 0.15, Math.PI * 0.55);
    ctx.stroke();
    ctx.restore();
    ring(0, Math.PI);
    const moon = ctx.createRadialGradient(1300, 230, 10, 1330, 260, 140);
    moon.addColorStop(0, '#bfe9ff');
    moon.addColorStop(1, '#5b8fd6');
    circle(ctx, 1330, 260, 125, moon);
    circle(ctx, 1290, 230, 22, '#7eaee2');
    circle(ctx, 1370, 300, 16, '#7eaee2');
  },
} satisfies StarterDef;
