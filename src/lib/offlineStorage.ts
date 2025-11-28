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
  };
}

class OfflineStorageService {
  private db: IDBPDatabase<OfflineDB> | null = null;
  private dbName = 'lanka_ledger_offline';

  async initialize() {
    if (this.db) return this.db;
    
    this.db = await openDB<OfflineDB>(this.dbName, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('drafts')) {
          db.createObjectStore('drafts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id' });
        }
      },
    });
    
    return this.db;
  }

  async saveDraft(type: string, data: any, id?: string) {
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
    return await db.get('drafts', id);
  }

  async getAllDrafts(type?: string) {
    const db = await this.initialize();
    const allDrafts = await db.getAll('drafts');
    
    if (type) {
      return allDrafts.filter(draft => draft.type === type);
    }
    
    return allDrafts;
  }

  async deleteDraft(id: string) {
    const db = await this.initialize();
    await db.delete('drafts', id);
  }

  async addToSyncQueue(operation: 'create' | 'update' | 'delete', table: string, data: any) {
    const db = await this.initialize();
    const id = `${table}-${operation}-${Date.now()}`;
    
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
    return await db.getAll('syncQueue');
  }

  async removeSyncItem(id: string) {
    const db = await this.initialize();
    await db.delete('syncQueue', id);
  }

  async updateSyncRetry(id: string, retries: number) {
    const db = await this.initialize();
    const item = await db.get('syncQueue', id);
    if (item) {
      item.retries = retries;
      await db.put('syncQueue', item);
    }
  }

  async clearAll() {
    const db = await this.initialize();
    await db.clear('drafts');
    await db.clear('syncQueue');
  }
}

export const offlineStorage = new OfflineStorageService();
