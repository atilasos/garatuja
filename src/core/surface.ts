import { copyCanvas, png, viewport } from './canvas';
import { clampRect, rgbToHex, seededRandom, unionRect } from './draw';
import { applyDelta, capturePatch, History, HISTORY_BUDGET } from './history';
import { basicLabels, type LabelRenderer } from './labels';
import { CANVAS_H, CANVAS_W, type LabelObject, type L10n, type PageRecord, type Rect, type SoundId } from './types';
import type { Point, ToolContext } from './types';

interface ToolBindings {
  color(): string;
  opt(id: string): string | number | boolean;
  sound(id: SoundId): void;
  say(text: L10n): void;
}

interface Gesture {
  solid?: { before: string; after: string };
  dirty?: Rect;
  labels: LabelObject[];
  random(): number;
}

export class Surface {
  readonly element = document.createElement('div');
  readonly ctx = viewport(CANVAS_W, CANVAS_H, true, true);
  readonly paper = viewport(CANVAS_W, CANVAS_H, true);
  readonly foreground = viewport();
  readonly labels = viewport();
  readonly overlay = viewport();
  readonly onion = viewport();
  private readonly snapshot = viewport(CANVAS_W, CANVAS_H, true, true);
  private bookHistory = new History();
  private readonly histories = new Map<string, History>();
  private hasForeground = false;
  private labelObjects: LabelObject[] = [];
  private labelRenderer = basicLabels;
  private activeGesture?: Gesture;
  private pageId = '';
  private seed = 0;
  private onionRequest = 0;
  onChange = () => {};

  constructor() {
    this.element.className = 'sheet';
    this.element.append(this.ctx.canvas, this.foreground.canvas, this.labels.canvas, this.onion.canvas, this.overlay.canvas);
    this.onion.canvas.className = 'onion';
  }

  async load(page: PageRecord, beforeShow?: () => Promise<void>) {
    const [bitmap, paper, foreground] = await Promise.all([
      createImageBitmap(page.bitmap), createImageBitmap(page.paper),
      page.foreground ? createImageBitmap(page.foreground) : null,
    ]);
    if (beforeShow) await beforeShow();
    this.rollback();
    this.pageId = page.id;
    const history = this.histories.get(page.id);
    if (history) {
      this.histories.delete(page.id);
      this.histories.set(page.id, history);
    }
    this.labelObjects = structuredClone(page.labels);
    this.hasForeground = foreground !== null;
    copyCanvas(this.ctx, bitmap);
    copyCanvas(this.paper, paper);
    this.foreground.clearRect(0, 0, CANVAS_W, CANVAS_H);
    if (foreground) this.foreground.drawImage(foreground, 0, 0);
    bitmap.close();
    paper.close();
    foreground?.close();
    this.renderLabels();
    void this.showOnion();
  }

  async showOnion(page?: PageRecord, following?: PageRecord) {
    const request = ++this.onionRequest;
    this.onion.clearRect(0, 0, CANVAS_W, CANVAS_H);
    if (!page && !following) return;
    const ghost = viewport(800, 600, false, true);
    const base = viewport(800, 600, false, true);
    for (const [source, next] of [[page, false], [following, true]] as const) {
      if (!source) continue;
      const [paper, guide] = await Promise.all([
        createImageBitmap(source.paper), source.foreground ? createImageBitmap(source.foreground) : null,
      ]);
      copyCanvas(base, paper);
      if (guide) base.drawImage(guide, 0, 0, 800, 600);
      paper.close();
      guide?.close();
      await this.compositePage(source, ghost);
      if (request !== this.onionRequest) return;
      const image = ghost.getImageData(0, 0, 800, 600);
      const background = base.getImageData(0, 0, 800, 600).data;
      for (let i = 0; i < image.data.length; i += 4) {
        const pixels = image.data;
        const difference = Math.max(Math.abs(pixels[i] - background[i]),
          Math.abs(pixels[i + 1] - background[i + 1]), Math.abs(pixels[i + 2] - background[i + 2]));
        pixels[i + 3] = Math.min(255, difference * 2);
        if (next) {
          pixels[i] += (255 - pixels[i]) * .25;
          pixels[i + 2] += (255 - pixels[i + 2]) * .5;
        }
      }
      ghost.putImageData(image, 0, 0);
      this.onion.drawImage(ghost.canvas, 0, 0, CANVAS_W, CANVAS_H);
    }
  }

