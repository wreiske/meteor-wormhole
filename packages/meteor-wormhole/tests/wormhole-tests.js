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

Tinytest.add('Wormhole - starts uninitialized', withReset(function (test) {
  test.isFalse(Wormhole.initialized);
}));

Tinytest.add('Wormhole - init sets initialized flag', withReset(function (test) {
  Wormhole.init({ mode: 'opt-in' });
  test.isTrue(Wormhole.initialized);
}));

Tinytest.add('Wormhole - init with default options', withReset(function (test) {
  Wormhole.init();
  const opts = Wormhole.options;
  test.equal(opts.mode, 'all');
  test.equal(opts.path, '/mcp');
  test.equal(opts.name, 'meteor-wormhole');
  test.equal(opts.version, '1.0.0');
  test.equal(opts.apiKey, null);
}));

Tinytest.add('Wormhole - init with custom options', withReset(function (test) {
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
}));

Tinytest.add('Wormhole - double init throws', withReset(function (test) {
  Wormhole.init({ mode: 'opt-in' });
  test.throws(function () {
    Wormhole.init({ mode: 'opt-in' });
  });
}));

// --- Expose / Unexpose tests ---

Tinytest.add('Wormhole - expose adds to registry', withReset(function (test) {
  Wormhole.expose('test.method', { description: 'A test' });
  test.isTrue(Wormhole.registry.has('test.method'));
  test.equal(Wormhole.registry.get('test.method').description, 'A test');
}));

Tinytest.add('Wormhole - expose with inputSchema', withReset(function (test) {
  const schema = {
    type: 'object',
    properties: { name: { type: 'string' } },
    required: ['name'],
  };
  Wormhole.expose('method.with.schema', { inputSchema: schema });

  const entry = Wormhole.registry.get('method.with.schema');
  test.equal(entry.inputSchema, schema);
}));

Tinytest.add('Wormhole - expose throws on empty name', withReset(function (test) {
  test.throws(function () { Wormhole.expose(''); });
  test.throws(function () { Wormhole.expose(null); });
  test.throws(function () { Wormhole.expose(undefined); });
}));

Tinytest.add('Wormhole - unexpose removes from registry', withReset(function (test) {
  Wormhole.expose('to.remove', { description: 'will be removed' });
  test.isTrue(Wormhole.registry.has('to.remove'));

  Wormhole.unexpose('to.remove');
  test.isFalse(Wormhole.registry.has('to.remove'));
}));

// --- Reset tests ---

Tinytest.add('Wormhole - _reset clears everything', withReset(function (test) {
  Wormhole.init({ mode: 'opt-in' });
  Wormhole.expose('some.method');
  test.isTrue(Wormhole.initialized);
  test.equal(Wormhole.registry.size(), 1);

  Wormhole._reset();
  test.isFalse(Wormhole.initialized);
  test.equal(Wormhole.registry.size(), 0);
}));

Tinytest.add('Wormhole - can reinit after reset', withReset(function (test) {
  Wormhole.init({ mode: 'opt-in' });
  Wormhole._reset();
  Wormhole.init({ mode: 'all' });
  test.equal(Wormhole.options.mode, 'all');
}));

// --- Options immutability ---

Tinytest.add('Wormhole - options returns a copy', withReset(function (test) {
  Wormhole.init({ mode: 'opt-in', apiKey: 'secret' });
  const opts = Wormhole.options;
  opts.apiKey = 'hacked';

  // Original should be unchanged
  test.equal(Wormhole.options.apiKey, 'secret');
}));

// --- Expose edge cases ---

Tinytest.add('Wormhole - expose with numeric name throws', withReset(function (test) {
  test.throws(function () { Wormhole.expose(123); });
}));

Tinytest.add('Wormhole - expose overwrites existing entry', withReset(function (test) {
  Wormhole.expose('method', { description: 'v1' });
  Wormhole.expose('method', { description: 'v2' });
  test.equal(Wormhole.registry.get('method').description, 'v2');
  test.equal(Wormhole.registry.size(), 1);
}));

Tinytest.add('Wormhole - unexpose non-existent method does not throw', withReset(function (test) {
  // Should return false but not throw
  Wormhole.unexpose('nonexistent');
  test.equal(Wormhole.registry.size(), 0);
}));

Tinytest.add('Wormhole - expose without description gets default', withReset(function (test) {
  Wormhole.expose('my.method');
  test.equal(Wormhole.registry.get('my.method').description, 'Meteor method: my.method');
}));

// --- Mode behavior ---

Tinytest.add('Wormhole - all mode installs hook', withReset(function (test) {
  const { isHooked } = require('../lib/hooks');
  Wormhole.init({ mode: 'all' });
  test.isTrue(isHooked());
}));

Tinytest.add('Wormhole - opt-in mode does not install hook', withReset(function (test) {
  const { isHooked } = require('../lib/hooks');
  Wormhole.init({ mode: 'opt-in' });
  test.isFalse(isHooked());
}));

// --- Registry access ---

Tinytest.add('Wormhole - registry is accessible before init', withReset(function (test) {
  test.isTrue(Wormhole.registry !== null);
  test.equal(Wormhole.registry.size(), 0);
}));

Tinytest.add('Wormhole - options returns empty before init', withReset(function (test) {
  const opts = Wormhole.options;
  test.equal(Object.keys(opts).length, 0);
}));

// --- Exclude option ---

Tinytest.add('Wormhole - init with exclude option stores it', withReset(function (test) {
  Wormhole.init({ mode: 'all', exclude: ['secret.method'] });
  test.equal(Wormhole.options.exclude.length, 1);
  test.equal(Wormhole.options.exclude[0], 'secret.method');
}));
