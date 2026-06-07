/**
 * @module
 * RetryTransport — decorator that wraps any sently transport
 * and retries failed sends with configurable backoff.
 * Works with SMTP, Resend, SendGrid, SES, and any custom transport.
 *
 * @example
 * ```ts
 * import { RetryTransport } from 'sently/transports/retry'
 * import { ResendTransport } from 'sently/transports/resend'
 *
 * const transport = new RetryTransport(
 *   new ResendTransport({ apiKey }),
 *   { maxAttempts: 3, backoff: 'exponential', retryOn: [429, 503] }
 * )
 * ```
 */
import { SentlyError } from "../core/errors.js";
import type {
  MailOptions,
  RetryConfig,
  SendResult,
  Transport,
  VerifyResult,
} from "../core/types.js";

const DEFAULT_RETRY_ON = [429, 500, 502, 503, 504];

function computeDelay(attempt: number, backoff: string, base: number): number {
  if (backoff === "exponential") {
    return base * 2 ** (attempt - 1);
  }
  if (backoff === "linear") {
    return base * attempt;
  }
  return base;
}

function shouldRetry(err: unknown, retryOn: number[]): boolean {
  if (err instanceof SentlyError && err.sentlyCode === "SMTP_AUTH_FAILED") {
    return false;
  }

  if (
    typeof err === "object" &&
    err !== null &&
    "statusCode" in err &&
    typeof (err as { statusCode: unknown }).statusCode === "number"
  ) {
    return retryOn.includes((err as { statusCode: number }).statusCode);
  }

  return true;
}

/**
 * Decorator transport that retries failed sends with configurable backoff.
 */
export class RetryTransport implements Transport {
  readonly provider = "retry";

  /** Maximum send attempts including the initial try. */
  private readonly maxAttempts: number;
  /** Backoff strategy between retries. */
  private readonly backoff: "exponential" | "linear" | "fixed";
  /** Base delay in milliseconds before the first retry. */
  private readonly baseDelay: number;
  /** HTTP status codes that trigger a retry. */
  private readonly retryOn: number[];
  /** Optional callback invoked before each retry attempt. */
  private readonly onRetry: RetryConfig["onRetry"];
  /** Additional onRetry callback wired by {@link MailerImpl} hooks per send. */
  private mailerOnRetry: RetryConfig["onRetry"];

  /** Wraps an inner transport with retry logic and optional backoff configuration. */
  constructor(
    /** Transport that performs the actual send on each attempt. */
    private readonly inner: Transport,
    config?: RetryConfig,
    /** Injectable sleep function for testing backoff timing. */
    private readonly _sleep: (ms: number) => Promise<void> = (ms) =>
      new Promise((resolve) => setTimeout(resolve, ms)),
  ) {
    this.maxAttempts = config?.maxAttempts ?? 3;
    this.backoff = config?.backoff ?? "exponential";
    this.baseDelay = config?.baseDelay ?? 1000;
    this.retryOn = config?.retryOn ?? DEFAULT_RETRY_ON;
    this.onRetry = config?.onRetry;
    this.mailerOnRetry = undefined;
  }

  /**
   * Register a per-send onRetry callback from mailer lifecycle hooks.
   * Do not share one {@link RetryTransport} across multiple mailers — the last
   * `setMailerOnRetry` wins; overwriting an active callback logs a dev warning.
   * @internal Used by {@link MailerImpl}; cleared after each send.
   */
  setMailerOnRetry(callback: RetryConfig["onRetry"] | undefined): void {
    if (
      callback !== undefined &&
      this.mailerOnRetry !== undefined &&
      this.mailerOnRetry !== callback
    ) {
      const isProduction = typeof process !== "undefined" && process.env?.NODE_ENV === "production";
      if (!isProduction) {
        console.warn(
          "[sently] RetryTransport.setMailerOnRetry: overwriting an active mailer onRetry callback. Do not share one RetryTransport instance across multiple mailers.",
        );
      }
    }
    this.mailerOnRetry = callback;
  }

  /** Sends with retries according to configured backoff and retry rules. */
  async send(options: MailOptions): Promise<SendResult> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return await this.inner.send(options);
      } catch (err) {
        lastError = err;
        if (attempt === this.maxAttempts) {
          throw err;
        }
        if (!shouldRetry(err, this.retryOn)) {
          throw err;
        }
        const delay = computeDelay(attempt, this.backoff, this.baseDelay);
        this.onRetry?.(attempt, err);
        this.mailerOnRetry?.(attempt, err);
        await this._sleep(delay);
      }
    }

    throw lastError;
  }

  /** Delegates to the inner transport verify or returns a default success result. */
  async verify(): Promise<VerifyResult> {
    if (this.inner.verify) {
      return this.inner.verify();
    }
    return { ok: true, provider: "retry" };
  }

  /** Delegates close to the inner transport if available. */
  async close(): Promise<void> {
    await this.inner.close?.();
  }

  /** Delegates batch sends to the inner transport when available. */
  async sendBatch(messages: MailOptions[]): Promise<SendResult[]> {
    if (this.inner.sendBatch) {
      return this.inner.sendBatch(messages);
    }
    return Promise.all(messages.map((message) => this.send(message)));
  }
}
