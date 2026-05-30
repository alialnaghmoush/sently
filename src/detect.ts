// src/detect.ts
import { runPlugins } from "./core/plugin.js";
import type {
  BulkSendOptions,
  BulkSendResult,
  CreateMailerOptions,
  Mailer,
  MailOptions,
  MailPlugin,
  Runtime,
  SendResult,
  SMTPConfig,
  SocketAdapter,
  TLSOptions,
  Transport,
  VerifyResult,
} from "./core/types.js";
import { SMTPPool } from "./pool/pool.js";
import { SMTPTransport } from "./transports/smtp.js";

/** Detect the current JavaScript runtime. */
export function detectRuntime(): Runtime {
  if (typeof Bun !== "undefined") {
    return "bun";
  }
  if (typeof Deno !== "undefined") {
    return "deno";
  }
  if (typeof caches !== "undefined" && globalThis.navigator?.userAgent === "Cloudflare-Workers") {
    return "cf-workers";
  }
  if (typeof window !== "undefined") {
    return "browser";
  }
  if (typeof process !== "undefined" && process.versions?.node) {
    return "node";
  }
  return "unknown";
}

/**
 * Dynamically import and instantiate the correct adapter for the current runtime.
 */
export async function createDefaultAdapter(options?: {
  secure?: boolean;
  connectionTimeout?: number;
  tls?: TLSOptions;
}): Promise<SocketAdapter> {
  const runtime = detectRuntime();

  switch (runtime) {
    case "node": {
      const { NodeAdapter } = await import("./adapters/node.js");
      return new NodeAdapter(options);
    }
    case "bun": {
      const { BunAdapter } = await import("./adapters/bun.js");
      return new BunAdapter(options);
    }
    case "deno": {
      const { DenoAdapter } = await import("./adapters/deno.js");
      return new DenoAdapter(options);
    }
    case "cf-workers": {
      const { CloudflareAdapter } = await import("./adapters/cf.js");
      return new CloudflareAdapter(options);
    }
    default:
      throw new Error(`No socket adapter available for runtime: ${runtime}`);
  }
}

/**
 * Create a ready-to-use Mailer instance.
 */
export async function createMailer(options: CreateMailerOptions): Promise<Mailer> {
  if ("transport" in options) {
    return new MailerImpl(options.transport, options.plugins ?? []);
  }

  const smtpConfig = options as SMTPConfig;

  if (smtpConfig.pool) {
    return new MailerImpl(
      new SMTPPool(smtpConfig, {
        createAdapter: async () =>
          smtpConfig.adapter ??
          (await createDefaultAdapter({
            ...(smtpConfig.secure !== undefined ? { secure: smtpConfig.secure } : {}),
            ...(smtpConfig.connectionTimeout !== undefined
              ? { connectionTimeout: smtpConfig.connectionTimeout }
              : {}),
            ...(smtpConfig.tls !== undefined ? { tls: smtpConfig.tls } : {}),
          })),
      }),
      smtpConfig.plugins,
    );
  }

  const adapter =
    smtpConfig.adapter ??
    (await createDefaultAdapter({
      ...(smtpConfig.secure !== undefined ? { secure: smtpConfig.secure } : {}),
      ...(smtpConfig.connectionTimeout !== undefined
        ? { connectionTimeout: smtpConfig.connectionTimeout }
        : {}),
      ...(smtpConfig.tls !== undefined ? { tls: smtpConfig.tls } : {}),
    }));

  return new MailerImpl(new SMTPTransport({ ...smtpConfig, adapter }), smtpConfig.plugins);
}

class MailerImpl implements Mailer {
  constructor(
    private readonly transport: Transport,
    private readonly plugins: MailPlugin[] = [],
  ) {}

  async send(options: MailOptions): Promise<SendResult> {
    const processed = await runPlugins(options, this.plugins);
    return this.transport.send(processed);
  }

  async sendBulk(messages: MailOptions[], options?: BulkSendOptions): Promise<BulkSendResult> {
    const concurrency = options?.concurrency ?? 1;
    const results: BulkSendResult["results"] = new Array(messages.length);
    const queue = [...messages.entries()];
    let active = 0;

    await new Promise<void>((resolve) => {
      if (messages.length === 0) {
        resolve();
        return;
      }

      const maybeDone = (): void => {
        if (queue.length === 0 && active === 0) {
          resolve();
        }
      };

      const processNext = (): void => {
        if (queue.length === 0) {
          maybeDone();
          return;
        }

        const entry = queue.shift();
        if (entry === undefined) {
          maybeDone();
          return;
        }

        const [index, message] = entry;
        active++;

        void this.send(message)
          .then((result) => {
            results[index] = { status: "sent", result };
            options?.onSuccess?.(message, index, result);
          })
          .catch((error: unknown) => {
            results[index] = { status: "failed", error };
            options?.onError?.(message, index, error);
          })
          .finally(() => {
            active--;
            processNext();
            maybeDone();
          });
      };

      for (let i = 0; i < concurrency; i++) {
        processNext();
      }
    });

    let sent = 0;
    let failed = 0;
    for (const result of results) {
      if (result.status === "sent") {
        sent++;
      } else {
        failed++;
      }
    }

    return {
      total: messages.length,
      sent,
      failed,
      results,
    };
  }

  verify(): Promise<VerifyResult> {
    if (this.transport.verify) {
      return this.transport.verify();
    }
    return Promise.resolve({ ok: true, provider: "mailer" });
  }

  close(): Promise<void> {
    if (this.transport.close) {
      return this.transport.close();
    }
    return Promise.resolve();
  }
}

declare const Bun: unknown;
declare const Deno: unknown;
