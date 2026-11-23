import { t } from '../../core/i18n';
import {
  centerOf, clamp, defaultTarget, drawLabel, drawLabels, hasTarget, labelExtent, labelRenderer, layoutOf, movedLabel, nextBadge,
  targetIsInside, typeHasTarget, typeOf, typePatch, variantOf, type LabelRenderer, type LabelType,
} from '../../core/labels';
import type { State } from '../../core/store';
import { CANVAS_H, CANVAS_W, type L10n, type LabelObject, type LabelStore, type Point, type ToolContext } from '../../core/types';
import { ensureGlyphs } from '../../fonts/load';
import { fontDefs } from '../../fonts/stacks';
import type { App } from '../../ui/app';
import { button } from '../../ui/dom';
import { labelIcons } from './icons';
import { LabelLayer, type LabelEntry, type LayerMode } from './layer';
import { labelSizes, typeLabel } from './options';

interface Session {
  /** The label being typed. It lives here, not in the page, until the child is done. */
  label: LabelObject;
  isNew: boolean;
  /** Balloons grow around the spot where they were tapped; other labels grow right and down. */
  center?: Point;
}

const balloons = new Set(['speech', 'thought', 'shout']);

const words = {
  write: { pt: 'Escrever', en: 'Write' },
  copy: { pt: 'Duplicar legenda', en: 'Duplicate label' },
  remove: { pt: 'Apagar legenda', en: 'Delete label' },
  paste: { pt: 'Colar na folha', en: 'Stick to the paper' },
  done: { pt: 'Pronto', en: 'Done' },
  cancel: { pt: 'Cancelar', en: 'Cancel' },
  actions: { pt: 'Ações da legenda', en: 'Label actions' },
  empty: { pt: 'vazio', en: 'empty' },
  typing: { pt: 'Escreve o texto. Quando acabares, toca em «Pronto».', en: 'Type your text. When you finish, tap “Done”.' },
  selected: { pt: 'Arrasta para mover. Toca duas vezes para escrever outra vez.', en: 'Drag to move. Tap twice to write again.' },
  stuck: { pt: 'A legenda ficou colada na folha. Podes desfazer.', en: 'The label is stuck on the paper. You can undo it.' },
} satisfies Record<string, L10n>;

const defaults = { font: fontDefs[0].id, size: 60, type: 'callout' as LabelType };

/** Option values straight from saved state (so two states can be compared). */
export function readLabelOptions(state: Pick<State, 'options'>) {
  const o = state.options;
  return {
    font: String(o['@font']?.font ?? defaults.font),
    size: Number(o.label?.size ?? defaults.size),
    type: String(o.label?.type ?? defaults.type) as LabelType,
  };
}

function defined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

/**
 * Everything about editable labels that is not drawing: which one is selected, the
 * typing session, the actions, and keeping the DOM layer in step with the page.
 * The tool only forwards pointer gestures here.
 */
export class LabelEditor {
  layer?: LabelLayer;
  selectedId?: string;
  session?: Session;
  private app?: App;
  private ctx?: ToolContext;
  private known: readonly LabelObject[] = [];
  private mode: LayerMode = 'none';
  private suppress = false;
  private barKey = '';
  private barButtons: HTMLElement[] = [];
  private readonly renderer: LabelRenderer = {
    draw: (ctx, labels) => {
      if (ctx !== this.app?.surface.labels) return labelRenderer.draw(ctx, labels);
      this.known = labels;
      drawLabels(ctx, this.effective(labels));
      this.syncChrome();
    },
    at: labelRenderer.at,
  };

  attach(app: App) {
    this.app = app;
    const layer = new LabelLayer(app.surface.element, {
      focus: id => this.onItemFocus(id),
      key: (id, event) => this.onItemKey(id, event),
    });
    this.layer = layer;
    app.surface.setLabelRenderer(this.renderer);
    if (this.mode === 'label') {
      layer.setMode('label');
      this.wire();
    }
  }

