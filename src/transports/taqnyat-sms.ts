/**
 * @module
 * Taqnyat SMS API transport (Saudi Arabia).
 *
 * Request/response shapes follow
 * [Taqnyat SMS](https://dev.taqnyat.sa/en/doc/sms/) and
 * [Verify](https://dev.taqnyat.sa/en/doc/verify/):
 * - SMS: `POST /v1/messages` with Bearer + JSON (`recipients`, `body`, `sender`)
 * - OTP: `POST /verify.php/` with JSON array (`apiKey`, `numbers`, `method`, …)
 *
 * Sently-first: wire SMS into {@link createSmsSender}; OTP helpers stay on this class.
 *
 * @example
 * ```ts
 * import { createSmsSender } from "sently/sms";
 * import { TaqnyatSmsTransport } from "sently/transports/taqnyat-sms";
 *
 * const taqnyat = new TaqnyatSmsTransport({
 *   bearerToken: process.env.TAQNYAT_TOKEN!,
 *   sender: "MyBrand",
 * });
 * const sms = createSmsSender({ transport: taqnyat });
 *
 * await sms.send({ to: "+9665xxxxxxxx", body: "Hello" });
 * await taqnyat.sendOtp({ to: "+9665xxxxxxxx", requestId: "login-1", lang: "en" });
 * await taqnyat.verifyOtp({
 *   to: "+9665xxxxxxxx",
 *   requestId: "login-1",
 *   code: "6240",
 *   lang: "en",
 * });
 * ```
 */
import { httpStatusToSentlyCode, SentlyError } from "../core/errors.js";
import type { SmsOptions, SmsSendResult, SmsTransport } from "../core/sms-types.js";
import type { VerifyResult } from "../core/types.js";
import { normalizeTaqnyatPhone } from "./taqnyat-phone.js";

/** Taqnyat SMS API configuration. */
export interface TaqnyatSmsConfig {
  /** Bearer token from the Taqnyat dashboard. */
  bearerToken: string;
  /** Pre-approved sender name. */
  sender: string;
}

/** Options for {@link TaqnyatSmsTransport.sendOtp}. */
export interface TaqnyatSendOtpOptions {
  /** Recipient phone number (E.164 or international digits). */
  to: string;
  /** Unique id for this verification flow (required again on {@link verifyOtp}). */
  requestId: string;
  /** Message language (`en` or `ar`). Defaults to `"ar"` per Taqnyat docs. */
  lang?: "en" | "ar";
  /** Optional note appended to the OTP SMS. */
  note?: string;
  /** Sender ID override; defaults to transport `sender`. */
  from?: string;
}

/** Result of a successful {@link TaqnyatSmsTransport.sendOtp} call. */
export interface TaqnyatOtpSendResult {
  /** Echo of {@link TaqnyatSendOtpOptions.requestId}. */
  requestId: string;
  /** Recipient as passed in. */
  to: string;
  /** Provider status code (`5` = code sent). */
  code: number;
  /** Raw response body text. */
  response: string;
  /** Provider identifier. */
  provider: "taqnyat-sms";
}

/** Options for {@link TaqnyatSmsTransport.verifyOtp}. */
export interface TaqnyatVerifyOtpOptions {
  /** Recipient phone number (same as send). */
  to: string;
  /** Same {@link TaqnyatSendOtpOptions.requestId} used when sending. */
  requestId: string;
  /** OTP code the user entered (`activeKey` in Taqnyat docs). */
  code: string;
  /** Message language (`en` or `ar`). Defaults to `"ar"`. */
  lang?: "en" | "ar";
  /** Sender ID override; defaults to transport `sender`. */
  from?: string;
  /** Optional note (documented on check OTP). */
  note?: string;
}

/** Result of a successful {@link TaqnyatSmsTransport.verifyOtp} call. */
export interface TaqnyatOtpVerifyResult {
  /** Always `true` when the call resolves (failures throw). */
  ok: true;
  /** Provider status code (`10` = completed, `13`/`19` = already verified). */
  code: number;
  /** Provider message when present. */
  message: string;
  /** Raw response body text. */
  response: string;
  /** Provider identifier. */
  provider: "taqnyat-sms";
}

/** Error thrown when the Taqnyat SMS / Verify API returns a non-success response. */
export class TaqnyatSmsError extends SentlyError {
  /** Creates a Taqnyat SMS API error with status code and response payload. */
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
        provider: "taqnyat-sms",
        cause: apiError,
      },
    );
    this.name = "TaqnyatSmsError";
  }
}

function verifyPayloadCode(payload: Record<string, unknown>): number | undefined {
  const raw = payload.code ?? payload.statusCode ?? payload.status;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string" && /^-?\d+$/.test(raw)) return Number(raw);
  return undefined;
}

function verifyPayloadMessage(payload: Record<string, unknown>): string | undefined {
  if (typeof payload.message === "string") return payload.message;
  if (typeof payload.MessageEn === "string") return payload.MessageEn;
  return undefined;
}

function unwrapVerifyPayload(payload: unknown): Record<string, unknown> {
  if (Array.isArray(payload)) {
    const first = payload[0];
    return first && typeof first === "object" ? (first as Record<string, unknown>) : {};
  }
  if (payload && typeof payload === "object") {
    return payload as Record<string, unknown>;
  }
  return {};
}

