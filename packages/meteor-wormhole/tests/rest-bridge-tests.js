import { Meteor } from 'meteor/meteor';
import { Tinytest } from 'meteor/tinytest';
import { RestBridge } from '../lib/rest-bridge';
import { MethodRegistry } from '../lib/registry';

const BASE_URL = Meteor.absoluteUrl().replace(/\/$/, '');

// Helper: create a fresh registry
function freshRegistry() {
  return new MethodRegistry();
}

// --- Register test-only Meteor methods for REST invocation tests ---
Meteor.methods({
  'restTest.echo'({ message }) {
    return { echoed: message };
  },
  'restTest.add'({ a, b }) {
    return { result: a + b };
  },
  'restTest.generic'(...args) {
    return { args };
  },
  'restTest.meteorError'() {
    throw new Meteor.Error('test-error', 'Something went wrong');
  },
  'restTest.genericError'() {
    throw new Error('Unexpected failure');
  },
});

// --- Constructor / lifecycle ---

Tinytest.add('RestBridge - constructor sets initial state', function (test) {
  const registry = freshRegistry();
  const bridge = new RestBridge(registry, { restPath: '/api' });

  test.isFalse(bridge.started);
});

Tinytest.add('RestBridge - start sets started flag', function (test) {
  const registry = freshRegistry();
  const bridge = new RestBridge(registry, { restPath: '/test-rest-start' });
  bridge.start();

  test.isTrue(bridge.started);
  bridge.stop();
});

Tinytest.add('RestBridge - stop clears started flag', function (test) {
  const registry = freshRegistry();
  const bridge = new RestBridge(registry, { restPath: '/test-rest-stop' });
  bridge.start();
  bridge.stop();

  test.isFalse(bridge.started);
});

Tinytest.add('RestBridge - double start is idempotent', function (test) {
  const registry = freshRegistry();
  const bridge = new RestBridge(registry, { restPath: '/test-rest-double' });
  bridge.start();
  bridge.start(); // should not throw

  test.isTrue(bridge.started);
  bridge.stop();
});

// --- Constructor stores options ---

Tinytest.add('RestBridge - stores registry and options', function (test) {
  const registry = freshRegistry();
  const opts = { restPath: '/custom', name: 'test-api', version: '3.0.0', docs: true };
  const bridge = new RestBridge(registry, opts);

  // Internal state accessible for testing
  test.equal(bridge._options.restPath, '/custom');
  test.equal(bridge._options.name, 'test-api');
  test.equal(bridge._options.version, '3.0.0');
  test.isTrue(bridge._options.docs);
  test.equal(bridge._registry, registry);
});

Tinytest.add('RestBridge - stores apiKey option', function (test) {
  const registry = freshRegistry();
  const bridge = new RestBridge(registry, { restPath: '/api', apiKey: 'my-key' });

  test.equal(bridge._options.apiKey, 'my-key');
});

Tinytest.add('RestBridge - docs defaults to undefined when not provided', function (test) {
  const registry = freshRegistry();
  const bridge = new RestBridge(registry, { restPath: '/api' });

  // When docs is not passed, it should be undefined (truthy check in handler allows it)
  test.isTrue(bridge._options.docs === undefined);
});

// --- HTTP integration tests (via real HTTP calls) ---

Tinytest.addAsync('RestBridge - GET /openapi.json returns spec', async function (test) {
  const registry = freshRegistry();
  registry.register('test.rest.spec', { description: 'Spec test method' });
  const bridge = new RestBridge(registry, {
    restPath: '/test-rest-spec',
    name: 'spec-test',
    version: '1.2.3',
  });
  bridge.start();

  try {
    const res = await fetch(`${BASE_URL}/test-rest-spec/openapi.json`);
    test.equal(res.status, 200);
    test.equal(res.headers.get('content-type'), 'application/json');

    const spec = await res.json();
    test.equal(spec.openapi, '3.1.0');
    test.equal(spec.info.title, 'spec-test');
    test.equal(spec.info.version, '1.2.3');
    test.isTrue('/test_rest_spec' in spec.paths);
  } finally {
    bridge.stop();
  }
});

Tinytest.addAsync('RestBridge - GET /docs returns HTML', async function (test) {
  const registry = freshRegistry();
  const bridge = new RestBridge(registry, {
    restPath: '/test-rest-docs',
    docs: true,
  });
  bridge.start();

  try {
    const res = await fetch(`${BASE_URL}/test-rest-docs/docs`);
    test.equal(res.status, 200);
    test.equal(res.headers.get('content-type'), 'text/html');

    const html = await res.text();
    test.isTrue(html.indexOf('swagger-ui') !== -1);
    test.isTrue(html.indexOf('/test-rest-docs/openapi.json') !== -1);
  } finally {
    bridge.stop();
  }
});

