import { Meteor } from 'meteor/meteor';
import { Tinytest } from 'meteor/tinytest';
import { Wormhole, WormholeManager } from 'meteor/wreiske:meteor-wormhole';
import { isHooked } from '../lib/hooks';

const BASE_URL = Meteor.absoluteUrl().replace(/\/$/, '');

Meteor.methods({
  'multiTest.ping'() {
    return { pong: true };
  },
  'multiTest.whoami'() {
    return { userId: this.userId };
  },
});

// Accepts "user:<id>" bearer tokens
const sessionAuth = {
  resolveUser: async (req) => {
    const match = (req.headers.authorization || '').match(/^Bearer user:(.+)$/);
    return match ? match[1] : null;
  },
};

async function post(path, body, headers = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body || {}),
  });
  return { status: res.status, body: await res.json() };
}

function withInstances(fn) {
  return async function (test) {
    const created = [];
    const make = (options) => {
      const instance = Wormhole.create(options);
      created.push(instance);
      return instance;
    };
    await Wormhole._reset();
    try {
      await fn(test, make);
    } finally {
      for (const instance of created) await instance._reset();
      await Wormhole._reset();
    }
  };
}

Tinytest.add('Multi-instance - create() returns an independent manager', function (test) {
  const instance = Wormhole.create();
  test.instanceOf(instance, WormholeManager);
  test.isFalse(instance === Wormhole);
  test.isFalse(instance.initialized);
  test.isFalse(instance.registry === Wormhole.registry);
});

Tinytest.addAsync(
  'Multi-instance - create(options) initializes the new instance only',
  withInstances(async function (test, make) {
    const app = make({ mode: 'opt-in', mcp: false, rest: { enabled: true, path: '/mi-init' } });
    test.isTrue(app.initialized);
    test.isFalse(Wormhole.initialized);
  }),
);

Tinytest.addAsync(
  'Multi-instance - registries and REST routes are isolated',
  withInstances(async function (test, make) {
    Wormhole.init({ mode: 'opt-in', mcp: false, rest: { enabled: true, path: '/mi-a' } });
    const app = make({ mode: 'opt-in', mcp: false, rest: { enabled: true, path: '/mi-b' } });
    Wormhole.expose('multiTest.ping');
    app.expose('multiTest.whoami');

    test.isTrue(Wormhole.registry.has('multiTest.ping'));
    test.isFalse(Wormhole.registry.has('multiTest.whoami'));
    test.isTrue(app.registry.has('multiTest.whoami'));
    test.isFalse(app.registry.has('multiTest.ping'));

    const ok = await post('/mi-a/multiTest_ping');
    test.equal(ok.status, 200);
    test.equal(ok.body.result, { pong: true });

    const crossed = await post('/mi-b/multiTest_ping');
    test.equal(crossed.status, 404);

    const specA = await (await fetch(`${BASE_URL}/mi-a/openapi.json`)).json();
    const specB = await (await fetch(`${BASE_URL}/mi-b/openapi.json`)).json();
    test.isTrue('/multiTest_ping' in specA.paths);
    test.isFalse('/multiTest_whoami' in specA.paths);
    test.isTrue('/multiTest_whoami' in specB.paths);
    test.isFalse('/multiTest_ping' in specB.paths);
  }),
);

Tinytest.addAsync(
  'Multi-instance - each instance keeps its own auth config',
  withInstances(async function (test, make) {
    Wormhole.init({ mode: 'opt-in', mcp: false, rest: { enabled: true, path: '/mi-noauth' } });
    const app = make({
      mode: 'opt-in',
      mcp: false,
      auth: sessionAuth,
      rest: { enabled: true, path: '/mi-session' },
    });
    Wormhole.expose('multiTest.whoami');
    app.expose('multiTest.whoami', { auth: 'required' });

    const anon = await post('/mi-session/multiTest_whoami');
    test.equal(anon.status, 401);

    const signedIn = await post(
      '/mi-session/multiTest_whoami',
      {},
      {
        Authorization: 'Bearer user:abc',
      },
    );
    test.equal(signedIn.status, 200);
    test.equal(signedIn.body.result, { userId: 'abc' });

    // The default instance has no session auth: same method runs anonymously
    const plain = await post('/mi-noauth/multiTest_whoami');
    test.equal(plain.status, 200);
    test.equal(plain.body.result, { userId: null });
  }),
);

