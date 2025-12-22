import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OfflineDB extends DBSchema {
  drafts: {
    key: string;
    value: {
      id: string;
      type: string;
      data: any;
      timestamp: number;
      synced: boolean;
    };
    indexes: { 'by-type': string; 'by-timestamp': number };
  };
  syncQueue: {
    key: string;
    value: {
      id: string;
      operation: 'create' | 'update' | 'delete';
      table: string;
      data: any;
      timestamp: number;
      retries: number;
    };
    indexes: { 'by-timestamp': number };
  };
  cache: {
    key: string;
    value: {
      key: string;
      data: any;
      timestamp: number;
      expiresAt: number;
    };
    indexes: { 'by-expires': number };
  };
}

class OfflineStorageService {
  private db: IDBPDatabase<OfflineDB> | null = null;
  private dbName = 'lanka_ledger_offline';
  private dbVersion = 2;
  private initPromise: Promise<IDBPDatabase<OfflineDB>> | null = null;

  async initialize(): Promise<IDBPDatabase<OfflineDB>> {
    if (this.db) return this.db;
    
    // Prevent multiple concurrent initializations
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = openDB<OfflineDB>(this.dbName, this.dbVersion, {
      upgrade(db, oldVersion) {
        // Drafts store
        if (!db.objectStoreNames.contains('drafts')) {
          const draftsStore = db.createObjectStore('drafts', { keyPath: 'id' });
          draftsStore.createIndex('by-type', 'type');
          draftsStore.createIndex('by-timestamp', 'timestamp');
        }
        
        // Sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('by-timestamp', 'timestamp');
        }
        
        // Cache store (new in v2)
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
          cacheStore.createIndex('by-expires', 'expiresAt');
        }
      },
    });
    
    this.db = await this.initPromise;
    
    // Clean expired cache entries on init
    this.cleanExpiredCache();
    
    return this.db;
  }

  // ===== DRAFT OPERATIONS =====
  async saveDraft(type: string, data: any, id?: string): Promise<string> {
    const db = await this.initialize();
    const draftId = id || `${type}-${Date.now()}`;
    
    await db.put('drafts', {
      id: draftId,
      type,
      data,
      timestamp: Date.now(),
      synced: false,
    });
    
    return draftId;
  }

  async getDraft(id: string) {
    const db = await this.initialize();
    return db.get('drafts', id);
  }

  async getAllDrafts(type?: string) {
    const db = await this.initialize();
    
    if (type) {
      return db.getAllFromIndex('drafts', 'by-type', type);
    }
    
    return db.getAll('drafts');
  }

  async deleteDraft(id: string): Promise<void> {
    const db = await this.initialize();
    await db.delete('drafts', id);
  }

  async clearDraftsByType(type: string): Promise<void> {
    const db = await this.initialize();
    const drafts = await db.getAllFromIndex('drafts', 'by-type', type);
    const tx = db.transaction('drafts', 'readwrite');
    await Promise.all(drafts.map(d => tx.store.delete(d.id)));
    await tx.done;
  }

  // ===== SYNC QUEUE OPERATIONS =====
  async addToSyncQueue(operation: 'create' | 'update' | 'delete', table: string, data: any): Promise<string> {
    const db = await this.initialize();
    const id = `${table}-${operation}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    await db.put('syncQueue', {
      id,
      operation,
      table,
      data,
      timestamp: Date.now(),
      retries: 0,
    });
    
    return id;
  }

  async getSyncQueue() {
    const db = await this.initialize();
    return db.getAllFromIndex('syncQueue', 'by-timestamp');
  }

  async getSyncQueueCount(): Promise<number> {
    const db = await this.initialize();
    return db.count('syncQueue');
  }

  async removeSyncItem(id: string): Promise<void> {
    const db = await this.initialize();
    await db.delete('syncQueue', id);
  }

  async updateSyncRetry(id: string, retries: number): Promise<void> {
    const db = await this.initialize();
    const item = await db.get('syncQueue', id);
    if (item) {
      item.retries = retries;
      await db.put('syncQueue', item);
    }
  }

  async clearFailedSyncItems(maxRetries: number = 5): Promise<number> {
    const db = await this.initialize();
    const items = await db.getAll('syncQueue');
    const failedItems = items.filter(item => item.retries >= maxRetries);
    const tx = db.transaction('syncQueue', 'readwrite');
    await Promise.all(failedItems.map(item => tx.store.delete(item.id)));
    await tx.done;
    return failedItems.length;
  }

  // ===== CACHE OPERATIONS =====
  async setCache(key: string, data: any, ttlMs: number = 5 * 60 * 1000): Promise<void> {
    const db = await this.initialize();
    const now = Date.now();
    
    await db.put('cache', {
      key,
      data,
      timestamp: now,
      expiresAt: now + ttlMs,
    });
  }

  async getCache<T = any>(key: string): Promise<T | null> {
    const db = await this.initialize();
    const item = await db.get('cache', key);
    
    if (!item) return null;
    
    // Check if expired
    if (Date.now() > item.expiresAt) {
      await db.delete('cache', key);
      return null;
    }
    
    return item.data as T;
  }

  async deleteCache(key: string): Promise<void> {
    const db = await this.initialize();
    await db.delete('cache', key);
  }

  async cleanExpiredCache(): Promise<number> {
    try {
      const db = await this.initialize();
      const now = Date.now();
      const allCache = await db.getAll('cache');
      const expired = allCache.filter(item => item.expiresAt < now);
      
      if (expired.length > 0) {
        const tx = db.transaction('cache', 'readwrite');
        await Promise.all(expired.map(item => tx.store.delete(item.key)));
        await tx.done;
      }
      
      return expired.length;
    } catch {
      return 0;
    }
  }

  // ===== UTILITY OPERATIONS =====
  async clearAll(): Promise<void> {
    const db = await this.initialize();
    await Promise.all([
      db.clear('drafts'),
      db.clear('syncQueue'),
      db.clear('cache'),
    ]);
  }

  async getStorageStats(): Promise<{ drafts: number; syncQueue: number; cache: number }> {
    const db = await this.initialize();
    const [drafts, syncQueue, cache] = await Promise.all([
      db.count('drafts'),
      db.count('syncQueue'),
      db.count('cache'),
    ]);
    return { drafts, syncQueue, cache };
  }
}

export const offlineStorage = new OfflineStorageService();
