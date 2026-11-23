import type { MagicEffect } from '../core/types';
import { warpPage } from './_util/b-bitmap';

export default {
  id: 'puzzle',
  label: { pt: 'Puzzle', en: 'Puzzle' },
  hint: { pt: 'Toca para baralhar a folha em peças.', en: 'Tap to scramble the page into pieces.' },
  category: 'pagina', order: 524, level: 2, usesColor: false,
  whole(c) {
    const cols = 4;
    const rows = 3;
    const count = cols * rows;
    const shift = 1 + Math.floor(c.random() * (count - 1));
    warpPage(c, (x, y, w, h, out) => {
      const cw = w / cols;
      const ch = h / rows;
      const col = Math.min(cols - 1, Math.floor(x / cw));
      const row = Math.min(rows - 1, Math.floor(y / ch));
      const source = (row * cols + col + shift) % count;
      const sc = source % cols;
      const sr = Math.floor(source / cols);
      out.x = (sc + (x - col * cw) / cw) * cw;
      out.y = (sr + (y - row * ch) / ch) * ch;
    });
  },
} satisfies MagicEffect;
