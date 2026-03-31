# opencode-eslint-inject

An [OpenCode](https://opencode.ai) plugin that automatically runs ESLint on every file you write or edit, injecting the results directly into the AI agent's tool output — with zero LSP race conditions and no manual lint step required.

## The Problem

OpenCode's ESLint LSP server has a hardcoded 3-second diagnostic timeout. ESLint cold-starts in ~12 seconds in LSP context, so diagnostics always arrive after OpenCode has already unsubscribed. The AI agent never sees ESLint errors inline.

## The Solution

This plugin hooks `tool.execute.after` — which fires **after every `Write` or `Edit` tool call, fully awaited before the result returns to the LLM**. It runs [`eslint_d`](https://github.com/mantoni/eslint_d.js) (a persistent ESLint daemon, warm at ~0.16s) and appends violations directly to the tool output in an `<eslint>` block the agent reads immediately.

```
<eslint file="apps/api/src/modules/foo/foo.service.ts">
apps/api/src/modules/foo/foo.service.ts:42:3: error  Unexpected console statement  no-console
apps/api/src/modules/foo/foo.service.ts:57:1: warning  Missing return type on function  @typescript-eslint/explicit-function-return-type
</eslint>
```

## Requirements

- [OpenCode](https://opencode.ai) ≥ 1.3.10
- [`eslint_d`](https://github.com/mantoni/eslint_d.js) installed in your project: `pnpm add -D eslint_d`
- An `eslint.config.js` (or `.eslintrc.*`) in your project root

## Installation

### 1. Copy the plugin file

Copy `eslint-inject.ts` into your project's `.opencode/plugin/` directory:

```bash
cp eslint-inject.ts /your/project/.opencode/plugin/eslint-inject.ts
```

### 2. Register the plugin in `opencode.json`

Add the plugin to your project's `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "file:///absolute/path/to/your/project/.opencode/plugin/eslint-inject.ts"
  ]
}
```

### 3. Install eslint_d

```bash
# pnpm
pnpm add -D eslint_d

# npm
npm install --save-dev eslint_d

# yarn
yarn add -D eslint_d
```

### 4. Restart OpenCode

Plugins load once at startup — restart OpenCode after adding the plugin.

## Configuration

All configuration is at the top of `eslint-inject.ts`:

```typescript
/** Set to false to disable without removing the plugin. */
const ENABLED = true;

/** File extensions to lint. */
const LINTABLE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

/** Path segments — files matching any of these are skipped. */
const SKIP_PATTERNS = [
  "node_modules",
  "/.opencode/",
  "/dist/",
  "/build/",
  "/.next/",
  "/out/",
  ".generated.",
];

/** Path to eslint_d binary (relative to project root). */
const ESLINT_D_BIN = "./node_modules/.bin/eslint_d";
```

Add project-specific generated file paths to `SKIP_PATTERNS` as needed.

## How It Works

The OpenCode plugin API exposes a `tool.execute.after` hook that fires after every tool call. The `output` object is passed by reference — mutations to `output.output` are returned to the LLM as part of the tool result.

```
Agent calls Write/Edit
       ↓
tool.execute.after fires
       ↓
eslint_d <file> runs (~0.16s warm)
       ↓
violations appended to output.output
       ↓
Agent sees <eslint> block in tool result
       ↓
Agent fixes violations before moving on
```

## Exit Code Handling

| Exit code | Meaning                     | Plugin behaviour                           |
| --------- | --------------------------- | ------------------------------------------ |
| `0`       | No violations               | Appends `✅ clean` confirmation            |
| `1`       | Violations found            | Appends full violation list                |
| `2`       | ESLint crash / config error | Appends warning, does not block            |
| Exception | Plugin error                | Silently swallowed, tool result unaffected |

## Performance

- **Warm** (daemon running): ~0.16–0.22s per file
- **Cold** (first call after daemon restart): ~1.2–2.0s
- The `eslint_d` daemon starts automatically on first call and stays alive for 15 minutes of inactivity

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## License

MIT
