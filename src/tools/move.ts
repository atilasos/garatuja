import { png, viewport } from '../core/canvas';
import type { L10n, Point, Rect, Tool, ToolContext } from '../core/types';
import { lift, outline, outlineBounds, removePaper, tracePath, type SelectionShape } from '../stamps/ui/cutout';
import { stampIcons } from '../stamps/ui/icons';

interface Transform {
  center: Point;
  scale: number;
  angle: number;
  mirrored: boolean;
}

interface Selection {
  bounds: Rect;
  cutout: CanvasRenderingContext2D;
  transform: Transform;
  duplicated: boolean;
}

type Drag = {
  mode: 'translate' | 'resize' | 'rotate' | 'outside';
  start: Point;
  initial: Transform;
};

type State =
  | { kind: 'idle' }
  | { kind: 'trace'; points: Point[]; shape: SelectionShape }
  | { kind: 'floating'; selection: Selection; context: ToolContext; drag?: Drag };

const hint: L10n = { pt: 'Contorna uma parte do desenho para a levantares.', en: 'Draw around part of your picture to lift it.' };
const floatingHint: L10n = { pt: 'Arrasta o recorte. Toca fora para o pousar.', en: 'Drag the cutout. Tap outside it to put it down.' };

let state: State = { kind: 'idle' };
let selectionChanged = () => {};

export function observeSelection(listener: () => void) { selectionChanged = listener; }
export function hasSelection() { return state.kind === 'floating'; }
export function resizeSelectionPreview() {
  if (state.kind === 'floating') preview(state.context);
}

function apply(ctx: CanvasRenderingContext2D, transform: Transform) {
  const { center, scale, angle, mirrored } = transform;
  ctx.translate(center.x, center.y);
  ctx.rotate(angle);
  ctx.scale(mirrored ? -scale : scale, scale);
}

function paint(ctx: CanvasRenderingContext2D, cutout: HTMLCanvasElement, transform: Transform) {
  ctx.save();
  apply(ctx, transform);
  ctx.drawImage(cutout, -cutout.width / 2, -cutout.height / 2);
  ctx.restore();
}

function pagePosition(center: Point, offset: Point, angle: number): Point {
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  return { x: center.x + offset.x * cos - offset.y * sin, y: center.y + offset.x * sin + offset.y * cos };
}

function dirty(selection: Selection): Rect {
  const { bounds, transform: { center, scale, angle } } = selection;
  const w = scale * (bounds.w * Math.abs(Math.cos(angle)) + bounds.h * Math.abs(Math.sin(angle))) + 4;
  const h = scale * (bounds.h * Math.abs(Math.cos(angle)) + bounds.w * Math.abs(Math.sin(angle))) + 4;
  return { x: center.x - w / 2, y: center.y - h / 2, w, h };
}

function markers(selection: Selection, c: ToolContext) {
  const { bounds, transform: { center, scale, angle } } = selection;
  const view = c.overlay.canvas.getBoundingClientRect();
  const unit = c.width / (view.width || c.width);
  const radius = 24 * unit;
  const corner = (x: number, y: number) => pagePosition(center, { x, y }, angle);
  const clamp = (p: Point) => ({
    x: Math.max(radius, Math.min(c.width - radius, p.x)),
    y: Math.max(radius, Math.min(c.height - radius, p.y)),
  });
  const x = bounds.w * scale / 2;
  const y = bounds.h * scale / 2;
  const resize = clamp(corner(x + radius, y + radius));
  let rotate = clamp(corner(x + radius, -y - radius));
  if (distance(rotate, resize) < radius * 2) {
    const shift = (value: number, limit: number) => value + (value < limit / 2 ? 1 : -1) * radius * 2;
    rotate = clamp({ x: shift(resize.x, c.width), y: resize.y });
    if (distance(rotate, resize) < radius * 2 - 1) rotate = clamp({ x: resize.x, y: shift(resize.y, c.height) });
  }
  return { radius, unit, resize, rotate, resizeCorner: corner(x, y), rotateCorner: corner(x, -y) };
}

function distance(a: Point, b: Point) { return Math.hypot(a.x - b.x, a.y - b.y); }
function bearing(p: Point, center: Point) { return Math.atan2(p.y - center.y, p.x - center.x); }

function border(ctx: CanvasRenderingContext2D, unit: number) {
  ctx.setLineDash([]);
  ctx.lineWidth = 4 * unit;
  ctx.strokeStyle = '#fffaf3';
  ctx.stroke();
  ctx.setLineDash([5 * unit, 4 * unit]);
  ctx.lineWidth = 2 * unit;
  ctx.strokeStyle = '#23578d';
  ctx.stroke();
}

