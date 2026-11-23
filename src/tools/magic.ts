import { magic } from '../core/registry';
import { brushSizes } from '../core/tooling/brush-stroke';
import { previewMagic } from '../core/tooling/magic-preview';
import type { L10n, MagicCategory, MagicEffect, Tool } from '../core/types';
import { icons } from '../ui/icons';

const groups: Record<MagicCategory, L10n> = {
  pintar: { pt: 'Pincéis mágicos', en: 'Magic brushes' },
  cor: { pt: 'Cor', en: 'Color' },
  distorcer: { pt: 'Distorcer', en: 'Distort' },
  padroes: { pt: 'Padrões', en: 'Patterns' },
  pagina: { pt: 'Página inteira', en: 'Whole page' },
};

const categoryOrder: MagicCategory[] = ['pintar', 'cor', 'distorcer', 'padroes', 'pagina'];

let gesture: { effect: MagicEffect; size: number; whole: boolean } | undefined;
export default {
  id: 'magic', label: { pt: 'Magia', en: 'Magic' }, icon: icons.magic, order: 60, level: 1, usesColor: true,
  hint: { pt: 'Escolhe um efeito e experimenta-o na folha.', en: 'Pick an effect and try it on the paper.' },
  options: [{
    kind: 'choice', id: 'effect', label: { pt: 'Efeito', en: 'Effect' }, default: 'rainbow',
    items: () => {
      return magic.all()
        .slice()
        .sort((a, b) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category)
          || a.order - b.order || a.id.localeCompare(b.id))
        .map(effect => ({
          value: effect.id, label: effect.label, hint: effect.hint, group: groups[effect.category], level: effect.level,
          preview: (ctx: CanvasRenderingContext2D, w: number, h: number, color: string) => previewMagic(effect, ctx, w, h, color),
        }));
    },
  }, brushSizes, {
    kind: 'toggle', id: 'whole', label: { pt: 'Em toda a folha', en: 'Apply to whole sheet' }, icon: icons.wholeSheet, default: false,
    fixed: true,
    visible(option) {
      const effect = magic.get(String(option('effect')));
      return Boolean(effect?.stroke && effect.whole);
    },
  }],
  tapOnly(c) {
    const effect = magic.get(c.opt('effect'));
    return Boolean(effect?.whole && (!effect.stroke || c.opt('whole')));
  },
  down(p, c) {
    const effect = magic.get(c.opt('effect'));
    if (!effect) return;
    const size = c.opt<number>('size') * 2;
    const whole = Boolean(effect.whole && (!effect.stroke || c.opt('whole')));
    gesture = { effect, size, whole };
    if (whole) {
      effect.begin?.(p, c, size);
      effect.whole?.(c);
      effect.end?.(p, c, size);
      c.markAllDirty();
    } else {
      effect.begin?.(p, c, size);
      effect.stroke?.(p, p, c, size);
    }
    c.sound('magic');
  },
  move(p, previous, c) {
    if (gesture && !gesture.whole) gesture.effect.stroke?.(previous, p, c, gesture.size);
  },
  up(p, c) {
    if (gesture && !gesture.whole) gesture.effect.end?.(p, c, gesture.size);
    gesture = undefined;
  },
  cancel() { gesture = undefined; },
} satisfies Tool;
