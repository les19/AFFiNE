import type { ORMAdapter } from './adapters';
import type { DBSchemaBuilder } from './schema';
import {
  type CreateEntityInput,
  type Hook,
  Table,
  type TableMap,
} from './table';
import { validators } from './validators';

export class ORMClient {
  static hooksMap: Map<string, Hook<any>[]> = new Map();
  constructor(
    protected readonly db: DBSchemaBuilder,
    protected readonly adapter: ORMAdapter
  ) {
    Object.entries(db).forEach(([tableName, tableSchema]) => {
      // @ts-expect-error type allow
      this[tableName] = new Table(
        adapter,
        tableName,
        tableSchema,
        ORMClient.hooksMap.get(tableName)
      );
    });
  }

  static defineHook(tableName: string, _desc: string, hook: Hook<any>) {
    let hooks = this.hooksMap.get(tableName);
    if (!hooks) {
      hooks = [];
      this.hooksMap.set(tableName, hooks);
    }

    hooks.push(hook);
  }

  async connect() {
    await this.adapter.connect(this.db);
  }

  async disconnect() {
    await this.adapter.disconnect(this.db);
  }
}

export function createORMClientType<Schema extends DBSchemaBuilder>(
  db: Schema
) {
  Object.entries(db).forEach(([tableName, schema]) => {
    validators.validateTableSchema(tableName, schema);
  });

  class ORMClientWithTables extends ORMClient {
    constructor(adapter: ORMAdapter) {
      super(db, adapter);
    }
  }

  return ORMClientWithTables as {
    new (
      ...args: ConstructorParameters<typeof ORMClientWithTables>
    ): ORMClient & TableMap<Schema>;

    defineHook<TableName extends keyof Schema>(
      tableName: TableName,
      desc: string,
      hook: Hook<CreateEntityInput<Schema[TableName]>>
    ): void;
  };
}
