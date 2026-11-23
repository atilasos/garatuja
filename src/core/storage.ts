import type { ProjectRecord } from './types';

export interface StoredStamp {
  id: string;
  picture: Blob;
  number: number;
}

function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class Storage {
  private constructor(private db: IDBDatabase) {}

  static async open(): Promise<Storage> {
    const request = indexedDB.open('garatuja', 2);
    request.onupgradeneeded = event => {
      if (event.oldVersion < 1) {
        request.result.createObjectStore('projects', { keyPath: 'id' });
        request.result.createObjectStore('workspace');
      }
      if (event.oldVersion < 2) request.result.createObjectStore('stamps', { keyPath: 'id' });
    };
    const db = await result(request);
    db.onversionchange = () => db.close();
    return new Storage(db);
  }

  listStamps(): Promise<StoredStamp[]> {
    return result(this.db.transaction('stamps').objectStore('stamps').getAll());
  }

  saveStamp(stamp: StoredStamp): Promise<void> {
    return this.editStamps(store => { store.put(stamp); });
  }

  removeStamp(id: string): Promise<void> {
    return this.editStamps(store => { store.delete(id); });
  }

  private editStamps(edit: (store: IDBObjectStore) => void): Promise<void> {
    const transaction = this.db.transaction('stamps', 'readwrite', { durability: 'strict' });
    edit(transaction.objectStore('stamps'));
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
    });
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

  save(project: ProjectRecord, pageId?: string): Promise<void> {
    const transaction = this.db.transaction(pageId === undefined ? ['projects'] : ['projects', 'workspace'], 'readwrite', { durability: 'strict' });
    transaction.objectStore('projects').put(project);
    if (pageId !== undefined) transaction.objectStore('workspace').put({ projectId: project.id, pageId }, 'recent');
    transaction.commit();
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
    });
  }

  remove(id: string): Promise<void> {
    const transaction = this.db.transaction('projects', 'readwrite');
    transaction.objectStore('projects').delete(id);
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
    });
  }
}
