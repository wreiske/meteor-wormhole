# meteor-wormhole

> A cosmic bridge connecting Meteor methods to AI agents through MCP

This Meteor package exposes your `Meteor.methods` as [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) tools so AI agents can discover and invoke them. Optionally, it also exposes them as REST endpoints with an auto-generated OpenAPI spec and Swagger UI.

## Install

```bash
meteor add wreiske:meteor-wormhole
```

## Usage

```js
import { Wormhole } from 'meteor/wreiske:meteor-wormhole';

// All-in mode (default): auto-expose all methods
Wormhole.init({ mode: 'all' });

// Opt-in mode: selectively expose methods
Wormhole.init({ mode: 'opt-in' });
Wormhole.expose('myMethod', {
  description: 'Does something useful',
  inputSchema: {
    type: 'object',
    properties: { name: { type: 'string' } },
    required: ['name'],
  },
});
```

### REST API + OpenAPI

Enable optional REST endpoints, OpenAPI spec, and Swagger UI:

```js
Wormhole.init({
  mode: 'all',
  rest: {
    enabled: true, // opt-in, disabled by default
    path: '/api', // REST base path
    docs: true, // Swagger UI at /api/docs
  },
});

// Optionally provide outputSchema for richer OpenAPI docs
Wormhole.expose('todos.add', {
  description: 'Add a todo',
  inputSchema: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] },
  outputSchema: {
    type: 'object',
    properties: { id: { type: 'number' }, title: { type: 'string' } },
  },
});
```

Once enabled:

- `GET /api/docs` — Swagger UI
- `GET /api/openapi.json` — OpenAPI 3.1 spec
- `POST /api/<method_name>` — call any exposed method
- `GET /api/` — list all endpoints

See the [main README](../../README.md) for full documentation.
