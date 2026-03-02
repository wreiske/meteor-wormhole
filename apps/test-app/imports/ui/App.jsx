import React, { useState, useCallback, useRef } from 'react';

// ─── Hero ───────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-24 pb-16 text-center">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 text-6xl">🌀</div>
        <h1 className="mb-4 text-5xl font-extrabold tracking-tight text-white">
          Meteor Wormhole
        </h1>
        <p className="mb-2 text-xl text-neutral-300">
          A cosmic bridge connecting Meteor methods to AI agents through{' '}
          <a
            href="https://modelcontextprotocol.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 underline decoration-purple-400/40 hover:decoration-purple-400"
          >
            MCP
          </a>
        </p>
        <p className="mb-8 text-neutral-500">
          Expose your <code className="rounded bg-neutral-800 px-1.5 py-0.5 text-sm text-purple-300">Meteor.methods</code> as
          MCP tools so AI agents like Claude, GPT, and others can discover and invoke them.
        </p>
        <div className="flex justify-center gap-4">
          <a
            href="https://github.com/wreiske/meteor-wormhole"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-purple-500"
          >
            GitHub →
          </a>
          <a
            href="#tester"
            className="rounded-lg border border-neutral-700 px-6 py-3 text-sm font-semibold text-neutral-300 transition hover:border-neutral-500 hover:text-white"
          >
            Try the MCP Tester ↓
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── Features ───────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: '⚡',
    title: 'All-In Mode',
    desc: 'Automatically expose all Meteor methods as MCP tools with a single line of code.',
  },
  {
    icon: '🎯',
    title: 'Opt-In Mode',
    desc: 'Selectively expose specific methods with rich descriptions and input schemas.',
  },
  {
    icon: '🔒',
    title: 'API Key Auth',
    desc: 'Optional bearer token authentication to secure your MCP endpoint.',
  },
  {
    icon: '🔌',
    title: 'Streamable HTTP',
    desc: 'MCP server embedded in your Meteor app via WebApp — no separate process needed.',
  },
  {
    icon: '📐',
    title: 'Input Schemas',
    desc: 'Define JSON Schema for method parameters — auto-converted to Zod for validation.',
  },
  {
    icon: '🛡️',
    title: 'Smart Defaults',
    desc: 'Auto-excludes internal Meteor and accounts methods in all-in mode.',
  },
];

function Features() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-10 text-center text-3xl font-bold text-white">Features</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 transition hover:border-neutral-700"
            >
              <div className="mb-3 text-3xl">{f.icon}</div>
              <h3 className="mb-2 text-lg font-semibold text-white">{f.title}</h3>
              <p className="text-sm leading-relaxed text-neutral-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Quick Start ────────────────────────────────────────────────────────────────

const INSTALL_CODE = `meteor add wreiske:meteor-wormhole`;

const USAGE_CODE = `import { Wormhole } from 'meteor/wreiske:meteor-wormhole';

// All-in mode — expose every method automatically
Wormhole.init({ mode: 'all', path: '/mcp' });

// Or opt-in mode with rich schemas
Wormhole.init({ mode: 'opt-in', path: '/mcp' });
Wormhole.expose('todos.add', {
  description: 'Add a new todo item',
  inputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Todo title' },
    },
    required: ['title'],
  },
});`;

