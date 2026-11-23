import { t } from '../../core/i18n';
import { clamp, fontMetrics, layoutPlain, measureContext } from '../../core/labels';
import type { State } from '../../core/store';
import { CANVAS_H, CANVAS_W, type L10n, type Point, type Rect, type ToolContext } from '../../core/types';
import { ensureGlyphs } from '../../fonts/load';
import { fontDefs } from '../../fonts/stacks';
import type { App } from '../../ui/app';
import { button } from '../../ui/dom';
import { labelIcons } from './icons';
import type { LabelLayer } from './layer';

const words = {
  place: { pt: 'Pousar', en: 'Place' },
  cancel: { pt: 'Cancelar', en: 'Cancel' },
  actions: { pt: 'Ações do texto', en: 'Text actions' },
  typing: { pt: 'Escreve. Toca fora, ou em «Pousar», para o texto ficar no desenho.', en: 'Type. Tap outside, or “Place”, to put the text on the drawing.' },
} satisfies Record<string, L10n>;

const edge = 16;

function values(state: Pick<State, 'options' | 'color'>) {
  const o = state.options;
  return {
    font: String(o['@font']?.font ?? fontDefs[0].id),
    size: Number(o.text?.size ?? 84),
    color: state.color,
  };
}

/**
 * The Texto tool: a text field on the sheet with the real font, size and colour.
 * Landing the text paints it into the bitmap as one undo step. Nothing touches
 * the page until then, so changing the font or colour while typing is harmless.
 */
export class BitmapText {
  private app?: App;
  private layer?: LabelLayer;
  private ctx?: ToolContext;
  private session?: Point;
  private active = false;
  private barKey = '';
  private buttons: HTMLElement[] = [];

  attach(app: App, layer: LabelLayer) {
    this.app = app;
    this.layer = layer;
    window.addEventListener('pagehide', () => this.land(), true);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') this.land(); }, true);
    if (this.active) {
      layer.setMode('text');
      this.wire();
    }
  }

  activate(context: ToolContext) {
    this.ctx = context;
    this.active = true;
    this.layer?.setMode('text');
    this.wire();
  }

  deactivate() {
    this.land();
    this.active = false;
    this.layer?.setMode('none');
  }

  /** Both writing tools share one field: point its callbacks at this tool. */
  private wire() {
    const field = this.layer?.field;
    const app = this.app;
    if (!field || !app) return;
    field.onKey = event => this.fieldKey(event);
    field.onInput = value => {
      this.restyle();
      // Glyphs of the lazy latin-ext subset must be ready before the text is painted.
      const font = this.geometry()?.v.font;
      if (font) void ensureGlyphs(font, value).then(loaded => { if (loaded) this.restyle(); });
    };
    field.uppercase = () => app.store.get().settings.uppercase;
  }

  onState(state: State, previous: State) {
    if (!this.active) return;
    if (state.busy && !previous.busy) this.land();
    if (this.session) {
      if (state.settings.locale !== previous.settings.locale) this.barKey = '';
      this.restyle();
    }
  }

  /** Put the text cursor at `p`, settling any text already being typed. */
  open(p: Point) {
    const app = this.app;
    const layer = this.layer;
    if (!app || !layer) return;
    this.land();
    this.wire();
    const { font, size } = values(app.store.get());
    const { lineHeight } = fontMetrics(font, size, measureContext());
    this.session = {
      x: clamp(p.x, edge, CANVAS_W - edge - Math.max(size * 6, 360)),
      y: clamp(p.y - lineHeight / 2, 8, CANVAS_H - lineHeight - 8),
    };
    layer.field.open('');
    this.restyle();
    app.say(words.typing);
    // This gesture only placed the cursor: end it, so a keyboard gesture is not left half open.
    app.input.cancel();
    // Touch keyboards want focus inside the user's own pointer-up / click.
    const refocus = () => this.focus();
    window.addEventListener('pointerup', refocus, { once: true });
    window.addEventListener('click', refocus, { once: true });
  }

  focus() {
    this.layer?.field.focus();
  }

  get typing() { return this.session !== undefined; }

  private geometry() {
    const app = this.app;
    const session = this.session;
    if (!app || !session) return undefined;
    const v = values(app.store.get());
    const maxWidth = Math.max(v.size * 2, CANVAS_W - edge - session.x);
    return { v, maxWidth, session };
  }

  /** Lay the text out again and move the field and its bar to match. */
  restyle() {
    const layer = this.layer;
    const g = this.geometry();
    if (!layer || !g) return;
    const plain = layoutPlain(layer.field.value, g.v.font, g.v.size, g.maxWidth, measureContext());
    const rect: Rect = { x: g.session.x, y: g.session.y, w: g.maxWidth, h: plain.lines.length * plain.lineHeight };
    layer.field.place({
      rect, font: g.v.font, size: g.v.size, lineHeight: plain.lineHeight, color: g.v.color,
      caret: '#23578d', align: 'left', invisible: false,
    });
    this.syncBar({ x: rect.x, y: rect.y, w: Math.min(rect.w, plain.width + g.v.size), h: rect.h });
  }

  private syncBar(anchor: Rect) {
    const layer = this.layer;
    if (!layer) return;
    const key = 'text';
    if (this.barKey !== key + this.localeKey()) {
      this.barKey = key + this.localeKey();
      this.buttons = [
        button(words.place, labelIcons.done, () => { this.land(); }, 'bar-button'),
        button(words.cancel, labelIcons.cancel, () => this.cancel(), 'bar-button'),
      ];
    }
    layer.setBar(this.buttons, anchor, t(words.actions));
  }

  private localeKey() {
    return this.app?.store.get().settings.locale ?? '';
  }

  private fieldKey(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.cancel();
      return true;
    }
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      this.land();
      return true;
    }
    return false;
  }

  cancel() {
    this.session = undefined;
    this.layer?.field.close();
    this.layer?.setBar([]);
    this.app?.surface.element.focus({ preventScroll: true });
  }

  /** Paint the typed text into the bitmap. Returns true when something was painted. */
  land(): boolean {
    const layer = this.layer;
    const app = this.app;
    const g = this.geometry();
    const ctx = this.ctx;
    if (!layer || !app || !g || !ctx) return false;
    const text = layer.field.value.replace(/\s+$/, '');
    this.session = undefined;
    layer.field.close();
    layer.setBar([]);
    if (!text.trim()) return false;
    const plain = layoutPlain(text, g.v.font, g.v.size, g.maxWidth, measureContext());
    const surface = app.surface;
    surface.begin();
    const paint = surface.ctx;
    paint.save();
    paint.font = plain.font;
    paint.fillStyle = g.v.color;
    paint.textAlign = 'left';
    paint.textBaseline = 'alphabetic';
    plain.lines.forEach((line, i) => paint.fillText(line, g.session.x, g.session.y + i * plain.lineHeight + plain.baseline));
    paint.restore();
    ctx.markDirty({ x: g.session.x - 12, y: g.session.y - 12, w: g.maxWidth + 24, h: plain.lines.length * plain.lineHeight + 24 });
    ctx.sound('stamp');
    ctx.commit();
    return true;
  }
}

export const bitmapText = new BitmapText();
