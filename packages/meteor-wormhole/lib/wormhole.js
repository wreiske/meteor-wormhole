import { MethodRegistry } from './registry';
import { installHook, removeHook } from './hooks';
import { McpBridge } from './mcp-bridge';
import { RestBridge } from './rest-bridge';
import { PluginHost } from './plugins';
import { normalizeAuthOptions, createAccountsTokenResolver, resolveRequestAuth } from './auth';

/**
 * Wormhole — the main API for connecting Meteor methods to MCP.
 *
 * Usage:
 *   import { Wormhole } from 'meteor/wreiske:meteor-wormhole';
 *   Wormhole.init({ mode: 'all' });
 *
 * OR:
 *   Wormhole.init({ mode: 'opt-in' });
 *   Wormhole.expose('myMethod', { description: '...' });
 */
class WormholeManager {
  constructor() {
    this._registry = new MethodRegistry();
    this._bridge = null;
    this._restBridge = null;
    this._initialized = false;
    this._options = {};
    this._pluginHost = new PluginHost();
    this._tokenResolver = null;
  }

  /**
   * Initialize the MCP bridge.
   * @param {object} options
   * @param {'all'|'opt-in'} [options.mode='all'] - Exposure mode
   * @param {string} [options.path='/mcp'] - HTTP endpoint path
   * @param {string} [options.name='meteor-wormhole'] - MCP server name
   * @param {string} [options.version='1.0.0'] - MCP server version
   * @param {string|null} [options.apiKey=null] - Bearer token for service callers (agents)
   * @param {Array<string|RegExp>} [options.exclude=[]] - Method exclusions (all-in mode)
   * @param {boolean|object} [options.auth=false] - Session auth: `true` resolves
   *   `Authorization: Bearer <Meteor login token>` via accounts-base; `{ resolveUser(req) }`
   *   supplies a custom resolver returning a user id or null.
   * @param {object|boolean} [options.mcp] - MCP transport configuration
   * @param {boolean} [options.mcp.enabled=true] - Mount the MCP server at `path`
   * @param {object|boolean} [options.rest=false] - REST API configuration (false to disable)
   * @param {boolean} [options.rest.enabled=false] - Enable REST endpoints
   * @param {string} [options.rest.path='/api'] - Base path for REST endpoints
   * @param {boolean} [options.rest.docs=true] - Serve Swagger UI at <path>/docs
   * @param {boolean|'auth'} [options.rest.spec=true] - Serve <path>/openapi.json (`'auth'` = credentials required)
   * @param {string|null} [options.rest.apiKey] - API key for REST (defaults to main apiKey)
   * @param {Function} [options.onBeforeInvoke] - `async ({ req, methodName, userId, auth })`
   *   called before every invocation; throw a `Meteor.Error` (e.g. `'rate-limited'`) to reject.
   * @param {object} [options.context={}] - App-provided context passed to plugins
   *   (e.g. auth resolvers, audit logger, storage paths)
   * @returns {void}
   * @throws {Error} If Wormhole is already initialized
   */
  init(options = {}) {
    if (this._initialized) {
      throw new Error('Wormhole is already initialized. Call _reset() first if re-initializing.');
    }

    const restInput = options.rest || {};
    const restEnabled = restInput === true || restInput.enabled === true;

    const mcpInput = options.mcp;
    const mcpEnabled =
      mcpInput === undefined || mcpInput === true
        ? true
        : mcpInput === false
          ? false
          : typeof mcpInput === 'object' && mcpInput.enabled !== false;

    const auth = normalizeAuthOptions(options.auth);
    if (options.onBeforeInvoke !== undefined && typeof options.onBeforeInvoke !== 'function') {
      throw new Error('Wormhole `onBeforeInvoke` must be a function');
    }

    this._options = {
      mode: options.mode || 'all',
      path: options.path || '/mcp',
      name: options.name || 'meteor-wormhole',
      version: options.version || '1.0.0',
      apiKey: options.apiKey || null,
      exclude: options.exclude || [],
      auth,
      mcp: { enabled: mcpEnabled },
      onBeforeInvoke: options.onBeforeInvoke || null,
      context: options.context || {},
      rest: {
        enabled: restEnabled,
        path: (typeof restInput === 'object' && restInput.path) || '/api',
        docs: typeof restInput === 'object' && restInput.docs !== undefined ? restInput.docs : true,
        spec: typeof restInput === 'object' && restInput.spec !== undefined ? restInput.spec : true,
        apiKey:
          typeof restInput === 'object' && restInput.apiKey !== undefined
            ? restInput.apiKey
            : options.apiKey || null,
      },
    };

    // Built-in accounts-base resolver (only when auth is on and no custom resolver given)
    this._tokenResolver = auth.enabled && !auth.resolveUser ? createAccountsTokenResolver() : null;

    // In "all" mode, hook Meteor.methods to auto-register
    if (this._options.mode === 'all') {
      installHook(this._registry, { exclude: this._options.exclude });
    }

    const shared = {
      auth: this._options.auth,
      tokenResolver: this._tokenResolver,
      onBeforeInvoke: this._options.onBeforeInvoke,
    };

    // Create and start the MCP bridge
    if (mcpEnabled) {
      if (!this._options.apiKey && !auth.enabled) {
        console.warn(
          `[Wormhole] MCP server at ${this._options.path} has no apiKey and no auth configured — every registered method is callable anonymously. Pass { mcp: { enabled: false } } to disable the MCP transport.`,
        );
      }
      this._bridge = new McpBridge(this._registry, { ...this._options, ...shared });
      this._bridge.start();
    }

    // Optionally start the REST bridge
    if (this._options.rest.enabled) {
      this._restBridge = new RestBridge(this._registry, {
        restPath: this._options.rest.path,
        name: this._options.name,
        version: this._options.version,
        apiKey: this._options.rest.apiKey,
        docs: this._options.rest.docs,
        spec: this._options.rest.spec,
        ...shared,
      });
      this._restBridge.start();
      console.info(
        `[Wormhole] REST API enabled at ${this._options.rest.path} (docs: ${this._options.rest.docs ? this._options.rest.path + '/docs' : 'disabled'}, auth: ${auth.enabled ? 'session' : 'apiKey-only'})`,
      );
    }

    this._initialized = true;

    // Start any registered plugins (and allow late registration via use()).
    // Clone nested option objects so plugins can't mutate Wormhole's internal
    // configuration (notably `rest` and `exclude`). `context` is intentionally
    // shared by reference — it is the app's own object.
    this._pluginHost.startAll({
      registry: this._registry,
      options: {
        ...this._options,
        rest: { ...this._options.rest },
        mcp: { ...this._options.mcp },
        exclude: [...this._options.exclude],
      },
      context: this._options.context,
      auth: {
        /** Resolve the caller of an HTTP request using Wormhole's auth config. */
        resolve: (req) =>
          resolveRequestAuth(req, {
            apiKey: this._options.apiKey,
            auth: this._options.auth,
            tokenResolver: this._tokenResolver,
          }),
      },
    });

    if (mcpEnabled) {
      console.info(
        `[Wormhole] MCP server initialized at ${this._options.path} (mode: ${this._options.mode})`,
      );
    } else {
      console.info(`[Wormhole] MCP transport disabled (mode: ${this._options.mode})`);
    }
  }

