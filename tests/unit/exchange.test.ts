import { crc32, deflateSync } from 'node:zlib';
import { expect, test } from 'vitest';
import type { ProjectRecord } from '../../src/core/types';
import { archiveVolumes, deserializeWorks, serializeWorks } from '../../src/features/exchange/format';

function chunk(type: string, contents: Uint8Array) {
  const name = Buffer.from(type);
  const header = Buffer.alloc(4);
  header.writeUInt32BE(contents.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, contents])));
  return Buffer.concat([header, name, contents, crc]);
}

function png(width: number, height: number) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  const image = deflateSync(Buffer.alloc((width + 1) * height, 0));
  return new Blob([
    Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10),
    chunk('IHDR', header), chunk('IDAT', image), chunk('IEND', new Uint8Array()),
  ], { type: 'image/png' });
}

function work(): ProjectRecord {
  const paper = png(1600, 1200);
  const thumb = png(240, 180);
  const first: ProjectRecord['pages'][number] = { id: 'original', text: 'Olá, avó!', bitmap: paper, paper, thumb,
    foreground: paper, labels: [{ id: 'label', kind: 'balloon', shape: 'speech', text: 'Olá!', x: 2, y: 3, size: 24,
      color: '#123456', font: 'Andika', target: { x: 4, y: 5 } }] };
  return { id: 'work', title: 'À janela', author: 'Lia', audience: 'A avó', fps: 12, pages: [first, { ...first, id: 'duplicate' }],
    comments: [{ id: 'comment', kind: 'gostei', text: 'Gostei do céu.', from: 'Ana' }], createdAt: 0, updatedAt: 0 };
}

test('round-trips Unicode, drawings and qualitative comments with new IDs and shared assets', async () => {
  const original = work();
  const file = await serializeWorks([original]);
  const [imported] = await deserializeWorks(file);
  expect(imported.id).not.toBe(original.id);
  expect(imported.pages.map(page => page.id)).not.toEqual(original.pages.map(page => page.id));
  expect(imported.pages.map(page => page.text)).toEqual(['Olá, avó!', 'Olá, avó!']);
  expect(imported).toMatchObject({ title: 'À janela', author: 'Lia', audience: 'A avó', fps: 12,
    comments: [{ kind: 'gostei', text: 'Gostei do céu.', from: 'Ana' }] });
  expect(imported.comments[0].id).not.toBe(original.comments[0].id);
  expect(imported.pages[0].labels[0]).toMatchObject({ text: 'Olá!', target: { x: 4, y: 5 } });
  expect(imported.pages[0].labels[0].id).not.toBe('label');
  expect(imported.pages[0].bitmap).toBe(imported.pages[1].paper);
  expect(await imported.pages[0].bitmap.arrayBuffer()).toEqual(await original.pages[0].bitmap.arrayBuffer());
});

test('rejects malformed JSON, missing pages, out-of-range assets and wrong PNG dimensions', async () => {
  await expect(deserializeWorks(new Blob(['{']))).rejects.toThrow();
  await expect(deserializeWorks(new Blob(['{"format":"garatuja","version":1,"pages":[]}']))).rejects.toThrow();
  const file = await serializeWorks([work()]);
  const json = await file.text();
  await expect(deserializeWorks(new Blob([json.replace('"bitmap":0', '"bitmap":999')]))).rejects.toThrow();
  await expect(deserializeWorks(new Blob([json.replace('"thumb":1', '"thumb":0')]))).rejects.toThrow();
});

test('makes each volume independently importable and reports progress', async () => {
  const works = ['Mar', 'Terra', 'Céu'].map(title => ({ ...work(), title }));
  const limit = (await serializeWorks(works.slice(0, 1))).size + 10;
  const progress: number[] = [];
  const files = await archiveVolumes(works, count => progress.push(count), limit);
  expect(files).toHaveLength(3);
  expect(files.every(file => file.size <= limit)).toBe(true);
  const imported = await Promise.all(files.map(file => deserializeWorks(file)));
  expect(imported.flat().map(work => work.title)).toEqual(['Mar', 'Terra', 'Céu']);
  expect(progress).toEqual([1, 2, 3]);
});

test('preserves an unplaced writing draft in an archive', async () => {
  const original = work();
  const writingDraft = { x: 40, y: 32, size: 84, font: 'andika', color: '#112233', text: 'Uma frase\n'.repeat(40) };
  original.pages[0].writingDraft = writingDraft;
  const [imported] = await deserializeWorks(await serializeWorks([original]));
  expect(imported.pages[0].writingDraft).toEqual(writingDraft);
});