  /** Render a stored page without changing the active page or its history. */
  async compositePage(page: PageRecord, target: CanvasRenderingContext2D) {
    const { width, height } = target.canvas;
    const draw = async (blob: Blob) => {
      const image = await createImageBitmap(blob);
      try {
        target.drawImage(image, 0, 0, width, height);
      } finally {
        image.close();
      }
    };
    target.clearRect(0, 0, width, height);
    await draw(page.bitmap);
    if (page.foreground) await draw(page.foreground);
    target.save();
    try {
      target.scale(width / CANVAS_W, height / CANVAS_H);
      this.labelRenderer.draw(target, page.labels);
    } finally {
      target.restore();
    }
  }

  private committed() {
    const bitmap = this.activeGesture ? this.snapshot.canvas : this.ctx.canvas;
    const labels = structuredClone(this.activeGesture?.labels ?? this.labelObjects);
    const thumb = viewport(240, 180, true);
    thumb.drawImage(bitmap, 0, 0, 240, 180);
    thumb.drawImage(this.foreground.canvas, 0, 0, 240, 180);
    if (labels.length) {
      thumb.save();
      thumb.scale(240 / CANVAS_W, 180 / CANVAS_H);
      this.labelRenderer.draw(thumb, labels);
      thumb.restore();
    }
    return { bitmap, labels, thumb: thumb.canvas };
  }

  capture(page: PageRecord): PageRecord {
    const current = this.committed();
    return { ...page, bitmap: png(current.bitmap), thumb: png(current.thumb), labels: current.labels };
  }

  composite(target: CanvasRenderingContext2D) {
    const { width, height } = target.canvas;
    for (const layer of [this.ctx, this.foreground]) target.drawImage(layer.canvas, 0, 0, width, height);
    // Labels are vectors: draw them again at the target's own resolution so print and export stay sharp.
    target.save();
    target.scale(width / CANVAS_W, height / CANVAS_H);
    this.labelRenderer.draw(target, this.labelObjects);
    target.restore();
  }

  colorAt(p: Point): string {
    const x = Math.min(CANVAS_W - 1, Math.max(0, Math.floor(p.x)));
    const y = Math.min(CANVAS_H - 1, Math.max(0, Math.floor(p.y)));
    let [r, g, b] = this.ctx.getImageData(x, y, 1, 1).data;
    for (const layer of [this.foreground, this.labels]) {
      const [red, green, blue, alpha] = layer.getImageData(x, y, 1, 1).data;
      const coverage = alpha / 255;
      r += (red - r) * coverage;
      g += (green - g) * coverage;
      b += (blue - b) * coverage;
    }
    return rgbToHex({ r, g, b });
  }

  private get history() {
    let history = this.histories.get(this.pageId);
    if (!history) {
      history = new History();
      this.histories.set(this.pageId, history);
    }
    return history;
  }

  get canUndo() { return this.history.canUndo || this.bookHistory.canUndo; }
  get canRedo() { return this.history.canRedo || this.bookHistory.canRedo; }
  get inGesture() { return this.activeGesture !== undefined; }

  get historyBytes() {
    return [...this.histories.values()].reduce((total, history) => total + history.retainedBytes, this.bookHistory.retainedBytes);
  }

  discardHistory(pageId?: string) {
    if (pageId === undefined) {
      this.histories.clear();
      this.bookHistory = new History();
    } else this.histories.delete(pageId);
  }

  private trimHistory() {
    let excess = this.historyBytes - HISTORY_BUDGET;
    for (const [id, history] of this.histories) {
      if (excess <= 0) break;
      if (id === this.pageId) continue;
      excess -= history.retainedBytes;
      this.discardHistory(id);
    }
    while (excess > 0 && this.bookHistory.retainedBytes > 0) {
      const before = this.bookHistory.retainedBytes;
      this.bookHistory.trim();
      excess -= before - this.bookHistory.retainedBytes;
    }
  }

  rememberWriting(before: () => void, after: () => void, bytes: number) {
    if (this.history.add({ writing: { before, after, bytes } })) {
      this.bookHistory.clearRedo();
      this.trimHistory();
    }
  }

  rememberDetails(before: () => void, after: () => void, bytes: number) {
    this.history.clearRedo();
    this.bookHistory.add({ writing: { before, after, bytes } });
    this.trimHistory();
  }

  rememberUndoneWriting(edit: { resume(): void; bytes: number }) {
    this.history.addUndone({ before: () => {}, after: edit.resume, bytes: edit.bytes });
    this.trimHistory();
  }

  undo() { this.restore('before'); }
  redo() { this.restore('after'); }

