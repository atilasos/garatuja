import { type Rgb } from './draw';
import { type Point, type Rect } from './types';

export interface Pixels {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/** The connected area a fill reaches: a mask of the page, its bounding box and the colour it started on. */
export interface Region {
  width: number;
  height: number;
  /** 1 where the flood reached. */
  mask: Uint8Array;
  bounds: Rect;
  seed: Rgb;
  tolerance: number;
}

/** Writes the colour for page pixel (x, y) into `out`. Patterns and gradients are painters. */
export type Painter = (x: number, y: number, out: Rgb) => void;

const littleEndian = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;

/** Guide pixels at least this opaque stop a flood. */
const BARRIER = 96;
/** How far past the region the anti-aliasing fringe is repaired. */
const FRINGE = 2;

/** Find the area connected to `start` whose colour stays within `tolerance` of the start pixel. Transparent guide pixels are passable. */
export function floodRegion(source: Pixels, start: Point, tolerance = 32, foreground?: Uint8ClampedArray): Region | null {
  const { width, height, data } = source;
  const x = Math.floor(start.x);
  const y = Math.floor(start.y);
  if (x < 0 || y < 0 || x >= width || y >= height) return null;
  const seed = y * width + x;
  const red = data[seed * 4];
  const green = data[seed * 4 + 1];
  const blue = data[seed * 4 + 2];
  const visited = new Uint8Array(width * height);
  // Most pixels of a flat area are identical to the seed: compare them as whole words first.
  const words = data.byteOffset % 4 === 0 ? new Uint32Array(data.buffer, data.byteOffset, width * height) : undefined;
  const seedWord = words?.[seed];
  const passable = (index: number) => {
    if (visited[index]) return false;
    const byte = index * 4;
    if (foreground && foreground[byte + 3] >= BARRIER) return false;
    if (words && words[index] === seedWord) return true;
    return Math.abs(data[byte] - red) <= tolerance &&
      Math.abs(data[byte + 1] - green) <= tolerance &&
      Math.abs(data[byte + 2] - blue) <= tolerance;
  };
  if (!passable(seed)) return null;

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
    let i = left;
    for (; i <= last && passable(i); i++) {
      visited[i] = 1;
      const canGoAbove = row > 0 && passable(i - width);
      const canGoBelow = row < height - 1 && passable(i + width);
      if (canGoAbove && !above) pending.push(i - width);
      if (canGoBelow && !below) pending.push(i + width);
      above = canGoAbove;
      below = canGoBelow;
    }
    if (left - first < minX) minX = left - first;
    if (i - 1 - first > maxX) maxX = i - 1 - first;
    if (row < minY) minY = row;
    if (row > maxY) maxY = row;
  }
  return {
    width, height, mask: visited, tolerance, seed: { r: red, g: green, b: blue },
    bounds: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
  };
}

/**
 * How much of a pixel next to the region is still "paper", judged from the strongest colour
 * nearby (the line). Anti-aliased edge pixels are a mix of paper and line, so they lie on the
 * straight colour line between the two; anything else (another painted area) gets 0.
 */
function paperShare(data: Uint8ClampedArray, width: number, height: number, x: number, y: number, seed: Rgb, tolerance: number) {
  const at = (px: number, py: number) => {
    const i = (py * width + px) * 4;
    return [data[i] - seed.r, data[i + 1] - seed.g, data[i + 2] - seed.b];
  };
  const [dr, dg, db] = at(x, y);
  if (Math.max(Math.abs(dr), Math.abs(dg), Math.abs(db)) <= tolerance) return 0;
  const own = dr * dr + dg * dg + db * db;
  let strongest = own;
  let sr = dr;
  let sg = dg;
  let sb = db;
  for (let py = Math.max(0, y - FRINGE); py <= Math.min(height - 1, y + FRINGE); py++) {
    for (let px = Math.max(0, x - FRINGE); px <= Math.min(width - 1, x + FRINGE); px++) {
      const [r, g, b] = at(px, py);
      const distance = r * r + g * g + b * b;
      if (distance > strongest) { strongest = distance; sr = r; sg = g; sb = b; }
    }
  }
  if (strongest === own) return 0;
  const alignment = (dr * sr + dg * sg + db * sb) / Math.sqrt(own * strongest);
  if (alignment < .985) return 0;
  return Math.min(1, Math.max(0, 1 - Math.sqrt(own / strongest)));
}

