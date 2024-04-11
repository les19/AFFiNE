import { isUndefined, omitBy } from 'lodash-es';
import { map, Observable, shareReplay } from 'rxjs';

import type { Key, ORMAdapter } from './adapters';
import type {
  DBSchemaBuilder,
  FieldSchemaBuilder,
  TableSchema,
  TableSchemaBuilder,
} from './schema';
import { validators } from './validators';

export interface Hook<T> {
  deserialize(dbVal: T): T;
}

type Pretty<T> = T extends any
  ? {
      -readonly [P in keyof T]: T[P];
    }
  : never;

type RequiredFields<T extends TableSchemaBuilder> = {
  [K in keyof T as T[K] extends FieldSchemaBuilder<any, infer Optional>
    ? Optional extends false
      ? K
      : never
    : never]: T[K] extends FieldSchemaBuilder<infer Type> ? Type : never;
};

type OptionalFields<T extends TableSchemaBuilder> = {
  [K in keyof T as T[K] extends FieldSchemaBuilder<any, infer Optional>
    ? Optional extends true
      ? K
      : never
    : never]?: T[K] extends FieldSchemaBuilder<infer Type> ? Type : never;
};

type PrimaryKeyField<T extends TableSchemaBuilder> = {
  [K in keyof T]: T[K] extends FieldSchemaBuilder<any, any, infer PrimaryKey>
    ? PrimaryKey extends true
      ? K
      : never
    : never;
}[keyof T];

export type NonPrimaryKeyFields<T extends TableSchemaBuilder> = {
  [K in keyof T]: T[K] extends FieldSchemaBuilder<any, any, infer PrimaryKey>
    ? PrimaryKey extends false
      ? K
      : never
    : never;
}[keyof T];

export type PrimaryKeyFieldType<T extends TableSchemaBuilder> =
  T[PrimaryKeyField<T>] extends FieldSchemaBuilder<infer Type>
    ? Type extends Key
      ? Type
      : never
    : never;

export type CreateEntityInput<T extends TableSchemaBuilder> = Pretty<
  RequiredFields<T> & OptionalFields<T>
>;

// @TODO(@forehalo): return value need to be specified with `Default` inference
export type Entity<T extends TableSchemaBuilder> = Pretty<
  CreateEntityInput<T> & {
    [key in PrimaryKeyField<T>]: PrimaryKeyFieldType<T>;
  }
>;

export type UpdateEntityInput<T extends TableSchemaBuilder> = Pretty<{
  [key in NonPrimaryKeyFields<T>]?: T[key] extends FieldSchemaBuilder<
    infer Type
  >
    ? Type
    : never;
}>;

export class Table<T extends TableSchemaBuilder> {
  readonly schema: TableSchema;
  readonly keyField: string = '';

  private readonly subscribedKeys: Map<Key, Observable<Entity<T>>> = new Map();

  private readonly applyHooks = (data: Entity<T>): Entity<T> => {
    return this.hooks.reduce((acc, hook) => hook.deserialize(acc), data);
  };

  constructor(
    private readonly adapter: ORMAdapter,
    public readonly name: string,
    private readonly schemaBuilder: T,
    private readonly hooks: Hook<Entity<T>>[] = []
  ) {
    this.schema = Object.entries(this.schemaBuilder).reduce(
      (acc, [fieldName, fieldBuilder]) => {
        acc[fieldName] = fieldBuilder.schema;
        if (fieldBuilder.schema.isPrimaryKey) {
          // @ts-expect-error still in constructor
          this.keyField = fieldName;
        }
        return acc;
      },
      {} as TableSchema
    );
  }

  async create(input: CreateEntityInput<T>): Promise<Entity<T>> {
    const data = Object.entries(this.schema).reduce(
      (acc, [key, schema]) => {
        const inputVal = acc[key];

        if (inputVal === undefined) {
          if (schema.optional) {
            acc[key] = null;
          }

          if (schema.default) {
            acc[key] = schema.default() ?? null;
          }
        }

        return acc;
      },
      omitBy(input, isUndefined) as any
    );

    validators.validateCreateEntityData(this, data);

    return this.adapter
      .create(this.name, data[this.keyField], data)
      .then(this.applyHooks);
  }

  async update(
    key: PrimaryKeyFieldType<T>,
    input: UpdateEntityInput<T>
  ): Promise<Entity<T>> {
    validators.validateUpdateEntityData(this, input);
    return this.adapter
      .update(this.name, key, omitBy(input, isUndefined))
      .then(this.applyHooks);
  }

  async get(key: PrimaryKeyFieldType<T>): Promise<Entity<T>> {
    return this.adapter.read(this.name, key).then(this.applyHooks);
  }

  get$(key: PrimaryKeyFieldType<T>): Observable<Entity<T>> {
    let ob$ = this.subscribedKeys.get(key);

    if (!ob$) {
      ob$ = new Observable<Entity<T>>(subscriber => {
        const unsubscribe = this.adapter.subscribe(this.name, key, data => {
          subscriber.next(data);
        });

        return () => {
          unsubscribe();
          this.subscribedKeys.delete(key);
        };
      }).pipe(shareReplay(1), map(this.applyHooks));

      this.subscribedKeys.set(key, ob$);
    }

    return ob$;
  }

  delete(key: PrimaryKeyFieldType<T>) {
    return this.adapter.delete(this.name, key);
  }
}

export type TableMap<Tables extends DBSchemaBuilder> = {
  readonly [K in keyof Tables]: Table<Tables[K]>;
};
