import { flushLayers } from './brush-kit';
import { clampRect, interpolateDabs, seededRandom, strokeBounds, unionRect } from '../draw';
import { brushes } from '../registry';
import type { BrushDef, ChoiceItem, L10n, OptionSpec, PaintPointer, Point, Rect, ToolContext } from '../types';

export const brushSizes: OptionSpec = {
  kind: 'size', id: 'size', label: { pt: 'Tamanho', en: 'Size' }, steps: [8, 16, 32, 56, 96], default: 32,
};

const groupNames: { below: number; label: L10n }[] = [
  { below: 100, label: { pt: 'Básicos', en: 'Basic' } },
  { below: 200, label: { pt: 'Texturas', en: 'Textures' } },
  { below: 300, label: { pt: 'Efeitos', en: 'Effects' } },
  { below: Infinity, label: { pt: 'Trilhos', en: 'Trails' } },
];

/** Brushes are grouped by order band: 10–99 basic, 100–199 textures, 200–299 effects, 300+ trails. */
export function brushGroup(brush: BrushDef): L10n {
  return (groupNames.find(group => brush.order < group.below) ?? groupNames[0]).label;
}

/** Draw a short wavy stroke that shows what the brush looks like. Speed grows along the stroke. */
export function drawBrushPreview(brush: BrushDef, ctx: CanvasRenderingContext2D, w: number, h: number, color: string) {
  const size = h * .36;
  const stroke = new BrushStroke(brush, size, color, seededRandom(7));
  const points = 28;
  let time = 0;
  let previous: Point | undefined;
  for (let i = 0; i <= points; i++) {
    const t = i / points;
    const point = { x: w * (.1 + .8 * t), y: h * (.5 + .19 * Math.sin(t * Math.PI * 2 + .6)) };
    if (previous) time += Math.hypot(point.x - previous.x, point.y - previous.y) / (.35 + 1.9 * t);
    const sample: PaintPointer = { ...point, pressure: .5, pointerType: 'mouse', t: time, constrain: false };
    if (i === 0) stroke.start(ctx, sample);
    else stroke.extend(ctx, sample);
    previous = point;
  }
  stroke.finish(ctx);
}

export const brushChoice: OptionSpec = {
  kind: 'choice', id: 'brush', shared: 'brush', label: { pt: 'Pincel', en: 'Brush' }, default: 'round',
  items: () => brushes.all().map((brush): ChoiceItem => ({
    value: brush.id, label: brush.label, level: brush.level, group: brushGroup(brush),
    preview: (ctx, w, h, color) => drawBrushPreview(brush, ctx, w, h, color),
  })),
};

export function currentBrush(c: ToolContext): BrushDef {
  const brush = brushes.get(c.opt('brush')) ?? brushes.get('round');
  if (!brush) throw new Error('The round brush is required');
  return brush;
}

const midpoint = (a: PaintPointer, b: PaintPointer): PaintPointer => ({
  ...b, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, pressure: (a.pressure + b.pressure) / 2, t: (a.t + b.t) / 2,
});

/** Turn from `from` towards `to` by the fraction `amount`, taking the short way round. */
function turn(from: number, to: number, amount: number) {
  const difference = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + difference * amount;
}

export class BrushStroke {
  private travelled = 0;
  private remaining: number;
  private angle = 0;
  /** Page pixels per millisecond; lines and previews set it directly. */
  speed = .6;
  private first?: PaintPointer;
  private previous?: PaintPointer;
  private anchor?: PaintPointer;
  private pending = false;
  private drawn = false;
  private snapshot?: CanvasImageSource;

  constructor(private brush: BrushDef, private size: number, private color: string, private random: () => number) {
    this.remaining = this.spacing;
    brush.begin?.(color, size);
  }

  private get spacing() { return Math.max(1, this.size * this.brush.spacing); }
  get padding() { return this.size * (this.brush.extent ?? 1.5) + 2; }

  dab(ctx: CanvasRenderingContext2D, p: PaintPointer, angle = this.angle) {
    this.put(ctx, p, angle);
    flushLayers();
  }

