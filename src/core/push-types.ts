/**
 * @module
 * Shared push channel contracts — sibling types to email MailOptions/Transport/Hooks.
 *
 * Sently-first: this contract is the stable push surface. Provider transports
 * implement {@link PushTransport}. Web Push uses a browser subscription; FCM
 * uses a device registration token.
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

/** Shared notification fields for Web Push and FCM. */
interface PushNotificationFields {
  /** Notification title. */
  title: string;
  /** Notification body text. */
  body: string;
  /** Arbitrary application data attached to the notification. */
  data?: Record<string, unknown>;
  /** Notification icon URL (Web Push / some FCM platforms). */
  icon?: string;
  /** Time-to-live in seconds for the push message. */
  ttl?: number;
  /** Client-supplied message identifier when known. */
  messageId?: string;
}

/** Options for sending a Web Push notification (VAPID / browser subscription). */
export interface WebPushOptions extends PushNotificationFields {
  /** Target browser push subscription. */
  subscription: PushSubscription;
}

/**
 * Options for sending via Firebase Cloud Messaging (device token).
 * Data values are stringified by the FCM transport when needed.
 */
export interface FcmPushOptions extends PushNotificationFields {
  /** FCM registration token for the target device. */
  token: string;
  /** Optional image URL for the notification. */
  image?: string;
}

/** Options for sending a push notification (Web Push or FCM). */
export type PushOptions = WebPushOptions | FcmPushOptions;

/** True when options target FCM (device token) rather than Web Push. */
export function isFcmPushOptions(options: PushOptions): options is FcmPushOptions {
  return "token" in options && typeof (options as FcmPushOptions).token === "string";
}

/** True when options target Web Push (browser subscription). */
export function isWebPushOptions(options: PushOptions): options is WebPushOptions {
  return (
    "subscription" in options &&
    typeof (options as WebPushOptions).subscription?.endpoint === "string"
  );
}

/** Result returned after a push notification is accepted by the push service. */
export interface PushSendResult {
  /** Client-generated or assigned message identifier. */
  messageId: string;
  /** Delivery status string (e.g. `"accepted"`). */
  status: string;
  /** Human-readable or raw status text (often the HTTP status). */
  response: string;
  /** Transport or provider identifier (e.g. `"webpush"`, `"fcm"`). */
  provider?: string;
  /**
   * Zero-based index of the transport that handled the send in a fallback chain.
   * Set by {@link FallbackTransport}.
   */
  providerIndex?: number;
}

/** Pluggable push delivery backend (Web Push, FCM, …). */
export interface PushTransport {
  /**
   * Stable provider identifier for observability (e.g. `"webpush"`, `"fcm"`).
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
 * Uses a redacted subscription endpoint or device-token fingerprint (no natural `to`).
 */
export interface PushHookContext {
  /** Message-ID when known (from options or send result). */
  messageId?: string;
  /**
   * Redacted push target for observability: `origin/#<short-hash>` (Web Push)
   * or `fcm:#<short-hash>` (FCM device token).
   * Never the full endpoint URL or raw device token.
   */
  endpoint: string;
  /** Transport or provider identifier (e.g. `"webpush"`, `"fcm"`). */
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
  /** Fired before each retry attempt (requires {@link RetryTransport}). */
  onRetry?: (ctx: PushHookContext, attempt: number, error: unknown) => void | Promise<void>;
  /**
   * Fired when {@link FallbackTransport} fails over to the next provider.
   * Requires a fallback (or weighted fallback) transport in the push stack.
   */
  onFallback?: (
    ctx: PushHookContext,
    failedProvider: string,
    nextProvider: string,
    error: unknown,
  ) => void | Promise<void>;
}

/**
 * A push plugin transforms {@link PushOptions} before the transport sends.
 * Plugins run sequentially. Each receives the output of the previous.
 * Return a new options object — do not mutate the input.
 */
export type PushPlugin =
  | ((options: PushOptions) => PushOptions)
  | ((options: PushOptions) => Promise<PushOptions>);
