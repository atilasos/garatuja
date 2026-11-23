import { interpolateDabs } from '../core/draw';
import type { MagicEffect, Point, ToolContext } from '../core/types';
import { shiftColor } from './_util/c-color';
import { DirtyTracker } from './_util/c-geom';
import { drawLeaf } from './_util/c-shapes';

let remaining = 0;

function scatterLeaves(p: Point, travelAngle: number, c: ToolContext, size: number, dirty: DirtyTracker) {
  const count = 1 + (c.random() > 0.45 ? 1 : 0);
  for (let i = 0; i < count; i++) {
    const spread = size * 0.48;
    const a = c.random() * Math.PI * 2;
    const d = Math.sqrt(c.random()) * spread;
    const lx = p.x + Math.cos(a) * d;
    const ly = p.y + Math.sin(a) * d;
    const len = size * (0.42 + c.random() * 0.28);
    const wid = len * (0.4 + c.random() * 0.16);
    const angle = travelAngle + (c.random() - 0.5) * 2.2;
    const color = shiftColor(c.color, (c.random() - 0.5) * 26, (c.random() - 0.5) * 0.1, (c.random() - 0.45) * 0.16);
    drawLeaf(c.ctx, lx, ly, len, wid, angle, color);
    dirty.addPoint(lx, ly, len + 4);
  }
}

export default {
  id: 'leaves',
  label: { pt: 'Folhas', en: 'Leaves' },
  hint: { pt: 'Arrasta para espalhar folhas coloridas.', en: 'Drag to scatter colorful leaves.' },
  category: 'pintar',
  level: 2,
  order: 104,
  usesColor: true,
  begin() {
    remaining = 0;
  },
  stroke(from, to, c, size) {
    const dirty = new DirtyTracker();
    const spacing = Math.max(8, size * 0.48);
    if (from.x === to.x && from.y === to.y) {
      scatterLeaves(to, -0.4, c, size, dirty);
      remaining = spacing;
    } else {
      remaining = interpolateDabs(from, to, spacing, remaining, (p, _f, angle) => {
        scatterLeaves(p, angle, c, size, dirty);
      });
    }
    dirty.flush(c);
  },
} satisfies MagicEffect;
