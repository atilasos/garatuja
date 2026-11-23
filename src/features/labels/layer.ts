import { hasTarget, type LabelLayout } from '../../core/labels';
import { CANVAS_H, CANVAS_W, type LabelObject, type Rect } from '../../core/types';
import { h, roving } from '../../ui/dom';
import { TextField } from './text-field';

export interface LabelEntry {
  label: LabelObject;
  layout: LabelLayout;
}

export interface LayerHandlers {
  focus(id: string): void;
  key(id: string, event: KeyboardEvent): void;
}

export type LayerMode = 'none' | 'label' | 'text';

const pct = (value: number, total: number) => value * 100 / total + '%';

function place(element: HTMLElement, r: Rect) {
  element.style.left = pct(r.x, CANVAS_W);
  element.style.top = pct(r.y, CANVAS_H);
  element.style.width = pct(r.w, CANVAS_W);
  element.style.height = pct(r.h, CANVAS_H);
}

/**
 * Everything the writing tools draw as real DOM above the canvases: the text field,
 * one focusable stop per label (Tab, arrows, Enter, Delete), the selection outline,
 * the big target handle and the action bar. All of it is positioned in percentages of
 * the sheet, so it always lines up with the canvas, and none of it is ever saved.
 */
export class LabelLayer {
  readonly element = h('div', 'label-layer');
  readonly field = new TextField();
  private readonly items = new Map<string, HTMLButtonElement>();
  private readonly outline = h('div', 'label-outline');
  private readonly handle = h('div', 'label-handle');
  private readonly bar = h('div', 'label-bar');
  private readonly refreshBar = roving(this.bar, { pt: 'Ações da legenda', en: 'Label actions' });
  private anchor?: Rect;

