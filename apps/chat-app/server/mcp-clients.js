import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';

const { Client } = Npm.require('@modelcontextprotocol/sdk/dist/cjs/client/index.js');
const { StreamableHTTPClientTransport } = Npm.require(
  '@modelcontextprotocol/sdk/dist/cjs/client/streamableHttp.js',
);

/**
 * Manages connections to external MCP servers.
 * Connects as an MCP client, discovers tools, and invokes them on behalf of the AI.
 */
class McpClientManager {
  constructor() {
    /** @type {Map<string, {id: string, name: string, url: string, headers: object, client: object|null, transport: object|null, tools: Array, status: string, error: string|null, addedAt: Date}>} */
    this._servers = new Map();
  }

  /**
   * Add and connect to an external MCP server.
   * @param {object} opts
   * @param {string} opts.name - Display name for this server
   * @param {string} opts.url - MCP server URL (e.g. http://localhost:3000/mcp)
   * @param {object} [opts.headers] - Extra headers (e.g. Authorization)
   * @returns {Promise<object>} Server entry with status and tools
   */
  async add({ name, url, headers }) {
    if (!name || !url) {
      throw new Meteor.Error('invalid-args', 'name and url are required');
    }

    // Validate URL format
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      throw new Meteor.Error('invalid-url', 'url must be a valid URL');
    }

    // Only allow http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Meteor.Error('invalid-url', 'Only http and https URLs are allowed');
    }

    const id = Random.id();
    const entry = {
      id,
      name,
      url,
      headers: headers || {},
      client: null,
      transport: null,
      tools: [],
      status: 'connecting',
      error: null,
      addedAt: new Date(),
    };
    this._servers.set(id, entry);

    try {
      await this._connect(entry);
    } catch (err) {
      entry.status = 'error';
      entry.error = err.message || 'Connection failed';
    }

    return this._serialize(entry);
  }

  /**
   * Remove and disconnect from an MCP server.
   * @param {string} id - Server ID
   * @returns {boolean} Whether the server was found and removed
   */
  async remove(id) {
    const entry = this._servers.get(id);
    if (!entry) return false;

    await this._disconnect(entry);
    this._servers.delete(id);
    return true;
  }

  /**
   * Reconnect to an existing server (e.g. after error).
   * @param {string} id - Server ID
   * @returns {Promise<object>} Updated server entry
   */
  async reconnect(id) {
    const entry = this._servers.get(id);
    if (!entry) {
      throw new Meteor.Error('not-found', `Server ${id} not found`);
    }

    await this._disconnect(entry);
    entry.status = 'connecting';
    entry.error = null;
    entry.tools = [];

    try {
      await this._connect(entry);
    } catch (err) {
      entry.status = 'error';
      entry.error = err.message || 'Connection failed';
    }

    return this._serialize(entry);
  }

  /**
   * List all configured MCP servers.
   * @returns {Array<object>} Serialized server entries
   */
  list() {
    return Array.from(this._servers.values()).map((e) => this._serialize(e));
  }

  /**
   * Get all tools from all connected MCP servers, formatted for OpenAI tool calling.
   * @returns {Array<object>} Array of {type: 'function', function: {...}} tool definitions
   */
  getAllTools() {
    const tools = [];
    for (const entry of this._servers.values()) {
      if (entry.status !== 'connected') continue;
      for (const tool of entry.tools) {
        tools.push({
          type: 'function',
          function: {
            name: `${entry.id}__${tool.name}`,
            description: `[${entry.name}] ${tool.description || tool.name}`,
            parameters: tool.inputSchema || { type: 'object', properties: {} },
          },
          _mcpServerId: entry.id,
          _mcpToolName: tool.name,
        });
      }
    }
    return tools;
  }

  /**
   * Call a tool on an external MCP server.
   * @param {string} qualifiedName - The qualified tool name (serverId__toolName)
   * @param {object} args - Tool arguments
   * @returns {Promise<object>} Tool call result
   */
  async callTool(qualifiedName, args) {
    const sep = qualifiedName.indexOf('__');
    if (sep === -1) {
      throw new Meteor.Error('invalid-tool', `Invalid qualified tool name: ${qualifiedName}`);
    }
    const serverId = qualifiedName.slice(0, sep);
    const toolName = qualifiedName.slice(sep + 2);

    const entry = this._servers.get(serverId);
    if (!entry) {
      throw new Meteor.Error('not-found', `MCP server ${serverId} not found`);
    }
    if (entry.status !== 'connected' || !entry.client) {
      throw new Meteor.Error('not-connected', `MCP server "${entry.name}" is not connected`);
    }

    const result = await entry.client.callTool({ name: toolName, arguments: args });
    return result;
  }

  /**
   * Connect to an MCP server and discover its tools.
   * @param {object} entry - Server entry from this._servers
   * @returns {Promise<void>}
   */
  async _connect(entry) {
    const transportOpts = {};
    if (entry.headers && Object.keys(entry.headers).length > 0) {
      transportOpts.requestInit = { headers: entry.headers };
    }

    const transport = new StreamableHTTPClientTransport(new URL(entry.url), transportOpts);

    const client = new Client({
      name: 'wormhole-chat-app',
      version: '1.0.0',
    });

    await client.connect(transport);

    // Discover tools
    const result = await client.listTools();
    entry.tools = result.tools || [];
    entry.client = client;
    entry.transport = transport;
    entry.status = 'connected';
    entry.error = null;
  }

  /**
   * Disconnect from an MCP server.
   * @param {object} entry - Server entry
   * @returns {Promise<void>}
   */
  async _disconnect(entry) {
    try {
      entry.transport?.close?.();
    } catch {
      /* cleanup best-effort */
    }
    entry.client = null;
    entry.transport = null;
    entry.status = 'disconnected';
  }

  /**
   * Serialize a server entry for client consumption (strips internal objects).
   * @param {object} entry
   * @returns {object}
   */
  _serialize(entry) {
    return {
      id: entry.id,
      name: entry.name,
      url: entry.url,
      status: entry.status,
      error: entry.error,
      toolCount: entry.tools.length,
      tools: entry.tools.map((t) => ({
        name: t.name,
        description: t.description || '',
      })),
      addedAt: entry.addedAt,
    };
  }
}

export const mcpClients = new McpClientManager();
