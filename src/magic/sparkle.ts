import { interpolateDabs } from '../core/draw';
import type { MagicEffect, Point, ToolContext } from '../core/types';
import { edgeShade, highlightTint, rgba, shiftColor } from './_util/c-color';
import { DirtyTracker } from './_util/c-geom';
import { traceSparkle } from './_util/c-shapes';

let remaining = 0;

function drawTwinkle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  rotation: number,
  dirty: DirtyTracker,
) {
  const glowR = radius * 1.15;
  ctx.save();
  ctx.translate(x, y);

  // Soft radiant halo
  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
  halo.addColorStop(0, rgba(highlightTint(color), 0.72));
  halo.addColorStop(0.5, rgba(color, 0.25));
  halo.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, glowR, 0, Math.PI * 2);
  ctx.fill();

  // Diagonal secondary glints
  ctx.save();
  ctx.rotate(rotation + Math.PI / 4);
  traceSparkle(ctx, 0, 0, radius * 0.52, radius * 0.52, 0.24);
  ctx.fillStyle = rgba(shiftColor(color, 18, 0.08, 0.14), 0.75);
  ctx.fill();
  ctx.restore();

  // Main 4-point star
  ctx.save();
  ctx.rotate(rotation);
  traceSparkle(ctx, 0, 0, radius, radius * 1.08, 0.2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = rgba(edgeShade(color), 0.55);
  ctx.lineWidth = Math.max(0.8, radius * 0.07);
  ctx.stroke();

  // Crisp bright center diamond
  traceSparkle(ctx, 0, 0, radius * 0.56, radius * 0.62, 0.25);
  ctx.fillStyle = '#fffef8';
  ctx.fill();
  ctx.restore();

  ctx.restore();
  dirty.addPoint(x, y, glowR + 2);
}

function scatterSparkles(p: Point, c: ToolContext, size: number, dirty: DirtyTracker) {
  const ctx = c.ctx;
  const spread = size * 0.58;
  const count = 2 + Math.floor(c.random() * 2);
  for (let i = 0; i < count; i++) {
    const angle = c.random() * Math.PI * 2;
    const dist = Math.sqrt(c.random()) * spread;
    const sx = p.x + Math.cos(angle) * dist;
    const sy = p.y + Math.sin(angle) * dist;
    const rad = size * (i === 0 ? 0.26 + c.random() * 0.18 : 0.12 + c.random() * 0.12);
    const tint = shiftColor(c.color, (c.random() - 0.5) * 32, 0.06, (c.random() - 0.35) * 0.18);
    drawTwinkle(ctx, sx, sy, rad, tint, (c.random() - 0.5) * 0.45, dirty);
  }
  // Tiny stardust specks
  for (let i = 0; i < 3; i++) {
    const a = c.random() * Math.PI * 2;
    const d = c.random() * spread * 1.15;
    const dx = p.x + Math.cos(a) * d;
    const dy = p.y + Math.sin(a) * d;
    const r = Math.max(1, size * (0.03 + c.random() * 0.03));
    ctx.fillStyle = i === 0 ? '#fffbe6' : shiftColor(c.color, 25, 0.1, 0.2);
    ctx.beginPath();
    ctx.arc(dx, dy, r, 0, Math.PI * 2);
    ctx.fill();
    dirty.addPoint(dx, dy, r + 2);
  }
}

export default {
  id: 'sparkle',
  label: { pt: 'Cintilar', en: 'Sparkle' },
  hint: { pt: 'Arrasta para espalhar estrelinhas brilhantes.', en: 'Drag to scatter glowing sparkles.' },
  category: 'pintar',
  level: 1,
  order: 101,
  usesColor: true,
  begin() {
    remaining = 0;
  },
  stroke(from, to, c, size) {
    const dirty = new DirtyTracker();
    const spacing = Math.max(6, size * 0.48);
    if (from.x === to.x && from.y === to.y) {
      scatterSparkles(to, c, size, dirty);
      remaining = spacing;
    } else {
      remaining = interpolateDabs(from, to, spacing, remaining, p => {
        scatterSparkles(p, c, size, dirty);
      });
    }
    dirty.flush(c);
  },
} satisfies MagicEffect;