  private restore(direction: 'before' | 'after') {
    this.rollback();
    const order = direction === 'before' ? 'undoOrder' : 'redoOrder';
    const local = this.history;
    const history = this.bookHistory[order] > local[order] ? this.bookHistory : local;
    const step = direction === 'before' ? history.undo() : history.redo();
    if (!step) return;
    if (step.writing) { step.writing[direction](); return; }
    const bitmap = step.bitmap;
    if (bitmap) {
      const { x, y, w, h } = bitmap.area;
      const image = this.ctx.getImageData(x, y, w, h);
      applyDelta(image.data, bitmap);
      this.ctx.putImageData(image, x, y);
    }
    if (step.solid) {
      this.ctx.save();
      this.ctx.fillStyle = step.solid[direction];
      this.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      this.ctx.restore();
    }
    if (step.labels) {
      this.labelObjects = structuredClone(step.labels[direction]);
      this.renderLabels();
    }
    this.onChange();
  }

  begin() {
    if (this.activeGesture) return;
    copyCanvas(this.snapshot, this.ctx.canvas);
    this.activeGesture = { labels: structuredClone(this.labelObjects), random: seededRandom(++this.seed) };
  }

  commit() {
    const gesture = this.activeGesture;
    if (!gesture) return;
    this.activeGesture = undefined;
    this.clearOverlay();
    const bitmap = gesture.dirty && !gesture.solid ? capturePatch(this.snapshot, this.ctx, gesture.dirty) : undefined;
    const labels = JSON.stringify(gesture.labels) === JSON.stringify(this.labelObjects)
      ? undefined : { before: gesture.labels, after: structuredClone(this.labelObjects) };
    if (this.history.add({ bitmap, labels, solid: gesture.solid })) {
      this.bookHistory.clearRedo();
      this.trimHistory();
      this.onChange();
    }
  }

  rollback() {
    this.clearOverlay();
    const gesture = this.activeGesture;
    if (!gesture) return;
    this.activeGesture = undefined;
    const rect = gesture.dirty ? clampRect(gesture.dirty) : undefined;
    if (rect?.w && rect.h) this.ctx.putImageData(this.snapshot.getImageData(rect.x, rect.y, rect.w, rect.h), rect.x, rect.y);
    this.labelObjects = gesture.labels;
    this.renderLabels();
  }

  clearOverlay() { this.overlay.clearRect(0, 0, CANVAS_W, CANVAS_H); }

  context(bindings: ToolBindings): ToolContext {
    const foreground = () => this.hasForeground ? this.foreground.canvas : null;
    const mark = (rect: Rect) => {
      if (!this.activeGesture) return;
      this.activeGesture.dirty = this.activeGesture.dirty ? unionRect(this.activeGesture.dirty, rect) : rect;
    };
    const idleRandom = seededRandom(0);
    return {
      width: CANVAS_W, height: CANVAS_H,
      ctx: this.ctx, overlay: this.overlay, paper: this.paper.canvas, snapshot: this.snapshot.canvas,
      get foreground() { return foreground(); },
      get color() { return bindings.color(); },
      // The selected tool's OptionSpec defines the value type at the call site.
      opt: <T extends string | number | boolean>(id: string) => bindings.opt(id) as T,
      markDirty: mark,
      markAllDirty: () => mark({ x: 0, y: 0, w: CANVAS_W, h: CANVAS_H }),
      markSolidChange: (before, after) => {
        if (!this.activeGesture || before === after) return;
        mark({ x: 0, y: 0, w: CANVAS_W, h: CANVAS_H });
        this.activeGesture.solid = { before, after };
      },
      clearOverlay: () => this.clearOverlay(),
      commit: () => this.commit(),
      rollback: () => this.rollback(),
      random: () => (this.activeGesture?.random ?? idleRandom)(),
      sound: bindings.sound,
      say: bindings.say,
      labels: {
        list: () => this.labelObjects,
        add: label => { this.labelObjects.push(structuredClone(label)); this.renderLabels(); },
        update: (id, patch) => {
          const label = this.labelObjects.find(item => item.id === id);
          if (label) Object.assign(label, structuredClone(patch), { id });
          this.renderLabels();
        },
        remove: id => { this.labelObjects = this.labelObjects.filter(item => item.id !== id); this.renderLabels(); },
        at: p => this.labelRenderer.at(this.labels, this.labelObjects, p),
      },
    };
  }

  setLabelRenderer(renderer: LabelRenderer) {
    this.labelRenderer = renderer;
    this.renderLabels();
  }

  private renderLabels() {
    this.labels.clearRect(0, 0, CANVAS_W, CANVAS_H);
    this.labelRenderer.draw(this.labels, this.labelObjects);
  }
}
