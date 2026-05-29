#!/usr/bin/env bun

/**
 * Internal publish script: sync version from package.json to jsr.json,
 * then publish to npm and/or JSR. Not part of the published package.
 *
 * Usage:
 *   bun run scripts/publish.ts [--dry-run] [--npm-only | --jsr-only] [--force]
 *
 * Flags:
 *   --dry-run    Sync version only; print intended commands; do not publish.
 *   --npm-only   Publish only to npm.
 *   --jsr-only   Publish only to JSR.
 *   --force      Skip pre-publish checks (clean tree, branch main).
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

const REPO_ROOT = process.cwd();
const PACKAGE_JSON_PATH = join(REPO_ROOT, "package.json");
const JSR_JSON_PATH = join(REPO_ROOT, "jsr.json");

interface PackageJson {
  name?: string;
  version?: string;
  description?: string;
  [key: string]: unknown;
}

interface JsrJson {
  name?: string;
  version?: string;
  exports?: string | Record<string, string>;
  publish?: { include?: string[]; exclude?: string[] };
  [key: string]: unknown;
}

/**
 * Parses CLI flags for the publish script.
 */
function parseFlags(): {
  dryRun: boolean;
  npmOnly: boolean;
  jsrOnly: boolean;
  force: boolean;
} {
  const { values } = parseArgs({
    options: {
      "dry-run": { type: "boolean", default: false },
      "npm-only": { type: "boolean", default: false },
      "jsr-only": { type: "boolean", default: false },
      force: { type: "boolean", default: false },
    },
    allowPositionals: true,
    args: process.argv.slice(2),
  });
  return {
    dryRun: values["dry-run"] ?? false,
    npmOnly: values["npm-only"] ?? false,
    jsrOnly: values["jsr-only"] ?? false,
    force: values.force ?? false,
  };
}

/**
 * Reads and parses package.json from repo root.
 */
function readPackageJson(): PackageJson {
  const raw = readFileSync(PACKAGE_JSON_PATH, "utf-8");
  return JSON.parse(raw) as PackageJson;
}

/**
 * Reads and parses jsr.json from repo root; returns null if missing.
 */
function readJsrJson(): JsrJson | null {
  if (!existsSync(JSR_JSON_PATH)) return null;
  const raw = readFileSync(JSR_JSON_PATH, "utf-8");
  return JSON.parse(raw) as JsrJson;
}

/**
 * Writes jsr.json with the given content (pretty-printed).
 */
function writeJsrJson(jsr: JsrJson): void {
  writeFileSync(JSR_JSON_PATH, `${JSON.stringify(jsr, null, 2)}\n`, "utf-8");
}

/**
 * Syncs version from package.json to jsr.json. Creates jsr.json with minimal
 * structure if it does not exist. Returns the version string.
 */
function syncVersion(): string {
  const pkg = readPackageJson();
  const version = pkg.version ?? "0.0.0";

  let jsr = readJsrJson();
  if (!jsr) {
    jsr = {
      name: "@alialnaghmoush/sently",
      version,
      description: pkg.description,
      exports: "./src/index.ts",
    };
  } else {
    jsr.version = version;
    if (pkg.description !== undefined) jsr.description = pkg.description;
  }
  writeJsrJson(jsr);
  return version;
}

/**
 * Runs a command and returns true if exit code is 0.
 */
function run(cmd: string[], opts: { cwd: string; verbose?: boolean }): Promise<boolean> {
  const { cwd, verbose = true } = opts;
  if (verbose) {
    console.error(`[publish] ${cmd.join(" ")}`);
  }
  const proc = Bun.spawn(cmd, {
    cwd,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });
  return proc.exited.then((code) => code === 0);
}

/**
 * Checks if the working tree is clean (no uncommitted changes).
 */
async function isCleanTree(): Promise<boolean> {
  const proc = Bun.spawn(["git", "status", "--porcelain"], {
    cwd: REPO_ROOT,
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  return out.trim() === "";
}

/**
 * Returns the current Git branch name or null if not a repo / detached.
 */
async function getCurrentBranch(): Promise<string | null> {
  const proc = Bun.spawn(["git", "rev-parse", "--abbrev-ref", "HEAD"], {
    cwd: REPO_ROOT,
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  const code = await proc.exited;
  if (code !== 0) return null;
  const branch = out.trim();
  return branch && branch !== "HEAD" ? branch : null;
}

/**
 * Pre-publish checks: clean tree and branch is main. Skip if --force.
 */
async function prePublishChecks(force: boolean): Promise<void> {
  if (force) return;

  const clean = await isCleanTree();
  if (!clean) {
    console.error(
      "[publish] Working tree is not clean. Commit or stash changes, or use --force to skip.",
    );
    process.exit(2);
  }

  const branch = await getCurrentBranch();
  if (branch !== "main") {
    console.error(
      `[publish] Current branch is "${branch ?? "detached"}", not main. Checkout main or use --force to skip.`,
    );
    process.exit(2);
  }
}

async function main(): Promise<void> {
  const flags = parseFlags();

  if (!existsSync(PACKAGE_JSON_PATH)) {
    console.error("[publish] package.json not found in current directory.");
    process.exit(2);
  }

  if (flags.dryRun) {
    const version = syncVersion();
    console.error(`[publish] Version synced: ${version}`);
    console.error("[publish] Dry run — would execute:");
    if (!flags.jsrOnly) console.error("  npm publish --provenance --cache ./.npm-cache");
    if (!flags.npmOnly) console.error("  bunx jsr publish --allow-dirty");
    process.exit(0);
  }

  await prePublishChecks(flags.force);

  const version = syncVersion();
  console.error(`[publish] Version synced: ${version}`);

  const doNpm = !flags.jsrOnly;
  const doJsr = !flags.npmOnly;

  if (doNpm) {
    const ok = await run(["npm", "publish", "--provenance", "--cache", "./.npm-cache"], {
      cwd: REPO_ROOT,
    });
    if (!ok) {
      console.error("[publish] npm publish failed.");
      process.exit(2);
    }
  }

  if (doJsr) {
    const ok = await run(["bunx", "jsr", "publish", "--allow-dirty"], { cwd: REPO_ROOT });
    if (!ok) {
      console.error("[publish] jsr publish failed.");
      process.exit(2);
    }
  }

  console.error("[publish] Done.");
}

main().catch((err) => {
  console.error("[publish]", err);
  process.exit(2);
});
