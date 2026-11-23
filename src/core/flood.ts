import { type Rgb } from './draw';
import { type Point, type Rect } from './types';

interface Pixels {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/** Return independent pixels and the changed area. Transparent guide pixels are passable. */
export function floodFill(source: Pixels, start: Point, color: Rgb, tolerance = 28,
  foreground?: Uint8ClampedArray): { data: Uint8ClampedArray; dirty: Rect } | null {
  const { width, height, data } = source;
  const x = Math.floor(start.x);
  const y = Math.floor(start.y);
  if (x < 0 || y < 0 || x >= width || y >= height) return null;
  const seed = y * width + x;
  const red = data[seed * 4];
  const green = data[seed * 4 + 1];
  const blue = data[seed * 4 + 2];
  const visited = new Uint8Array(width * height);
  const passable = (index: number) => {
    const byte = index * 4;
    return !visited[index] && (!foreground || foreground[byte + 3] < 96) &&
      Math.abs(data[byte] - red) <= tolerance &&
      Math.abs(data[byte + 1] - green) <= tolerance &&
      Math.abs(data[byte + 2] - blue) <= tolerance;
  };
  if (!passable(seed)) return null;

  const output = new Uint8ClampedArray(data);
  const pending = [seed];
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  while (pending.length) {
    const index = pending.pop();
    if (index === undefined || !passable(index)) continue;
    const row = Math.floor(index / width);
    const first = row * width;
    const last = first + width - 1;
    let left = index;
    while (left > first && passable(left - 1)) left--;
    let above = false;
    let below = false;
    for (let i = left; i <= last && passable(i); i++) {
      visited[i] = 1;
      const byte = i * 4;
      if (data[byte] !== color.r || data[byte + 1] !== color.g || data[byte + 2] !== color.b || data[byte + 3] !== 255) {
        output[byte] = color.r;
        output[byte + 1] = color.g;
        output[byte + 2] = color.b;
        output[byte + 3] = 255;
        const column = i - first;
        if (column < minX) minX = column;
        if (column > maxX) maxX = column;
        if (row < minY) minY = row;
        if (row > maxY) maxY = row;
      }
      const canGoAbove = row > 0 && passable(i - width);
      const canGoBelow = row < height - 1 && passable(i + width);
      if (canGoAbove && !above) pending.push(i - width);
      if (canGoBelow && !below) pending.push(i + width);
      above = canGoAbove;
      below = canGoBelow;
    }
  }
  if (maxX < 0) return null;
  return { data: output, dirty: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 } };
}