  constructor(private readonly sheet: HTMLElement, private readonly handlers: LayerHandlers) {
    this.outline.hidden = this.handle.hidden = this.bar.hidden = true;
    this.element.hidden = true;
    this.outline.setAttribute('aria-hidden', 'true');
    this.handle.setAttribute('aria-hidden', 'true');
    this.element.append(this.outline, this.handle, this.field.element, this.bar);
    sheet.append(this.element);
    // The sheet starts a drawing gesture on pointer-down and a keyboard cursor on keys: keep both out of here.
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'contextmenu']) {
      this.element.addEventListener(type, event => event.stopPropagation());
    }
    this.element.addEventListener('keydown', event => {
      if (!event.ctrlKey && !event.metaKey && !event.altKey) event.stopPropagation();
    });
    new ResizeObserver(() => this.resize()).observe(sheet);
    this.resize();
  }

  setMode(mode: LayerMode) {
    this.element.hidden = mode === 'none';
    this.element.dataset.mode = mode;
    if (mode === 'none') {
      this.field.close();
      this.setBar([]);
      this.syncLabels([], undefined, () => '');
      this.syncSelection(undefined);
    }
  }

  /** Page pixels per screen pixel: how big a 44 px finger is on the page. */
  pageUnitsPerPixel() {
    const width = this.sheet.getBoundingClientRect().width;
    return width > 0 ? CANVAS_W / width : 2;
  }

  syncLabels(entries: readonly LabelEntry[], selectedId: string | undefined, describe: (label: LabelObject) => string) {
    const seen = new Set<string>();
    for (const { label, layout } of entries) {
      seen.add(label.id);
      let item = this.items.get(label.id);
      if (!item) {
        const id = label.id;
        item = h('button', 'label-item');
        item.type = 'button';
        item.addEventListener('focus', () => this.handlers.focus(id));
        item.addEventListener('keydown', event => this.handlers.key(id, event));
        this.items.set(id, item);
        this.element.insertBefore(item, this.outline);
      }
      const { x, y, w, h: height } = layout.bounds;
      place(item, { x: x + w / 2, y: y + height / 2, w, h: height });
      item.setAttribute('aria-label', describe(label));
      item.setAttribute('aria-pressed', String(label.id === selectedId));
    }
    for (const [id, item] of this.items) {
      if (seen.has(id)) continue;
      item.remove();
      this.items.delete(id);
    }
  }

  syncSelection(entry: LabelEntry | undefined, typing = false) {
    if (!entry) {
      this.outline.hidden = this.handle.hidden = true;
      return;
    }
    const { label, layout } = entry;
    const pad = 10;
    place(this.outline, { x: layout.bounds.x - pad, y: layout.bounds.y - pad, w: layout.bounds.w + pad * 2, h: layout.bounds.h + pad * 2 });
    // While typing, the dashed text field is the outline.
    this.outline.hidden = typing;
    const aimed = label.target && hasTarget(layout.variant);
    this.handle.hidden = !aimed;
    if (label.target && aimed) {
      this.handle.style.left = pct(label.target.x, CANVAS_W);
      this.handle.style.top = pct(label.target.y, CANVAS_H);
    }
  }

  focusItem(id: string) {
    this.items.get(id)?.focus({ preventScroll: true });
  }

  setBar(buttons: HTMLElement[], anchor?: Rect, label = '') {
    if (label) this.bar.setAttribute('aria-label', label);
    const same = buttons.length === this.bar.children.length && buttons.every((button, i) => button === this.bar.children[i]);
    if (!same) {
      this.placeBarInLayer();
      this.bar.replaceChildren(...buttons);
    }
    this.bar.hidden = buttons.length === 0;
    this.anchor = anchor;
    if (!anchor || !buttons.length) this.placeBarInLayer();
    this.refreshBar();
    this.reposition();
  }

  private resize() {
    this.element.style.setProperty('--k', String(this.sheet.clientWidth / CANVAS_W));
    this.reposition();
  }

  private placeBarInLayer() {
    if (this.bar.parentElement === this.element) return;
    this.bar.classList.remove('label-bar-docked');
    this.element.append(this.bar);
  }

  /** Use the first position that clears the label and fits within the sheet. */
  private reposition() {
    if (this.bar.hidden || !this.anchor) return;
    const width = this.sheet.clientWidth;
    const height = this.sheet.clientHeight;
    const k = width / CANVAS_W;
    const { offsetWidth: w, offsetHeight: h } = this.bar;
    if (this.bar.classList.contains('label-bar-docked')) return;
    const box = this.anchor;
    const left = box.x * k;
    const right = (box.x + box.w) * k;
    const top = box.y * k;
    const bottom = (box.y + box.h) * k;
    const safeX = Math.max(4, Math.min(width - w - 4, left));
    const safeY = Math.max(4, Math.min(height - h - 4, top));
    const candidates = [
      { x: safeX, y: bottom + 10 }, { x: safeX, y: top - h - 10 },
      { x: right + 10, y: safeY }, { x: left - w - 10, y: safeY },
    ];
    const sheet = this.sheet.getBoundingClientRect();
    const handle = this.handle.hidden ? undefined : this.handle.getBoundingClientRect();
    const clearsHandle = (x: number, y: number) => !handle || x + w <= handle.left - sheet.left ||
      x >= handle.right - sheet.left || y + h <= handle.top - sheet.top || y >= handle.bottom - sheet.top;
    const fit = candidates.find(({ x, y }) =>
      x >= 4 && y >= 4 && x + w <= width - 4 && y + h <= height - 4 && clearsHandle(x, y));
    if (!fit) {
      const options = this.sheet.closest('.workspace')?.querySelector('.options');
      if (options) {
        this.bar.classList.add('label-bar-docked');
        options.prepend(this.bar);
      }
      return;
    }
    this.bar.style.left = fit.x + 'px';
    this.bar.style.top = fit.y + 'px';
  }

  /** Keep the text box clear, even if the arrow spans most of the sheet. */
  static footprint(entry: LabelEntry): Rect {
    return entry.layout.bounds;
  }
}
