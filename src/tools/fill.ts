import { hexToRgb } from '../core/draw';
import { floodFill } from '../core/flood';
import type { Tool } from '../core/types';
import { icons } from '../ui/icons';

export default {
  id: 'fill', label: { pt: 'Encher', en: 'Fill' }, icon: icons.fill, order: 50, level: 1, usesColor: true,
  hint: { pt: 'Toca numa zona para a encher de cor.', en: 'Tap an area to fill it with color.' },
  down(p, c) {
    const source = c.ctx.getImageData(0, 0, c.width, c.height);
    const guide = c.foreground?.getContext('2d')?.getImageData(0, 0, c.width, c.height);
    const result = floodFill(source, p, hexToRgb(c.color), 28, guide?.data);
    if (!result) return;
    const { x, y, w, h } = result.dirty;
    source.data.set(result.data);
    c.ctx.putImageData(source, 0, 0, x, y, w, h);
    c.markDirty(result.dirty);
    c.sound('fill');
  },
  move() {},
  up() {},
} satisfies Tool;