Tinytest.addAsync(
  'Multi-instance - onBeforeInvoke is per instance',
  withInstances(async function (test, make) {
    let calls = 0;
    Wormhole.init({ mode: 'opt-in', mcp: false, rest: { enabled: true, path: '/mi-hook-a' } });
    const app = make({
      mode: 'opt-in',
      mcp: false,
      rest: { enabled: true, path: '/mi-hook-b' },
      onBeforeInvoke: async () => {
        calls += 1;
        throw new Meteor.Error('rate-limited', 'slow down');
      },
    });
    Wormhole.expose('multiTest.ping');
    app.expose('multiTest.ping');

    test.equal((await post('/mi-hook-a/multiTest_ping')).status, 200);
    test.equal(calls, 0);
    test.equal((await post('/mi-hook-b/multiTest_ping')).status, 429);
    test.equal(calls, 1);
  }),
);

Tinytest.addAsync(
  'Multi-instance - overlapping paths are rejected',
  withInstances(async function (test, make) {
    Wormhole.init({ mode: 'opt-in', mcp: false, rest: { enabled: true, path: '/mi-dup' } });
    test.throws(
      () => make({ mode: 'opt-in', mcp: false, rest: { enabled: true, path: '/mi-dup' } }),
      /already used by another initialized instance/,
    );
    test.throws(
      () => make({ mode: 'opt-in', mcp: false, rest: { enabled: true, path: '/mi-dup/nested' } }),
      /overlaps/,
    );
    test.throws(
      () => make({ mode: 'opt-in', path: '/mi-dup', rest: { enabled: true, path: '/mi-other' } }),
      /overlaps/,
    );
    // Connect matches mount paths case-insensitively
    test.throws(
      () => make({ mode: 'opt-in', mcp: false, rest: { enabled: true, path: '/MI-DUP/app' } }),
      /overlaps/,
    );
    // Sibling prefixes that merely share characters are fine
    const sibling = make({ mode: 'opt-in', mcp: false, rest: { enabled: true, path: '/mi-dup2' } });
    test.isTrue(sibling.initialized);
  }),
);

Tinytest.addAsync(
  'Multi-instance - a path is released on _reset',
  withInstances(async function (test, make) {
    const first = make({ mode: 'opt-in', mcp: false, rest: { enabled: true, path: '/mi-reuse' } });
    await first._reset();
    const second = make({ mode: 'opt-in', mcp: false, rest: { enabled: true, path: '/mi-reuse' } });
    test.isTrue(second.initialized);
  }),
);

Tinytest.addAsync(
  'Multi-instance - a failed init() claims no paths',
  withInstances(async function (test, make) {
    // `auth: true` without accounts-base fails; hide the package to force it
    const accounts = Package['accounts-base'];
    Package['accounts-base'] = undefined;
    try {
      test.throws(
        () => make({ mode: 'opt-in', auth: true, path: '/mi-fail-mcp', apiKey: 'k' }),
        /requires the accounts-base package/,
      );
    } finally {
      Package['accounts-base'] = accounts;
    }
    const retry = make({ mode: 'opt-in', auth: sessionAuth, path: '/mi-fail-mcp', apiKey: 'k' });
    test.isTrue(retry.initialized);
  }),
);

Tinytest.addAsync(
  'Multi-instance - a reset MCP path is served by the new instance',
  withInstances(async function (test, make) {
    const initialize = (key) =>
      fetch(`${BASE_URL}/mi-mcp-reuse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2025-03-26',
            capabilities: {},
            clientInfo: { name: 'multi-instance-test', version: '1.0.0' },
          },
        }),
      }).then(async (res) => {
        await res.text();
        return res.status;
      });

    const first = make({ mode: 'opt-in', path: '/mi-mcp-reuse', apiKey: 'old-key' });
    test.notEqual(await initialize('old-key'), 401);
    await first._reset();

    make({ mode: 'opt-in', path: '/mi-mcp-reuse', apiKey: 'new-key' });
    test.equal(await initialize('old-key'), 401);
    test.notEqual(await initialize('new-key'), 401);
  }),
);

Tinytest.addAsync(
  "Multi-instance - only one instance may use mode 'all'",
  withInstances(async function (test, make) {
    Wormhole.init({ mode: 'all', mcp: false });
    test.throws(
      () => make({ mode: 'all', mcp: false, rest: { enabled: true, path: '/mi-all' } }),
      /already uses mode 'all'/,
    );
  }),
);

Tinytest.addAsync(
  "Multi-instance - resetting an opt-in instance keeps another instance's hook",
  withInstances(async function (test, make) {
    Wormhole.init({ mode: 'all', mcp: false });
    const app = make({ mode: 'opt-in', mcp: false, rest: { enabled: true, path: '/mi-keep' } });
    await app._reset();
    test.isTrue(isHooked());
    await Wormhole._reset();
    test.isFalse(isHooked());
  }),
);
