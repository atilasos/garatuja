import type { MagicEffect, Point } from '../core/types';
import { edgeShade, highlightTint, rgba } from './_util/c-color';
import { DirtyTracker } from './_util/c-geom';

export default {
  id: 'repeat-row',
  label: { pt: 'Repetir em linha', en: 'Repeat in a row' },
  hint: { pt: 'Arrasta para repetir o teu traço lado a lado.', en: 'Drag to repeat your stroke side by side.' },
  category: 'padroes',
  level: 2,
  order: 414,
  usesColor: true,
  stroke(from, to, c, size) {
    const ctx = c.ctx;
    const dirty = new DirtyTracker();
    const width = Math.max(3, size * 0.34);
    const step = Math.max(26, Math.min(Math.round(c.width / 3.4), Math.round(size * 2.2)));
    const rim = edgeShade(c.color);
    const shine = rgba(highlightTint(c.color), 0.38);

    const minX = Math.min(from.x, to.x);
    const maxX = Math.max(from.x, to.x);
    const pad = width + 4;
    const kStart = Math.floor((-pad - maxX) / step);
    const kEnd = Math.ceil((c.width + pad - minX) / step);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let k = kStart; k <= kEnd; k++) {
      const dx = k * step;
      const a: Point = { x: from.x + dx, y: from.y };
      const b: Point = { x: to.x + dx, y: to.y };

      ctx.strokeStyle = rim;
      ctx.lineWidth = width + 1.8;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x + 0.05, b.y);
      ctx.stroke();

      ctx.strokeStyle = c.color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x + 0.05, b.y);
      ctx.stroke();

      ctx.strokeStyle = shine;
      ctx.lineWidth = Math.max(1, width * 0.3);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x + 0.05, b.y);
      ctx.stroke();

      dirty.addSegment(a, b, width * 0.5 + 3);
    }

    ctx.restore();
    dirty.flush(c);
  },
} satisfies MagicEffect;
