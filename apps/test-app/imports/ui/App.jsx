import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, useInView, useScroll, useTransform, AnimatePresence } from 'motion/react';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('json', json);

// ─── Shared Animation Helpers ───────────────────────────────────────────────────

function FadeInSection({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function StaggerChildren({ children, className = '', stagger = 0.1 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const staggerChild = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

// ─── Floating Particles ─────────────────────────────────────────────────────────

// Pre-generate particle data outside the component to avoid impure render calls
const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 3 + 1,
  duration: Math.random() * 20 + 15,
  delay: Math.random() * 10,
  opacity: Math.random() * 0.5 + 0.1,
  color: Math.random() > 0.6 ? 'rgba(139,92,246,' : 'rgba(34,211,238,',
}));

function FloatingParticles() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {PARTICLES.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full particle-float"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: `${p.color}${p.opacity})`,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}${p.opacity * 0.5})`,
            '--float-x': `${p.size * 7 - 10}px`,
            '--float-opacity': p.opacity,
            '--float-opacity-peak': p.opacity * 1.5,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Navbar ─────────────────────────────────────────────────────────────────────

function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[rgba(5,5,16,0.85)] backdrop-blur-xl border-b border-purple-500/10'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#" className="flex items-center gap-2.5 group">
          <div className="relative w-8 h-8">
            <div
              className="absolute inset-0 rounded-full border border-purple-500/50"
              style={{ animation: 'wormhole-spin 8s linear infinite' }}
            />
            <div
              className="absolute inset-1 rounded-full border border-cyan-400/40"
              style={{ animation: 'wormhole-spin 6s linear infinite reverse' }}
            />
            <div className="absolute inset-2 rounded-full bg-purple-500/30" />
          </div>
          <span className="text-sm font-bold text-white tracking-wide">WORMHOLE</span>
        </a>
        <div className="hidden sm:flex items-center gap-6 text-sm">
          <a href="#features" className="text-neutral-400 hover:text-white transition">
            Features
          </a>
          <a href="#how-it-works" className="text-neutral-400 hover:text-white transition">
            How It Works
          </a>
          <a href="#quickstart" className="text-neutral-400 hover:text-white transition">
            Quick Start
          </a>
          <a href="#security" className="text-neutral-400 hover:text-white transition">
            Security
          </a>
          <a href="#tester" className="text-neutral-400 hover:text-white transition">
            Tester
          </a>
          <a
            href="https://github.com/wreiske/meteor-wormhole"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-purple-600/80 px-4 py-2 text-white font-medium hover:bg-purple-500 transition"
          >
            GitHub
          </a>
        </div>
      </div>
    </motion.nav>
  );
}

// ─── Hero ───────────────────────────────────────────────────────────────────────

function WormholePortal() {
  return (
    <div className="wormhole-portal">
      <motion.div
        className="wormhole-ring wormhole-ring-1"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.2 }}
      />
      <motion.div
        className="wormhole-ring wormhole-ring-2"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, delay: 0.4 }}
      />
      <motion.div
        className="wormhole-ring wormhole-ring-3"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.6 }}
      />
      <motion.div
        className="wormhole-ring wormhole-ring-4"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.8 }}
      />
      <motion.div
        className="wormhole-core"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.8, delay: 1 }}
      />
    </div>
  );
}

function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden px-6 pt-32 pb-24 min-h-[90vh] flex items-center"
    >
      {/* Nebula Glows */}
      <div className="nebula-glow nebula-glow-purple absolute -top-40 -left-40" />
      <div className="nebula-glow nebula-glow-cyan absolute -bottom-40 -right-40" />

      <motion.div style={{ y, opacity }} className="mx-auto max-w-4xl text-center relative z-10">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <WormholePortal />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-10"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="inline-block mb-6 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-xs font-medium text-purple-300 tracking-wide"
          >
            MCP &middot; REST API &middot; OpenAPI
          </motion.div>

          <h1 className="mb-6 text-5xl sm:text-7xl font-black tracking-tight">
            <span className="text-white">Meteor</span>{' '}
            <span className="gradient-text">Wormhole</span>
          </h1>

          <p className="mb-4 text-lg sm:text-xl text-neutral-300 max-w-2xl mx-auto leading-relaxed">
            A cosmic bridge connecting your{' '}
            <code className="rounded-md bg-purple-500/15 border border-purple-500/20 px-2 py-0.5 text-sm text-purple-300 font-mono">
              Meteor.methods
            </code>{' '}
            to AI agents via{' '}
            <a
              href="https://modelcontextprotocol.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 underline decoration-cyan-400/30 hover:decoration-cyan-400/60 underline-offset-2 transition"
            >
              MCP
            </a>
            , REST endpoints, and OpenAPI
          </p>

          <p className="mb-10 text-neutral-500 max-w-xl mx-auto">
            Expose your server methods as MCP tools, REST API endpoints with Swagger UI, and
            auto-generated OpenAPI specs — zero config required.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <motion.a
              href="https://github.com/wreiske/meteor-wormhole"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-glow relative rounded-xl bg-purple-600 px-8 py-3.5 text-sm font-bold text-white transition hover:bg-purple-500 hover:shadow-lg hover:shadow-purple-500/25"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                View on GitHub
              </span>
            </motion.a>
            <motion.a
              href="#tester"
              className="rounded-xl border border-neutral-700/50 bg-white/5 px-8 py-3.5 text-sm font-bold text-neutral-300 transition hover:border-purple-500/40 hover:text-white hover:bg-purple-500/5"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Try the Live Tester ↓
            </motion.a>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

