import { Meteor } from 'meteor/meteor';
import { Tinytest } from 'meteor/tinytest';
import { invokeMethod, connectionFromRequest } from '../lib/invoke';

Meteor.methods({
  'invokeTest.whoami'() {
    return { userId: this.userId, isSimulation: this.isSimulation };
  },
  'invokeTest.connection'() {
    return {
      clientAddress: this.connection?.clientAddress ?? null,
      ua: this.connection?.httpHeaders?.['user-agent'] ?? null,
      wormhole: this.connection?.wormhole ?? false,
    };
  },
  'invokeTest.nested'() {
    // A method that calls another method must keep the same user
    return Meteor.callAsync('invokeTest.whoami');
  },
  'invokeTest.setUser'(id) {
    this.setUserId(id);
    return this.userId;
  },
  'invokeTest.requiresUser'() {
    if (!this.userId) throw new Meteor.Error('not-authorized', 'login required');
    return 'ok';
  },
});

const fakeReq = () => ({
  headers: { 'user-agent': 'tldr-app/1.0', 'x-forwarded-for': '203.0.113.7' },
  socket: { remoteAddress: '127.0.0.1' },
});

Tinytest.addAsync('Invoke - this.userId is the given user', async function (test) {
  const result = await invokeMethod('invokeTest.whoami', [], { userId: 'user-42' });
  test.equal(result.userId, 'user-42');
  test.isFalse(result.isSimulation);
});

Tinytest.addAsync('Invoke - anonymous invocation has null userId', async function (test) {
  const result = await invokeMethod('invokeTest.whoami', []);
  test.isNull(result.userId);
});

Tinytest.addAsync(
  'Invoke - this.connection carries request headers and client address',
  async function (test) {
    // Without a trusted proxy count the socket address wins over the spoofable
    // header. `meteor run` sets HTTP_FORWARDED_COUNT=1 for its dev proxy, so
    // unset it for this test and restore it afterwards.
    const previous = process.env.HTTP_FORWARDED_COUNT;
    delete process.env.HTTP_FORWARDED_COUNT;
    try {
      const result = await invokeMethod('invokeTest.connection', [], {
        userId: null,
        req: fakeReq(),
      });
      test.equal(result.clientAddress, '127.0.0.1');
      test.equal(result.ua, 'tldr-app/1.0');
      test.isTrue(result.wormhole);

      process.env.HTTP_FORWARDED_COUNT = '1';
      const proxied = await invokeMethod('invokeTest.connection', [], {
        userId: null,
        req: fakeReq(),
      });
      test.equal(proxied.clientAddress, '203.0.113.7');
    } finally {
      if (previous === undefined) delete process.env.HTTP_FORWARDED_COUNT;
      else process.env.HTTP_FORWARDED_COUNT = previous;
    }
  },
);

Tinytest.addAsync('Invoke - nested Meteor.callAsync inherits the user', async function (test) {
  const result = await invokeMethod('invokeTest.nested', [], { userId: 'user-99' });
  test.equal(result.userId, 'user-99');
});

Tinytest.addAsync(
  'Invoke - this.setUserId does not throw and updates this.userId',
  async function (test) {
    const result = await invokeMethod('invokeTest.setUser', ['new-user'], { userId: 'old' });
    test.equal(result, 'new-user');
  },
);

Tinytest.addAsync('Invoke - method errors propagate', async function (test) {
  let caught = null;
  try {
    await invokeMethod('invokeTest.requiresUser', [], { userId: null });
  } catch (e) {
    caught = e;
  }
  test.isTrue(caught instanceof Meteor.Error);
  test.equal(caught.error, 'not-authorized');
});

Tinytest.add('Invoke - connectionFromRequest returns null without a request', function (test) {
  test.isNull(connectionFromRequest(null));
  const conn = connectionFromRequest(fakeReq());
  test.isNull(conn.id);
  test.equal(typeof conn.close, 'function');
  test.equal(typeof conn.onClose, 'function');
});
