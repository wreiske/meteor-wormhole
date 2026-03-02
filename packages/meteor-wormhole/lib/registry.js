/**
 * MethodRegistry tracks which Meteor methods should be exposed as MCP tools.
 */
export class MethodRegistry {
  constructor() {
    this._methods = new Map();
    this._listeners = [];
  }

  /**
   * Register a method for MCP exposure.
   * @param {string} name - Meteor method name
   * @param {object} options - Tool metadata
   * @param {string} [options.description] - Human-readable description
   * @param {object} [options.inputSchema] - JSON Schema for parameters
   */
  register(name, options = {}) {
    const entry = {
      description: options.description || `Meteor method: ${name}`,
      inputSchema: options.inputSchema || null,
      registeredAt: Date.now(),
    };
    this._methods.set(name, entry);
    this._notify('register', name, entry);
  }

  unregister(name) {
    const existed = this._methods.delete(name);
    if (existed) {
      this._notify('unregister', name);
    }
    return existed;
  }

  get(name) {
    return this._methods.get(name) || null;
  }

  getAll() {
    return new Map(this._methods);
  }

  has(name) {
    return this._methods.has(name);
  }

  size() {
    return this._methods.size;
  }

  clear() {
    this._methods.clear();
    this._notify('clear');
  }

  names() {
    return Array.from(this._methods.keys());
  }

  onChange(fn) {
    this._listeners.push(fn);
    return () => {
      this._listeners = this._listeners.filter(l => l !== fn);
    };
  }

  _notify(event, ...args) {
    for (const fn of this._listeners) {
      try { fn(event, ...args); } catch (_) { /* ignore listener errors */ }
    }
  }
}