  /**
   * Register a Wormhole plugin (e.g. transport bridges or ingest endpoints).
   *
   * May be called before or after init(): plugins registered before init()
   * start during init(); plugins registered after init() start immediately.
   *
   * The plugin's `start(api)` receives an API object with:
   * `registry` (the method registry), `options` (a copy of the resolved init
   * options), `context` (the app-provided context), `auth.resolve(req)` (the
   * configured credential resolver) and `mount(path, handler)` (attach a
   * connect-style handler to the web server).
   *
   * @param {object} plugin - The plugin to register.
   * @param {string} plugin.name - Unique plugin name.
   * @param {(api: object) => (void | Promise<void>)} plugin.start - Startup
   *   hook, called with the plugin API.
   * @param {() => (void | Promise<void>)} [plugin.stop] - Optional cleanup
   *   hook, called on reset/destroy.
   * @returns {void}
   * @throws {Error} If the plugin is malformed (missing `name` or `start`) or
   *   a plugin with the same `name` is already registered.
   */
  use(plugin) {
    this._pluginHost.use(plugin);
  }

  /**
   * Expose a specific Meteor method as an MCP tool.
   * Works in both modes, but primarily useful in 'opt-in' mode.
   *
   * @param {string} methodName - The Meteor method name
   * @param {object} [options]
   * @param {string} [options.description] - Tool description for AI agents
   * @param {object} [options.inputSchema] - JSON Schema for parameters
   * @param {object} [options.outputSchema] - JSON Schema for return value (used in OpenAPI spec)
   * @param {'required'|'optional'|'none'} [options.auth='optional'] - Session-auth policy
   */
  expose(methodName, options = {}) {
    if (!methodName || typeof methodName !== 'string') {
      throw new Error('Method name must be a non-empty string');
    }
    this._registry.register(methodName, options);
  }

  /**
   * Remove a method from MCP exposure.
   * @param {string} methodName
   */
  unexpose(methodName) {
    this._registry.unregister(methodName);
  }

  /**
   * Resolve the caller of an HTTP request using the configured auth options.
   * Useful for app-owned HTTP routes that want the same credential rules.
   * @param {import('http').IncomingMessage} req
   * @returns {Promise<{kind: string, userId: string|null, token: string|null}>}
   */
  resolveAuth(req) {
    return resolveRequestAuth(req, {
      apiKey: this._options.apiKey || null,
      auth: this._options.auth || { enabled: false, resolveUser: null },
      tokenResolver: this._tokenResolver,
    });
  }

  /**
   * Get the method registry (read-only access).
   */
  get registry() {
    return this._registry;
  }

  /**
   * Whether Wormhole has been initialized.
   */
  get initialized() {
    return this._initialized;
  }

  /**
   * The current configuration.
   */
  get options() {
    return { ...this._options };
  }

  /**
   * Reset Wormhole state. Primarily for testing.
   */
  _reset() {
    if (this._bridge) {
      this._bridge.stop();
    }
    if (this._restBridge) {
      this._restBridge.destroy();
    }
    this._pluginHost.stopAll();
    removeHook();
    this._registry.clear();
    this._initialized = false;
    this._bridge = null;
    this._restBridge = null;
    this._tokenResolver = null;
    this._options = {};
  }
}

export const Wormhole = new WormholeManager();
