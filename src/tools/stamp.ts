import { strokeBounds } from '../core/draw';
import { stamps } from '../core/registry';
import { drawStamp, stampImage } from '../core/tooling/stamp-art';
import type { PaintPointer, Tool, ToolContext } from '../core/types';
import { icons } from '../ui/icons';

function draw(p: PaintPointer, c: ToolContext, preview: boolean) {
  const stamp = stamps.get(c.opt('stamp'));
  if (!stamp) return;
  const size = c.opt<number>('size');
  const ctx = preview ? c.overlay : c.ctx;
  c.clearOverlay();
  ctx.save();
  if (preview) ctx.globalAlpha = .5;
  const drawn = drawStamp(ctx, stamp, p.x, p.y, size, c.color, c.opt('mirror'), c.opt('flip'));
  ctx.restore();
  if (!preview && drawn) {
    c.markDirty(strokeBounds(p, p, size / 2 + 2));
    c.sound('stamp');
  }
}

export default {
  id: 'stamp', label: { pt: 'Carimbo', en: 'Stamp' }, icon: icons.stamp, order: 20, level: 1, usesColor: true,
  hint: { pt: 'Escolhe um carimbo e pousa-o na folha.', en: 'Choose a stamp and place it on the paper.' },
  options: [{
    kind: 'choice', id: 'stamp', label: { pt: 'Carimbo', en: 'Stamp' }, default: 'boat',
    items: () => stamps.all().map(stamp => ({
      value: stamp.id, label: stamp.label, group: stamp.category,
      preview(ctx, w, h, color) {
        const image = stampImage(stamp);
        const paint = () => drawStamp(ctx, stamp, w / 2, h / 2, Math.min(w, h) * .93, color);
        if (image.complete) paint();
        else image.addEventListener('load', paint, { once: true });
      },
    })),
  }, { kind: 'size', id: 'size', label: { pt: 'Tamanho', en: 'Size' }, steps: [60, 115, 190, 295, 415], default: 190 },
  { kind: 'toggle', id: 'mirror', label: { pt: 'Espelhar', en: 'Mirror' }, icon: icons.mirror, default: false },
  { kind: 'toggle', id: 'flip', label: { pt: 'Virar', en: 'Flip' }, icon: icons.flip, default: false }],
  onSelect() { for (const stamp of stamps.all()) stampImage(stamp); },
  down(p, c) { draw(p, c, true); },
  move(p, _previous, c) { draw(p, c, true); },
  up(p, c) { draw(p, c, false); },
  hover(p, c) { draw(p, c, true); },
} satisfies Tool;