/**
 * Paint a region. Returns independent pixels and the changed area, or null when nothing changes.
 * With `fringe`, the pixels just outside the region are repaired too: anti-aliased edge pixels
 * take their share of the new colour (so no pale halo is left along a drawn line), and guide
 * pixels next to the region are filled underneath so the guide never shows the old paper.
 */
export function paintRegion(source: Pixels, region: Region, paint: Rgb | Painter,
  options: { foreground?: Uint8ClampedArray; fringe?: boolean } = {}): { data: Uint8ClampedArray; dirty: Rect } | null {
  const { width, height, data } = source;
  const { mask, bounds, seed, tolerance } = region;
  const output = new Uint8ClampedArray(data);
  const color: Rgb = { r: 0, g: 0, b: 0 };
  const colorAt: Painter = typeof paint === 'function' ? paint : (_x, _y, out) => { out.r = paint.r; out.g = paint.g; out.b = paint.b; };
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  const words = new Uint32Array(output.buffer);
  const pack = (r: number, g: number, b: number) => littleEndian
    ? ((255 << 24) | (((b + .5) | 0) << 16) | (((g + .5) | 0) << 8) | ((r + .5) | 0)) >>> 0
    : ((((r + .5) | 0) << 24) | (((g + .5) | 0) << 16) | (((b + .5) | 0) << 8) | 255) >>> 0;
  const write = (index: number, r: number, g: number, b: number) => {
    const word = pack(Math.min(255, Math.max(0, r)), Math.min(255, Math.max(0, g)), Math.min(255, Math.max(0, b)));
    if (words[index] === word) return;
    words[index] = word;
    const x = index % width;
    const y = (index - x) / width;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  };

  const right = bounds.x + bounds.w;
  const bottom = bounds.y + bounds.h;
  const near: number[] = [];
  const seen = options.fringe ? new Uint8Array(width * height) : undefined;
  const solid = typeof paint === 'function' ? undefined : pack(paint.r, paint.g, paint.b);
  for (let y = bounds.y; y < bottom; y++) {
    for (let x = bounds.x; x < right; x++) {
      const index = y * width + x;
      if (!mask[index]) continue;
      if (solid !== undefined) {
        if (words[index] !== solid) {
          words[index] = solid;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      } else {
        colorAt(x, y, color);
        write(index, color.r, color.g, color.b);
      }
      if (!seen) continue;
      // A region pixel with a neighbour outside the region marks the edge; collect what lies within reach of it.
      const edge = x === 0 || y === 0 || x === width - 1 || y === height - 1 ||
        !mask[index - 1] || !mask[index + 1] || !mask[index - width] || !mask[index + width];
      if (!edge) continue;
      for (let py = Math.max(0, y - FRINGE); py <= Math.min(height - 1, y + FRINGE); py++) {
        for (let px = Math.max(0, x - FRINGE); px <= Math.min(width - 1, x + FRINGE); px++) {
          const other = py * width + px;
          if (!mask[other] && !seen[other]) { seen[other] = 1; near.push(other); }
        }
      }
    }
  }
  for (const index of near) {
    const x = index % width;
    const y = (index - x) / width;
    colorAt(x, y, color);
    const byte = index * 4;
    if (options.foreground && options.foreground[byte + 3] >= BARRIER) {
      write(index, color.r, color.g, color.b);
      continue;
    }
    const share = paperShare(data, width, height, x, y, seed, tolerance);
    if (share > 0) {
      write(index, data[byte] + share * (color.r - seed.r), data[byte + 1] + share * (color.g - seed.g),
        data[byte + 2] + share * (color.b - seed.b));
    }
  }
  if (maxX < 0) return null;
  return { data: output, dirty: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 } };
}

/** Return independent pixels and the changed area. Transparent guide pixels are passable. */
export function floodFill(source: Pixels, start: Point, color: Rgb, tolerance = 28,
  foreground?: Uint8ClampedArray): { data: Uint8ClampedArray; dirty: Rect } | null {
  const region = floodRegion(source, start, tolerance, foreground);
  return region ? paintRegion(source, region, color) : null;
}
