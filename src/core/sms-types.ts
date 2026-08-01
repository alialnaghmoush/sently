/**
 * @module
 * Shared SMS channel contracts — sibling types to email MailOptions/Transport/Hooks.
 *
 * Sently-first: this contract is the stable SMS surface. Provider transports
 * implement {@link SmsTransport}; vendor extras stay off this module.
 */
import type { VerifyResult } from "./types.js";

/** Options for sending an SMS message. */
export interface SmsOptions {
  /** Recipient phone number (E.164 recommended). */
  to: string;
  /** Message body text. */
  body: string;
  /** Sender phone number or alphanumeric sender ID. */
  from?: string;
  /** Client-supplied message identifier when known. */
  messageId?: string;
}

/** Result returned after an SMS is accepted for delivery. */
export interface SmsSendResult {
  /** Provider-assigned or client message identifier. */
  messageId: string;
  /** Recipient phone number. */
  to: string;
  /** Provider delivery status string (e.g. `"queued"`, `"sent"`). */
  status: string;
  /** Human-readable or raw status text from the provider. */
  response: string;
  /** Transport or provider identifier (e.g. `"twilio-sms"`). */
  provider?: string;
  /**
   * Zero-based index of the transport that handled the send in a fallback chain.
   * Set by {@link FallbackTransport}.
   */
  providerIndex?: number;
}

/** Pluggable SMS delivery backend. */
export interface SmsTransport {
  /**
   * Stable provider identifier for observability (e.g. `"twilio-sms"`).
   * Prefer this over constructor-name inference in hooks.
   */
  readonly provider?: string;
  /** Send an SMS through this transport. */
  send(options: SmsOptions): Promise<SmsSendResult>;
  /** Test connectivity and credentials without sending. */
  verify?(): Promise<VerifyResult>;
  /** Release resources held by the transport. */
  close?(): Promise<void>;
}

/** Context passed to SMS lifecycle hooks (no message body — avoids PII in logs). */
export interface SmsHookContext {
  /** Message-ID when known (from options or send result). */
  messageId?: string;
  /** Recipient phone number. */
  to: string;
  /** Transport or provider identifier (e.g. `"twilio-sms"`). */
  provider: string;
}

/** Optional lifecycle hooks for metrics, tracing, and observability on every SMS send. */
export interface SmsHooks {
  /** Fired before the transport sends the message. */
  onSend?: (ctx: SmsHookContext) => void | Promise<void>;
  /**
   * Fired after a successful send.
   * @param durationMs — elapsed milliseconds from send start to success (optional third argument).
   */
  onSuccess?: (
    ctx: SmsHookContext,
    result: SmsSendResult,
    durationMs?: number,
  ) => void | Promise<void>;
  /**
   * Fired when a send throws (error is re-thrown after the hook runs).
   * @param durationMs — elapsed milliseconds from send start to failure (optional third argument).
   */
  onError?: (ctx: SmsHookContext, error: unknown, durationMs?: number) => void | Promise<void>;
  /** Fired before each retry attempt (requires {@link RetryTransport}). */
  onRetry?: (ctx: SmsHookContext, attempt: number, error: unknown) => void | Promise<void>;
  /**
   * Fired when {@link FallbackTransport} fails over to the next provider.
   * Requires a fallback (or weighted fallback) transport in the SMS stack.
   */
  onFallback?: (
    ctx: SmsHookContext,
    failedProvider: string,
    nextProvider: string,
    error: unknown,
  ) => void | Promise<void>;
}

/**
 * An SMS plugin transforms {@link SmsOptions} before the transport sends.
 * Plugins run sequentially. Each receives the output of the previous.
 * Return a new options object — do not mutate the input.
 */
export type SmsPlugin =
  | ((options: SmsOptions) => SmsOptions)
  | ((options: SmsOptions) => Promise<SmsOptions>);
