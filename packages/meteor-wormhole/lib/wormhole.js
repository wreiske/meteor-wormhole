import { MethodRegistry } from './registry';
import { installHook, removeHook } from './hooks';
import { McpBridge } from './mcp-bridge';
import { RestBridge } from './rest-bridge';

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
  }

  /**
   * Initialize the MCP bridge.
   * @param {object} options
   * @param {'all'|'opt-in'} [options.mode='all'] - Exposure mode
   * @param {string} [options.path='/mcp'] - HTTP endpoint path
   * @param {string} [options.name='meteor-wormhole'] - MCP server name
   * @param {string} [options.version='1.0.0'] - MCP server version
   * @param {string|null} [options.apiKey=null] - Bearer token for auth
   * @param {Array<string|RegExp>} [options.exclude=[]] - Method exclusions (all-in mode)
   * @param {object|boolean} [options.rest=false] - REST API configuration (false to disable)
   * @param {boolean} [options.rest.enabled=false] - Enable REST endpoints
   * @param {string} [options.rest.path='/api'] - Base path for REST endpoints
   * @param {boolean} [options.rest.docs=true] - Serve Swagger UI at <path>/docs
   * @param {string|null} [options.rest.apiKey] - API key for REST (defaults to main apiKey)
   * @returns {void}
   * @throws {Error} If Wormhole is already initialized
   */
  init(options = {}) {
    if (this._initialized) {
      throw new Error('Wormhole is already initialized. Call _reset() first if re-initializing.');
    }

    const restInput = options.rest || {};
    const restEnabled = restInput === true || restInput.enabled === true;

    this._options = {
      mode: options.mode || 'all',
      path: options.path || '/mcp',
      name: options.name || 'meteor-wormhole',
      version: options.version || '1.0.0',
      apiKey: options.apiKey || null,
      exclude: options.exclude || [],
      rest: {
        enabled: restEnabled,
        path: (typeof restInput === 'object' && restInput.path) || '/api',
        docs: typeof restInput === 'object' && restInput.docs !== undefined ? restInput.docs : true,
        apiKey:
          typeof restInput === 'object' && restInput.apiKey !== undefined
            ? restInput.apiKey
            : options.apiKey || null,
      },
    };

    // In "all" mode, hook Meteor.methods to auto-register
    if (this._options.mode === 'all') {
      installHook(this._registry, { exclude: this._options.exclude });
    }

    // Create and start the MCP bridge
    this._bridge = new McpBridge(this._registry, this._options);
    this._bridge.start();

    // Optionally start the REST bridge
    if (this._options.rest.enabled) {
      this._restBridge = new RestBridge(this._registry, {
        restPath: this._options.rest.path,
        name: this._options.name,
        version: this._options.version,
        apiKey: this._options.rest.apiKey,
        docs: this._options.rest.docs,
      });
      this._restBridge.start();
      console.info(
        `[Wormhole] REST API enabled at ${this._options.rest.path} (docs: ${this._options.rest.docs ? this._options.rest.path + '/docs' : 'disabled'})`,
      );
    }

    this._initialized = true;
    console.info(
      `[Wormhole] MCP server initialized at ${this._options.path} (mode: ${this._options.mode})`,
    );
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
    removeHook();
    this._registry.clear();
    this._initialized = false;
    this._bridge = null;
    this._restBridge = null;
    this._options = {};
  }
}

export const Wormhole = new WormholeManager();
