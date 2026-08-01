/**
 * @module
 * Duck-typed wiring for RetryTransport / FallbackTransport sender hooks.
 * Kept separate so channel senders do not import the decorator modules.
 */

/** Transport that accepts per-send retry callbacks. */
export interface RetryHookTransport {
  setMailerOnRetry(callback: ((attempt: number, error: unknown) => void) | undefined): void;
}

/** Transport that accepts per-send fallback callbacks. */
export interface FallbackHookTransport {
  setMailerOnFallback(
    callback: ((failedProvider: string, nextProvider: string, error: unknown) => void) | undefined,
  ): void;
}

/** True when the transport exposes {@link RetryHookTransport.setMailerOnRetry}. */
export function isRetryHookTransport(transport: unknown): transport is RetryHookTransport {
  return (
    typeof transport === "object" &&
    transport !== null &&
    typeof (transport as RetryHookTransport).setMailerOnRetry === "function"
  );
}

/** True when the transport exposes {@link FallbackHookTransport.setMailerOnFallback}. */
export function isFallbackHookTransport(transport: unknown): transport is FallbackHookTransport {
  return (
    typeof transport === "object" &&
    transport !== null &&
    typeof (transport as FallbackHookTransport).setMailerOnFallback === "function"
  );
}
