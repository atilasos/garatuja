import { interpolateDabs } from '../core/draw';
import type { MagicEffect, Point, ToolContext } from '../core/types';
import { DirtyTracker } from './_util/c-geom';

let remaining = 0;

function drawSnowflake(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  rotation: number,
  variant: number,
  dirty: DirtyTracker,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Soft icy halo so flakes stand out on white paper too
  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 1.15);
  halo.addColorStop(0, 'rgba(130, 188, 232, 0.35)');
  halo.addColorStop(1, 'rgba(130, 188, 232, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.15, 0, Math.PI * 2);
  ctx.fill();

  const traceCrystal = () => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      const px = -sin;
      const py = cos;
      ctx.moveTo(0, 0);
      ctx.lineTo(cos * radius, sin * radius);

      const branch1 = radius * 0.52;
      const twig1 = radius * (variant === 0 ? 0.3 : 0.24);
      ctx.moveTo(cos * branch1, sin * branch1);
      ctx.lineTo(cos * (branch1 + twig1 * 0.72) + px * twig1 * 0.68, sin * (branch1 + twig1 * 0.72) + py * twig1 * 0.68);
      ctx.moveTo(cos * branch1, sin * branch1);
      ctx.lineTo(cos * (branch1 + twig1 * 0.72) - px * twig1 * 0.68, sin * (branch1 + twig1 * 0.72) - py * twig1 * 0.68);

      if (variant !== 1) {
        const branch2 = radius * 0.78;
        const twig2 = radius * 0.18;
        ctx.moveTo(cos * branch2, sin * branch2);
        ctx.lineTo(cos * (branch2 + twig2 * 0.7) + px * twig2 * 0.65, sin * (branch2 + twig2 * 0.7) + py * twig2 * 0.65);
        ctx.moveTo(cos * branch2, sin * branch2);
        ctx.lineTo(cos * (branch2 + twig2 * 0.7) - px * twig2 * 0.65, sin * (branch2 + twig2 * 0.7) - py * twig2 * 0.65);
      }
    }
    if (variant === 1) {
      const hexR = radius * 0.36;
      for (let i = 0; i <= 6; i++) {
        const a = (i * Math.PI) / 3;
        if (i === 0) ctx.moveTo(Math.cos(a) * hexR, Math.sin(a) * hexR);
        else ctx.lineTo(Math.cos(a) * hexR, Math.sin(a) * hexR);
      }
    }
  };

  // Frost blue shadow outline
  traceCrystal();
  ctx.strokeStyle = '#6da7d6';
  ctx.lineWidth = Math.max(2.2, radius * 0.16);
  ctx.stroke();

  // Crisp snow-white core
  traceCrystal();
  ctx.strokeStyle = '#f5fbff';
  ctx.lineWidth = Math.max(1.1, radius * 0.08);
  ctx.stroke();

  ctx.restore();
  dirty.addPoint(x, y, radius * 1.2 + 3);
}

function scatterFlakes(p: Point, c: ToolContext, size: number, dirty: DirtyTracker) {
  const spread = size * 0.62;
  const count = 1 + (c.random() > 0.35 ? 1 : 0);
  for (let i = 0; i < count; i++) {
    const a = c.random() * Math.PI * 2;
    const d = Math.sqrt(c.random()) * spread;
    const fx = p.x + Math.cos(a) * d;
    const fy = p.y + Math.sin(a) * d;
    const r = size * (i === 0 ? 0.28 + c.random() * 0.16 : 0.16 + c.random() * 0.12);
    const rot = c.random() * Math.PI;
    const variant = Math.floor(c.random() * 3);
    drawSnowflake(c.ctx, fx, fy, r, rot, variant, dirty);
  }
}

export default {
  id: 'snow',
  label: { pt: 'Neve', en: 'Snow' },
  hint: { pt: 'Arrasta para deixar cair flocos de neve.', en: 'Drag to scatter snowflakes.' },
  category: 'pintar',
  level: 2,
  order: 109,
  usesColor: false,
  begin() {
    remaining = 0;
  },
  stroke(from, to, c, size) {
    const dirty = new DirtyTracker();
    const spacing = Math.max(9, size * 0.56);
    if (from.x === to.x && from.y === to.y) {
      scatterFlakes(to, c, size, dirty);
      remaining = spacing;
    } else {
      remaining = interpolateDabs(from, to, spacing, remaining, p => {
        scatterFlakes(p, c, size, dirty);
      });
    }
    dirty.flush(c);
  },
} satisfies MagicEffect;
