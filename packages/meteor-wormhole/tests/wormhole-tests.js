import { Tinytest } from 'meteor/tinytest';
import { Wormhole } from 'meteor/wreiske:meteor-wormhole';

// Helper: reset Wormhole state before each test
function withReset(fn) {
  return function (test) {
    Wormhole._reset();
    try {
      fn(test);
    } finally {
      Wormhole._reset();
    }
  };
}

// --- Init tests ---

Tinytest.add(
  'Wormhole - starts uninitialized',
  withReset(function (test) {
    test.isFalse(Wormhole.initialized);
  }),
);

Tinytest.add(
  'Wormhole - init sets initialized flag',
  withReset(function (test) {
    Wormhole.init({ mode: 'opt-in' });
    test.isTrue(Wormhole.initialized);
  }),
);

Tinytest.add(
  'Wormhole - init with default options',
  withReset(function (test) {
    Wormhole.init();
    const opts = Wormhole.options;
    test.equal(opts.mode, 'all');
    test.equal(opts.path, '/mcp');
    test.equal(opts.name, 'meteor-wormhole');
    test.equal(opts.version, '1.0.0');
    test.equal(opts.apiKey, null);
  }),
);

Tinytest.add(
  'Wormhole - init with custom options',
  withReset(function (test) {
    Wormhole.init({
      mode: 'opt-in',
      path: '/api/mcp',
      name: 'my-server',
      version: '2.0.0',
      apiKey: 'secret123',
    });
    const opts = Wormhole.options;
    test.equal(opts.mode, 'opt-in');
    test.equal(opts.path, '/api/mcp');
    test.equal(opts.name, 'my-server');
    test.equal(opts.version, '2.0.0');
    test.equal(opts.apiKey, 'secret123');
  }),
);

Tinytest.add(
  'Wormhole - double init throws',
  withReset(function (test) {
    Wormhole.init({ mode: 'opt-in' });
    test.throws(function () {
      Wormhole.init({ mode: 'opt-in' });
    });
  }),
);

// --- Expose / Unexpose tests ---

Tinytest.add(
  'Wormhole - expose adds to registry',
  withReset(function (test) {
    Wormhole.expose('test.method', { description: 'A test' });
    test.isTrue(Wormhole.registry.has('test.method'));
    test.equal(Wormhole.registry.get('test.method').description, 'A test');
  }),
);

Tinytest.add(
  'Wormhole - expose with inputSchema',
  withReset(function (test) {
    const schema = {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    };
    Wormhole.expose('method.with.schema', { inputSchema: schema });

    const entry = Wormhole.registry.get('method.with.schema');
    test.equal(entry.inputSchema, schema);
  }),
);

Tinytest.add(
  'Wormhole - expose throws on empty name',
  withReset(function (test) {
    test.throws(function () {
      Wormhole.expose('');
    });
    test.throws(function () {
      Wormhole.expose(null);
    });
    test.throws(function () {
      Wormhole.expose(undefined);
    });
  }),
);

Tinytest.add(
  'Wormhole - unexpose removes from registry',
  withReset(function (test) {
    Wormhole.expose('to.remove', { description: 'will be removed' });
    test.isTrue(Wormhole.registry.has('to.remove'));

    Wormhole.unexpose('to.remove');
    test.isFalse(Wormhole.registry.has('to.remove'));
  }),
);

// --- Reset tests ---

Tinytest.add(
  'Wormhole - _reset clears everything',
  withReset(function (test) {
    Wormhole.init({ mode: 'opt-in' });
    Wormhole.expose('some.method');
    test.isTrue(Wormhole.initialized);
    test.equal(Wormhole.registry.size(), 1);

    Wormhole._reset();
    test.isFalse(Wormhole.initialized);
    test.equal(Wormhole.registry.size(), 0);
  }),
);

Tinytest.add(
  'Wormhole - can reinit after reset',
  withReset(function (test) {
    Wormhole.init({ mode: 'opt-in' });
    Wormhole._reset();
    Wormhole.init({ mode: 'all' });
    test.equal(Wormhole.options.mode, 'all');
  }),
);

// --- Options immutability ---

Tinytest.add(
  'Wormhole - options returns a copy',
  withReset(function (test) {
    Wormhole.init({ mode: 'opt-in', apiKey: 'secret' });
    const opts = Wormhole.options;
    opts.apiKey = 'hacked';

    // Original should be unchanged
    test.equal(Wormhole.options.apiKey, 'secret');
  }),
);

// --- Expose edge cases ---

Tinytest.add(
  'Wormhole - expose with numeric name throws',
  withReset(function (test) {
    test.throws(function () {
      Wormhole.expose(123);
    });
  }),
);

Tinytest.add(
  'Wormhole - expose overwrites existing entry',
  withReset(function (test) {
    Wormhole.expose('method', { description: 'v1' });
    Wormhole.expose('method', { description: 'v2' });
    test.equal(Wormhole.registry.get('method').description, 'v2');
    test.equal(Wormhole.registry.size(), 1);
  }),
);

Tinytest.add(
  'Wormhole - unexpose non-existent method does not throw',
  withReset(function (test) {
    // Should return false but not throw
    Wormhole.unexpose('nonexistent');
    test.equal(Wormhole.registry.size(), 0);
  }),
);