Tinytest.addAsync('RestBridge - GET /docs returns 404 when docs disabled', async function (test) {
  const registry = freshRegistry();
  const bridge = new RestBridge(registry, {
    restPath: '/test-rest-nodocs',
    docs: false,
  });
  bridge.start();

  try {
    const res = await fetch(`${BASE_URL}/test-rest-nodocs/docs`);
    test.equal(res.status, 404);

    const body = await res.json();
    test.equal(body.error, 'not-found');
  } finally {
    bridge.stop();
  }
});

Tinytest.addAsync('RestBridge - GET / lists endpoints', async function (test) {
  const registry = freshRegistry();
  registry.register('list.test.a', { description: 'Method A' });
  registry.register('list.test.b', { description: 'Method B' });
  const bridge = new RestBridge(registry, { restPath: '/test-rest-list' });
  bridge.start();

  try {
    const res = await fetch(`${BASE_URL}/test-rest-list/`);
    test.equal(res.status, 200);

    const body = await res.json();
    test.isTrue(Array.isArray(body.endpoints));
    test.equal(body.endpoints.length, 2);
    test.isTrue(body.docs !== undefined);
    test.isTrue(body.spec !== undefined);

    // Verify endpoint structure
    const endpointA = body.endpoints.find((e) => e.method === 'list.test.a');
    test.isTrue(endpointA !== undefined);
    test.equal(endpointA.description, 'Method A');
    test.isTrue(endpointA.endpoint.indexOf('list_test_a') !== -1);
  } finally {
    bridge.stop();
  }
});

Tinytest.addAsync('RestBridge - POST to unknown route returns 404', async function (test) {
  const registry = freshRegistry();
  const bridge = new RestBridge(registry, { restPath: '/test-rest-404' });
  bridge.start();

  try {
    const res = await fetch(`${BASE_URL}/test-rest-404/nonexistent_method`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    test.equal(res.status, 404);

    const body = await res.json();
    test.equal(body.error, 'not-found');
  } finally {
    bridge.stop();
  }
});

Tinytest.addAsync('RestBridge - POST without route name returns 404', async function (test) {
  const registry = freshRegistry();
  const bridge = new RestBridge(registry, { restPath: '/test-rest-noname' });
  bridge.start();

  try {
    const res = await fetch(`${BASE_URL}/test-rest-noname/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    test.equal(res.status, 404);
  } finally {
    bridge.stop();
  }
});

Tinytest.addAsync('RestBridge - API key rejects unauthorized requests', async function (test) {
  const registry = freshRegistry();
  registry.register('auth.test', { description: 'Auth test' });
  const bridge = new RestBridge(registry, {
    restPath: '/test-rest-auth',
    apiKey: 'test-secret-key',
  });
  bridge.start();

  try {
    // Request without auth header
    const res1 = await fetch(`${BASE_URL}/test-rest-auth/auth_test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    test.equal(res1.status, 401);

    // Request with wrong auth header
    const res2 = await fetch(`${BASE_URL}/test-rest-auth/auth_test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer wrong-key',
      },
      body: JSON.stringify({}),
    });
    test.equal(res2.status, 401);
  } finally {
    bridge.stop();
  }
});

Tinytest.addAsync('RestBridge - API key allows docs/spec without auth', async function (test) {
  const registry = freshRegistry();
  const bridge = new RestBridge(registry, {
    restPath: '/test-rest-authdocs',
    apiKey: 'secret-key',
    docs: true,
  });
  bridge.start();

  try {
    // Spec should be accessible without auth
    const specRes = await fetch(`${BASE_URL}/test-rest-authdocs/openapi.json`);
    test.equal(specRes.status, 200);

    // Docs should be accessible without auth
    const docsRes = await fetch(`${BASE_URL}/test-rest-authdocs/docs`);
    test.equal(docsRes.status, 200);
  } finally {
    bridge.stop();
  }
});

Tinytest.addAsync('RestBridge - spec reflects current registry state', async function (test) {
  const registry = freshRegistry();
  const bridge = new RestBridge(registry, { restPath: '/test-rest-dynamic' });
  bridge.start();

  try {
    // Initially empty
    const res1 = await fetch(`${BASE_URL}/test-rest-dynamic/openapi.json`);
    const spec1 = await res1.json();
    test.equal(Object.keys(spec1.paths).length, 0);

    // Register a method
    registry.register('dynamic.method', { description: 'Added dynamically' });
    const res2 = await fetch(`${BASE_URL}/test-rest-dynamic/openapi.json`);
    const spec2 = await res2.json();
    test.equal(Object.keys(spec2.paths).length, 1);
    test.isTrue('/dynamic_method' in spec2.paths);
  } finally {
    bridge.stop();
  }
});

// --- POST method invocation tests ---

Tinytest.addAsync(
  'RestBridge - POST invokes method with inputSchema (body as single arg)',
  async function (test) {
    const registry = freshRegistry();
    registry.register('restTest.echo', {
      description: 'Echo test',
      inputSchema: {
        type: 'object',
        properties: { message: { type: 'string' } },
        required: ['message'],
      },
    });
    const bridge = new RestBridge(registry, { restPath: '/test-rest-invoke' });
    bridge.start();

    try {
      const res = await fetch(`${BASE_URL}/test-rest-invoke/restTest_echo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'hello' }),
      });
      test.equal(res.status, 200);

      const body = await res.json();
      test.equal(body.result.echoed, 'hello');
    } finally {
      bridge.stop();
    }
  },
);

