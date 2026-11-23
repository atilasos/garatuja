import { interpolateDabs } from '../core/draw';
import type { MagicEffect, Point } from '../core/types';
import { DirtyTracker } from './_util/c-geom';
import { drawFlowerBloom, drawLeaf } from './_util/c-shapes';

let remaining = 0;
let leafSide = 1;
let moved = false;
let startPt: Point = { x: 0, y: 0 };

export default {
  id: 'flowers',
  label: { pt: 'Flores', en: 'Flowers' },
  hint: { pt: 'Arrasta para crescer o caule e larga para abrir a flor.', en: 'Drag to grow the stem and let go to bloom a flower.' },
  category: 'pintar',
  level: 1,
  order: 103,
  usesColor: true,
  begin(p) {
    remaining = 0;
    leafSide = 1;
    moved = false;
    startPt = { x: p.x, y: p.y };
  },
  stroke(from, to, c, size) {
    const ctx = c.ctx;
    const dirty = new DirtyTracker();
    const stemW = Math.max(3, size * 0.14);

    if (Math.hypot(to.x - from.x, to.y - from.y) > 1.5) moved = true;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Outer deeper green stem border
    ctx.strokeStyle = '#336b35';
    ctx.lineWidth = stemW + 2;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x + 0.05, to.y);
    ctx.stroke();

    // Inner bright green stem
    ctx.strokeStyle = '#55a64a';
    ctx.lineWidth = stemW;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x + 0.05, to.y);
    ctx.stroke();
    ctx.restore();
    dirty.addSegment(from, to, stemW + 3);

    // Sprout alternating leaves along the growing stem
    const leafSpacing = Math.max(12, size * 0.72);
    if (from.x === to.x && from.y === to.y) {
      remaining = leafSpacing * 0.5;
    } else {
      remaining = interpolateDabs(from, to, leafSpacing, remaining, (p, _f, angle) => {
        const len = size * (0.34 + c.random() * 0.14);
        const wid = len * 0.46;
        const leafAngle = angle + leafSide * (0.8 + c.random() * 0.3);
        leafSide *= -1;
        drawLeaf(ctx, p.x, p.y, len, wid, leafAngle, '#58ab49');
        dirty.addPoint(p.x, p.y, len + 4);
      });
    }

    dirty.flush(c);
  },
  end(p, c, size) {
    const ctx = c.ctx;
    const dirty = new DirtyTracker();
    // On a quick tap without drag, add a tiny sprout below the bloom
    if (!moved && Math.hypot(p.x - startPt.x, p.y - startPt.y) < 3) {
      const stemLen = size * 0.55;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#3d803b';
      ctx.lineWidth = Math.max(3, size * 0.14);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x, p.y + stemLen);
      ctx.stroke();
      ctx.restore();
      drawLeaf(ctx, p.x, p.y + stemLen * 0.55, size * 0.32, size * 0.16, -0.5, '#58ab49');
      dirty.addSegment(p, { x: p.x, y: p.y + stemLen }, size * 0.4 + 4);
    }

    const radius = size * (0.5 + c.random() * 0.12);
    const petals = 5 + Math.floor(c.random() * 3);
    const rot = c.random() * Math.PI * 2;
    drawFlowerBloom(ctx, p.x, p.y, radius, c.color, petals, rot);
    dirty.addPoint(p.x, p.y, radius * 1.18 + 4);
    dirty.flush(c);
  },
} satisfies MagicEffect;
