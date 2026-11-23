import { viewport } from '../canvas';
import type { IconSvg, StampDef } from '../types';

export function stampSvg(markup: IconSvg): string {
  return 'data:image/svg+xml,' + encodeURIComponent(markup);
}

const images = new Map<string, HTMLImageElement>();

export function stampImage(stamp: StampDef): HTMLImageElement {
  const loaded = images.get(stamp.src);
  if (loaded) return loaded;
  const image = new Image();
  image.src = stamp.src;
  images.set(stamp.src, image);
  return image;
}

export function drawStamp(ctx: CanvasRenderingContext2D, stamp: StampDef, x: number, y: number, size: number,
  color: string, mirror = false, flip = false) {
  const image = stampImage(stamp);
  if (!image.complete || !image.naturalWidth) return false;
  const longest = Math.max(image.naturalWidth, image.naturalHeight);
  const width = size * image.naturalWidth / longest;
  const height = size * image.naturalHeight / longest;
  let source: CanvasImageSource = image;
  if (stamp.tintable) {
    const tinted = viewport(Math.ceil(width), Math.ceil(height));
    tinted.drawImage(image, 0, 0, tinted.canvas.width, tinted.canvas.height);
    tinted.globalCompositeOperation = 'source-in';
    tinted.fillStyle = color;
    tinted.fillRect(0, 0, tinted.canvas.width, tinted.canvas.height);
    source = tinted.canvas;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(mirror ? -1 : 1, flip ? -1 : 1);
  ctx.drawImage(source, -width / 2, -height / 2, width, height);
  ctx.restore();
  return true;
}
