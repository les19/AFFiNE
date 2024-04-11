import { nanoid } from 'nanoid';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test as t,
  type TestAPI,
} from 'vitest';

import {
  createORMClientType,
  type DBSchemaBuilder,
  type Entity,
  f,
  MemoryORMAdapter,
  Table,
} from '../core';

const TEST_SCHEMA = {
  tags: {
    id: f.string().primaryKey().default(nanoid),
    name: f.string(),
    color: f.string(),
  },
} satisfies DBSchemaBuilder;

const Client = createORMClientType(TEST_SCHEMA);
type Context = {
  client: InstanceType<typeof Client>;
};

beforeEach<Context>(async t => {
  t.client = new Client(new MemoryORMAdapter());
  await t.client.connect();
});

afterEach<Context>(async t => {
  await t.client.disconnect();
});

const test = t as TestAPI<Context>;

describe('ORM entity CRUD', () => {
  test('should be able to create ORM client', t => {
    const { client } = t;

    expect(client.tags instanceof Table).toBe(true);
  });

  test('should be able to create entity', async t => {
    const { client } = t;

    const tag = await client.tags.create({
      name: 'test',
      color: 'red',
    });

    expect(tag.id).toBeDefined();
    expect(tag.name).toBe('test');
    expect(tag.color).toBe('red');
  });

  test('should be able to read entity', async t => {
    const { client } = t;

    const tag = await client.tags.create({
      name: 'test',
      color: 'red',
    });

    const tag2 = await client.tags.get(tag.id);
    expect(tag2).toEqual(tag);
  });

  test('should be able to update entity', async t => {
    const { client } = t;

    const tag = await client.tags.create({
      name: 'test',
      color: 'red',
    });

    await client.tags.update(tag.id, {
      name: 'test2',
    });

    const tag2 = await client.tags.get(tag.id);
    expect(tag2).toEqual({
      id: tag.id,
      name: 'test2',
      color: 'red',
    });

    // old tag should not be updated
    expect(tag.name).not.toBe(tag2.name);
  });

  test('should be able to delete entity', async t => {
    const { client } = t;

    const tag = await client.tags.create({
      name: 'test',
      color: 'red',
    });

    await client.tags.delete(tag.id);

    const tag2 = await client.tags.get(tag.id);
    expect(tag2).toBe(null);
  });

  test('should be able to subscribe to entity changes', async t => {
    const { client } = t;

    let tag: Entity<(typeof TEST_SCHEMA)['tags']> | null = null;
    const unsubscribe = client.tags.get$('test').subscribe(data => {
      tag = data;
    });

    expect(tag).toBe(null);

    // create
    await client.tags.create({
      id: 'test',
      name: 'testTag',
      color: 'blue',
    });

    expect(tag!.id).toEqual('test');
    expect(tag!.color).toEqual('blue');

    await client.tags.update('test', {
      color: 'red',
    });
    expect(tag!.color).toEqual('red');

    await client.tags.delete('test');
    expect(tag).toBe(null);

    unsubscribe.unsubscribe();

    // internal status
    expect(client.tags.subscribedKeys.size).toBe(0);
  });
});
