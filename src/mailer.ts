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
import { extractEmails } from "./core/address.js";
import { runPlugins } from "./core/plugin.js";
import { RateLimiter } from "./core/rate-limiter.js";
import type {
  BulkSendOptions,
  BulkSendResult,
  Mailer,
  MailerHookContext,
  MailerHooks,
  MailOptions,
  MailPlugin,
  SendResult,
  Transport,
  TransportMailerOptions,
  VerifyResult,
} from "./core/types.js";
import { RetryTransport } from "./transports/retry.js";

export type { MailerHookContext, MailerHooks, TransportMailerOptions };

/**
 * Create a mailer that wraps a custom {@link Transport} (HTTP API, preview, retry, etc.).
 */
export async function createMailer(options: TransportMailerOptions): Promise<Mailer> {
  return new MailerImpl(options.transport, options.plugins ?? [], options.hooks);
}

function hasAttachments(message: MailOptions): boolean {
  return message.attachments !== undefined && message.attachments.length > 0;
}

/** Infer a provider label from a transport instance for hook context. */
function inferProvider(transport: Transport): string {
  const name = transport.constructor.name;
  if (name === "Object") {
    return "custom";
  }
  if (name.endsWith("Transport")) {
    return name.slice(0, -"Transport".length).toLowerCase();
  }
  return name.toLowerCase() || "unknown";
}

/** Build hook context from mail options (no body fields). */
function buildHookContext(options: MailOptions, transport: Transport): MailerHookContext {
  return {
    ...(options.messageId !== undefined ? { messageId: options.messageId } : {}),
    to: extractEmails(options.to),
    subject: options.subject,
    provider: inferProvider(transport),
  };
}

/**
 * Invoke a mailer hook without letting hook failures break the send.
 * In non-production environments, hook errors are logged with `console.warn`.
 */
async function invokeHook<T extends unknown[]>(
  hook: ((...args: T) => void | Promise<void>) | undefined,
  ...args: T
): Promise<void> {
  if (hook === undefined) {
    return;
  }
  try {
    await hook(...args);
  } catch (hookError) {
    const isProduction = typeof process !== "undefined" && process.env?.NODE_ENV === "production";
    if (!isProduction) {
      console.warn("[sently] Mailer hook threw; send continues:", hookError);
    }
  }
}

/** Internal mailer implementation shared with the full `sently` entry. */
export class MailerImpl implements Mailer {
  constructor(
    private readonly transport: Transport,
    private readonly plugins: MailPlugin[] = [],
    private readonly hooks?: MailerHooks,
  ) {}

  async send(options: MailOptions): Promise<SendResult> {
    const processed = await runPlugins(options, this.plugins);
    const ctx = buildHookContext(processed, this.transport);

    await invokeHook(this.hooks?.onSend, ctx);

    if (this.hooks?.onRetry !== undefined && this.transport instanceof RetryTransport) {
      this.transport.setMailerOnRetry((attempt, error) => {
        void invokeHook(this.hooks?.onRetry, ctx, attempt, error);
      });
    }

    try {
      const result = await this.transport.send(processed);
      const successCtx: MailerHookContext = {
        ...ctx,
        messageId: result.messageId,
      };
      await invokeHook(this.hooks?.onSuccess, successCtx, result);
      return result;
    } catch (error) {
      await invokeHook(this.hooks?.onError, ctx, error);
      throw error;
    } finally {
      if (this.transport instanceof RetryTransport) {
        this.transport.setMailerOnRetry(undefined);
      }
    }
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

    const recordSuccess = async (
      message: MailOptions,
      index: number,
      result: SendResult,
      processed?: MailOptions,
    ): Promise<void> => {
      results[index] = { status: "sent", result };
      if (processed !== undefined && this.hooks !== undefined) {
        const ctx = buildHookContext(processed, this.transport);
        await invokeHook(this.hooks.onSend, ctx);
        await invokeHook(this.hooks.onSuccess, { ...ctx, messageId: result.messageId }, result);
      }
      options?.onSuccess?.(message, index, result);
    };

    const recordFailure = async (
      message: MailOptions,
      index: number,
      error: unknown,
      processed?: MailOptions,
    ): Promise<void> => {
      results[index] = { status: "failed", error };
      if (processed !== undefined && this.hooks !== undefined) {
        const ctx = buildHookContext(processed, this.transport);
        await invokeHook(this.hooks.onSend, ctx);
        await invokeHook(this.hooks.onError, ctx, error);
      }
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
              const processedMessage = processed[i] as MailOptions;
              const result = batchResults[i];
              if (result === undefined) {
                await recordFailure(
                  entry.message,
                  entry.index,
                  new Error("Batch response missing result for message"),
                  processedMessage,
                );
              } else if (result.batchError !== undefined) {
                await recordFailure(
                  entry.message,
                  entry.index,
                  result.batchError,
                  processedMessage,
                );
              } else {
                await recordSuccess(entry.message, entry.index, result, processedMessage);
              }
            }
          } catch (error) {
            const processed = await Promise.all(
              chunk.map(({ message }) => this.processMessage(message)),
            );
            for (let i = 0; i < chunk.length; i++) {
              if (halted) {
                break;
              }
              const entry = chunk[i] as { index: number; message: MailOptions };
              await recordFailure(entry.message, entry.index, error, processed[i]);
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
                results[entry.index] = { status: "sent", result };
                options?.onSuccess?.(entry.message, entry.index, result);
              })
              .catch((error: unknown) => {
                results[entry.index] = { status: "failed", error };
                options?.onError?.(entry.message, entry.index, error);
                if (stopOnError) {
                  halted = true;
                }
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
              results[index] = { status: "sent", result };
              options?.onSuccess?.(message, index, result);
            })
            .catch((error: unknown) => {
              results[index] = { status: "failed", error };
              options?.onError?.(message, index, error);
              if (stopOnError) {
                halted = true;
              }
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
