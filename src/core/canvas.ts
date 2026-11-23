import { CANVAS_H, CANVAS_W } from './types';

export function viewport(width = CANVAS_W, height = CANVAS_H, opaque = false, readOften = false) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: !opaque, willReadFrequently: readOften });
  if (!ctx) throw new Error('Canvas 2D is unavailable');
  return ctx;
}

export function png(canvas: HTMLCanvasElement): Blob {
  const encoded = canvas.toDataURL('image/png').split(',')[1];
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: 'image/png' });
}

export function copyCanvas(destination: CanvasRenderingContext2D, source: CanvasImageSource) {
  destination.save();
  destination.globalCompositeOperation = 'copy';
  destination.drawImage(source, 0, 0, destination.canvas.width, destination.canvas.height);
  destination.restore();
}
