import type { StarterDef } from '../core/types';
import { grid, panel, structureCategory } from './lib/art';

export default {
  id: 'comic-3', label: { pt: 'Banda desenhada: 3 vinhetas', en: 'Comic: 3 panels' }, category: structureCategory,
  paper() {},
  foreground(ctx, w, h) {
    for (const box of grid({ x: 48, y: 48, w: w - 96, h: h - 96 }, 3, 1, 40)) panel(ctx, box);
  },
} satisfies StarterDef;
