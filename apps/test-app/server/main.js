import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { Wormhole } from 'meteor/wreiske:meteor-wormhole';

// --- Initialize Wormhole in "all-in" mode ---
// All methods defined below will be auto-exposed as MCP tools.
// The `exclude` option demonstrates filtering specific methods from exposure.
// Methods starting with `_` are also auto-excluded by default (see hooks.js DEFAULT_EXCLUDE_PATTERNS).
Wormhole.init({
  mode: 'all',
  path: '/mcp',
  name: 'test-app',
  version: '0.1.0',
  exclude: [/^admin\./],
  // Optionally require an API key:
  // apiKey: 'my-secret-key',

  // REST API + OpenAPI spec + Swagger UI
  rest: {
    enabled: true,
    path: '/api',
    docs: true,
  },
});

// --- Explicitly expose methods with rich schemas (opt-in style) ---

Wormhole.expose('todos.add', {
  description: 'Add a new todo item to the list',
  inputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'The title of the todo item' },
      priority: { type: 'number', description: 'Priority level (1=low, 5=high)' },
    },
    required: ['title'],
  },
});

Wormhole.expose('todos.list', {
  description: 'List all todo items',
});

Wormhole.expose('math.add', {
  description: 'Add two numbers',
  inputSchema: {
    type: 'object',
    properties: {
      a: { type: 'number', description: 'First number' },
      b: { type: 'number', description: 'Second number' },
    },
    required: ['a', 'b'],
  },
});

// Demonstrates string enum-like parameters
Wormhole.expose('string.transform', {
  description:
    'Transform a string using the specified operation (uppercase, lowercase, reverse, trim, base64)',
  inputSchema: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'The text to transform' },
      operation: {
        type: 'string',
        description: 'Operation: uppercase, lowercase, reverse, trim, or base64',
      },
    },
    required: ['text', 'operation'],
  },
});

// Demonstrates nested object schemas (exercises jsonSchemaToZod nested object handling)
Wormhole.expose('user.register', {
  description: 'Register a mock user with a nested address object',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Full name' },
      email: { type: 'string', description: 'Email address' },
      address: {
        type: 'object',
        description: 'Mailing address',
        properties: {
          street: { type: 'string', description: 'Street address' },
          city: { type: 'string', description: 'City' },
          zip: { type: 'string', description: 'ZIP / postal code' },
        },
        required: ['street', 'city'],
      },
    },
    required: ['name', 'email', 'address'],
  },
});

// Demonstrates array and boolean types in schemas
Wormhole.expose('data.filter', {
  description:
    'Filter an array of numbers — optionally keeping only values above a threshold and sorting',
  inputSchema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: { type: 'number' },
        description: 'Array of numbers to filter',
      },
      greaterThan: { type: 'number', description: 'Keep only values greater than this (optional)' },
      ascending: {
        type: 'boolean',
        description: 'Sort results in ascending order (default false)',
      },
    },
    required: ['items'],
  },
});

// Demonstrates registry introspection and zero-argument tools
Wormhole.expose('system.status', {
  description: 'Return server status including uptime, registered tool count, and tool names',
});

// Demonstrates Meteor.Error propagation through the MCP bridge
Wormhole.expose('error.demo', {
  description:
    'Throw a Meteor.Error to demonstrate error propagation (codes: not-found, unauthorized, validation-error)',
  inputSchema: {
    type: 'object',
    properties: {
      code: {
        type: 'string',
        description: 'Error code to throw: not-found, unauthorized, or validation-error',
      },
    },
    required: ['code'],
  },
});

// Demonstrates optional params with defaults
Wormhole.expose('random.generate', {
  description: 'Generate random values (uuid, number, hex, or color)',
  inputSchema: {
    type: 'object',
    properties: {
      type: { type: 'string', description: 'Type of random value: uuid, number, hex, or color' },
      count: { type: 'number', description: 'How many values to generate (default 1, max 50)' },
    },
    required: ['type'],
  },
});

// --- In-memory stores (no MongoDB needed for testing) ---

const todos = [];
const users = [];

