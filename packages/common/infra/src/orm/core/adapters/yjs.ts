import type { WorkspaceEngine } from '@toeverything/infra';
import type { Map as YMap, YMapEvent } from 'yjs';
import { Doc } from 'yjs';

import type { DBSchemaBuilder } from '../schema';
import type { Key, ORMAdapter } from './types';

/**
 * Yjs Adapter for AFFiNE ORM
 *
 * Structure:
 *
 * Each table is a YDoc instance
 *
 * Table(YDoc)
 *   Key(string): Row(YMap)({
 *     FieldA(string): Value(Primitive)
 *     FieldB(string): Value(Primitive)
 *     FieldC(string): Value(Primitive)
 *   })
 */
export class YjsORMAdapter implements ORMAdapter {
  pool: Map<string, Doc> = new Map();
  constructor(private readonly ws: WorkspaceEngine) {}

  private readonly deleteFlagKey = '$$DELETED';

  connect(db: DBSchemaBuilder): Promise<void> {
    Object.keys(db).forEach(tableName => {
      const doc = new Doc({
        guid: tableName,
      });

      this.ws.doc.addDoc(doc, false);
      this.pool.set(tableName, doc);
    });

    return Promise.resolve();
  }

  disconnect(_db: DBSchemaBuilder): Promise<void> {
    return Promise.resolve();
  }

  getTable(tableName: string) {
    const table = this.pool.get(tableName);
    if (!table) {
      throw new Error('Table not found');
    }

    return table;
  }

  async create(tableName: string, key: Key, data: any) {
    const record = this.getTable(tableName).getMap(key.toString());

    for (const key in data) {
      record.set(key, data[key]);
    }
  }

  async update(tableName: string, key: any, data: any) {
    const record = this.getTable(tableName).getMap(key.toString());

    if (this.isDeleted(record)) {
      return;
    }

    for (const key in data) {
      record.set(key, data[key]);
    }
  }

  async read(table: string, key: any) {
    const record = this.getTable(table).getMap(key.toString());

    if (this.isDeleted(record)) {
      return null;
    }

    return record.toJSON();
  }

  subscribe(table: string, key: any, callback: (data: any) => void) {
    const record: YMap<any> = this.getTable(table).getMap(key.toString());

    const ob = (event: YMapEvent<any>) => {
      callback(this.value(event.target));
    };
    callback(this.value(record));

    record.observe(ob);
    return () => record.unobserve(ob);
  }

  async delete(table: string, key: Key) {
    const record = this.getTable(table).getMap(key.toString());

    record.clear();
    record.set(this.deleteFlagKey, true);
  }

  isDeleted(record: YMap<any>) {
    return record.has(this.deleteFlagKey);
  }

  value(record: YMap<any>) {
    if (this.isDeleted(record) || !record.size) {
      return null;
    }

    return record.toJSON();
  }
}
