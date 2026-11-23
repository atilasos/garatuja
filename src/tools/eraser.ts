import { interpolateDabs, strokeBounds } from '../core/draw';
import { brushSizes } from '../core/tooling/brush-stroke';
import type { Point, Tool, ToolContext } from '../core/types';
import { icons } from '../ui/icons';

function erase(from: Point, to: Point, c: ToolContext) {
  const size = c.opt<number>('size') * 1.5;
  const d = size / 2;
  const square = c.opt('shape') === 'square';
  const ctx = c.ctx;
  const dab = (p: Point) => {
    if (square) ctx.rect(p.x - d, p.y - d, size, size);
    else {
      ctx.moveTo(p.x + d, p.y);
      ctx.arc(p.x, p.y, d, 0, Math.PI * 2);
    }
  };
  ctx.save();
  ctx.beginPath();
  dab(from);
  interpolateDabs(from, to, Math.max(1, size / 9), size / 9, dab);
  dab(to);
  ctx.clip();
  ctx.drawImage(c.paper, 0, 0);
  ctx.restore();
  c.markDirty(strokeBounds(from, to, d + 2));
}

export default {
  id: 'eraser', label: { pt: 'Borracha', en: 'Eraser' }, icon: icons.eraser, order: 70, level: 1, usesColor: false,
  hint: { pt: 'Passa a borracha para voltar a ver o papel.', en: 'Rub over the drawing to see the paper again.' },
  options: [{
    kind: 'choice', id: 'shape', label: { pt: 'Forma', en: 'Shape' }, default: 'round',
    items: [
      { value: 'round', label: { pt: 'Redonda', en: 'Round' }, icon: icons.outline },
      { value: 'square', label: { pt: 'Quadrada', en: 'Square' }, icon: icons.shapes },
    ],
  }, brushSizes],
  down(p, c) { erase(p, p, c); c.sound('erase'); },
  move(p, previous, c) { erase(previous, p, c); },
  up() {},
} satisfies Tool;
