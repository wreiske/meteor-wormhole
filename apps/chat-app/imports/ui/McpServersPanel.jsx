import React, { useState, useEffect, useCallback } from 'react';
import { Meteor } from 'meteor/meteor';

/** Status badge for an MCP server connection */
function StatusBadge({ status }) {
  const styles = {
    connected: 'bg-green-400/20 text-green-300 border-green-400/30',
    connecting: 'bg-yellow-400/20 text-yellow-300 border-yellow-400/30',
    error: 'bg-red-400/20 text-red-300 border-red-400/30',
    disconnected: 'bg-slate-400/20 text-slate-400 border-slate-400/30',
  };
  const dots = {
    connected: 'bg-green-400',
    connecting: 'bg-yellow-400 animate-pulse',
    error: 'bg-red-400',
    disconnected: 'bg-slate-500',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${styles[status] || styles.disconnected}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status] || dots.disconnected}`} />
      {status}
    </span>
  );
}

/** Card for a single connected MCP server */
function ServerCard({ server, onRemove, onReconnect }) {
  const [expanded, setExpanded] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const handleRemove = () => {
    setRemoving(true);
    onRemove(server.id, () => setRemoving(false));
  };

  const handleReconnect = () => {
    setReconnecting(true);
    onReconnect(server.id, () => setReconnecting(false));
  };

  return (
    <div className="glass-panel rounded-xl p-3 mb-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-white truncate">{server.name}</span>
            <StatusBadge status={server.status} />
          </div>
          <p className="text-[10px] text-slate-500 truncate">{server.url}</p>
          {server.status === 'connected' && (
            <p className="text-[10px] text-slate-500 mt-0.5">
              {server.toolCount} tool{server.toolCount !== 1 ? 's' : ''}
            </p>
          )}
          {server.error && (
            <p className="text-[10px] text-red-400 mt-0.5 break-words">{server.error}</p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {server.status === 'error' && (
            <button
              onClick={handleReconnect}
              disabled={reconnecting}
              className="p-1 rounded hover:bg-white/5 text-slate-500 hover:text-yellow-300 transition-colors"
              title="Reconnect"
            >
              {reconnecting ? (
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : (
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
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
                  />
                </svg>
              )}
            </button>
          )}
          <button
            onClick={handleRemove}
            disabled={removing}
            className="p-1 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
            title="Remove"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expandable tool list */}
      {server.tools.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 mt-2 text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
          >
            <svg
              className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
            {expanded ? 'Hide' : 'Show'} tools
          </button>
          {expanded && (
            <div className="mt-2 pl-3 border-l border-purple-500/10 space-y-1">
              {server.tools.map((tool) => (
                <div key={tool.name} className="text-[11px]">
                  <span className="text-cyan-300 font-mono">{tool.name}</span>
                  {tool.description && (
                    <span className="text-slate-500 ml-1.5">— {tool.description}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * MCP Servers configuration panel.
 * Allows adding, removing, and viewing external MCP server connections.
 * @param {object} props
 * @param {boolean} props.open - Whether the panel is visible
 * @param {Function} props.onClose - Callback to close the panel
 */
export function McpServersPanel({ open, onClose }) {
  const [servers, setServers] = useState([]);

  // Add form state
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [authHeader, setAuthHeader] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  /** Load server list from the server */
  const loadServers = useCallback(() => {
    Meteor.call('mcpServers.list', (err, result) => {
      if (!err && result) setServers(result);
    });
  }, []);

  /** Poll for updates when panel is open */
  useEffect(() => {
    if (!open) return;
    loadServers();
    const interval = setInterval(loadServers, 3000);
    return () => clearInterval(interval);
  }, [open, loadServers]);

  /** Add a new MCP server */
  const handleAdd = useCallback(() => {
    if (!name.trim() || !url.trim()) return;
    setAdding(true);
    setAddError('');

    const headers = {};
    if (authHeader.trim()) {
      headers['Authorization'] = authHeader.trim();
    }

    Meteor.call(
      'mcpServers.add',
      { name: name.trim(), url: url.trim(), headers },
      (err, _result) => {
        setAdding(false);
        if (err) {
          setAddError(err.reason || err.message || 'Failed to add server');
          return;
        }
        setName('');
        setUrl('');
        setAuthHeader('');
        loadServers();
      },
    );
  }, [name, url, authHeader, loadServers]);

  /** Remove an MCP server */
  const handleRemove = useCallback(
    (id, done) => {
      Meteor.call('mcpServers.remove', { id }, (err) => {
        done?.();
        if (!err) loadServers();
      });
    },
    [loadServers],
  );

  /** Reconnect to an MCP server */
  const handleReconnect = useCallback(
    (id, done) => {
      Meteor.call('mcpServers.reconnect', { id }, (_err) => {
        done?.();
        loadServers();
      });
    },
    [loadServers],
  );

  /** Handle Enter key in form fields */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && name.trim() && url.trim()) {
      e.preventDefault();
      handleAdd();
    }
  };

  if (!open) return null;

  const connectedCount = servers.filter((s) => s.status === 'connected').length;
  const totalTools = servers.reduce((sum, s) => sum + s.toolCount, 0);

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
                  d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-16.5-3a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3m-19.5 0a4.5 4.5 0 0 1 .9-2.7L5.737 5.1a3.375 3.375 0 0 1 2.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 0 1 .9 2.7m0 0a3 3 0 0 1-3 3m0 3h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Zm-3 6h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Z"
                />
              </svg>
              MCP Servers
            </h2>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {connectedCount} connected · {totalTools} tool{totalTools !== 1 ? 's' : ''} available
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
        <div className="flex-1 overflow-y-auto p-5">
          {/* Add server form */}
          <div className="mb-5">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
              Add Server
            </h3>
            <div className="space-y-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Server name (e.g. My API)"
                className="w-full rounded-lg bg-white/5 border border-purple-500/15 px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/40 transition-all"
              />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="MCP endpoint URL (e.g. http://localhost:3000/mcp)"
                className="w-full rounded-lg bg-white/5 border border-purple-500/15 px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/40 transition-all"
              />
              <input
                type="text"
                value={authHeader}
                onChange={(e) => setAuthHeader(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Authorization header (optional, e.g. Bearer sk-...)"
                className="w-full rounded-lg bg-white/5 border border-purple-500/15 px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/40 transition-all"
              />
              {addError && <p className="text-xs text-red-400">{addError}</p>}
              <button
                onClick={handleAdd}
                disabled={adding || !name.trim() || !url.trim()}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  name.trim() && url.trim() && !adding
                    ? 'bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/20 text-purple-300'
                    : 'bg-white/5 border border-white/10 text-slate-600 cursor-not-allowed'
                }`}
              >
                {adding ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4.5v15m7.5-7.5h-15"
                      />
                    </svg>
                    Connect Server
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-purple-500/10 mb-5" />

          {/* Server list */}
          <div>
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
              Connected Servers ({servers.length})
            </h3>
            {servers.length === 0 ? (
              <div className="text-center py-8">
                <svg
                  className="w-10 h-10 mx-auto text-slate-700 mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-16.5-3a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3m-19.5 0a4.5 4.5 0 0 1 .9-2.7L5.737 5.1a3.375 3.375 0 0 1 2.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 0 1 .9 2.7m0 0a3 3 0 0 1-3 3m0 3h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Zm-3 6h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Z"
                  />
                </svg>
                <p className="text-xs text-slate-600">No MCP servers configured</p>
                <p className="text-[10px] text-slate-700 mt-1">
                  Add a server above to give the AI access to external tools
                </p>
              </div>
            ) : (
              servers.map((server) => (
                <ServerCard
                  key={server.id}
                  server={server}
                  onRemove={handleRemove}
                  onReconnect={handleReconnect}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
