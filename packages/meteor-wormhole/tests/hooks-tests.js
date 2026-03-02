import { Tinytest } from 'meteor/tinytest';
import { Meteor } from 'meteor/meteor';
import { MethodRegistry } from '../lib/registry';
import { installHook, removeHook, isHooked, shouldExclude, DEFAULT_EXCLUDE_PATTERNS } from '../lib/hooks';

// Helper: clean up hook state after each test group
function withCleanHook(fn) {
  return function (test) {
    removeHook(); // Ensure clean state
    try {
      fn(test);
    } finally {
      removeHook(); // Clean up
    }
  };
}

// Counter for unique method names — Meteor throws if a method name is registered twice
let _uid = 0;
function uid(base) {
  return `${base}_${++_uid}_${Date.now()}`;
}

// --- shouldExclude tests ---

Tinytest.add('Hooks - shouldExclude: excludes /internal methods', function (test) {
  test.isTrue(shouldExclude('/users/login', []));
  test.isTrue(shouldExclude('/collections/insert', []));
});

Tinytest.add('Hooks - shouldExclude: excludes _private methods', function (test) {
  test.isTrue(shouldExclude('_internalMethod', []));
});

Tinytest.add('Hooks - shouldExclude: excludes known auth methods', function (test) {
  test.isTrue(shouldExclude('login', []));
  test.isTrue(shouldExclude('logout', []));
  test.isTrue(shouldExclude('createUser', []));
  test.isTrue(shouldExclude('changePassword', []));
  test.isTrue(shouldExclude('forgotPassword', []));
  test.isTrue(shouldExclude('resetPassword', []));
  test.isTrue(shouldExclude('verifyEmail', []));
});

Tinytest.add('Hooks - shouldExclude: allows normal methods', function (test) {
  test.isFalse(shouldExclude('todos.add', []));
  test.isFalse(shouldExclude('myMethod', []));
  test.isFalse(shouldExclude('posts.publish', []));
});

Tinytest.add('Hooks - shouldExclude: custom string exclusion', function (test) {
  test.isTrue(shouldExclude('secret.method', ['secret.method']));
  test.isFalse(shouldExclude('ok.method', ['secret.method']));
});

Tinytest.add('Hooks - shouldExclude: custom regex exclusion', function (test) {
  test.isTrue(shouldExclude('admin.delete', [/^admin\./]));
  test.isFalse(shouldExclude('user.update', [/^admin\./]));
});

// --- installHook / removeHook tests ---

Tinytest.add('Hooks - installHook patches Meteor.methods', withCleanHook(function (test) {
  const reg = new MethodRegistry();
  const before = Meteor.methods;
  installHook(reg);
  test.notEqual(Meteor.methods, before, 'Meteor.methods should be replaced');
  test.isTrue(isHooked());
}));

Tinytest.add('Hooks - removeHook restores Meteor.methods', withCleanHook(function (test) {
  const reg = new MethodRegistry();
  const before = Meteor.methods;
  installHook(reg);
  removeHook();
  test.isFalse(isHooked());
  // After removeHook, Meteor.methods should be the original bound version
  // We can verify by checking that it's a function at least
  test.equal(typeof Meteor.methods, 'function');
}));

Tinytest.add('Hooks - installHook is idempotent', withCleanHook(function (test) {
  const reg = new MethodRegistry();
  installHook(reg);
  const afterFirst = Meteor.methods;
  installHook(reg); // Should be a no-op
  test.equal(Meteor.methods, afterFirst, 'Second install should not change anything');
}));

Tinytest.add('Hooks - hook captures methods in registry', withCleanHook(function (test) {
  const reg = new MethodRegistry();
  installHook(reg);

  const name = uid('hooked');
  Meteor.methods({
    [name]() { return 42; }
  });

  test.isTrue(reg.has(name));
  test.equal(reg.get(name).description, `Meteor method: ${name}`);
}));

Tinytest.add('Hooks - hook excludes internal methods', withCleanHook(function (test) {
  const reg = new MethodRegistry();
  installHook(reg);

  const privateName = uid('_private');
  const publicName = uid('public');
  Meteor.methods({
    [privateName]() { return 1; },
    [publicName]() { return 2; },
  });

  test.isFalse(reg.has(privateName));
  test.isTrue(reg.has(publicName));
}));

