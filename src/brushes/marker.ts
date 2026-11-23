import { Layer } from '../core/tooling/brush-kit';
import { pressureSize } from '../core/tooling/brush-stroke';
import type { BrushDef } from '../core/types';

const wash = new Layer(.52);

export default {
  id: 'marker', label: { pt: 'Marcador', en: 'Marker' }, order: 30, level: 1, spacing: .08,
  begin() { wash.reset(); },
  dab(ctx, d) {
    // A rounded square nib: flat, translucent, and clearly not a round brush.
    const radius = pressureSize(d.size, d.pressure) / 2;
    const reach = radius * 1.5;
    wash.paint(ctx, { x: d.x - reach, y: d.y - reach, w: reach * 2, h: reach * 2 }, layer => {
      layer.fillStyle = d.color;
      layer.beginPath();
      layer.roundRect(d.x - radius, d.y - radius, radius * 2, radius * 2, radius * .38);
      layer.fill();
    });
  },
} satisfies BrushDef;
