import { shade } from '../core/tooling/brush-kit';
import { pressureSize } from '../core/tooling/brush-stroke';
import { seededRandom } from '../core/draw';
import type { BrushDef } from '../core/types';

interface Bristle { x: number; y: number; radius: number; shade: number; phase: number; thirsty: boolean }

let bristles: Bristle[] = [];
let strokes = 0;

export default {
  id: 'bristle', label: { pt: 'Cerdas', en: 'Bristles' }, order: 130, level: 2, spacing: .04,
  hint: { pt: 'Arrasta para deixar as marcas dos pelos do pincel.', en: 'Drag to leave individual bristle marks.' },
  begin(_color, size) {
    const random = seededRandom(++strokes * 7919);
    bristles = Array.from({ length: 18 }, () => {
      const angle = random() * Math.PI * 2;
      const distance = Math.sqrt(random()) * .92;
      return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, radius: Math.max(.7, size * (.03 + random() * .03)),
        shade: (random() - .5) * .26, phase: random() * 40, thirsty: random() > .55 };
    });
  },
  dab(ctx, d) {
    const reach = pressureSize(d.size, d.pressure) / 2;
    for (const bristle of bristles) {
      // Some bristles run dry for a while, leaving the streaks a real brush leaves.
      if (bristle.thirsty && Math.sin(d.travelled / (d.size * .9) + bristle.phase) < -.55) continue;
      ctx.fillStyle = shade(d.color, bristle.shade);
      ctx.beginPath();
      ctx.arc(d.x + bristle.x * reach, d.y + bristle.y * reach, bristle.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  },
} satisfies BrushDef;
