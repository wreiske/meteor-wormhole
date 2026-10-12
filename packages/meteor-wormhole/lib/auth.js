import { Meteor } from 'meteor/meteor';

/**
 * Extract a Bearer token from the Authorization header.
 * @param {import('http').IncomingMessage} req
 * @returns {string|null}
 */
export function extractBearer(req) {
  const header = req?.headers?.authorization;
  if (!header || typeof header !== 'string') return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/**
 * Client IP using the same trust model as Meteor's DDP server: proxy headers
 * are only honoured when `HTTP_FORWARDED_COUNT` says how many trusted proxies
 * sit in front of the app, otherwise the socket address is used. Taking the
 * first `X-Forwarded-For` entry unconditionally would let any caller spoof
 * its address (and bypass IP-based rate limits in `onBeforeInvoke`).
 *
 * @param {import('http').IncomingMessage} req
 * @param {object} [options]
 * @param {number} [options.forwardedCount] - trusted proxy count (defaults to
 *   `process.env.HTTP_FORWARDED_COUNT`)
 * @returns {string|null}
 */
export function getClientAddress(req, options = {}) {
  const forwardedCount =
    options.forwardedCount !== undefined
      ? Number(options.forwardedCount) || 0
      : parseInt(process.env.HTTP_FORWARDED_COUNT, 10) || 0;
  const socketAddress = req?.socket?.remoteAddress || null;
  if (forwardedCount <= 0) return socketAddress;

  const header = req?.headers?.['x-forwarded-for'];
  const raw = Array.isArray(header) ? header.join(',') : header;
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  const chain = raw.trim().split(/\s*,\s*/);
  if (chain.length < forwardedCount) return null;
  return chain[chain.length - forwardedCount];
}

/**
 * Normalize the `auth` init option.
 *
 *   auth: false | undefined  → session auth disabled (legacy behaviour)
 *   auth: true               → built-in Meteor Accounts login-token resolver
 *   auth: { resolveUser }    → custom resolver `(req) => Promise<string|null>`
 *   auth: { accounts: true } → same as `true`
 *
 * @param {boolean|object|undefined} input
 * @returns {{ enabled: boolean, resolveUser: null|((req) => Promise<string|null>) }}
 */
export function normalizeAuthOptions(input) {
  if (!input) return { enabled: false, resolveUser: null };
  if (input === true) return { enabled: true, resolveUser: null };
  if (typeof input === 'object') {
    if (typeof input.resolveUser === 'function') {
      return { enabled: true, resolveUser: input.resolveUser };
    }
    if (input.accounts === true || input.enabled === true) {
      return { enabled: true, resolveUser: null };
    }
    return { enabled: false, resolveUser: null };
  }
  throw new Error('Wormhole `auth` option must be a boolean or an object');
}

/**
 * Build a resolver that maps a Meteor login token to a user id using
 * accounts-base. Dependencies are injectable so the resolver can be unit
 * tested without the accounts-base package.
 *
 * @param {object} [deps]
 * @param {object} [deps.Accounts] - accounts-base `Accounts` (defaults to Package['accounts-base'])
 * @param {object} [deps.users]    - users collection (defaults to Meteor.users)
 * @returns {(token: string) => Promise<string|null>}
 */
export function createAccountsTokenResolver(deps = {}) {
  const Accounts = deps.Accounts || (Package['accounts-base'] && Package['accounts-base'].Accounts);
  if (!Accounts) {
    throw new Error(
      'Wormhole `auth: true` requires the accounts-base package (or pass auth.resolveUser)',
    );
  }
  const users = deps.users || Meteor.users;

  return async function resolveLoginToken(token) {
    if (!token || typeof token !== 'string') return null;
    const hashedToken = Accounts._hashLoginToken(token);
    const user = await users.findOneAsync(
      { 'services.resume.loginTokens.hashedToken': hashedToken },
      { fields: { _id: 1, 'services.resume.loginTokens.$': 1 } },
    );
    if (!user) return null;

    const entry = user.services?.resume?.loginTokens?.[0];
    const lifetimeMs =
      typeof Accounts._getTokenLifetimeMs === 'function' ? Accounts._getTokenLifetimeMs() : null;
    if (entry?.when && lifetimeMs) {
      const when =
        entry.when instanceof Date ? entry.when.getTime() : new Date(entry.when).getTime();
      if (Number.isFinite(when) && when + lifetimeMs < Date.now()) {
        return null; // expired but not yet purged
      }
    }
    return user._id;
  };
}

/**
 * Resolve the caller of an HTTP request.
 *
 * Result kinds:
 *   'apiKey'  – Bearer token matched the configured apiKey (service caller)
 *   'session' – Bearer token resolved to a user id
 *   'invalid' – Bearer token present but matched nothing
 *   'none'    – no credentials presented
 *
 * @param {import('http').IncomingMessage} req
 * @param {object} options
 * @param {string|null} [options.apiKey]
 * @param {{enabled: boolean, resolveUser: Function|null}} [options.auth]
 * @param {Function} [options.tokenResolver] - fallback `(token) => Promise<string|null>` when no custom resolveUser
 * @returns {Promise<{kind: string, userId: string|null, token: string|null}>}
 */
export async function resolveRequestAuth(req, options = {}) {
  const token = extractBearer(req);
  if (!token) return { kind: 'none', userId: null, token: null };

  if (options.apiKey && token === options.apiKey) {
    return { kind: 'apiKey', userId: null, token };
  }

  const auth = options.auth && options.auth.enabled ? options.auth : null;
  if (!auth) return { kind: 'invalid', userId: null, token };

  let userId = null;
  try {
    if (auth.resolveUser) {
      userId = await auth.resolveUser(req);
    } else if (options.tokenResolver) {
      userId = await options.tokenResolver(token);
    }
  } catch (err) {
    console.error('[Wormhole] auth resolver threw:', err);
    userId = null;
  }

  if (typeof userId === 'string' && userId.length > 0) {
    return { kind: 'session', userId, token };
  }
  return { kind: 'invalid', userId: null, token };
}

/**
 * Decide whether a resolved auth satisfies a method's policy and the global
 * apiKey gate. Returns null when allowed, otherwise `{ status, error, message }`.
 *
 * @param {{kind: string, userId: string|null}} auth
 * @param {'required'|'optional'|'none'} policy
 * @param {{ apiKey?: string|null }} options
 */
export function checkAccess(auth, policy, options = {}) {
  const effectivePolicy = policy || 'optional';

  if (effectivePolicy === 'required' && auth.kind !== 'session') {
    return {
      status: 401,
      error: 'unauthorized',
      message:
        auth.kind === 'invalid'
          ? 'Invalid or expired session token'
          : 'This method requires a signed-in user (Authorization: Bearer <login token>)',
    };
  }

  if (auth.kind === 'invalid') {
    return { status: 401, error: 'unauthorized', message: 'Invalid or missing API key' };
  }

  // Global gate: when an apiKey is configured, anonymous callers are rejected
  // unless the method explicitly opts out of credentials.
  if (options.apiKey && auth.kind === 'none' && effectivePolicy !== 'none') {
    return { status: 401, error: 'unauthorized', message: 'Invalid or missing API key' };
  }

  return null;
}
