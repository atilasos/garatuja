import type { StarterDef } from '../core/types';
import { grid, panel, structureCategory } from './lib/art';

export default {
  id: 'comic-6', label: { pt: 'Banda desenhada: 6 vinhetas', en: 'Comic: 6 panels' }, category: structureCategory,
  paper() {},
  foreground(ctx, w, h) {
    for (const box of grid({ x: 48, y: 48, w: w - 96, h: h - 96 }, 3, 2, 40)) panel(ctx, box);
  },
} satisfies StarterDef;
