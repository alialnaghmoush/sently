/**
 * @module
 * SMTP transport — orchestrates socket adapter, MIME builder, and protocol logic.
 *
 * @example
 * ```ts
 * import { SMTPTransport } from "@sendx/sendx/transports/smtp";
 * import { NodeAdapter } from "@sendx/sendx/adapters/node";
 * import { createMailer } from "@sendx/sendx";
 *
 * const mailer = await createMailer({
 *   transport: new SMTPTransport({
 *     host: "smtp.example.com",
 *     auth: { user: "you@example.com", pass: "secret" },
 *     adapter: new NodeAdapter(),
 *   }),
 * });
 * ```
 */
import { buildMIME } from "../core/mime.js";
import type { SMTPResponse } from "../core/smtp.js";
import {
  accumulateResponse,
  assertResponse,
  encodeAuthLoginPass,
  encodeAuthLoginUser,
  encodeCommand,
  encodeLine,
  parseEHLO,
  parseResponse,
  SMTPError,
  selectAuthMethod,
} from "../core/smtp.js";
import type {
  MailOptions,
  SendResult,
  SMTPConfig,
  SocketAdapter,
  Transport,
} from "../core/types.js";
import { resolveAttachments } from "./resolve-attachments.js";

/**
 * SMTP transport orchestrating adapter, MIME builder, and protocol logic.
 */
export class SMTPTransport implements Transport {
  private readonly config: ResolvedSMTPConfig;
  private adapter: SocketAdapter | null = null;

  /** Creates an SMTP transport with the given configuration. */
  constructor(config: SMTPConfig) {
    this.config = resolveConfig(config);
  }

  /** Sends an email via SMTP using the configured adapter. */
  async send(options: MailOptions): Promise<SendResult> {
    const resolvedOptions = {
      ...options,
      attachments: await resolveAttachments(options.attachments),
    };
    const mime = buildMIME(resolvedOptions);
    const adapter = await this.getAdapter();

    const host = this.config.direct
      ? await resolveMX(mime.envelope.from.split("@")[1] ?? this.config.host)
      : this.config.host;

    await adapter.connect(host, this.config.port);
    this.adapter = adapter;

    try {
      const greeting = await readSMTPResponse(adapter);
      assertResponse(greeting, [220], "greeting");

      let capabilities = await ehlo(adapter, this.config.host);
      if (!this.config.secure && !adapter.secure) {
        await sendRaw(adapter, encodeCommand({ type: "STARTTLS" }));
        const starttlsResp = await readSMTPResponse(adapter);
        assertResponse(starttlsResp, [220], "STARTTLS");
        await adapter.startTLS(this.config.tls);
        capabilities = await ehlo(adapter, this.config.host);
      }

      if (this.config.auth) {
        await authenticate(adapter, this.config.auth, capabilities);
      }

      await sendCommand(adapter, { type: "MAIL_FROM", address: mime.envelope.from });
      const mailResp = await readSMTPResponse(adapter);
      assertResponse(mailResp, [250], "MAIL FROM");

      const accepted: string[] = [];
      const rejected: string[] = [];

      for (const recipient of mime.envelope.to) {
        await sendRaw(adapter, encodeCommand({ type: "RCPT_TO", address: recipient }));
        const rcptResp = await readSMTPResponse(adapter);
        if (rcptResp.isSuccess) {
          accepted.push(recipient);
        } else {
          rejected.push(recipient);
        }
      }

      await sendCommand(adapter, { type: "DATA" });
      const dataResp = await readSMTPResponse(adapter);
      assertResponse(dataResp, [354], "DATA");

      let finalResp: SMTPResponse;
      try {
        await sendRaw(adapter, encodeCommand({ type: "DATA_BODY", content: mime.raw }));
        finalResp = await readSMTPResponse(adapter);
      } catch (err) {
        await sendRaw(adapter, encodeCommand({ type: "DATA_BODY", content: mime.raw }));
        finalResp = await readSMTPResponse(adapter);
        if (finalResp.isError) {
          throw err;
        }
      }
      assertResponse(finalResp, [250], "DATA end");

      await sendCommand(adapter, { type: "QUIT" });
      await readSMTPResponse(adapter);

      return {
        messageId: mime.messageId,
        accepted,
        rejected,
        response: finalResp.message,
        envelope: mime.envelope,
      };
    } finally {
      await adapter.close();
      this.adapter = null;
    }
  }

