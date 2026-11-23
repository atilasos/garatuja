import type { StarterDef } from '../core/types';
import { grid, panel, structureCategory } from './lib/art';

export default {
  id: 'comic-2', label: { pt: 'Banda desenhada: 2 vinhetas', en: 'Comic: 2 panels' }, category: structureCategory,
  paper() {},
  foreground(ctx, w, h) {
    for (const box of grid({ x: 48, y: 48, w: w - 96, h: h - 96 }, 2, 1, 40)) panel(ctx, box);
  },
} satisfies StarterDef;
