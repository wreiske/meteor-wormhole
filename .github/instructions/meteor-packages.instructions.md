---
description: 'Use when editing Meteor package code under packages/. Covers Meteor package conventions, Npm.require usage, Tinytest patterns, and package.js sync rules.'
applyTo: 'packages/**'
---

# Meteor Package Conventions

## Module System

- Use `Npm.require()` for npm dependencies inside Meteor packages (not `import`)
- Use standard ES6 `import`/`export` between package files
- Keep `api.export()` and `api.addFiles()` in `package.js` in sync with actual exports

## Testing

- One test file per source module: `tests/<module>-tests.js`
- Use `withReset()` wrapper around every Tinytest case for clean state
- Assert with `test.equal()`, `test.isTrue()`, `test.isFalse()`, `test.throws()`
- Never import test-only code in production modules

## Documentation

- Every exported function/class requires JSDoc with `@param`, `@returns`, `@throws`
- Write descriptions that help both human developers and LLMs understand intent and constraints
- Document edge cases and non-obvious behavior inline with brief `//` comments

## DRY

- Before adding a helper, check `lib/` for existing utilities
- Shared validation logic belongs in a single module, not scattered across files
