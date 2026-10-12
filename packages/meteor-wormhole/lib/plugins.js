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
 *
 * Lifecycle: every `startAll()` opens a new *generation*. The `api` handed to
 * plugins is bound to that generation, so an async `start()` that resolves
 * after `stopAll()` cannot mount handlers into a later generation (its
 * `mount()` is refused and the plugin is stopped instead).
 */
export class PluginHost {
  constructor() {
    this._plugins = [];
    this._api = null;
    this._mounted = [];
    this._generation = 0;
    this._pendingStarts = new Map(); // plugin → Promise
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
      this._startPlugin(plugin, this._api, this._generation);
    }
  }

  /**
   * Start all registered plugins with the given host API.
   * @param {{registry: object, options: object, context: object}} api
   */
  startAll(api) {
    this._generation += 1;
    const generation = this._generation;
    this._api = {
      ...api,
      mount: (path, handler) => {
        if (generation !== this._generation || this._api === null) {
          throw new Error(
            'Wormhole plugin API is stale: the host was stopped before this plugin finished starting',
          );
        }
        WebApp.connectHandlers.use(path, handler);
        this._mounted.push({ path, handler });
      },
    };
    for (const plugin of this._plugins) {
      this._startPlugin(plugin, this._api, generation);
    }
  }

  /**
   * Stop all plugins (reverse registration order), unmount their handlers and
   * reset host state.
   *
   * Host state is cleared synchronously, so a caller (e.g. `Wormhole._reset()`)
   * can re-initialize immediately: the new generation's API is distinct and
   * stale `mount()` calls from the old one are refused.
   *
   * Synchronous `stop()`s run before this returns. When a `stop()` returns a
   * promise, later plugins wait for it, and when a plugin's async `start()` is
   * still in flight, stopping waits for it to settle first. The returned
   * promise settles once every `stop()` has finished; rejections are logged,
   * never thrown.
   *
   * @returns {Promise<void>}
   */
  stopAll() {
    const plugins = [...this._plugins].reverse();
    const pending = [...this._pendingStarts.values()];
    this._unmountAll();
    this._plugins = [];
    this._api = null;
    this._pendingStarts = new Map();
    this._generation += 1;

    if (pending.length === 0) return this._stopFrom(plugins, 0);
    // Let in-flight starts settle so cleanup runs against a fully started
    // plugin instead of racing it.
    return Promise.allSettled(pending).then(() => this._stopFrom(plugins, 0));
  }

  /**
   * Stop `plugins[index..]` in order: synchronously while each `stop()` is
   * synchronous, awaiting any `stop()` that returns a promise before the next.
   * @returns {Promise<void>}
   */
  _stopFrom(plugins, index) {
    for (let i = index; i < plugins.length; i += 1) {
      const plugin = plugins[i];
      if (typeof plugin.stop !== 'function') continue;
      let result;
      try {
        result = plugin.stop();
      } catch (err) {
        console.error(`[Wormhole] Error stopping plugin "${plugin.name}":`, err);
        continue;
      }
      if (result && typeof result.then === 'function') {
        return Promise.resolve(result)
          .catch((err) => {
            console.error(`[Wormhole] Error stopping plugin "${plugin.name}":`, err);
          })
          .then(() => this._stopFrom(plugins, i + 1));
      }
    }
    return Promise.resolve();
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

  _startPlugin(plugin, api, generation) {
    try {
      const result = plugin.start(api);
      if (result && typeof result.then === 'function') {
        // Async start: track it so stopAll() can wait for it (and then stop
        // the plugin), and only report success once the promise resolves.
        const tracked = result.then(
          () => {
            if (generation !== this._generation) {
              // The host was stopped while this plugin was still starting: its
              // api.mount() was refused, and stopAll() stops it once this settles.
              console.warn(
                `[Wormhole] Plugin "${plugin.name}" finished starting after the host stopped; stopping it`,
              );
              return;
            }
            console.info(`[Wormhole] Plugin "${plugin.name}" started`);
          },
          (err) => {
            console.error(`[Wormhole] Plugin "${plugin.name}" failed to start:`, err);
          },
        );
        this._pendingStarts.set(plugin, tracked);
        tracked.finally(() => {
          if (this._pendingStarts.get(plugin) === tracked) this._pendingStarts.delete(plugin);
        });
      } else {
        console.info(`[Wormhole] Plugin "${plugin.name}" started`);
      }
    } catch (err) {
      console.error(`[Wormhole] Plugin "${plugin.name}" failed to start:`, err);
    }
  }
}
