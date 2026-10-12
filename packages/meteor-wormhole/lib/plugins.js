import { WebApp } from 'meteor/webapp';

/**
 * PluginHost — manages Wormhole plugins.
 *
 * A plugin is an object:
 *   {
 *     name: string,
 *     start(api): void|Promise<void>,
 *     stop?(): void|Promise<void>,
 *   }
 *
 * The `api` passed to start() exposes:
 *   - registry: the MethodRegistry (read/register methods)
 *   - options:  the resolved Wormhole init options
 *   - context:  app-provided context (auth resolvers, audit, storage, ...)
 *   - mount(path, handler): mount a connect-style handler on the web server
 */
export class PluginHost {
  constructor() {
    this._plugins = [];
    this._api = null;
    this._mounted = [];
  }

  /**
   * Register a plugin. If the host has already started, the plugin
   * is started immediately.
   * @param {{name: string, start: Function, stop?: Function}} plugin
   */
  use(plugin) {
    if (!plugin || typeof plugin.start !== 'function' || typeof plugin.name !== 'string') {
      throw new Error('Wormhole plugin must be an object with { name: string, start: Function }');
    }
    if (this._plugins.some((p) => p.name === plugin.name)) {
      throw new Error(`Wormhole plugin "${plugin.name}" is already registered`);
    }
    this._plugins.push(plugin);
    if (this._api) {
      this._startPlugin(plugin);
    }
  }

  /**
   * Start all registered plugins with the given host API.
   * @param {{registry: object, options: object, context: object}} api
   */
  startAll(api) {
    this._api = {
      ...api,
      mount: (path, handler) => {
        WebApp.connectHandlers.use(path, handler);
        this._mounted.push({ path, handler });
      },
    };
    for (const plugin of this._plugins) {
      this._startPlugin(plugin);
    }
  }

  /**
   * Stop all plugins (reverse order), unmount their handlers, and reset host
   * state.
   *
   * Synchronous by design: a plugin's `stop()` promise is NOT awaited, so a
   * caller (e.g. `Wormhole._reset()`) can re-initialize immediately without
   * racing in-flight stops. Rejections are logged.
   *
   * @returns {void}
   */
  stopAll() {
    for (const plugin of [...this._plugins].reverse()) {
      if (typeof plugin.stop === 'function') {
        try {
          const result = plugin.stop();
          if (result && typeof result.then === 'function') {
            result.catch((err) => {
              console.error(`[Wormhole] Error stopping plugin "${plugin.name}":`, err);
            });
          }
        } catch (err) {
          console.error(`[Wormhole] Error stopping plugin "${plugin.name}":`, err);
        }
      }
    }
    this._unmountAll();
    this._plugins = [];
    this._api = null;
  }

  /** Remove handlers mounted via `api.mount()` from the connect stack. */
  _unmountAll() {
    const stack = WebApp.connectHandlers && WebApp.connectHandlers.stack;
    if (Array.isArray(stack) && this._mounted.length > 0) {
      const handlers = new Set(this._mounted.map((m) => m.handler));
      for (let i = stack.length - 1; i >= 0; i -= 1) {
        if (handlers.has(stack[i].handle)) {
          stack.splice(i, 1);
        }
      }
    }
    this._mounted = [];
  }

  names() {
    return this._plugins.map((p) => p.name);
  }

  _startPlugin(plugin) {
    try {
      const result = plugin.start(this._api);
      if (result && typeof result.then === 'function') {
        // Async start: only log success once the promise actually resolves,
        // and log failure once if it rejects.
        result.then(
          () => {
            console.info(`[Wormhole] Plugin "${plugin.name}" started`);
          },
          (err) => {
            console.error(`[Wormhole] Plugin "${plugin.name}" failed to start:`, err);
          },
        );
      } else {
        console.info(`[Wormhole] Plugin "${plugin.name}" started`);
      }
    } catch (err) {
      console.error(`[Wormhole] Plugin "${plugin.name}" failed to start:`, err);
    }
  }
}
