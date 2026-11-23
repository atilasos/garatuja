import type { LabelObject, Point } from './types';

function setFont(ctx: CanvasRenderingContext2D, label: LabelObject) {
  ctx.font = `${label.size}px ${label.font}`;
  ctx.textBaseline = 'top';
}

function drawLabels(ctx: CanvasRenderingContext2D, labels: readonly LabelObject[]) {
  ctx.save();
  for (const label of labels) {
    setFont(ctx, label);
    ctx.fillStyle = label.color;
    ctx.strokeStyle = label.color;
    ctx.lineWidth = Math.max(2, label.size / 10);
    if (label.target) {
      ctx.beginPath();
      ctx.moveTo(label.x, label.y + label.size / 2);
      ctx.lineTo(label.target.x, label.target.y);
      ctx.stroke();
    }
    label.text.split('\n').forEach((line, i) => ctx.fillText(line, label.x, label.y + label.size * 1.2 * i));
  }
  ctx.restore();
}

function labelAt(ctx: CanvasRenderingContext2D, labels: readonly LabelObject[], p: Point) {
  ctx.save();
  const match = labels.findLast(label => {
    if (p.x < label.x || p.y < label.y) return false;
    const lines = label.text.split('\n');
    if (p.y > label.y + lines.length * label.size * 1.2) return false;
    setFont(ctx, label);
    return p.x <= label.x + Math.max(...lines.map(line => ctx.measureText(line).width));
  });
  ctx.restore();
  return match;
}

export interface LabelRenderer {
  draw(ctx: CanvasRenderingContext2D, labels: readonly LabelObject[]): void;
  at(ctx: CanvasRenderingContext2D, labels: readonly LabelObject[], point: Point): LabelObject | undefined;
}

export const basicLabels: LabelRenderer = { draw: drawLabels, at: labelAt };
