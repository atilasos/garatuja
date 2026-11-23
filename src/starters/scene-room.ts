import type { StarterDef } from '../core/types';
import { circle, sceneCategory, vertical } from './lib/art';

export default {
  id: 'scene-room', label: { pt: 'Sala', en: 'Living room' }, category: sceneCategory,
  paper(ctx, w, h) {
    ctx.fillStyle = '#f7e6c8';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f1dcb8';
    for (let x = 0; x < w; x += 120) ctx.fillRect(x, 0, 60, 860);
    // Window with curtains.
    ctx.fillStyle = vertical(ctx, 160, 560, [[0, '#8fd0f2'], [1, '#dff3fb']]);
    ctx.fillRect(170, 170, 380, 380);
    circle(ctx, 470, 250, 40, '#ffd968');
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 18;
    ctx.strokeRect(170, 170, 380, 380);
    ctx.beginPath();
    ctx.moveTo(360, 170);
    ctx.lineTo(360, 550);
    ctx.moveTo(170, 360);
    ctx.lineTo(550, 360);
    ctx.lineWidth = 12;
    ctx.stroke();
    ctx.fillStyle = '#e98f7c';
    for (const [x, dir] of [[120, 1], [600, -1]] as const) {
      ctx.beginPath();
      ctx.moveTo(x, 130);
      ctx.lineTo(x + dir * 110, 130);
      ctx.quadraticCurveTo(x + dir * 40, 380, x + dir * 90, 620);
      ctx.lineTo(x, 620);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#9a6a4a';
    ctx.fillRect(90, 115, 540, 18);
    // Empty picture frame and shelf.
    ctx.fillStyle = '#fffaf0';
    ctx.fillRect(1120, 200, 300, 230);
    ctx.strokeStyle = '#b98557';
    ctx.lineWidth = 20;
    ctx.strokeRect(1120, 200, 300, 230);
    ctx.fillStyle = '#b98557';
    ctx.fillRect(1080, 600, 380, 22);
    for (const [x, color] of [[1110, '#7fb3d9'], [1150, '#e7a35b'], [1195, '#9bc78a']] as const) {
      ctx.fillStyle = color;
      ctx.fillRect(x, 480, 34, 120);
    }
    circle(ctx, 1390, 560, 38, '#f2c6d3');
    // Floor.
    ctx.fillStyle = '#e8d3ae';
    ctx.fillRect(0, 840, w, 40);
    ctx.fillStyle = vertical(ctx, 880, h, [[0, '#cf9a66'], [1, '#b98152']]);
    ctx.fillRect(0, 880, w, h - 880);
    ctx.strokeStyle = '#a8734a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let y = 950; y < h; y += 80) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
    ctx.fillStyle = '#9fc7c0';
    ctx.beginPath();
    ctx.ellipse(w / 2, 1060, 520, 95, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f7f1e3';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.ellipse(w / 2, 1060, 470, 72, 0, 0, Math.PI * 2);
    ctx.stroke();
  },
} satisfies StarterDef;
