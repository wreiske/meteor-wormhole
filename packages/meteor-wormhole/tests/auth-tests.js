import { Tinytest } from 'meteor/tinytest';
import {
  extractBearer,
  normalizeAuthOptions,
  createAccountsTokenResolver,
  resolveRequestAuth,
  checkAccess,
  getClientAddress,
} from '../lib/auth';

/** Run `fn` with HTTP_FORWARDED_COUNT set to `value` (undefined = unset), then restore it */
function withForwardedCount(value, fn) {
  const previous = process.env.HTTP_FORWARDED_COUNT;
  if (value === undefined) delete process.env.HTTP_FORWARDED_COUNT;
  else process.env.HTTP_FORWARDED_COUNT = value;
  try {
    return fn();
  } finally {
    if (previous === undefined) delete process.env.HTTP_FORWARDED_COUNT;
    else process.env.HTTP_FORWARDED_COUNT = previous;
  }
}

const req = (headers = {}, extra = {}) => ({
  headers,
  socket: { remoteAddress: '10.0.0.9' },
  ...extra,
});

// --- extractBearer ---

Tinytest.add('Auth - extractBearer returns token from Authorization header', function (test) {
  test.equal(extractBearer(req({ authorization: 'Bearer abc123' })), 'abc123');
  test.equal(extractBearer(req({ authorization: 'bearer   xyz ' })), 'xyz');
});

Tinytest.add('Auth - extractBearer returns null without a Bearer header', function (test) {
  test.isNull(extractBearer(req({})));
  test.isNull(extractBearer(req({ authorization: 'Basic abc' })));
  test.isNull(extractBearer({}));
  test.isNull(extractBearer(null));
});

// --- getClientAddress ---

Tinytest.add(
  'Auth - getClientAddress ignores proxy headers without a trusted proxy count',
  function (test) {
    // Same trust model as Meteor's DDP server: a spoofed header must not win.
    // (`meteor run` sets HTTP_FORWARDED_COUNT=1 for its dev proxy, so unset it here.)
    withForwardedCount(undefined, () => {
      test.equal(getClientAddress(req({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })), '10.0.0.9');
      test.equal(getClientAddress(req({ 'cf-connecting-ip': '9.9.9.9' })), '10.0.0.9');
      test.equal(getClientAddress(req({ 'x-real-ip': '8.8.8.8' })), '10.0.0.9');
      test.equal(getClientAddress(req({})), '10.0.0.9');
    });
    // An explicit count of 0 wins over the environment
    withForwardedCount('1', () => {
      test.equal(
        getClientAddress(req({ 'x-forwarded-for': '1.2.3.4' }), { forwardedCount: 0 }),
        '10.0.0.9',
      );
    });
  },
);

