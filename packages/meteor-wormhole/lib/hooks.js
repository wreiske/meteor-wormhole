import { Meteor } from 'meteor/meteor';

const _originalMethods = Meteor.methods.bind(Meteor);
let _hooked = false;
let _registry = null;
let _excludePatterns = [];

// Default patterns: exclude internal/private/accounts methods
const DEFAULT_EXCLUDE_PATTERNS = [
  /^\//,                    // DDP internal methods (e.g., /users/...)
  /^_/,                     // Private convention
  /^login$/,
  /^logout$/,
  /^getNewToken$/,
  /^removeOtherTokens$/,
  /^configureLoginService$/,
  /^changePassword$/,
  /^forgotPassword$/,
  /^resetPassword$/,
  /^verifyEmail$/,
  /^createUser$/,
  /^ATRemoveToken$/,
  /^ATCreateUserServer$/,
];

function shouldExclude(name, customExcludes) {
  for (const pattern of DEFAULT_EXCLUDE_PATTERNS) {
    if (pattern.test(name)) return true;
  }
  for (const pattern of customExcludes) {
    if (typeof pattern === 'string' && pattern === name) return true;
    if (pattern instanceof RegExp && pattern.test(name)) return true;
  }
  return false;
}

/**
 * Monkey-patch Meteor.methods to intercept method registrations.
 * In "all-in" mode, every registered method is added to the registry.
 */
export function installHook(registry, options = {}) {
  if (_hooked) return;
  _hooked = true;
  _registry = registry;
  _excludePatterns = options.exclude || [];

  Meteor.methods = function hookedMethods(methods) {
    if (_registry) {
      for (const name of Object.keys(methods)) {
        if (!shouldExclude(name, _excludePatterns) && !_registry.has(name)) {
          _registry.register(name, {
            description: `Meteor method: ${name}`,
          });
        }
      }
    }
    return _originalMethods(methods);
  };
}

export function removeHook() {
  if (!_hooked) return;
  Meteor.methods = _originalMethods;
  _hooked = false;
  _registry = null;
  _excludePatterns = [];
}

export function isHooked() {
  return _hooked;
}

// Exported for testing
export { shouldExclude, DEFAULT_EXCLUDE_PATTERNS };
