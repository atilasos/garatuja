import type { MagicEffect } from '../core/types';
let originX = 0;
let originY = 0;
let hasOrigin = false;

function wrapShift(c: Parameters<NonNullable<MagicEffect['stroke']>>[2], dx: number, dy: number) {
  const w = c.width;
  const h = c.height;
  const shiftX = ((dx % w) + w) % w;
  const shiftY = ((dy % h) + h) % h;
  c.ctx.drawImage(c.snapshot, shiftX, shiftY);
  if (shiftX) c.ctx.drawImage(c.snapshot, shiftX - w, shiftY);
  if (shiftY) c.ctx.drawImage(c.snapshot, shiftX, shiftY - h);
  if (shiftX && shiftY) c.ctx.drawImage(c.snapshot, shiftX - w, shiftY - h);
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
