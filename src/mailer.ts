/**
 * @module
 * Lightweight mailer factory for custom transports — no SMTP code in the bundle.
 *
 * Use this entry instead of `sently` when you pass a transport explicitly
 * (Resend, SendGrid, etc.) and want the smallest bundle size.
 *
 * @example
 * ```ts
 * import { createMailer } from "sently/mailer";
 * import { ResendTransport } from "sently/transports/resend";
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
import { runPlugins } from "./core/plugin.js";
import { RateLimiter } from "./core/rate-limiter.js";
import type {
  BulkSendOptions,
  BulkSendResult,
  Mailer,
  MailOptions,
  MailPlugin,
  SendResult,
  Transport,
  TransportMailerOptions,
  VerifyResult,
} from "./core/types.js";

export type { TransportMailerOptions };

/**
 * Create a mailer that wraps a custom {@link Transport} (HTTP API, preview, retry, etc.).
 */
export async function createMailer(options: TransportMailerOptions): Promise<Mailer> {
  return new MailerImpl(options.transport, options.plugins ?? []);
}

function hasAttachments(message: MailOptions): boolean {
  return message.attachments !== undefined && message.attachments.length > 0;
}

/** Internal mailer implementation shared with the full `sently` entry. */
export class MailerImpl implements Mailer {
  constructor(
    private readonly transport: Transport,
    private readonly plugins: MailPlugin[] = [],
  ) {}

  async send(options: MailOptions): Promise<SendResult> {
    const processed = await runPlugins(options, this.plugins);
    return this.transport.send(processed);
  }

  private async processMessage(message: MailOptions): Promise<MailOptions> {
    return runPlugins(message, this.plugins);
  }

  async sendBulk(messages: MailOptions[], options?: BulkSendOptions): Promise<BulkSendResult> {
    if (messages.length === 0) {
      return { total: 0, sent: 0, failed: 0, results: [] };
    }

    const results: BulkSendResult["results"] = new Array(messages.length);
    const stopOnError = options?.stopOnError ?? false;
    let halted = false;

    const recordSuccess = (message: MailOptions, index: number, result: SendResult): void => {
      results[index] = { status: "sent", result };
      options?.onSuccess?.(message, index, result);
    };

    const recordFailure = (message: MailOptions, index: number, error: unknown): void => {
      results[index] = { status: "failed", error };
      options?.onError?.(message, index, error);
      if (stopOnError) {
        halted = true;
      }
    };

    if (this.transport.sendBatch) {
      const batchEntries: Array<{ index: number; message: MailOptions }> = [];
      const singleEntries: Array<{ index: number; message: MailOptions }> = [];

      for (const [index, message] of messages.entries()) {
        if (hasAttachments(message)) {
          singleEntries.push({ index, message });
        } else {
          batchEntries.push({ index, message });
        }
      }

      if (batchEntries.length > 0 && !halted) {
        const chunkSize = this.transport.batchMax ?? batchEntries.length;
        const rateDelta = options?.rateDelta ?? 2;
        const rateLimiter =
          rateDelta > 0
            ? new RateLimiter(rateDelta, options?.rateLimit ?? 1000, options?.now)
            : null;

        for (
          let chunkStart = 0;
          chunkStart < batchEntries.length && !halted;
          chunkStart += chunkSize
        ) {
          const chunk = batchEntries.slice(chunkStart, chunkStart + chunkSize);

          if (rateLimiter) {
            await rateLimiter.acquire();
          }

          try {
            const processed = await Promise.all(
              chunk.map(({ message }) => this.processMessage(message)),
            );
            const batchResults = await this.transport.sendBatch(processed);

            for (let i = 0; i < chunk.length; i++) {
              const entry = chunk[i] as { index: number; message: MailOptions };
              const result = batchResults[i];
              if (result === undefined) {
                recordFailure(
                  entry.message,
                  entry.index,
                  new Error("Batch response missing result for message"),
                );
              } else if (result.batchError !== undefined) {
                recordFailure(entry.message, entry.index, result.batchError);
              } else {
                recordSuccess(entry.message, entry.index, result);
              }
            }
          } catch (error) {
            for (const entry of chunk) {
              if (halted) {
                break;
              }
              recordFailure(entry.message, entry.index, error);
            }
          }
        }
      }

      if (singleEntries.length > 0 && !halted) {
        const concurrency = options?.concurrency ?? 1;
        const queue = [...singleEntries];
        let active = 0;

        await new Promise<void>((resolve) => {
          const maybeDone = (): void => {
            if ((queue.length === 0 && active === 0) || halted) {
              resolve();
            }
          };

          const processNext = (): void => {
            if (queue.length === 0 || halted) {
              maybeDone();
              return;
            }

            const entry = queue.shift();
            if (entry === undefined) {
              maybeDone();
              return;
            }

            active++;
            void this.send(entry.message)
              .then((result) => {
                recordSuccess(entry.message, entry.index, result);
              })
              .catch((error: unknown) => {
                recordFailure(entry.message, entry.index, error);
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
      }
    } else {
      const concurrency = options?.concurrency ?? 1;
      const queue = [...messages.entries()];
      let active = 0;

      await new Promise<void>((resolve) => {
        const maybeDone = (): void => {
          if ((queue.length === 0 && active === 0) || halted) {
            resolve();
          }
        };

        const processNext = (): void => {
          if (queue.length === 0 || halted) {
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
              recordSuccess(message, index, result);
            })
            .catch((error: unknown) => {
              recordFailure(message, index, error);
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
    }

    let sent = 0;
    let failed = 0;
    for (const result of results) {
      if (result === undefined) {
        continue;
      }
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
