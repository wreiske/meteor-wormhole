import { MethodRegistry } from './registry';
import { installHook, removeHook } from './hooks';
import { McpBridge } from './mcp-bridge';

/**
 * Wormhole — the main API for connecting Meteor methods to MCP.
 *
 * Usage:
 *   import { Wormhole } from 'meteor/meteor-wormhole';
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
   */
  init(options = {}) {
    if (this._initialized) {
      throw new Error('Wormhole is already initialized. Call _reset() first if re-initializing.');
    }

    this._options = {
      mode: options.mode || 'all',
      path: options.path || '/mcp',
      name: options.name || 'meteor-wormhole',
      version: options.version || '1.0.0',
      apiKey: options.apiKey || null,
      exclude: options.exclude || [],
    };

    // In "all" mode, hook Meteor.methods to auto-register
    if (this._options.mode === 'all') {
      installHook(this._registry, { exclude: this._options.exclude });
    }

    // Create and start the MCP bridge
    this._bridge = new McpBridge(this._registry, this._options);
    this._bridge.start();

    this._initialized = true;
    console.log(`[Wormhole] MCP server initialized at ${this._options.path} (mode: ${this._options.mode})`);
  }

  /**
   * Expose a specific Meteor method as an MCP tool.
   * Works in both modes, but primarily useful in 'opt-in' mode.
   *
   * @param {string} methodName - The Meteor method name
   * @param {object} [options]
   * @param {string} [options.description] - Tool description for AI agents
   * @param {object} [options.inputSchema] - JSON Schema for parameters
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
    removeHook();
    this._registry.clear();
    this._initialized = false;
    this._bridge = null;
    this._options = {};
  }
}

export const Wormhole = new WormholeManager();
