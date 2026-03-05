import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { WebApp } from 'meteor/webapp';
import { Wormhole } from 'meteor/wreiske:meteor-wormhole';
import Portkey from 'portkey-ai';
import OpenAI from 'openai';
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

/**
 * Create a one-time AI client from user-provided configuration.
 * The client is used for a single request and then discarded.
 * API keys are never stored or logged.
 * @param {object} providerConfig - User's provider configuration
 * @param {string} providerConfig.provider - Provider ID
 * @param {string} providerConfig.apiKey - Provider API key
 * @param {string} providerConfig.baseUrl - API base URL
 * @param {boolean} [providerConfig.usePortkey] - Whether to route through Portkey
 * @param {string} [providerConfig.portkeyApiKey] - Portkey API key (if using gateway)
 * @returns {object} OpenAI-compatible client
 * @throws {Meteor.Error} If configuration is invalid
 */
function createClientFromConfig(providerConfig) {
  if (!providerConfig?.apiKey) {
    throw new Meteor.Error('invalid-config', 'Provider API key is required');
  }
  if (!providerConfig?.baseUrl) {
    throw new Meteor.Error('invalid-config', 'Provider base URL is required');
  }

  // Portkey gateway mode: route through Portkey with provider credentials
  if (providerConfig.usePortkey && providerConfig.portkeyApiKey) {
    return new Portkey({
      apiKey: providerConfig.portkeyApiKey,
      provider: providerConfig.provider,
      Authorization: `Bearer ${providerConfig.apiKey}`,
    });
  }

  // Direct provider mode: call provider API directly via OpenAI SDK
  return new OpenAI({
    apiKey: providerConfig.apiKey,
    baseURL: providerConfig.baseUrl,
  });
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

Wormhole.expose('chat.new', {
  description: 'Create a new empty conversation and return its ID',
});

Wormhole.expose('mcpServers.add', {
  description: 'Connect to an external MCP server by name and URL',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Display name for the server (e.g. "huggingface")' },
      url: {
        type: 'string',
        description: 'MCP endpoint URL (e.g. "https://huggingface.co/mcp")',
      },
      headers: {
        type: 'object',
        description: 'Optional HTTP headers such as { Authorization: "Bearer ..." }',
      },
    },
    required: ['name', 'url'],
  },
});

Wormhole.expose('mcpServers.remove', {
  description: 'Disconnect and remove an external MCP server',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Server ID to remove' },
    },
    required: ['id'],
  },
});

Wormhole.expose('mcpServers.reconnect', {
  description: 'Reconnect to a previously failed MCP server',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Server ID to reconnect' },
    },
    required: ['id'],
  },
});

Wormhole.expose('mcpServers.list', {
  description: 'List all configured MCP servers and their connection status, tools, and errors',
});

// --- Meteor Methods ---