function preview(c: ToolContext) {
  c.clearOverlay();
  const ctx = c.overlay;
  ctx.save();
  if (state.kind === 'trace') {
    tracePath(ctx, outline(state.shape, state.points));
    ctx.fillStyle = '#8fc3ed55';
    ctx.fill('evenodd');
    border(ctx, c.width / (ctx.canvas.getBoundingClientRect().width || c.width));
  }
  if (state.kind === 'floating') {
    const { selection } = state;
    const { center, scale, angle } = selection.transform;
    const { w, h } = selection.bounds;
    const { radius, unit, resize, rotate, resizeCorner, rotateCorner } = markers(selection, c);
    paint(ctx, selection.cutout.canvas, selection.transform);
    ctx.translate(center.x, center.y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.rect(-w * scale / 2, -h * scale / 2, w * scale, h * scale);
    border(ctx, unit);
    ctx.resetTransform();
    drawHandle(ctx, resize, resizeCorner, radius, unit, 'resize');
    drawHandle(ctx, rotate, rotateCorner, radius, unit, 'rotate');
  }
  ctx.restore();
}

function drawHandle(ctx: CanvasRenderingContext2D, p: Point, corner: Point, radius: number, unit: number, kind: 'resize' | 'rotate') {
  ctx.setLineDash([]);
  ctx.lineWidth = 2 * unit;
  ctx.strokeStyle = '#23578d';
  ctx.beginPath();
  ctx.moveTo(corner.x, corner.y);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(unit, unit);
  ctx.beginPath();
  ctx.arc(0, 0, radius / unit - 3, 0, Math.PI * 2);
  ctx.fillStyle = '#fffaf3';
  ctx.fill();
  ctx.stroke();
  const symbol = kind === 'resize'
    ? 'M-9 9 9 -9M-9 2v7h7M2 -9h7v7'
    : 'M7 -7a10 10 0 1 0 2 12M7 -12v6H1';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(new Path2D(symbol));
  ctx.restore();
}

function hitMode(p: Point, selection: Selection, c: ToolContext): Drag['mode'] {
  const { radius, resize, rotate } = markers(selection, c);
  const sizeDistance = distance(p, resize);
  const turnDistance = distance(p, rotate);
  if (Math.min(sizeDistance, turnDistance) <= radius) return sizeDistance < turnDistance ? 'resize' : 'rotate';
  const { center, scale, angle } = selection.transform;
  const local = pagePosition({ x: 0, y: 0 }, { x: p.x - center.x, y: p.y - center.y }, -angle);
  return Math.abs(local.x) <= Math.max(selection.bounds.w * scale / 2, radius)
    && Math.abs(local.y) <= Math.max(selection.bounds.h * scale / 2, radius) ? 'translate' : 'outside';
}

function place(c: ToolContext, selection: Selection) {
  paint(c.ctx, selection.cutout.canvas, selection.transform);
  c.markDirty(dirty(selection));
}

function duplicateCenter(selection: Selection, c: ToolContext): Point {
  const { center } = selection.transform;
  const { x, y, w, h } = dirty(selection);
  const { unit } = markers(selection, c);
  const gap = 16 * unit;
  if (x + 2 * w + gap <= c.width) return { x: center.x + w + gap, y: center.y };
  if (y + 2 * h + gap <= c.height) return { x: center.x, y: center.y + h + gap };
  if (x - w - gap >= 0) return { x: center.x - w - gap, y: center.y };
  if (y - h - gap >= 0) return { x: center.x, y: center.y - h - gap };
  const offset = 34 * unit;
  return {
    x: center.x + (center.x < c.width / 2 ? offset : -offset),
    y: center.y + (center.y < c.height / 2 ? offset : -offset),
  };
}

function finish(c: ToolContext, commit: boolean) {
  state = { kind: 'idle' };
  if (commit) c.commit();
  else c.rollback();
  selectionChanged();
}

export function editSelection(action: 'duplicate' | 'mirror' | 'delete' | 'drop') {
  if (state.kind !== 'floating') return;
  const { selection, context: c } = state;
  const { bounds, transform } = selection;
  switch (action) {
    case 'duplicate': {
      place(c, selection);
      selection.duplicated = true;
      transform.center = duplicateCenter(selection, c);
      preview(c);
      return;
    }
    case 'mirror':
      transform.mirrored = !transform.mirrored;
      preview(c);
      return;
    case 'delete':
      finish(c, true);
      return;
    case 'drop': {
      const unchanged = !selection.duplicated && !transform.mirrored && transform.scale === 1 && transform.angle === 0
        && transform.center.x === bounds.x + bounds.w / 2 && transform.center.y === bounds.y + bounds.h / 2;
      if (!unchanged) place(c, selection);
      finish(c, !unchanged);
      return;
    }
  }
}

export function makeStamp() {
  if (state.kind !== 'floating') return;
  const { selection: { cutout, bounds: { x, y, w, h }, transform }, context: c } = state;
  const source = viewport(w, h, false, true);
  source.drawImage(cutout.canvas, 0, 0);
  const picture = source.getImageData(0, 0, w, h);
  source.clearRect(0, 0, w, h);
  source.drawImage(c.paper, x, y, w, h, 0, 0, w, h);
  if (!removePaper(picture.data, source.getImageData(0, 0, w, h).data)) return;
  source.putImageData(picture, 0, 0);
  const cosine = Math.abs(Math.cos(transform.angle));
  const sine = Math.abs(Math.sin(transform.angle));
  const turned = viewport(Math.ceil(w * cosine + h * sine), Math.ceil(w * sine + h * cosine), false, true);
  paint(turned, source.canvas, { ...transform, scale: 1, center: { x: turned.canvas.width / 2, y: turned.canvas.height / 2 } });
  const pixels = turned.getImageData(0, 0, turned.canvas.width, turned.canvas.height);
  let left = pixels.width;
  let right = 0;
  let top = pixels.height;
  let bottom = 0;
  for (let row = 0; row < pixels.height; row++) {
    for (let column = 0; column < pixels.width; column++) {
      if (!pixels.data[(row * pixels.width + column) * 4 + 3]) continue;
      left = Math.min(left, column);
      right = Math.max(right, column);
      top = Math.min(top, row);
      bottom = Math.max(bottom, row);
    }
  }
  if (left > right || top > bottom) return;
  const cropped = viewport(right - left + 1, bottom - top + 1);
  cropped.drawImage(turned.canvas, left, top, cropped.canvas.width, cropped.canvas.height, 0, 0, cropped.canvas.width, cropped.canvas.height);
  return png(cropped.canvas);
}

export const shapeOption = {
  kind: 'choice', id: 'selection', label: { pt: 'Recorte', en: 'Cutout' }, default: 'rectangle',
  items: [
    { value: 'rectangle', label: { pt: 'Retângulo', en: 'Rectangle' }, icon: stampIcons.rectangle },
    { value: 'lasso', label: { pt: 'Laço', en: 'Lasso' }, icon: stampIcons.lasso },
  ],
} satisfies NonNullable<Tool['options']>[number];

export default {
  id: 'move', label: { pt: 'Mover', en: 'Move' }, icon: stampIcons.move, order: 95, level: 2, usesColor: false,
  hint, manualCommit: true, options: [shapeOption],
  down(p, c) {
    if (state.kind !== 'floating') state = { kind: 'trace', points: [p, p], shape: c.opt<SelectionShape>('selection') };
    else state.drag = { mode: hitMode(p, state.selection, c), start: p, initial: { ...state.selection.transform } };
    preview(c);
  },
  move(p, _previous, c) {
    if (state.kind === 'trace') {
      if (state.shape === 'rectangle') state.points[1] = p;
      else if (distance(p, state.points[state.points.length - 1]) >= 1) state.points.push(p);
      preview(c);
    } else if (state.kind === 'floating' && state.drag) {
      const { start, initial, mode } = state.drag;
      const transform = state.selection.transform;
      if (mode === 'translate') {
        transform.center = {
          x: Math.min(c.width, Math.max(0, initial.center.x + p.x - start.x)),
          y: Math.min(c.height, Math.max(0, initial.center.y + p.y - start.y)),
        };
      } else if (mode === 'resize') {
        transform.scale = Math.max(.1, Math.min(8, initial.scale * distance(p, initial.center) / Math.max(1, distance(start, initial.center))));
      } else if (mode === 'rotate') {
        transform.angle = initial.angle + bearing(p, initial.center) - bearing(start, initial.center);
      }
      preview(c);
    }
  },
  up(p, c) {
    if (state.kind === 'trace') {
      const { shape, points } = state;
      if (shape === 'rectangle') {
        points[0] = { x: Math.round(points[0].x), y: Math.round(points[0].y) };
        points[1] = { x: Math.round(p.x), y: Math.round(p.y) };
      }
      const polygon = outline(shape, points);
      const bounds = outlineBounds(polygon, c.width, c.height);
      const cutout = bounds.w >= 2 && bounds.h >= 2 && lift(c.ctx, c.paper, bounds, polygon);
      if (!cutout) { finish(c, false); return; }
      c.markDirty(bounds);
      const transform = { center: { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2 }, scale: 1, angle: 0, mirrored: false };
      state = { kind: 'floating', selection: { bounds, cutout, transform, duplicated: false }, context: c };
      c.say(floatingHint);
      selectionChanged();
      preview(c);
    } else if (state.kind === 'floating') {
      const drag = state.drag;
      state.drag = undefined;
      if (drag?.mode === 'outside' && distance(p, drag.start) < markers(state.selection, c).unit * 10) editSelection('drop');
    }
  },
  cancel(c) { finish(c, false); },
} satisfies Tool;
