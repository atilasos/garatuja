import type { StarterDef } from '../core/types';
import { panel, structureCategory, writingLines } from './lib/art';

export default {
  id: 'book-page', label: { pt: 'Página de livro', en: 'Book page' }, category: structureCategory,
  paper(ctx, w, h) {
    writingLines(ctx, { x: 110, y: 760, w: w - 220, h: h - 820 }, 92);
  },
  foreground(ctx, w) {
    panel(ctx, { x: 100, y: 70, w: w - 200, h: 640 }, 24);
  },
} satisfies StarterDef;
