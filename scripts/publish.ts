#!/usr/bin/env bun
// Usage: bun scripts/publish.ts [--dry-run]

const dryRun = process.argv.includes("--dry-run");
const tag = dryRun ? "--dry-run" : "";

console.log("1/4  Running tests...");
await run("bun test");

console.log("2/4  Building...");
await run("bun run build");

console.log("3/4  Publishing to npm...");
await run(`npm publish --access public ${tag}`.trim());

console.log("4/4  Publishing to JSR...");
await run(`npx jsr publish ${tag}`.trim());

/** Spawn a shell command and exit if it fails. */
async function run(cmd: string): Promise<void> {
  const proc = Bun.spawn(cmd.trim().split(" "), { stdout: "inherit", stderr: "inherit" });
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`Command failed: ${cmd}`);
  }
}
