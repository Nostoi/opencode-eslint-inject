# AGENTS.md — opencode-eslint-inject

Instructions for AI agents working on this repository.

## Repository Purpose

This repo contains a single OpenCode plugin: `eslint-inject.ts`. It is a standalone plugin that can be dropped into any OpenCode project.

The canonical copy lives at:

```
/Users/markjedrzejczyk/dev/projects/opencode-eslint-inject/eslint-inject.ts
```

The deployed copy (in use) lives at:

```
/Users/markjedrzejczyk/dev/projects/sampo/.opencode/plugin/eslint-inject.ts
```

**Both files must be kept in sync.** When you change one, change the other.

---

## Versioning Convention

This project uses [Semantic Versioning](https://semver.org/):

- **PATCH** (`0.1.x`) — bug fixes, skip pattern additions, formatting tweaks, documentation updates
- **MINOR** (`0.x.0`) — new configuration options, new hook integrations, new lint runner support, non-breaking behaviour changes
- **MAJOR** (`x.0.0`) — breaking changes to the plugin API, removal of configuration options, changes requiring user action on upgrade

The current version appears in **three places** — always update all three atomically:

1. **`eslint-inject.ts`** — the JSDoc comment at the top: `* eslint-inject — OpenCode plugin vX.Y.Z`
2. **`CHANGELOG.md`** — a new entry under `## [X.Y.Z] - YYYY-MM-DD`
3. **`package.json`** — the `"version"` field (once `package.json` is added)

---

## Changelog Format

`CHANGELOG.md` follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) conventions:

```markdown
## [0.2.0] - 2026-04-01

### Added

- Support for `--fix` auto-fix mode via new `AUTO_FIX` configuration constant

### Changed

- `SKIP_PATTERNS` now also skips `/coverage/` directories by default

### Fixed

- Plugin no longer appends `✅ clean` for binary files that passed the extension check
```

**Allowed section headers**: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`

---

## Workflow for Making Changes

1. **Edit** `eslint-inject.ts` in this repo
2. **Bump the version** in the JSDoc comment at the top of the file
3. **Add a CHANGELOG entry** under a new `## [X.Y.Z] - YYYY-MM-DD` heading
4. **Sync** the updated file to the sampo project:
   ```bash
   cp eslint-inject.ts /Users/markjedrzejczyk/dev/projects/sampo/.opencode/plugin/eslint-inject.ts
   ```
5. **Commit** with the format: `feat: <description> (vX.Y.Z)` or `fix: <description> (vX.Y.Z)`
6. **Tag** the commit: `git tag vX.Y.Z`
7. **Push** with tags: `git push && git push --tags`
8. **Restart OpenCode** — plugins are not hot-reloaded

---

## File Structure

```
opencode-eslint-inject/
├── eslint-inject.ts   # The plugin (single source of truth)
├── README.md          # User-facing documentation
├── AGENTS.md          # This file — AI agent instructions
└── CHANGELOG.md       # Version history
```

No `node_modules`, no build step, no bundler. The plugin is loaded directly as TypeScript by OpenCode's Bun runtime.

---

## Testing Changes

There is no automated test suite. To validate a change:

1. Copy the updated plugin to sampo's `.opencode/plugin/`
2. Restart OpenCode
3. Use the Write or Edit tool on a `.ts` file that has a known ESLint violation
4. Verify the `<eslint>` block appears in the tool output

**Known test case**: Add `console.log("test")` to any backend file in `apps/api/` — the `no-console` rule should fire.

---

## For AI Agents Using This Plugin

**⚠️ CRITICAL: You MUST check for and fix ESLint violations after every Write/Edit.**

The `eslint-inject` plugin automatically runs `eslint_d` after every `Write` and `Edit` tool call and appends the results to the tool output in `<eslint>` blocks.

**What you see after Write/Edit:**

```
<eslint file="/path/to/file.ts">
/path/to/file.ts
5:3  error  Unexpected console statement  no-console
✖ 1 problem (1 error, 0 warnings)
</eslint>
```

**Your responsibility:**

1. **ALWAYS scan tool output for `<eslint>` blocks** after every Write or Edit
2. **If violations exist, you MUST fix them immediately** — do not proceed to the next task
3. **Use the Edit tool** to correct the violations
4. **Re-check** — the next Write/Edit will show updated results in a new `<eslint>` block
5. **Only proceed when clean** — look for `✅ clean` or no errors in the `<eslint>` block

**Example workflow:**

```
You: Write file with console.log
Tool output: <eslint file="...">...no-console error...</eslint>
You: "I see an ESLint violation. I will fix it now."
You: Edit file to remove console.log
Tool output: <eslint file="...">✅ clean</eslint>
You: "ESLint is now clean. Proceeding..."
```

---

## Key Constraints

- **Do NOT export anything other than `ESLintInject`** — OpenCode iterates all named exports and calls each one as a Plugin function. Non-Plugin exports cause a `TypeError`.
- **Always wrap the hook body in try/catch** — an uncaught exception in `tool.execute.after` crashes the tool call for the agent.
- **Do NOT use `import` for `eslint_d`** — it runs as a subprocess via BunShell, not as a Node module.
- **The hook is fully awaited** — keep it fast. The agent waits for the hook before it sees the tool result.

---

## OpenCode Plugin API Reference (v1.3.10)

Relevant types (from `@opencode-ai/plugin`):

```typescript
// tool.execute.after input
{
  tool: string; // "write" | "edit" | ...
  sessionID: string;
  callID: string;
  args: any; // write: { filePath, content } | edit: { filePath, oldString, newString, replaceAll? }
}

// tool.execute.after output (mutable — mutations returned to LLM)
{
  title: string;
  output: string; // ← append lint results here
  metadata: any;
}

// BunShell usage
const proc = await $.cwd(directory)`./node_modules/.bin/eslint_d ${filePath}`
  .nothrow()
  .quiet();
proc.exitCode; // 0 | 1 | 2
proc.stdout.toString();
proc.stderr.toString();
```
