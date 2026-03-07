# meteor-wormhole

> A cosmic bridge connecting Meteor methods to AI agents through MCP

[![Meteor Package](https://img.shields.io/badge/meteor-wreiske%3Ameteor--wormhole-blue)](https://atmospherejs.com/wreiske/meteor-wormhole)

**meteor-wormhole** is a server-only Meteor 3 package that exposes your `Meteor.methods` as [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) tools so AI agents (Claude, GPT, Copilot, etc.) can discover and invoke them. It also optionally exposes them as REST endpoints with an auto-generated OpenAPI 3.1 spec and Swagger UI.

## Features

- **All-In Mode** — Automatically expose every Meteor method as an MCP tool
- **Opt-In Mode** — Selectively expose methods with rich metadata and schemas
- **Streamable HTTP Transport** — MCP server embedded in your Meteor app via `WebApp`
- **REST API** — Optional REST endpoints for every exposed method (`POST /api/<method>`)
- **OpenAPI 3.1 Spec** — Auto-generated from your method registry
- **Swagger UI** — Built-in API docs browser at `/api/docs`
- **API Key Authentication** — Optional bearer token auth for MCP and REST endpoints
- **Input & Output Schemas** — Define JSON Schema for method parameters and return values
- **Smart Defaults** — Auto-excludes internal Meteor, DDP, and Accounts methods

## Requirements

- Meteor 3.4+
- Server-only (this package does not run on the client)

## Install

```bash
meteor add wreiske:meteor-wormhole
```

## Quick Start

```js
import { Wormhole } from 'meteor/wreiske:meteor-wormhole';

// Expose all Meteor methods as MCP tools (default mode)
Wormhole.init();
```

That's it. Every method defined via `Meteor.methods()` is now available to MCP clients at `http://localhost:3000/mcp`.

## Configuration

### `Wormhole.init(options)`

Initialize the MCP bridge and optionally the REST API. Must be called once at server startup.

```js
Wormhole.init({
  mode: 'all',
  path: '/mcp',
  name: 'my-app',
  version: '1.0.0',
  apiKey: 'my-secret-key',
  exclude: [/^admin\./, 'internalMethod'],
  rest: {
    enabled: true,
    path: '/api',
    docs: true,
  },
});
```

#### Options

| Option    | Type                   | Default             | Description                                                                                          |
| --------- | ---------------------- | ------------------- | ---------------------------------------------------------------------------------------------------- |
| `mode`    | `'all' \| 'opt-in'`    | `'all'`             | `'all'` auto-registers all methods. `'opt-in'` requires explicit `Wormhole.expose()` calls.          |
| `path`    | `string`               | `'/mcp'`            | HTTP path where the MCP server listens.                                                              |
| `name`    | `string`               | `'meteor-wormhole'` | Display name for the MCP server.                                                                     |
| `version` | `string`               | `'1.0.0'`           | Semantic version of the MCP server.                                                                  |
| `apiKey`  | `string \| null`       | `null`              | Bearer token for authentication. If set, all requests must include `Authorization: Bearer <apiKey>`. |
| `exclude` | `(string \| RegExp)[]` | `[]`                | Method name patterns to exclude in `'all'` mode. Supports exact strings and RegExp.                  |
| `rest`    | `object \| boolean`    | `false`             | REST API configuration (see below). Pass `true` to enable with defaults.                             |

#### REST Options (`options.rest`)

| Option    | Type             | Default                  | Description                         |
| --------- | ---------------- | ------------------------ | ----------------------------------- |
| `enabled` | `boolean`        | `false`                  | Enable the REST API (opt-in).       |
| `path`    | `string`         | `'/api'`                 | Base path for REST endpoints.       |
| `docs`    | `boolean`        | `true`                   | Serve Swagger UI at `<path>/docs`.  |
| `apiKey`  | `string \| null` | _(inherits from parent)_ | Override the API key for REST only. |

#### Default Exclusions (All Mode)

In `'all'` mode, the following methods are always excluded automatically:

- Methods starting with `/` (DDP internal)
- Methods starting with `_` (private convention)
- Accounts methods: `login`, `logout`, `getNewToken`, `removeOtherTokens`, `configureLoginService`, `changePassword`, `forgotPassword`, `resetPassword`, `verifyEmail`, `createUser`, `ATRemoveToken`, `ATCreateUserServer`

Use the `exclude` option to add your own patterns on top of these defaults.

## Exposing Methods

### `Wormhole.expose(methodName, options)`

Explicitly register a Meteor method as an MCP tool. Required in `'opt-in'` mode, but also works in `'all'` mode to enrich auto-registered methods with descriptions and schemas.

```js
Wormhole.expose('todos.add', {
  description: 'Add a new todo item to the list',
  inputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'The todo title' },
      priority: {
        type: 'number',
        description: 'Priority level (1=low, 5=high)',
      },
    },
    required: ['title'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      title: { type: 'string' },
      done: { type: 'boolean' },
    },
  },
});
```

#### Parameters

| Parameter              | Type     | Description                                                                                       |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------------- |
| `methodName`           | `string` | The exact Meteor method name (e.g., `'todos.add'`).                                               |
| `options.description`  | `string` | Human-readable description. Used in MCP tool listings and OpenAPI spec.                           |
| `options.inputSchema`  | `object` | JSON Schema defining expected input parameters.                                                   |
| `options.outputSchema` | `object` | JSON Schema for the return value. Used in OpenAPI spec. REST wraps this in `{ result: <value> }`. |

### `Wormhole.unexpose(methodName)`

Remove a method from MCP/REST exposure.

```js
Wormhole.unexpose('todos.add'); // returns true if it was registered
```

### Tool Name Mapping

Method names are sanitized for MCP and REST: special characters (`.`, `-`, `/`) are replaced with underscores.

| Meteor Method          | MCP Tool / REST Route  |
| ---------------------- | ---------------------- |
| `todos.add`            | `todos_add`            |
| `user-service.getUser` | `user_service_getUser` |

## MCP Transport

The MCP server uses **Streamable HTTP** transport, mounted at the configured `path` (default `/mcp`).

### Connecting an MCP Client

Configure your MCP client (Claude Desktop, VS Code, etc.) to connect:

```json
{
  "mcpServers": {
    "my-meteor-app": {
      "type": "streamablehttp",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

With API key authentication:

```json
{
  "mcpServers": {
    "my-meteor-app": {
      "type": "streamablehttp",
      "url": "http://localhost:3000/mcp",
      "headers": {
        "Authorization": "Bearer my-secret-key"
      }
    }
  }
}
```

### How It Works

- **POST** `/mcp` — Send JSON-RPC 2.0 requests. First request creates a session; subsequent requests include the `mcp-session-id` header.
- **GET** `/mcp` — Long-poll/stream events for an existing session.
- **DELETE** `/mcp` — Close a session.

### Tool Invocation

When an MCP client calls a tool:

- **With `inputSchema`**: The entire params object is passed as a single argument to the Meteor method.
- **Without `inputSchema`**: The `args` array is spread as positional arguments.

Errors from Meteor methods are returned as MCP error content:

```json
{
  "content": [{ "type": "text", "text": "not-found: Todo not found" }],
  "isError": true
}
```

## REST API

Enable the REST API to call exposed methods via standard HTTP.

```js
Wormhole.init({
  mode: 'all',
  rest: { enabled: true },
});
```

### Endpoints

| Method | Path                | Description        | Auth Required         |
| ------ | ------------------- | ------------------ | --------------------- |
| `POST` | `/api/<tool_name>`  | Invoke a method    | Yes (if `apiKey` set) |
| `GET`  | `/api/`             | List all endpoints | Yes (if `apiKey` set) |
| `GET`  | `/api/openapi.json` | OpenAPI 3.1 spec   | No                    |
| `GET`  | `/api/docs`         | Swagger UI         | No                    |

### Calling a Method

```bash
curl -X POST http://localhost:3000/api/todos_add \
  -H 'Content-Type: application/json' \
  -d '{"title": "Buy milk", "priority": 3}'
```

**Success response:**

```json
{
  "result": { "_id": "abc123", "title": "Buy milk", "done": false }
}
```

**Error response:**

```json
{
  "error": "not-found",
  "reason": "Todo not found",
  "message": "Todo not found [not-found]"
}
```

### Request Limits

- **Max body size**: 1 MB
- **Content-Type**: Must be `application/json`

## Authentication

When `apiKey` is set, all MCP and REST requests (except Swagger UI and OpenAPI spec) require a bearer token:

```
Authorization: Bearer <your-api-key>
```

Unauthorized requests receive a `401` response.

## Additional API

### `Wormhole.registry`

Read-only access to the internal method registry.

```js
Wormhole.registry.names(); // ['todos.add', 'todos.list', ...]
Wormhole.registry.size(); // 5
Wormhole.registry.has('todos.add'); // true
Wormhole.registry.get('todos.add');
// { description: '...', inputSchema: {...}, outputSchema: {...}, registeredAt: 1709... }
```

### `Wormhole.initialized`

`boolean` — Whether `Wormhole.init()` has been called.

### `Wormhole.options`

Returns a copy of the resolved configuration options.

### `generateOpenApiSpec(registry, options)`

Generate an OpenAPI 3.1.0 spec object from a registry. Exported for advanced use cases.

```js
import { generateOpenApiSpec } from 'meteor/wreiske:meteor-wormhole';

const spec = generateOpenApiSpec(Wormhole.registry, {
  name: 'My API',
  version: '2.0.0',
  restPath: '/api',
  apiKey: 'secret',
  description: 'My custom API',
});
```

## Full Example

```js
import { Meteor } from 'meteor/meteor';
import { Wormhole } from 'meteor/wreiske:meteor-wormhole';

// Initialize with all features
Wormhole.init({
  mode: 'all',
  path: '/mcp',
  name: 'my-app',
  version: '1.0.0',
  apiKey: process.env.MCP_API_KEY || null,
  exclude: [/^admin\./],
  rest: {
    enabled: true,
    path: '/api',
    docs: true,
  },
});

// Enrich specific methods with schemas
Wormhole.expose('todos.add', {
  description: 'Add a new todo item',
  inputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
    },
    required: ['title'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      title: { type: 'string' },
      done: { type: 'boolean' },
    },
  },
});

// Define the actual Meteor method
Meteor.methods({
  'todos.add'({ title }) {
    const todoId = TodosCollection.insertAsync({ title, done: false });
    return TodosCollection.findOneAsync(todoId);
  },
});
```

Now available:

- **MCP**: `http://localhost:3000/mcp` — AI agents can discover and call `todos_add`
- **REST**: `POST http://localhost:3000/api/todos_add` — HTTP clients can call the method
- **Docs**: `http://localhost:3000/api/docs` — Interactive Swagger UI
- **Spec**: `http://localhost:3000/api/openapi.json` — OpenAPI 3.1 spec

## Testing

```bash
# Run package unit tests (Tinytest)
cd apps/test-app && meteor test-packages ../../packages/meteor-wormhole

# Run MCP integration test client
meteor npm run test:client
```

## License

MIT

## Links

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Atmosphere Package](https://atmospherejs.com/wreiske/meteor-wormhole)
- [Repository](https://github.com/wreiske/meteor-wormhole)