// ─── Features ───────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10 border-yellow-400/20',
    title: 'All-In Mode',
    desc: 'Automatically expose all Meteor methods as MCP tools with a single line of code.',
  },
  {
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
    color: 'text-green-400',
    bg: 'bg-green-400/10 border-green-400/20',
    title: 'Opt-In Mode',
    desc: 'Selectively expose specific methods with rich descriptions and input schemas.',
  },
  {
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
    ),
    color: 'text-red-400',
    bg: 'bg-red-400/10 border-red-400/20',
    title: 'API Key Auth',
    desc: 'Optional bearer token authentication to secure your MCP endpoint.',
  },
  {
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0"
        />
      </svg>
    ),
    color: 'text-blue-400',
    bg: 'bg-blue-400/10 border-blue-400/20',
    title: 'Streamable HTTP',
    desc: 'MCP server embedded in your Meteor app via WebApp — no separate process needed.',
  },
  {
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
        />
      </svg>
    ),
    color: 'text-orange-400',
    bg: 'bg-orange-400/10 border-orange-400/20',
    title: 'Input Schemas',
    desc: 'Define JSON Schema for method parameters — auto-converted to Zod for validation.',
  },
  {
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    color: 'text-purple-400',
    bg: 'bg-purple-400/10 border-purple-400/20',
    title: 'Smart Defaults',
    desc: 'Auto-excludes internal Meteor and accounts methods in all-in mode.',
  },
  {
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
    color: 'text-teal-400',
    bg: 'bg-teal-400/10 border-teal-400/20',
    title: 'REST API Endpoints',
    desc: 'Optionally expose all registered methods as REST POST endpoints — perfect for non-MCP clients.',
  },
  {
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    color: 'text-pink-400',
    bg: 'bg-pink-400/10 border-pink-400/20',
    title: 'OpenAPI Spec',
    desc: 'Auto-generates an OpenAPI 3.1 spec from your registry — feed it to any API client or SDK generator.',
  },
  {
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10 border-emerald-400/20',
    title: 'Swagger UI',
    desc: 'Built-in interactive API docs at /api/docs — browse, try, and debug your endpoints without leaving the browser.',
  },
];

