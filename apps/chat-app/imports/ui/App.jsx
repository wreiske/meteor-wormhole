import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Meteor } from 'meteor/meteor';
import { McpServersPanel } from './McpServersPanel';

/**
 * Format a timestamp for display in the chat.
 * @param {Date|string} date
 * @returns {string} Formatted time string
 */
function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Render markdown-lite content: code blocks, inline code, bold, italic.
 * @param {string} text
 * @returns {Array<React.ReactNode>}
 */
function renderContent(text) {
  const parts = [];
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(renderInline(text.slice(lastIndex, match.index), parts.length));
    }
    parts.push(
      <pre
        key={`code-${parts.length}`}
        className="my-2 rounded-lg bg-black/40 p-3 text-sm overflow-x-auto border border-purple-500/10"
      >
        <code>{match[2]}</code>
      </pre>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(renderInline(text.slice(lastIndex), parts.length));
  }

  return parts;
}

/**
 * Render inline formatting: `code`, **bold**, *italic*.
 * @param {string} text
 * @param {number} keyBase
 * @returns {React.ReactNode}
 */
function renderInline(text, keyBase) {
  const segments = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <span key={`inline-${keyBase}`}>
      {segments.map((seg, i) => {
        if (seg.startsWith('`') && seg.endsWith('`')) {
          return (
            <code
              key={i}
              className="rounded bg-purple-500/15 px-1.5 py-0.5 text-sm text-purple-300"
            >
              {seg.slice(1, -1)}
            </code>
          );
        }
        if (seg.startsWith('**') && seg.endsWith('**')) {
          return <strong key={i}>{seg.slice(2, -2)}</strong>;
        }
        if (seg.startsWith('*') && seg.endsWith('*')) {
          return <em key={i}>{seg.slice(1, -1)}</em>;
        }
        return seg;
      })}
    </span>
  );
}

/** Typing indicator dots */
function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <div className="flex gap-1.5">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
      <span className="text-xs text-slate-500">AI is thinking...</span>
    </div>
  );
}

