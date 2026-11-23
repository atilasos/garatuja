import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readSettings } from '../../src/core/store';
import { clearPreferences, formatBytes } from '../../src/features/teacher/data';

class MemoryStorage {
  private items = new Map<string, string>();
  get length() { return this.items.size; }
  key(i: number) { return [...this.items.keys()][i] ?? null; }
  getItem(key: string) { return this.items.get(key) ?? null; }
  setItem(key: string, value: string) { this.items.set(key, value); }
  removeItem(key: string) { this.items.delete(key); }
}

describe('settings persistence', () => {
  let storage: MemoryStorage;
  beforeEach(() => {
    storage = new MemoryStorage();
    vi.stubGlobal('localStorage', storage);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('starts quiet, complete and in Portuguese', () => {
    expect(readSettings()).toMatchObject({ locale: 'pt', level: 2, sound: false, readAloud: false, className: '', allowImport: true, allowPrint: true });
  });

  it('reads back what the teacher and the child chose', () => {
    storage.setItem('garatuja.settings', JSON.stringify({
      locale: 'en', level: 1, sound: true, highContrast: true, leftHanded: true, className: '3.º B', fixedClick: true,
    }));
    expect(readSettings()).toMatchObject({ locale: 'en', level: 1, sound: true, highContrast: true, leftHanded: true, className: '3.º B', fixedClick: true });
  });

  it('ignores damaged or unexpected values', () => {
    storage.setItem('garatuja.settings', JSON.stringify({ locale: 'fr', level: 3, sound: 'yes', className: 42, evil: true }));
    const settings = readSettings();
    expect(settings).toMatchObject({ locale: 'pt', level: 2, sound: false, className: '' });
    expect(settings).not.toHaveProperty('evil');
    storage.setItem('garatuja.settings', '{oops');
    expect(readSettings().locale).toBe('pt');
  });

  it('clears only Garatuja preferences', () => {
    storage.setItem('garatuja.settings', '{}');
    storage.setItem('garatuja.editor', '{}');
    storage.setItem('other.app', 'keep');
    clearPreferences(storage);
    expect(storage.length).toBe(1);
    expect(storage.getItem('other.app')).toBe('keep');
  });

  it('formats storage use for people', () => {
    expect(formatBytes(512, 'pt')).toBe('512 B');
    expect(formatBytes(1536, 'pt')).toBe('1,5 KB');
    expect(formatBytes(5 * 1024 * 1024, 'en')).toBe('5 MB');
  });
});