Tinytest.addAsync(
  'RestBridge - POST invokes method in generic mode (args array spread)',
  async function (test) {
    const registry = freshRegistry();
    registry.register('restTest.generic', { description: 'Generic test' });
    const bridge = new RestBridge(registry, { restPath: '/test-rest-generic' });
    bridge.start();

    try {
      const res = await fetch(`${BASE_URL}/test-rest-generic/restTest_generic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ args: ['a', 'b', 'c'] }),
      });
      test.equal(res.status, 200);

      const body = await res.json();
      test.equal(body.result.args.length, 3);
      test.equal(body.result.args[0], 'a');
    } finally {
      bridge.stop();
    }
  },
);

Tinytest.addAsync('RestBridge - POST with valid API key succeeds', async function (test) {
  const registry = freshRegistry();
  registry.register('restTest.echo', {
    description: 'Echo with auth',
    inputSchema: {
      type: 'object',
      properties: { message: { type: 'string' } },
      required: ['message'],
    },
  });
  const bridge = new RestBridge(registry, {
    restPath: '/test-rest-authok',
    apiKey: 'valid-secret',
  });
  bridge.start();

  try {
    const res = await fetch(`${BASE_URL}/test-rest-authok/restTest_echo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-secret',
      },
      body: JSON.stringify({ message: 'authed' }),
    });
    test.equal(res.status, 200);

    const body = await res.json();
    test.equal(body.result.echoed, 'authed');
  } finally {
    bridge.stop();
  }
});

Tinytest.addAsync('RestBridge - POST with invalid JSON body returns 400', async function (test) {
  const registry = freshRegistry();
  registry.register('restTest.echo', { description: 'JSON test' });
  const bridge = new RestBridge(registry, { restPath: '/test-rest-badjson' });
  bridge.start();

  try {
    const res = await fetch(`${BASE_URL}/test-rest-badjson/restTest_echo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not valid json',
    });
    test.equal(res.status, 400);

    const body = await res.json();
    test.equal(body.error, 'invalid-json');
  } finally {
    bridge.stop();
  }
});

Tinytest.addAsync('RestBridge - POST propagates Meteor.Error', async function (test) {
  const registry = freshRegistry();
  registry.register('restTest.meteorError', { description: 'Meteor.Error test' });
  const bridge = new RestBridge(registry, { restPath: '/test-rest-merror' });
  bridge.start();

  try {
    const res = await fetch(`${BASE_URL}/test-rest-merror/restTest_meteorError`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    test.equal(res.status, 500);

    const body = await res.json();
    test.equal(body.error, 'test-error');
    test.equal(body.reason, 'Something went wrong');
  } finally {
    bridge.stop();
  }
});

Tinytest.addAsync('RestBridge - POST returns 500 on generic error', async function (test) {
  const registry = freshRegistry();
  registry.register('restTest.genericError', { description: 'Generic error test' });
  const bridge = new RestBridge(registry, { restPath: '/test-rest-generr' });
  bridge.start();

  try {
    const res = await fetch(`${BASE_URL}/test-rest-generr/restTest_genericError`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    test.equal(res.status, 500);

    const body = await res.json();
    test.equal(body.error, 'internal-error');
    test.isTrue(body.message.indexOf('Unexpected failure') !== -1);
  } finally {
    bridge.stop();
  }
});

Tinytest.addAsync(
  'RestBridge - POST with empty body invokes method (no args)',
  async function (test) {
    const registry = freshRegistry();
    registry.register('restTest.generic', { description: 'Empty body test' });
    const bridge = new RestBridge(registry, { restPath: '/test-rest-empty' });
    bridge.start();

    try {
      const res = await fetch(`${BASE_URL}/test-rest-empty/restTest_generic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      test.equal(res.status, 200);

      const body = await res.json();
      // Generic mode with no body → args defaults to []
      test.isTrue(body.result !== undefined);
    } finally {
      bridge.stop();
    }
  },
);
