import type { DBSchemaBuilder } from '../schema';

export interface Key {
  toString(): string;
}

export interface ORMAdapter {
  connect(db: DBSchemaBuilder): Promise<void>;
  disconnect(db: DBSchemaBuilder): Promise<void>;

  // CRUD
  create(tableName: string, key: Key, data: any): Promise<any>;
  read(tableName: string, key: Key): Promise<any>;
  subscribe(
    tableName: string,
    key: Key,
    callback: (data: any) => void
  ): () => void;
  update(tableName: string, key: Key, data: any): Promise<any>;
  delete(tableName: string, key: Key): Promise<void>;
}
