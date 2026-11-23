import { Layer, mix, rgba } from '../core/tooling/brush-kit';
import { pressureSize } from '../core/tooling/brush-stroke';
import type { BrushDef } from '../core/types';

const tube = new Layer(1);

export default {
  id: 'neon', label: { pt: 'Néon', en: 'Neon' }, order: 230, level: 2, spacing: .08,
  begin() { tube.reset(); },
  dab(ctx, d) {
    const radius = pressureSize(d.size, d.pressure) / 2;
    const glow = radius * 1.45;
    tube.paint(ctx, { x: d.x - glow - 2, y: d.y - glow - 2, w: glow * 2 + 4, h: glow * 2 + 4 }, layer => {
      // Stack from the bottom: the halo and the coloured tube go behind everything painted so far, the bright core on top.
      layer.globalCompositeOperation = 'destination-over';
      layer.fillStyle = d.color;
      layer.beginPath();
      layer.arc(d.x, d.y, radius * .62, 0, Math.PI * 2);
      layer.fill();
      const halo = layer.createRadialGradient(d.x, d.y, radius * .4, d.x, d.y, glow);
      halo.addColorStop(0, rgba(d.color, .5));
      halo.addColorStop(1, rgba(d.color, 0));
      layer.fillStyle = halo;
      layer.beginPath();
      layer.arc(d.x, d.y, glow, 0, Math.PI * 2);
      layer.fill();
      layer.globalCompositeOperation = 'source-over';
      layer.fillStyle = mix(d.color, '#ffffff', .82);
      layer.beginPath();
      layer.arc(d.x, d.y, Math.max(1, radius * .26), 0, Math.PI * 2);
      layer.fill();
    });
  },
} satisfies BrushDef;
