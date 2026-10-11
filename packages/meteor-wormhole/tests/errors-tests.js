import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';
import { Tinytest } from 'meteor/tinytest';
import { errorToHttp } from '../lib/errors';

Tinytest.add('Errors - Match.Error maps to 400 validation-error', function (test) {
  let err;
  try {
    check({ a: 1 }, { a: String });
  } catch (e) {
    err = e;
  }
  test.isTrue(err instanceof Match.Error);
  const { status, body } = errorToHttp(err);
  test.equal(status, 400);
  test.equal(body.error, 'validation-error');
  test.isTrue(body.message.length > 0);
});

Tinytest.add('Errors - numeric Meteor.Error codes become the HTTP status', function (test) {
  test.equal(errorToHttp(new Meteor.Error(404, 'nope')).status, 404);
  test.equal(errorToHttp(new Meteor.Error(418, 'teapot')).status, 418);
  test.equal(errorToHttp(new Meteor.Error(503, 'down')).status, 503);
  test.equal(errorToHttp(new Meteor.Error(404, 'nope')).body.error, '404');
  // out of range numbers fall back to 400
  test.equal(errorToHttp(new Meteor.Error(42, 'weird')).status, 400);
});

Tinytest.add('Errors - well-known reason slugs map to statuses', function (test) {
  const cases = [
    ['not-authorized', 403],
    ['forbidden', 403],
    ['unauthorized', 401],
    ['not-logged-in', 401],
    ['session-expired', 401],
    ['invalid-code', 401],
    ['google-login-failed', 401],
    ['apple-login-failed', 401],
    ['not-found', 404],
    ['no-such-article', 404],
    ['article-not-found', 404],
    ['account-exists', 409],
    ['already-exists', 409],
    ['rate-limited', 429],
    ['too-many-requests', 429],
    ['some-app-error', 400],
    // `missing-*` is a validation failure, not a missing resource
    ['missing-id', 400],
    ['missing-argument', 400],
  ];
  for (const [code, expected] of cases) {
    const { status, body } = errorToHttp(new Meteor.Error(code, `reason for ${code}`));
    test.equal(status, expected, `status for ${code}`);
    test.equal(body.error, code);
    test.equal(body.reason, `reason for ${code}`);
  }
});

Tinytest.add('Errors - Meteor.Error details are passed through', function (test) {
  const { body } = errorToHttp(new Meteor.Error('validation', 'bad', { field: 'email' }));
  test.equal(body.details, { field: 'email' });
});

Tinytest.add('Errors - generic errors are 500 and hidden in production', function (test) {
  const dev = errorToHttp(new Error('db exploded'), { production: false });
  test.equal(dev.status, 500);
  test.equal(dev.body.error, 'internal-error');
  test.equal(dev.body.message, 'db exploded');

  const prod = errorToHttp(new Error('db exploded'), { production: true });
  test.equal(prod.status, 500);
  test.equal(prod.body.message, 'Internal server error');

  const weird = errorToHttp('a string', { production: false });
  test.equal(weird.status, 500);
  test.equal(weird.body.message, 'Unknown error');
});
