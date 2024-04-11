import type { TableSchemaBuilder } from '../schema';
import type { Table } from '../table';
import { createEntityDataValidators, updateEntityDataValidators } from './data';
import { tableSchemaValidators } from './schema';

interface ValidationError {
  code: string;
  error: Error;
}

function throwIfError(errors: ValidationError[]) {
  if (errors.length) {
    const message = errors
      .map(({ code, error }) => `${code}: ${error.message}`)
      .join('\n');

    throw new Error('Validation Failed Error\n' + message);
  }
}

export const validators = {
  validateTableSchema(tableName: string, table: TableSchemaBuilder) {
    const errors: ValidationError[] = [];
    for (const [code, validator] of Object.entries(tableSchemaValidators)) {
      try {
        validator.validate(tableName, table);
      } catch (e) {
        errors.push({ code, error: e as Error });
      }
    }

    throwIfError(errors);
  },

  validateCreateEntityData(table: Table<any>, data: any) {
    const errors: ValidationError[] = [];

    for (const [code, validator] of Object.entries(
      createEntityDataValidators
    )) {
      try {
        validator.validate(table, data);
      } catch (e) {
        errors.push({ code, error: e as Error });
      }
    }

    throwIfError(errors);
  },

  validateUpdateEntityData(table: Table<any>, data: any) {
    const errors: ValidationError[] = [];

    for (const [code, validator] of Object.entries(
      updateEntityDataValidators
    )) {
      try {
        validator.validate(table, data);
      } catch (e) {
        errors.push({ code, error: e as Error });
      }
    }

    throwIfError(errors);
  },
};
