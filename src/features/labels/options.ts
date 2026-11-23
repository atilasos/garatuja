import { fontDefs, canvasFont } from '../../fonts/stacks';
import type { ChoiceItem, L10n, OptionSpec } from '../../core/types';
import { labelIcons } from './icons';

/** The font choice is shared by Texto and Legenda: pick a letter style once, use it in both. */
export const fontOption: OptionSpec = {
  kind: 'choice', id: 'font', label: { pt: 'Letra', en: 'Letters' }, default: fontDefs[0].id, shared: 'font',
  items: fontDefs.map((font): ChoiceItem => ({
    value: font.id, label: font.label,
    preview(ctx, w, h, color) {
      ctx.fillStyle = color;
      ctx.font = canvasFont(font.id, h * .5);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Olá, Aa', w / 2, h / 2 + h * .04);
    },
  })),
};

/** Sizes of text, in page pixels (the sheet is 1600 wide). */
export const textSizes = [40, 60, 84, 116, 160];
export const labelSizes = [32, 44, 60, 80, 108];

export function sizeOption(steps: number[], fallback: number): OptionSpec {
  return { kind: 'size', id: 'size', label: { pt: 'Tamanho', en: 'Size' }, steps, default: fallback };
}

const typeNames = {
  text: { pt: 'Texto', en: 'Text' },
  callout: { pt: 'Legenda com seta', en: 'Arrow label' },
  number: { pt: 'Número', en: 'Number' },
  speech: { pt: 'Balão de fala', en: 'Speech balloon' },
  thought: { pt: 'Pensamento', en: 'Thought' },
  shout: { pt: 'Grito', en: 'Shout' },
  box: { pt: 'Narrador', en: 'Narrator' },
} satisfies Record<string, L10n>;

export type TypeName = keyof typeof typeNames;
export const typeLabel = (type: TypeName) => typeNames[type];

export const typeOption: OptionSpec = {
  kind: 'choice', id: 'type', label: { pt: 'Tipo', en: 'Kind' }, default: 'callout',
  items: [
    { value: 'text', label: typeNames.text, icon: labelIcons.text },
    { value: 'callout', label: typeNames.callout, icon: labelIcons.callout },
    { value: 'number', label: typeNames.number, icon: labelIcons.number, level: 2 },
    { value: 'speech', label: typeNames.speech, icon: labelIcons.speech },
    { value: 'thought', label: typeNames.thought, icon: labelIcons.thought, level: 2 },
    { value: 'shout', label: typeNames.shout, icon: labelIcons.shout, level: 2 },
    { value: 'box', label: typeNames.box, icon: labelIcons.box, level: 2 },
  ],
};
