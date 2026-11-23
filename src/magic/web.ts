import { interpolateDabs } from '../core/draw';
import type { MagicEffect, Point } from '../core/types';
import { edgeShade, rgba } from './_util/c-color';
import { DirtyTracker } from './_util/c-geom';

let hub: Point = { x: 0, y: 0 };
let prevSpoke: Point | null = null;
let remaining = 0;

function drawMiniHub(ctx: CanvasRenderingContext2D, center: Point, radius: number, color: string, dirty: DirtyTracker) {
  const spokes = 8;
  const silk = rgba(edgeShade(color), 0.72);
  ctx.save();
  ctx.strokeStyle = silk;
  ctx.lineWidth = Math.max(1, radius * 0.055);
  ctx.lineCap = 'round';

  for (let i = 0; i < spokes; i++) {
    const a = (i * Math.PI * 2) / spokes;
    ctx.beginPath();
    ctx.moveTo(center.x, center.y);
    ctx.lineTo(center.x + Math.cos(a) * radius, center.y + Math.sin(a) * radius);
    ctx.stroke();
  }

  for (const frac of [0.35, 0.68, 0.94]) {
    const r = radius * frac;
    ctx.beginPath();
    for (let i = 0; i < spokes; i++) {
      const a1 = (i * Math.PI * 2) / spokes;
      const a2 = ((i + 1) * Math.PI * 2) / spokes;
      const mid = (a1 + a2) / 2;
      const x1 = center.x + Math.cos(a1) * r;
      const y1 = center.y + Math.sin(a1) * r;
      const x2 = center.x + Math.cos(a2) * r;
      const y2 = center.y + Math.sin(a2) * r;
      const cx = center.x + Math.cos(mid) * (r * 0.8);
      const cy = center.y + Math.sin(mid) * (r * 0.8);
      if (i === 0) ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(cx, cy, x2, y2);
    }
    ctx.stroke();
  }
  ctx.restore();
  dirty.addPoint(center.x, center.y, radius + 3);
}

export default {
  id: 'web',
  label: { pt: 'Teia', en: 'Spider web' },
  hint: { pt: 'Arrasta para tecer uma teia de aranha.', en: 'Drag to spin a spider web.' },
  category: 'pintar',
  level: 2,
  order: 123,
  usesColor: true,
  begin(p) {
    hub = { x: p.x, y: p.y };
    prevSpoke = null;
    remaining = 0;
  },
  stroke(from, to, c, size) {
    const ctx = c.ctx;
    const dirty = new DirtyTracker();
    const spacing = Math.max(10, size * 0.45);
    const silkW = Math.max(1.2, size * 0.048);

    if (from.x === to.x && from.y === to.y) {
      drawMiniHub(ctx, hub, size * 0.54, c.color, dirty);
      prevSpoke = { x: hub.x + size * 0.54, y: hub.y };
      remaining = spacing;
      dirty.flush(c);
      return;
    }

    const silkColor = rgba(edgeShade(c.color), 0.78);
    ctx.save();
    ctx.strokeStyle = silkColor;
    ctx.lineWidth = silkW;
    ctx.lineCap = 'round';

    remaining = interpolateDabs(from, to, spacing, remaining, p => {
      // Radial silk spoke from hub to dragged edge
      ctx.beginPath();
      ctx.moveTo(hub.x, hub.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      dirty.addSegment(hub, p, silkW + 3);

      // Sagging catenary concentric silk rungs connecting to the previous spoke
      if (prevSpoke) {
        const rings = 5;
        for (let r = 1; r <= rings; r++) {
          const t = r / rings;
          const ax = hub.x + (prevSpoke.x - hub.x) * t;
          const ay = hub.y + (prevSpoke.y - hub.y) * t;
          const bx = hub.x + (p.x - hub.x) * t;
          const by = hub.y + (p.y - hub.y) * t;
          const midX = (ax + bx) * 0.5;
          const midY = (ay + by) * 0.5;
          const ctrlX = midX + (hub.x - midX) * 0.16;
          const ctrlY = midY + (hub.y - midY) * 0.16;

          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.quadraticCurveTo(ctrlX, ctrlY, bx, by);
          ctx.stroke();

          dirty.addSegment({ x: ax, y: ay }, { x: bx, y: by }, silkW + 4);
          dirty.addPoint(ctrlX, ctrlY, silkW + 3);
        }
      }

      // Tiny morning dewdrop glistening on the web edge
      if (c.random() > 0.6) {
        const dewR = Math.max(1.2, size * 0.055);
        ctx.fillStyle = 'rgba(235, 248, 255, 0.85)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, dewR, 0, Math.PI * 2);
        ctx.fill();
        dirty.addPoint(p.x, p.y, dewR + 2);
      }

      prevSpoke = { x: p.x, y: p.y };
    });

    ctx.restore();
    dirty.flush(c);
  },
} satisfies MagicEffect;
