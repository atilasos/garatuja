import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chooseVoice } from '../../src/core/i18n';
import { recipes } from '../../src/core/sound';
import type { ProjectRecord, SoundId } from '../../src/core/types';
import { Trash } from '../../src/features/gallery/trash';
import { duplicateProject, fitRect } from '../../src/features/gallery/works';

const blob = new Blob(['x']);
const project = (id: string): ProjectRecord => ({
  id, title: 'Rio', author: 'Ana', audience: 'A turma', fps: 6, comments: [], createdAt: 1, updatedAt: 2,
  pages: [{ id: 'p1', bitmap: blob, paper: blob, thumb: blob, labels: [{ id: 'l', kind: 'text', x: 1, y: 2, text: 'a', font: 'f', size: 9, color: '#000000' }], text: 'Era uma vez' }],
});

describe('deferred deletion', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('window', { addEventListener() {}, setTimeout, clearTimeout });
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('deletes after 30 seconds unless undone', async () => {
    const removed: string[] = [];
    const trash = new Trash({ remove: async id => { removed.push(id); } });
    trash.put(project('a'));
    trash.put(project('b'));
    expect(trash.has('a')).toBe(true);
    vi.advanceTimersByTime(29_000);
    expect(trash.restore('a')?.id).toBe('a');
    vi.advanceTimersByTime(1_500);
    expect(removed).toEqual(['b']);
    expect(trash.has('a')).toBe(false);
    vi.advanceTimersByTime(60_000);
    expect(removed).toEqual(['b']);
  });

  it('finishes pending deletions at once when flushed', async () => {
    const removed: string[] = [];
    const dismissed: string[] = [];
    const trash = new Trash({ remove: async id => { removed.push(id); } });
    trash.put(project('c'));
    trash.attach('c', () => dismissed.push('c'));
    await trash.flush();
    expect(removed).toEqual(['c']);
    expect(dismissed).toEqual(['c']);
  });

  it('ignores an undo for a previous deletion of the same work', () => {
    const trash = new Trash({ remove: async () => {} });
    const old = project('a');
    const latest = { ...old, updatedAt: old.updatedAt + 1 };
    trash.put(old);
    expect(trash.restore(old.id, old)).toBe(old);
    trash.put(latest);
    expect(trash.restore(old.id, old)).toBeUndefined();
    expect(trash.restore(latest.id, latest)).toBe(latest);
  });
});

describe('works', () => {
  it('duplicates with fresh ids and independent labels', () => {
    const original = project('x');
    const copy = duplicateProject(original, 99);
    expect(copy.id).not.toBe(original.id);
    expect(copy.pages[0].id).not.toBe(original.pages[0].id);
    expect(copy).toMatchObject({ title: 'Rio', author: 'Ana', audience: 'A turma', createdAt: 99, updatedAt: 99 });
    copy.pages[0].labels[0].text = 'mudou';
    expect(original.pages[0].labels[0].text).toBe('a');
  });

  it('fits imported pictures inside the page', () => {
    expect(fitRect(800, 600)).toEqual({ x: 0, y: 0, w: 1600, h: 1200 });
    expect(fitRect(100, 100)).toEqual({ x: 200, y: 0, w: 1200, h: 1200 });
    expect(fitRect(400, 100)).toEqual({ x: 0, y: 400, w: 1600, h: 400 });
  });
});

describe('voice and sound', () => {
  const voice = (lang: string, localService = true) => ({ lang, localService });

  it('prefers a European Portuguese voice, then Brazilian, never a remote one', () => {
    expect(chooseVoice([voice('pt-BR'), voice('pt-PT'), voice('en-GB')], 'pt')?.lang).toBe('pt-PT');
    expect(chooseVoice([voice('en-US'), voice('pt_BR')], 'pt')?.lang).toBe('pt_BR');
    expect(chooseVoice([voice('pt-PT', false), voice('en-US')], 'pt')).toBeUndefined();
    expect(chooseVoice([voice('pt-PT'), voice('en-US')], 'en')?.lang).toBe('en-US');
  });

  it('has a short, quiet recipe for every sound', () => {
    const ids: SoundId[] = ['tap', 'brush', 'erase', 'fill', 'stamp', 'shape', 'line', 'magic', 'undo', 'redo', 'page', 'save', 'oops'];
    const signatures = new Set<string>();
    for (const id of ids) {
      const recipe = recipes[id];
      expect(recipe.length).toBeGreaterThan(0);
      for (const part of recipe) {
        expect(part.level).toBeLessThanOrEqual(1);
        expect(part.at + part.length).toBeLessThanOrEqual(0.4);
        if (part.kind === 'tone') expect(Math.max(part.from, part.to)).toBeLessThanOrEqual(1200);
      }
      signatures.add(JSON.stringify(recipe));
    }
    expect(signatures.size).toBe(ids.length);
  });
});
