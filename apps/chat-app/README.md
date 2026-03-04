# Wormhole Chat App

A bi-directional AI chat demo powered by [Portkey](https://portkey.ai/) and [Meteor Wormhole](../../packages/meteor-wormhole/).

## What it does

- **User → AI**: Users send messages through the chat UI; the server calls Portkey (which routes to any configured AI provider) and streams back the response.
- **AI Agent → Meteor**: External AI agents can discover and invoke chat methods via the MCP endpoint at `/mcp`.
- **Any provider**: Portkey supports OpenAI, Anthropic, Google, Mistral, Cohere, and dozens more — switch providers without changing code.

## Setup

```bash
# From the monorepo root
npm run setup

# Install chat-app dependencies
cd apps/chat-app
meteor npm install
```

## Configuration

Set your Portkey API key via environment variable or Meteor settings:

### Environment variable

```bash
PORTKEY_API_KEY=your-portkey-api-key METEOR_PACKAGE_DIRS=../../packages meteor --port 3100
```

### Meteor settings

Create a `settings.json`:

```json
{
  "portkey": {
    "apiKey": "your-portkey-api-key",
    "virtualKey": "optional-virtual-key",
    "provider": "optional-provider-slug"
  }
}
```

Then run:

```bash
METEOR_PACKAGE_DIRS=../../packages meteor --port 3100 --settings settings.json
```

## Running

```bash
# Quick start (with env var)
cd apps/chat-app
PORTKEY_API_KEY=pk-... npm start

# Or with settings file
METEOR_PACKAGE_DIRS=../../packages meteor --port 3100 --settings settings.json
```

The app runs on **http://localhost:3100** and the MCP endpoint is at **http://localhost:3100/mcp**.

## MCP Tools

The following Meteor methods are exposed as MCP tools:

| Tool           | Description                           |
| -------------- | ------------------------------------- |
| `chat.send`    | Send a message and get an AI response |
| `chat.history` | Get conversation message history      |
| `chat.list`    | List all active conversations         |
| `chat.clear`   | Clear a conversation                  |
| `chat.status`  | Get system status and configuration   |

External AI agents can connect to the MCP endpoint and invoke these tools to participate in conversations programmatically.
