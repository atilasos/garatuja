import { interpolateDabs, seededRandom, strokeBounds } from '../draw';
import { brushes } from '../registry';
import type { BrushDef, ChoiceItem, OptionSpec, PaintPointer, ToolContext } from '../types';

export const brushSizes: OptionSpec = {
  kind: 'size', id: 'size', label: { pt: 'Tamanho', en: 'Size' }, steps: [8, 16, 32, 56, 96], default: 32,
};

export const brushChoice: OptionSpec = {
  kind: 'choice', id: 'brush', shared: 'brush', label: { pt: 'Pincel', en: 'Brush' }, default: 'round',
  items: () => brushes.all().map((brush): ChoiceItem => ({
    value: brush.id, label: brush.label, level: brush.level,
    preview(ctx, w, h, color) {
      const random = seededRandom(7);
      const size = h * 0.42;
      brush.begin?.(color, size);
      interpolateDabs({ x: w * .25, y: h * .68 }, { x: w * .75, y: h * .32 }, Math.max(1, size * brush.spacing), 0,
        (p, _fraction, angle, travelled) => brush.dab(ctx, { ...p, angle, travelled, size, color, pressure: .5, random }));
    },
  })),
};

export function currentBrush(c: ToolContext): BrushDef {
  const brush = brushes.get(c.opt('brush')) ?? brushes.get('round');
  if (!brush) throw new Error('The round brush is required');
  return brush;
}

export class BrushStroke {
  private travelled = 0;
  private remaining: number;
  private angle = 0;

  constructor(private brush: BrushDef, private size: number, private color: string, private random: () => number) {
    this.remaining = this.spacing;
    brush.begin?.(color, size);
  }

  private get spacing() { return Math.max(1, this.size * this.brush.spacing); }
  get padding() { return this.size * (this.brush.extent ?? 1.5) + 2; }

  dab(ctx: CanvasRenderingContext2D, p: PaintPointer, angle = this.angle) {
    this.brush.dab(ctx, { x: p.x, y: p.y, angle, pressure: p.pressure, size: this.size, color: this.color,
      travelled: this.travelled, random: this.random });
  }

  segment(ctx: CanvasRenderingContext2D, from: PaintPointer, to: PaintPointer) {
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    this.remaining = interpolateDabs(from, to, this.spacing, this.remaining, (p, fraction, angle, distance) => {
      this.angle = angle;
      this.brush.dab(ctx, { ...p, angle, pressure: from.pressure + (to.pressure - from.pressure) * fraction,
        size: this.size, color: this.color, travelled: this.travelled + distance, random: this.random });
    });
    this.travelled += length;
    return strokeBounds(from, to, this.padding);
  }
}

export function pressureSize(size: number, pressure: number) { return size * (.45 + pressure * 1.1); }
