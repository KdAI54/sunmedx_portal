import { env } from '../config/env';

export interface DocSnapshot<T = any> {
  id: string;
  exists: boolean;
  data: () => T;
}

export interface QuerySnapshot<T = any> {
  docs: DocSnapshot<T>[];
  size: number;
  empty: boolean;
  forEach: (callback: (doc: DocSnapshot<T>) => void) => void;
}

export interface DataAdapter {
  getDoc(collectionName: string, docId: string): Promise<DocSnapshot>;
  setDoc(collectionName: string, docId: string, val: any, options?: { merge?: boolean }): Promise<{ id: string }>;
  updateDoc(collectionName: string, docId: string, val: any): Promise<{ id: string }>;
  deleteDoc(collectionName: string, docId: string): Promise<void>;
  addDoc(collectionName: string, val: any): Promise<{ id: string }>;
  queryCollection(collectionName: string, filters: FilterAction[]): Promise<QuerySnapshot>;
  subscribeCollection(
    collectionName: string,
    filters: FilterAction[],
    callback: (snap: QuerySnapshot) => void,
    errorCallback?: (err: any) => void
  ): () => void;
  subscribeDoc(
    collectionName: string,
    docId: string,
    callback: (snap: DocSnapshot) => void,
    errorCallback?: (err: any) => void
  ): () => void;
}

export type FilterAction =
  | { type: 'where'; field: string; op: string; value: any }
  | { type: 'orderBy'; field: string; direction?: 'asc' | 'desc' }
  | { type: 'limit'; num: number };

const memoryStore: Record<string, string> = {};

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return memoryStore[key] || null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      memoryStore[key] = value;
    }
  },
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      delete memoryStore[key];
    }
  },
};

function notifyCollectionUpdate(collectionName: string) {
  try {
    window.dispatchEvent(new Event(`data_update_${collectionName}`));
  } catch {
    // Ignore non-browser environments
  }
}

