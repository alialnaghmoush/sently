// src/detect.ts
import type { Runtime, SocketAdapter, TLSOptions } from "./core/types.js";

/** Detect the current JavaScript runtime. */
export function detectRuntime(): Runtime {
  if (typeof Bun !== "undefined") {
    return "bun";
  }
  if (typeof Deno !== "undefined") {
    return "deno";
  }
  if (typeof caches !== "undefined" && globalThis.navigator?.userAgent === "Cloudflare-Workers") {
    return "cf-workers";
  }
  if (typeof window !== "undefined") {
    return "browser";
  }
  if (typeof process !== "undefined" && process.versions?.node) {
    return "node";
  }
  return "unknown";
}

/**
 * Dynamically import and instantiate the correct adapter for the current runtime.
 */
export async function createDefaultAdapter(options?: {
  secure?: boolean;
  connectionTimeout?: number;
  tls?: TLSOptions;
}): Promise<SocketAdapter> {
  const runtime = detectRuntime();

  switch (runtime) {
    case "node": {
      const { NodeAdapter } = await import("./adapters/node.js");
      return new NodeAdapter(options);
    }
    case "bun": {
      const { BunAdapter } = await import("./adapters/bun.js");
      return new BunAdapter(options);
    }
    case "deno": {
      const { DenoAdapter } = await import("./adapters/deno.js");
      return new DenoAdapter(options);
    }
    case "cf-workers": {
      const { CloudflareAdapter } = await import("./adapters/cf.js");
      return new CloudflareAdapter(options);
    }
    default:
      throw new Error(`No socket adapter available for runtime: ${runtime}`);
  }
}

declare const Bun: unknown;
declare const Deno: unknown;