function Features() {
  return (
    <section id="features" className="relative px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <FadeInSection>
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">Everything You Need</h2>
            <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
              Wormhole handles the heavy lifting so you can focus on building your Meteor app.
            </p>
          </div>
        </FadeInSection>

        <StaggerChildren className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" stagger={0.08}>
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              variants={staggerChild}
              className="glass-card rounded-2xl p-6 group cursor-default"
            >
              <div
                className={`inline-flex items-center justify-center w-12 h-12 rounded-xl border ${f.bg} ${f.color} mb-4`}
              >
                {f.icon}
              </div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-300 transition">
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed text-neutral-400">{f.desc}</p>
            </motion.div>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}

// ─── How It Works ───────────────────────────────────────────────────────────────

const STEPS = [
  {
    title: 'Registration',
    desc: 'In all-in mode, the package hooks Meteor.methods to intercept every registration. In opt-in mode, call Wormhole.expose() manually.',
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      </svg>
    ),
  },
  {
    title: 'MCP Server',
    desc: "A Streamable HTTP MCP server is mounted at the configured path (default /mcp) on Meteor's WebApp.",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2"
        />
      </svg>
    ),
  },
  {
    title: 'Tool Mapping',
    desc: 'Each exposed Meteor method becomes an MCP tool. Names are sanitized (e.g. todos.add → todos_add) for protocol compliance.',
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
        />
      </svg>
    ),
  },
  {
    title: 'Invocation',
    desc: 'When an AI agent calls a tool, the bridge invokes the Meteor method via Meteor.callAsync() and returns the result.',
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'REST & OpenAPI',
    desc: 'When REST is enabled, each tool also becomes a POST endpoint. An OpenAPI 3.1 spec and Swagger UI are served automatically.',
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="relative px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <FadeInSection>
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">How It Works</h2>
            <p className="text-neutral-400 text-lg max-w-xl mx-auto">
              From registration to invocation in five seamless steps.
            </p>
          </div>
        </FadeInSection>

        <div className="relative">
          <div className="timeline-line" />
          <StaggerChildren className="space-y-10" stagger={0.15}>
            {STEPS.map((s, i) => (
              <motion.div key={i} variants={staggerChild} className="flex gap-5 relative">
                <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--space-dark)] border-2 border-purple-500/50 text-purple-400">
                  {s.icon}
                </div>
                <div className="glass-card rounded-xl p-5 flex-1" style={{ cursor: 'default' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold tracking-widest text-purple-400/60 uppercase">
                      Step {i + 1}
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-lg mb-1">{s.title}</h3>
                  <p className="text-sm text-neutral-400 leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </StaggerChildren>
        </div>
      </div>
    </section>
  );
}

// ─── Code Block with Syntax Highlighting ────────────────────────────────────────

const INSTALL_CODE = `meteor add wreiske:meteor-wormhole`;

const USAGE_CODE = `import { Wormhole } from 'meteor/wreiske:meteor-wormhole';

// All-in mode — expose every method automatically
// Enable REST API with Swagger docs at /api/docs
Wormhole.init({
  mode: 'all',
  path: '/mcp',
  rest: { enabled: true, path: '/api', docs: true },
});

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

function CodeBlock({ code, label, language = 'javascript' }) {
  const [copied, setCopied] = useState(false);
  const highlighted = useMemo(() => hljs.highlight(code, { language }).value, [code, language]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="code-window">
      <div className="code-window-header">
        <div className="code-window-dot bg-red-500/80" />
        <div className="code-window-dot bg-yellow-500/80" />
        <div className="code-window-dot bg-green-500/80" />
        {label && <span className="ml-2 text-xs font-medium text-neutral-500">{label}</span>}
        <button
          onClick={handleCopy}
          className="ml-auto rounded-md border border-neutral-700/50 bg-neutral-800/50 px-2.5 py-1 text-xs text-neutral-500 transition hover:text-white hover:border-purple-500/40"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <div className="code-window-body">
        <pre>
          <code
            className={`hljs language-${language}`}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </pre>
      </div>
    </div>
  );
}

function QuickStart() {
  return (
    <section id="quickstart" className="relative px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <FadeInSection>
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">Quick Start</h2>
            <p className="text-neutral-400 text-lg max-w-xl mx-auto">
              Get up and running in under a minute.
            </p>
          </div>
        </FadeInSection>

        <div className="space-y-8">
          <FadeInSection delay={0.1}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/20 text-sm font-bold text-purple-400">
                1
              </div>
              <h3 className="text-lg font-bold text-white">Install the package</h3>
            </div>
            <CodeBlock code={INSTALL_CODE} label="Terminal" language="bash" />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="text-xs text-neutral-600">Also available on:</span>
              <a
                href="https://atmospherejs.com/wreiske/meteor-wormhole"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/10 bg-purple-500/5 px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-purple-300 hover:border-purple-500/30 transition"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
                Atmosphere
              </a>
              <a
                href="https://packosphere.com/wreiske/meteor-wormhole"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/10 bg-purple-500/5 px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-purple-300 hover:border-purple-500/30 transition"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18s-.41-.06-.57-.18l-7.9-4.44A.991.991 0 013 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18s.41.06.57.18l7.9 4.44c.32.17.53.5.53.88v9zM12 4.15L5 8.09v7.82l7 3.94 7-3.94V8.09l-7-3.94z" />
                </svg>
                Packosphere
              </a>
            </div>
          </FadeInSection>

          <FadeInSection delay={0.2}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/20 text-sm font-bold text-purple-400">
                2
              </div>
              <h3 className="text-lg font-bold text-white">Configure your server</h3>
            </div>
            <CodeBlock code={USAGE_CODE} label="server/main.js" language="javascript" />
          </FadeInSection>

          <FadeInSection delay={0.3}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/20 text-sm font-bold text-purple-400">
                3
              </div>
              <h3 className="text-lg font-bold text-white">Connect your AI agent</h3>
            </div>
            <div className="glass-card rounded-2xl p-6" style={{ cursor: 'default' }}>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Point your MCP client at{' '}
                <code className="rounded-md bg-purple-500/15 border border-purple-500/20 px-2 py-0.5 text-purple-300 font-mono text-xs">
                  http://localhost:3000/mcp
                </code>{' '}
                — agents can now discover and call your methods as tools. Works with Claude Desktop,
                Cursor, Windsurf, and any MCP-compatible client.
              </p>
            </div>
          </FadeInSection>
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
  {
    option: 'exclude',
    type: '(string|RegExp)[]',
    default: '[]',
    desc: 'Methods to exclude (all-in mode)',
  },
  {
    option: 'rest',
    type: 'boolean | object',
    default: 'false',
    desc: 'Enable REST API endpoints (set true or { enabled, path, docs, apiKey })',
  },
];

function ApiReference() {
  return (
    <section id="api" className="relative px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <FadeInSection>
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">API Reference</h2>
            <p className="text-neutral-400 text-lg max-w-xl mx-auto">
              A simple, intuitive API surface.
            </p>
          </div>
        </FadeInSection>

        <FadeInSection delay={0.1}>
          <h3 className="mb-4 text-xl font-bold text-white flex items-center gap-2">
            <code className="text-purple-400 font-mono">Wormhole.init(options)</code>
          </h3>
          <div className="overflow-x-auto rounded-xl glass-card" style={{ cursor: 'default' }}>
            <table className="api-table w-full text-sm">
              <thead>
                <tr className="border-b border-purple-500/10 text-left">
                  <th className="px-5 py-3.5 font-semibold text-neutral-300">Option</th>
                  <th className="px-5 py-3.5 font-semibold text-neutral-300">Type</th>
                  <th className="px-5 py-3.5 font-semibold text-neutral-300">Default</th>
                  <th className="px-5 py-3.5 font-semibold text-neutral-300">Description</th>
                </tr>
              </thead>
              <tbody>
                {API_OPTIONS.map((row) => (
                  <tr key={row.option} className="border-b border-purple-500/5 transition">
                    <td className="px-5 py-3.5">
                      <code className="text-purple-400 font-mono text-xs">{row.option}</code>
                    </td>
                    <td className="px-5 py-3.5 text-neutral-400">
                      <code className="text-xs font-mono">{row.type}</code>
                    </td>
                    <td className="px-5 py-3.5 text-neutral-500">
                      <code className="text-xs font-mono">{row.default}</code>
                    </td>
                    <td className="px-5 py-3.5 text-neutral-300 text-xs">{row.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FadeInSection>

        <FadeInSection delay={0.2}>
          <div className="mt-10 space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">
                <code className="text-purple-400 font-mono">
                  Wormhole.expose(methodName, options)
                </code>
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Explicitly expose a method as an MCP tool. Pass{' '}
                <code className="rounded-md bg-purple-500/15 border border-purple-500/20 px-1.5 py-0.5 text-purple-300 text-xs font-mono">
                  description
                </code>
                ,{' '}
                <code className="rounded-md bg-purple-500/15 border border-purple-500/20 px-1.5 py-0.5 text-purple-300 text-xs font-mono">
                  inputSchema
                </code>
                , and optionally{' '}
                <code className="rounded-md bg-purple-500/15 border border-purple-500/20 px-1.5 py-0.5 text-purple-300 text-xs font-mono">
                  outputSchema
                </code>{' '}
                (JSON Schema) for rich tool metadata.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">
                <code className="text-purple-400 font-mono">Wormhole.unexpose(methodName)</code>
              </h3>
              <p className="text-sm text-neutral-400">
                Remove a method from MCP exposure at runtime.
              </p>
            </div>
          </div>
        </FadeInSection>
      </div>
    </section>
  );
}

// ─── Security & Best Practices ──────────────────────────────────────────────

const AUTH_BASIC_CODE = `import { Wormhole } from 'meteor/wreiske:meteor-wormhole';

// Require a Bearer token on every MCP request
Wormhole.init({
  mode: 'all',
  path: '/mcp',
  apiKey: process.env.MCP_API_KEY, // never hard-code secrets
});`;

const AUTH_METHOD_CODE = `Meteor.methods({
  'documents.delete'(documentId) {
    // MCP calls run without a Meteor user session,
    // so validate ownership via your own logic.
    const doc = Documents.findOne(documentId);
    if (!doc) {
      throw new Meteor.Error('not-found', 'Document not found');
    }

    // Use a service-level permission check instead of
    // relying on this.userId (which is null for MCP calls).
    if (!doc.allowMcpAccess) {
      throw new Meteor.Error(
        'forbidden',
        'This document is not accessible via MCP'
      );
    }

    Documents.remove(documentId);
    return { deleted: documentId };
  },
});`;

const AUTH_OPTIN_CODE = `import { Wormhole } from 'meteor/wreiske:meteor-wormhole';

// Opt-in mode: only methods you explicitly expose are visible
Wormhole.init({ mode: 'opt-in', path: '/mcp' });

// Expose only safe, read-only tools
Wormhole.expose('reports.summary', {
  description: 'Get a summary of recent reports',
});

Wormhole.expose('search.products', {
  description: 'Search product catalog',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
      limit: { type: 'number', description: 'Max results (default 10)' },
    },
    required: ['query'],
  },
});

