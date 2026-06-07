/**
 * @module
 * Cloudflare Workers Email transport — wraps the `send_email` binding
 * configured in `wrangler.toml`, not a fetch-based HTTP API.
 *
 * @example
 * ```ts
 * // wrangler.toml: [[send_email]]
 * import { CloudflareEmailTransport } from "sently/transports/cloudflare-email";
 * import { createMailer } from "sently/mailer";
 *
 * export default {
 *   async fetch(request, env) {
 *     const mailer = await createMailer({
 *       transport: new CloudflareEmailTransport({ sendEmail: env.SEND_EMAIL }),
 *     });
 *     await mailer.send({ from: "...", to: "...", subject: "...", text: "..." });
 *   },
 * };
 * ```
 */
import { extractEmails, parseAddresses } from "../core/address.js";
import { encodeBase64 } from "../core/base64.js";
import { SentlyError } from "../core/errors.js";
import type { MailOptions, SendResult, Transport, VerifyResult } from "../core/types.js";
import { resolveAttachments } from "./resolve-attachments.js";

/** Message shape accepted by the Cloudflare Workers `send_email` binding. */
export interface CloudflareEmailMessage {
  /** Envelope sender. */
  from: string;
  /** Primary recipient. */
  to: string;
  /** Message subject. */
  subject?: string;
  /** Reply-To address. */
  reply_to?: string;
  /** Carbon-copy recipients. */
  cc?: string[];
  /** Blind carbon-copy recipients. */
  bcc?: string[];
  /** Additional MIME headers. */
  headers?: Record<string, string>;
  /** Message body parts. */
  content: Array<{ type: string; value: string }>;
  /** Optional attachments (base64 content). */
  attachments?: Array<{
    disposition: "attachment" | "inline";
    filename: string;
    type: string;
    content: string;
  }>;
}

/** Callable Workers `send_email` binding. */
export type CloudflareSendEmailFn = (message: CloudflareEmailMessage) => Promise<void>;

/** Cloudflare Workers Email binding configuration. */
export interface CloudflareEmailConfig {
  /** The Workers `send_email` binding (e.g. `env.SEND_EMAIL`). */
  sendEmail: CloudflareSendEmailFn;
}

/** Error thrown when the Cloudflare Email binding rejects a send. */
export class CloudflareEmailError extends SentlyError {
  /** Creates a Cloudflare Email binding error. */
  constructor(message: string, cause?: unknown) {
    super(message, "PROVIDER_ERROR", { provider: "cloudflare-email", cause });
    this.name = "CloudflareEmailError";
  }
}

/**
 * Cloudflare Workers Email binding transport.
 */
export class CloudflareEmailTransport implements Transport {
  readonly provider = "cloudflare-email";

  private readonly sendEmail: CloudflareSendEmailFn;

  /** Creates a transport backed by the Workers `send_email` binding. */
  constructor(config: CloudflareEmailConfig) {
    this.sendEmail = config.sendEmail;
  }

  /** Sends an email via the Workers `send_email` binding. */
  async send(options: MailOptions): Promise<SendResult> {
    const from = parseAddresses(options.from)[0];
    const toEmails = extractEmails(options.to);
    const primaryTo = toEmails[0];

    if (!from || !primaryTo) {
      throw new CloudflareEmailError("Cloudflare Email requires from and to addresses");
    }

    const content: CloudflareEmailMessage["content"] = [];
    if (options.text !== undefined) {
      content.push({ type: "text/plain", value: options.text });
    }
    if (options.html !== undefined) {
      content.push({ type: "text/html", value: options.html });
    }
    if (content.length === 0) {
      content.push({ type: "text/plain", value: "" });
    }

    const attachments = await resolveAttachments(options.attachments);
    const message: CloudflareEmailMessage = {
      from: from.address,
      to: primaryTo,
      subject: options.subject,
      content,
      ...(options.replyTo ? { reply_to: extractEmails(options.replyTo)[0] } : {}),
      ...(options.cc ? { cc: extractEmails(options.cc) } : {}),
      ...(options.bcc ? { bcc: extractEmails(options.bcc) } : {}),
      ...(options.headers ? { headers: options.headers } : {}),
      ...(attachments.length > 0
        ? {
            attachments: attachments.map((att) => ({
              disposition: att.inline ? ("inline" as const) : ("attachment" as const),
              filename: att.filename,
              type: att.contentType ?? "application/octet-stream",
              content:
                att.content instanceof Uint8Array
                  ? encodeBase64(att.content).replace(/\r\n/g, "")
                  : String(att.content ?? ""),
            })),
          }
        : {}),
    };

    try {
      await this.sendEmail(message);
    } catch (err) {
      throw new CloudflareEmailError(
        err instanceof Error ? err.message : "Cloudflare Email send failed",
        err,
      );
    }

    return {
      messageId: options.messageId ?? "",
      accepted: toEmails,
      rejected: [],
      response: "sent via Cloudflare Email binding",
      envelope: {
        from: from.address,
        to: toEmails,
      },
    };
  }

  /**
   * Confirms the binding is configured — no network validation is available.
   */
  async verify(): Promise<VerifyResult> {
    return {
      ok: true,
      provider: "cloudflare-email",
      message: "send_email binding configured (not validated at runtime)",
    };
  }
}