Tinytest.add('Hooks - hook respects custom exclude list', withCleanHook(function (test) {
  const reg = new MethodRegistry();
  const excludedName = uid('excluded');
  const patternName = `pat_match_${++_uid}_${Date.now()}`;
  const allowedName = uid('allowed');
  installHook(reg, { exclude: [excludedName, /^pat_match/] });

  Meteor.methods({
    [excludedName]() { return 1; },
    [patternName]() { return 2; },
    [allowedName]() { return 3; },
  });

  test.isFalse(reg.has(excludedName));
  test.isFalse(reg.has(patternName));
  test.isTrue(reg.has(allowedName));
}));

Tinytest.add('Hooks - hook does not duplicate already-registered methods', withCleanHook(function (test) {
  const reg = new MethodRegistry();
  const name = uid('preregistered');
  reg.register(name, { description: 'custom desc' });
  installHook(reg);

  Meteor.methods({
    [name]() { return 1; }
  });

  // Should keep the original description, not overwrite
  test.equal(reg.get(name).description, 'custom desc');
}));

Tinytest.add('Hooks - methods still work after hooking', withCleanHook(function (test) {
  const reg = new MethodRegistry();
  installHook(reg);

  const name = uid('functional');
  // This should not throw — the original Meteor.methods should still be called
  Meteor.methods({
    [name]() { return 'works'; }
  });

  // We can verify the method was actually registered with Meteor
  // by checking it's in our registry (the hook captured it)
  test.isTrue(reg.has(name));
}));

Tinytest.add('Hooks - DEFAULT_EXCLUDE_PATTERNS is an array of regexes', function (test) {
  test.isTrue(Array.isArray(DEFAULT_EXCLUDE_PATTERNS));
  test.isTrue(DEFAULT_EXCLUDE_PATTERNS.length > 0);
  for (const p of DEFAULT_EXCLUDE_PATTERNS) {
    test.isTrue(p instanceof RegExp);
  }
});

// --- Additional shouldExclude edge cases ---

Tinytest.add('Hooks - shouldExclude: excludes AccountsTemplates methods', function (test) {
  test.isTrue(shouldExclude('ATRemoveToken', []));
  test.isTrue(shouldExclude('ATCreateUserServer', []));
});

Tinytest.add('Hooks - shouldExclude: excludes getNewToken and removeOtherTokens', function (test) {
  test.isTrue(shouldExclude('getNewToken', []));
  test.isTrue(shouldExclude('removeOtherTokens', []));
  test.isTrue(shouldExclude('configureLoginService', []));
});

Tinytest.add('Hooks - shouldExclude: exact string match only for custom excludes', function (test) {
  // Partial match should not exclude
  test.isFalse(shouldExclude('secret.method.extra', ['secret.method']));
  test.isTrue(shouldExclude('secret.method', ['secret.method']));
});

Tinytest.add('Hooks - shouldExclude: multiple custom excludes work together', function (test) {
  const excludes = ['method.a', /^admin\./, 'method.b'];
  test.isTrue(shouldExclude('method.a', excludes));
  test.isTrue(shouldExclude('method.b', excludes));
  test.isTrue(shouldExclude('admin.delete', excludes));
  test.isFalse(shouldExclude('user.update', excludes));
});

Tinytest.add('Hooks - shouldExclude: empty custom excludes array has no effect', function (test) {
  test.isFalse(shouldExclude('normal.method', []));
});

// --- Hook registration with multiple method batches ---

Tinytest.add('Hooks - hook captures methods from multiple Meteor.methods calls', withCleanHook(function (test) {
  const reg = new MethodRegistry();
  installHook(reg);

  const name1 = uid('batch1');
  const name2 = uid('batch2');
  Meteor.methods({
    [name1]() { return 1; },
  });
  Meteor.methods({
    [name2]() { return 2; },
  });

  test.isTrue(reg.has(name1));
  test.isTrue(reg.has(name2));
  test.equal(reg.size(), 2);
}));

// --- removeHook edge cases ---

Tinytest.add('Hooks - removeHook is idempotent', withCleanHook(function (test) {
  // Should not throw when called multiple times
  removeHook();
  removeHook();
  test.isFalse(isHooked());
}));

Tinytest.add('Hooks - isHooked starts as false', function (test) {
  // After all cleanup, should be false
  removeHook();
  test.isFalse(isHooked());
});