Tinytest.add(
  'Auth - getClientAddress uses the Nth-from-last X-Forwarded-For entry',
  function (test) {
    const r = req({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8, 9.9.9.9' });
    test.equal(getClientAddress(r, { forwardedCount: 1 }), '9.9.9.9');
    test.equal(getClientAddress(r, { forwardedCount: 2 }), '5.6.7.8');
    test.equal(getClientAddress(r, { forwardedCount: 3 }), '1.2.3.4');
    // Fewer hops than trusted proxies, or no header at all → unknown (null), like Meteor
    test.isNull(getClientAddress(r, { forwardedCount: 4 }));
    test.isNull(getClientAddress(req({}), { forwardedCount: 1 }));
  },
);

Tinytest.add(
  'Auth - getClientAddress reads HTTP_FORWARDED_COUNT from the environment',
  function (test) {
    withForwardedCount('1', () => {
      test.equal(getClientAddress(req({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })), '5.6.7.8');
    });
    withForwardedCount('2', () => {
      test.equal(getClientAddress(req({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })), '1.2.3.4');
    });
  },
);

// --- normalizeAuthOptions ---

Tinytest.add('Auth - normalizeAuthOptions handles every input form', function (test) {
  test.equal(normalizeAuthOptions(undefined), { enabled: false, resolveUser: null });
  test.equal(normalizeAuthOptions(false), { enabled: false, resolveUser: null });
  test.equal(normalizeAuthOptions(true), { enabled: true, resolveUser: null });
  test.equal(normalizeAuthOptions({ accounts: true }), { enabled: true, resolveUser: null });
  test.equal(normalizeAuthOptions({}), { enabled: false, resolveUser: null });
  const fn = async () => 'u1';
  const custom = normalizeAuthOptions({ resolveUser: fn });
  test.isTrue(custom.enabled);
  test.equal(custom.resolveUser, fn);
  test.throws(() => normalizeAuthOptions('yes'), /boolean or an object/);
});

// --- createAccountsTokenResolver (injected fakes) ---

function fakeAccounts({ lifetimeMs = 1000 * 60 * 60 * 24 * 30 } = {}) {
  return {
    _hashLoginToken: (t) => `hashed(${t})`,
    _getTokenLifetimeMs: () => lifetimeMs,
  };
}

function fakeUsers(docs) {
  return {
    async findOneAsync(selector) {
      const hashed = selector['services.resume.loginTokens.hashedToken'];
      for (const doc of docs) {
        const match = (doc.services?.resume?.loginTokens || []).find(
          (t) => t.hashedToken === hashed,
        );
        if (match) {
          // emulate the positional projection: only the matching token comes back
          return { _id: doc._id, services: { resume: { loginTokens: [match] } } };
        }
      }
      return null;
    },
  };
}

Tinytest.addAsync('Auth - accounts resolver maps a valid token to its user', async function (test) {
  const users = fakeUsers([
    {
      _id: 'u1',
      services: { resume: { loginTokens: [{ hashedToken: 'hashed(tok1)', when: new Date() }] } },
    },
  ]);
  const resolve = createAccountsTokenResolver({ Accounts: fakeAccounts(), users });
  test.equal(await resolve('tok1'), 'u1');
});

Tinytest.addAsync(
  'Auth - accounts resolver rejects unknown and expired tokens',
  async function (test) {
    const old = new Date(Date.now() - 1000 * 60 * 60 * 24 * 31);
    const users = fakeUsers([
      {
        _id: 'u1',
        services: { resume: { loginTokens: [{ hashedToken: 'hashed(old)', when: old }] } },
      },
    ]);
    const resolve = createAccountsTokenResolver({ Accounts: fakeAccounts(), users });
    test.isNull(await resolve('nope'));
    test.isNull(await resolve('old'));
    test.isNull(await resolve(''));
    test.isNull(await resolve(null));
  },
);

Tinytest.add(
  'Auth - accounts resolver throws without accounts-base and without injected deps',
  function (test) {
    if (Package['accounts-base']) {
      // accounts-base present in this test app: constructor must not throw
      createAccountsTokenResolver();
      test.isTrue(true);
    } else {
      test.throws(() => createAccountsTokenResolver(), /accounts-base/);
    }
  },
);

// --- resolveRequestAuth ---

Tinytest.addAsync(
  'Auth - resolveRequestAuth: none / apiKey / invalid / session',
  async function (test) {
    const base = {
      apiKey: 'svc',
      auth: { enabled: true, resolveUser: null },
      tokenResolver: async (t) => (t === 'good' ? 'u7' : null),
    };

    test.equal(await resolveRequestAuth(req({}), base), {
      kind: 'none',
      userId: null,
      token: null,
    });
    test.equal(await resolveRequestAuth(req({ authorization: 'Bearer svc' }), base), {
      kind: 'apiKey',
      userId: null,
      token: 'svc',
    });
    test.equal(await resolveRequestAuth(req({ authorization: 'Bearer good' }), base), {
      kind: 'session',
      userId: 'u7',
      token: 'good',
    });
    test.equal(await resolveRequestAuth(req({ authorization: 'Bearer bad' }), base), {
      kind: 'invalid',
      userId: null,
      token: 'bad',
    });
  },
);

Tinytest.addAsync('Auth - resolveRequestAuth prefers a custom resolveUser', async function (test) {
  let seen = null;
  const options = {
    apiKey: null,
    auth: {
      enabled: true,
      resolveUser: async (r) => {
        seen = r.headers.authorization;
        return 'custom-user';
      },
    },
    tokenResolver: async () => 'should-not-be-used',
  };
  const result = await resolveRequestAuth(req({ authorization: 'Bearer whatever' }), options);
  test.equal(result.kind, 'session');
  test.equal(result.userId, 'custom-user');
  test.equal(seen, 'Bearer whatever');
});

Tinytest.addAsync(
  'Auth - resolveRequestAuth treats a throwing resolver as invalid',
  async function (test) {
    const options = {
      apiKey: null,
      auth: {
        enabled: true,
        resolveUser: async () => {
          throw new Error('db down');
        },
      },
    };
    const result = await resolveRequestAuth(req({ authorization: 'Bearer x' }), options);
    test.equal(result.kind, 'invalid');
    test.isNull(result.userId);
  },
);

Tinytest.addAsync(
  'Auth - resolveRequestAuth with auth disabled: non-apiKey bearer is invalid',
  async function (test) {
    const options = { apiKey: 'svc', auth: { enabled: false, resolveUser: null } };
    test.equal(
      (await resolveRequestAuth(req({ authorization: 'Bearer other' }), options)).kind,
      'invalid',
    );
    test.equal(
      (await resolveRequestAuth(req({ authorization: 'Bearer svc' }), options)).kind,
      'apiKey',
    );
  },
);

// --- checkAccess ---

const NONE = { kind: 'none', userId: null };
const INVALID = { kind: 'invalid', userId: null };
const KEY = { kind: 'apiKey', userId: null };
const SESSION = { kind: 'session', userId: 'u1' };

Tinytest.add('Auth - checkAccess: required policy needs a session', function (test) {
  test.equal(checkAccess(NONE, 'required').status, 401);
  test.equal(checkAccess(INVALID, 'required').status, 401);
  test.equal(checkAccess(KEY, 'required').status, 401);
  test.isNull(checkAccess(SESSION, 'required'));
});

Tinytest.add(
  'Auth - checkAccess: optional policy without apiKey allows anonymous',
  function (test) {
    test.isNull(checkAccess(NONE, 'optional', { apiKey: null }));
    test.isNull(checkAccess(SESSION, 'optional', { apiKey: null }));
    test.equal(checkAccess(INVALID, 'optional', { apiKey: null }).status, 401);
  },
);

Tinytest.add(
  'Auth - checkAccess: apiKey gate rejects anonymous, allows key or session',
  function (test) {
    test.equal(checkAccess(NONE, 'optional', { apiKey: 'svc' }).status, 401);
    test.isNull(checkAccess(KEY, 'optional', { apiKey: 'svc' }));
    test.isNull(checkAccess(SESSION, 'optional', { apiKey: 'svc' }));
  },
);

Tinytest.add(
  'Auth - checkAccess: none policy bypasses the apiKey gate but not invalid tokens',
  function (test) {
    test.isNull(checkAccess(NONE, 'none', { apiKey: 'svc' }));
    test.isNull(checkAccess(SESSION, 'none', { apiKey: 'svc' }));
    test.equal(checkAccess(INVALID, 'none', { apiKey: 'svc' }).status, 401);
  },
);