// Destructive methods like 'products.delete' are never exposed`;

const AUTH_EXCLUDE_CODE = `import { Wormhole } from 'meteor/wreiske:meteor-wormhole';

Wormhole.init({
  mode: 'all',
  path: '/mcp',
  apiKey: process.env.MCP_API_KEY,
  exclude: [
    /^admin\\./,     // all admin methods
    /^billing\\./,   // payment & billing
    'users.delete',  // specific dangerous method
    /\\.dangerous$/,  // any method ending in .dangerous
  ],
});`;

const AUTH_VALIDATE_CODE = `Meteor.methods({
  'orders.create'({ productId, quantity }) {
    // Validate input at system boundaries
    if (typeof productId !== 'string' || productId.length === 0) {
      throw new Meteor.Error('validation-error', 'productId is required');
    }
    if (typeof quantity !== 'number' || quantity < 1 || quantity > 100) {
      throw new Meteor.Error(
        'validation-error',
        'quantity must be between 1 and 100'
      );
    }

    const product = Products.findOne(productId);
    if (!product || !product.inStock) {
      throw new Meteor.Error('not-found', 'Product unavailable');
    }

    return Orders.insert({
      productId,
      quantity,
      status: 'pending',
      createdAt: new Date(),
    });
  },
});`;

const SECURITY_PRACTICES = [
  {
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
        />
      </svg>
    ),
    color: 'text-red-400',
    bg: 'bg-red-400/10 border-red-400/20',
    title: 'Always Use an API Key in Production',
    desc: 'Set the apiKey option and load it from an environment variable. Without an API key, anyone can call your MCP endpoint.',
  },
  {
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
    color: 'text-green-400',
    bg: 'bg-green-400/10 border-green-400/20',
    title: 'Prefer Opt-In Mode',
    desc: 'Use mode: "opt-in" and explicitly expose only methods that are safe for AI agents. This gives you full control over what\u2019s accessible.',
  },
  {
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
        />
      </svg>
    ),
    color: 'text-orange-400',
    bg: 'bg-orange-400/10 border-orange-400/20',
    title: 'Exclude Sensitive Methods',
    desc: 'In all-in mode, use the exclude option to block admin, billing, and user-management methods. Accounts methods are auto-excluded.',
  },
  {
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10 border-yellow-400/20',
    title: 'No Meteor User Context',
    desc: 'MCP requests don\u2019t carry a DDP session, so this.userId is null. Never rely on it for auth in methods exposed to MCP \u2014 validate permissions another way.',
  },
  {
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    ),
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10 border-cyan-400/20',
    title: 'Validate All Inputs',
    desc: 'AI agents may send unexpected values. Always validate and sanitize parameters inside your methods, even when using inputSchema.',
  },
  {
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
        />
      </svg>
    ),
    color: 'text-purple-400',
    bg: 'bg-purple-400/10 border-purple-400/20',
    title: 'Don\u2019t Expose Secrets',
    desc: 'Never return sensitive data (tokens, passwords, internal IDs) from MCP tools. Treat tool responses as if they will be shown to end users.',
  },
];