Meteor.methods({
  // ── Todo methods ────────────────────────────────────────────────

  'todos.add'({ title, priority }) {
    const todo = {
      id: todos.length + 1,
      title,
      priority: priority || 3,
      done: false,
      createdAt: new Date(),
    };
    todos.push(todo);
    return todo;
  },

  'todos.list'() {
    return todos;
  },

  'todos.complete'(id) {
    const todo = todos.find((t) => t.id === id);
    if (!todo) throw new Meteor.Error('not-found', `Todo ${id} not found`);
    todo.done = true;
    return todo;
  },

  'todos.remove'(id) {
    const idx = todos.findIndex((t) => t.id === id);
    if (idx === -1) throw new Meteor.Error('not-found', `Todo ${id} not found`);
    return todos.splice(idx, 1)[0];
  },

  // ── Math & echo ─────────────────────────────────────────────────

  'math.add'({ a, b }) {
    return { result: a + b };
  },

  echo(...args) {
    return { echo: args };
  },

  // ── String transform ────────────────────────────────────────────

  'string.transform'({ text, operation }) {
    const ops = {
      uppercase: () => text.toUpperCase(),
      lowercase: () => text.toLowerCase(),
      reverse: () => [...text].reverse().join(''),
      trim: () => text.trim(),
      base64: () => Buffer.from(text).toString('base64'),
    };
    const fn = ops[operation];
    if (!fn) {
      throw new Meteor.Error(
        'invalid-operation',
        `Unknown operation: ${operation}. Use: ${Object.keys(ops).join(', ')}`,
      );
    }
    return { result: fn() };
  },

  // ── User registration (nested object schema demo) ──────────────

  'user.register'({ name, email, address }) {
    const user = {
      id: Random.id(),
      name,
      email,
      address,
      createdAt: new Date(),
    };
    users.push(user);
    return user;
  },

  // ── Data filter (array + boolean schema demo) ──────────────────

  'data.filter'({ items, greaterThan, ascending }) {
    let result = [...items];
    if (typeof greaterThan === 'number') {
      result = result.filter((n) => n > greaterThan);
    }
    if (ascending) {
      result.sort((a, b) => a - b);
    }
    return { result };
  },

  // ── System status (registry introspection demo) ────────────────

  'system.status'() {
    return {
      uptime: process.uptime(),
      toolCount: Wormhole.registry.size(),
      registeredTools: Wormhole.registry.names(),
      todosInMemory: todos.length,
      usersInMemory: users.length,
      timestamp: new Date(),
    };
  },

  // ── Error demo (Meteor.Error propagation) ──────────────────────

  'error.demo'({ code }) {
    const errors = {
      'not-found': new Meteor.Error('not-found', 'The requested resource was not found'),
      unauthorized: new Meteor.Error(
        'unauthorized',
        'You are not authorized to perform this action',
      ),
      'validation-error': new Meteor.Error(
        'validation-error',
        'The provided data failed validation',
      ),
    };
    const err = errors[code];
    if (!err) {
      throw new Meteor.Error(
        'invalid-code',
        `Unknown error code: ${code}. Use: ${Object.keys(errors).join(', ')}`,
      );
    }
    throw err;
  },

  // ── Random generate (optional params demo) ─────────────────────

  'random.generate'({ type, count }) {
    const n = Math.min(Math.max(count || 1, 1), 50);
    const generators = {
      uuid: () => Random.id(),
      number: () => Math.random(),
      hex: () => Random.hexString(16),
      color: () => '#' + Random.hexString(6),
    };
    const gen = generators[type];
    if (!gen) {
      throw new Meteor.Error(
        'invalid-type',
        `Unknown type: ${type}. Use: ${Object.keys(generators).join(', ')}`,
      );
    }
    const values = Array.from({ length: n }, gen);
    return n === 1 ? { value: values[0] } : { values };
  },

  // ── Excluded methods demo ──────────────────────────────────────
  // _internal.secret is auto-excluded (methods starting with _ are filtered by DEFAULT_EXCLUDE_PATTERNS)
  // admin.dangerousReset is excluded by the explicit `exclude: [/^admin\./]` in Wormhole.init()

  '_internal.secret'() {
    return { secret: 'This method should NOT appear as an MCP tool' };
  },

  'admin.dangerousReset'() {
    return { message: 'This method should NOT appear as an MCP tool' };
  },
});

Meteor.startup(() => {
  const toolNames = Wormhole.registry.names();
  console.info('');
  console.info('==============================================');
  console.info(' Meteor Wormhole Test App');
  console.info(' MCP endpoint: http://localhost:3000/mcp');
  console.info('==============================================');
  console.info('');
  console.info(`Registered MCP tools (${toolNames.length}):`);
  for (const name of toolNames) {
    console.info(`  - ${name}`);
  }
  console.info('');
  console.info('Excluded (should NOT appear above):');
  console.info('  - _internal.secret  (auto-excluded: _ prefix)');
  console.info('  - admin.dangerousReset  (excluded via exclude option)');
  console.info('');
});
