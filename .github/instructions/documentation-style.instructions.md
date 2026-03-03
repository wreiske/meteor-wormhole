---
description: 'Use when writing or updating documentation, JSDoc comments, README files, or code comments. Ensures documentation is useful for both humans and LLMs.'
---

# Documentation Standards

## JSDoc

- Every public function, method, and class **must** have JSDoc
- Include: one-line summary, `@param` (type + description), `@returns`, `@throws`
- Use `{import('zod').ZodType}` style for complex types
- Keep the summary line under 80 characters

## Code Comments

- Explain **why**, not **what** — the code should be self-explanatory for _what_
- Mark non-obvious constraints or gotchas with `// NOTE:` prefix
- Mark temporary workarounds with `// HACK:` and link to an issue if one exists
- Remove stale comments when the code they describe changes

## README & Markdown

- Keep README focused: what it is, how to install, how to use, how to contribute
- Use fenced code blocks with language identifiers (`js, `bash)
- Prefer concrete examples over abstract descriptions

## LLM-Friendly Patterns

- Name functions and variables descriptively — they serve as implicit documentation
- Keep functions short and single-purpose so their intent is obvious from signature + body
- Group related exports so an LLM can infer module purpose from the export list
