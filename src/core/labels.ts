import { canvasFont, lineHeightOf } from '../fonts/stacks';
import { hexToRgb, rgbToHex } from './draw';
import { CANVAS_H, CANVAS_W, type LabelObject, type Point, type Rect } from './types';

/* ------------------------------------------------------------------ */
/* Text wrapping                                                       */
/* ------------------------------------------------------------------ */

export type Measure = (text: string) => number;

/**
 * Greedy word wrap. Explicit newlines are kept, runs of spaces are kept, and a
 * word wider than the line is broken by code point (so emoji never split).
 */
export function wrapText(text: string, maxWidth: number, measure: Measure): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(' ')) {
      const candidate = line ? line + ' ' + word : word;
      if (measure(candidate) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = '';
      if (measure(word) <= maxWidth) {
        line = word;
        continue;
      }
      for (const glyph of Array.from(word)) {
        if (line && measure(line + glyph) > maxWidth) {
          lines.push(line);
          line = glyph;
        } else line += glyph;
      }
    }
    lines.push(line);
  }
  return lines;
}

/* ------------------------------------------------------------------ */
/* Label types as the child sees them                                  */
/* ------------------------------------------------------------------ */

/** What the child chooses; `LabelObject` stores it as kind + shape + badge. */
export type LabelType = 'text' | 'callout' | 'number' | 'speech' | 'thought' | 'shout' | 'box';
export const labelTypes: readonly LabelType[] = ['text', 'callout', 'number', 'speech', 'thought', 'shout', 'box'];

export type LabelVariant = 'text' | 'callout' | 'speech' | 'thought' | 'shout' | 'box';

export function variantOf(label: Pick<LabelObject, 'kind' | 'shape'>): LabelVariant {
  if (label.kind === 'balloon') return label.shape ?? 'speech';
  return label.kind;
}

export function typeOf(label: Pick<LabelObject, 'kind' | 'shape' | 'badge'>): LabelType {
  if (label.kind === 'callout' && label.badge) return 'number';
  return variantOf(label);
}

/** Variants whose tail/arrow can be aimed at something. */
export function hasTarget(variant: LabelVariant): boolean {
  return variant !== 'text' && variant !== 'box';
}

export function typeHasTarget(type: LabelType): boolean {
  return type !== 'text' && type !== 'box';
}

/** The smallest positive number not yet used by a numbered label. */
export function nextBadge(labels: readonly Pick<LabelObject, 'badge'>[]): string {
  const used = new Set(labels.map(label => label.badge));
  let n = 1;
  while (used.has(String(n))) n++;
  return String(n);
}

/** Fields that turn `current` (or a blank label) into `type`. Missing targets are filled by the caller. */
export function typePatch(type: LabelType, labels: readonly LabelObject[]): Pick<LabelObject, 'kind' | 'shape' | 'badge'> {
  const clean = { shape: undefined, badge: undefined };
  switch (type) {
    case 'text': return { kind: 'text', ...clean };
    case 'callout': return { kind: 'callout', ...clean };
    case 'number': return { kind: 'callout', shape: undefined, badge: nextBadge(labels) };
    default: return { kind: 'balloon', shape: type, badge: undefined };
  }
}

/* ------------------------------------------------------------------ */
/* Colour helpers                                                      */
/* ------------------------------------------------------------------ */

const ink = { r: 53, g: 43, b: 35 };

function luminance({ r, g, b }: { r: number; g: number; b: number }) {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
  };
  return .2126 * channel(r) + .7152 * channel(g) + .0722 * channel(b);
}

export function contrastWithWhite(color: string): number {
  return 1.05 / (luminance(hexToRgb(color)) + .05);
}

