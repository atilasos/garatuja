import type { ProjectRecord } from './types';

export interface StoredStamp {
  id: string;
  picture: Blob;
  number: number;
}

interface StoredProject extends ProjectRecord {
  writeId?: string;
}

export interface Draft {
  id: string;
  project: ProjectRecord;
  pageId?: string;
  expectedAt?: number;
  copyTitle: string;
  previous?: string;
  time: number;
}

interface StoredDraft extends Draft {
  epoch?: string;
}

const epochKey = 'erase-epoch';

function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function complete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new DOMException('Storage transaction aborted', 'AbortError'));
  });
}

export class Storage {
  readonly changes = new BroadcastChannel('garatuja.storage');

  private constructor(private db: IDBDatabase, private readonly epoch?: string) {}

  static async open(): Promise<Storage> {
    const request = indexedDB.open('garatuja', 3);
    request.onupgradeneeded = event => {
      if (event.oldVersion < 1) {
        request.result.createObjectStore('projects', { keyPath: 'id' });
        request.result.createObjectStore('workspace');
      }
      if (event.oldVersion < 2) request.result.createObjectStore('stamps', { keyPath: 'id' });
      if (event.oldVersion < 3) request.result.createObjectStore('drafts', { keyPath: 'id' });
    };
    const db = await result(request);
    db.onversionchange = () => db.close();
    const epoch = await result<string | undefined>(db.transaction('workspace').objectStore('workspace').get(epochKey));
    return new Storage(db, epoch);
  }

  listStamps(): Promise<StoredStamp[]> {
    return result(this.db.transaction('stamps').objectStore('stamps').getAll());
  }

  saveStamp(stamp: StoredStamp): Promise<void> {
    return this.editStamps(store => { store.put(stamp); });
  }

  createStamp(id: string, picture: Blob): Promise<StoredStamp> {
    return this.editStamps(async (store, workspace) => {
      const existing = await result<StoredStamp | undefined>(store.get(id));
      if (existing) return existing;
      const last = await result<number | undefined>(workspace.get('last-stamp-number'));
      const number = (last ?? (await result<StoredStamp[]>(store.getAll()))
        .reduce((greatest, stamp) => Math.max(greatest, stamp.number), 0)) + 1;
      const stamp = { id, picture, number };
      store.add(stamp);
      workspace.put(number, 'last-stamp-number');
      return stamp;
    });
  }

  removeStamp(id: string): Promise<void> {
    return this.editStamps(async (store, workspace) => {
      const stamp = await result<StoredStamp | undefined>(store.get(id));
      if (!stamp) return;
      const last = await result<number | undefined>(workspace.get('last-stamp-number'));
      if ((last ?? 0) < stamp.number) workspace.put(stamp.number, 'last-stamp-number');
      store.delete(id);
    });
  }

  private async editStamps<T>(edit: (store: IDBObjectStore, workspace: IDBObjectStore) => T | Promise<T>): Promise<T> {
    const transaction = this.db.transaction(['stamps', 'workspace'], 'readwrite', { durability: 'strict' });
    const done = complete(transaction);
    try {
      await this.requireEpoch(transaction);
      const updated = await edit(transaction.objectStore('stamps'), transaction.objectStore('workspace'));
      await done;
      this.changes.postMessage({ kind: 'stamps' });
      return updated;
    } catch (error) {
      await this.abort(transaction, done);
      throw error;
    }
  }

  private async requireEpoch(transaction: IDBTransaction) {
    if (await result(transaction.objectStore('workspace').get(epochKey)) !== this.epoch) {
      throw new DOMException('Device data was cleared', 'AbortError');
    }
  }

  private async abort(transaction: IDBTransaction, done: Promise<void>) {
    try { transaction.abort(); } catch { /* The request may already have aborted it. */ }
    await done.catch(() => {});
  }

  list(): Promise<ProjectRecord[]> {
    return result(this.db.transaction('projects').objectStore('projects').getAll());
  }

  get(id: string): Promise<ProjectRecord | undefined> {
    return result(this.db.transaction('projects').objectStore('projects').get(id));
  }

  async recent(): Promise<{ project: ProjectRecord; pageId: string } | undefined> {
    const recent = await result<{ projectId: string; pageId: string } | undefined>(
      this.db.transaction('workspace').objectStore('workspace').get('recent'),
    );
    if (!recent) return;
    const project = await this.get(recent.projectId);
    if (project) return { project, pageId: recent.pageId };
    return undefined;
  }

  async remember(projectId: string, pageId: string) {
    const transaction = this.db.transaction('workspace', 'readwrite');
    const done = complete(transaction);
    try {
      await this.requireEpoch(transaction);
      transaction.objectStore('workspace').put({ projectId, pageId }, 'recent');
    } catch (error) {
      await this.abort(transaction, done);
      throw error;
    }
    await done;
  }

  async save(project: ProjectRecord): Promise<void> {
    await this.saveWorks([project]);
    this.changes.postMessage(project.id);
  }

