import type { Singer, Software } from './types';

const DB_NAME = 'svs-index';
const DB_VERSION = 1;

export type StoreName = 'singers' | 'softwares' | 'meta';

type MetaRecord = { key: string; value: unknown };

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('singers')) {
        db.createObjectStore('singers', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('softwares')) {
        db.createObjectStore('softwares', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
}

function tx<T = unknown>(
  db: IDBDatabase,
  stores: StoreName[],
  mode: IDBTransactionMode,
  run: (t: IDBTransaction) => void
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(stores, mode);
    t.oncomplete = () => resolve(undefined as unknown as T);
    t.onerror = () => reject(t.error);
    run(t);
  });
}

export async function clearStore(store: StoreName): Promise<void> {
  const db = await openDB();
  await tx<void>(db, [store], 'readwrite', (t) => {
    t.objectStore(store).clear();
  });
}

export async function putSingers(items: Singer[]): Promise<void> {
  const db = await openDB();
  await tx<void>(db, ['singers'], 'readwrite', (t) => {
    const s = t.objectStore('singers');
    for (const it of items) s.put(it);
  });
}

export async function putSoftwares(items: Software[]): Promise<void> {
  const db = await openDB();
  await tx<void>(db, ['softwares'], 'readwrite', (t) => {
    const s = t.objectStore('softwares');
    for (const it of items) s.put(it);
  });
}

export async function getAllSingers(): Promise<Singer[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(['singers'], 'readonly');
    const req = (t.objectStore('singers') as IDBObjectStore).getAll();
    req.onsuccess = () => resolve(req.result as Singer[]);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllSoftwares(): Promise<Software[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(['softwares'], 'readonly');
    const req = (t.objectStore('softwares') as IDBObjectStore).getAll();
    req.onsuccess = () => resolve(req.result as Software[]);
    req.onerror = () => reject(req.error);
  });
}

export async function getSingerById(id: string): Promise<Singer | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(['singers'], 'readonly');
    const req = (t.objectStore('singers') as IDBObjectStore).get(id);
    req.onsuccess = () => resolve(req.result as Singer | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function getSoftwareById(
  id: string
): Promise<Software | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(['softwares'], 'readonly');
    const req = (t.objectStore('softwares') as IDBObjectStore).get(id);
    req.onsuccess = () => resolve(req.result as Software | undefined);
    req.onerror = () => reject(req.error);
  });
}

// Meta helpers
export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await openDB();
  await tx<void>(db, ['meta'], 'readwrite', (t) => {
    (t.objectStore('meta') as IDBObjectStore).put({ key, value } as MetaRecord);
  });
}

export async function getMeta<T = unknown>(
  key: string
): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(['meta'], 'readonly');
    const req = (t.objectStore('meta') as IDBObjectStore).get(key);
    req.onsuccess = () => {
      const rec = req.result as MetaRecord | undefined;
      resolve(rec?.value as T | undefined);
    };
    req.onerror = () => reject(req.error);
  });
}
