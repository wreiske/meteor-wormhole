import React, { useState, useCallback } from 'react';
import { PROVIDERS, getProvider } from './providers';

/**
 * AI Provider configuration panel.
 * Allows users to select a provider, enter API keys, and pick a model.
 * All credentials are stored only in browser localStorage.
 * @param {object} props
 * @param {boolean} props.open - Whether the panel is visible
 * @param {Function} props.onClose - Callback to close the panel
 * @param {object} props.config - Current provider config from useProviderConfig
 * @param {Function} props.setConfig - Config setter from useProviderConfig
 * @param {Function} props.clearAll - Clear all keys from useProviderConfig
 * @param {boolean} props.isConfigured - Whether config is complete
 */
export function ProviderConfigPanel({ open, onClose, config, setConfig, clearAll, isConfigured }) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [showPortkeyKey, setShowPortkeyKey] = useState(false);

  const activeProvider = getProvider(config.activeProvider);

  const handleProviderSelect = useCallback(
    (providerId) => {
      const provider = getProvider(providerId);
      setConfig((prev) => ({
        ...prev,
        activeProvider: providerId,
        model: prev.keys[providerId] ? prev.model : provider?.defaultModel || '',
      }));
    },
    [setConfig],
  );

  const handleApiKeyChange = useCallback(
    (value) => {
      setConfig((prev) => ({
        ...prev,
        keys: { ...prev.keys, [prev.activeProvider]: value },
      }));
    },
    [setConfig],
  );

  const handleModelChange = useCallback(
    (value) => {
      setConfig((prev) => ({ ...prev, model: value }));
    },
    [setConfig],
  );

  const handleCustomBaseUrlChange = useCallback(
    (value) => {
      setConfig((prev) => ({ ...prev, customBaseUrl: value }));
    },
    [setConfig],
  );

  const handlePortkeyToggle = useCallback(() => {
    setConfig((prev) => ({ ...prev, usePortkey: !prev.usePortkey }));
  }, [setConfig]);

  const handlePortkeyKeyChange = useCallback(
    (value) => {
      setConfig((prev) => ({ ...prev, portkeyApiKey: value }));
    },
    [setConfig],
  );

  const handleClearAll = useCallback(() => {
    clearAll();
    setShowApiKey(false);
    setShowPortkeyKey(false);
  }, [clearAll]);

  if (!open) return null;

  const currentApiKey = config.keys[config.activeProvider] || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg max-h-[85vh] mx-4 glass-panel rounded-2xl border border-purple-500/20 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-purple-500/10">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <svg
                className="w-5 h-5 text-purple-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z"
                />
              </svg>
              AI Provider
            </h2>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {isConfigured
                ? `${activeProvider?.name || config.activeProvider} · ${config.model}`
                : 'Configure your AI provider to start chatting'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Provider selector */}
          <div>
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
              Provider
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleProviderSelect(p.id)}
                  className={`text-left px-3 py-2.5 rounded-lg text-sm transition-all border ${
                    config.activeProvider === p.id
                      ? 'bg-purple-500/20 border-purple-500/30 text-white'
                      : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:border-purple-500/15'
                  }`}
                >
                  <span className="font-medium">{p.name}</span>
                  {config.keys[p.id] && (
                    <span className="ml-1.5 text-[10px] text-green-400">●</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* API key input */}
          {config.activeProvider && (
            <div>
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                API Key
              </h3>
              {activeProvider?.note && (
                <p className="text-[10px] text-slate-500 mb-2">{activeProvider.note}</p>
              )}
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={currentApiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder={activeProvider?.placeholder || 'Enter your API key'}
                  className="w-full rounded-lg bg-white/5 border border-purple-500/15 pl-3 pr-10 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/40 transition-all font-mono"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 transition-colors"
                  type="button"
                >
                  {showApiKey ? (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Custom base URL (for custom provider) */}
          {config.activeProvider === 'custom' && (
            <div>
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Base URL
              </h3>
              <input
                type="text"
                value={config.customBaseUrl || ''}
                onChange={(e) => handleCustomBaseUrlChange(e.target.value)}
                placeholder="https://api.example.com/v1"
                className="w-full rounded-lg bg-white/5 border border-purple-500/15 px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/40 transition-all"
              />
            </div>
          )}

          {/* Model selector */}
          {config.activeProvider && (
            <div>
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Model
              </h3>
              {activeProvider?.models?.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {activeProvider.models.map((m) => (
                      <button
                        key={m}
                        onClick={() => handleModelChange(m)}
                        className={`px-2.5 py-1 rounded-md text-xs transition-all border ${
                          config.model === m
                            ? 'bg-purple-500/20 border-purple-500/30 text-purple-300'
                            : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={config.model}
                    onChange={(e) => handleModelChange(e.target.value)}
                    placeholder="Or type a custom model name"
                    className="w-full rounded-lg bg-white/5 border border-purple-500/15 px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/40 transition-all font-mono"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  value={config.model}
                  onChange={(e) => handleModelChange(e.target.value)}
                  placeholder="Enter model name (e.g. gpt-4o)"
                  className="w-full rounded-lg bg-white/5 border border-purple-500/15 px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/40 transition-all font-mono"
                />
              )}
            </div>
          )}

          {/* Portkey gateway toggle */}
          <div className="border-t border-purple-500/10 pt-4">
            <button
              onClick={handlePortkeyToggle}
              className="flex items-center gap-3 text-xs text-slate-400 hover:text-slate-300 transition-colors w-full"
              type="button"
            >
              <div
                className={`w-8 h-4 rounded-full transition-colors shrink-0 ${config.usePortkey ? 'bg-purple-500' : 'bg-white/10'}`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white transition-transform mt-[1px] ${config.usePortkey ? 'translate-x-[17px]' : 'translate-x-[1px]'}`}
                />
              </div>
              <span>Use Portkey Gateway</span>
            </button>
            {config.usePortkey && (
              <div className="mt-3 space-y-2 pl-11">
                <div className="relative">
                  <input
                    type={showPortkeyKey ? 'text' : 'password'}
                    value={config.portkeyApiKey || ''}
                    onChange={(e) => handlePortkeyKeyChange(e.target.value)}
                    placeholder="Portkey API key"
                    className="w-full rounded-lg bg-white/5 border border-purple-500/15 pl-3 pr-10 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/40 transition-all font-mono"
                    autoComplete="off"
                  />
                  <button
                    onClick={() => setShowPortkeyKey(!showPortkeyKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 transition-colors"
                    type="button"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                      />
                    </svg>
                  </button>
                </div>
                <p className="text-[10px] text-slate-600">
                  Routes requests through Portkey for caching, logging, and fallbacks. Required for
                  Anthropic direct keys. Get a free key at{' '}
                  <span className="text-purple-400">portkey.ai</span>
                </p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-purple-500/10" />

          {/* Privacy notice + Clear button */}
          <div className="glass-panel rounded-xl p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                />
              </svg>
              <div className="flex-1">
                <h4 className="text-xs font-semibold text-white mb-1">Your keys are private</h4>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  API keys are stored{' '}
                  <span className="text-slate-300">only in your browser&apos;s local storage</span>.
                  They are sent to the server solely to process each chat request and are{' '}
                  <span className="text-slate-300">never stored, logged, or persisted</span> on the
                  server.
                </p>
              </div>
            </div>
            <button
              onClick={handleClearAll}
              className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-300 text-xs font-medium transition-all"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                />
              </svg>
              Clear All Keys &amp; Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