  async stage(draft: Draft) {
    // Enqueue the whole draft synchronously. During pagehide there may be no
    // opportunity to run an IndexedDB read callback before the tab disappears.
    const transaction = this.db.transaction('drafts', 'readwrite', { durability: 'strict' });
    transaction.objectStore('drafts').put({ ...draft, epoch: this.epoch } satisfies StoredDraft);
    transaction.commit();
    await complete(transaction);
  }

  async recover() {
    const drafts = await result<StoredDraft[]>(this.db.transaction('drafts').objectStore('drafts').getAll());
    let copied = false;
    for (const draft of drafts.sort((a, b) => a.time - b.time)) {
      try {
        const restored = await this.write(draft, true);
        copied ||= Boolean(restored && restored.id !== draft.project.id);
      } catch (error) {
        // Leave the draft available on disk if storage is still full.
        console.error(error);
      }
    }
    return copied;
  }

  async write(draft: Draft): Promise<ProjectRecord>;
  async write(draft: Draft, recovery: true): Promise<ProjectRecord | undefined>;
  async write(draft: Draft, recovery = false) {
    const transaction = this.db.transaction(['projects', 'workspace', 'drafts'], 'readwrite', { durability: 'strict' });
    const done = complete(transaction);
    const projects = transaction.objectStore('projects');
    const drafts = transaction.objectStore('drafts');
    const { project, id, pageId, expectedAt, copyTitle, previous } = draft;
    const get = (key: string) => result<StoredProject | undefined>(projects.get(key));
    let saved: StoredProject | undefined;
    try {
      await this.requireEpoch(transaction);
      if (recovery) {
        const staged = await result<StoredDraft | undefined>(drafts.get(id));
        if (!staged || staged.epoch !== this.epoch) {
          if (staged) drafts.delete(id);
          await done;
          return;
        }
      }
      const current = await get(project.id);
      // A normal autosave may have finished after the exit draft was staged.
      const previousCopy = current?.writeId === id ? undefined : await get(id);
      saved = current?.writeId === id ? current
        : recovery || previousCopy?.writeId === id ? previousCopy : undefined;
      if (!saved) {
        const parent = previous ? current?.writeId === previous ? current : await get(previous) : undefined;
        const sameWriter = parent !== undefined && parent.writeId === previous;
        const base = sameWriter ? parent : current;
        const published = base?.updatedAt === expectedAt || sameWriter;
        const updatedAt = Math.max(Date.now(), (base?.updatedAt ?? 0) + 1);
        // An exit draft can already have been saved and edited by another tab.
        // Preserve that copy if its original writer returns from the page cache.
        const targetId = published ? base?.id ?? project.id : previousCopy ? crypto.randomUUID() : id;
        saved = { ...project, id: targetId, updatedAt, writeId: id,
          title: published && targetId === project.id ? project.title : copyTitle,
          createdAt: published ? base?.createdAt ?? project.createdAt : updatedAt };
        projects.put(saved);
        if (pageId !== undefined) transaction.objectStore('workspace').put({ projectId: saved.id, pageId }, 'recent');
      }
      drafts.delete(id);
    } catch (error) {
      await this.abort(transaction, done);
      throw error;
    }
    await done;
    this.changes.postMessage(saved.id);
    return saved;
  }

  async clear() {
    const transaction = this.db.transaction([...this.db.objectStoreNames], 'readwrite', { durability: 'strict' });
    const done = complete(transaction);
    try {
      await this.requireEpoch(transaction);
      for (const name of transaction.objectStoreNames) transaction.objectStore(name).clear();
      // A delayed write from a previous session must never re-create erased work.
      transaction.objectStore('workspace').put(crypto.randomUUID(), epochKey);
    } catch (error) {
      await this.abort(transaction, done);
      throw error;
    }
    await done;
    this.changes.postMessage(null);
  }

  async saveWorks(projects: readonly ProjectRecord[]): Promise<void> {
    const transaction = this.db.transaction(['projects', 'workspace'], 'readwrite', { durability: 'strict' });
    const done = complete(transaction);
    const store = transaction.objectStore('projects');
    try {
      await this.requireEpoch(transaction);
      for (const project of projects) store.add(project);
    } catch (error) {
      await this.abort(transaction, done);
      throw error;
    }
    await done;
  }

  async remove(id: string, expectedAt?: number): Promise<boolean> {
    const transaction = this.db.transaction(['projects', 'workspace'], 'readwrite');
    const done = complete(transaction);
    try {
      await this.requireEpoch(transaction);
      const projects = transaction.objectStore('projects');
      const project = await result<StoredProject | undefined>(projects.get(id));
      const unchanged = !project || expectedAt === undefined || project.updatedAt === expectedAt;
      if (unchanged && project) projects.delete(id);
      await done;
      if (unchanged && project) this.changes.postMessage(id);
      return unchanged;
    } catch (error) {
      await this.abort(transaction, done);
      throw error;
    }
  }
}
