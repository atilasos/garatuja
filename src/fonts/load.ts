import '@fontsource/andika/latin-ext-400.css';
import '@fontsource/andika/latin-ext-700.css';
import '@fontsource/andika/latin-400.css';
import '@fontsource/andika/latin-700.css';
// Playwrite PT only ships the latin subset, which already holds every Portuguese accent.
import '@fontsource/playwrite-pt/latin-400.css';
import '@fontsource/fredoka/latin-ext-600.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/courier-prime/latin-ext-400.css';
import '@fontsource/courier-prime/latin-400.css';
import { canvasFont, fontDefs } from './stacks';

/** Every accented letter used in Portuguese, plus cedilla, so the right subset is fetched. */
const sample = 'ÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúçAaBbÇç';

let ready: Promise<void> | undefined;

/** Resolve once all four fonts are decoded, so canvas text never falls back. Never rejects. */
export function loadFonts(): Promise<void> {
  ready ??= Promise.all(fontDefs.map(font =>
    document.fonts.load(canvasFont(font.id, 40), sample).catch(() => []))).then(() => undefined);
  return ready;
}

/**
 * Make sure the glyphs of `text` are available (latin-ext letters live in a lazy subset).
 * Resolves true when something new was loaded, so callers know to repaint.
 */
export async function ensureGlyphs(font: string, text: string): Promise<boolean> {
  const css = canvasFont(font, 40);
  if (!text || document.fonts.check(css, text)) return false;
  try {
    return (await document.fonts.load(css, text)).length > 0;
  } catch {
    return false;
  }
}
