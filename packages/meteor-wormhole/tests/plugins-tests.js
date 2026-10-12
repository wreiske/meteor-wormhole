import { Tinytest } from 'meteor/tinytest';
import { PluginHost } from '../lib/plugins';

// Minimal host API stub; plugins only spread it and may call mount().
const fakeApi = () => ({ registry: {}, options: {}, context: {} });

Tinytest.add('PluginHost - plugins are not started before startAll', function (test) {
  const host = new PluginHost();
  let started = false;
  host.use({
    name: 'p1',
    start() {
      started = true;
    },
  });
  test.isFalse(started);
  test.equal(host.names(), ['p1']);
});

Tinytest.add('PluginHost - startAll starts registered plugins', function (test) {
  const host = new PluginHost();
  let started = false;
  host.use({
    name: 'p1',
    start() {
      started = true;
    },
  });
  host.startAll(fakeApi());
  test.isTrue(started);
});

Tinytest.add('PluginHost - plugin registered after startAll starts immediately', function (test) {
  const host = new PluginHost();
  host.startAll(fakeApi());
  let started = false;
  host.use({
    name: 'late',
    start() {
      started = true;
    },
  });
  test.isTrue(started);
});

Tinytest.add('PluginHost - duplicate plugin name throws', function (test) {
  const host = new PluginHost();
  host.use({ name: 'dup', start() {} });
  test.throws(function () {
    host.use({ name: 'dup', start() {} });
  }, /already registered/);
});

Tinytest.add('PluginHost - malformed plugin throws', function (test) {
  const host = new PluginHost();
  test.throws(function () {
    host.use(null);
  }, /must be an object/);
  test.throws(function () {
    host.use({ name: 'no-start' });
  }, /must be an object/);
  test.throws(function () {
    host.use({ start() {} });
  }, /must be an object/);
});

Tinytest.add('PluginHost - start receives an api with a mount function', function (test) {
  const host = new PluginHost();
  let receivedApi = null;
  host.use({
    name: 'p',
    start(api) {
      receivedApi = api;
    },
  });
  host.startAll(fakeApi());
  test.isNotNull(receivedApi);
  test.equal(typeof receivedApi.mount, 'function');
});

Tinytest.add('PluginHost - a failing plugin start does not block others', function (test) {
  const host = new PluginHost();
  let secondStarted = false;
  host.use({
    name: 'bad',
    start() {
      throw new Error('boom');
    },
  });
  host.use({
    name: 'good',
    start() {
      secondStarted = true;
    },
  });
  host.startAll(fakeApi());
  test.isTrue(secondStarted);
});

Tinytest.add('PluginHost - stopAll calls stop and clears state', function (test) {
  const host = new PluginHost();
  let stopped = false;
  host.use({
    name: 'p',
    start() {},
    stop() {
      stopped = true;
    },
  });
  host.startAll(fakeApi());
  host.stopAll();
  test.isTrue(stopped);
  test.equal(host.names(), []);
});

Tinytest.add('PluginHost - stopAll runs plugins in reverse order', function (test) {
  const host = new PluginHost();
  const order = [];
  host.use({
    name: 'a',
    start() {},
    stop() {
      order.push('a');
    },
  });
  host.use({
    name: 'b',
    start() {},
    stop() {
      order.push('b');
    },
  });
  host.startAll(fakeApi());
  host.stopAll();
  test.equal(order, ['b', 'a']);
});

Tinytest.add('PluginHost - stopAll swallows a rejecting async stop', function (test) {
  const host = new PluginHost();
  host.use({
    name: 'p',
    start() {},
    stop() {
      return Promise.reject(new Error('stop boom'));
    },
  });
  host.startAll(fakeApi());
  // Should not throw synchronously; rejection is logged, state is cleared.
  host.stopAll();
  test.equal(host.names(), []);
});
