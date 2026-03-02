import { Tinytest } from 'meteor/tinytest';
import { sanitizeToolName, jsonSchemaToZod, genericInputSchema, McpBridge } from '../lib/mcp-bridge';
import { MethodRegistry } from '../lib/registry';

// --- sanitizeToolName tests ---

Tinytest.add('McpBridge - sanitizeToolName: dots become underscores', function (test) {
  test.equal(sanitizeToolName('todos.add'), 'todos_add');
  test.equal(sanitizeToolName('a.b.c.d'), 'a_b_c_d');
});

Tinytest.add('McpBridge - sanitizeToolName: hyphens are preserved', function (test) {
  test.equal(sanitizeToolName('my-method'), 'my-method');
});

Tinytest.add('McpBridge - sanitizeToolName: alphanumeric preserved', function (test) {
  test.equal(sanitizeToolName('method123'), 'method123');
});

Tinytest.add('McpBridge - sanitizeToolName: special chars become underscores', function (test) {
  test.equal(sanitizeToolName('method:name'), 'method_name');
  test.equal(sanitizeToolName('method/name'), 'method_name');
  test.equal(sanitizeToolName('method name'), 'method_name');
});

Tinytest.add('McpBridge - sanitizeToolName: empty string', function (test) {
  test.equal(sanitizeToolName(''), '');
});

// --- jsonSchemaToZod tests ---

Tinytest.add('McpBridge - jsonSchemaToZod: null schema returns generic', function (test) {
  const schema = jsonSchemaToZod(null);
  // Should be a zod object with 'args' field
  test.isTrue(schema !== null);
  test.equal(typeof schema.parse, 'function');

  // Should accept { args: [] }
  const result = schema.parse({ args: [1, 2, 3] });
  test.equal(result.args.length, 3);
});

Tinytest.add('McpBridge - jsonSchemaToZod: empty object returns generic', function (test) {
  const schema = jsonSchemaToZod({});
  test.equal(typeof schema.parse, 'function');

  const result = schema.parse({ args: [] });
  test.isTrue(Array.isArray(result.args));
});

Tinytest.add('McpBridge - jsonSchemaToZod: simple object schema', function (test) {
  const schema = jsonSchemaToZod({
    type: 'object',
    properties: {
      name: { type: 'string', description: 'User name' },
      age: { type: 'number' },
    },
    required: ['name'],
  });

  // Should accept valid input
  const result = schema.parse({ name: 'Alice', age: 30 });
  test.equal(result.name, 'Alice');
  test.equal(result.age, 30);
});

Tinytest.add('McpBridge - jsonSchemaToZod: optional fields', function (test) {
  const schema = jsonSchemaToZod({
    type: 'object',
    properties: {
      title: { type: 'string' },
      done: { type: 'boolean' },
    },
    required: ['title'],
  });

  // Should accept input without optional 'done'
  const result = schema.parse({ title: 'Test' });
  test.equal(result.title, 'Test');
  test.equal(result.done, undefined);
});

Tinytest.add('McpBridge - jsonSchemaToZod: integer type', function (test) {
  const schema = jsonSchemaToZod({
    type: 'object',
    properties: {
      count: { type: 'integer' },
    },
    required: ['count'],
  });

  const result = schema.parse({ count: 5 });
  test.equal(result.count, 5);
});

Tinytest.add('McpBridge - jsonSchemaToZod: boolean type', function (test) {
  const schema = jsonSchemaToZod({
    type: 'object',
    properties: {
      active: { type: 'boolean' },
    },
    required: ['active'],
  });

  const result = schema.parse({ active: true });
  test.equal(result.active, true);
});

Tinytest.add('McpBridge - jsonSchemaToZod: array type', function (test) {
  const schema = jsonSchemaToZod({
    type: 'object',
    properties: {
      tags: { type: 'array', items: { type: 'string' } },
    },
    required: ['tags'],
  });

  const result = schema.parse({ tags: ['a', 'b'] });
  test.equal(result.tags.length, 2);
});

// --- genericInputSchema tests ---

Tinytest.add('McpBridge - genericInputSchema: accepts args array', function (test) {
  const schema = genericInputSchema();
  const result = schema.parse({ args: [1, 'hello', true] });
  test.equal(result.args.length, 3);
});

Tinytest.add('McpBridge - genericInputSchema: args is optional', function (test) {
  const schema = genericInputSchema();
  const result = schema.parse({});
  test.equal(result.args, undefined);
});

Tinytest.add('McpBridge - genericInputSchema: args can be empty', function (test) {
  const schema = genericInputSchema();
  const result = schema.parse({ args: [] });
  test.equal(result.args.length, 0);
});

