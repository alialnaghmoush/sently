import type { MailOptions } from "./types.js";

/**
 * Resolve the idempotency key for a message.
 * Uses explicit `idempotencyKey` or derives from `messageId` when present.
 */
export function resolveIdempotencyKey(options: MailOptions): string | undefined {
  if (options.idempotencyKey) {
    return options.idempotencyKey;
  }
  if (options.messageId) {
    return `msg:${options.messageId}`;
  }
  return undefined;
}