  /** The text field is shared with the Texto tool: point its callbacks at labels. */
  private wire() {
    const field = this.layer?.field;
    const app = this.app;
    if (!field || !app) return;
    field.uppercase = () => app.store.get().settings.uppercase;
    field.onInput = value => this.typed(value);
    field.onKey = event => this.fieldKey(event);
  }

  /** Repaint the label layer (after a font loads, or when the working label changes). */
  repaint() {
    this.app?.surface.setLabelRenderer(this.renderer);
  }

  /** The labels as drawn: the saved ones with the one being typed swapped in. */
  private effective(labels: readonly LabelObject[]): readonly LabelObject[] {
    const session = this.session;
    if (!session) return labels;
    return labels.some(label => label.id === session.label.id)
      ? labels.map(label => label.id === session.label.id ? session.label : label)
      : [...labels, session.label];
  }

  /* ---------------------------------------------------------------- */
  /* Tool lifecycle                                                    */
  /* ---------------------------------------------------------------- */

  activate(context: ToolContext) {
    this.ctx = context;
    this.mode = 'label';
    this.layer?.setMode('label');
    this.wire();
    this.repaint();
  }

  deactivate() {
    this.finish(true);
    this.selectedId = undefined;
    this.mode = 'none';
    this.layer?.setMode('none');
  }

  get active() { return this.mode === 'label'; }

  /** Page pixels per screen pixel. */
  get pageUnitsPerPixel() { return this.layer?.pageUnitsPerPixel() ?? 2; }

  selected(): LabelObject | undefined {
    return this.known.find(label => label.id === this.selectedId);
  }

  onState(state: State, previous: State) {
    if (state.pageId !== previous.pageId) {
      this.selectedId = undefined;
      this.syncChrome();
    }
    if (this.mode !== 'label') return;
    if (state.settings.locale !== previous.settings.locale) {
      this.barKey = '';
      this.syncChrome();
    }
    if (this.suppress) return;
    this.applyOptions(state, previous);
  }

  /* ---------------------------------------------------------------- */
  /* Selection                                                         */
  /* ---------------------------------------------------------------- */

  select(id?: string) {
    if (this.selectedId === id) return;
    this.selectedId = id;
    this.syncChrome();
    if (!id && this.app) this.app.say(this.app.tool.hint);
    if (id) {
      this.app?.say(words.selected);
      queueMicrotask(() => this.syncPanelFrom(id));
    }
  }

  /** Show the selected label's own font, size, kind and colour in the options panel. */
  private syncPanelFrom(id: string) {
    const app = this.app;
    const label = this.known.find(item => item.id === id);
    if (!app || !label || this.selectedId !== id) return;
    const { options } = app.store.get();
    const nearest = labelSizes.reduce((best, step) => Math.abs(step - label.size) < Math.abs(best - label.size) ? step : best);
    this.suppress = true;
    try {
      app.store.set({
        color: label.color,
        options: {
          ...options,
          '@font': { ...options['@font'], font: label.font },
          label: { ...options.label, size: nearest, type: typeOf(label) },
        },
      });
    } finally {
      this.suppress = false;
    }
  }

  /** The child changed font, size, kind or colour: apply it to the label being edited or selected. */
  private applyOptions(state: State, previous: State) {
    const target = this.session?.label ?? this.selected();
    if (!target) return;
    const was = readLabelOptions(previous);
    const now = readLabelOptions(state);
    const patch: Partial<LabelObject> = {};
    if (now.font !== was.font) patch.font = now.font;
    if (now.size !== was.size) patch.size = now.size;
    if (state.color !== previous.color) patch.color = state.color;
    if (now.type !== was.type) Object.assign(patch, this.convert(target, now.type));
    if (!Object.keys(patch).length) return;
    if (this.session) {
      Object.assign(this.session.label, patch);
      this.refit(this.session);
      this.repaint();
    } else {
      if (patch.size !== undefined || patch.font !== undefined || patch.kind !== undefined) this.refitPatch(target, patch);
      this.mutate(store => store.update(target.id, patch));
    }
  }

