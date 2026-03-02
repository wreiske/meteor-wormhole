import { Meteor } from 'meteor/meteor';
import { Wormhole } from 'meteor/meteor-wormhole';

// --- Initialize Wormhole in "all-in" mode ---
// All methods defined below will be auto-exposed as MCP tools.
Wormhole.init({
  mode: 'all',
  path: '/mcp',
  name: 'test-app',
  version: '0.1.0',
  // Optionally require an API key:
  // apiKey: 'my-secret-key',
});

// --- Also explicitly expose a method with a rich schema (opt-in style) ---
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

// --- In-memory todo store (no MongoDB needed for testing) ---
const todos = [];

Meteor.methods({
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
    const todo = todos.find(t => t.id === id);
    if (!todo) throw new Meteor.Error('not-found', `Todo ${id} not found`);
    todo.done = true;
    return todo;
  },

  'todos.remove'(id) {
    const idx = todos.findIndex(t => t.id === id);
    if (idx === -1) throw new Meteor.Error('not-found', `Todo ${id} not found`);
    return todos.splice(idx, 1)[0];
  },

  'math.add'({ a, b }) {
    return { result: a + b };
  },

  'echo'(...args) {
    return { echo: args };
  },
});

Meteor.startup(() => {
  console.log('');
  console.log('==============================================');
  console.log(' Meteor Wormhole Test App');
  console.log(' MCP endpoint: http://localhost:3000/mcp');
  console.log('==============================================');
  console.log('');
  console.log('Registered MCP tools:');
  for (const name of Wormhole.registry.names()) {
    console.log(`  - ${name}`);
  }
  console.log('');
});
