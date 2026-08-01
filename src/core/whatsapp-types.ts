/**
 * @module
 * Shared WhatsApp channel contracts — sibling types to email MailOptions/Transport/Hooks.
 *
 * Sently-first: this contract is the stable WhatsApp surface. Provider transports
 * implement {@link WhatsAppTransport}; multi-product vendors get a separate
 * WhatsApp transport entry, not a mega vendor client.
 *
 * Meta requires a pre-approved template for business-initiated messages; free text
 * is only allowed within an open 24h customer-service window. Model both shapes.
 */
import type { VerifyResult } from "./types.js";

/** Parameter inside a WhatsApp template component. */
export interface WhatsAppTemplateParameter {
  /** Parameter value type. */
  type: "text" | "currency" | "date_time";
  /** Text value when {@link type} is `"text"`. */
  text?: string;
}

/** Component of a WhatsApp template message (header, body, or button). */
export interface WhatsAppTemplateComponent {
  /** Component role in the template. */
  type: "header" | "body" | "button";
  /** Substitution parameters for this component. */
  parameters?: WhatsAppTemplateParameter[];
}

/**
 * Business-initiated WhatsApp message using a pre-approved template.
 * Required outside the 24h customer-service window.
 */
export interface WhatsAppTemplateMessage {
  /** Recipient phone number (E.164 recommended). */
  to: string;
  /** Pre-approved template definition. */
  template: {
    /** Template name registered with Meta. */
    name: string;
    /** Language code (e.g. `"en_US"`). */
    language: string;
    /** Optional header/body/button components with parameters. */
    components?: WhatsAppTemplateComponent[];
  };
  /** Client-supplied message identifier when known. */
  messageId?: string;
}

/**
 * Free-text WhatsApp message.
 * Only valid within an open 24h customer-service window.
 */
export interface WhatsAppTextMessage {
  /** Recipient phone number (E.164 recommended). */
  to: string;
  /** Plain text body. */
  text: string;
  /** Client-supplied message identifier when known. */
  messageId?: string;
}

/** Options for sending a WhatsApp message (template or free text). */
export type WhatsAppOptions = WhatsAppTemplateMessage | WhatsAppTextMessage;

/** Result returned after a WhatsApp message is accepted for delivery. */
export interface WhatsAppSendResult {
  /** Provider-assigned or client message identifier. */
  messageId: string;
  /** Recipient phone number. */
  to: string;
  /** Provider delivery status string (e.g. `"accepted"`). */
  status: string;
  /** Human-readable or raw status text from the provider. */
  response: string;
  /** Transport or provider identifier (e.g. `"whatsapp-cloud"`). */
  provider?: string;
  /**
   * Zero-based index of the transport that handled the send in a fallback chain.
   * Set by {@link FallbackTransport}.
   */
  providerIndex?: number;
}

/** Pluggable WhatsApp delivery backend. */
export interface WhatsAppTransport {
  /**
   * Stable provider identifier for observability (e.g. `"whatsapp-cloud"`).
   * Prefer this over constructor-name inference in hooks.
   */
  readonly provider?: string;
  /** Send a WhatsApp message through this transport. */
  send(options: WhatsAppOptions): Promise<WhatsAppSendResult>;
  /** Test connectivity and credentials without sending. */
  verify?(): Promise<VerifyResult>;
  /** Release resources held by the transport. */
  close?(): Promise<void>;
}

/** Context passed to WhatsApp lifecycle hooks (no message body — avoids PII in logs). */
export interface WhatsAppHookContext {
  /** Message-ID when known (from options or send result). */
  messageId?: string;
  /** Recipient phone number. */
  to: string;
  /** Transport or provider identifier (e.g. `"whatsapp-cloud"`). */
  provider: string;
}

/** Optional lifecycle hooks for metrics, tracing, and observability on every WhatsApp send. */
export interface WhatsAppHooks {
  /** Fired before the transport sends the message. */
  onSend?: (ctx: WhatsAppHookContext) => void | Promise<void>;
  /**
   * Fired after a successful send.
   * @param durationMs — elapsed milliseconds from send start to success (optional third argument).
   */
  onSuccess?: (
    ctx: WhatsAppHookContext,
    result: WhatsAppSendResult,
    durationMs?: number,
  ) => void | Promise<void>;
  /**
   * Fired when a send throws (error is re-thrown after the hook runs).
   * @param durationMs — elapsed milliseconds from send start to failure (optional third argument).
   */
  onError?: (ctx: WhatsAppHookContext, error: unknown, durationMs?: number) => void | Promise<void>;
  /** Fired before each retry attempt (requires {@link RetryTransport}). */
  onRetry?: (ctx: WhatsAppHookContext, attempt: number, error: unknown) => void | Promise<void>;
  /**
   * Fired when {@link FallbackTransport} fails over to the next provider.
   * Requires a fallback (or weighted fallback) transport in the WhatsApp stack.
   */
  onFallback?: (
    ctx: WhatsAppHookContext,
    failedProvider: string,
    nextProvider: string,
    error: unknown,
  ) => void | Promise<void>;
}

/**
 * A WhatsApp plugin transforms {@link WhatsAppOptions} before the transport sends.
 * Plugins run sequentially. Each receives the output of the previous.
 * Return a new options object — do not mutate the input.
 */
export type WhatsAppPlugin =
  | ((options: WhatsAppOptions) => WhatsAppOptions)
  | ((options: WhatsAppOptions) => Promise<WhatsAppOptions>);