  /** Keep the working label on the page while its text grows. */
  private refit(session: Session) {
    const label = session.label;
    const { bounds } = layoutOf(label);
    const c = session.center;
    label.x = clamp(c ? c.x - bounds.w / 2 : label.x, 0, Math.max(0, CANVAS_W - bounds.w));
    label.y = clamp(c ? c.y - bounds.h / 2 : label.y, 0, Math.max(0, CANVAS_H - bounds.h));
  }

  /** Same idea for a saved label whose size, font or kind changed: grow around its centre, stay on the page. */
  private refitPatch(label: LabelObject, patch: Partial<LabelObject>) {
    const before = layoutOf(label).bounds;
    const after = layoutOf({ ...label, ...patch }).bounds;
    patch.x = clamp(before.x + before.w / 2 - after.w / 2, 0, Math.max(0, CANVAS_W - after.w));
    patch.y = clamp(before.y + before.h / 2 - after.h / 2, 0, Math.max(0, CANVAS_H - after.h));
  }

  /** Fields that turn `label` into another kind, keeping text, colour and place. */
  private convert(label: LabelObject, type: LabelType): Partial<LabelObject> {
    const others = this.known.filter(item => item.id !== label.id);
    const patch: Partial<LabelObject> = typePatch(type, others);
    const next = { ...label, ...patch };
    patch.target = typeHasTarget(type)
      ? label.target ?? defaultTarget(layoutOf(next).bounds, next.size)
      : undefined;
    return patch;
  }

  /* ---------------------------------------------------------------- */
  /* Creating and typing                                               */
  /* ---------------------------------------------------------------- */

  /** Begin a new label. `from` is where the arrow or tail points (a drag from the target to the text). */
  startNew(type: LabelType, point: Point, from?: Point) {
    const app = this.app;
    const layer = this.layer;
    if (!app || !layer) return;
    this.finish(true);
    const state = app.store.get();
    const { font, size } = readLabelOptions(state);
    const label: LabelObject = {
      id: crypto.randomUUID(), x: 0, y: 0, text: '', font, size, color: state.color,
      ...defined(typePatch(type, this.known)),
    };
    const { bounds, lineHeight } = layoutOf(label);
    label.x = clamp(type === 'text' ? point.x : point.x - bounds.w / 2, 0, Math.max(0, CANVAS_W - bounds.w));
    label.y = clamp(point.y - (type === 'text' ? lineHeight / 2 : bounds.h / 2), 0, Math.max(0, CANVAS_H - bounds.h));
    if (typeHasTarget(type)) label.target = from ?? defaultTarget({ ...bounds, x: label.x, y: label.y }, size);
    this.session = { label, isNew: true, center: balloons.has(variantOf(label)) ? point : undefined };
    this.selectedId = label.id;
    layer.field.open('');
    this.repaint();
    app.say(words.typing);
  }

  startEdit(id: string) {
    const layer = this.layer;
    const label = this.known.find(item => item.id === id);
    if (!layer || !label) return;
    this.finish(true);
    const center = balloons.has(variantOf(label)) ? centerOf(layoutOf(label).bounds) : undefined;
    this.session = { label: structuredClone(label), isNew: false, center };
    this.selectedId = id;
    layer.field.open(label.text);
    this.typed(layer.field.value);
    this.app?.say(words.typing);
  }

  private typed(value: string) {
    const session = this.session;
    if (!session) return;
    session.label.text = value;
    this.refit(session);
    this.repaint();
    void ensureGlyphs(session.label.font, value).then(loaded => { if (loaded && this.session === session) this.repaint(); });
  }

