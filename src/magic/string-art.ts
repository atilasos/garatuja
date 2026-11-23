import { interpolateDabs } from '../core/draw';
import type { MagicEffect, Point } from '../core/types';
import { edgeShade, rgba, shiftColor } from './_util/c-color';
import { DirtyTracker } from './_util/c-geom';

let anchor: Point = { x: 0, y: 0 };
let remaining = 0;
let strandCount = 0;

export default {
  id: 'string-art',
  label: { pt: 'Arte de fios', en: 'String art' },
  hint: { pt: 'Arrasta para esticar fios desde o ponto inicial.', en: 'Drag to stretch threads from the starting point.' },
  category: 'pintar',
  level: 2,
  order: 122,
  usesColor: true,
  begin(p) {
    anchor = { x: p.x, y: p.y };
    remaining = 0;
    strandCount = 0;
  },
  stroke(from, to, c, size) {
    const ctx = c.ctx;
    const dirty = new DirtyTracker();
    const threadW = Math.max(1.1, size * 0.042);
    const pinR = Math.max(2, size * 0.08);

    ctx.save();
    ctx.lineCap = 'round';

    if (from.x === to.x && from.y === to.y) {
      // Starting anchor pin
      ctx.fillStyle = edgeShade(c.color);
      ctx.beginPath();
      ctx.arc(anchor.x, anchor.y, pinR * 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(anchor.x, anchor.y, pinR * 0.7, 0, Math.PI * 2);
      ctx.fill();
      dirty.addPoint(anchor.x, anchor.y, pinR * 1.4 + 2);
      remaining = Math.max(5, size * 0.24);
      ctx.restore();
      dirty.flush(c);
      return;
    }

    const spacing = Math.max(5, size * 0.24);
    remaining = interpolateDabs(from, to, spacing, remaining, p => {
      const hueShift = ((strandCount % 9) - 4) * 5;
      const lightShift = ((strandCount % 5) - 2) * 0.04;
      const threadColor = shiftColor(c.color, hueShift, 0.04, lightShift);

      // Taut silky thread from anchor to current rim pin
      ctx.strokeStyle = rgba(threadColor, 0.68);
      ctx.lineWidth = threadW;
      ctx.beginPath();
      ctx.moveTo(anchor.x, anchor.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();

      // Tiny rim pin dot
      ctx.fillStyle = edgeShade(threadColor);
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1.3, pinR * 0.55), 0, Math.PI * 2);
      ctx.fill();

      dirty.addSegment(anchor, p, Math.max(threadW, pinR) + 3);
      strandCount++;
    });

    ctx.restore();
    dirty.flush(c);
  },
} satisfies MagicEffect;
