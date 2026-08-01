/**
 * @module
 * Shared Web Push channel contracts — sibling types to email MailOptions/Transport/Hooks.
 *
 * Sently-first: this contract is the stable push surface. Provider transports
 * implement {@link PushTransport}.
 */
import type { VerifyResult } from "./types.js";

/** Browser push subscription as returned by the Push API. */
export interface PushSubscription {
  /** Push service endpoint URL. */
  endpoint: string;
  /** Client encryption keys for RFC 8291 payload encryption. */
  keys: {
    /** Base64url-encoded P-256 ECDH public key. */
    p256dh: string;
    /** Base64url-encoded authentication secret. */
    auth: string;
  };
}

/** Options for sending a Web Push notification. */
export interface PushOptions {
  /** Target browser push subscription. */
  subscription: PushSubscription;
  /** Notification title. */
  title: string;
  /** Notification body text. */
  body: string;
  /** Arbitrary application data attached to the notification. */
  data?: Record<string, unknown>;
  /** Notification icon URL. */
  icon?: string;
  /** Time-to-live in seconds for the push message. */
  ttl?: number;
  /** Client-supplied message identifier when known. */
  messageId?: string;
}

/** Result returned after a push notification is accepted by the push service. */
export interface PushSendResult {
  /** Client-generated or assigned message identifier. */
  messageId: string;
  /** Delivery status string (e.g. `"accepted"`). */
  status: string;
  /** Human-readable or raw status text (often the HTTP status). */
  response: string;
  /** Transport or provider identifier (e.g. `"webpush"`). */
  provider?: string;
}

/** Pluggable Web Push delivery backend. */
export interface PushTransport {
  /**
   * Stable provider identifier for observability (e.g. `"webpush"`).
   * Prefer this over constructor-name inference in hooks.
   */
  readonly provider?: string;
  /** Send a push notification through this transport. */
  send(options: PushOptions): Promise<PushSendResult>;
  /** Test connectivity and credentials without sending. */
  verify?(): Promise<VerifyResult>;
  /** Release resources held by the transport. */
  close?(): Promise<void>;
}

/**
 * Context passed to push lifecycle hooks.
 * Uses a redacted subscription endpoint instead of a recipient address (no natural `to`).
 */
export interface PushHookContext {
  /** Message-ID when known (from options or send result). */
  messageId?: string;
  /**
   * Redacted push endpoint for observability: `origin/#<short-hash>`.
   * Never the full URL — the path embeds a long-lived delivery token.
   */
  endpoint: string;
  /** Transport or provider identifier (e.g. `"webpush"`). */
  provider: string;
}

/** Optional lifecycle hooks for metrics, tracing, and observability on every push send. */
export interface PushHooks {
  /** Fired before the transport sends the notification. */
  onSend?: (ctx: PushHookContext) => void | Promise<void>;
  /**
   * Fired after a successful send.
   * @param durationMs — elapsed milliseconds from send start to success (optional third argument).
   */
  onSuccess?: (
    ctx: PushHookContext,
    result: PushSendResult,
    durationMs?: number,
  ) => void | Promise<void>;
  /**
   * Fired when a send throws (error is re-thrown after the hook runs).
   * @param durationMs — elapsed milliseconds from send start to failure (optional third argument).
   */
  onError?: (ctx: PushHookContext, error: unknown, durationMs?: number) => void | Promise<void>;
}

/**
 * A push plugin transforms {@link PushOptions} before the transport sends.
 * Plugins run sequentially. Each receives the output of the previous.
 * Return a new options object — do not mutate the input.
 */
export type PushPlugin =
  | ((options: PushOptions) => PushOptions)
  | ((options: PushOptions) => Promise<PushOptions>);
