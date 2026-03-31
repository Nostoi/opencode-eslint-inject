# Changelog

All notable changes to `opencode-eslint-inject` will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/) and [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.1.1] - 2026-03-31

### Fixed

- Plugin registration key corrected from `"plugins"` (invalid) to `"plugin"` (singular) in `opencode.json` — OpenCode schema v1.3.10 rejects the plural form with "Unrecognized key" and refuses to start

---

## [0.1.0] - 2026-03-31

### Added

- Initial release of `eslint-inject` OpenCode plugin
- `tool.execute.after` hook intercepts `write` and `edit` tool calls
- Runs `eslint_d` on the affected file and appends results to tool output in `<eslint>` blocks
- `ENABLED` constant to disable plugin without removing the file
- `LINTABLE_EXTENSIONS` set — defaults to `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`
- `SKIP_PATTERNS` array — defaults skip `node_modules`, `dist`, `build`, `.next`, `out`, `.generated.`
- `ESLINT_D_BIN` constant for configurable eslint_d path
- Exit code handling: `0` (clean), `1` (violations), `2` (config error / crash)
- Silent exception swallowing — plugin errors never break tool results
- `✅ clean` confirmation appended on exit code 0 so agent knows lint ran

### Context

Built to work around the OpenCode ESLint LSP race condition: ESLint's cold LSP
startup (~12s) always exceeds OpenCode's hardcoded 3s diagnostic subscription
window, meaning inline LSP diagnostics never reach the AI agent. This plugin
bypasses LSP entirely by running `eslint_d` as a subprocess after every file
write/edit.
