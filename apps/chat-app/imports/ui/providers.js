/**
 * Supported AI provider definitions for the chat app.
 * Each provider has connection details and available models.
 */
export const PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'],
    defaultModel: 'gpt-4o-mini',
    placeholder: 'sk-...',
    // OpenAI requires max_completion_tokens instead of max_tokens for newer models
    useMaxCompletionTokens: true,
  },
  {
    id: 'google',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    models: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro'],
    defaultModel: 'gemini-2.0-flash',
    placeholder: 'AIza...',
    note: 'Get your API key from Google AI Studio',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1/',
    models: ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022'],
    defaultModel: 'claude-sonnet-4-20250514',
    placeholder: 'sk-ant-...',
    note: 'Requires Portkey gateway — enable below, or use via OpenRouter',
    requiresPortkey: true,
  },
  {
    id: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    defaultModel: 'llama-3.3-70b-versatile',
    placeholder: 'gsk_...',
  },
  {
    id: 'mistral',
    name: 'Mistral',
    baseUrl: 'https://api.mistral.ai/v1',
    models: ['mistral-large-latest', 'mistral-small-latest', 'codestral-latest'],
    defaultModel: 'mistral-large-latest',
    placeholder: 'Enter your API key',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: ['openai/gpt-4o', 'anthropic/claude-sonnet-4-20250514', 'google/gemini-2.0-flash-exp'],
    defaultModel: 'openai/gpt-4o-mini',
    placeholder: 'sk-or-...',
    note: 'Access 200+ models from all providers',
  },
  {
    id: 'together',
    name: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    models: ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'Qwen/Qwen2.5-72B-Instruct-Turbo'],
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    placeholder: 'Enter your API key',
  },
  {
    id: 'custom',
    name: 'Custom',
    baseUrl: '',
    models: [],
    defaultModel: '',
    placeholder: 'Enter your API key',
    customBaseUrl: true,
    note: 'Any OpenAI-compatible API endpoint',
  },
];

/**
 * Find a provider definition by ID.
 * @param {string} id - Provider ID
 * @returns {object|undefined} Provider definition
 */
export function getProvider(id) {
  return PROVIDERS.find((p) => p.id === id);
}

/** localStorage key for the provider configuration */
export const STORAGE_KEY = 'wormhole-chat-config';

/**
 * Create a default empty configuration object.
 * @returns {object} Empty config
 */
export function getDefaultConfig() {
  return {
    activeProvider: '',
    model: '',
    customBaseUrl: '',
    usePortkey: false,
    portkeyApiKey: '',
    keys: {},
  };
}
