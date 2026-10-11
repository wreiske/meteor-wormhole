import { Meteor } from 'meteor/meteor';
import { DDP } from 'meteor/ddp-client';
import { DDPCommon } from 'meteor/ddp-common';
import { getClientAddress } from './auth';

/**
 * Build a minimal DDP-connection-like object for an HTTP request so that
 * methods reading `this.connection.clientAddress` / `httpHeaders` keep working.
 * @param {import('http').IncomingMessage|null} req
 */
export function connectionFromRequest(req) {
  if (!req) return null;
  return {
    id: null,
    close() {},
    onClose() {},
    clientAddress: getClientAddress(req),
    httpHeaders: req.headers || {},
    // Marker so apps can tell HTTP-originated calls apart from DDP sessions.
    wormhole: true,
  };
}

/**
 * Invoke a Meteor method on the server as a given user.
 *
 * `Meteor.callAsync` on the server inherits `userId`, `setUserId` and
 * `connection` from the current method invocation (ddp-server `applyAsync`),
 * so we run it inside a synthetic invocation that carries the HTTP caller.
 *
 * @param {string} methodName
 * @param {unknown[]} args
 * @param {object} [context]
 * @param {string|null} [context.userId]
 * @param {import('http').IncomingMessage|null} [context.req]
 * @returns {Promise<unknown>}
 */
export async function invokeMethod(methodName, args = [], context = {}) {
  const userId = context.userId || null;
  const state = { userId };

  const invocation = new DDPCommon.MethodInvocation({
    isSimulation: false,
    userId,
    setUserId(newUserId) {
      // Login-style methods may call this.setUserId(); record it so callers
      // can observe the change (there is no DDP session to update).
      state.userId = newUserId;
    },
    unblock() {},
    connection: connectionFromRequest(context.req || null),
    randomSeed: null,
  });

  const result = await DDP._CurrentMethodInvocation.withValue(invocation, () =>
    Meteor.callAsync(methodName, ...args),
  );

  return result;
}