  private put(ctx: CanvasRenderingContext2D, p: PaintPointer, angle: number) {
    this.brush.dab(ctx, { x: p.x, y: p.y, angle, pressure: p.pressure, size: this.size, color: this.color,
      travelled: this.travelled, speed: this.speed, random: this.random });
  }

  /** A straight piece of stroke. `angle` overrides the direction of travel. */
  segment(ctx: CanvasRenderingContext2D, from: PaintPointer, to: PaintPointer, angle?: number) {
    const bounds = this.lay(ctx, from, to, angle);
    flushLayers();
    return bounds;
  }

  private lay(ctx: CanvasRenderingContext2D, from: PaintPointer, to: PaintPointer, angle?: number) {
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    this.remaining = interpolateDabs(from, to, this.spacing, this.remaining, (p, fraction, direction, distance) => {
      this.angle = angle ?? direction;
      this.brush.dab(ctx, { ...p, angle: this.angle, pressure: from.pressure + (to.pressure - from.pressure) * fraction,
        size: this.size, color: this.color, travelled: this.travelled + distance, speed: this.speed, random: this.random });
    });
    this.travelled += length;
    return strokeBounds(from, to, this.padding);
  }

  /** A complete straight stroke, for the Lines tool. */
  line(ctx: CanvasRenderingContext2D, from: PaintPointer, to: PaintPointer, angle: number): Rect {
    this.speed = .7;
    this.put(ctx, from, angle);
    const bounds = this.lay(ctx, from, to, angle);
    if (from.x !== to.x || from.y !== to.y) this.put(ctx, to, angle);
    flushLayers();
    return bounds;
  }

  /**
   * Freehand strokes are smoothed: the pointer samples are control points of quadratic
   * curves that run from midpoint to midpoint, so corners round off instead of
   * showing as straight segments.
   *
   * Arrows and footprints need to know which way the hand is going. Given the page as it
   * was before the stroke (`snapshot`), the first dab is painted at once, so a press shows
   * up immediately, and is repainted facing the right way as soon as the hand moves.
   * Without a snapshot the first dab waits for the direction instead.
   */
  start(ctx: CanvasRenderingContext2D, p: PaintPointer, snapshot?: CanvasImageSource): Rect {
    this.first = this.previous = this.anchor = p;
    this.pending = true;
    this.speed = .6;
    this.snapshot = snapshot;
    this.drawn = false;
    if (snapshot) {
      this.put(ctx, p, 0);
      flushLayers();
      this.drawn = true;
    }
    return strokeBounds(p, p, this.padding);
  }

  extend(ctx: CanvasRenderingContext2D, p: PaintPointer): Rect {
    const previous = this.previous;
    const anchor = this.anchor;
    if (!previous || !anchor) return strokeBounds(p, p, this.padding);
    const instant = Math.hypot(p.x - previous.x, p.y - previous.y) / Math.max(1, p.t - previous.t);
    this.speed += (Math.min(instant, 6) - this.speed) * .3;
    const next = midpoint(previous, p);
    const bounds = this.curve(ctx, anchor, previous, next);
    flushLayers();
    this.anchor = next;
    this.previous = p;
    return bounds;
  }

  finish(ctx: CanvasRenderingContext2D): Rect {
    const { previous, anchor, first } = this;
    if (!previous || !anchor || !first) return { x: 0, y: 0, w: 0, h: 0 };
    let bounds = this.curve(ctx, anchor, previous, previous);
    if (this.pending) {
      if (!this.drawn) this.put(ctx, first, this.angle);
      this.pending = false;
      bounds = unionRect(bounds, strokeBounds(first, first, this.padding));
    }
    flushLayers();
    this.previous = this.anchor = this.first = this.snapshot = undefined;
    return bounds;
  }