/** A single chat message bubble */
function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isAssistant = message.role === 'assistant';

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="bubble-system rounded-lg px-4 py-2 max-w-md text-center">
          <p className="text-xs text-red-300">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[75%] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Avatar + Name */}
        <div className={`flex items-center gap-2 mb-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              isUser ? 'bg-purple-500/30 text-purple-300' : 'bg-cyan-500/30 text-cyan-300'
            }`}
          >
            {isUser ? 'U' : 'AI'}
          </div>
          <span className="text-xs text-slate-500">
            {isUser ? 'You' : 'Assistant'}
            {message.timestamp && ` · ${formatTime(message.timestamp)}`}
          </span>
        </div>

        {/* Bubble */}
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser ? 'bubble-user rounded-tr-sm' : 'bubble-assistant rounded-tl-sm'
          }`}
        >
          <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {renderContent(message.content)}
          </div>
        </div>

        {/* Model info for assistant messages */}
        {isAssistant && message.model && (
          <p className="text-[10px] text-slate-600 mt-1 px-1">
            {message.model}
            {message.usage && ` · ${message.usage.total_tokens} tokens`}
            {message.toolsUsed?.length > 0 && (
              <span className="text-purple-400"> · tools: {message.toolsUsed.join(', ')}</span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

/** Sidebar conversation list item */
function ConversationItem({ conv, isActive, onSelect }) {
  return (
    <button
      onClick={() => onSelect(conv.id)}
      className={`w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm ${
        isActive
          ? 'bg-purple-500/20 border border-purple-500/30 text-white'
          : 'hover:bg-white/5 text-slate-400 border border-transparent'
      }`}
    >
      <div className="flex items-center gap-2">
        <svg
          className="w-4 h-4 shrink-0 opacity-50"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
          />
        </svg>
        <span className="truncate">{conv.preview || 'New conversation'}</span>
      </div>
      <p className="text-[10px] text-slate-600 mt-0.5 pl-6">
        {conv.messageCount} message{conv.messageCount !== 1 ? 's' : ''}
      </p>
    </button>
  );
}

/**
 * Main chat application component.
 * Provides a bi-directional AI chat interface powered by Portkey via Meteor methods.
 */
export function App() {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [status, setStatus] = useState(null);
  const [mcpPanelOpen, setMcpPanelOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  /** Scroll chat to bottom */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(scrollToBottom, [messages, sending, scrollToBottom]);

  /** Focus input on mount and conversation change */
  useEffect(() => {
    inputRef.current?.focus();
  }, [activeConvId]);

  /** Load conversation list */
  const loadConversations = useCallback(() => {
    Meteor.call('chat.list', (err, result) => {
      if (!err && result) {
        setConversations(
          result.map((c) => ({
            id: c.id,
            preview: c.lastMessage || 'New conversation',
            messageCount: c.messageCount,
            updatedAt: c.updatedAt,
          })),
        );
      }
    });
  }, []);

  /** Load chat status */
  const loadStatus = useCallback(() => {
    Meteor.call('chat.status', (err, result) => {
      if (!err) setStatus(result);
    });
  }, []);

  /** Load messages for a conversation */
  const loadMessages = useCallback((convId) => {
    if (!convId) return;
    Meteor.call('chat.history', { conversationId: convId }, (err, result) => {
      if (!err && result) {
        setMessages(result.messages || []);
      }
    });
  }, []);

  /** Poll conversations periodically */
  useEffect(() => {
    loadConversations();
    loadStatus();
    const interval = setInterval(() => {
      loadConversations();
      loadStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, [loadConversations, loadStatus]);

  /** Create a new conversation */
  const handleNewConversation = useCallback(() => {
    Meteor.call('chat.new', (err, result) => {
      if (!err && result) {
        setActiveConvId(result.conversationId);
        setMessages([]);
        loadConversations();
      }
    });
  }, [loadConversations]);

  /** Select a conversation */
  const handleSelectConversation = useCallback(
    (convId) => {
      setActiveConvId(convId);
      loadMessages(convId);
    },
    [loadMessages],
  );

  /** Send a message */
  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setInput('');

    // Optimistically add user message
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    Meteor.call('chat.send', { conversationId: activeConvId, message: text }, (err, result) => {
      setSending(false);

      if (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'system',
            content: err.reason || err.message || 'Failed to send message',
            timestamp: new Date(),
            isError: true,
          },
        ]);
        return;
      }

      // Update conversation ID if this was a new conversation
      if (result.conversationId && result.conversationId !== activeConvId) {
        setActiveConvId(result.conversationId);
      }

      // Replace optimistic messages with server response
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== tempUserMsg.id);
        return [...filtered, result.userMessage, result.assistantMessage];
      });

      loadConversations();
    });
  }, [input, sending, activeConvId, loadConversations]);

  /** Handle Enter key */
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  /** Clear current conversation */
  const handleClear = useCallback(() => {
    if (!activeConvId) return;
    Meteor.call('chat.clear', { conversationId: activeConvId }, (err) => {
      if (!err) {
        setMessages([]);
        setActiveConvId(null);
        loadConversations();
      }
    });
  }, [activeConvId, loadConversations]);

  const configured = status?.configured;

  return (
    <div className="flex h-screen relative">
      {/* Starfield background */}
      <div className="starfield" />

      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-72' : 'w-0'
        } transition-all duration-300 overflow-hidden relative z-10 flex-shrink-0`}
      >
        <div className="glass-panel h-full flex flex-col border-r border-purple-500/10">
          {/* Sidebar header */}
          <div className="p-4 border-b border-purple-500/10">
            <div className="flex items-center gap-2 mb-3">
              <svg
                className="w-6 h-6 text-purple-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z"
                />
              </svg>
              <h1 className="text-lg font-bold gradient-text">Wormhole Chat</h1>
            </div>

            <button
              onClick={handleNewConversation}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/20 hover:border-purple-500/40 transition-all text-sm text-purple-300"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Chat
            </button>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.length === 0 && (
              <p className="text-xs text-slate-600 text-center py-8">No conversations yet</p>
            )}
            {conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                isActive={conv.id === activeConvId}
                onSelect={handleSelectConversation}
              />
            ))}
          </div>

          {/* Status bar */}
          <div className="p-3 border-t border-purple-500/10 text-[10px] text-slate-600">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-1.5 h-1.5 rounded-full ${configured ? 'bg-green-400' : 'bg-red-400'}`}
              />
              {configured ? 'Portkey connected' : 'Portkey not configured'}
            </div>
            {status && (
              <p className="mt-1">
                {status.conversationCount} conversation{status.conversationCount !== 1 ? 's' : ''}
                {' · '}
                {status.toolCount} MCP tool{status.toolCount !== 1 ? 's' : ''}
              </p>
            )}
            {status?.mcpServerCount > 0 && (
              <p className="mt-0.5">
                {status.mcpConnectedCount}/{status.mcpServerCount} MCP server
                {status.mcpServerCount !== 1 ? 's' : ''}
                {' · '}
                {status.externalToolCount} ext. tool{status.externalToolCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col relative z-10 min-w-0">
        {/* Header */}
        <div className="glass-panel border-b border-purple-500/10 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-slate-400"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </button>

          <div className="flex-1">
            <h2 className="text-sm font-semibold text-white">
              {activeConvId ? 'Chat' : 'Wormhole Chat'}
            </h2>
            <p className="text-[10px] text-slate-500">AI-powered chat via Portkey + MCP</p>
          </div>

          {/* MCP Servers button */}
          <button
            onClick={() => setMcpPanelOpen(true)}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-slate-400 hover:text-purple-300 relative"
            title="MCP Servers"
          >
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
                d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-16.5-3a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3m-19.5 0a4.5 4.5 0 0 1 .9-2.7L5.737 5.1a3.375 3.375 0 0 1 2.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 0 1 .9 2.7m0 0a3 3 0 0 1-3 3m0 3h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Zm-3 6h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Z"
              />
            </svg>
            {status?.mcpConnectedCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-purple-500 text-[8px] font-bold text-white flex items-center justify-center">
                {status.mcpConnectedCount}
              </span>
            )}
          </button>

          {activeConvId && (
            <button
              onClick={handleClear}
              className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-slate-500 hover:text-red-400"
              title="Clear conversation"
            >
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
                  d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {!activeConvId && messages.length === 0 ? (
            <WelcomeScreen onNewChat={handleNewConversation} configured={configured} />
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-600 text-sm">Send a message to start chatting</p>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {sending && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="glass-panel border-t border-purple-500/10 p-4">
          <div className="flex items-end gap-3 max-w-4xl mx-auto">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  configured
                    ? 'Type a message... (Enter to send, Shift+Enter for new line)'
                    : 'Configure Portkey API key to start chatting...'
                }
                disabled={!configured || sending}
                rows={1}
                className="w-full resize-none rounded-xl bg-white/5 border border-purple-500/15 px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20 disabled:opacity-50 transition-all"
                style={{ minHeight: '44px', maxHeight: '120px' }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
              />
            </div>

            <button
              onClick={handleSend}
              disabled={!input.trim() || sending || !configured}
              className={`p-3 rounded-xl transition-all ${
                input.trim() && !sending && configured
                  ? 'bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 pulse-ring'
                  : 'bg-white/5 border border-white/10 text-slate-600 cursor-not-allowed'
              }`}
            >
              {sending ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
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
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 12 3.269 3.125A59.768 59.768 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
      {/* MCP Servers panel */}
      <McpServersPanel open={mcpPanelOpen} onClose={() => setMcpPanelOpen(false)} />
    </div>
  );
}

/** Welcome screen shown when no conversation is active */
function WelcomeScreen({ onNewChat, configured }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-lg">
        {/* Wormhole icon */}
        <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-purple-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z"
            />
          </svg>
        </div>

        <h2 className="text-2xl font-bold gradient-text mb-3">Wormhole Chat</h2>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          Bi-directional AI chat powered by <span className="text-purple-300">Portkey</span> and{' '}
          <span className="text-cyan-300">MCP</span>.
          <br />
          Supports any AI provider — OpenAI, Anthropic, Google, and more.
        </p>

        {!configured && (
          <div className="glass-panel rounded-xl p-4 mb-6 text-left">
            <h3 className="text-sm font-semibold text-yellow-300 mb-2">Setup Required</h3>
            <p className="text-xs text-slate-400 mb-3">
              Set your Portkey API key to start chatting:
            </p>
            <pre className="text-xs bg-black/30 rounded-lg p-3 text-slate-300 overflow-x-auto">
              <code>PORTKEY_API_KEY=your-key meteor --port 3100</code>
            </pre>
            <p className="text-[10px] text-slate-600 mt-2">
              Or add <code className="text-purple-300">portkey.apiKey</code> to your{' '}
              <code className="text-purple-300">settings.json</code>
            </p>
          </div>
        )}

        {/* Feature cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="glass-panel rounded-xl p-3">
            <div className="text-purple-400 mb-1">
              <svg
                className="w-5 h-5 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
                />
              </svg>
            </div>
            <p className="text-[10px] text-slate-400">Bi-directional</p>
          </div>
          <div className="glass-panel rounded-xl p-3">
            <div className="text-cyan-400 mb-1">
              <svg
                className="w-5 h-5 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 0 0 2.25-2.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v2.25A2.25 2.25 0 0 0 6 10.5Zm0 9.75h2.25A2.25 2.25 0 0 0 10.5 18v-2.25a2.25 2.25 0 0 0-2.25-2.25H6a2.25 2.25 0 0 0-2.25 2.25V18A2.25 2.25 0 0 0 6 20.25Zm9.75-9.75H18a2.25 2.25 0 0 0 2.25-2.25V6A2.25 2.25 0 0 0 18 3.75h-2.25A2.25 2.25 0 0 0 13.5 6v2.25a2.25 2.25 0 0 0 2.25 2.25Z"
                />
              </svg>
            </div>
            <p className="text-[10px] text-slate-400">Any AI Provider</p>
          </div>
          <div className="glass-panel rounded-xl p-3">
            <div className="text-purple-400 mb-1">
              <svg
                className="w-5 h-5 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z"
                />
              </svg>
            </div>
            <p className="text-[10px] text-slate-400">MCP Tools</p>
          </div>
        </div>

        <button
          onClick={onNewChat}
          disabled={!configured}
          className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${
            configured
              ? 'bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300'
              : 'bg-white/5 border border-white/10 text-slate-600 cursor-not-allowed'
          }`}
        >
          Start a conversation
        </button>
      </div>
    </div>
  );
}
