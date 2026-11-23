import { fontDef } from '../../fonts/stacks';
import { t } from '../../core/i18n';
import { CANVAS_H, CANVAS_W, type L10n, type Rect } from '../../core/types';
import { h } from '../../ui/dom';

export interface FieldStyle {
  /** Where the text sits, in page pixels. */
  rect: Rect;
  font: string;
  size: number;
  lineHeight: number;
  color: string;
  caret: string;
  align: 'left' | 'center';
  /** Hide the glyphs (the canvas already draws them) and keep only the caret. */
  invisible: boolean;
  bottomEdge?: number;
}

const fieldLabel: L10n = { pt: 'Escreve aqui', en: 'Write here' };

/**
 * A real `<textarea>` laid over the sheet. It brings hardware keyboards, tablet
 * keyboards, accents, cedillas, emoji and IME for free. Positions are percentages
 * of the sheet and sizes use `--k` (screen pixels per page pixel), so it follows
 * the sheet when the window is resized.
 */
export class TextField {
  readonly element = h('textarea', 'label-field');
  onInput: (value: string) => void = () => {};
  /** Return true when the key was handled. */
  onKey: (event: KeyboardEvent) => boolean = () => false;
  uppercase: () => boolean = () => false;

  constructor() {
    const el = this.element;
    el.hidden = true;
    el.spellcheck = false;
    el.rows = 1;
    el.autocomplete = 'off';
    el.setAttribute('autocorrect', 'off');
    el.setAttribute('enterkeyhint', 'enter');
    el.addEventListener('input', event => {
      if (this.uppercase() && !(event as InputEvent).isComposing) this.shout();
      this.onInput(el.value);
    });
    el.addEventListener('compositionend', () => {
      if (this.uppercase()) this.shout();
      this.onInput(el.value);
    });
    el.addEventListener('keydown', event => {
      if (this.onKey(event)) event.preventDefault();
    });
  }

  private shout() {
    const el = this.element;
    const upper = el.value.toUpperCase();
    if (upper === el.value) return;
    const { selectionStart, selectionEnd } = el;
    el.value = upper;
    el.setSelectionRange(selectionStart, selectionEnd);
  }

  get value() { return this.element.value; }

  get visible() { return !this.element.hidden; }

  open(value: string) {
    this.element.value = value;
    this.element.hidden = false;
    this.focus();
  }

  focus() {
    const el = this.element;
    if (el.hidden) return;
    el.focus({ preventScroll: true });
    el.setSelectionRange(el.value.length, el.value.length);
  }

  close() {
    this.element.hidden = true;
    this.element.value = '';
  }

  place(style: FieldStyle) {
    const el = this.element;
    const { rect } = style;
    const font = fontDef(style.font);
    el.setAttribute('aria-label', t(fieldLabel));
    el.placeholder = '';
    el.style.left = rect.x * 100 / CANVAS_W + '%';
    el.style.top = rect.y * 100 / CANVAS_H + '%';
    el.style.width = rect.w * 100 / CANVAS_W + '%';
    const limit = style.bottomEdge;
    const height = limit === undefined ? rect.h : Math.min(rect.h, limit - 16);
    el.style.height = height * 100 / CANVAS_H + '%';
    el.style.overflowY = limit === undefined ? '' : 'auto';
    el.style.fontFamily = font.stack;
    el.style.fontWeight = String(font.weight);
    el.style.fontSize = `calc(var(--k, .5) * ${style.size}px)`;
    el.style.lineHeight = `calc(var(--k, .5) * ${style.lineHeight}px)`;
    el.style.textAlign = style.align;
    el.style.color = style.invisible ? 'transparent' : style.color;
    el.style.caretColor = style.caret;
    el.style.setProperty('--field-ink', style.color);
    // A longer text than the layout predicted would scroll the field: grow instead of hiding lines.
    if (el.scrollHeight > el.clientHeight + 1 && el.clientHeight > 0) {
      const extra = (el.scrollHeight - el.clientHeight) / Math.max(.05, el.clientHeight / height);
      const grown = limit === undefined ? height + extra : Math.min(height + extra, limit - 16);
      el.style.height = grown * 100 / CANVAS_H + '%';
      if (limit !== undefined) el.style.top = Math.min(rect.y, limit - grown) * 100 / CANVAS_H + '%';
    }
  }
}