  /** Put back the pixels under the first dab, so it can be painted again facing the right way. */
  private restoreFirst(ctx: CanvasRenderingContext2D, p: PaintPointer) {
    if (!this.snapshot) return;
    const area = clampRect(strokeBounds(p, p, this.padding), ctx.canvas.width, ctx.canvas.height);
    if (!area.w || !area.h) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'copy';
    ctx.beginPath();
    ctx.rect(area.x, area.y, area.w, area.h);
    ctx.clip();
    ctx.drawImage(this.snapshot, 0, 0);
    ctx.restore();
  }

  private curve(ctx: CanvasRenderingContext2D, a: PaintPointer, control: PaintPointer, b: PaintPointer): Rect {
    const chord = Math.hypot(control.x - a.x, control.y - a.y) + Math.hypot(b.x - control.x, b.y - control.y);
    const left = Math.min(a.x, control.x, b.x);
    const top = Math.min(a.y, control.y, b.y);
    const bounds = { x: left - this.padding, y: top - this.padding,
      w: Math.max(a.x, control.x, b.x) - left + this.padding * 2, h: Math.max(a.y, control.y, b.y) - top + this.padding * 2 };
    if (chord < .01) return bounds;
    const steps = Math.min(48, Math.max(1, Math.ceil(chord / 3)));
    let from: PaintPointer = a;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const u = 1 - t;
      const to: PaintPointer = { ...b,
        x: u * u * a.x + 2 * u * t * control.x + t * t * b.x,
        y: u * u * a.y + 2 * u * t * control.y + t * t * b.y,
        pressure: a.pressure + (b.pressure - a.pressure) * t };
      this.piece(ctx, from, to);
      from = to;
    }
    return bounds;
  }

  private piece(ctx: CanvasRenderingContext2D, from: PaintPointer, to: PaintPointer) {
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    if (length === 0) return;
    const direction = Math.atan2(to.y - from.y, to.x - from.x);
    if (this.pending && this.first) {
      this.angle = direction;
      this.pending = false;
      if (this.drawn) this.restoreFirst(ctx, this.first);
      this.put(ctx, this.first, direction);
    } else {
      this.angle = turn(this.angle, direction, 1 - Math.exp(-length / Math.max(5, this.size * .25)));
    }
    this.lay(ctx, from, to, this.angle);
  }
}

export function pressureSize(size: number, pressure: number) { return size * (.45 + pressure * 1.1); }

/* ------------------------------------------------------------------ */
/* Hover cursors: drawn on the overlay at the real size of the tool     */
/* ------------------------------------------------------------------ */

function ring(ctx: CanvasRenderingContext2D, trace: () => void) {
  ctx.save();
  ctx.lineJoin = 'round';
  for (const [width, color] of [[5, 'rgba(255,255,255,.92)'], [2.2, '#332b25']] as const) {
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    trace();
    ctx.stroke();
  }
  ctx.restore();
}

/** Outline of the area a brush or eraser will cover, centred on the pointer. */
export function showSizeCursor(c: ToolContext, p: Point, diameter: number, shape: 'round' | 'square' = 'round') {
  c.clearOverlay();
  const radius = Math.max(5, diameter / 2);
  ring(c.overlay, () => {
    c.overlay.beginPath();
    if (shape === 'square') c.overlay.rect(p.x - radius, p.y - radius, radius * 2, radius * 2);
    else c.overlay.arc(p.x, p.y, radius, 0, Math.PI * 2);
  });
  if (radius > 14) ring(c.overlay, () => {
    c.overlay.beginPath();
    c.overlay.moveTo(p.x - 5, p.y);
    c.overlay.lineTo(p.x + 5, p.y);
    c.overlay.moveTo(p.x, p.y - 5);
    c.overlay.lineTo(p.x, p.y + 5);
  });
}

/** A small cross for tools that act on a single point (fill, shapes). */
export function showCrossCursor(c: ToolContext, p: Point, arm = 16) {
  c.clearOverlay();
  ring(c.overlay, () => {
    c.overlay.beginPath();
    c.overlay.moveTo(p.x - arm, p.y);
    c.overlay.lineTo(p.x + arm, p.y);
    c.overlay.moveTo(p.x, p.y - arm);
    c.overlay.lineTo(p.x, p.y + arm);
  });
}
