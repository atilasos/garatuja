import { bitmapText } from '../features/labels/bitmap-text';
import { labelIcons } from '../features/labels/icons';
import { fontOption, sizeOption, textSizes } from '../features/labels/options';
import type { Tool } from '../core/types';

/** Texto: write on the sheet. The text becomes part of the drawing when the child lands it. */
export default {
  id: 'text', label: { pt: 'Texto', en: 'Text' }, icon: labelIcons.textTool, order: 42, level: 1, usesColor: true,
  hint: { pt: 'Toca na folha e escreve. Toca fora, ou em «Pousar», para o texto ficar no desenho.', en: 'Tap the paper and write. Tap outside, or “Place”, to put the text on the drawing.' },
  options: [fontOption, sizeOption(textSizes, 84)],
  onSelect(c) { bitmapText.activate(c); },
  onDeselect() { bitmapText.deactivate(); },
  down(p) { bitmapText.open(p); },
  move() {},
  up() { bitmapText.focus(); },
} satisfies Tool;