Tinytest.add(
  'Wormhole - expose without description gets default',
  withReset(function (test) {
    Wormhole.expose('my.method');
    test.equal(Wormhole.registry.get('my.method').description, 'Meteor method: my.method');
  }),
);

// --- Mode behavior ---

Tinytest.add(
  'Wormhole - all mode installs hook',
  withReset(function (test) {
    const { isHooked } = require('../lib/hooks');
    Wormhole.init({ mode: 'all' });
    test.isTrue(isHooked());
  }),
);

Tinytest.add(
  'Wormhole - opt-in mode does not install hook',
  withReset(function (test) {
    const { isHooked } = require('../lib/hooks');
    Wormhole.init({ mode: 'opt-in' });
    test.isFalse(isHooked());
  }),
);

// --- Registry access ---

Tinytest.add(
  'Wormhole - registry is accessible before init',
  withReset(function (test) {
    test.isTrue(Wormhole.registry !== null);
    test.equal(Wormhole.registry.size(), 0);
  }),
);

Tinytest.add(
  'Wormhole - options returns empty before init',
  withReset(function (test) {
    const opts = Wormhole.options;
    test.equal(Object.keys(opts).length, 0);
  }),
);

// --- Exclude option ---

Tinytest.add(
  'Wormhole - init with exclude option stores it',
  withReset(function (test) {
    Wormhole.init({ mode: 'all', exclude: ['secret.method'] });
    test.equal(Wormhole.options.exclude.length, 1);
    test.equal(Wormhole.options.exclude[0], 'secret.method');
  }),
);

// --- REST configuration tests ---

Tinytest.add(
  'Wormhole - rest is disabled by default',
  withReset(function (test) {
    Wormhole.init({ mode: 'opt-in' });
    const opts = Wormhole.options;
    test.isFalse(opts.rest.enabled);
  }),
);

Tinytest.add(
  'Wormhole - rest default options when disabled',
  withReset(function (test) {
    Wormhole.init({ mode: 'opt-in' });
    const rest = Wormhole.options.rest;
    test.isFalse(rest.enabled);
    test.equal(rest.path, '/api');
    test.isTrue(rest.docs);
    test.equal(rest.apiKey, null);
  }),
);

Tinytest.add(
  'Wormhole - rest enabled via rest: true shorthand',
  withReset(function (test) {
    Wormhole.init({ mode: 'opt-in', rest: true });
    test.isTrue(Wormhole.options.rest.enabled);
  }),
);

Tinytest.add(
  'Wormhole - rest enabled via rest.enabled: true',
  withReset(function (test) {
    Wormhole.init({ mode: 'opt-in', rest: { enabled: true } });
    test.isTrue(Wormhole.options.rest.enabled);
  }),
);

Tinytest.add(
  'Wormhole - rest custom path',
  withReset(function (test) {
    Wormhole.init({ mode: 'opt-in', rest: { enabled: true, path: '/rest/v2' } });
    test.equal(Wormhole.options.rest.path, '/rest/v2');
  }),
);

Tinytest.add(
  'Wormhole - rest docs can be disabled',
  withReset(function (test) {
    Wormhole.init({ mode: 'opt-in', rest: { enabled: true, docs: false } });
    test.isFalse(Wormhole.options.rest.docs);
  }),
);

Tinytest.add(
  'Wormhole - rest inherits main apiKey by default',
  withReset(function (test) {
    Wormhole.init({ mode: 'opt-in', apiKey: 'shared-key', rest: { enabled: true } });
    test.equal(Wormhole.options.rest.apiKey, 'shared-key');
  }),
);

Tinytest.add(
  'Wormhole - rest can have separate apiKey',
  withReset(function (test) {
    Wormhole.init({
      mode: 'opt-in',
      apiKey: 'mcp-key',
      rest: { enabled: true, apiKey: 'rest-key' },
    });
    test.equal(Wormhole.options.apiKey, 'mcp-key');
    test.equal(Wormhole.options.rest.apiKey, 'rest-key');
  }),
);

Tinytest.add(
  'Wormhole - _reset clears REST bridge',
  withReset(function (test) {
    Wormhole.init({ mode: 'opt-in', rest: { enabled: true, path: '/test-wh-reset-rest' } });
    test.isTrue(Wormhole.initialized);

    Wormhole._reset();
    test.isFalse(Wormhole.initialized);
    test.equal(Wormhole.registry.size(), 0);
  }),
);

// --- Expose with outputSchema ---

Tinytest.add(
  'Wormhole - expose with outputSchema stores it in registry',
  withReset(function (test) {
    const outputSchema = {
      type: 'object',
      properties: { id: { type: 'number' } },
    };
    Wormhole.expose('my.method', {
      description: 'Test',
      outputSchema,
    });

    const entry = Wormhole.registry.get('my.method');
    test.equal(entry.outputSchema, outputSchema);
  }),
);

Tinytest.add(
  'Wormhole - expose without outputSchema stores null',
  withReset(function (test) {
    Wormhole.expose('my.method', { description: 'No output schema' });

    const entry = Wormhole.registry.get('my.method');
    test.equal(entry.outputSchema, null);
  }),
);
