/**
 * Deferred deletion: a deleted work stays in storage for 30 seconds and can be
 * brought back with "Anular". Only then is it removed for good. If the page is
 * closed first, the deletion is completed so it matches what the child chose.
 */
import type { Storage } from '../../core/storage';
import type { ProjectRecord } from '../../core/types';

export const UNDO_MS = 30_000;

interface Pending {
  project: ProjectRecord;
  timer: number;
  dismiss?: () => void;
}

export class Trash {
  private pending = new Map<string, Pending>();
  private listeners = new Set<() => void>();

  constructor(private storage: Pick<Storage, 'remove'>, private delay = UNDO_MS) {
    window.addEventListener('pagehide', () => this.flush());
  }

  has(id: string) { return this.pending.has(id); }
  list() { return [...this.pending.values()].map(entry => entry.project); }

  onChange(listener: () => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  /** Hide a work now and delete it after the undo period. */
  put(project: ProjectRecord) {
    this.restore(project.id);
    const timer = window.setTimeout(() => void this.commit(project.id), this.delay);
    this.pending.set(project.id, { project, timer });
    this.changed();
  }

  /** Attach a way to hide the "Anular" message when the period ends. */
  attach(id: string, dismiss: () => void) {
    const entry = this.pending.get(id);
    if (entry) entry.dismiss = dismiss;
  }

  restore(id: string) {
    const entry = this.pending.get(id);
    if (!entry) return undefined;
    window.clearTimeout(entry.timer);
    entry.dismiss?.();
    this.pending.delete(id);
    this.changed();
    return entry.project;
  }

  async commit(id: string) {
    const entry = this.pending.get(id);
    if (!entry) return;
    window.clearTimeout(entry.timer);
    entry.dismiss?.();
    this.pending.delete(id);
    this.changed();
    await this.storage.remove(id);
  }

  /** Delete every pending work now (page closing, or "apagar tudo"). */
  flush() {
    return Promise.all([...this.pending.keys()].map(id => this.commit(id)));
  }

  discard() {
    for (const id of this.pending.keys()) this.restore(id);
  }

  private changed() { for (const listener of this.listeners) listener(); }
}
