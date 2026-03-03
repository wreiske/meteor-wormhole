# meteor-wormhole

> A cosmic bridge connecting Meteor methods to AI agents through MCP

This Meteor package exposes your `Meteor.methods` as [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) tools so AI agents can discover and invoke them.

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

See the [main README](../../README.md) for full documentation.
