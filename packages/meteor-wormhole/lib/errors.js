import { Meteor } from 'meteor/meteor';
import { Match } from 'meteor/check';

const REASON_STATUS = [
  [/^(not-authorized|forbidden|permission-denied)$/, 403],
  [/^(unauthorized|not-logged-in|login-required|session-expired|invalid-code|invalid-token)$/, 401],
  [/-login-failed$/, 401],
  [/^(not-found|no-such-|missing-)|-not-found$/, 404],
  [/^(already-exists|account-exists|conflict|duplicate)/, 409],
  [/^(rate-limited|too-many-requests)$/, 429],
];

/**
 * Map an error thrown by a Meteor method to an HTTP status + JSON body.
 *
 * - `Match.Error` (from `check`)             → 400 validation-error
 * - `Meteor.Error` with numeric 4xx/5xx code → that status
 * - `Meteor.Error` with a known reason slug  → see REASON_STATUS
 * - other `Meteor.Error`                     → 400 (client-visible errors are
 *                                              client errors by convention)
 * - anything else                            → 500 (message hidden in production)
 *
 * @param {unknown} error
 * @param {object} [options]
 * @param {boolean} [options.production] - hide internal error messages
 * @returns {{ status: number, body: object }}
 */
export function errorToHttp(error, options = {}) {
  const production =
    options.production !== undefined ? options.production : Meteor.isProduction === true;

  if (Match && error instanceof Match.Error) {
    return {
      status: 400,
      body: {
        error: 'validation-error',
        reason: error.message,
        message: error.message,
      },
    };
  }

  if (error instanceof Meteor.Error) {
    const code = error.error;
    let status = 400;

    if (typeof code === 'number' && Number.isInteger(code) && code >= 400 && code <= 599) {
      status = code;
    } else if (typeof code === 'string') {
      for (const [pattern, mapped] of REASON_STATUS) {
        if (pattern.test(code)) {
          status = mapped;
          break;
        }
      }
    }

    const body = {
      error: typeof code === 'number' ? String(code) : code || 'meteor-error',
      reason: error.reason || error.message,
      message: error.message,
    };
    if (error.details !== undefined) body.details = error.details;
    return { status, body };
  }

  const message = error && error.message ? error.message : 'Unknown error';
  return {
    status: 500,
    body: {
      error: 'internal-error',
      message: production ? 'Internal server error' : message,
    },
  };
}