Meteor.methods({
  /**
   * Send a message and get an AI response.
   * Includes tool definitions from connected MCP servers and handles tool-call loops.
   * Accepts optional providerConfig for per-request client creation (keys are never stored).
   * @param {object} params
   * @param {string} [params.conversationId] - Optional conversation ID
   * @param {string} params.message - User message
   * @param {object} [params.providerConfig] - Client-side provider config (API key, model, etc.)
   * @returns {object} The AI response with conversationId and message data
   */
  async 'chat.send'({ conversationId, message, providerConfig }) {
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
      // Use per-request client from user config, or fall back to server-side Portkey
      const client = providerConfig ? createClientFromConfig(providerConfig) : getPortkeyClient();

      const requestOpts = {
        messages: aiMessages,
      };

      // OpenAI requires max_completion_tokens; other providers use max_tokens
      if (providerConfig?.useMaxCompletionTokens) {
        requestOpts.max_completion_tokens = 2048;
      } else {
        requestOpts.max_tokens = 2048;
      }

      // Use model from client config, or let Portkey pick the default
      if (providerConfig?.model) {
        requestOpts.model = providerConfig.model;
      }

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
    if (!name || !url) {
      throw new Meteor.Error('invalid-args', 'name and url are required');
    }
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

// --- Streaming SSE Endpoint ---

/**
 * SSE endpoint for streaming AI chat responses.
 * POST /api/chat/stream with JSON body containing conversationId, message, providerConfig.
 * Streams back SSE events: chunk, tool_call, done, error.
 */
WebApp.connectHandlers.use('/api/chat/stream', async (req, res) => {
  // Only accept POST
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  // Parse request body
  let body;
  try {
    body = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', (chunk) => {
        data += chunk;
        // Limit body size to 1MB to prevent abuse
        if (data.length > 1_048_576) {
          reject(new Error('Request body too large'));
        }
      });
      req.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error('Invalid JSON'));
        }
      });
      req.on('error', reject);
    });
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
    return;
  }

  const { conversationId, message, providerConfig } = body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Message must be a non-empty string' }));
    return;
  }

  // Disable compression so chunks are sent immediately
  req.headers['accept-encoding'] = 'identity';

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Content-Encoding': 'identity',
    'X-Accel-Buffering': 'no',
  });

  /** Send an SSE event to the client and flush immediately */
  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    if (typeof res.flush === 'function') res.flush();
  };

  try {
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

    sendEvent('user_message', { conversationId: convId, userMessage });

    // Gather tools from connected MCP servers
    const mcpTools = mcpClients.getAllTools();

    // Build messages for the AI
    const aiMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversation.messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const client = providerConfig ? createClientFromConfig(providerConfig) : getPortkeyClient();

    const requestOpts = { messages: aiMessages };

    if (providerConfig?.useMaxCompletionTokens) {
      requestOpts.max_completion_tokens = 2048;
    } else {
      requestOpts.max_tokens = 2048;
    }

    if (providerConfig?.model) {
      requestOpts.model = providerConfig.model;
    }

    if (mcpTools.length > 0) {
      requestOpts.tools = mcpTools.map((t) => ({ type: t.type, function: t.function }));
    }

    // Tool-calling loop with streaming
    const MAX_TOOL_ROUNDS = 10;
    let rounds = 0;
    let fullContent = '';
    let modelName = 'unknown';
    const toolsUsed = [];
    let aborted = false;

    req.on('close', () => {
      aborted = true;
    });

    while (rounds < MAX_TOOL_ROUNDS && !aborted) {
      rounds++;

      // Use streaming for the AI call
      const stream = await client.chat.completions.create({ ...requestOpts, stream: true });

      let chunkContent = '';
      let toolCalls = [];
      let finishReason = null;

      for await (const chunk of stream) {
        if (aborted) break;
        const delta = chunk.choices?.[0]?.delta;
        finishReason = chunk.choices?.[0]?.finish_reason || finishReason;
        modelName = chunk.model || modelName;

        // Stream text content
        if (delta?.content) {
          chunkContent += delta.content;
          fullContent += delta.content;
          sendEvent('chunk', { text: delta.content });
        }

        // Accumulate tool calls
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (tc.index !== undefined) {
              if (!toolCalls[tc.index]) {
                toolCalls[tc.index] = {
                  id: tc.id || '',
                  type: 'function',
                  function: { name: '', arguments: '' },
                };
              }
              if (tc.id) toolCalls[tc.index].id = tc.id;
              if (tc.function?.name) toolCalls[tc.index].function.name += tc.function.name;
              if (tc.function?.arguments)
                toolCalls[tc.index].function.arguments += tc.function.arguments;
            }
          }
        }
      }

      // Filter out incomplete tool calls
      toolCalls = toolCalls.filter((tc) => tc && tc.id && tc.function.name);

      // Handle tool calls
      if ((finishReason === 'tool_calls' || toolCalls.length > 0) && !aborted) {
        requestOpts.messages.push({
          role: 'assistant',
          content: chunkContent || null,
          tool_calls: toolCalls,
        });

        for (const toolCall of toolCalls) {
          const sep = toolCall.function.name.indexOf('__');
          const shortName =
            sep !== -1 ? toolCall.function.name.slice(sep + 2) : toolCall.function.name;
          toolsUsed.push(shortName);
          sendEvent('tool_call', { name: shortName, fullName: toolCall.function.name });

          let toolResult;
          try {
            const args = JSON.parse(toolCall.function.arguments || '{}');
            const mcpResult = await mcpClients.callTool(toolCall.function.name, args);
            toolResult =
              mcpResult.content?.map((c) => c.text || JSON.stringify(c)).join('\n') || 'No result';
          } catch (err) {
            toolResult = `Error: ${err.message || 'Tool call failed'}`;
          }

          requestOpts.messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: toolResult,
          });
        }

        continue;
      }

      // No more tool calls — we're done
      break;
    }

    if (aborted) {
      res.end();
      return;
    }

    // Save assistant message to conversation
    const assistantMessage = {
      id: Random.id(),
      role: 'assistant',
      content: fullContent || 'No response generated.',
      timestamp: new Date(),
      model: modelName,
      toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
    };
    conversation.messages.push(assistantMessage);
    conversation.updatedAt = new Date();

    sendEvent('done', { assistantMessage });
    res.end();
  } catch (error) {
    sendEvent('error', { message: error.message || 'Failed to get AI response' });
    res.end();
  }
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
