import { merge } from 'lodash-es';

import type { DBSchemaBuilder } from '../schema';
import type { Key, ORMAdapter } from './types';

export class MemoryORMAdapter implements ORMAdapter {
  data = new Map<string, Map<string, any>>();
  subscriptions = new Map<string, Array<(data: any) => void>>();

  connect(_db: DBSchemaBuilder): Promise<void> {
    return Promise.resolve();
  }

  disconnect(_db: DBSchemaBuilder): Promise<void> {
    return Promise.resolve();
  }

  create(tableName: string, key: Key, data: any): Promise<any> {
    const recordMap = this.table(tableName);

    if (recordMap.has(key.toString())) {
      throw new Error(
        `Record with key ${key} already exists in table ${tableName}`
      );
    }

    recordMap.set(key.toString(), data);
    this.dispatch(tableName, key.toString(), data);
    return Promise.resolve(data);
  }

  read(tableName: string, key: Key): Promise<any> {
    const recordMap = this.table(tableName);

    return Promise.resolve(recordMap.get(key.toString()) || null);
  }

  subscribe(
    tableName: string,
    key: Key,
    callback: (data: any) => void
  ): () => void {
    const sKey = `${tableName}:${key.toString()}`;
    let subs = this.subscriptions.get(sKey);

    if (!subs) {
      subs = [];
      this.subscriptions.set(sKey, subs);
    }

    subs.push(callback);

    return () => {
      this.subscriptions.set(
        sKey,
        subs.filter(s => s !== callback)
      );
    };
  }

  update(tableName: string, key: Key, data: any): Promise<any> {
    const recordMap = this.table(tableName);
    key = key.toString();

    let record = recordMap.get(key.toString());

    if (!record) {
      throw new Error(
        `Record with key ${key} does not exist in table ${tableName}`
      );
    }

    record = merge({}, record, data);
    recordMap.set(key.toString(), record);
    this.dispatch(tableName, key.toString(), record);
    return Promise.resolve(record);
  }

  delete(tableName: string, key: Key): Promise<void> {
    const recordMap = this.table(tableName);
    recordMap.delete(key.toString());
    this.dispatch(tableName, key.toString(), null);
    return Promise.resolve();
  }

  table(tableName: string) {
    let recordMap = this.data.get(tableName);
    if (!recordMap) {
      recordMap = new Map();
      this.data.set(tableName, recordMap);
    }

    return recordMap;
  }

  dispatch(tableName: string, key: string, record: any) {
    this.subscriptions
      .get(`${tableName}:${key}`)
      ?.forEach(callback => callback(record));
  }
}
