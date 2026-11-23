import { strokeBounds } from '../core/draw';
import { BrushStroke, brushChoice, brushSizes, currentBrush } from '../core/tooling/brush-stroke';
import type { Tool } from '../core/types';
import { icons } from '../ui/icons';

let stroke: BrushStroke | undefined;

export default {
  id: 'paint', label: { pt: 'Pintar', en: 'Paint' }, icon: icons.paint, order: 10, level: 1, usesColor: true,
  hint: { pt: 'Escolhe um pincel e desenha na folha.', en: 'Pick a brush and draw on the paper.' },
  options: [brushChoice, brushSizes],
  down(p, c) {
    stroke = new BrushStroke(currentBrush(c), c.opt('size'), c.color, c.random);
    stroke.dab(c.ctx, p);
    c.markDirty(strokeBounds(p, p, stroke.padding));
    c.sound('brush');
  },
  move(p, prev, c) { if (stroke) c.markDirty(stroke.segment(c.ctx, prev, p)); },
  up() { stroke = undefined; },
  cancel() { stroke = undefined; },
} satisfies Tool;
