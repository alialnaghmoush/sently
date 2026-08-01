/**
 * @module
 * Minimal transport surface for cross-channel retry / fallback decorators.
 */
import type { VerifyResult } from "./types.js";

/**
 * Structural transport contract used by {@link RetryTransport},
 * {@link FallbackTransport}, and {@link WeightedFallbackTransport}.
 * Compatible with email {@link Transport}, {@link SmsTransport},
 * {@link WhatsAppTransport}, and {@link PushTransport}.
 */
export interface DecoratedTransport<TOptions, TResult> {
  /** Stable provider identifier for observability when set. */
  readonly provider?: string;
  /** Send through this transport. */
  send(options: TOptions): Promise<TResult>;
  /** Optional connectivity check. */
  verify?(): Promise<VerifyResult>;
  /** Optional resource cleanup. */
  close?(): Promise<void>;
  /** Optional batch send (email transports). */
  sendBatch?(messages: TOptions[]): Promise<TResult[]>;
}

/**
 * Result fields added by fallback decorators when a chain member succeeds.
 */
export type FallbackAugmentedResult<TResult> = TResult & {
  provider: string;
  providerIndex: number;
};
