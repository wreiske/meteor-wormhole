# Project Guidelines — meteor-wormhole

## Tech Stack

- **Framework:** Meteor 3.4+ (server-only package)
- **Frontend:** React 19, Tailwind CSS 4, Rspack
- **Schema validation:** Zod
- **Integration:** MCP (Model Context Protocol) SDK
- **Testing:** Tinytest (Meteor built-in)
- **Monorepo:** `packages/` for Meteor packages, `apps/` for Meteor apps, `test-client/` for standalone test scripts

## Code Style

- ES6 module syntax (`import`/`export`); use `Npm.require()` only for server-side npm packages inside Meteor packages
- `camelCase` for variables, functions, methods; `PascalCase` for classes and React components; `UPPER_SNAKE_CASE` for constants
- Prefix private/internal properties with `_` (e.g., `_registry`, `_initialized`)
- Use arrow functions for callbacks and inline handlers
- 2-space indentation, single quotes for strings
- Prefer `const` over `let`; never use `var`
- **Formatting:** Prettier enforces style automatically — see `.prettierrc`
- **Linting:** ESLint 9 (flat config) with React and Prettier integration — see `eslint.config.js`

## DRY Principle

- Extract shared logic into reusable helpers or utility modules — never duplicate code across files
- When a pattern appears more than once, refactor it into a single source of truth
- Before adding new code, check if similar functionality already exists in the codebase

## Documentation

Every public function, method, and class **must** have a JSDoc comment that includes:

- A one-line summary of what it does
- `@param` with type and description for each parameter
- `@returns` with type and description
- `@throws` when the function can throw

```js
/**
 * Register a Meteor method as an MCP tool.
 * @param {string} methodName - The Meteor method name to expose.
 * @param {object} options - Configuration for the tool.
 * @param {string} options.description - Human-readable description of what the tool does.
 * @param {import('zod').ZodType} options.schema - Zod schema for input validation.
 * @returns {void}
 * @throws {Error} If the method name is already registered.
 */
```

Keep comments concise and focused on **why**, not **what** — the code should be self-explanatory for _what_.

## Architecture

- `packages/meteor-wormhole/lib/` — Core library modules (registry, hooks, MCP bridge, wormhole manager)
- `packages/meteor-wormhole/server.js` — Package entry point, server-only exports
- `packages/meteor-wormhole/tests/` — Tinytest unit tests, one test file per module
- `apps/test-app/` — Meteor demo app for manual testing
- `test-client/` — Standalone MCP client for integration testing

## Build & Test

```bash
# Setup
meteor npm run setup

# Run Meteor test app
cd apps/test-app && meteor npm run start

# Run package tests
cd apps/test-app && meteor test-packages ../../packages/meteor-wormhole

# Run test client
meteor npm run test:client

# Lint & format
npm run lint          # Check for lint errors
npm run lint:fix      # Auto-fix lint errors
npm run format        # Format all files with Prettier
npm run format:check  # Check formatting without writing
```

## Conventions

- One test file per source module, named `<module>-tests.js` in `tests/`
- Use the `withReset()` wrapper in Tinytest to ensure clean state between tests
- Zod schemas define tool input shapes — validate at system boundaries only
- Server-only code: this package never runs on the client
- When modifying `package.js`, keep `api.export()` and `api.addFiles()` in sync with actual exports

## Pre-Commit Checklist

Before committing, always:

1. Husky + lint-staged runs automatically on `git commit` — it lints and formats staged files
2. Verify all tests pass
3. Ensure no `console.log` debugging statements remain
4. Confirm JSDoc is present on any new or changed public API
