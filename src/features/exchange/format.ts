import { CANVAS_H, CANVAS_W, type LabelObject, type PageRecord, type ProjectRecord } from '../../core/types';
import { maxPages } from '../pages/operations';

export const maxFileBytes = 160 * 1024 * 1024;
const maxImageBytes = 8 * 1024 * 1024;
const signature = [137, 80, 78, 71, 13, 10, 26, 10];
const format = 'garatuja';
const version = 1;

async function base64(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += 0x4000) chunks.push(String.fromCharCode(...bytes.subarray(i, i + 0x4000)));
  return btoa(chunks.join(''));
}

export async function serializeWork(project: ProjectRecord, progress?: (done: number) => void) {
  const { title, author, audience, fps, comments, pages } = project;
  if (!pages.length || pages.length > maxPages) throw new Error('Unsupported page count');
  const assets: string[] = [];
  const blobs = new Map<Blob, number>();
  const indexes = new Map<string, number>();
  let encodedSize = 0;
  async function asset(blob: Blob) {
    const known = blobs.get(blob);
    if (known !== undefined) return known;
    if (blob.size > maxImageBytes) throw new Error('A PNG is too large');
    const png = await base64(blob);
    const existing = indexes.get(png);
    const index = existing ?? assets.length;
    if (existing === undefined) {
      encodedSize += png.length;
      if (encodedSize > maxFileBytes) throw new Error('The file is too large');
      assets.push(png);
      indexes.set(png, index);
    }
    blobs.set(blob, index);
    return index;
  }

  const records = [];
  for (const [i, page] of pages.entries()) {
    const { text, labels, bitmap, paper, foreground, thumb } = page;
    records.push({ text, labels, bitmap: await asset(bitmap), paper: await asset(paper),
      foreground: foreground && await asset(foreground), thumb: await asset(thumb) });
    progress?.(i + 1);
  }
  const file = new Blob([JSON.stringify({ format, version, title, author, audience, fps, comments, pages: records, assets })],
    { type: 'application/json' });
  if (file.size > maxFileBytes) throw new Error('The file is too large');
  return file;
}

function requireValue(value: unknown): asserts value {
  if (!value) throw new Error('Invalid Garatuja file');
}

function record(value: unknown): Record<string, unknown> {
  requireValue(typeof value === 'object' && value !== null && !Array.isArray(value));
  return Object.fromEntries(Object.entries(value));
}

function str(value: unknown) {
  requireValue(typeof value === 'string');
  return value;
}

function finite(value: unknown) {
  requireValue(typeof value === 'number' && Number.isFinite(value));
  return value;
}

function array(value: unknown): unknown[] {
  requireValue(Array.isArray(value));
  return value;
}

function label(value: unknown): LabelObject {
  const data = record(value);
  const { kind, shape } = data;
  requireValue(kind === 'text' || kind === 'balloon' || kind === 'callout');
  requireValue(shape === undefined || shape === 'speech' || shape === 'thought' || shape === 'shout' || shape === 'box');
  const location = (point: Record<string, unknown>) => ({ x: finite(point.x), y: finite(point.y) });
  const size = finite(data.size);
  requireValue(size > 0);
  return { id: crypto.randomUUID(), kind, ...location(data), size, text: str(data.text),
    font: str(data.font), color: str(data.color), shape,
    target: data.target === undefined ? undefined : location(record(data.target)),
    badge: data.badge === undefined ? undefined : str(data.badge) };
}

function comment(value: unknown): ProjectRecord['comments'][number] {
  const { kind, text, from } = record(value);
  requireValue(kind === 'gostei' || kind === 'pergunto' || kind === 'sugiro');
  return { id: crypto.randomUUID(), kind, text: str(text), from: str(from) };
}

interface Png {
  blob: Blob;
  width: number;
  height: number;
}

function decodePng(value: unknown): Png {
  const encoded = str(value);
  requireValue(encoded.length <= 4 * Math.ceil(maxImageBytes / 3));
  const binary = atob(encoded);
  requireValue(binary.length >= 57 && binary.length <= maxImageBytes);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  requireValue(signature.every((byte, i) => bytes[i] === byte));
  const header = new DataView(bytes.buffer);
  requireValue(header.getUint32(8) === 13 && header.getUint32(12) === 0x49484452); // IHDR
  requireValue(header.getUint32(bytes.length - 12) === 0 && header.getUint32(bytes.length - 8) === 0x49454e44); // IEND
  return { blob: new Blob([bytes], { type: 'image/png' }), width: header.getUint32(16), height: header.getUint32(20) };
}

export async function deserializeWork(file: Blob, verifyImage?: (image: Blob) => Promise<void>): Promise<ProjectRecord> {
  requireValue(file.size > 0 && file.size <= maxFileBytes);
  const parsed: unknown = JSON.parse(await file.text());
  const { format: fileFormat, version: fileVersion, title, author, audience, fps, comments, pages, assets } = record(parsed);
  requireValue(fileFormat === format && fileVersion === version);
  const records = array(pages);
  requireValue(records.length > 0 && records.length <= maxPages);
  const images = array(assets);
  requireValue(images.length > 0 && images.length <= maxPages * 4);
  const decoded = new Map<number, Png>();
  function png(value: unknown, thumb = false) {
    const index = finite(value);
    requireValue(Number.isInteger(index) && index >= 0 && index < images.length);
    const image = decoded.get(index) ?? decodePng(images[index]);
    requireValue(image.width === (thumb ? 240 : CANVAS_W) && image.height === (thumb ? 180 : CANVAS_H));
    decoded.set(index, image);
    return image.blob;
  }
  const importedPages: PageRecord[] = records.map(value => {
    const { text, labels, bitmap, paper, foreground, thumb } = record(value);
    return { id: crypto.randomUUID(), text: str(text), labels: array(labels).map(label), bitmap: png(bitmap),
      paper: png(paper), foreground: foreground === undefined ? undefined : png(foreground), thumb: png(thumb, true) };
  });
  requireValue(decoded.size === images.length);
  const speed = finite(fps);
  requireValue(speed > 0 && speed <= 60);
  const now = Date.now();
  const project = { id: crypto.randomUUID(), title: str(title), author: str(author), audience: str(audience),
    fps: speed, comments: array(comments).map(comment), pages: importedPages, createdAt: now, updatedAt: now };
  if (verifyImage) for (const { blob } of decoded.values()) await verifyImage(blob);
  return project;
}
