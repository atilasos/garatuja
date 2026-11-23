/**
 * Deferred deletion: a deleted work stays in storage for 30 seconds and can be
 * brought back with "Anular". Only then is it removed for good. If the page is
 * closed first, the deletion is completed so it matches what the child chose.
 */
import type { ProjectRecord, L10n } from '../../core/types';

export const UNDO_MS = 30_000;
const markerPrefix = 'garatuja.trash.';

export const deleteFailure = (changed: boolean): L10n => changed
  ? { pt: 'Outro separador guardou alterações. O trabalho continua na galeria.', en: 'Another tab saved changes. The work is still in the gallery.' }
  : { pt: 'Não consegui apagar. O trabalho continua na galeria.', en: 'I couldn’t delete it. The work is still in the gallery.' };

interface Pending {
  project: ProjectRecord;
  timer: number;
  marker: string;
  committing?: boolean;
  dismiss?: () => void;
}

export class Trash {
  onFailure?: (changed: boolean) => void;
  private pending = new Map<string, Pending>();
  private listeners = new Set<() => void>();

  constructor(private storage: { remove(id: string, expectedAt: number): Promise<boolean | void> }, private delay = UNDO_MS,
    private failed: (changed: boolean) => void = () => {}) {
    window.addEventListener('pagehide', () => this.flush());
    window.addEventListener('storage', event => {
      if (event.key === null || event.key.startsWith(markerPrefix)) this.changed();
    });
  }

  has(id: string) {
    if (this.pending.has(id)) return true;
    try {
      const expires = localStorage.getItem(markerPrefix + id)?.split(':')[0];
      return expires !== undefined && Number(expires) > Date.now();
    } catch {
      return false;
    }
  }
  list() { return [...this.pending.values()].filter(entry => !entry.committing).map(entry => entry.project); }

  onChange(listener: () => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  /** Hide a work now and delete it after the undo period. */
  put(project: ProjectRecord) {
    if (this.pending.get(project.id)?.committing) return;
    this.restore(project.id);
    const timer = window.setTimeout(() => void this.commit(project.id), this.delay);
    const marker = `${Date.now() + this.delay}:${crypto.randomUUID()}`;
    try { localStorage.setItem(markerPrefix + project.id, marker); } catch { /* Undo stays available in this tab. */ }
    this.pending.set(project.id, { project, timer, marker });
    this.changed();
  }

  /** Attach a way to hide the "Anular" message when the period ends. */
  attach(id: string, dismiss: () => void) {
    const entry = this.pending.get(id);
    if (entry) entry.dismiss = dismiss;
  }

  restore(id: string) {
    const entry = this.pending.get(id);
    if (!entry || entry.committing) return undefined;
    window.clearTimeout(entry.timer);
    entry.dismiss?.();
    this.pending.delete(id);
    this.clearMarker(id, entry);
    this.changed();
    return entry.project;
  }

  async commit(id: string) {
    const entry = this.pending.get(id);
    if (!entry || entry.committing) return;
    entry.committing = true;
    window.clearTimeout(entry.timer);
    entry.dismiss?.();
    this.changed();
    try {
      if (await this.storage.remove(id, entry.project.updatedAt) === false) (this.onFailure ?? this.failed)(true);
    } catch {
      (this.onFailure ?? this.failed)(false);
    } finally {
      this.pending.delete(id);
      this.clearMarker(id, entry);
      this.changed();
    }
  }

  /** Delete every pending work now (page closing, or "apagar tudo"). */
  flush() {
    return Promise.all([...this.pending.keys()].map(id => this.commit(id)));
  }

  discard() {
    for (const id of this.pending.keys()) this.restore(id);
  }

  private clearMarker(id: string, entry: Pending) {
    try {
      const key = markerPrefix + id;
      if (localStorage.getItem(key) === entry.marker) localStorage.removeItem(key);
    } catch { /* The marker expires automatically. */ }
  }

  private changed() { for (const listener of this.listeners) listener(); }
}
