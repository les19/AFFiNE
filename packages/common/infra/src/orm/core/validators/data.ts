import { pick } from 'lodash-es';

import type { FieldType } from '../schema';
import type { Table } from '../table';

interface DataValidator {
  validate(table: Table<any>, data: any): void;
}

function typeMatches(typeWant: FieldType, val: any) {
  const typeGet =
    Array.isArray(val) || val.constructor === 'Object' || !val.constructor
      ? 'json'
      : typeof val;

  if (typeWant === 'json') {
    switch (typeGet) {
      case 'bigint':
      case 'function':
      case 'object': // we've already converted available types into 'json'
      case 'symbol':
      case 'undefined':
        return false;
    }
  }

  return typeWant === typeGet;
}

export const dataValidators = {
  PrimaryKeyShouldExist: {
    validate(table, data) {
      const val = data[table.keyField];

      if (val === undefined || val === null) {
        throw new Error(
          `[Table(${table.name})]: Primary key field '${table.keyField}' is required but not set.`
        );
      }
    },
  },
  PrimaryKeyShouldNotBeUpdated: {
    validate(table, data) {
      if (data[table.keyField] !== undefined) {
        throw new Error(
          `[Table(${table.name})]: Primary key field '${table.keyField}' can't be updated.`
        );
      }
    },
  },
  DataTypeShouldMatch: {
    validate(table, data) {
      for (const key in data) {
        const field = table.schema[key];
        if (!field) {
          throw new Error(
            `[Table(${table.name})]: Field '${key}' is not defined but set in entity.`
          );
        }

        const val = data[key];

        if (val === undefined) {
          continue;
        }

        if (!typeMatches(field.type, val)) {
          throw new Error(
            `[Table(${table.name})]: Field '${key}' type mismatch. Expected ${field.type}.`
          );
        }
      }
    },
  },
  DataTypeShouldExactMatch: {
    validate(table, data) {
      for (const key in data) {
        const field = table.schema[key];
        if (!field) {
          throw new Error(
            `[Table(${table.name})]: Field '${key}' is not defined but set in entity.`
          );
        }

        const val = data[key];

        if ((val === undefined || val === null) && !field.optional) {
          throw new Error(
            `[Table(${table.name})]: Field '${key}' is required but not set.`
          );
        }

        if (!typeMatches(field.type, val)) {
          throw new Error(
            `[Table(${table.name})]: Field '${key}' type mismatch. Expected ${field.type}.`
          );
        }
      }
    },
  },
} satisfies Record<string, DataValidator>;

export const createEntityDataValidators = pick(
  dataValidators,
  'PrimaryKeyShouldExist',
  'DataTypeShouldExactMatch'
);
export const updateEntityDataValidators = pick(
  dataValidators,
  'PrimaryKeyShouldNotBeUpdated',
  'DataTypeShouldMatch'
);
