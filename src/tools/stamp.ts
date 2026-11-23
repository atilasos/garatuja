import { strokeBounds } from '../core/draw';
import { stamps } from '../core/registry';
import { drawStamp } from '../core/tooling/stamp-art';
import type { PaintPointer, Tool, ToolContext } from '../core/types';
import { icons } from '../ui/icons';

export const stampSizes = [60, 115, 190, 295, 415];
const angles = Array.from({ length: 360 }, (_, angle) => angle);

function draw(p: PaintPointer, c: ToolContext, preview: boolean) {
  const stamp = stamps.get(c.opt('stamp'));
  if (!stamp) return;
  const size = c.opt<number>('size');
  const angle = c.opt<number>('angle');
  const ctx = preview ? c.overlay : c.ctx;
  c.clearOverlay();
  ctx.save();
  if (preview) ctx.globalAlpha = .5;
  ctx.translate(p.x, p.y);
  ctx.rotate(angle * Math.PI / 180);
  const drawn = drawStamp(ctx, stamp, 0, 0, size, c.color, c.opt('mirror'), c.opt('flip'));
  ctx.restore();
  if (!preview && drawn) {
    c.markDirty(strokeBounds(p, p, size * Math.SQRT1_2 + 2));
    c.sound('stamp');
  } else if (!preview) {
    c.say({ pt: 'O carimbo ainda está a abrir. Toca de novo.', en: 'The stamp is still loading. Tap again.' });
  }
}

export default {
  id: 'stamp', label: { pt: 'Carimbo', en: 'Stamp' }, icon: icons.stamp, order: 20, level: 1, usesColor: true,
  hint: { pt: 'Escolhe um carimbo e pousa-o na folha.', en: 'Choose a stamp and place it on the paper.' },
  options: [
    { kind: 'choice', id: 'stamp', label: { pt: 'Carimbo', en: 'Stamp' }, default: 'boat',
      items: () => [
        { value: 'none', label: { pt: 'Sem carimbo', en: 'No stamp' } },
        ...stamps.all().map(stamp => ({ value: stamp.id, label: stamp.label })),
      ] },
    { kind: 'size', id: 'size', label: { pt: 'Tamanho', en: 'Size' }, steps: stampSizes, default: 190 },
    { kind: 'toggle', id: 'mirror', label: { pt: 'Espelhar', en: 'Mirror' }, icon: icons.mirror, default: false },
    { kind: 'toggle', id: 'flip', label: { pt: 'Virar', en: 'Flip' }, icon: icons.flip, default: false },
    { kind: 'size', id: 'angle', label: { pt: 'Rotação', en: 'Rotation' }, steps: angles, default: 0 },
  ],
  down(p, c) { draw(p, c, true); },
  move(p, _previous, c) { draw(p, c, true); },
  up(p, c) { draw(p, c, false); },
  hover(p, c) { draw(p, c, true); },
} satisfies Tool;
