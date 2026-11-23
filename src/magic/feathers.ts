import { interpolateDabs } from '../core/draw';
import type { MagicEffect, Point, ToolContext } from '../core/types';
import { edgeShade, highlightTint, rgba, shiftColor } from './_util/c-color';
import { DirtyTracker } from './_util/c-geom';

let remaining = 0;

function drawFeather(
  ctx: CanvasRenderingContext2D,
  p: Point,
  angle: number,
  size: number,
  color: string,
  rand: () => number,
  dirty: DirtyTracker,
) {
  const len = size * (0.76 + rand() * 0.28);
  const maxW = len * 0.36;
  const curve = (rand() - 0.5) * len * 0.16;
  const quillColor = highlightTint(color);
  const barbDark = edgeShade(color);
  const barbMid = shiftColor(color, (rand() - 0.5) * 14, 0.04, (rand() - 0.4) * 0.1);
  const barbs = 16;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle + (rand() - 0.5) * 0.5);
  ctx.lineCap = 'round';

  // Soft translucent plume vane backdrop for richer feather volume
  ctx.fillStyle = rgba(barbMid, 0.42);
  ctx.beginPath();
  ctx.moveTo(len * 0.1, 0);
  ctx.quadraticCurveTo(len * 0.52, -maxW * 1.15 + curve, len * 0.98, 0);
  ctx.quadraticCurveTo(len * 0.52, maxW * 1.15 + curve, len * 0.1, 0);
  ctx.closePath();
  ctx.fill();

  // Fine silky barbs fanning off both sides of the curved rachis
  for (let i = 2; i < barbs; i++) {
    const t = i / barbs;
    const bx = t * len;
    const by = Math.sin(t * Math.PI) * curve;
    const envelope = Math.sin(t * Math.PI) * (0.65 + 0.35 * (1 - t));
    const notch = i === 6 || i === 11 ? 0.62 : 1;
    const span = maxW * envelope * notch;
    const sweep = len * 0.15;

    ctx.strokeStyle = i % 3 === 0 ? rgba(barbDark, 0.78) : rgba(barbMid, 0.92);
    ctx.lineWidth = Math.max(1.2, size * 0.048);

    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + sweep * 0.45, by - span * 0.65, bx + sweep, by - span);
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + sweep * 0.45, by + span * 0.65, bx + sweep, by + span);
    ctx.stroke();
  }

  // Tapered pale central quill (rachis)
  ctx.strokeStyle = quillColor;
  ctx.lineWidth = Math.max(1.4, size * 0.055);
  ctx.beginPath();
  ctx.moveTo(-len * 0.12, 0);
  ctx.quadraticCurveTo(len * 0.48, curve * 1.15, len * 0.98, 0);
  ctx.stroke();

  ctx.restore();
  dirty.addPoint(p.x, p.y, len + maxW + 4);
}

function scatterFeathers(p: Point, angle: number, c: ToolContext, size: number, dirty: DirtyTracker) {
  const spread = size * 0.24;
  const fx = p.x + (c.random() - 0.5) * spread * 2;
  const fy = p.y + (c.random() - 0.5) * spread * 2;
  drawFeather(c.ctx, { x: fx, y: fy }, angle, size, c.color, c.random, dirty);
}

export default {
  id: 'feathers',
  label: { pt: 'Penas', en: 'Feathers' },
  hint: { pt: 'Arrasta para pintar penas suaves.', en: 'Drag to paint soft feathers.' },
  category: 'pintar',
  level: 2,
  order: 124,
  usesColor: true,
  begin() {
    remaining = 0;
  },
  stroke(from, to, c, size) {
    const dirty = new DirtyTracker();
    const spacing = Math.max(8, size * 0.46);
    if (from.x === to.x && from.y === to.y) {
      scatterFeathers(to, -0.5, c, size, dirty);
      remaining = spacing;
    } else {
      remaining = interpolateDabs(from, to, spacing, remaining, (p, _f, angle) => {
        scatterFeathers(p, angle, c, size, dirty);
      });
    }
    dirty.flush(c);
  },
} satisfies MagicEffect;