/** Darken a colour until it reaches `minimum` contrast on white (yellow text on a white bubble would vanish). */
export function legibleInk(color: string, minimum = 4.5): string {
  if (!/^#[\da-f]{6}$/i.test(color)) return color;
  let rgb = hexToRgb(color);
  for (let i = 0; i < 16 && contrastWithWhite(rgbToHex(rgb)) < minimum; i++) {
    rgb = { r: rgb.r + (ink.r - rgb.r) * .22, g: rgb.g + (ink.g - rgb.g) * .22, b: rgb.b + (ink.b - rgb.b) * .22 };
  }
  return rgbToHex(rgb);
}

/** Black or white, whichever reads better on `color` (numbers inside badges). */
export function onColor(color: string): string {
  if (!/^#[\da-f]{6}$/i.test(color)) return '#ffffff';
  return luminance(hexToRgb(color)) > .42 ? '#292a33' : '#ffffff';
}

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

export function centerOf(r: Rect): Point {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

export function clamp(value: number, low: number, high: number) {
  return Math.min(high, Math.max(low, value));
}

export function clampToPage(p: Point, margin = 0): Point {
  return { x: clamp(p.x, margin, CANVAS_W - margin), y: clamp(p.y, margin, CANVAS_H - margin) };
}

export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared ? clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared, 0, 1) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function unionRects(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

export interface ArrowGeometry {
  /** Where the line leaves the box (slightly inside, hidden by the box). */
  from: Point;
  tip: Point;
  /** Where the shaft meets the head. */
  shaftEnd: Point;
  /** tip, right wing, notch, left wing. */
  head: [Point, Point, Point, Point];
}

/** A straight arrow from the box centre towards `target`; undefined when the tip is inside the box. */
export function arrowGeometry(bounds: Rect, target: Point, lineWidth: number): ArrowGeometry | undefined {
  const c = centerOf(bounds);
  const dx = target.x - c.x;
  const dy = target.y - c.y;
  const k = Math.min(bounds.w / 2 / (Math.abs(dx) || 1e-9), bounds.h / 2 / (Math.abs(dy) || 1e-9));
  if (k >= 1) return undefined;
  const edge = { x: c.x + dx * k, y: c.y + dy * k };
  const length = Math.hypot(target.x - edge.x, target.y - edge.y);
  if (length < lineWidth * 3) return undefined;
  const u = { x: (target.x - edge.x) / length, y: (target.y - edge.y) / length };
  const n = { x: -u.y, y: u.x };
  const headLength = Math.min(length * .9, Math.max(46, lineWidth * 8));
  const half = headLength * .42;
  const base = { x: target.x - u.x * headLength, y: target.y - u.y * headLength };
  const notch = { x: base.x + u.x * headLength * .28, y: base.y + u.y * headLength * .28 };
  return {
    from: { x: c.x + dx * k * .85, y: c.y + dy * k * .85 },
    tip: target, shaftEnd: notch,
    head: [target, { x: base.x + n.x * half, y: base.y + n.y * half }, notch, { x: base.x - n.x * half, y: base.y - n.y * half }],
  };
}

export interface EllipseTail {
  /** Parametric angles on the ellipse where the tail leaves it. */
  from: number;
  to: number;
  p1: Point;
  p2: Point;
  tip: Point;
  c1: Point;
  c2: Point;
}

export function ellipsePoint(c: Point, rx: number, ry: number, angle: number): Point {
  return { x: c.x + rx * Math.cos(angle), y: c.y + ry * Math.sin(angle) };
}

/** Tail of a speech balloon: two points on the ellipse plus a tip, edges bent into a swoosh. */
export function ellipseTail(c: Point, rx: number, ry: number, tip: Point, baseWidth: number): EllipseTail | undefined {
  const dx = tip.x - c.x;
  const dy = tip.y - c.y;
  if (Math.hypot(dx / rx, dy / ry) < 1.12) return undefined;
  const middle = Math.atan2(dy / ry, dx / rx);
  const half = clamp(baseWidth / 2 / ((rx + ry) / 2), .1, .6);
  const p1 = ellipsePoint(c, rx, ry, middle + half);
  const p2 = ellipsePoint(c, rx, ry, middle - half);
  const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  const length = Math.hypot(tip.x - mid.x, tip.y - mid.y) || 1;
  const axis = { x: (tip.x - mid.x) / length, y: (tip.y - mid.y) / length };
  const bend = length * .12;
  const swoosh = (p: Point): Point => ({ x: (p.x + tip.x) / 2 - axis.y * bend, y: (p.y + tip.y) / 2 + axis.x * bend });
  return { from: middle + half, to: middle - half, p1, p2, tip, c1: swoosh(p1), c2: swoosh(p2) };
}

export interface Circle { x: number; y: number; r: number }

/** The trail of little bubbles of a thought balloon, biggest first, the last one touching the target. */
export function thoughtTrail(c: Point, rx: number, ry: number, tip: Point, size: number): Circle[] {
  const dx = tip.x - c.x;
  const dy = tip.y - c.y;
  const norm = Math.hypot(dx / rx, dy / ry);
  if (norm < 1.1) return [];
  const edge = { x: c.x + dx / norm, y: c.y + dy / norm };
  const length = Math.hypot(tip.x - edge.x, tip.y - edge.y);
  if (length < size * .7) return [];
  const u = { x: (tip.x - edge.x) / length, y: (tip.y - edge.y) / length };
  const radii = [size * .3, size * .21, size * .13];
  const along = [.2, .55, 1];
  return radii.map((r, i) => {
    const distance = i === radii.length - 1 ? length - r : length * along[i];
    return { x: edge.x + u.x * Math.max(distance, r * .6), y: edge.y + u.y * Math.max(distance, r * .6), r };
  });
}

const spikes = [1, .74, .97, .78, 1.04, .72, .94, .8];

/** Outline of a shout balloon: alternating spikes; the spike nearest to the target stretches out to it. */
export function shoutPoints(bounds: Rect, target?: Point): Point[] {
  const c = centerOf(bounds);
  const rx = bounds.w / 2;
  const ry = bounds.h / 2;
  const count = clamp(Math.round((rx + ry) / 22) * 2, 14, 30);
  const points: Point[] = [];
  let aimed = -1;
  if (target) {
    const dx = target.x - c.x;
    const dy = target.y - c.y;
    if (Math.hypot(dx / rx, dy / ry) > 1.1) {
      const angle = Math.atan2(dy / ry, dx / rx);
      aimed = Math.round(((angle + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI) * count / 2) * 2 % count;
    }
  }
  for (let i = 0; i < count; i++) {
    const outer = i % 2 === 0;
    const angle = i * 2 * Math.PI / count;
    const scale = outer ? spikes[(i / 2) % spikes.length] : .74;
    if (i === aimed && target) points.push(target);
    else points.push(ellipsePoint(c, rx * scale, ry * scale, angle));
  }
  return points;
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

export interface MeasureContext {
  font: string;
  measureText(text: string): { width: number; fontBoundingBoxAscent?: number; fontBoundingBoxDescent?: number };
}

export interface LabelLayout {
  variant: LabelVariant;
  lines: string[];
  lineHeight: number;
  /** Distance from the top of a line box to its baseline. */
  baseline: number;
  font: string;
  align: 'left' | 'center';
  /** Outline of the shape, without the tail or the arrow. `x`,`y` are the label anchor. */
  bounds: Rect;
  /** The block of text, in page coordinates. */
  textBox: Rect;
  /** Width at which lines wrap; an editing field must not be wider. */
  wrapWidth: number;
  badge?: Circle;
  /** Corner radius of box-like shapes. */
  radius: number;
  lineWidth: number;
}


function wrapLimit(variant: LabelVariant, size: number) {
  const factor = { text: 20, callout: 10, box: 13, speech: 6.5, thought: 6.5, shout: 6 }[variant];
  return Math.min(size * factor, CANVAS_W * .8);
}

export function lineWidthFor(size: number) {
  return clamp(size / 9, 4, 10);
}

/** Font string, line height and baseline offset of a font at a size (same maths as CSS half-leading). */
export function fontMetrics(fontId: string, size: number, ctx: MeasureContext) {
  const font = canvasFont(fontId, size);
  ctx.font = font;
  const probe = ctx.measureText('Hgé');
  const ascent = probe.fontBoundingBoxAscent ?? size * .8;
  const descent = probe.fontBoundingBoxDescent ?? size * .2;
  const lineHeight = size * lineHeightOf(fontId);
  return { font, lineHeight, baseline: (lineHeight - (ascent + descent)) / 2 + ascent };
}

export interface PlainLayout { lines: string[]; lineHeight: number; baseline: number; font: string; width: number }

/** Wrapped plain text for the bitmap Text tool: same fonts and wrapping as labels. */
export function layoutPlain(text: string, fontId: string, size: number, maxWidth: number, ctx: MeasureContext): PlainLayout {
  const metrics = fontMetrics(fontId, size, ctx);
  const measure: Measure = value => ctx.measureText(value).width;
  const lines = wrapText(text, maxWidth, measure);
  return { ...metrics, lines, width: Math.max(0, ...lines.map(measure)) };
}

export function layoutLabel(label: LabelObject, ctx: MeasureContext): LabelLayout {
  const s = label.size;
  const { font, lineHeight, baseline } = fontMetrics(label.font, s, ctx);
  const variant = variantOf(label);
  const measure: Measure = text => ctx.measureText(text).width;
  const badgeRadius = label.badge ? s * .72 : 0;
  const badgeSpace = badgeRadius ? badgeRadius * 2 + s * .35 : 0;
  const wrapWidth = Math.max(s * 2, wrapLimit(variant, s) - badgeSpace);
  const lines = wrapText(label.text, wrapWidth, measure);
  const widest = Math.max(0, ...lines.map(measure));
  const textW = Math.max(widest, s * (variant === 'text' ? .5 : 1.4));
  const textH = lines.length * lineHeight;
  const lineWidth = lineWidthFor(s);
  const { x, y } = label;
  const base = { variant, lines, lineHeight, baseline, font, lineWidth, wrapWidth };

  if (variant === 'text') {
    const bounds = { x, y, w: textW, h: textH };
    return { ...base, align: 'left', bounds, textBox: bounds, radius: 0 };
  }
  if (variant === 'callout' || variant === 'box') {
    const padX = s * .6;
    const padY = s * (variant === 'box' ? .4 : .38);
    const innerH = Math.max(textH, badgeRadius * 2);
    const w = badgeSpace + textW + 2 * padX;
    const h = innerH + 2 * padY;
    return {
      ...base, align: 'left', bounds: { x, y, w, h },
      textBox: { x: x + padX + badgeSpace, y: y + (h - textH) / 2, w: textW, h: textH },
      badge: badgeRadius ? { x: x + padX + badgeRadius, y: y + h / 2, r: badgeRadius } : undefined,
      radius: variant === 'box' ? s * .12 : Math.min(h / 2, s * .5),
    };
  }
  const k = variant === 'shout' ? 1.85 : 1.4;
  const bump = variant === 'thought' ? s * .3 : 0;
  const w = (textW + s * .9) * k + 2 * bump;
  const h = (textH + s * .6) * k + 2 * bump;
  return {
    ...base, align: 'center', bounds: { x, y, w, h },
    textBox: { x: x + (w - textW) / 2, y: y + (h - textH) / 2, w: textW, h: textH }, radius: 0,
  };
}

/** The whole footprint of a label: shape, arrow/tail tip and a little slack for strokes. */
export function labelExtent(label: LabelObject, layout: LabelLayout): Rect {
  let rect = layout.bounds;
  if (label.target && hasTarget(layout.variant)) rect = unionRects(rect, { x: label.target.x, y: label.target.y, w: 0, h: 0 });
  const slack = layout.lineWidth * 2 + layout.lineHeight * .3 + 6;
  return { x: rect.x - slack, y: rect.y - slack, w: rect.w + slack * 2, h: rect.h + slack * 2 };
}

/** Where a tapped label's arrow or tail would sit when none was chosen yet. */
export function defaultTarget(bounds: Rect, size: number): Point {
  const reach = Math.max(150, size * 2.6);
  const x = clamp(bounds.x + Math.min(bounds.w * .3, 140), 40, CANVAS_W - 40);
  const below = bounds.y + bounds.h + reach;
  return { x, y: below <= CANVAS_H - 30 ? below : Math.max(30, bounds.y - reach) };
}

/** True when `target` would hide inside the label (so it needs a fresh default). */
export function targetIsInside(bounds: Rect, target: Point, slack = 0) {
  return target.x >= bounds.x - slack && target.x <= bounds.x + bounds.w + slack &&
    target.y >= bounds.y - slack && target.y <= bounds.y + bounds.h + slack;
}

export function hitLabel(label: LabelObject, layout: LabelLayout, p: Point, tolerance = 14): boolean {
  const b = layout.bounds;
  const slop = layout.variant === 'text' ? 12 : 4;
  if (p.x >= b.x - slop && p.x <= b.x + b.w + slop && p.y >= b.y - slop && p.y <= b.y + b.h + slop) return true;
  if (label.target && hasTarget(layout.variant)) {
    return distanceToSegment(p, centerOf(b), label.target) <= tolerance;
  }
  return false;
}

/** Move by (dx, dy), keeping the shape on the page; the target travels with it. */
export function movedLabel(label: LabelObject, layout: LabelLayout, dx: number, dy: number):
Pick<LabelObject, 'x' | 'y' | 'target'> {
  const x = clamp(label.x + dx, 0, Math.max(0, CANVAS_W - layout.bounds.w));
  const y = clamp(label.y + dy, 0, Math.max(0, CANVAS_H - layout.bounds.h));
  const target = label.target && { x: clamp(label.target.x + (x - label.x), 0, CANVAS_W), y: clamp(label.target.y + (y - label.y), 0, CANVAS_H) };
  return target ? { x, y, target } : { x, y };
}

/* ------------------------------------------------------------------ */
/* Drawing                                                             */
/* ------------------------------------------------------------------ */

const paperWhite = '#ffffff';
const narratorFill = '#fff3c4';

type Path = CanvasRenderingContext2D;

function roundedRect(ctx: Path, r: Rect, radius: number) {
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, Math.min(radius, r.w / 2, r.h / 2));
}

function fillAndStroke(ctx: Path, fill: string, stroke: string, width: number) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.fill();
  ctx.stroke();
}

function drawArrow(ctx: Path, arrow: ArrowGeometry, color: string, width: number) {
  ctx.beginPath();
  ctx.moveTo(arrow.from.x, arrow.from.y);
  ctx.lineTo(arrow.shaftEnd.x, arrow.shaftEnd.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.beginPath();
  arrow.head.forEach((point, i) => (i ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2, width * .6);
  ctx.fill();
  ctx.stroke();
}

function speechShape(ctx: Path, b: Rect, tail?: EllipseTail) {
  const c = centerOf(b);
  ctx.beginPath();
  if (!tail) {
    ctx.ellipse(c.x, c.y, b.w / 2, b.h / 2, 0, 0, Math.PI * 2);
    return;
  }
  ctx.ellipse(c.x, c.y, b.w / 2, b.h / 2, 0, tail.from, tail.to + Math.PI * 2);
  ctx.quadraticCurveTo(tail.c2.x, tail.c2.y, tail.tip.x, tail.tip.y);
  ctx.quadraticCurveTo(tail.c1.x, tail.c1.y, tail.p1.x, tail.p1.y);
  ctx.closePath();
}

function cloudShape(ctx: Path, b: Rect, size: number) {
  const bump = size * .3;
  const c = centerOf(b);
  const rx = b.w / 2 - bump;
  const ry = b.h / 2 - bump;
  const count = clamp(Math.round(Math.PI * (rx + ry) / (size * 1.1)), 8, 24);
  ctx.beginPath();
  const at = (i: number) => ellipsePoint(c, rx, ry, i * 2 * Math.PI / count);
  const first = at(0);
  ctx.moveTo(first.x, first.y);
  for (let i = 0; i < count; i++) {
    const from = at(i);
    const to = at(i + 1);
    const middle = ellipsePoint(c, rx, ry, (i + .5) * 2 * Math.PI / count);
    const out = Math.hypot(middle.x - c.x, middle.y - c.y) || 1;
    const apex = { x: middle.x + (middle.x - c.x) / out * bump, y: middle.y + (middle.y - c.y) / out * bump };
    const chord = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    ctx.quadraticCurveTo(2 * apex.x - chord.x, 2 * apex.y - chord.y, to.x, to.y);
  }
  ctx.closePath();
}

function drawBalloon(ctx: Path, label: LabelObject, layout: LabelLayout, stroke: string) {
  const { bounds, variant, lineWidth } = layout;
  const c = centerOf(bounds);
  const target = label.target;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (variant === 'speech') {
    const tail = target && ellipseTail(c, bounds.w / 2, bounds.h / 2, target, label.size * .95);
    speechShape(ctx, bounds, tail);
    fillAndStroke(ctx, paperWhite, stroke, lineWidth);
  } else if (variant === 'thought') {
    const bump = label.size * .3;
    for (const circle of target ? thoughtTrail(c, bounds.w / 2 - bump, bounds.h / 2 - bump, target, label.size) : []) {
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.r, 0, Math.PI * 2);
      fillAndStroke(ctx, paperWhite, stroke, lineWidth);
    }
    cloudShape(ctx, bounds, label.size);
    fillAndStroke(ctx, paperWhite, stroke, lineWidth);
  } else {
    const points = shoutPoints(bounds, target);
    ctx.beginPath();
    points.forEach((point, i) => (i ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)));
    ctx.closePath();
    ctx.lineJoin = 'miter';
    ctx.miterLimit = 3;
    fillAndStroke(ctx, paperWhite, stroke, lineWidth);
  }
}

export interface DrawOptions {
  /** Skip the text of these labels (an editor draws it itself). */
  hideText?: ReadonlySet<string>;
}

function drawText(ctx: Path, label: LabelObject, layout: LabelLayout, color: string) {
  // The halo has to contrast with the letters: white around dark text, dark around light text.
  const light = /^#[\da-f]{6}$/i.test(color) && luminance(hexToRgb(color)) > .5;
  ctx.font = layout.font;
  ctx.textAlign = layout.align;
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  const x = layout.align === 'center' ? layout.textBox.x + layout.textBox.w / 2 : layout.textBox.x;
  const halo = layout.variant === 'text';
  layout.lines.forEach((line, i) => {
    const y = layout.textBox.y + i * layout.lineHeight + layout.baseline;
    if (halo) {
      ctx.strokeStyle = light ? 'rgba(53, 43, 35, .7)' : 'rgba(255, 255, 255, .9)';
      ctx.lineWidth = Math.max(4, label.size / 7);
      ctx.strokeText(line, x, y);
    }
    ctx.fillStyle = color;
    ctx.fillText(line, x, y);
  });
}

export function drawLabel(ctx: CanvasRenderingContext2D, label: LabelObject, layout: LabelLayout, options: DrawOptions = {}) {
  const { bounds, variant, lineWidth } = layout;
  // Outlines and arrows must show on white and on the picture: very light colours are deepened a little.
  const stroke = legibleInk(label.color, 3);
  ctx.save();
  if (variant === 'callout') {
    const arrow = label.target && arrowGeometry(bounds, label.target, lineWidth);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (arrow) drawArrow(ctx, arrow, stroke, lineWidth);
    roundedRect(ctx, bounds, layout.radius);
    fillAndStroke(ctx, paperWhite, stroke, lineWidth);
    if (layout.badge) {
      ctx.beginPath();
      ctx.arc(layout.badge.x, layout.badge.y, layout.badge.r, 0, Math.PI * 2);
      ctx.fillStyle = stroke;
      ctx.fill();
      ctx.font = canvasFont(label.font, layout.badge.r * (label.badge && label.badge.length > 1 ? 1.05 : 1.25));
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = onColor(stroke);
      ctx.fillText(label.badge ?? '', layout.badge.x, layout.badge.y + layout.badge.r * .06);
    }
  } else if (variant === 'box') {
    ctx.lineJoin = 'round';
    roundedRect(ctx, bounds, layout.radius);
    fillAndStroke(ctx, narratorFill, stroke, lineWidth);
  } else if (variant !== 'text') {
    drawBalloon(ctx, label, layout, stroke);
  }
  if (!options.hideText?.has(label.id)) drawText(ctx, label, layout, variant === 'text' ? label.color : legibleInk(label.color));
  ctx.restore();
}

export function drawLabels(ctx: CanvasRenderingContext2D, labels: readonly LabelObject[], options: DrawOptions = {}) {
  ctx.save();
  for (const label of labels) drawLabel(ctx, label, layoutLabel(label, ctx), options);
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Renderer contract used by Surface                                   */
/* ------------------------------------------------------------------ */

export interface LabelRenderer {
  draw(ctx: CanvasRenderingContext2D, labels: readonly LabelObject[]): void;
  at(ctx: CanvasRenderingContext2D, labels: readonly LabelObject[], point: Point): LabelObject | undefined;
}

export const labelRenderer: LabelRenderer = {
  draw: (ctx, labels) => drawLabels(ctx, labels),
  at: (ctx, labels, point) => labels.findLast(label => hitLabel(label, layoutLabel(label, ctx), point)),
};

/** The default renderer of the surface is the full one, so every view looks the same. */
export const basicLabels = labelRenderer;

let measuring: CanvasRenderingContext2D | undefined;

/** A scratch 2D context for measuring text outside any drawing surface. */
export function measureContext(): CanvasRenderingContext2D {
  if (!measuring) {
    const context = document.createElement('canvas').getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable');
    measuring = context;
  }
  return measuring;
}

export function layoutOf(label: LabelObject): LabelLayout {
  return layoutLabel(label, measureContext());
}
