import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { Wormhole } from 'meteor/wreiske:meteor-wormhole';
import { mcpClients } from './mcp-clients';

// --- Portkey AI client (loaded lazily on first use) ---

let portkey = null;

/**
 * Get or create the Portkey AI client.
 * Reads configuration from Meteor.settings or environment variables.
 * @returns {object} Portkey OpenAI-compatible client
 */
function getPortkeyClient() {
  if (portkey) return portkey;

  const Portkey = Npm.require('portkey-ai').default;

  const apiKey = process.env.PORTKEY_API_KEY || Meteor.settings?.portkey?.apiKey || '';

  const virtualKey = process.env.PORTKEY_VIRTUAL_KEY || Meteor.settings?.portkey?.virtualKey || '';

  const config = process.env.PORTKEY_CONFIG || Meteor.settings?.portkey?.config || '';

  const provider = process.env.PORTKEY_PROVIDER || Meteor.settings?.portkey?.provider || '';

  if (!apiKey) {
    throw new Meteor.Error(
      'portkey-not-configured',
      'Set PORTKEY_API_KEY env var or portkey.apiKey in Meteor.settings',
    );
  }

  const opts = { apiKey };
  if (virtualKey) opts.virtualKey = virtualKey;
  if (config) opts.config = config;
  if (provider) opts.provider = provider;

  portkey = new Portkey(opts);
  return portkey;
}

// --- In-memory conversation store ---

const conversations = new Map();

const SYSTEM_PROMPT = `You are a helpful AI assistant running inside a Meteor application.
You have access to tools from connected MCP (Model Context Protocol) servers.
When you have tools available, use them when they would help answer the user's question.
Be concise, friendly, and helpful. If you don't know something, say so.
You can help with general questions, coding, math, and anything else the user asks.`;

/**
 * Get or create a conversation by ID.
 * @param {string} conversationId
 * @returns {object} Conversation object with messages array
 */
