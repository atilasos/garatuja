import type { MagicEffect } from '../core/types';
import { edgeShade, rgba } from './_util/c-color';
import { DirtyTracker } from './_util/c-geom';

const nibAngle = -Math.PI * 0.22; // Classic 40-degree angled broad chisel nib

export default {
  id: 'calligraphy',
  label: { pt: 'Caligrafia', en: 'Calligraphy' },
  hint: { pt: 'Arrasta para escrever com traços grossos e finos.', en: 'Drag to write with thick and thin strokes.' },
  category: 'pintar',
  level: 2,
  order: 126,
  usesColor: true,
  stroke(from, to, c, size) {
    const ctx = c.ctx;
    const dirty = new DirtyTracker();
    const halfNib = size * 0.44;
    const nx = Math.cos(nibAngle) * halfNib;
    const ny = Math.sin(nibAngle) * halfNib;
    const capThick = Math.max(2, size * 0.085);

    ctx.save();
    ctx.fillStyle = c.color;
    ctx.strokeStyle = c.color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Filled ribbon swept by the angled broad nib
    ctx.beginPath();
    ctx.moveTo(from.x - nx, from.y - ny);
    ctx.lineTo(from.x + nx, from.y + ny);
    ctx.lineTo(to.x + nx, to.y + ny);
    ctx.lineTo(to.x - nx, to.y - ny);
    ctx.closePath();
    ctx.fill();

    // Crisp nib edge lines at both ends so thin strokes never break
    ctx.lineWidth = capThick;
    ctx.beginPath();
    ctx.moveTo(from.x - nx, from.y - ny);
    ctx.lineTo(from.x + nx, from.y + ny);
    ctx.moveTo(to.x - nx, to.y - ny);
    ctx.lineTo(to.x + nx, to.y + ny);
    ctx.stroke();

    // Subtle rich ink edge accent along one side of the nib
    ctx.strokeStyle = rgba(edgeShade(c.color), 0.32);
    ctx.lineWidth = Math.max(1, size * 0.045);
    ctx.beginPath();
    ctx.moveTo(from.x + nx, from.y + ny);
    ctx.lineTo(to.x + nx, to.y + ny);
    ctx.stroke();

    ctx.restore();
    dirty.addSegment(from, to, halfNib + capThick + 3);
    dirty.flush(c);
  },
} satisfies MagicEffect;
