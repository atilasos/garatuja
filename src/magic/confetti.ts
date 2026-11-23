import { interpolateDabs } from '../core/draw';
import type { MagicEffect, Point, ToolContext } from '../core/types';
import { DirtyTracker } from './_util/c-geom';

const palette = ['#e65955', '#f2a23a', '#f6d44e', '#46b383', '#4998d8', '#996ac9', '#e86fa4', '#2cb5b0'];
let remaining = 0;

function tossConfetti(p: Point, c: ToolContext, size: number, dirty: DirtyTracker) {
  const ctx = c.ctx;
  const spread = size * 0.72;
  const pieces = 5 + Math.floor(c.random() * 4);

  ctx.save();
  for (let i = 0; i < pieces; i++) {
    const a = c.random() * Math.PI * 2;
    const d = Math.sqrt(c.random()) * spread;
    const x = p.x + Math.cos(a) * d;
    const y = p.y + Math.sin(a) * d;
    const col = palette[Math.floor(c.random() * palette.length)];
    const kind = Math.floor(c.random() * 4);
    const scale = size * (0.1 + c.random() * 0.13);
    const rot = c.random() * Math.PI * 2;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = col;
    ctx.strokeStyle = col;

    if (kind === 0) {
      // Classic paper rectangle
      ctx.fillRect(-scale * 0.65, -scale * 0.32, scale * 1.3, scale * 0.64);
    } else if (kind === 1) {
      // Circle dot
      ctx.beginPath();
      ctx.arc(0, 0, scale * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 2) {
      // Festive triangle pennant
      ctx.beginPath();
      ctx.moveTo(0, -scale * 0.65);
      ctx.lineTo(scale * 0.58, scale * 0.5);
      ctx.lineTo(-scale * 0.58, scale * 0.5);
      ctx.closePath();
      ctx.fill();
    } else {
      // Curled tiny ribbon streamer
      ctx.lineWidth = Math.max(1.8, scale * 0.34);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-scale * 0.85, 0);
      ctx.bezierCurveTo(-scale * 0.3, -scale * 0.6, scale * 0.3, scale * 0.6, scale * 0.85, 0);
      ctx.stroke();
    }
    ctx.restore();
    dirty.addPoint(x, y, scale * 1.15 + 3);
  }
  ctx.restore();
}

export default {
  id: 'confetti',
  label: { pt: 'Confetes', en: 'Confetti' },
  hint: { pt: 'Arrasta para lançar confetes coloridos.', en: 'Drag to toss colorful confetti.' },
  category: 'pintar',
  level: 1,
  order: 113,
  usesColor: false,
  begin() {
    remaining = 0;
  },
  stroke(from, to, c, size) {
    const dirty = new DirtyTracker();
    const spacing = Math.max(7, size * 0.44);
    if (from.x === to.x && from.y === to.y) {
      tossConfetti(to, c, size, dirty);
      remaining = spacing;
    } else {
      remaining = interpolateDabs(from, to, spacing, remaining, p => {
        tossConfetti(p, c, size, dirty);
      });
    }
    dirty.flush(c);
  },
} satisfies MagicEffect;
