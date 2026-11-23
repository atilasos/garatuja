import { magic } from '../core/registry';
import { brushSizes } from '../core/tooling/brush-stroke';
import { previewMagic } from '../core/tooling/magic-preview';
import type { L10n, MagicCategory, MagicEffect, Tool } from '../core/types';
import { icons } from '../ui/icons';

const groups: Record<MagicCategory, L10n> = {
  pintar: { pt: 'Pintar', en: 'Paint' }, cor: { pt: 'Cor', en: 'Color' },
  distorcer: { pt: 'Distorcer', en: 'Distort' }, padroes: { pt: 'Padrões', en: 'Patterns' },
  pagina: { pt: 'Página inteira', en: 'Whole page' },
};

let gesture: { effect: MagicEffect; size: number; whole: boolean } | undefined;

export default {
  id: 'magic', label: { pt: 'Magia', en: 'Magic' }, icon: icons.magic, order: 60, level: 1, usesColor: true,
  hint: { pt: 'Escolhe um efeito e experimenta-o na folha.', en: 'Pick an effect and try it on the paper.' },
  options: [{
    kind: 'choice', id: 'effect', label: { pt: 'Efeito', en: 'Effect' }, default: 'rainbow',
    items: () => magic.all().map(effect => ({
      value: effect.id, label: effect.label, group: groups[effect.category], level: effect.level,
      preview: (ctx, w, h, color) => previewMagic(effect, ctx, w, h, color),
    })),
  }, brushSizes, { kind: 'toggle', id: 'whole', label: { pt: 'Página inteira', en: 'Whole page' }, icon: icons.new, default: false }],
  down(p, c) {
    const effect = magic.get(c.opt('effect'));
    if (!effect) return;
    const size = c.opt<number>('size') * 2;
    const whole = Boolean(effect.whole && (!effect.stroke || c.opt('whole')));
    gesture = { effect, size, whole };
    c.say(effect.hint);
    if (whole) {
      effect.whole?.(c);
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