function generateId(prefix = 'rec'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().slice(0, 12)}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 11)}`;
}

function applyFilters(records: any[], filters: FilterAction[]): any[] {
  let docs = [...records];
  for (const filter of filters) {
    if (filter.type === 'where') {
      const { field, op, value } = filter;
      docs = docs.filter((item) => {
        const current = item[field];
        switch (op) {
          case '==':
            return current === value;
          case '!=':
            return current !== value;
          case '<':
            return current < value;
          case '<=':
            return current <= value;
          case '>':
            return current > value;
          case '>=':
            return current >= value;
          case 'array-contains':
            return Array.isArray(current) && current.includes(value);
          case 'in':
            return Array.isArray(value) && value.includes(current);
          default:
            return true;
        }
      });
    } else if (filter.type === 'orderBy') {
      const { field, direction } = filter;
      docs.sort((a, b) => {
        const valA = a[field];
        const valB = b[field];
        if (valA === valB) return 0;
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        if (valA < valB) return direction === 'desc' ? 1 : -1;
        return direction === 'desc' ? -1 : 1;
      });
    } else if (filter.type === 'limit') {
      docs = docs.slice(0, filter.num);
    }
  }
  return docs;
}

function toQuerySnapshot(docsList: any[]): QuerySnapshot {
  const mapped: DocSnapshot[] = docsList.map((d) => ({
    id: d.id,
    exists: true,
    data: () => d,
  }));
  return {
    docs: mapped,
    forEach(callback: (doc: DocSnapshot) => void) {
      mapped.forEach(callback);
    },
    get size() {
      return mapped.length;
    },
    get empty() {
      return mapped.length === 0;
    },
  };
}

/**
 * Built-in browser persistence adapter (zero external dependencies).
 * Swap by setting VITE_DATA_SOURCE=rest or VITE_DATA_SOURCE=supabase.
 */
class LocalDataAdapter implements DataAdapter {
  private cache: Record<string, any[]> = {};

  private readCollection(name: string): any[] {
    if (!this.cache[name]) {
      const raw = safeStorage.getItem(`sunmedx_db_${name}`);
      try {
        this.cache[name] = raw ? JSON.parse(raw) : [];
      } catch {
        this.cache[name] = [];
      }
    }
    return this.cache[name];
  }

  private writeCollection(name: string, data: any[]) {
    this.cache[name] = data;
    safeStorage.setItem(`sunmedx_db_${name}`, JSON.stringify(data));
    setTimeout(() => notifyCollectionUpdate(name), 0);
  }

  async getDoc(collectionName: string, docId: string): Promise<DocSnapshot> {
    const items = this.readCollection(collectionName);
    const found = items.find((item) => item.id === docId) || null;
    return {
      id: docId,
      exists: Boolean(found),
      data: () => found,
    };
  }

  async setDoc(collectionName: string, docId: string, val: any, options?: { merge?: boolean }) {
    const items = [...this.readCollection(collectionName)];
    const idx = items.findIndex((item) => item.id === docId);
    const payload = { ...val, id: docId };

    if (idx >= 0) {
      items[idx] = options?.merge ? { ...items[idx], ...payload } : payload;
    } else {
      items.push(payload);
    }
    this.writeCollection(collectionName, items);
    return { id: docId };
  }

  async updateDoc(collectionName: string, docId: string, val: any) {
    const items = [...this.readCollection(collectionName)];
    const idx = items.findIndex((item) => item.id === docId);
    if (idx >= 0) {
      items[idx] = { ...items[idx], ...val };
      this.writeCollection(collectionName, items);
    }
    return { id: docId };
  }

  async deleteDoc(collectionName: string, docId: string) {
    const items = this.readCollection(collectionName).filter((item) => item.id !== docId);
    this.writeCollection(collectionName, items);
  }

  async addDoc(collectionName: string, val: any) {
    const items = [...this.readCollection(collectionName)];
    const id = val?.id || generateId();
    items.push({ ...val, id });
    this.writeCollection(collectionName, items);
    return { id };
  }

  async queryCollection(collectionName: string, filters: FilterAction[]): Promise<QuerySnapshot> {
    const items = this.readCollection(collectionName);
    return toQuerySnapshot(applyFilters(items, filters));
  }

  subscribeCollection(
    collectionName: string,
    filters: FilterAction[],
    callback: (snap: QuerySnapshot) => void,
    errorCallback?: (err: any) => void
  ) {
    const emit = () => {
      try {
        const items = this.readCollection(collectionName);
        callback(toQuerySnapshot(applyFilters(items, filters)));
      } catch (err) {
        errorCallback?.(err);
      }
    };

    emit();

    const onLocalUpdate = () => emit();
    const onStorageUpdate = (e: StorageEvent) => {
      if (e.key === `sunmedx_db_${collectionName}`) {
        delete this.cache[collectionName];
        emit();
      }
    };

    window.addEventListener(`data_update_${collectionName}`, onLocalUpdate);
    window.addEventListener('storage', onStorageUpdate);

    return () => {
      window.removeEventListener(`data_update_${collectionName}`, onLocalUpdate);
      window.removeEventListener('storage', onStorageUpdate);
    };
  }

  subscribeDoc(
    collectionName: string,
    docId: string,
    callback: (snap: DocSnapshot) => void,
    errorCallback?: (err: any) => void
  ) {
    const emit = () => {
      try {
        const items = this.readCollection(collectionName);
        const found = items.find((item) => item.id === docId) || null;
        callback({
          id: docId,
          exists: Boolean(found),
          data: () => found,
        });
      } catch (err) {
        errorCallback?.(err);
      }
    };

    emit();

    const onLocalUpdate = () => emit();
    const onStorageUpdate = (e: StorageEvent) => {
      if (e.key === `sunmedx_db_${collectionName}`) {
        delete this.cache[collectionName];
        emit();
      }
    };

    window.addEventListener(`data_update_${collectionName}`, onLocalUpdate);
    window.addEventListener('storage', onStorageUpdate);

    return () => {
      window.removeEventListener(`data_update_${collectionName}`, onLocalUpdate);
      window.removeEventListener('storage', onStorageUpdate);
    };
  }
}

/**
 * External REST API Adapter (Cloudflare Pages Functions + D1, or any custom REST backend).
 * Activate by setting VITE_DATA_SOURCE=rest and VITE_API_BASE_URL=/api (or full URL).
 */
class RestDataAdapter implements DataAdapter {
  constructor(private baseUrl: string) {}

  private async request(path: string, options?: RequestInit) {
    const token = safeStorage.getItem('sunmedx_auth_token');
    const cleanBase = this.baseUrl.replace(/\/$/, '');
    const res = await fetch(`${cleanBase}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options?.headers || {}),
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Request failed with status ${res.status}`);
    }
    return res.status === 204 ? null : res.json();
  }

  async getDoc(collectionName: string, docId: string): Promise<DocSnapshot> {
    try {
      const data = await this.request(`/collections/${collectionName}/${docId}`);
      return { id: docId, exists: Boolean(data), data: () => data };
    } catch {
      return { id: docId, exists: false, data: () => null };
    }
  }

  async setDoc(collectionName: string, docId: string, val: any, options?: { merge?: boolean }) {
    await this.request(`/collections/${collectionName}/${docId}`, {
      method: 'PUT',
      body: JSON.stringify({ data: val, merge: Boolean(options?.merge) }),
    });
    notifyCollectionUpdate(collectionName);
    return { id: docId };
  }

  async updateDoc(collectionName: string, docId: string, val: any) {
    await this.request(`/collections/${collectionName}/${docId}`, {
      method: 'PATCH',
      body: JSON.stringify(val),
    });
    notifyCollectionUpdate(collectionName);
    return { id: docId };
  }

  async deleteDoc(collectionName: string, docId: string) {
    await this.request(`/collections/${collectionName}/${docId}`, { method: 'DELETE' });
    notifyCollectionUpdate(collectionName);
  }

  async addDoc(collectionName: string, val: any) {
    const res = await this.request(`/collections/${collectionName}`, {
      method: 'POST',
      body: JSON.stringify(val),
    });
    notifyCollectionUpdate(collectionName);
    return { id: res?.id || generateId() };
  }

  async queryCollection(collectionName: string, filters: FilterAction[]): Promise<QuerySnapshot> {
    const records = await this.request(`/collections/${collectionName}`);
    const list = Array.isArray(records) ? records : [];
    return toQuerySnapshot(applyFilters(list, filters));
  }

  subscribeCollection(
    collectionName: string,
    filters: FilterAction[],
    callback: (snap: QuerySnapshot) => void,
    errorCallback?: (err: any) => void
  ) {
    const load = () => {
      this.queryCollection(collectionName, filters).then(callback).catch(errorCallback);
    };
    load();
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 15000);
    window.addEventListener(`data_update_${collectionName}`, load);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(`data_update_${collectionName}`, load);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }

  subscribeDoc(
    collectionName: string,
    docId: string,
    callback: (snap: DocSnapshot) => void,
    errorCallback?: (err: any) => void
  ) {
    const load = () => {
      this.getDoc(collectionName, docId).then(callback).catch(errorCallback);
    };
    load();
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 15000);
    window.addEventListener(`data_update_${collectionName}`, load);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(`data_update_${collectionName}`, load);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }
}

/**
 * Supabase PostgREST Adapter using a shared `documents(collection, id, data)` table.
 * Activate by setting VITE_DATA_SOURCE=supabase, VITE_SUPABASE_URL, and VITE_SUPABASE_ANON_KEY.
 */
class SupabaseDataAdapter implements DataAdapter {
  constructor(private url: string, private anonKey: string) {}

  private get restBase() {
    return `${this.url.replace(/\/$/, '')}/rest/v1/documents`;
  }

  private headers(extra?: Record<string, string>) {
    const token = safeStorage.getItem('sunmedx_auth_token');
    return {
      'Content-Type': 'application/json',
      apikey: this.anonKey,
      Authorization: `Bearer ${token || this.anonKey}`,
      ...extra,
    };
  }

  async getDoc(collectionName: string, docId: string): Promise<DocSnapshot> {
    const res = await fetch(
      `${this.restBase}?collection=eq.${encodeURIComponent(collectionName)}&id=eq.${encodeURIComponent(docId)}&select=id,data`,
      { headers: this.headers() }
    );
    if (!res.ok) return { id: docId, exists: false, data: () => null };
    const rows = (await res.json()) as Array<{ id: string; data: any }>;
    const row = rows[0];
    return {
      id: docId,
      exists: Boolean(row),
      data: () => (row ? { ...row.data, id: row.id } : null),
    };
  }

  async setDoc(collectionName: string, docId: string, val: any, options?: { merge?: boolean }) {
    let payload = { ...val, id: docId };
    if (options?.merge) {
      const existing = await this.getDoc(collectionName, docId);
      if (existing.exists) {
        payload = { ...existing.data(), ...payload };
      }
    }
    const res = await fetch(`${this.restBase}`, {
      method: 'POST',
      headers: this.headers({ Prefer: 'resolution=merge-duplicates' }),
      body: JSON.stringify({
        collection: collectionName,
        id: docId,
        data: payload,
        updated_at: new Date().toISOString(),
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    notifyCollectionUpdate(collectionName);
    return { id: docId };
  }

  async updateDoc(collectionName: string, docId: string, val: any) {
    return this.setDoc(collectionName, docId, val, { merge: true });
  }

  async deleteDoc(collectionName: string, docId: string) {
    const res = await fetch(
      `${this.restBase}?collection=eq.${encodeURIComponent(collectionName)}&id=eq.${encodeURIComponent(docId)}`,
      { method: 'DELETE', headers: this.headers() }
    );
    if (!res.ok) throw new Error(await res.text());
    notifyCollectionUpdate(collectionName);
  }

  async addDoc(collectionName: string, val: any) {
    const id = val?.id || generateId();
    await this.setDoc(collectionName, id, val);
    return { id };
  }

  async queryCollection(collectionName: string, filters: FilterAction[]): Promise<QuerySnapshot> {
    const res = await fetch(
      `${this.restBase}?collection=eq.${encodeURIComponent(collectionName)}&select=id,data`,
      { headers: this.headers() }
    );
    if (!res.ok) throw new Error(await res.text());
    const rows = (await res.json()) as Array<{ id: string; data: any }>;
    const list = rows.map((r) => ({ ...r.data, id: r.id }));
    return toQuerySnapshot(applyFilters(list, filters));
  }

  subscribeCollection(
    collectionName: string,
    filters: FilterAction[],
    callback: (snap: QuerySnapshot) => void,
    errorCallback?: (err: any) => void
  ) {
    const load = () => {
      this.queryCollection(collectionName, filters).then(callback).catch(errorCallback);
    };
    load();
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 15000);
    window.addEventListener(`data_update_${collectionName}`, load);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(`data_update_${collectionName}`, load);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }

  subscribeDoc(
    collectionName: string,
    docId: string,
    callback: (snap: DocSnapshot) => void,
    errorCallback?: (err: any) => void
  ) {
    const load = () => {
      this.getDoc(collectionName, docId).then(callback).catch(errorCallback);
    };
    load();
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 15000);
    window.addEventListener(`data_update_${collectionName}`, load);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(`data_update_${collectionName}`, load);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }
}

class QueryHandle {
  constructor(
    private adapter: DataAdapter,
    private collectionName: string,
    private filters: FilterAction[] = []
  ) {}

  where(field: string, op: string, value: any) {
    return new QueryHandle(this.adapter, this.collectionName, [
      ...this.filters,
      { type: 'where', field, op, value },
    ]);
  }

  orderBy(field: string, direction?: 'asc' | 'desc') {
    return new QueryHandle(this.adapter, this.collectionName, [
      ...this.filters,
      { type: 'orderBy', field, direction },
    ]);
  }

  limit(num: number) {
    return new QueryHandle(this.adapter, this.collectionName, [
      ...this.filters,
      { type: 'limit', num },
    ]);
  }

  get() {
    return this.adapter.queryCollection(this.collectionName, this.filters);
  }

  onSnapshot(callback: (snap: QuerySnapshot) => void, errorCallback?: (err: any) => void) {
    return this.adapter.subscribeCollection(this.collectionName, this.filters, callback, errorCallback);
  }
}

class DocHandle {
  constructor(
    private adapter: DataAdapter,
    private collectionName: string,
    private docId: string
  ) {}

  get() {
    return this.adapter.getDoc(this.collectionName, this.docId);
  }

  set(val: any, options?: { merge?: boolean }) {
    return this.adapter.setDoc(this.collectionName, this.docId, val, options);
  }

  update(val: any) {
    return this.adapter.updateDoc(this.collectionName, this.docId, val);
  }

  delete() {
    return this.adapter.deleteDoc(this.collectionName, this.docId);
  }

  onSnapshot(callback: (snap: DocSnapshot) => void, errorCallback?: (err: any) => void) {
    return this.adapter.subscribeDoc(this.collectionName, this.docId, callback, errorCallback);
  }
}

class CollectionHandle {
  constructor(
    private adapter: DataAdapter,
    private collectionName: string
  ) {}

  doc(docId?: string) {
    return new DocHandle(this.adapter, this.collectionName, docId || generateId());
  }

  add(val: any) {
    return this.adapter.addDoc(this.collectionName, val);
  }

  where(field: string, op: string, value: any) {
    return new QueryHandle(this.adapter, this.collectionName, [{ type: 'where', field, op, value }]);
  }

  orderBy(field: string, direction?: 'asc' | 'desc') {
    return new QueryHandle(this.adapter, this.collectionName, [{ type: 'orderBy', field, direction }]);
  }

  limit(num: number) {
    return new QueryHandle(this.adapter, this.collectionName, [{ type: 'limit', num }]);
  }

  get() {
    return this.adapter.queryCollection(this.collectionName, []);
  }

  onSnapshot(callback: (snap: QuerySnapshot) => void, errorCallback?: (err: any) => void) {
    return this.adapter.subscribeCollection(this.collectionName, [], callback, errorCallback);
  }
}

function createInitialAdapter(): DataAdapter {
  if (env.dataSource === 'supabase' && env.supabaseUrl && env.supabaseAnonKey) {
    return new SupabaseDataAdapter(env.supabaseUrl, env.supabaseAnonKey);
  }
  if (env.dataSource === 'rest') {
    return new RestDataAdapter(env.apiBaseUrl || '/api');
  }
  return new LocalDataAdapter();
}

let activeAdapter: DataAdapter = createInitialAdapter();

/**
 * Plug in any custom DataAdapter at runtime.
 */
export function registerDataAdapter(adapter: DataAdapter) {
  activeAdapter = adapter;
}

export function getDb() {
  return {
    collection: (name: string) => new CollectionHandle(activeAdapter, name),
  };
}
