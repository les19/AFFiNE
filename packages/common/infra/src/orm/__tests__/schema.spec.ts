import { nanoid } from 'nanoid';
import { describe, expect, test } from 'vitest';

import { f } from '../core';
import { createORMClientType } from '../core/client';

describe('ORM Schema', () => {
  test('primary key must be set', () => {
    expect(() =>
      createORMClientType({
        tags: {
          id: f.string(),
          name: f.string(),
        },
      })
    ).toThrow(
      '[Table(tags)]: There should be at least one field marked as primary key.'
    );
  });

  test('primary key must be unique', () => {
    expect(() =>
      createORMClientType({
        tags: {
          id: f.string().primaryKey(),
          name: f.string().primaryKey(),
        },
      })
    ).toThrow(
      '[Table(tags)]: There should be only one field marked as primary key.'
    );
  });

  test('primary key should not be optional without default value', () => {
    expect(() =>
      createORMClientType({
        tags: {
          id: f.string().primaryKey().optional(),
          name: f.string(),
        },
      })
    ).toThrow(
      "[Table(tags)]: Field 'id' can't be marked primary key and optional with no default value provider at the same time."
    );
  });

  test('primary key can be optional with default value', async () => {
    expect(() =>
      createORMClientType({
        tags: {
          id: f.string().primaryKey().optional().default(nanoid),
          name: f.string(),
        },
      })
    ).not.throws();
  });
});
