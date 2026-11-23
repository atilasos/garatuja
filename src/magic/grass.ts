import { interpolateDabs } from '../core/draw';
import type { MagicEffect, Point, ToolContext } from '../core/types';
import { clamp, shiftColor } from './_util/c-color';
import { DirtyTracker } from './_util/c-geom';

const greens = ['#387a3b', '#4b9644', '#63ae4b', '#7ec152', '#2f6a37'];
let remaining = 0;

function drawGrassTuft(p: Point, c: ToolContext, size: number, dirty: DirtyTracker) {
  const ctx = c.ctx;
  // Taller grass toward the bottom of the sheet for natural perspective depth
  const depth = clamp(p.y / Math.max(1, c.height), 0, 1);
  const scale = 0.5 + depth * 0.95;
  const blades = 5 + Math.floor(c.random() * 4);
  const baseSpread = size * 0.42;

  ctx.save();
  for (let i = 0; i < blades; i++) {
    const bx = p.x + (c.random() - 0.5) * baseSpread * 2;
    const by = p.y + (c.random() - 0.5) * size * 0.14;
    const height = size * scale * (0.65 + c.random() * 0.72);
    const lean = (c.random() - 0.5) * height * 0.75;
    const width = Math.max(1.5, size * (0.065 + c.random() * 0.045) * (0.7 + depth * 0.4));
    const tipX = bx + lean;
    const tipY = by - height;
    const ctrlX = bx + lean * 0.35;
    const ctrlY = by - height * 0.55;

    const baseColor = greens[Math.floor(c.random() * greens.length)];
    const bladeColor = shiftColor(baseColor, (c.random() - 0.5) * 10, (c.random() - 0.5) * 0.08, (c.random() - 0.4) * 0.08);
    ctx.fillStyle = bladeColor;
    ctx.beginPath();
    ctx.moveTo(bx - width * 0.5, by);
    ctx.quadraticCurveTo(ctrlX - width * 0.25, ctrlY, tipX, tipY);
    ctx.quadraticCurveTo(ctrlX + width * 0.25, ctrlY, bx + width * 0.5, by);
    ctx.closePath();
    ctx.fill();

    const minX = Math.min(bx - width, ctrlX - width, tipX) - 2;
    const maxX = Math.max(bx + width, ctrlX + width, tipX) + 2;
    const minY = Math.min(by, ctrlY, tipY) - 2;
    const maxY = Math.max(by, ctrlY, tipY) + 2;
    dirty.add({ x: minX, y: minY, w: maxX - minX, h: maxY - minY });
  }
  ctx.restore();
}

export default {
  id: 'grass',
  label: { pt: 'Relva', en: 'Grass' },
  hint: { pt: 'Arrasta para fazer crescer tufos de relva.', en: 'Drag to grow tufts of grass.' },
  category: 'pintar',
  level: 1,
  order: 102,
  usesColor: false,
  begin() {
    remaining = 0;
  },
  stroke(from, to, c, size) {
    const dirty = new DirtyTracker();
    const spacing = Math.max(5, size * 0.3);
    if (from.x === to.x && from.y === to.y) {
      drawGrassTuft(to, c, size, dirty);
      remaining = spacing;
    } else {
      remaining = interpolateDabs(from, to, spacing, remaining, p => {
        drawGrassTuft(p, c, size, dirty);
      });
    }
    dirty.flush(c);
  },
} satisfies MagicEffect;
