/**
 * Generate dist barrel entries from TypeScript re-export sources.
 *
 * Bun's bundler collapses barrel re-exports incorrectly when code-splitting is
 * enabled, so we emit runtime entries from source instead of bundling them.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");

/** Strip types/JSDoc and write a runtime ESM barrel from a TypeScript source file. */
function generateBarrel(srcPath: string, distPath: string): void {
  const src = readFileSync(join(root, srcPath), "utf8");

  const js = src
    .replace(/^\/\*\*[\s\S]*?\*\/\s*/m, "")
    .replace(/export type \{[\s\S]*?\} from [^;]+;/g, "")
    .replace(/\/\*\*[\s\S]*?\*\//g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  writeFileSync(join(root, distPath), `${js}\n`);
}

for (const [srcPath, distPath] of [
  ["src/index.ts", "dist/index.js"],
  ["src/webhooks.ts", "dist/webhooks.js"],
  ["src/react.ts", "dist/react.js"],
] as const) {
  generateBarrel(srcPath, distPath);
}