const AUTH_TABS = [
  {
    id: 'api-key',
    label: 'API Key Auth',
    code: AUTH_BASIC_CODE,
    lang: 'javascript',
    file: 'server/main.js',
  },
  {
    id: 'opt-in',
    label: 'Opt-In Mode',
    code: AUTH_OPTIN_CODE,
    lang: 'javascript',
    file: 'server/main.js',
  },
  {
    id: 'exclude',
    label: 'Exclude Patterns',
    code: AUTH_EXCLUDE_CODE,
    lang: 'javascript',
    file: 'server/main.js',
  },
  {
    id: 'method-auth',
    label: 'Method-Level Auth',
    code: AUTH_METHOD_CODE,
    lang: 'javascript',
    file: 'server/methods.js',
  },
  {
    id: 'validation',
    label: 'Input Validation',
    code: AUTH_VALIDATE_CODE,
    lang: 'javascript',
    file: 'server/methods.js',
  },
];

function SecurityBestPractices() {
  const [activeTab, setActiveTab] = useState('api-key');
  const tab = AUTH_TABS.find((t) => t.id === activeTab);

  return (
    <section id="security" className="relative px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <FadeInSection>
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="inline-block mb-6 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-1.5 text-xs font-medium text-red-300 tracking-wide"
            >
              SECURITY
            </motion.div>
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
              Authentication &amp; Best Practices
            </h2>
            <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
              MCP bridges your methods to AI agents. Here&apos;s how to keep your app secure.
            </p>
          </div>
        </FadeInSection>

        {/* Best Practices Cards */}
        <StaggerChildren className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-20" stagger={0.08}>
          {SECURITY_PRACTICES.map((p) => (
            <motion.div
              key={p.title}
              variants={staggerChild}
              className="glass-card rounded-2xl p-6 group cursor-default"
            >
              <div
                className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border ${p.bg} ${p.color} mb-4`}
              >
                {p.icon}
              </div>
              <h3 className="text-base font-bold text-white mb-2 group-hover:text-purple-300 transition">
                {p.title}
              </h3>
              <p className="text-sm leading-relaxed text-neutral-400">{p.desc}</p>
            </motion.div>
          ))}
        </StaggerChildren>

        {/* Code Examples */}
        <FadeInSection>
          <div className="text-center mb-10">
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Authentication Examples
            </h3>
            <p className="text-neutral-400 max-w-xl mx-auto">
              Copy these patterns into your app. Click a tab to see different approaches.
            </p>
          </div>
        </FadeInSection>

        <FadeInSection delay={0.15}>
          <div className="mx-auto max-w-3xl">
            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {AUTH_TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                    activeTab === t.id
                      ? 'bg-purple-600/80 text-white border border-purple-500/50'
                      : 'text-neutral-400 border border-purple-500/10 hover:border-purple-500/30 hover:text-neutral-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Active Code Block */}
            <AnimatePresence mode="wait">
              <motion.div
                key={tab.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <CodeBlock code={tab.code} label={tab.file} language={tab.lang} />
              </motion.div>
            </AnimatePresence>

            {/* Important callout */}
            <div className="mt-8 glass-card rounded-2xl p-6" style={{ cursor: 'default' }}>
              <div className="flex gap-4">
                <div className="shrink-0 mt-0.5">
                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-yellow-400/10 border border-yellow-400/20 text-yellow-400">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">
                    Important: No User Session in MCP
                  </h4>
                  <p className="text-sm text-neutral-400 leading-relaxed">
                    MCP requests arrive over HTTP, not DDP. This means{' '}
                    <code className="rounded-md bg-purple-500/15 border border-purple-500/20 px-1.5 py-0.5 text-purple-300 text-xs font-mono">
                      this.userId
                    </code>{' '}
                    is always{' '}
                    <code className="rounded-md bg-purple-500/15 border border-purple-500/20 px-1.5 py-0.5 text-purple-300 text-xs font-mono">
                      null
                    </code>{' '}
                    inside methods called via MCP. Use the API key for endpoint-level auth from
                    environment variables, and implement your own permission logic inside methods
                    for fine-grained access control.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </FadeInSection>
      </div>
    </section>
  );
}

// ─── MCP Tester ─────────────────────────────────────────────────────────────────

function McpTester() {
  const [endpoint, setEndpoint] = useState('/mcp');
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState('disconnected');
  const [tools, setTools] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedTool, setSelectedTool] = useState(null);
  const [toolArgs, setToolArgs] = useState('{}');
  const [formValues, setFormValues] = useState({});
  const [showRawJson, setShowRawJson] = useState(false);
  const [callResult, setCallResult] = useState(null);
  const sessionIdRef = useRef(null);
  const logIdRef = useRef(0);

  const addLog = useCallback((type, message) => {
    setLogs((prev) => [
      ...prev,
      { id: ++logIdRef.current, type, message, time: new Date().toLocaleTimeString() },
    ]);
  }, []);

  const makeRequest = useCallback(
    async (method, path, body) => {
      const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
      if (sessionIdRef.current) headers['Mcp-Session-Id'] = sessionIdRef.current;

      const res = await fetch(path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const sid = res.headers.get('mcp-session-id');
      if (sid) sessionIdRef.current = sid;

      if (res.status === 202) return null;

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream')) {
        const text = await res.text();
        const events = text
          .split('\n')
          .filter((l) => l.startsWith('data: '))
          .map((l) => {
            try {
              return JSON.parse(l.slice(6));
            } catch {
              return null;
            }
          })
          .filter(Boolean);
        return events.length === 1 ? events[0] : events;
      }
      return res.json();
    },
    [apiKey],
  );

  const handleConnect = useCallback(async () => {
    setStatus('connecting');
    setTools([]);
    setSelectedTool(null);
    setFormValues({});
    setShowRawJson(false);
    setCallResult(null);
    sessionIdRef.current = null;
    addLog('info', `Connecting to ${endpoint}...`);

    try {
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

      await makeRequest('POST', endpoint, {
        jsonrpc: '2.0',
        method: 'notifications/initialized',
      });

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
      } catch {
        /* ignore */
      }
    }
    sessionIdRef.current = null;
    setStatus('disconnected');
    setTools([]);
    setSelectedTool(null);
    setFormValues({});
    setShowRawJson(false);
    setCallResult(null);
    addLog('info', 'Disconnected');
  }, [endpoint, apiKey, addLog]);

  const buildArgsFromForm = useCallback(() => {
    if (!selectedTool?.inputSchema?.properties) return {};
    const args = {};
    for (const [key, schema] of Object.entries(selectedTool.inputSchema.properties)) {
      const val = formValues[key];
      if (val === undefined || val === '') continue;
      if (schema.type === 'number' || schema.type === 'integer') {
        const num = Number(val);
        if (!isNaN(num)) args[key] = num;
      } else if (schema.type === 'boolean') {
        args[key] = val === true || val === 'true';
      } else if (schema.type === 'object' || schema.type === 'array') {
        try {
          args[key] = JSON.parse(val);
        } catch {
          args[key] = val;
        }
      } else {
        args[key] = val;
      }
    }
    return args;
  }, [selectedTool, formValues]);

  const handleFormValueChange = useCallback((key, value) => {
    setFormValues((prev) => {
      const next = { ...prev, [key]: value };
      return next;
    });
  }, []);

  const handleCallTool = useCallback(async () => {
    if (!selectedTool) return;
    addLog('info', `Calling tool: ${selectedTool.name}`);
    setCallResult(null);

    try {
      let parsedArgs;
      if (showRawJson) {
        try {
          parsedArgs = JSON.parse(toolArgs);
        } catch {
          addLog('error', 'Invalid JSON in arguments');
          return;
        }
      } else {
        parsedArgs = buildArgsFromForm();
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
  }, [selectedTool, toolArgs, showRawJson, buildArgsFromForm, endpoint, addLog, makeRequest]);

  const resultHighlighted = useMemo(() => {
    if (!callResult) return '';
    return hljs.highlight(JSON.stringify(callResult, null, 2), { language: 'json' }).value;
  }, [callResult]);

  const statusConfig = {
    disconnected: { color: 'bg-neutral-600', label: 'Disconnected' },
    connecting: { color: 'bg-yellow-500 animate-pulse', label: 'Connecting...' },
    connected: { color: 'bg-green-500', label: 'Connected' },
    error: { color: 'bg-red-500', label: 'Error' },
  };

  return (
    <section id="tester" className="relative px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <FadeInSection>
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">Live MCP Tester</h2>
            <p className="text-neutral-400 text-lg max-w-xl mx-auto">
              Connect to the MCP endpoint and test your exposed tools in real time.
            </p>
          </div>
        </FadeInSection>

        <FadeInSection delay={0.15}>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Connection Panel */}
            <div className="space-y-4">
              <div className="glass-card rounded-2xl p-6" style={{ cursor: 'default' }}>
                <div className="mb-5 flex items-center gap-2.5">
                  <motion.div
                    className={`h-2.5 w-2.5 rounded-full ${statusConfig[status].color}`}
                    animate={
                      status === 'connected'
                        ? {
                            boxShadow: [
                              '0 0 0 0 rgba(34,197,94,0.4)',
                              '0 0 0 6px rgba(34,197,94,0)',
                              '0 0 0 0 rgba(34,197,94,0.4)',
                            ],
                          }
                        : {}
                    }
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <span className="text-sm font-semibold text-neutral-300">
                    {statusConfig[status].label}
                  </span>
                </div>

                <label className="mb-1.5 block text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Endpoint
                </label>
                <input
                  type="text"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  disabled={status === 'connected'}
                  className="mb-4 w-full rounded-xl border border-purple-500/10 bg-[var(--space-dark)] px-4 py-2.5 text-sm text-neutral-200 font-mono placeholder-neutral-600 focus:border-purple-500/40 focus:outline-none disabled:opacity-50 transition"
                  placeholder="/mcp"
                />

                <label className="mb-1.5 block text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  API Key (optional)
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={status === 'connected'}
                  className="mb-5 w-full rounded-xl border border-purple-500/10 bg-[var(--space-dark)] px-4 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 focus:border-purple-500/40 focus:outline-none disabled:opacity-50 transition"
                  placeholder="Bearer token"
                />

                {status !== 'connected' ? (
                  <motion.button
                    onClick={handleConnect}
                    disabled={status === 'connecting'}
                    className="w-full rounded-xl bg-purple-600 py-3 text-sm font-bold text-white transition hover:bg-purple-500 disabled:opacity-50"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    {status === 'connecting' ? 'Connecting...' : 'Connect to MCP'}
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={handleDisconnect}
                    className="w-full rounded-xl border border-neutral-700/50 py-3 text-sm font-bold text-neutral-300 transition hover:border-red-500/40 hover:text-red-400"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    Disconnect
                  </motion.button>
                )}
              </div>

              {/* Tools List */}
              <AnimatePresence>
                {tools.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="glass-card rounded-2xl p-6"
                    style={{ cursor: 'default' }}
                  >
                    <h3 className="mb-3 text-sm font-bold text-neutral-300">
                      Available Tools <span className="text-purple-400">({tools.length})</span>
                    </h3>
                    <div className="space-y-2 max-h-80 overflow-auto">
                      {tools.map((tool) => (
                        <motion.button
                          key={tool.name}
                          onClick={() => {
                            setSelectedTool(tool);
                            setToolArgs('{}');
                            setFormValues({});
                            setShowRawJson(false);
                            setCallResult(null);
                          }}
                          className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                            selectedTool?.name === tool.name
                              ? 'border-purple-500/50 bg-purple-500/10 text-purple-300'
                              : 'border-purple-500/5 text-neutral-400 hover:border-purple-500/20 hover:text-neutral-200'
                          }`}
                          whileHover={{ x: 4 }}
                          transition={{ duration: 0.15 }}
                        >
                          <span className="font-mono font-semibold text-xs">{tool.name}</span>
                          {tool.description && (
                            <span className="mt-0.5 block text-xs text-neutral-500">
                              {tool.description}
                            </span>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Tool Invocation & Results */}
            <div className="space-y-4">
              <AnimatePresence mode="wait">
                {selectedTool && (
                  <motion.div
                    key={selectedTool.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="glass-card rounded-2xl p-6"
                    style={{ cursor: 'default' }}
                  >
                    <h3 className="mb-1 text-sm font-bold text-neutral-300">
                      Call: <code className="text-purple-400 font-mono">{selectedTool.name}</code>
                    </h3>
                    {selectedTool.description && (
                      <p className="mb-4 text-xs text-neutral-500">{selectedTool.description}</p>
                    )}

                    {selectedTool.inputSchema?.properties && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                            Parameters
                          </span>
                          <button
                            onClick={() => {
                              if (!showRawJson) {
                                setToolArgs(JSON.stringify(buildArgsFromForm(), null, 2));
                              }
                              setShowRawJson(!showRawJson);
                            }}
                            className="text-[10px] font-semibold text-neutral-500 hover:text-purple-400 transition uppercase tracking-wider flex items-center gap-1"
                          >
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              {showRawJson ? (
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                                />
                              ) : (
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                                />
                              )}
                            </svg>
                            {showRawJson ? 'Form' : 'JSON'}
                          </button>
                        </div>

                        {showRawJson ? (
                          <textarea
                            value={toolArgs}
                            onChange={(e) => setToolArgs(e.target.value)}
                            rows={Math.max(
                              4,
                              Object.keys(selectedTool.inputSchema.properties).length * 2 + 2,
                            )}
                            className="mb-0 w-full rounded-xl border border-purple-500/10 bg-[var(--space-dark)] px-4 py-3 font-mono text-sm text-neutral-200 placeholder-neutral-600 focus:border-purple-500/40 focus:outline-none transition"
                            placeholder='{"key": "value"}'
                          />
                        ) : (
                          <div className="space-y-3">
                            {Object.entries(selectedTool.inputSchema.properties).map(
                              ([key, schema]) => {
                                const isRequired = selectedTool.inputSchema.required?.includes(key);
                                return (
                                  <div
                                    key={key}
                                    className="rounded-xl bg-purple-500/5 border border-purple-500/10 p-3"
                                  >
                                    <label className="mb-1.5 flex items-center gap-1.5 text-xs">
                                      <code className="text-purple-400 font-mono font-semibold">
                                        {key}
                                      </code>
                                      <span className="text-neutral-600">{schema.type}</span>
                                      {isRequired && (
                                        <span className="text-red-400 text-[10px] font-bold">
                                          required
                                        </span>
                                      )}
                                    </label>
                                    {schema.description && (
                                      <p className="mb-2 text-[11px] text-neutral-500">
                                        {schema.description}
                                      </p>
                                    )}
                                    {schema.type === 'boolean' ? (
                                      <button
                                        onClick={() => handleFormValueChange(key, !formValues[key])}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                                          formValues[key] ? 'bg-purple-600' : 'bg-neutral-700'
                                        }`}
                                      >
                                        <span
                                          className={`inline-block h-4 w-4 rounded-full bg-white transition transform ${
                                            formValues[key] ? 'translate-x-6' : 'translate-x-1'
                                          }`}
                                        />
                                      </button>
                                    ) : schema.enum ? (
                                      <select
                                        value={formValues[key] || ''}
                                        onChange={(e) => handleFormValueChange(key, e.target.value)}
                                        className="w-full rounded-lg border border-purple-500/10 bg-[var(--space-dark)] px-3 py-2 text-sm text-neutral-200 focus:border-purple-500/40 focus:outline-none transition"
                                      >
                                        <option value="">Select...</option>
                                        {schema.enum.map((opt) => (
                                          <option key={opt} value={opt}>
                                            {String(opt)}
                                          </option>
                                        ))}
                                      </select>
                                    ) : schema.type === 'object' || schema.type === 'array' ? (
                                      <textarea
                                        value={formValues[key] || ''}
                                        onChange={(e) => handleFormValueChange(key, e.target.value)}
                                        rows={3}
                                        className="w-full rounded-lg border border-purple-500/10 bg-[var(--space-dark)] px-3 py-2 font-mono text-sm text-neutral-200 placeholder-neutral-600 focus:border-purple-500/40 focus:outline-none transition"
                                        placeholder={schema.type === 'array' ? '[...]' : '{...}'}
                                      />
                                    ) : (
                                      <input
                                        type={
                                          schema.type === 'number' || schema.type === 'integer'
                                            ? 'number'
                                            : 'text'
                                        }
                                        value={formValues[key] ?? ''}
                                        onChange={(e) => handleFormValueChange(key, e.target.value)}
                                        className="w-full rounded-lg border border-purple-500/10 bg-[var(--space-dark)] px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:border-purple-500/40 focus:outline-none transition"
                                        placeholder={
                                          schema.type === 'number' || schema.type === 'integer'
                                            ? '0'
                                            : `Enter ${key}...`
                                        }
                                        step={schema.type === 'integer' ? '1' : 'any'}
                                      />
                                    )}
                                  </div>
                                );
                              },
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {!selectedTool.inputSchema?.properties && (
                      <div className="mb-4">
                        <label className="mb-1.5 block text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                          Arguments (JSON)
                        </label>
                        <textarea
                          value={toolArgs}
                          onChange={(e) => setToolArgs(e.target.value)}
                          rows={4}
                          className="w-full rounded-xl border border-purple-500/10 bg-[var(--space-dark)] px-4 py-3 font-mono text-sm text-neutral-200 placeholder-neutral-600 focus:border-purple-500/40 focus:outline-none transition"
                          placeholder='{"key": "value"}'
                        />
                      </div>
                    )}

                    <motion.button
                      onClick={handleCallTool}
                      className="w-full rounded-xl bg-purple-600 py-3 text-sm font-bold text-white transition hover:bg-purple-500"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      Execute Tool
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {callResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="code-window"
                  >
                    <div className="code-window-header">
                      <div className="code-window-dot bg-red-500/80" />
                      <div className="code-window-dot bg-yellow-500/80" />
                      <div className="code-window-dot bg-green-500/80" />
                      <span className="ml-2 text-xs font-medium text-neutral-500">Result</span>
                    </div>
                    <div className="code-window-body max-h-64 overflow-auto">
                      <pre>
                        <code
                          className="hljs language-json"
                          dangerouslySetInnerHTML={{ __html: resultHighlighted }}
                        />
                      </pre>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Log Panel */}
              <div className="glass-card rounded-2xl p-6" style={{ cursor: 'default' }}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-neutral-300 flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-neutral-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    Log
                  </h3>
                  {logs.length > 0 && (
                    <button
                      onClick={() => setLogs([])}
                      className="text-xs text-neutral-600 hover:text-neutral-400 transition"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="max-h-48 space-y-1 overflow-auto font-mono text-xs">
                  {logs.length === 0 && (
                    <p className="text-neutral-600">No activity yet. Connect to get started.</p>
                  )}
                  <AnimatePresence initial={false}>
                    {logs.map((log) => (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex gap-2"
                      >
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
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </FadeInSection>
      </div>
    </section>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="relative border-t border-purple-500/10 px-6 py-12">
      <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="relative w-6 h-6">
            <div
              className="absolute inset-0 rounded-full border border-purple-500/40"
              style={{ animation: 'wormhole-spin 10s linear infinite' }}
            />
            <div className="absolute inset-1.5 rounded-full bg-purple-500/20" />
          </div>
          <span className="text-xs font-bold text-neutral-500 tracking-wide">METEOR WORMHOLE</span>
        </div>
        <p className="text-sm text-neutral-600">
          MIT License ·{' '}
          <a
            href="https://github.com/wreiske/meteor-wormhole"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-500 hover:text-purple-400 transition"
          >
            wreiske/meteor-wormhole
          </a>
        </p>
      </div>
    </footer>
  );
}

// ─── App ────────────────────────────────────────────────────────────────────────

export function App() {
  return (
    <div className="relative min-h-screen">
      <div className="starfield" />
      <FloatingParticles />
      <Navbar />
      <main className="relative z-10">
        <Hero />
        <div className="section-divider" />
        <Features />
        <div className="section-divider" />
        <HowItWorks />
        <div className="section-divider" />
        <QuickStart />
        <div className="section-divider" />
        <ApiReference />
        <div className="section-divider" />
        <SecurityBestPractices />
        <div className="section-divider" />
        <McpTester />
      </main>
      <Footer />
    </div>
  );
}
