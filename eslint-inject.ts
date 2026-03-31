import type { Plugin } from "@opencode-ai/plugin";

/**
 * eslint-inject — OpenCode plugin v0.1.0
 *
 * Intercepts every Write and Edit tool call, runs eslint_d on the affected
 * file, and appends any violations directly to the tool output so the AI agent
 * sees them immediately — no LSP race condition, no manual lint step required.
 *
 * Requirements:
 *   - eslint_d must be installed: npm i -D eslint_d  (or pnpm add -D eslint_d)
 *   - eslint_d daemon should already be warm for best performance (~0.16s/file)
 *
 * Configuration: edit the constants below.
 */

// ─── Configuration ────────────────────────────────────────────────────────────

/** Set to false to disable the plugin entirely without removing it. */
const ENABLED = true;

/** File extensions that should be linted. */
const LINTABLE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

/** Path segments — if any match, the file is skipped. */
const SKIP_PATTERNS = [
  "node_modules",
  "/.opencode/",
  "/dist/",
  "/build/",
  "/.next/",
  "/out/",
  ".generated.",
];

/** Relative path to eslint_d binary from project root. */
const ESLINT_D_BIN = "./node_modules/.bin/eslint_d";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shouldLint(filePath: string): boolean {
  const lastDot = filePath.lastIndexOf(".");
  if (lastDot === -1) return false;
  const ext = filePath.slice(lastDot);
  if (!LINTABLE_EXTENSIONS.has(ext)) return false;
  return !SKIP_PATTERNS.some((pattern) => filePath.includes(pattern));
}

function formatOutput(filePath: string, raw: string): string {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return `\n\n<eslint file="${filePath}">\n${lines.join("\n")}\n</eslint>`;
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

export const ESLintInject: Plugin = async ({ $, directory }) => {
  if (!ENABLED) return {};

  return {
    "tool.execute.after": async (input, output) => {
      // Only intercept write and edit tool calls
      if (input.tool !== "write" && input.tool !== "edit") return;

      const filePath: string | undefined = input.args?.filePath;
      if (!filePath || !shouldLint(filePath)) return;

      try {
        // .nothrow() prevents exception on exit code 1 (lint violations found)
        // .quiet() suppresses mirroring eslint_d output to terminal
        const proc = await $.cwd(directory)`${ESLINT_D_BIN} ${filePath}`
          .nothrow()
          .quiet();

        const stdout = proc.stdout.toString().trim();
        const stderr = proc.stderr.toString().trim();

        // exit 0 = clean, exit 1 = violations, exit 2 = eslint crash / bad config
        if (proc.exitCode === 0) {
          output.output += `\n\n<eslint file="${filePath}">✅ clean</eslint>`;
          return;
        }

        if (proc.exitCode === 2) {
          const detail = stderr || stdout || "unknown eslint_d error";
          output.output += `\n\n<eslint file="${filePath}">⚠️ eslint_d error (exit 2): ${detail}</eslint>`;
          return;
        }

        // exit 1: violations found
        const combined = [stdout, stderr].filter(Boolean).join("\n");
        if (combined) {
          output.output += formatOutput(filePath, combined);
        }
      } catch (err) {
        // Never let lint failures break tool results — silently skip
        // Uncomment for debugging:
        // output.output += `\n\n<eslint file="${filePath}">⚠️ plugin error: ${err}</eslint>`
      }
    },
  };
};
