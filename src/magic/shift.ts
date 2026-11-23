import type { MagicEffect } from '../core/types';
import { paintingContext } from './_util/b-bitmap';
import { byte } from './_util/b-color';

let originX = 0;
let originY = 0;
let hasOrigin = false;

function wrapShift(c: Parameters<NonNullable<MagicEffect['stroke']>>[2], dx: number, dy: number) {
  const w = c.width;
  const h = c.height;
  const shiftX = ((dx % w) + w) % w;
  const shiftY = ((dy % h) + h) % h;
  if (!shiftX && !shiftY) return;
  const src = paintingContext(c.snapshot).getImageData(0, 0, w, h);
  const image = new ImageData(w, h);
  const source = src.data;
  const data = image.data;
  for (let y = 0; y < h; y++) {
    const sy = (y - shiftY + h) % h;
    for (let x = 0; x < w; x++) {
      const sx = (x - shiftX + w) % w;
      const from = (sy * w + sx) * 4;
      const to = (y * w + x) * 4;
      data[to] = byte(source[from]);
      data[to + 1] = byte(source[from + 1]);
      data[to + 2] = byte(source[from + 2]);
      data[to + 3] = 255;
    }
  }
  c.ctx.putImageData(image, 0, 0);
  c.markAllDirty();
}

export default {
  id: 'shift',
  label: { pt: 'Deslocar', en: 'Shift' },
  hint: { pt: 'Arrasta para mover a folha. O que sai de um lado entra do outro.', en: 'Drag to move the page. What leaves one side comes in the other.' },
  category: 'pagina', order: 512, level: 2, usesColor: false,
  begin(p) {
    originX = p.x;
    originY = p.y;
    hasOrigin = true;
  },
  end() { hasOrigin = false; },
  stroke(from, to, c) {
    const ox = hasOrigin ? originX : from.x;
    const oy = hasOrigin ? originY : from.y;
    wrapShift(c, Math.round(to.x - ox), Math.round(to.y - oy));
  },
} satisfies MagicEffect;