  /** Verifies SMTP connectivity and authentication without sending mail. */
  async verify(): Promise<boolean> {
    const adapter = await this.getAdapter();
    await adapter.connect(this.config.host, this.config.port);

    try {
      const greeting = await readSMTPResponse(adapter);
      assertResponse(greeting, [220], "greeting");

      let capabilities = await ehlo(adapter, this.config.host);
      if (!this.config.secure && !adapter.secure) {
        await sendRaw(adapter, encodeCommand({ type: "STARTTLS" }));
        const starttlsResp = await readSMTPResponse(adapter);
        assertResponse(starttlsResp, [220], "STARTTLS");
        await adapter.startTLS(this.config.tls);
        capabilities = await ehlo(adapter, this.config.host);
      }

      if (this.config.auth) {
        await authenticate(adapter, this.config.auth, capabilities);
      }

      await sendCommand(adapter, { type: "QUIT" });
      await readSMTPResponse(adapter);
      return true;
    } finally {
      await adapter.close();
    }
  }

  /** Closes the underlying socket adapter if connected. */
  async close(): Promise<void> {
    if (this.adapter) {
      await this.adapter.close();
      this.adapter = null;
    }
  }

  private async getAdapter(): Promise<SocketAdapter> {
    if (!this.config.adapter) {
      throw new SMTPError("No socket adapter configured", 0, "CONNECT", "");
    }
    return this.config.adapter;
  }
}

interface ResolvedSMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth?: SMTPConfig["auth"];
  tls?: SMTPConfig["tls"];
  connectionTimeout?: number;
  greetingTimeout?: number;
  socketTimeout?: number;
  direct?: boolean;
  adapter?: SocketAdapter;
}

function resolveConfig(config: SMTPConfig): ResolvedSMTPConfig {
  const secure = config.secure ?? false;
  return {
    host: config.host,
    port: config.port ?? (secure ? 465 : 587),
    secure,
    ...(config.auth !== undefined ? { auth: config.auth } : {}),
    ...(config.tls !== undefined ? { tls: config.tls } : {}),
    ...(config.connectionTimeout !== undefined
      ? { connectionTimeout: config.connectionTimeout }
      : {}),
    ...(config.greetingTimeout !== undefined ? { greetingTimeout: config.greetingTimeout } : {}),
    ...(config.socketTimeout !== undefined ? { socketTimeout: config.socketTimeout } : {}),
    ...(config.direct !== undefined ? { direct: config.direct } : {}),
    ...(config.adapter !== undefined ? { adapter: config.adapter } : {}),
  };
}

async function ehlo(adapter: SocketAdapter, host: string): Promise<string[]> {
  await sendCommand(adapter, { type: "EHLO", domain: host });
  const response = await readSMTPResponse(adapter);
  assertResponse(response, [250], "EHLO");
  return parseEHLO(response);
}

async function authenticate(
  adapter: SocketAdapter,
  auth: NonNullable<SMTPConfig["auth"]>,
  capabilities: string[],
): Promise<void> {
  const method = auth.type ?? selectAuthMethod(capabilities);

  if (method === "CRAM-MD5") {
    throw new SMTPError("CRAM-MD5 is not supported in sendx v0.1", 0, "AUTH CRAM-MD5", "");
  }

  if (method === "PLAIN") {
    await sendRaw(adapter, encodeCommand({ type: "AUTH_PLAIN", user: auth.user, pass: auth.pass }));
    const resp = await readSMTPResponse(adapter);
    assertResponse(resp, [235], "AUTH PLAIN");
    return;
  }

  await sendRaw(adapter, encodeCommand({ type: "AUTH_LOGIN", user: auth.user, pass: auth.pass }));
  let resp = await readSMTPResponse(adapter);
  assertResponse(resp, [334], "AUTH LOGIN");

  await sendRaw(adapter, encodeAuthLoginUser(auth.user));
  resp = await readSMTPResponse(adapter);
  assertResponse(resp, [334], "AUTH LOGIN user");

  await sendRaw(adapter, encodeAuthLoginPass(auth.pass));
  resp = await readSMTPResponse(adapter);
  assertResponse(resp, [235], "AUTH LOGIN pass");
}

async function sendCommand(
  adapter: SocketAdapter,
  command: Parameters<typeof encodeCommand>[0],
): Promise<void> {
  await sendRaw(adapter, encodeCommand(command));
}

async function sendRaw(adapter: SocketAdapter, data: Uint8Array): Promise<void> {
  await adapter.write(data);
}

/** Reads and parses a complete SMTP response from the adapter. */
async function readSMTPResponse(adapter: SocketAdapter): Promise<SMTPResponse> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of adapter.read()) {
    chunks.push(chunk);
    const complete = accumulateResponse(chunks);
    if (complete) {
      return parseResponse(complete);
    }
  }
  throw new SMTPError("Connection closed while reading SMTP response", 0, "READ", "");
}

async function resolveMX(domain: string): Promise<string> {
  const dns = await import("node:dns/promises");
  const records = await dns.resolveMx(domain);
  if (records.length === 0) {
    throw new SMTPError(`No MX records for ${domain}`, 0, "MX", "");
  }
  records.sort((a: { priority: number }, b: { priority: number }) => a.priority - b.priority);
  return records[0]?.exchange ?? domain;
}

/** @internal Test helper for raw line writes. */
export { encodeLine, readSMTPResponse };
