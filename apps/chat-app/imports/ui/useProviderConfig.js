/* global window */
import { useState, useCallback } from 'react';
import { STORAGE_KEY, getDefaultConfig, getProvider } from './providers';

/**
 * Hook for managing AI provider configuration in localStorage.
 * Keys are stored only in the browser and sent with each request.
 * @returns {object} Config state and management functions
 */
export function useProviderConfig() {
  const [config, setConfigState] = useState(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return stored ? { ...getDefaultConfig(), ...JSON.parse(stored) } : getDefaultConfig();
    } catch {
      return getDefaultConfig();
    }
  });

  /** Persist config to localStorage and update state */
  const setConfig = useCallback((updater) => {
    setConfigState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // localStorage quota exceeded — ignore silently
      }
      return next;
    });
  }, []);

  /** Clear all stored keys and configuration */
  const clearAll = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setConfigState(getDefaultConfig());
  }, []);

  /** Whether the current config has enough info to make requests */
  const isConfigured = Boolean(
    config.activeProvider && config.model && config.keys[config.activeProvider],
  );

  /**
   * Build the providerConfig payload to send with each chat request.
   * @returns {object|null} Config object for the server, or null if not configured
   */
  const getRequestConfig = useCallback(() => {
    if (!config.activeProvider || !config.keys[config.activeProvider] || !config.model) {
      return null;
    }
    const provider = getProvider(config.activeProvider);
    const baseUrl = config.activeProvider === 'custom' ? config.customBaseUrl : provider?.baseUrl;

    const result = {
      provider: config.activeProvider,
      apiKey: config.keys[config.activeProvider],
      model: config.model,
      baseUrl,
    };

    if (provider?.useMaxCompletionTokens) {
      result.useMaxCompletionTokens = true;
    }

    if (config.usePortkey && config.portkeyApiKey) {
      result.usePortkey = true;
      result.portkeyApiKey = config.portkeyApiKey;
    }

    return result;
  }, [config]);

  return { config, setConfig, clearAll, isConfigured, getRequestConfig };
}