// --- jsonSchemaToZod edge cases ---

Tinytest.add('McpBridge - jsonSchemaToZod: undefined schema returns generic', function (test) {
  const schema = jsonSchemaToZod(undefined);
  test.equal(typeof schema.parse, 'function');
  const result = schema.parse({ args: ['test'] });
  test.equal(result.args.length, 1);
});

Tinytest.add('McpBridge - jsonSchemaToZod: schema with no properties returns generic', function (test) {
  const schema = jsonSchemaToZod({ type: 'object' });
  // type: object but no properties → falls through to generic
  test.equal(typeof schema.parse, 'function');
  const result = schema.parse({ args: [] });
  test.isTrue(Array.isArray(result.args));
});

Tinytest.add('McpBridge - jsonSchemaToZod: non-object type returns generic', function (test) {
  const schema = jsonSchemaToZod({ type: 'string' });
  test.equal(typeof schema.parse, 'function');
  const result = schema.parse({ args: [] });
  test.isTrue(Array.isArray(result.args));
});

Tinytest.add('McpBridge - jsonSchemaToZod: unknown property type uses z.any()', function (test) {
  const schema = jsonSchemaToZod({
    type: 'object',
    properties: {
      data: { type: 'customType' },
    },
    required: ['data'],
  });

  // z.any() should accept anything
  const result = schema.parse({ data: { complex: true } });
  test.equal(result.data.complex, true);
});

Tinytest.add('McpBridge - jsonSchemaToZod: nested object property', function (test) {
  const schema = jsonSchemaToZod({
    type: 'object',
    properties: {
      address: {
        type: 'object',
        properties: {
          street: { type: 'string' },
          city: { type: 'string' },
        },
        required: ['street'],
      },
    },
    required: ['address'],
  });

  const result = schema.parse({ address: { street: '123 Main St', city: 'Springfield' } });
  test.equal(result.address.street, '123 Main St');
  test.equal(result.address.city, 'Springfield');
});

Tinytest.add('McpBridge - jsonSchemaToZod: array without items uses z.any()', function (test) {
  const schema = jsonSchemaToZod({
    type: 'object',
    properties: {
      items: { type: 'array' },
    },
    required: ['items'],
  });

  const result = schema.parse({ items: [1, 'two', true] });
  test.equal(result.items.length, 3);
});

Tinytest.add('McpBridge - jsonSchemaToZod: all required fields must be present', function (test) {
  const schema = jsonSchemaToZod({
    type: 'object',
    properties: {
      a: { type: 'string' },
      b: { type: 'string' },
    },
    required: ['a', 'b'],
  });

  // Missing 'b' should fail
  let threw = false;
  try {
    schema.parse({ a: 'hello' });
  } catch (e) {
    threw = true;
  }
  test.isTrue(threw, 'Should throw when required field is missing');
});

Tinytest.add('McpBridge - jsonSchemaToZod: description is preserved on fields', function (test) {
  const schema = jsonSchemaToZod({
    type: 'object',
    properties: {
      name: { type: 'string', description: 'The user name' },
    },
    required: ['name'],
  });

  // Schema should parse correctly (description is metadata, doesn't affect parsing)
  const result = schema.parse({ name: 'test' });
  test.equal(result.name, 'test');
});

Tinytest.add('McpBridge - jsonSchemaToZod: empty required array makes all optional', function (test) {
  const schema = jsonSchemaToZod({
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' },
    },
    required: [],
  });

  // All fields optional, empty object should work
  const result = schema.parse({});
  test.equal(result.name, undefined);
  test.equal(result.age, undefined);
});

// --- sanitizeToolName additional edge cases ---

Tinytest.add('McpBridge - sanitizeToolName: underscores preserved', function (test) {
  test.equal(sanitizeToolName('my_method'), 'my_method');
});

Tinytest.add('McpBridge - sanitizeToolName: multiple consecutive special chars', function (test) {
  test.equal(sanitizeToolName('a..b::c'), 'a__b__c');
});

// --- McpBridge constructor and lifecycle ---

Tinytest.add('McpBridge - constructor initializes with registry and options', function (test) {
  const registry = new MethodRegistry();
  const bridge = new McpBridge(registry, { path: '/mcp', name: 'test', version: '1.0.0' });
  test.equal(bridge.activeSessions, 0);
});

Tinytest.add('McpBridge - stop clears all sessions', function (test) {
  const registry = new MethodRegistry();
  const bridge = new McpBridge(registry, { path: '/test-mcp', name: 'test', version: '1.0.0' });
  // stop on a fresh bridge should not throw
  bridge.stop();
  test.equal(bridge.activeSessions, 0);
});
