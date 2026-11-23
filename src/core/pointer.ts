import { pagePoint } from './draw';
import type { Surface } from './surface';
import { CANVAS_H, CANVAS_W, type PaintPointer, type Point, type Tool, type ToolContext } from './types';

type ActiveTool = { tool: Tool; context: ToolContext };

export class PointerInput {
  private active?: { id: number; previous: PaintPointer; activeTool: ActiveTool; fixed: boolean };
  private readonly touches = new Set<number>();
  private selected: ActiveTool;
  private flushing = false;
  private keyboardPoint = { x: CANVAS_W / 2, y: CANVAS_H / 2 };
  pickColor?: (point: Point) => void;

  constructor(private surface: Surface, initial: ActiveTool, private fixedClick: () => boolean, private gestureChanged: () => void) {
    this.selected = initial;
    const element = surface.element;
    element.addEventListener('pointerdown', this.down);
    element.addEventListener('pointermove', this.move);
    element.addEventListener('pointerup', this.up);
    element.addEventListener('pointercancel', this.lost);
    element.addEventListener('lostpointercapture', event => {
      if (!this.active?.fixed) this.lost(event);
    });
    element.addEventListener('pointerleave', () => { if (!this.active && !surface.inGesture) surface.clearOverlay(); });
    element.addEventListener('contextmenu', event => event.preventDefault());
    window.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'touch') return;
      this.touches.add(event.pointerId);
      if (this.touches.size > 1) this.cancel();
    }, true);
    const forgetTouch = (event: PointerEvent) => this.touches.delete(event.pointerId);
    window.addEventListener('pointerup', forgetTouch, true);
    window.addEventListener('pointercancel', forgetTouch, true);
    initial.tool.onSelect?.(initial.context);
  }

  select(next: ActiveTool) {
    this.selected.tool.onDeselect?.(this.selected.context);
    this.selected = next;
    next.tool.onSelect?.(next.context);
  }

  flushPending() {
    if (this.flushing) return;
    this.flushing = true;
    try {
      const sequence = this.active;
      if (sequence) {
        this.finish(sequence.previous);
        if (this.surface.element.hasPointerCapture(sequence.id)) this.surface.element.releasePointerCapture(sequence.id);
      }
      this.selected.tool.flushPending?.(this.selected.context);
    } finally {
      this.flushing = false;
    }
  }

  get inGesture() { return this.active !== undefined || this.surface.inGesture; }

  cancel() {
    const wasActive = this.inGesture;
    const sequence = this.active;
    this.active = undefined;
    if (sequence && this.surface.element.hasPointerCapture(sequence.id)) {
      this.surface.element.releasePointerCapture(sequence.id);
    }
    if (this.surface.inGesture) this.selected.tool.cancel?.(this.selected.context);
    this.surface.rollback();
    if (wasActive) this.gestureChanged();
    return wasActive;
  }

  changeAppearance(update: () => void) {
    const { tool, context } = this.selected;
    if (!this.active && this.surface.inGesture && tool.updatePending) {
      update();
      tool.updatePending(context);
    } else {
      if (this.active || this.surface.inGesture) this.flushPending();
      update();
    }
  }

  key(event: KeyboardEvent) {
    const { tool, context } = this.selected;
    if (!tool.key) return false;
    const wasActive = this.surface.inGesture;
    this.surface.begin();
    const handled = tool.key(event, context);
    if (handled && !tool.manualCommit && !this.active) context.commit();
    else if (!wasActive && !handled) context.rollback();
    return handled;
  }

  drawWithKeyboard(event: KeyboardEvent): Point | undefined {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const arrows: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
    };
    const direction = arrows[event.key];
    const activate = event.key === ' ' || event.key === 'Enter';
    if (!direction && !activate) return;
    if (this.active && this.active.id !== -1) return;
    event.preventDefault();
    if (direction) {
      const step = event.shiftKey ? 4 : 20;
      this.keyboardPoint = {
        x: Math.max(0, Math.min(CANVAS_W - 1, this.keyboardPoint.x + direction[0] * step)),
        y: Math.max(0, Math.min(CANVAS_H - 1, this.keyboardPoint.y + direction[1] * step)),
      };
    }
    const point: PaintPointer = { ...this.keyboardPoint, pressure: .5, pointerType: 'mouse', constrain: false, t: event.timeStamp };
    if (direction) {
      if (this.active) {
        const { tool, context } = this.active.activeTool;
        tool.move(point, this.active.previous, context);
        this.active.previous = point;
      } else this.selected.tool.hover?.(point, this.selected.context);
    } else if (!event.repeat) {
      if (this.pickColor) this.pickColor(point);
      else if (this.active) this.finish(point);
      else {
        this.surface.begin();
        this.active = { id: -1, previous: point, activeTool: this.selected, fixed: false };
        const tap = this.selected.tool.tapOnly?.(this.selected.context, point);
        this.selected.tool.down(point, this.selected.context);
        if (tap) this.finish(point);
        else this.gestureChanged();
      }
    }
    return point;
  }

  private point(event: PointerEvent, box: DOMRect, previous?: PaintPointer): PaintPointer {
    const pointerType = event.pointerType === 'pen' || event.pointerType === 'touch' ? event.pointerType : 'mouse';
    return {
      ...pagePoint({ x: event.clientX, y: event.clientY }, { x: box.left, y: box.top, w: box.width, h: box.height }),
      pointerType, pressure: event.pressure || (pointerType === 'pen' ? (previous?.pressure ?? 0.5) : 0.5),
      t: event.timeStamp, constrain: event.shiftKey,
    };
  }

  private down = (event: PointerEvent) => {
    if (event.button !== 0 || this.touches.size > 1) return;
    event.preventDefault();
    if (this.active?.id === -1) this.cancel();
    this.surface.element.focus({ preventScroll: true });
    const point = this.point(event, this.surface.element.getBoundingClientRect(), this.active?.previous);
    if (this.active?.fixed) {
      this.finish(point);
      return;
    }
    if (this.active) return;
    if (this.pickColor) {
      this.pickColor(point);
      return;
    }
    const fixed = this.fixedClick() && !this.selected.tool.tapOnly?.(this.selected.context, point);
    this.active = { id: event.pointerId, previous: point, activeTool: this.selected, fixed };
    this.surface.begin();
    this.surface.element.setPointerCapture(event.pointerId);
    this.selected.tool.down(point, this.selected.context);
    this.gestureChanged();
  };

  private move = (event: PointerEvent) => {
    if (this.touches.size > 1) return;
    const box = this.surface.element.getBoundingClientRect();
    const active = this.active;
    if (!active) {
      if (!this.pickColor) this.selected.tool.hover?.(this.point(event, box), this.selected.context);
      return;
    }
    if (!active.fixed && active.id !== event.pointerId) return;
    const coalesced = event.getCoalescedEvents?.() ?? [];
    const { tool, context } = active.activeTool;
    for (const sample of coalesced.length ? coalesced : [event]) {
      const point = this.point(sample, box, active.previous);
      tool.move(point, active.previous, context);
      active.previous = point;
    }
  };

  private up = (event: PointerEvent) => {
    if (this.active?.id !== event.pointerId || this.active.fixed) return;
    this.finish(this.point(event, this.surface.element.getBoundingClientRect(), this.active.previous));
  };

  private lost = (event: PointerEvent) => {
    if (this.active?.id === event.pointerId) this.cancel();
  };

  private finish(point: PaintPointer) {
    const active = this.active;
    if (!active) return;
    this.active = undefined;
    const { tool, context } = active.activeTool;
    if (point.x !== active.previous.x || point.y !== active.previous.y) tool.move(point, active.previous, context);
    tool.up(point, context);
    if (!tool.manualCommit) context.commit();
    this.gestureChanged();
  }
}
