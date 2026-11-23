import { floodRegion, paintRegion, type Region } from '../core/flood';
import { showCrossCursor } from '../core/tooling/brush-stroke';
import {
  defaultGradient, drawFillSample, fillModes, fillPainter, gradientModes, type FillMode, type Gradient,
} from '../core/tooling/fill-styles';
import { viewport } from '../core/canvas';
import type { L10n, PaintPointer, Point, Tool, ToolContext } from '../core/types';
import { icons } from '../ui/icons';

const names: Record<FillMode, L10n> = {
  solid: { pt: 'Cor lisa', en: 'Solid' }, linear: { pt: 'Degradé reto', en: 'Straight fade' },
  radial: { pt: 'Degradé redondo', en: 'Round fade' }, stripes: { pt: 'Riscas', en: 'Stripes' },
  dots: { pt: 'Bolas', en: 'Dots' }, checks: { pt: 'Xadrez', en: 'Checks' },
  waves: { pt: 'Ondas', en: 'Waves' }, bricks: { pt: 'Tijolos', en: 'Bricks' },
};

const TOLERANCE = 32;

/** A fade waits for the drag that gives it a direction, so the flooded region is kept meanwhile. */
interface Pending { region: Region; source: ImageData; guide?: Uint8ClampedArray; start: Point; mode: 'linear' | 'radial' }
let pending: Pending | undefined;

function gradientFor(p: Pending, to: Point): Gradient {
  const dragged = Math.hypot(to.x - p.start.x, to.y - p.start.y) >= 8;
  return dragged ? { from: p.start, to } : defaultGradient(p.mode, p.region.bounds, p.start);
}

/** Preview at reduced resolution: only the flooded region, painted into a small canvas and stretched. */
function preview(c: ToolContext, p: Pending, to: Point) {
  const { region } = p;
  const { bounds } = region;
  const step = Math.max(1, Math.ceil(Math.max(bounds.w, bounds.h) / 420));
  const w = Math.ceil(bounds.w / step);
  const h = Math.ceil(bounds.h / step);
  const painter = fillPainter(p.mode, c.color, gradientFor(p, to));
  if (typeof painter !== 'function') return;
  const small = viewport(w, h);
  const image = small.createImageData(w, h);
  const out = { r: 0, g: 0, b: 0 };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = bounds.x + x * step;
      const py = bounds.y + y * step;
      if (px >= region.width || py >= region.height || !region.mask[py * region.width + px]) continue;
      painter(px, py, out);
      image.data.set([out.r, out.g, out.b, 235], (y * w + x) * 4);
    }
  }
  small.putImageData(image, 0, 0);
  c.clearOverlay();
  c.overlay.drawImage(small.canvas, bounds.x, bounds.y, w * step, h * step);
}

function apply(c: ToolContext, source: ImageData, region: Region, mode: FillMode, gradient: Gradient | undefined, guide?: Uint8ClampedArray) {
  const result = paintRegion(source, region, fillPainter(mode, c.color, gradient), { foreground: guide, fringe: true });
  if (!result) return;
  const { x, y, w, h } = result.dirty;
  source.data.set(result.data);
  c.ctx.putImageData(source, 0, 0, x, y, w, h);
  c.markDirty(result.dirty);
  c.sound('fill');
}

function start(p: PaintPointer, c: ToolContext) {
  pending = undefined;
  const source = c.ctx.getImageData(0, 0, c.width, c.height);
  const guide = c.foreground?.getContext('2d')?.getImageData(0, 0, c.width, c.height).data;
  const region = floodRegion(source, p, TOLERANCE, guide);
  if (!region) return;
  const mode = c.opt<FillMode>('mode');
  if (gradientModes.has(mode)) {
    pending = { region, source, guide, start: { x: p.x, y: p.y }, mode: mode as 'linear' | 'radial' };
    preview(c, pending, p);
  } else apply(c, source, region, mode, undefined, guide);
}

export default {
  id: 'fill', label: { pt: 'Encher', en: 'Fill' }, icon: icons.fill, order: 50, level: 1, usesColor: true,
  hint: {
    pt: 'Toca numa zona para a encher. Nos degradés, arrasta para dizer para onde vai.',
    en: 'Tap an area to fill it. For fades, drag to say which way they go.',
  },
  options: [{
    kind: 'choice', id: 'mode', label: { pt: 'Enchimento', en: 'Fill style' }, default: 'solid',
    items: fillModes.map(mode => ({
      value: mode, label: names[mode], level: mode === 'solid' || mode === 'stripes' || mode === 'dots' ? 1 : 2,
      preview: (ctx, w, h, color) => drawFillSample(ctx, w, h, mode, color),
    })),
  }],
  down(p, c) { c.clearOverlay(); start(p, c); },
  move(p, _previous, c) { if (pending) preview(c, pending, p); },
  up(p, c) {
    const current = pending;
    pending = undefined;
    if (!current) return;
    c.clearOverlay();
    apply(c, current.source, current.region, current.mode, gradientFor(current, p), current.guide);
  },
  hover(p, c) { showCrossCursor(c, p, 14); },
  cancel() { pending = undefined; },
} satisfies Tool;
