/**
 * @module
 * SMTP-capable mailer factory — host/port config, pooling, and runtime adapters.
 *
 * Import from `sently/smtp` or use {@link createSMTPMailer} from the main package.
 * For HTTP transports, use `sently/mailer` instead (~10 KB smaller in app bundles).
 *
 * @example
 * ```ts
 * import { createSMTPMailer } from "sently/smtp";
 *
 * const mailer = await createSMTPMailer({
 *   host: "smtp.example.com",
 *   port: 587,
 *   auth: { user: "you@example.com", pass: "secret" },
 * });
 * ```
 */
import type { Mailer, SMTPMailerOptions } from "./core/types.js";
import { createDefaultAdapter } from "./detect.js";
import { MailerImpl } from "./mailer.js";

/**
 * Create a mailer from SMTP relay options (host, port, auth, pool, adapter).
 */
export async function createSMTPMailer(options: SMTPMailerOptions): Promise<Mailer> {
  const adapterOptions = {
    ...(options.secure !== undefined ? { secure: options.secure } : {}),
    ...(options.connectionTimeout !== undefined
      ? { connectionTimeout: options.connectionTimeout }
      : {}),
    ...(options.tls !== undefined ? { tls: options.tls } : {}),
  };

  if (options.pool) {
    const { SMTPPool } = await import("./pool/pool.js");
    return new MailerImpl(
      new SMTPPool(options, {
        createAdapter: async () => options.adapter ?? (await createDefaultAdapter(adapterOptions)),
      }),
      options.plugins,
      options.hooks,
    );
  }

  const adapter = options.adapter ?? (await createDefaultAdapter(adapterOptions));
  const { SMTPTransport } = await import("./transports/smtp.js");

  return new MailerImpl(new SMTPTransport({ ...options, adapter }), options.plugins, options.hooks);
}
