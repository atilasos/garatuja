import { rgbToHex } from '../core/draw';
import type { MagicEffect } from '../core/types';
import { clamp, edgeShade, highlightTint, mixColors, rgba } from './_util/c-color';
import { DirtyTracker } from './_util/c-geom';

let carryColor = '#000000';

function sampleUnder(ctx: CanvasRenderingContext2D, x: number, y: number, fallback: string): string {
  const sx = clamp(Math.floor(x), 0, ctx.canvas.width - 1);
  const sy = clamp(Math.floor(y), 0, ctx.canvas.height - 1);
  const data = ctx.getImageData(sx, sy, 1, 1).data;
  if (data[3] === 0) return fallback;
  return rgbToHex({ r: data[0], g: data[1], b: data[2] });
}

export default {
  id: 'fingerpaint',
  label: { pt: 'Pintura a dedos', en: 'Finger paint' },
  hint: { pt: 'Arrasta para espalhar tinta suave com os dedos.', en: 'Drag to smear soft paint with your fingers.' },
  category: 'pintar',
  level: 2,
  order: 128,
  usesColor: true,
  begin(p, c) {
    const beneath = sampleUnder(c.ctx, p.x, p.y, c.color);
    carryColor = mixColors(c.color, beneath, 0.18);
  },
  stroke(from, to, c, size) {
    const ctx = c.ctx;
    const dirty = new DirtyTracker();
    const beneath = sampleUnder(c.ctx, to.x, to.y, c.color);
    carryColor = mixColors(mixColors(carryColor, c.color, 0.35), beneath, 0.14);

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.hypot(dx, dy);
    const nx = dist > 0.5 ? -dy / dist : 0;
    const ny = dist > 0.5 ? dx / dist : 1;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Soft outer smudged gouache halo
    ctx.strokeStyle = rgba(carryColor, 0.24);
    ctx.lineWidth = size * 1.12;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x + 0.05, to.y);
    ctx.stroke();

    // Creamy main finger body
    ctx.strokeStyle = rgba(carryColor, 0.55);
    ctx.lineWidth = size * 0.84;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x + 0.05, to.y);
    ctx.stroke();

    // Tactile parallel fingertip paint ridges
    const ridges = [-0.28, -0.1, 0.08, 0.26];
    const ridgeDark = rgba(edgeShade(carryColor), 0.34);
    const ridgeLight = rgba(highlightTint(carryColor), 0.32);
    ridges.forEach((frac, i) => {
      const ox = nx * size * frac;
      const oy = ny * size * frac;
      ctx.strokeStyle = i % 2 === 0 ? ridgeDark : ridgeLight;
      ctx.lineWidth = Math.max(1.4, size * 0.11);
      ctx.beginPath();
      ctx.moveTo(from.x + ox, from.y + oy);
      ctx.lineTo(to.x + ox + 0.05, to.y + oy);
      ctx.stroke();
    });

    ctx.restore();
    dirty.addSegment(from, to, size * 0.62 + 3);
    dirty.flush(c);
  },
} satisfies MagicEffect;
