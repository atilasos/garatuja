import type { StarterDef } from '../core/types';
import { inkStroke, paperCategory, roundRect } from './lib/art';

export default {
  id: 'frame', label: { pt: 'Moldura', en: 'Frame' }, category: paperCategory,
  paper() {},
  foreground(ctx, w, h) {
    roundRect(ctx, { x: 46, y: 46, w: w - 92, h: h - 92 }, 34);
    inkStroke(ctx, 9);
    roundRect(ctx, { x: 80, y: 80, w: w - 160, h: h - 160 }, 20);
    inkStroke(ctx, 4);
  },
} satisfies StarterDef;
