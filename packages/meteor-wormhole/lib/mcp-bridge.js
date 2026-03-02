import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';
import { randomUUID } from 'crypto';

// Use explicit dist paths — Meteor's module resolver doesn't support the
// wildcard subpath exports pattern ("./*") used by the SDK's package.json.
const { McpServer } = Npm.require('@modelcontextprotocol/sdk/dist/cjs/server/mcp.js');
const { StreamableHTTPServerTransport } = Npm.require('@modelcontextprotocol/sdk/dist/cjs/server/streamableHttp.js');
const { z } = Npm.require('zod');

/**
 * Sanitize a Meteor method name into a valid MCP tool name.
 * Replaces dots and other special characters with underscores.
 */
export function sanitizeToolName(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Convert a JSON Schema object to a Zod schema for use with the MCP SDK.
 * Handles common types; falls back to z.any() for unknown types.
 */
export function jsonSchemaToZod(schema) {
  if (!schema || !schema.type) {
    return z.object({
      args: z.array(z.any()).optional().describe('Arguments to pass to the Meteor method'),
    });
  }

  if (schema.type === 'object' && schema.properties) {
    const shape = {};
    const required = schema.required || [];
    for (const [key, prop] of Object.entries(schema.properties)) {
      let field;
      switch (prop.type) {
        case 'string': field = z.string(); break;
        case 'number': field = z.number(); break;
        case 'integer': field = z.number().int(); break;
        case 'boolean': field = z.boolean(); break;
        case 'array':
          field = z.array(prop.items ? jsonSchemaFieldToZod(prop.items) : z.any());
          break;
        case 'object':
          field = jsonSchemaToZod(prop);
          break;
        default:
          field = z.any();
      }
      if (prop.description) field = field.describe(prop.description);
      if (!required.includes(key)) field = field.optional();
      shape[key] = field;
    }
    return z.object(shape);
  }

  return z.object({
    args: z.array(z.any()).optional().describe('Arguments to pass to the Meteor method'),
  });
}

function jsonSchemaFieldToZod(prop) {
  switch (prop.type) {
    case 'string': return z.string();
    case 'number': return z.number();
    case 'integer': return z.number().int();
    case 'boolean': return z.boolean();
    default: return z.any();
  }
}

/**
 * Build a generic input schema for methods with no explicit schema defined.
 */
export function genericInputSchema() {
  return z.object({
    args: z.array(z.any()).optional().describe('Arguments to pass to the Meteor method'),
  });
}

/**
 * Parse JSON body from an HTTP request stream.
 */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : undefined);
      } catch (e) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * McpBridge manages the MCP server lifecycle and HTTP integration.
 */
export class McpBridge {
  constructor(registry, options) {
    this._registry = registry;
    this._options = options;
    this._transports = new Map(); // sessionId → { server, transport }
    this._started = false;
  }

  start() {
    if (this._started) return;
    const path = this._options.path || '/mcp';

    WebApp.connectHandlers.use(path, async (req, res) => {
      try {
        await this._handleRequest(req, res);
      } catch (err) {
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      }
    });

    this._started = true;
  }

  stop() {
    for (const [id, entry] of this._transports) {
      try { entry.transport.close?.(); } catch (_) {}
    }
    this._transports.clear();
    this._started = false;
  }

  async _handleRequest(req, res) {
    // API key check
    if (this._options.apiKey) {
      const authHeader = req.headers['authorization'] || '';
      if (authHeader !== `Bearer ${this._options.apiKey}`) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32600, message: 'Unauthorized' } }));
        return;
      }
    }

    const sessionId = req.headers['mcp-session-id'];

    if (req.method === 'POST') {
      const body = await parseBody(req);

      if (sessionId && this._transports.has(sessionId)) {
        // Existing session
        const entry = this._transports.get(sessionId);
        await entry.transport.handleRequest(req, res, body);
      } else if (!sessionId) {
        // New session initialization
        const { server, transport } = this._createSession();
        await server.connect(transport);

        if (transport.sessionId) {
          this._transports.set(transport.sessionId, { server, transport });
        }
        await transport.handleRequest(req, res, body);

        // Store transport after handling (sessionId may be set during handleRequest)
        if (transport.sessionId && !this._transports.has(transport.sessionId)) {
          this._transports.set(transport.sessionId, { server, transport });
        }
      } else {
        // Unknown session
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32600, message: 'Invalid session' } }));
      }
    } else if (req.method === 'GET') {
      if (sessionId && this._transports.has(sessionId)) {
        const entry = this._transports.get(sessionId);
        await entry.transport.handleRequest(req, res);
      } else {
        res.writeHead(405);
        res.end();
      }
    } else if (req.method === 'DELETE') {
      if (sessionId && this._transports.has(sessionId)) {
        const entry = this._transports.get(sessionId);
        await entry.transport.handleRequest(req, res);
        this._transports.delete(sessionId);
      } else {
        res.writeHead(404);
        res.end();
      }
    } else {
      res.writeHead(405);
      res.end();
    }
  }

  _createSession() {
    const server = new McpServer(
      { name: this._options.name, version: this._options.version },
      { capabilities: { tools: { listChanged: true } } }
    );

    this._registerToolsOnServer(server);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        this._transports.delete(transport.sessionId);
      }
    };

    return { server, transport };
  }

  _registerToolsOnServer(mcpServer) {
    const methods = this._registry.getAll();

    for (const [methodName, config] of methods) {
      const toolName = sanitizeToolName(methodName);
      const hasExplicitSchema = !!config.inputSchema;

      const inputSchema = hasExplicitSchema
        ? jsonSchemaToZod(config.inputSchema)
        : genericInputSchema();

      mcpServer.registerTool(
        toolName,
        {
          description: config.description || `Meteor method: ${methodName}`,
          inputSchema,
        },
        async (params) => {
          try {
            let result;
            if (hasExplicitSchema) {
              // Pass the entire params object as a single argument
              result = await Meteor.callAsync(methodName, params);
            } else {
              // Generic mode: spread the args array
              const args = params.args || [];
              result = await Meteor.callAsync(methodName, ...args);
            }
            return {
              content: [{ type: 'text', text: JSON.stringify(result ?? null) }],
            };
          } catch (error) {
            const message = error instanceof Meteor.Error
              ? `${error.error}: ${error.reason || error.message}`
              : error.message || 'Unknown error';
            return {
              content: [{ type: 'text', text: message }],
              isError: true,
            };
          }
        }
      );
    }
  }

  get activeSessions() {
    return this._transports.size;
  }
}
