import { Tinytest } from 'meteor/tinytest';
import { MethodRegistry } from '../lib/registry';

Tinytest.add('Registry - register and retrieve a method', function (test) {
  const reg = new MethodRegistry();
  reg.register('test.method', { description: 'A test method' });

  test.isTrue(reg.has('test.method'));
  test.equal(reg.get('test.method').description, 'A test method');
});

Tinytest.add('Registry - register with default description', function (test) {
  const reg = new MethodRegistry();
  reg.register('foo.bar');

  test.equal(reg.get('foo.bar').description, 'Meteor method: foo.bar');
});

Tinytest.add('Registry - register with inputSchema', function (test) {
  const reg = new MethodRegistry();
  const schema = { type: 'object', properties: { name: { type: 'string' } } };
  reg.register('with.schema', { inputSchema: schema });

  test.equal(reg.get('with.schema').inputSchema, schema);
});

Tinytest.add('Registry - unregister removes method', function (test) {
  const reg = new MethodRegistry();
  reg.register('to.remove');
  test.isTrue(reg.has('to.remove'));

  const result = reg.unregister('to.remove');
  test.isTrue(result);
  test.isFalse(reg.has('to.remove'));
  test.equal(reg.get('to.remove'), null);
});

Tinytest.add('Registry - unregister non-existent returns false', function (test) {
  const reg = new MethodRegistry();
  test.isFalse(reg.unregister('does.not.exist'));
});

Tinytest.add('Registry - getAll returns all methods', function (test) {
  const reg = new MethodRegistry();
  reg.register('a');
  reg.register('b');
  reg.register('c');

  const all = reg.getAll();
  test.equal(all.size, 3);
  test.isTrue(all.has('a'));
  test.isTrue(all.has('b'));
  test.isTrue(all.has('c'));
});

Tinytest.add('Registry - getAll returns a copy', function (test) {
  const reg = new MethodRegistry();
  reg.register('x');

  const all = reg.getAll();
  all.delete('x');

  // Original should still have it
  test.isTrue(reg.has('x'));
});

Tinytest.add('Registry - size tracks count', function (test) {
  const reg = new MethodRegistry();
  test.equal(reg.size(), 0);

  reg.register('a');
  test.equal(reg.size(), 1);

  reg.register('b');
  test.equal(reg.size(), 2);

  reg.unregister('a');
  test.equal(reg.size(), 1);
});

Tinytest.add('Registry - clear removes everything', function (test) {
  const reg = new MethodRegistry();
  reg.register('a');
  reg.register('b');
  reg.clear();

  test.equal(reg.size(), 0);
  test.isFalse(reg.has('a'));
  test.isFalse(reg.has('b'));
});

Tinytest.add('Registry - names returns method names', function (test) {
  const reg = new MethodRegistry();
  reg.register('todo.add');
  reg.register('todo.remove');

  const names = reg.names();
  test.equal(names.length, 2);
  test.isTrue(names.includes('todo.add'));
  test.isTrue(names.includes('todo.remove'));
});

Tinytest.add('Registry - overwrite replaces entry', function (test) {
  const reg = new MethodRegistry();
  reg.register('method', { description: 'v1' });
  test.equal(reg.get('method').description, 'v1');

  reg.register('method', { description: 'v2' });
  test.equal(reg.get('method').description, 'v2');
  test.equal(reg.size(), 1);
});

Tinytest.add('Registry - onChange fires on register', function (test) {
  const reg = new MethodRegistry();
  let notified = false;
  let notifiedEvent = null;

  reg.onChange((event, _name) => {
    notified = true;
    notifiedEvent = event;
  });

  reg.register('observed');
  test.isTrue(notified);
  test.equal(notifiedEvent, 'register');
});

Tinytest.add('Registry - onChange fires on unregister', function (test) {
  const reg = new MethodRegistry();
  reg.register('to.watch');
  let notifiedEvent = null;

  reg.onChange((event) => {
    notifiedEvent = event;
  });
  reg.unregister('to.watch');

  test.equal(notifiedEvent, 'unregister');
});

Tinytest.add('Registry - onChange fires on clear', function (test) {
  const reg = new MethodRegistry();
  reg.register('x');
  let notifiedEvent = null;

  reg.onChange((event) => {
    notifiedEvent = event;
  });
  reg.clear();

  test.equal(notifiedEvent, 'clear');
});

Tinytest.add('Registry - onChange can be unsubscribed', function (test) {
  const reg = new MethodRegistry();
  let count = 0;

  const unsub = reg.onChange(() => {
    count++;
  });
  reg.register('a');
  test.equal(count, 1);

  unsub();
  reg.register('b');
  test.equal(count, 1); // No increment after unsubscribe
});

Tinytest.add('Registry - registeredAt timestamp is set', function (test) {
  const reg = new MethodRegistry();
  const before = Date.now();
  reg.register('timed');
  const entry = reg.get('timed');

  test.isTrue(entry.registeredAt >= before);
  test.isTrue(entry.registeredAt <= Date.now());
});

// --- Additional edge cases ---

Tinytest.add('Registry - get returns null for non-existent method', function (test) {
  const reg = new MethodRegistry();
  test.equal(reg.get('does.not.exist'), null);
});

Tinytest.add('Registry - has returns false for non-existent method', function (test) {
  const reg = new MethodRegistry();
  test.isFalse(reg.has('nonexistent'));
});

Tinytest.add('Registry - names returns empty array when empty', function (test) {
  const reg = new MethodRegistry();
  test.equal(reg.names().length, 0);
});

Tinytest.add('Registry - register with null inputSchema stores null', function (test) {
  const reg = new MethodRegistry();
  reg.register('method', { inputSchema: null });
  test.equal(reg.get('method').inputSchema, null);
});

Tinytest.add('Registry - register with no options uses defaults', function (test) {
  const reg = new MethodRegistry();
  reg.register('default.method');
  const entry = reg.get('default.method');
  test.equal(entry.description, 'Meteor method: default.method');
  test.equal(entry.inputSchema, null);
  test.isTrue(typeof entry.registeredAt === 'number');
});

Tinytest.add('Registry - multiple listeners all get notified', function (test) {
  const reg = new MethodRegistry();
  let count1 = 0;
  let count2 = 0;

  reg.onChange(() => {
    count1++;
  });
  reg.onChange(() => {
    count2++;
  });

  reg.register('multi');
  test.equal(count1, 1);
  test.equal(count2, 1);
});

Tinytest.add('Registry - listener error does not break other listeners', function (test) {
  const reg = new MethodRegistry();
  let secondCalled = false;

  reg.onChange(() => {
    throw new Error('bad listener');
  });
  reg.onChange(() => {
    secondCalled = true;
  });

  reg.register('error.test');
  test.isTrue(secondCalled, 'Second listener should still be called');
});

Tinytest.add('Registry - unregister does not fire onChange for non-existent', function (test) {
  const reg = new MethodRegistry();
  let notified = false;

  reg.onChange(() => {
    notified = true;
  });
  reg.unregister('nonexistent');
  test.isFalse(notified);
});

Tinytest.add('Registry - clear on empty registry fires onChange', function (test) {
  const reg = new MethodRegistry();
  let notified = false;

  reg.onChange(() => {
    notified = true;
  });
  reg.clear();
  test.isTrue(notified);
});
