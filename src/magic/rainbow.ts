import { strokeBounds } from '../core/draw';
import type { MagicEffect } from '../core/types';

const colors = ['#e5655e', '#eea94e', '#f6d56d', '#55ad86', '#6aa9d9', '#a47cc8'];

export default {
  id: 'rainbow', label: { pt: 'Arco-íris', en: 'Rainbow' },
  hint: { pt: 'Arrasta para deixar uma fita de cores.', en: 'Drag to leave a ribbon of colors.' },
  category: 'pintar', level: 1, order: 10, usesColor: false,
  stroke(from, to, c, size) {
    const ctx = c.ctx;
    const band = size / colors.length;
    ctx.save();
    ctx.lineWidth = band + .5;
    ctx.lineCap = 'round';
    colors.forEach((color, i) => {
      const offset = (i + .5) * band - size / 2;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y + offset);
      ctx.lineTo(to.x + .05, to.y + offset);
      ctx.stroke();
    });
    ctx.restore();
    c.markDirty(strokeBounds(from, to, size / 2 + 3));
  },
} satisfies MagicEffect;
