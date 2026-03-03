---
description: 'Use when editing React components or JSX files. Covers React 19, Tailwind CSS 4, and component patterns for the test app.'
applyTo: '**/*.jsx'
---

# React Component Conventions

## Style

- Functional components only — no class components
- PascalCase for component names; camelCase for props and handlers
- Tailwind CSS 4 for styling — avoid inline `style` objects and separate CSS files unless necessary
- Destructure props in function signature

## Structure

- One component per file; file name matches component name
- Colocate closely-related helpers in the same file; extract to `imports/` when shared

## Documentation

- Add a JSDoc block above each exported component describing its purpose and key props
- Use PropTypes or TypeScript (if adopted) at system boundaries for external-facing props