function getConversation(conversationId) {
  if (!conversations.has(conversationId)) {
    conversations.set(conversationId, {
      id: conversationId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  return conversations.get(conversationId);
}

// --- Initialize Wormhole ---

Wormhole.init({
  mode: 'all',
  path: '/mcp',
  name: 'chat-app',
  version: '0.1.0',
  exclude: [/^admin\./, /^_/],
});

// --- Expose chat methods with rich schemas ---

Wormhole.expose('chat.send', {
  description: 'Send a message to the AI chat and get a response',
  inputSchema: {
    type: 'object',
    properties: {
      conversationId: { type: 'string', description: 'Conversation ID (creates new if not found)' },
      message: { type: 'string', description: 'The user message to send' },
    },
    required: ['message'],
  },
});

Wormhole.expose('chat.history', {
  description: 'Get the message history for a conversation',
  inputSchema: {
    type: 'object',
    properties: {
      conversationId: { type: 'string', description: 'Conversation ID to retrieve' },
    },
    required: ['conversationId'],
  },
});

Wormhole.expose('chat.list', {
  description: 'List all active conversations with their metadata',
});

Wormhole.expose('chat.clear', {
  description: 'Clear a conversation history',
  inputSchema: {
    type: 'object',
    properties: {
      conversationId: { type: 'string', description: 'Conversation ID to clear' },
    },
    required: ['conversationId'],
  },
});

Wormhole.expose('chat.status', {
  description: 'Get the chat system status including conversation count and configuration',
});

// --- Meteor Methods ---

Meteor.methods({
  /**
   * Send a message and get an AI response.
   * Includes tool definitions from connected MCP servers and handles tool-call loops.
   * @param {object} params
   * @param {string} [params.conversationId] - Optional conversation ID
   * @param {string} params.message - User message
   * @returns {object} The AI response with conversationId and message data
   */
  async 'chat.send'({ conversationId, message }) {
    if (!message || typeof message !== 'string' || !message.trim()) {
      throw new Meteor.Error('invalid-message', 'Message must be a non-empty string');
    }

    const convId = conversationId || Random.id();
    const conversation = getConversation(convId);

    // Add user message
    const userMessage = {
      id: Random.id(),
      role: 'user',
      content: message.trim(),
      timestamp: new Date(),
    };
    conversation.messages.push(userMessage);
    conversation.updatedAt = new Date();

    // Gather tools from connected MCP servers
    const mcpTools = mcpClients.getAllTools();

    // Build messages for the AI
    const aiMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversation.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    try {
      const client = getPortkeyClient();

      const requestOpts = {
        messages: aiMessages,
        max_tokens: 2048,
      };

      // Include tool definitions if any MCP servers are connected
      if (mcpTools.length > 0) {
        requestOpts.tools = mcpTools.map((t) => ({
          type: t.type,
          function: t.function,
        }));
      }

      // Tool-calling loop: the AI may request tool calls, we execute them and re-prompt
      const MAX_TOOL_ROUNDS = 10;
      let completion;
      let rounds = 0;

      while (rounds < MAX_TOOL_ROUNDS) {
        rounds++;
        completion = await client.chat.completions.create(requestOpts);

        const choice = completion.choices?.[0];
        if (!choice) break;

        // If the model wants to call tools, execute them and add results
        if (choice.finish_reason === 'tool_calls' || choice.message?.tool_calls?.length > 0) {
          const toolCalls = choice.message.tool_calls;

          // Add assistant message with tool calls to the conversation
          requestOpts.messages.push({
            role: 'assistant',
            content: choice.message.content || null,
            tool_calls: toolCalls,
          });

          // Execute each tool call
          for (const toolCall of toolCalls) {
            let toolResult;
            try {
              const args = JSON.parse(toolCall.function.arguments || '{}');
              const mcpResult = await mcpClients.callTool(toolCall.function.name, args);
              toolResult =
                mcpResult.content?.map((c) => c.text || JSON.stringify(c)).join('\n') ||
                'No result';
            } catch (err) {
              toolResult = `Error: ${err.message || 'Tool call failed'}`;
            }

            requestOpts.messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: toolResult,
            });
          }

          // Continue the loop to get the next response
          continue;
        }

        // No more tool calls — we have a final response
        break;
      }

      const assistantContent =
        completion?.choices?.[0]?.message?.content || 'No response generated.';

      // Collect tool usage info for display
      const toolsUsed = [];
      for (const msg of requestOpts.messages) {
        if (msg.role === 'assistant' && msg.tool_calls) {
          for (const tc of msg.tool_calls) {
            const sep = tc.function.name.indexOf('__');
            toolsUsed.push(sep !== -1 ? tc.function.name.slice(sep + 2) : tc.function.name);
          }
        }
      }

      // Add assistant message
      const assistantMessage = {
        id: Random.id(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
        model: completion?.model || 'unknown',
        usage: completion?.usage || null,
        toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
      };
      conversation.messages.push(assistantMessage);
      conversation.updatedAt = new Date();

      return {
        conversationId: convId,
        userMessage,
        assistantMessage,
      };
    } catch (error) {
      // Store error as a system message so the conversation shows what happened
      const errorMessage = {
        id: Random.id(),
        role: 'system',
        content: `Error: ${error.message || 'Failed to get AI response'}`,
        timestamp: new Date(),
        isError: true,
      };
      conversation.messages.push(errorMessage);
      conversation.updatedAt = new Date();

      if (error instanceof Meteor.Error) throw error;
      throw new Meteor.Error('ai-error', error.message || 'Failed to get AI response');
    }
  },

  /**
   * Get conversation history.
   * @param {object} params
   * @param {string} params.conversationId
   * @returns {object} Conversation object
   */
  'chat.history'({ conversationId }) {
    if (!conversationId) {
      throw new Meteor.Error('missing-id', 'conversationId is required');
    }
    const conversation = conversations.get(conversationId);
    if (!conversation) {
      throw new Meteor.Error('not-found', `Conversation ${conversationId} not found`);
    }
    return conversation;
  },

  /**
   * List all conversations.
   * @returns {Array<object>} Array of conversation summaries
   */
  'chat.list'() {
    return Array.from(conversations.values()).map((conv) => ({
      id: conv.id,
      messageCount: conv.messages.length,
      lastMessage:
        conv.messages.length > 0
          ? conv.messages[conv.messages.length - 1].content.slice(0, 100)
          : null,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    }));
  },

  /**
   * Clear a conversation.
   * @param {object} params
   * @param {string} params.conversationId
   * @returns {object} Confirmation
   */
  'chat.clear'({ conversationId }) {
    if (!conversationId) {
      throw new Meteor.Error('missing-id', 'conversationId is required');
    }
    const deleted = conversations.delete(conversationId);
    if (!deleted) {
      throw new Meteor.Error('not-found', `Conversation ${conversationId} not found`);
    }
    return { cleared: true, conversationId };
  },

  /**
   * Get chat system status.
   * @returns {object} System status info
   */
  'chat.status'() {
    const isConfigured = !!(process.env.PORTKEY_API_KEY || Meteor.settings?.portkey?.apiKey);
    const servers = mcpClients.list();
    const externalToolCount = servers.reduce((sum, s) => sum + s.toolCount, 0);
    return {
      configured: isConfigured,
      conversationCount: conversations.size,
      totalMessages: Array.from(conversations.values()).reduce(
        (sum, conv) => sum + conv.messages.length,
        0,
      ),
      uptime: process.uptime(),
      toolCount: Wormhole.registry.size(),
      registeredTools: Wormhole.registry.names(),
      mcpServerCount: servers.length,
      mcpConnectedCount: servers.filter((s) => s.status === 'connected').length,
      externalToolCount,
      timestamp: new Date(),
    };
  },

  /**
   * Create a new empty conversation and return its ID.
   * @returns {object} The new conversation
   */
  'chat.new'() {
    const id = Random.id();
    const conversation = getConversation(id);
    return { conversationId: conversation.id, createdAt: conversation.createdAt };
  },

  // ── MCP Server Management ───────────────────────────────────────

  /**
   * Add an external MCP server connection.
   * @param {object} params
   * @param {string} params.name - Display name
   * @param {string} params.url - MCP server URL
   * @param {object} [params.headers] - Optional headers (e.g. { Authorization: 'Bearer ...' })
   * @returns {Promise<object>} Server connection info
   */
  async 'mcpServers.add'({ name, url, headers }) {
    return mcpClients.add({ name, url, headers });
  },

  /**
   * Remove an external MCP server connection.
   * @param {object} params
   * @param {string} params.id - Server ID to remove
   * @returns {Promise<object>} Confirmation
   */
  async 'mcpServers.remove'({ id }) {
    if (!id) throw new Meteor.Error('missing-id', 'id is required');
    const removed = await mcpClients.remove(id);
    if (!removed) throw new Meteor.Error('not-found', `Server ${id} not found`);
    return { removed: true, id };
  },

  /**
   * Reconnect to an existing MCP server.
   * @param {object} params
   * @param {string} params.id - Server ID to reconnect
   * @returns {Promise<object>} Updated server info
   */
  async 'mcpServers.reconnect'({ id }) {
    if (!id) throw new Meteor.Error('missing-id', 'id is required');
    return mcpClients.reconnect(id);
  },

  /**
   * List all configured MCP servers and their status.
   * @returns {Array<object>} Server list
   */
  'mcpServers.list'() {
    return mcpClients.list();
  },
});

// --- Startup ---

Meteor.startup(() => {
  const toolNames = Wormhole.registry.names();
  const isConfigured = !!(process.env.PORTKEY_API_KEY || Meteor.settings?.portkey?.apiKey);

  console.info('');
  console.info('==============================================');
  console.info(' Meteor Wormhole Chat App');
  console.info(' MCP endpoint: http://localhost:3100/mcp');
  console.info('==============================================');
  console.info('');
  console.info(`Portkey AI: ${isConfigured ? 'Configured' : 'NOT CONFIGURED'}`);
  if (!isConfigured) {
    console.info('  Set PORTKEY_API_KEY env var or add portkey.apiKey to Meteor.settings');
    console.info('  See: https://portkey.ai/docs');
  }
  console.info('');
  console.info(`Registered MCP tools (${toolNames.length}):`);
  for (const name of toolNames) {
    console.info(`  - ${name}`);
  }
  console.info('');
});
