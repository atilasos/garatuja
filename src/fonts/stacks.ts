import type { L10n } from '../core/types';

/**
 * The four writing fonts of the app. `id` is what `LabelObject.font` stores, so
 * saved pages keep working even if the CSS stack below changes.
 * Pure data: importing this file never loads CSS, so unit tests can use it.
 */
export interface FontDef {
  id: string;
  label: L10n;
  /** Weight used for this font everywhere text is drawn. */
  weight: number;
  /** CSS font-family stack (first entry is the bundled font). */
  stack: string;
  /** Line height as a multiple of the font size. */
  lineHeight: number;
}

export const fontDefs: readonly FontDef[] = [
  { id: 'Andika', label: { pt: 'Letra de imprensa', en: 'Print letters' }, weight: 400,
    stack: '"Andika", "Atkinson Hyperlegible", system-ui, sans-serif', lineHeight: 1.3 },
  { id: 'Playwrite PT', label: { pt: 'Letra manuscrita', en: 'Handwriting' }, weight: 400,
    stack: '"Playwrite PT", "Andika", cursive', lineHeight: 1.5 },
  { id: 'Fredoka', label: { pt: 'Título', en: 'Title' }, weight: 600,
    stack: '"Fredoka", "Andika", system-ui, sans-serif', lineHeight: 1.2 },
  { id: 'Courier Prime', label: { pt: 'Máquina de escrever', en: 'Typewriter' }, weight: 400,
    stack: '"Courier Prime", "Courier New", monospace', lineHeight: 1.3 },
];

export const defaultFont = fontDefs[0];

export function fontDef(id: string): FontDef {
  return fontDefs.find(font => font.id === id) ?? { ...defaultFont, id, stack: `"${id}", ${defaultFont.stack}` };
}

/** Canvas/CSS font shorthand for a font id at a pixel size. */
export function canvasFont(id: string, size: number): string {
  const font = fontDef(id);
  return `${font.weight} ${size}px ${font.stack}`;
}

export function lineHeightOf(id: string): number {
  return fontDef(id).lineHeight;
}
