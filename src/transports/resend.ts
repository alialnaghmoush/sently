/**
 * @module
 * Resend HTTP API transport for sending email via api.resend.com.
 *
 * @example
 * ```ts
 * import { ResendTransport } from "sently/transports/resend";
 * import { createMailer } from "sently/mailer";
 *
 * const mailer = await createMailer({
 *   transport: new ResendTransport({ apiKey: process.env.RESEND_API_KEY! }),
 * });
 *
 * await mailer.send({
 *   from: "onboarding@yourdomain.com",
 *   to: "recipient@example.com",
 *   subject: "Hello",
 *   html: "<p>Sent via Resend</p>",
 * });
 * ```
 */
import { extractEmails, parseAddresses, toMIMEHeader } from "../core/address.js";
import { encodeBase64 } from "../core/base64.js";
import { httpStatusToSentlyCode, SentlyError } from "../core/errors.js";
import { resolveIdempotencyKey } from "../core/idempotency-key.js";
import { RateLimiter } from "../core/rate-limiter.js";
import type { MailOptions, SendResult, Transport, VerifyResult } from "../core/types.js";
import { resolveAttachments } from "./resolve-attachments.js";

/** Resend API configuration. */
export interface ResendConfig {
  /** Resend API key (starts with `re_`). */
  apiKey: string;
  /** API base URL. Default: `https://api.resend.com`. */
  baseUrl?: string;
  /** Max batch HTTP requests per rate window. Default: `2` (Resend API limit). Set `0` to disable. */
  rateDelta?: number;
  /** Rate limit window in milliseconds. Default: `1000`. */
  rateLimit?: number;
}

/** Maximum messages per Resend batch request (overridable per account). */
export const RESEND_BATCH_MAX = 100;

/** Error thrown when the Resend API returns a non-success response. */
export class ResendError extends SentlyError {
  /** Creates a Resend API error with status code and response payload. */
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly apiError: unknown,
  ) {
    super(message, httpStatusToSentlyCode(statusCode), {
      statusCode,
      provider: "resend",
      cause: apiError,
    });
    this.name = "ResendError";
  }
}

/**
 * Resend HTTP API transport.
 */
export class ResendTransport implements Transport {
  /** Resend API key for Bearer authentication. */
  private readonly apiKey: string;
  /** Resend API base URL. */
  private readonly baseUrl: string;
  /** Optional rate limiter for multi-chunk batch sends. */
  private readonly rateLimiter: RateLimiter | null;

  /** Maximum messages per batch HTTP request. */
  readonly batchMax = RESEND_BATCH_MAX;

  /** Creates a Resend transport with the given API key. */
  constructor(config: ResendConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://api.resend.com";

    const rateDelta = config.rateDelta ?? 2;
    if (rateDelta > 0) {
      this.rateLimiter = new RateLimiter(rateDelta, config.rateLimit ?? 1000);
    } else {
      this.rateLimiter = null;
    }
  }

  /** Build the JSON body for a single Resend email. */
  private async buildEmailBody(options: MailOptions): Promise<Record<string, unknown>> {
    const attachments = await resolveAttachments(options.attachments);
    const from = parseAddresses(options.from)[0];
    return {
      from: from ? toMIMEHeader(from) : "",
      to: extractEmails(options.to),
      subject: options.subject,
      ...(options.cc ? { cc: extractEmails(options.cc) } : {}),
      ...(options.bcc ? { bcc: extractEmails(options.bcc) } : {}),
      ...(options.replyTo ? { reply_to: extractEmails(options.replyTo) } : {}),
      ...(options.text ? { text: options.text } : {}),
      ...(options.html ? { html: options.html } : {}),
      ...(options.headers ? { headers: options.headers } : {}),
      ...(attachments.length > 0
        ? {
            attachments: attachments.map((att) => ({
              filename: att.filename,
              content:
                att.content instanceof Uint8Array
                  ? encodeBase64(att.content).replace(/\r\n/g, "")
                  : att.content,
              ...(att.contentType ? { content_type: att.contentType } : {}),
            })),
          }
        : {}),
    };
  }

  /** Map a Resend API response id to a normalized SendResult. */
  private toSendResult(
    options: MailOptions,
    payload: { id?: string; message?: string; batchError?: unknown },
  ): SendResult {
    const from = parseAddresses(options.from)[0];
    return {
      messageId: payload.id ?? options.messageId ?? "",
      accepted: extractEmails(options.to),
      rejected: [],
      response: payload.message ?? "Email sent",
      envelope: {
        from: from?.address ?? "",
        to: [
          ...extractEmails(options.to),
          ...(options.cc ? extractEmails(options.cc) : []),
          ...(options.bcc ? extractEmails(options.bcc) : []),
        ],
      },
      ...(payload.batchError !== undefined ? { batchError: payload.batchError } : {}),
    };
  }

  /** Sends an email via the Resend HTTP API. */
  async send(options: MailOptions): Promise<SendResult> {
    const body = await this.buildEmailBody(options);
    const idempotencyKey = resolveIdempotencyKey(options);

    const response = await fetch(`${this.baseUrl}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json()) as { id?: string; message?: string };

    if (!response.ok) {
      throw new ResendError(payload.message ?? "Resend API error", response.status, payload);
    }

    return this.toSendResult(options, payload);
  }

  /** Send up to {@link RESEND_BATCH_MAX} attachment-free messages per batch request. */
  async sendBatch(messages: MailOptions[]): Promise<SendResult[]> {
    if (messages.length === 0) {
      return [];
    }

    const results: SendResult[] = [];
    for (let offset = 0; offset < messages.length; offset += RESEND_BATCH_MAX) {
      if (offset > 0 && this.rateLimiter) {
        await this.rateLimiter.acquire();
      }

      const chunk = messages.slice(offset, offset + RESEND_BATCH_MAX);
      const bodies = await Promise.all(chunk.map((message) => this.buildEmailBody(message)));

      const response = await fetch(`${this.baseUrl}/emails/batch`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodies),
      });

      const payload = (await response.json()) as {
        data?: Array<{ id?: string; error?: string }>;
        message?: string;
      };

      if (!response.ok) {
        throw new ResendError(
          payload.message ?? "Resend batch API error",
          response.status,
          payload,
        );
      }

      const ids = payload.data ?? [];
      for (let i = 0; i < chunk.length; i++) {
        const message = chunk[i] as MailOptions;
        const item = ids[i];
        if (item?.id !== undefined) {
          results.push(
            this.toSendResult(message, {
              id: item.id,
              ...(payload.message !== undefined ? { message: payload.message } : {}),
            }),
          );
          continue;
        }

        const errorMessage = item?.error ?? "Batch item failed";
        results.push(
          this.toSendResult(message, {
            message: errorMessage,
            batchError: new ResendError(errorMessage, response.status, item ?? {}),
          }),
        );
      }
    }

    return results;
  }

  /** Verifies the Resend API key by listing domains. */
  async verify(): Promise<VerifyResult> {
    try {
      const response = await fetch(`${this.baseUrl}/domains`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        return {
          ok: false,
          provider: "resend",
          message: payload.message ?? `HTTP ${response.status}`,
        };
      }

      return { ok: true, provider: "resend", message: "API key is valid" };
    } catch (err) {
      return {
        ok: false,
        provider: "resend",
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
