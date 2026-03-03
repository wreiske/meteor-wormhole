# Meteor Wormhole 🌀

> A cosmic bridge connecting Meteor methods to AI agents through MCP

https://wormhole.meteorapp.com/

**Meteor Wormhole** is a Meteor 3 package that automatically exposes your `Meteor.methods` as [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) tools, allowing AI agents (Claude, GPT, etc.) to discover and call your server-side methods.

## Features

- **All-In Mode**: Automatically expose all Meteor methods as MCP tools
- **Opt-In Mode**: Selectively expose specific methods with rich metadata
- **Streamable HTTP Transport**: MCP server embedded in your Meteor app via WebApp
- **API Key Authentication**: Optional bearer token auth for MCP endpoints
- **Input Schemas**: Define JSON Schema or Zod-compatible schemas for method parameters
- **Smart Defaults**: Auto-excludes internal Meteor/accounts methods in all-in mode

## Project Structure

```
meteor-wormhole/
├── packages/
│   └── meteor-wormhole/     # The Meteor package
├── apps/
│   └── test-app/            # Sample Meteor app for testing
├── test-client/             # Standalone MCP client for E2E testing
└── scripts/
    └── setup.sh             # Setup script
```

## Quick Start

### 1. Setup

```bash
bash scripts/setup.sh
```

Or manually:

```bash
# Install Meteor 3 if not installed
npx meteor@latest

# Create and start the test app
cd apps/test-app
METEOR_PACKAGE_DIRS=../../packages npx meteor@latest
```

### 2. Use in Your App

```js
// server/main.js
import { Meteor } from 'meteor/meteor';
import { Wormhole } from 'meteor/wreiske:meteor-wormhole';

// All-in mode: expose all methods
Wormhole.init({ mode: 'all', path: '/mcp' });

Meteor.methods({
  'todos.add'(title) {
    return Todos.insertAsync({ title, done: false });
  },
  'todos.list'() {
    return Todos.find().fetchAsync();
  }
});
```

```js
// Opt-in mode: expose specific methods
import { Wormhole } from 'meteor/wreiske:meteor-wormhole';

Wormhole.init({ mode: 'opt-in', path: '/mcp' });

Wormhole.expose('todos.add', {
  description: 'Add a new todo item',
  inputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'The todo title' }
    },
    required: ['title']
  }
});
```

### 3. Connect an AI Agent

Point your MCP client at `http://localhost:3000/mcp` — the agent can now discover and invoke your Meteor methods as tools.

## API Reference

### `Wormhole.init(options)`

Initialize the MCP bridge.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `'all' \| 'opt-in'` | `'all'` | Exposure mode |
| `path` | `string` | `'/mcp'` | HTTP endpoint path |
| `name` | `string` | `'meteor-wormhole'` | MCP server name |
| `version` | `string` | `'1.0.0'` | MCP server version |
| `apiKey` | `string \| null` | `null` | Bearer token for auth |
| `exclude` | `(string \| RegExp)[]` | `[]` | Methods to exclude (all-in mode) |

### `Wormhole.expose(methodName, options)`

Explicitly expose a method as an MCP tool.

| Option | Type | Description |
|--------|------|-------------|
| `description` | `string` | Human-readable tool description |
| `inputSchema` | `object` | JSON Schema for method parameters |

### `Wormhole.unexpose(methodName)`

Remove a method from MCP exposure.

## How It Works

1. **Registration**: In all-in mode, the package monkey-patches `Meteor.methods` to intercept every method registration. In opt-in mode, you call `Wormhole.expose()` manually.

2. **MCP Server**: A Streamable HTTP MCP server is mounted at the configured path (default `/mcp`) on Meteor's `WebApp`.

3. **Tool Mapping**: Each exposed Meteor method becomes an MCP tool. Method names are sanitized (e.g., `todos.add` → `todos_add`).

4. **Invocation**: When an AI agent calls a tool, the bridge invokes the corresponding Meteor method via `Meteor.callAsync()` and returns the result.

## Running Tests

```bash
cd apps/test-app
METEOR_PACKAGE_DIRS=../../packages npx meteor@latest test-packages ../../packages/meteor-wormhole/
```

## License

MIT