function CodeBlock({ code, label }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="relative">
      {label && (
        <div className="rounded-t-lg border border-b-0 border-neutral-800 bg-neutral-800/50 px-4 py-2 text-xs font-medium text-neutral-400">
          {label}
        </div>
      )}
      <div className={`relative overflow-x-auto border border-neutral-800 bg-neutral-900 p-4 ${label ? 'rounded-b-lg' : 'rounded-lg'}`}>
        <pre className="text-sm leading-relaxed text-neutral-300">
          <code>{code}</code>
        </pre>
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-neutral-400 transition hover:text-white"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

function QuickStart() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-10 text-center text-3xl font-bold text-white">Quick Start</h2>
        <div className="space-y-6">
          <div>
            <h3 className="mb-3 text-lg font-semibold text-neutral-200">1. Install</h3>
            <CodeBlock code={INSTALL_CODE} label="Terminal" />
          </div>
          <div>
            <h3 className="mb-3 text-lg font-semibold text-neutral-200">2. Configure</h3>
            <CodeBlock code={USAGE_CODE} label="server/main.js" />
          </div>
          <div>
            <h3 className="mb-3 text-lg font-semibold text-neutral-200">3. Connect</h3>
            <p className="text-sm text-neutral-400">
              Point your MCP client at{' '}
              <code className="rounded bg-neutral-800 px-1.5 py-0.5 text-purple-300">
                http://localhost:3000/mcp
              </code>{' '}
              — agents can now discover and call your methods as tools.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── API Reference ──────────────────────────────────────────────────────────────

const API_OPTIONS = [
  { option: 'mode', type: "'all' | 'opt-in'", default: "'all'", desc: 'Exposure mode' },
  { option: 'path', type: 'string', default: "'/mcp'", desc: 'HTTP endpoint path' },
  { option: 'name', type: 'string', default: "'meteor-wormhole'", desc: 'MCP server name' },
  { option: 'version', type: 'string', default: "'1.0.0'", desc: 'MCP server version' },
  { option: 'apiKey', type: 'string | null', default: 'null', desc: 'Bearer token for auth' },
  { option: 'exclude', type: '(string|RegExp)[]', default: '[]', desc: 'Methods to exclude (all-in mode)' },
];

function ApiReference() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-10 text-center text-3xl font-bold text-white">API Reference</h2>

        <h3 className="mb-4 text-xl font-semibold text-neutral-200">
          <code className="text-purple-300">Wormhole.init(options)</code>
        </h3>
        <div className="overflow-x-auto rounded-lg border border-neutral-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900 text-left">
                <th className="px-4 py-3 font-medium text-neutral-400">Option</th>
                <th className="px-4 py-3 font-medium text-neutral-400">Type</th>
                <th className="px-4 py-3 font-medium text-neutral-400">Default</th>
                <th className="px-4 py-3 font-medium text-neutral-400">Description</th>
              </tr>
            </thead>
            <tbody>
              {API_OPTIONS.map((row) => (
                <tr key={row.option} className="border-b border-neutral-800/50">
                  <td className="px-4 py-3">
                    <code className="text-purple-300">{row.option}</code>
                  </td>
                  <td className="px-4 py-3 text-neutral-400">
                    <code>{row.type}</code>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    <code>{row.default}</code>
                  </td>
                  <td className="px-4 py-3 text-neutral-300">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 space-y-4">
          <h3 className="text-xl font-semibold text-neutral-200">
            <code className="text-purple-300">Wormhole.expose(methodName, options)</code>
          </h3>
          <p className="text-sm text-neutral-400">
            Explicitly expose a method as an MCP tool. Pass <code className="rounded bg-neutral-800 px-1 py-0.5 text-purple-300">description</code> and{' '}
            <code className="rounded bg-neutral-800 px-1 py-0.5 text-purple-300">inputSchema</code> (JSON Schema)
            for rich tool metadata.
          </p>
          <h3 className="text-xl font-semibold text-neutral-200">
            <code className="text-purple-300">Wormhole.unexpose(methodName)</code>
          </h3>
          <p className="text-sm text-neutral-400">Remove a method from MCP exposure.</p>
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ───────────────────────────────────────────────────────────────

const STEPS = [
  {
    num: '1',
    title: 'Registration',
    desc: 'In all-in mode, the package hooks Meteor.methods to intercept every registration. In opt-in mode, call Wormhole.expose() manually.',
  },
  {
    num: '2',
    title: 'MCP Server',
    desc: 'A Streamable HTTP MCP server is mounted at the configured path (default /mcp) on Meteor\'s WebApp.',
  },
  {
    num: '3',
    title: 'Tool Mapping',
    desc: 'Each exposed Meteor method becomes an MCP tool. Names are sanitized (e.g. todos.add → todos_add).',
  },
  {
    num: '4',
    title: 'Invocation',
    desc: 'When an AI agent calls a tool, the bridge invokes the Meteor method via Meteor.callAsync() and returns the result.',
  },
];

function HowItWorks() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-10 text-center text-3xl font-bold text-white">How It Works</h2>
        <div className="space-y-6">
          {STEPS.map((s) => (
            <div key={s.num} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-600/20 text-lg font-bold text-purple-400">
                {s.num}
              </div>
              <div>
                <h3 className="font-semibold text-white">{s.title}</h3>
                <p className="text-sm text-neutral-400">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── MCP Tester ─────────────────────────────────────────────────────────────────

function McpTester() {
  const [endpoint, setEndpoint] = useState('/mcp');
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState('disconnected'); // disconnected | connecting | connected | error
  const [tools, setTools] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedTool, setSelectedTool] = useState(null);
  const [toolArgs, setToolArgs] = useState('{}');
  const [callResult, setCallResult] = useState(null);
  const sessionIdRef = useRef(null);
  const logIdRef = useRef(0);

  const addLog = useCallback((type, message) => {
    setLogs((prev) => [...prev, { id: ++logIdRef.current, type, message, time: new Date().toLocaleTimeString() }]);
  }, []);

  const makeRequest = useCallback(async (method, path, body) => {
    const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    if (sessionIdRef.current) headers['Mcp-Session-Id'] = sessionIdRef.current;

    const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });

    // Capture session ID from response header
    const sid = res.headers.get('mcp-session-id');
    if (sid) sessionIdRef.current = sid;

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream')) {
      // Parse SSE response
      const text = await res.text();
      const events = text.split('\n').filter(l => l.startsWith('data: ')).map(l => {
        try { return JSON.parse(l.slice(6)); } catch { return null; }
      }).filter(Boolean);
      return events.length === 1 ? events[0] : events;
    }
    return res.json();
  }, [apiKey]);

  const handleConnect = useCallback(async () => {
    setStatus('connecting');
    setTools([]);
    setSelectedTool(null);
    setCallResult(null);
    sessionIdRef.current = null;
    addLog('info', `Connecting to ${endpoint}...`);

    try {
      // Send initialize request
      const initResult = await makeRequest('POST', endpoint, {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'wormhole-web-tester', version: '1.0.0' },
        },
      });

      addLog('success', `Connected! Server: ${initResult?.result?.serverInfo?.name || 'unknown'}`);

      // Send initialized notification
      await makeRequest('POST', endpoint, {
        jsonrpc: '2.0',
        method: 'notifications/initialized',
      });

      // List tools
      const toolsResult = await makeRequest('POST', endpoint, {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
      });

      const foundTools = toolsResult?.result?.tools || [];
      setTools(foundTools);
      addLog('info', `Found ${foundTools.length} tool(s)`);
      setStatus('connected');
    } catch (err) {
      addLog('error', `Connection failed: ${err.message}`);
      setStatus('error');
    }
  }, [endpoint, addLog, makeRequest]);

  const handleDisconnect = useCallback(async () => {
    if (sessionIdRef.current) {
      try {
        const headers = { 'Mcp-Session-Id': sessionIdRef.current };
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
        await fetch(endpoint, { method: 'DELETE', headers });
      } catch { /* ignore */ }
    }
    sessionIdRef.current = null;
    setStatus('disconnected');
    setTools([]);
    setSelectedTool(null);
    setCallResult(null);
    addLog('info', 'Disconnected');
  }, [endpoint, apiKey, addLog]);

  const handleCallTool = useCallback(async () => {
    if (!selectedTool) return;
    addLog('info', `Calling tool: ${selectedTool.name}`);
    setCallResult(null);

    try {
      let parsedArgs;
      try {
        parsedArgs = JSON.parse(toolArgs);
      } catch {
        addLog('error', 'Invalid JSON in arguments');
        return;
      }

      const result = await makeRequest('POST', endpoint, {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: { name: selectedTool.name, arguments: parsedArgs },
      });

      setCallResult(result?.result || result);
      addLog('success', `Tool ${selectedTool.name} returned successfully`);
    } catch (err) {
      addLog('error', `Tool call failed: ${err.message}`);
      setCallResult({ error: err.message });
    }
  }, [selectedTool, toolArgs, endpoint, addLog, makeRequest]);

  const statusColors = {
    disconnected: 'bg-neutral-600',
    connecting: 'bg-yellow-500 animate-pulse',
    connected: 'bg-green-500',
    error: 'bg-red-500',
  };

  return (
    <section id="tester" className="px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-2 text-center text-3xl font-bold text-white">MCP Tester</h2>
        <p className="mb-10 text-center text-sm text-neutral-500">
          Connect to the MCP endpoint running on this app and test your exposed tools live.
        </p>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Connection Panel */}
          <div className="space-y-4">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${statusColors[status]}`} />
                <span className="text-sm font-medium text-neutral-300 capitalize">{status}</span>
              </div>

              <label className="mb-1 block text-xs font-medium text-neutral-500">Endpoint</label>
              <input
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                disabled={status === 'connected'}
                className="mb-3 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:border-purple-500 focus:outline-none disabled:opacity-50"
                placeholder="/mcp"
              />

              <label className="mb-1 block text-xs font-medium text-neutral-500">API Key (optional)</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={status === 'connected'}
                className="mb-4 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:border-purple-500 focus:outline-none disabled:opacity-50"
                placeholder="Bearer token"
              />

              {status !== 'connected' ? (
                <button
                  onClick={handleConnect}
                  disabled={status === 'connecting'}
                  className="w-full rounded-lg bg-purple-600 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:opacity-50"
                >
                  {status === 'connecting' ? 'Connecting...' : 'Connect'}
                </button>
              ) : (
                <button
                  onClick={handleDisconnect}
                  className="w-full rounded-lg border border-neutral-700 py-2.5 text-sm font-semibold text-neutral-300 transition hover:border-red-500 hover:text-red-400"
                >
                  Disconnect
                </button>
              )}
            </div>

            {/* Tools List */}
            {tools.length > 0 && (
              <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
                <h3 className="mb-3 text-sm font-semibold text-neutral-300">
                  Available Tools ({tools.length})
                </h3>
                <div className="space-y-2">
                  {tools.map((tool) => (
                    <button
                      key={tool.name}
                      onClick={() => {
                        setSelectedTool(tool);
                        setToolArgs('{}');
                        setCallResult(null);
                      }}
                      className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                        selectedTool?.name === tool.name
                          ? 'border-purple-500 bg-purple-500/10 text-purple-300'
                          : 'border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                      }`}
                    >
                      <span className="font-mono font-medium">{tool.name}</span>
                      {tool.description && (
                        <span className="mt-0.5 block text-xs text-neutral-500">{tool.description}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tool Invocation & Results */}
          <div className="space-y-4">
            {selectedTool && (
              <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
                <h3 className="mb-1 text-sm font-semibold text-neutral-300">
                  Call: <code className="text-purple-300">{selectedTool.name}</code>
                </h3>
                {selectedTool.description && (
                  <p className="mb-3 text-xs text-neutral-500">{selectedTool.description}</p>
                )}

                {selectedTool.inputSchema?.properties && (
                  <div className="mb-3 rounded-lg bg-neutral-800/50 p-3">
                    <span className="mb-1 block text-xs font-medium text-neutral-500">Expected params:</span>
                    {Object.entries(selectedTool.inputSchema.properties).map(([key, val]) => (
                      <div key={key} className="text-xs text-neutral-400">
                        <code className="text-purple-300">{key}</code>
                        <span className="text-neutral-600">: {val.type}</span>
                        {val.description && <span className="text-neutral-500"> — {val.description}</span>}
                        {selectedTool.inputSchema.required?.includes(key) && (
                          <span className="ml-1 text-red-400">*</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <label className="mb-1 block text-xs font-medium text-neutral-500">Arguments (JSON)</label>
                <textarea
                  value={toolArgs}
                  onChange={(e) => setToolArgs(e.target.value)}
                  rows={4}
                  className="mb-3 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 font-mono text-sm text-neutral-200 placeholder-neutral-600 focus:border-purple-500 focus:outline-none"
                  placeholder='{"key": "value"}'
                />

                <button
                  onClick={handleCallTool}
                  className="w-full rounded-lg bg-purple-600 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-500"
                >
                  Call Tool
                </button>
              </div>
            )}

            {callResult && (
              <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
                <h3 className="mb-3 text-sm font-semibold text-neutral-300">Result</h3>
                <pre className="max-h-64 overflow-auto rounded-lg bg-neutral-800 p-3 text-xs leading-relaxed text-neutral-300">
                  {JSON.stringify(callResult, null, 2)}
                </pre>
              </div>
            )}

            {/* Log Panel */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-300">Log</h3>
                {logs.length > 0 && (
                  <button
                    onClick={() => setLogs([])}
                    className="text-xs text-neutral-600 hover:text-neutral-400"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="max-h-48 space-y-1 overflow-auto font-mono text-xs">
                {logs.length === 0 && (
                  <p className="text-neutral-600">No activity yet. Connect to get started.</p>
                )}
                {logs.map((log) => (
                  <div key={log.id} className="flex gap-2">
                    <span className="shrink-0 text-neutral-600">{log.time}</span>
                    <span
                      className={
                        log.type === 'error'
                          ? 'text-red-400'
                          : log.type === 'success'
                            ? 'text-green-400'
                            : 'text-neutral-400'
                      }
                    >
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-neutral-800 px-6 py-8 text-center text-sm text-neutral-600">
      <p>
        MIT License ·{' '}
        <a
          href="https://github.com/wreiske/meteor-wormhole"
          target="_blank"
          rel="noopener noreferrer"
          className="text-neutral-500 hover:text-neutral-300"
        >
          wreiske/meteor-wormhole
        </a>
      </p>
    </footer>
  );
}

// ─── App ────────────────────────────────────────────────────────────────────────

export function App() {
  return (
    <div className="min-h-screen">
      <Hero />
      <Features />
      <HowItWorks />
      <QuickStart />
      <ApiReference />
      <McpTester />
      <Footer />
    </div>
  );
}
