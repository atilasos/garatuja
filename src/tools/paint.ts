import { BrushStroke, brushChoice, brushSizes, currentBrush, pressureSize, showSizeCursor } from '../core/tooling/brush-stroke';
import type { Tool } from '../core/types';
import { icons } from '../ui/icons';

let stroke: BrushStroke | undefined;

export default {
  id: 'paint', label: { pt: 'Pintar', en: 'Paint' }, icon: icons.paint, order: 10, level: 1, usesColor: true,
  hint: { pt: 'Escolhe um pincel e desenha na folha.', en: 'Pick a brush and draw on the paper.' },
  // Sizes come first so they stay in view while the long brush list scrolls.
  options: [brushSizes, brushChoice],
  down(p, c) {
    c.clearOverlay();
    stroke = new BrushStroke(currentBrush(c), c.opt('size'), c.color, c.random);
    c.markDirty(stroke.start(c.ctx, p, c.snapshot));
    c.sound('brush');
  },
  move(p, _prev, c) { if (stroke) c.markDirty(stroke.extend(c.ctx, p)); },
  up(_p, c) {
    if (stroke) c.markDirty(stroke.finish(c.ctx));
    stroke = undefined;
  },
  hover(p, c) { showSizeCursor(c, p, pressureSize(c.opt('size'), .5)); },
  cancel() { stroke = undefined; },
} satisfies Tool;
