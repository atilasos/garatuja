import { t } from '../../core/i18n';
import { clamp, fontMetrics, layoutPlain, measureContext } from '../../core/labels';
import type { State } from '../../core/store';
import { CANVAS_H, CANVAS_W, type L10n, type Point, type Rect, type ToolContext, type WritingDraft } from '../../core/types';
import { ensureGlyphs } from '../../fonts/load';
import { fontDefs } from '../../fonts/stacks';
import type { App } from '../../ui/app';
import { button, h } from '../../ui/dom';
import { labelIcons } from './icons';
import type { LabelLayer } from './layer';

const words = {
  tooLarge: { pt: 'Não cabe. Escolhe uma letra mais pequena.', en: 'It doesn’t fit. Choose a smaller letter size.' },
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
  private warning?: HTMLElement;

  attach(app: App, layer: LabelLayer) {
    this.app = app;
    this.layer = layer;
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
    this.close();
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
    field.settings = () => app.store.get().settings;
  }

  onState(state: State, previous: State) {
    if (!this.active) return;
    if (state.pageId !== previous.pageId) this.close();
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
    if (!this.finish()) return;
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
    const x = Math.min(session.x, CANVAS_W - edge - Math.max(v.size * 2, 360));
    const maxWidth = CANVAS_W - edge - x;
    return { v, maxWidth, session: { ...session, x } };
  }

  /** Lay the text out again and move the field and its bar to match. */
  restyle() {
    const layer = this.layer;
    const g = this.geometry();
    if (!layer || !g) return;
    const plain = layoutPlain(layer.field.value, g.v.font, g.v.size, g.maxWidth, measureContext());
    const rect = this.bounds(g.session, g.maxWidth, plain);
    layer.field.place({
      rect, font: g.v.font, size: g.v.size, lineHeight: plain.lineHeight, color: g.v.color,
      caret: '#23578d', align: 'left', invisible: false, bottomEdge: CANVAS_H - edge,
    });
    const content = layer.field.value.trimEnd();
    const measured = content === layer.field.value ? plain : layoutPlain(content, g.v.font, g.v.size, g.maxWidth, measureContext());
    const tooLarge = this.exceedsPage(measured, rect.w);
    const warning = this.warning ??= h('p', 'label-fit-warning');
    warning.hidden = !tooLarge;
    warning.textContent = t(words.tooLarge);
    warning.setAttribute('role', 'status');
    this.syncBar({ x: rect.x, y: rect.y, w: Math.min(rect.w, plain.width + g.v.size), h: rect.h });
  }

  private exceedsPage(plain: ReturnType<typeof layoutPlain>, width: number) {
    return plain.lines.length * plain.lineHeight > CANVAS_H - edge * 2 || plain.width > width;
  }

  private bounds(point: Point, width: number, plain: ReturnType<typeof layoutPlain>): Rect {
    const height = plain.lines.length * plain.lineHeight;
    return { x: point.x, y: Math.max(edge, Math.min(point.y, CANVAS_H - edge - height)),
      w: width, h: height };
  }

  finish() {
    if (this.session) this.land();
    return !this.session;
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
    layer.setBar(this.warning ? [...this.buttons, this.warning] : this.buttons, anchor, t(words.actions));
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

  private draft(): WritingDraft | undefined {
    if (!this.session || !this.app || !this.layer) return;
    return { ...this.session, ...values(this.app.store.get()), text: this.layer.field.value };
  }

  flush() {
    if (!this.session) return;
    const changed = JSON.stringify(this.app?.documents.page.writingDraft) !== JSON.stringify(this.draft());
    if (!this.land(changed)) this.app?.documents.setWritingDraft(this.draft());
  }

  resume(draft: WritingDraft) {
    const app = this.app;
    if (!app || !this.layer || this.session) return;
    app.setOption('font', draft.font);
    app.setOption('size', draft.size);
    app.setColor(draft.color);
    this.session = { x: draft.x, y: draft.y };
    this.layer.field.open(draft.text);
    this.restyle();
    app.say(words.typing);
  }

  private close() {
    if (!this.session) return;
    this.session = undefined;
    this.layer?.field.close();
    this.layer?.setBar([]);
  }

  undoEdit() {
    const draft = this.draft();
    this.cancel(false);
    return draft && { bytes: draft.text.length * 2, resume: () => this.restore(draft) };
  }

  private restore(draft: WritingDraft) {
    this.app?.chooseTool('text');
    if (this.app?.tool.id === 'text') this.resume(draft);
    else this.app?.documents.setWritingDraft(draft);
  }

  cancel(remember = true) {
    const app = this.app;
    const draft = this.draft();
    this.close();
    if (!app) return;
    app.documents.setWritingDraft();
    if (remember && draft?.text) {
      app.surface.rememberWriting(() => this.restore(draft), () => this.cancel(false), draft.text.length * 2);
    }
    app.surface.element.focus({ preventScroll: true });
    app.say(app.toolHint());
  }

  /** Paint the typed text into the bitmap. Returns true when something was painted. */
  land(warn = true): boolean {
    const layer = this.layer;
    const app = this.app;
    const g = this.geometry();
    const ctx = this.ctx;
    if (!layer || !app || !g || !ctx) return false;
    const text = layer.field.value.replace(/\s+$/, '');
    const plain = layoutPlain(text, g.v.font, g.v.size, g.maxWidth, measureContext());
    const rect = this.bounds(g.session, g.maxWidth, plain);
    if (text.trim() && this.exceedsPage(plain, rect.w)) {
      if (warn) app.say(words.tooLarge);
      return false;
    }
    this.close();
    app.documents.setWritingDraft();
    if (!text.trim()) return false;
    const surface = app.surface;
    surface.begin();
    const paint = surface.ctx;
    paint.save();
    paint.font = plain.font;
    paint.fillStyle = g.v.color;
    paint.textAlign = 'left';
    paint.textBaseline = 'alphabetic';
    plain.lines.forEach((line, i) => paint.fillText(line, rect.x, rect.y + i * plain.lineHeight + plain.baseline));
    paint.restore();
    ctx.markDirty({ x: rect.x - 12, y: rect.y - 12, w: rect.w + 24, h: rect.h + 24 });
    ctx.sound('stamp');
    ctx.commit();
    return true;
  }
}

export const bitmapText = new BitmapText();