/**
 * Taqnyat SMS transport via JSON Bearer API, plus Verify OTP helpers.
 */
export class TaqnyatSmsTransport implements SmsTransport {
  readonly provider = "taqnyat-sms";

  private readonly bearerToken: string;
  private readonly sender: string;

  /** Creates a Taqnyat SMS transport. */
  constructor(config: TaqnyatSmsConfig) {
    this.bearerToken = config.bearerToken;
    this.sender = config.sender;
  }

  /**
   * Sends an SMS via `POST https://api.taqnyat.sa/v1/messages`
   * (Bearer + JSON: `recipients`, `body`, `sender`; optional `smsId`).
   */
  async send(options: SmsOptions): Promise<SmsSendResult> {
    const recipients = [normalizeTaqnyatPhone(options.to)];
    const body: Record<string, unknown> = {
      recipients,
      body: options.body,
      sender: options.from ?? this.sender,
    };
    // Official PHP SDK maps a client id to `smsId`.
    if (options.messageId !== undefined) {
      body.smsId = options.messageId;
    }

    const response = await fetch("https://api.taqnyat.sa/v1/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.bearerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json()) as {
      statusCode?: number;
      messageId?: number;
      cost?: number;
      currency?: string;
      message?: string;
      accepted?: string;
      rejected?: string;
    };

    // Docs: successful send returns HTTP 201 with statusCode 201.
    if (response.status !== 201) {
      throw new TaqnyatSmsError(
        payload.message ?? "Taqnyat SMS API error",
        payload.statusCode ?? response.status,
        payload,
      );
    }

    return {
      messageId: String(payload.messageId ?? options.messageId ?? ""),
      to: options.to,
      status: "accepted",
      response: `cost: ${payload.cost ?? "?"} ${payload.currency ?? "SAR"}`,
      provider: "taqnyat-sms",
    };
  }

  /**
   * Vendor extra: generate/send OTP via `POST /verify.php/` (success code `5`).
   * Not part of {@link SmsTransport} — call on {@link TaqnyatSmsTransport} directly.
   */
  async sendOtp(options: TaqnyatSendOtpOptions): Promise<TaqnyatOtpSendResult> {
    const lang = options.lang ?? "ar";
    const number = normalizeTaqnyatPhone(options.to);
    const body = [
      {
        apiKey: this.bearerToken,
        numbers: [number],
        method: "sms",
        sender: options.from ?? this.sender,
        lang,
        requestId: options.requestId,
        returnJson: 1,
        ...(options.note !== undefined ? { note: options.note } : {}),
      },
    ];

    const response = await fetch("https://api.taqnyat.sa/verify.php/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.bearerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new TaqnyatSmsError("Taqnyat Verify returned non-JSON response", response.status, text);
    }

    const result = unwrapVerifyPayload(parsed);
    const code = verifyPayloadCode(result);

    // Docs: 5 = Activation code sent successfully.
    if (!response.ok || code !== 5) {
      throw new TaqnyatSmsError(
        verifyPayloadMessage(result) ?? `Taqnyat OTP send failed (code ${code ?? "unknown"})`,
        code ?? response.status,
        result,
      );
    }

    return {
      requestId: options.requestId,
      to: options.to,
      code,
      response: text,
      provider: "taqnyat-sms",
    };
  }

  /**
   * Vendor extra: check OTP via `POST /verify.php/` with `activeKey`
   * (`10` = completed; `13` / `19` = already verified).
   */
  async verifyOtp(options: TaqnyatVerifyOtpOptions): Promise<TaqnyatOtpVerifyResult> {
    const lang = options.lang ?? "ar";
    const number = normalizeTaqnyatPhone(options.to);
    const body = [
      {
        apiKey: this.bearerToken,
        numbers: [number],
        method: "sms",
        sender: options.from ?? this.sender,
        lang,
        requestId: options.requestId,
        activeKey: options.code,
        returnJson: 1,
        ...(options.note !== undefined ? { note: options.note } : {}),
      },
    ];

    const response = await fetch("https://api.taqnyat.sa/verify.php/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.bearerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new TaqnyatSmsError("Taqnyat Verify returned non-JSON response", response.status, text);
    }

    const result = unwrapVerifyPayload(parsed);
    const code = verifyPayloadCode(result);
    const okCodes = new Set([10, 13, 19]);

    if (!response.ok || code === undefined || !okCodes.has(code)) {
      throw new TaqnyatSmsError(
        verifyPayloadMessage(result) ?? `Taqnyat OTP verify failed (code ${code ?? "unknown"})`,
        code ?? response.status,
        result,
      );
    }

    return {
      ok: true,
      code,
      message: verifyPayloadMessage(result) ?? "Activation process completed successfully",
      response: text,
      provider: "taqnyat-sms",
    };
  }

  /** Lightweight credential check. */
  async verify(): Promise<VerifyResult> {
    return {
      ok: Boolean(this.bearerToken && this.sender),
      provider: "taqnyat-sms",
      message: this.bearerToken && this.sender ? "Credentials present" : "Missing credentials",
    };
  }
}
