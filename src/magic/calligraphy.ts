import type { MagicEffect } from '../core/types';
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
    const capThick = Math.max(1.5, size * 0.05);

    ctx.save();
    ctx.fillStyle = c.color;
    ctx.strokeStyle = c.color;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';

    // Crisp parallelogram swept by the broad chisel nib
    ctx.beginPath();
    ctx.moveTo(from.x - nx, from.y - ny);
    ctx.lineTo(from.x + nx, from.y + ny);
    ctx.lineTo(to.x + nx, to.y + ny);
    ctx.lineTo(to.x - nx, to.y - ny);
    ctx.closePath();
    ctx.fill();

    // Hairline nib edge so strokes parallel to the nib stay unbroken
    ctx.lineWidth = capThick;
    ctx.beginPath();
    ctx.moveTo(from.x - nx, from.y - ny);
    ctx.lineTo(from.x + nx, from.y + ny);
    ctx.moveTo(to.x - nx, to.y - ny);
    ctx.lineTo(to.x + nx, to.y + ny);
    ctx.stroke();

    ctx.restore();
    dirty.addSegment(from, to, halfNib + capThick + 3);
    dirty.flush(c);
  },
} satisfies MagicEffect;