  private fieldKey(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.finish(false);
      return true;
    }
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      this.finish(true);
      return true;
    }
    return false;
  }

  undoEdit() {
    const session = this.session;
    this.finish(false, false);
    return session && { bytes: session.label.text.length * 2, resume: () => this.resume(session) };
  }

  private resume(session: Session) {
    const app = this.app;
    if (!app) return;
    app.chooseTool('label');
    if (app.tool.id !== 'label') return;
    this.session = structuredClone(session);
    this.selectedId = session.label.id;
    this.layer?.field.open(session.label.text);
    this.repaint();
    app.say(words.typing);
  }

  /** Close the typing session. Returns true when there was one. */
  finish(commit: boolean, remember = true): boolean {
    const session = this.session;
    if (!session) return false;
    this.session = undefined;
    this.layer?.field.close();
    const label = { ...session.label, text: session.label.text.replace(/\s+$/, '') };
    this.selectedId = undefined;
    if (!commit) {
      const app = this.app;
      if (app && remember && session.label.text) {
        app.surface.rememberWriting(() => this.resume(session), () => this.finish(false, false), session.label.text.length * 2);
      }
    }
    else if (!label.text.trim()) {
      if (!session.isNew) this.mutate(store => store.remove(label.id));
    } else {
      const layout = layoutOf(label);
      if (session.isNew && hasTarget(layout.variant) && (!label.target || targetIsInside(layout.bounds, label.target, 20))) {
        label.target = defaultTarget(layout.bounds, label.size);
      }
      this.mutate(store => store.list().some(item => item.id === label.id) ? store.update(label.id, label) : store.add(label));
    }
    this.repaint();
    if (this.app?.tool.id === 'label') this.app.say(this.app.tool.hint);
    return true;
  }

  /* ---------------------------------------------------------------- */
  /* Actions                                                           */
  /* ---------------------------------------------------------------- */

  /** One undo step for a change to the labels (or joins the gesture that is running). */
  private mutate(change: (labels: LabelStore) => void) {
    const app = this.app;
    const ctx = this.ctx;
    if (!app || !ctx) return;
    if (app.surface.inGesture) {
      change(ctx.labels);
      return;
    }
    app.surface.begin();
    change(ctx.labels);
    ctx.commit();
    this.syncChrome();
  }

  nudge(id: string, dx: number, dy: number) {
    const label = this.known.find(item => item.id === id);
    if (label) this.mutate(store => store.update(id, movedLabel(label, layoutOf(label), dx, dy)));
  }

  remove(id: string) {
    this.mutate(store => store.remove(id));
    this.selectedId = undefined;
    this.syncChrome();
  }

  duplicate(id: string) {
    const source = this.known.find(item => item.id === id);
    if (!source) return;
    const layout = layoutOf(source);
    let shift = movedLabel(source, layout, 40, 40);
    if (shift.x === source.x && shift.y === source.y) shift = movedLabel(source, layout, -40, -40);
    const copy: LabelObject = { ...structuredClone(source), ...shift, id: crypto.randomUUID() };
    if (copy.badge) copy.badge = nextBadge(this.known);
    this.mutate(store => store.add(copy));
    this.selectedId = copy.id;
    this.syncChrome();
    this.layer?.focusItem(copy.id);
  }

  /** Paint the label into the bitmap and remove it from the editable layer, as one undo step. */
  flatten(id: string) {
    const app = this.app;
    const ctx = this.ctx;
    const label = this.known.find(item => item.id === id);
    if (!app || !ctx || !label) return;
    const layout = layoutOf(label);
    this.mutate(store => {
      drawLabel(app.surface.ctx, label, layout);
      ctx.markDirty(labelExtent(label, layout));
      store.remove(id);
    });
    this.selectedId = undefined;
    this.syncChrome();
    app.surface.element.focus({ preventScroll: true });
    app.say(words.stuck);
  }

  /* ---------------------------------------------------------------- */
  /* Keyboard                                                          */
  /* ---------------------------------------------------------------- */

  private onItemFocus(id: string) {
    if (this.session) return;
    this.select(id);
  }

  private onItemKey(id: string, event: KeyboardEvent) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const step = event.shiftKey ? 4 : 20;
    const arrows: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step],
    };
    const arrow = arrows[event.key];
    if (arrow) {
      event.preventDefault();
      this.nudge(id, arrow[0], arrow[1]);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.startEdit(id);
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.remove(id);
      this.app?.surface.element.focus({ preventScroll: true });
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.select(undefined);
      this.app?.surface.element.focus({ preventScroll: true });
    }
  }

  /* ---------------------------------------------------------------- */
  /* DOM layer                                                         */
  /* ---------------------------------------------------------------- */

  private describe(label: LabelObject) {
    const name = t(typeLabel(typeOf(label)));
    const text = label.text.trim().replace(/\s+/g, ' ');
    const number = label.badge ? ' ' + label.badge : '';
    return `${name}${number}: ${text ? text.slice(0, 80) : t(words.empty)}`;
  }

  /** Bring selection outline, handle, tab stops, bar and field in line with the labels. */
  syncChrome() {
    const layer = this.layer;
    if (!layer || this.mode !== 'label') return;
    const list = this.effective(this.known);
    if (this.selectedId && !list.some(label => label.id === this.selectedId)) this.selectedId = undefined;
    const entries: LabelEntry[] = list.map(label => ({ label, layout: layoutOf(label) }));
    const selected = entries.find(entry => entry.label.id === this.selectedId);
    layer.syncLabels(entries, this.selectedId, label => this.describe(label));
    layer.syncSelection(selected, this.session !== undefined);
    this.syncBar(selected);
    this.syncField(selected);
  }

  private syncField(selected: LabelEntry | undefined) {
    const session = this.session;
    const field = this.layer?.field;
    if (!session || !field || !selected) return;
    const { label } = session;
    const { layout } = selected;
    const slack = label.size * .6;
    const width = Math.min(layout.textBox.w + slack, layout.wrapWidth);
    const center = layout.textBox.x + layout.textBox.w / 2;
    field.place({
      rect: {
        x: layout.align === 'center' ? center - width / 2 : layout.textBox.x,
        y: layout.textBox.y, w: width, h: layout.textBox.h,
      },
      font: label.font, size: label.size, lineHeight: layout.lineHeight, color: label.color,
      caret: '#23578d', align: layout.align, invisible: true,
    });
  }

  private syncBar(selected: LabelEntry | undefined) {
    const layer = this.layer;
    if (!layer) return;
    const state = this.session ? 'edit' : selected ? 'select' : 'none';
    const key = state + t({ pt: 'pt', en: 'en' });
    if (key !== this.barKey) {
      this.barKey = key;
      const make = (label: L10n, icon: string, run: () => void) => {
        const control = button(label, icon, run, 'bar-button');
        return control;
      };
      const id = () => this.selectedId;
      this.barButtons = state === 'edit'
        ? [make(words.done, labelIcons.done, () => this.finish(true)), make(words.cancel, labelIcons.cancel, () => this.finish(false))]
        : state === 'select'
          ? [make(words.write, labelIcons.write, () => { const target = id(); if (target) this.startEdit(target); }),
            make(words.copy, labelIcons.copy, () => { const target = id(); if (target) this.duplicate(target); }),
            make(words.remove, labelIcons.trash, () => { const target = id(); if (target) this.remove(target); }),
            make(words.paste, labelIcons.paste, () => { const target = id(); if (target) this.flatten(target); })]
          : [];
      for (const control of this.barButtons) control.dataset.bar = state;
    }
    layer.setBar(this.barButtons, selected && LabelLayer.footprint(selected), t(words.actions));
  }
}

export const labelEditor = new LabelEditor();
