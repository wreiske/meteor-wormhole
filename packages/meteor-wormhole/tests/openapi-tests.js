import { Tinytest } from 'meteor/tinytest';
import { generateOpenApiSpec } from '../lib/openapi';
import { MethodRegistry } from '../lib/registry';

// Helper: create a fresh registry for each test
function freshRegistry() {
  return new MethodRegistry();
}

// --- Basic spec structure ---

Tinytest.add('OpenAPI - generates valid spec structure', function (test) {
  const registry = freshRegistry();
  const spec = generateOpenApiSpec(registry);

  test.equal(spec.openapi, '3.1.0');
  test.isTrue(spec.info !== undefined);
  test.isTrue(spec.paths !== undefined);
  test.equal(spec.info.title, 'meteor-wormhole');
  test.equal(spec.info.version, '1.0.0');
});

Tinytest.add('OpenAPI - uses custom name and version', function (test) {
  const registry = freshRegistry();
  const spec = generateOpenApiSpec(registry, {
    name: 'my-api',
    version: '2.0.0',
  });

  test.equal(spec.info.title, 'my-api');
  test.equal(spec.info.version, '2.0.0');
});

Tinytest.add('OpenAPI - uses custom restPath as server url', function (test) {
  const registry = freshRegistry();
  const spec = generateOpenApiSpec(registry, { restPath: '/rest/v1' });

  test.equal(spec.servers[0].url, '/rest/v1');
});

Tinytest.add('OpenAPI - uses custom description', function (test) {
  const registry = freshRegistry();
  const spec = generateOpenApiSpec(registry, { description: 'My custom API' });

  test.equal(spec.info.description, 'My custom API');
});

Tinytest.add('OpenAPI - default description includes api name', function (test) {
  const registry = freshRegistry();
  const spec = generateOpenApiSpec(registry, { name: 'cool-app' });

  test.isTrue(spec.info.description.indexOf('cool-app') !== -1);
});

// --- Paths generation ---

Tinytest.add('OpenAPI - empty registry produces no paths', function (test) {
  const registry = freshRegistry();
  const spec = generateOpenApiSpec(registry);

  test.equal(Object.keys(spec.paths).length, 0);
});

Tinytest.add('OpenAPI - method with explicit schema produces path', function (test) {
  const registry = freshRegistry();
  registry.register('todos.add', {
    description: 'Add a todo',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
      },
      required: ['title'],
    },
  });
  const spec = generateOpenApiSpec(registry);

  test.isTrue('/todos_add' in spec.paths);
  const op = spec.paths['/todos_add'].post;
  test.equal(op.summary, 'Add a todo');
  test.equal(op.operationId, 'todos_add');
  test.isTrue(op.requestBody !== undefined);
  test.equal(op.requestBody.required, true);
  test.equal(op.requestBody.content['application/json'].schema.type, 'object');
  test.isTrue('title' in op.requestBody.content['application/json'].schema.properties);
});

Tinytest.add('OpenAPI - explicit schema passes required array through', function (test) {
  const registry = freshRegistry();
  registry.register('user.create', {
    description: 'Create user',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
      },
      required: ['name', 'email'],
    },
  });
  const spec = generateOpenApiSpec(registry);
  const schema = spec.paths['/user_create'].post.requestBody.content['application/json'].schema;

  test.equal(schema.required.length, 2);
  test.isTrue(schema.required.includes('name'));
  test.isTrue(schema.required.includes('email'));
});

Tinytest.add('OpenAPI - method without schema gets generic args body', function (test) {
  const registry = freshRegistry();
  registry.register('echo', { description: 'Echo args' });
  const spec = generateOpenApiSpec(registry);

  test.isTrue('/echo' in spec.paths);
  const body = spec.paths['/echo'].post.requestBody;
  test.equal(body.required, false);
  test.isTrue('args' in body.content['application/json'].schema.properties);
  test.equal(body.content['application/json'].schema.properties.args.type, 'array');
});

Tinytest.add('OpenAPI - multiple methods produce multiple paths', function (test) {
  const registry = freshRegistry();
  registry.register('todos.add', { description: 'Add' });
  registry.register('todos.list', { description: 'List' });
  registry.register('math.add', { description: 'Math' });
  const spec = generateOpenApiSpec(registry);

  test.equal(Object.keys(spec.paths).length, 3);
  test.isTrue('/todos_add' in spec.paths);
  test.isTrue('/todos_list' in spec.paths);
  test.isTrue('/math_add' in spec.paths);
});

Tinytest.add('OpenAPI - method without description gets default summary', function (test) {
  const registry = freshRegistry();
  registry.register('some.method');
  const spec = generateOpenApiSpec(registry);
  const op = spec.paths['/some_method'].post;

  // Default description from registry is "Meteor method: some.method"
  test.equal(op.summary, 'Meteor method: some.method');
});

Tinytest.add('OpenAPI - all paths are POST operations', function (test) {
  const registry = freshRegistry();
  registry.register('a');
  registry.register('b.c');
  const spec = generateOpenApiSpec(registry);

  for (const pathObj of Object.values(spec.paths)) {
    test.isTrue('post' in pathObj);
    test.equal(Object.keys(pathObj).length, 1);
  }
});

// --- Tags ---

Tinytest.add('OpenAPI - derives tags from method namespace', function (test) {
  const registry = freshRegistry();
  registry.register('todos.add', { description: 'Add a todo' });
  const spec = generateOpenApiSpec(registry);
  const tags = spec.paths['/todos_add'].post.tags;

  test.equal(tags.length, 1);
  test.equal(tags[0], 'todos');
});

