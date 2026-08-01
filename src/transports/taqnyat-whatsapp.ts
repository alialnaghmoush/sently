/**
 * @module
 * Taqnyat WhatsApp Business API transport.
 *
 * Follows [Taqnyat WhatsApp](https://dev.taqnyat.sa/en/doc/whatsapp/):
 * `POST https://api.taqnyat.sa/wa/v2/messages/` with Bearer + JSON.
 * Template: `{ to, type: "template", template: { name, language: { code } } }`.
 * Session text: `{ to, type: "text", text: { body } }`.
 *
 * Sently-first: wire into {@link createWhatsAppSender}.
 *
 * @example
 * ```ts
 * import { createWhatsAppSender } from "sently/whatsapp";
 * import { TaqnyatWhatsAppTransport } from "sently/transports/taqnyat-whatsapp";
 *
 * const wa = createWhatsAppSender({
 *   transport: new TaqnyatWhatsAppTransport({
 *     bearerToken: process.env.TAQNYAT_WHATSAPP_TOKEN!,
 *   }),
 * });
 * ```
 */
import { httpStatusToSentlyCode, SentlyError } from "../core/errors.js";
import type { VerifyResult } from "../core/types.js";
import type {
  WhatsAppOptions,
  WhatsAppSendResult,
  WhatsAppTransport,
} from "../core/whatsapp-types.js";
import { normalizeTaqnyatPhone } from "./taqnyat-phone.js";

/** Taqnyat WhatsApp API configuration. */
export interface TaqnyatWhatsAppConfig {
  /** Bearer token from a Taqnyat application enabled for WhatsApp. */
  bearerToken: string;
}

/** Error thrown when the Taqnyat WhatsApp API reports a failure. */
export class TaqnyatWhatsAppError extends SentlyError {
  /** Creates a Taqnyat WhatsApp API error with status code and response payload. */
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly apiError: unknown,
  ) {
    super(
      message,
      httpStatusToSentlyCode(statusCode >= 100 && statusCode < 600 ? statusCode : 400),
      {
        statusCode,
        provider: "taqnyat-whatsapp",
        cause: apiError,
      },
    );
    this.name = "TaqnyatWhatsAppError";
  }
}

function isTemplateMessage(
  options: WhatsAppOptions,
): options is Extract<WhatsAppOptions, { template: unknown }> {
  return "template" in options;
}

function extractMessageId(payload: Record<string, unknown>): string | undefined {
  const statuses = payload.statuses;
  if (Array.isArray(statuses)) {
    const first = statuses[0] as Record<string, unknown> | undefined;
    if (typeof first?.message_id === "string") return first.message_id;
  } else if (statuses && typeof statuses === "object") {
    for (const value of Object.values(statuses as Record<string, unknown>)) {
      if (value && typeof value === "object") {
        const id = (value as Record<string, unknown>).message_id;
        if (typeof id === "string") return id;
      }
    }
  }
  return undefined;
}

/**
 * Taqnyat WhatsApp transport via JSON Bearer `wa/v2/messages/`.
 */
export class TaqnyatWhatsAppTransport implements WhatsAppTransport {
  readonly provider = "taqnyat-whatsapp";

  private readonly bearerToken: string;

  /** Creates a Taqnyat WhatsApp transport. */
  constructor(config: TaqnyatWhatsAppConfig) {
    this.bearerToken = config.bearerToken;
  }

  /** Sends a WhatsApp template or session text message. */
  async send(options: WhatsAppOptions): Promise<WhatsAppSendResult> {
    const to = normalizeTaqnyatPhone(options.to);
    const body = isTemplateMessage(options)
      ? {
          to,
          type: "template" as const,
          template: {
            name: options.template.name,
            language: { code: options.template.language },
            ...(options.template.components ? { components: options.template.components } : {}),
          },
        }
      : {
          to,
          type: "text" as const,
          text: { body: options.text },
        };

    // Docs: base URL must end with `/`.
    const response = await fetch("https://api.taqnyat.sa/wa/v2/messages/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.bearerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json()) as Record<string, unknown>;
    const messageId = extractMessageId(payload);

    // Docs return `{ message, reason }` on failure (often still HTTP 200).
    if (!response.ok || (payload.message !== undefined && messageId === undefined)) {
      const reason =
        typeof payload.reason === "string"
          ? payload.reason
          : typeof payload.message === "string"
            ? `Taqnyat WhatsApp error ${payload.message}`
            : "Taqnyat WhatsApp API error";
      const status =
        typeof payload.message === "string" && /^\d+$/.test(payload.message)
          ? Number(payload.message)
          : response.status;
      throw new TaqnyatWhatsAppError(reason, status || response.status, payload);
    }

    return {
      messageId: messageId ?? options.messageId ?? "",
      to: options.to,
      status: "accepted",
      response: typeof payload.type === "string" ? payload.type : "Message sent",
      provider: "taqnyat-whatsapp",
    };
  }

  /** Lightweight credential check. */
  async verify(): Promise<VerifyResult> {
    return {
      ok: Boolean(this.bearerToken),
      provider: "taqnyat-whatsapp",
      message: this.bearerToken ? "Credentials present" : "Missing credentials",
    };
  }
}