Tinytest.add('OpenAPI - methods without dots get "general" tag', function (test) {
  const registry = freshRegistry();
  registry.register('echo', { description: 'Echo' });
  const spec = generateOpenApiSpec(registry);
  const tags = spec.paths['/echo'].post.tags;

  test.equal(tags[0], 'general');
});

Tinytest.add('OpenAPI - multi-dot method uses first segment as tag', function (test) {
  const registry = freshRegistry();
  registry.register('a.b.c', { description: 'Deeply nested' });
  const spec = generateOpenApiSpec(registry);
  const tags = spec.paths['/a_b_c'].post.tags;

  test.equal(tags[0], 'a');
});

Tinytest.add('OpenAPI - methods in same namespace share same tag', function (test) {
  const registry = freshRegistry();
  registry.register('user.create', { description: 'Create' });
  registry.register('user.delete', { description: 'Delete' });
  const spec = generateOpenApiSpec(registry);

  test.equal(spec.paths['/user_create'].post.tags[0], 'user');
  test.equal(spec.paths['/user_delete'].post.tags[0], 'user');
});

// --- Security ---

Tinytest.add('OpenAPI - no security scheme when apiKey is null', function (test) {
  const registry = freshRegistry();
  const spec = generateOpenApiSpec(registry, { apiKey: null });

  test.equal(spec.components, undefined);
  test.equal(spec.security, undefined);
});

Tinytest.add('OpenAPI - no security scheme when apiKey is undefined', function (test) {
  const registry = freshRegistry();
  const spec = generateOpenApiSpec(registry);

  test.equal(spec.components, undefined);
  test.equal(spec.security, undefined);
});

Tinytest.add('OpenAPI - adds security scheme when apiKey is set', function (test) {
  const registry = freshRegistry();
  const spec = generateOpenApiSpec(registry, { apiKey: 'secret' });

  test.isTrue(spec.components !== undefined);
  test.isTrue(spec.components.securitySchemes.bearerAuth !== undefined);
  test.equal(spec.components.securitySchemes.bearerAuth.type, 'http');
  test.equal(spec.components.securitySchemes.bearerAuth.scheme, 'bearer');
  test.isTrue(Array.isArray(spec.security));
  test.isTrue(spec.security[0].bearerAuth !== undefined);
});

// --- Response schemas ---

Tinytest.add('OpenAPI - includes standard response codes', function (test) {
  const registry = freshRegistry();
  registry.register('test.method', { description: 'Test' });
  const spec = generateOpenApiSpec(registry);
  const responses = spec.paths['/test_method'].post.responses;

  test.isTrue('200' in responses);
  test.isTrue('400' in responses);
  test.isTrue('401' in responses);
  test.isTrue('500' in responses);
});

Tinytest.add('OpenAPI - 200 response has application/json content', function (test) {
  const registry = freshRegistry();
  registry.register('test.method', { description: 'Test' });
  const spec = generateOpenApiSpec(registry);
  const ok = spec.paths['/test_method'].post.responses['200'];

  test.isTrue('application/json' in ok.content);
});

Tinytest.add('OpenAPI - 500 response schema includes error and reason fields', function (test) {
  const registry = freshRegistry();
  registry.register('test.method', { description: 'Test' });
  const spec = generateOpenApiSpec(registry);
  const errSchema =
    spec.paths['/test_method'].post.responses['500'].content['application/json'].schema;

  test.isTrue('error' in errSchema.properties);
  test.isTrue('reason' in errSchema.properties);
  test.isTrue('message' in errSchema.properties);
});

// --- outputSchema ---

Tinytest.add('OpenAPI - uses custom outputSchema when provided', function (test) {
  const registry = freshRegistry();
  const outputSchema = {
    type: 'object',
    properties: {
      id: { type: 'number' },
      title: { type: 'string' },
    },
  };
  registry.register('todos.add', {
    description: 'Add a todo',
    outputSchema,
  });
  const spec = generateOpenApiSpec(registry);
  const responseSchema =
    spec.paths['/todos_add'].post.responses['200'].content['application/json'].schema;

  test.equal(responseSchema, outputSchema);
});

Tinytest.add('OpenAPI - default 200 schema when no outputSchema', function (test) {
  const registry = freshRegistry();
  registry.register('test.method', { description: 'Test' });
  const spec = generateOpenApiSpec(registry);
  const responseSchema =
    spec.paths['/test_method'].post.responses['200'].content['application/json'].schema;

  test.equal(responseSchema.type, 'object');
  test.isTrue('result' in responseSchema.properties);
});

// --- Spec is regenerated from current registry state ---

Tinytest.add('OpenAPI - spec reflects registry changes', function (test) {
  const registry = freshRegistry();
  registry.register('method.a', { description: 'A' });
  const spec1 = generateOpenApiSpec(registry);
  test.equal(Object.keys(spec1.paths).length, 1);

  registry.register('method.b', { description: 'B' });
  const spec2 = generateOpenApiSpec(registry);
  test.equal(Object.keys(spec2.paths).length, 2);

  registry.unregister('method.a');
  const spec3 = generateOpenApiSpec(registry);
  test.equal(Object.keys(spec3.paths).length, 1);
  test.isTrue('/method_b' in spec3.paths);
});
