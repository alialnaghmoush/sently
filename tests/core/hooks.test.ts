import { describe, expect, test } from "bun:test";
import type { MailOptions, SendResult, Transport } from "../../src/core/types.js";
import { createMailer } from "../../src/mailer.js";
import { ResendError, ResendTransport } from "../../src/transports/resend.js";
import { RetryTransport } from "../../src/transports/retry.js";

const baseMessage: MailOptions = {
  from: "sender@example.com",
  to: "recipient@example.com",
  subject: "Hook test",
  text: "Secret body content",
  html: "<p>Secret body content</p>",
};

describe("MailerHooks", () => {
  test("onSend and onSuccess fire on successful send", async () => {
    const events: string[] = [];
    const transport: Transport = {
      send: async (): Promise<SendResult> => ({
        messageId: "<hook@test.com>",
        accepted: ["recipient@example.com"],
        rejected: [],
        response: "250 OK",
        envelope: { from: "sender@example.com", to: ["recipient@example.com"] },
      }),
    };

    const mailer = await createMailer({
      transport,
      hooks: {
        onSend: (ctx) => {
          events.push("send");
          expect(ctx.subject).toBe("Hook test");
          expect(ctx.to).toEqual(["recipient@example.com"]);
          expect(ctx.provider).toBe("custom");
          expect("text" in ctx).toBe(false);
          expect("html" in ctx).toBe(false);
          expect("body" in ctx).toBe(false);
        },
        onSuccess: (ctx, result) => {
          events.push("success");
          expect(ctx.messageId).toBe("<hook@test.com>");
          expect(result.messageId).toBe("<hook@test.com>");
        },
      },
    });

    await mailer.send(baseMessage);
    expect(events).toEqual(["send", "success"]);
  });

  test("onError fires and error still propagates", async () => {
    const events: string[] = [];
    const transport: Transport = {
      send: async () => {
        throw new Error("transport failed");
      },
    };

    const mailer = await createMailer({
      transport,
      hooks: {
        onError: (_ctx, error) => {
          events.push("error");
          expect((error as Error).message).toBe("transport failed");
        },
      },
    });

    await expect(mailer.send(baseMessage)).rejects.toThrow("transport failed");
    expect(events).toEqual(["error"]);
  });

  test("onRetry fires N times for N retries", async () => {
    const attempts: number[] = [];
    let calls = 0;
    const inner: Transport = {
      send: async () => {
        calls++;
        if (calls < 3) {
          throw new ResendError("rate limited", 429, {});
        }
        return {
          messageId: "<retry@test.com>",
          accepted: ["recipient@example.com"],
          rejected: [],
          response: "OK",
          envelope: { from: "sender@example.com", to: ["recipient@example.com"] },
        };
      },
    };

    const transport = new RetryTransport(inner, {
      maxAttempts: 3,
      backoff: "fixed",
      baseDelay: 0,
    });

    const mailer = await createMailer({
      transport,
      hooks: {
        onRetry: (_ctx, attempt) => {
          attempts.push(attempt);
        },
      },
    });

    await mailer.send(baseMessage);
    expect(attempts).toEqual([1, 2]);
  });

  test("throwing hook does not break send", async () => {
    const warnSpy = mockConsoleWarn();
    const transport: Transport = {
      send: async (): Promise<SendResult> => ({
        messageId: "<ok@test.com>",
        accepted: ["recipient@example.com"],
        rejected: [],
        response: "250 OK",
        envelope: { from: "sender@example.com", to: ["recipient@example.com"] },
      }),
    };

    const mailer = await createMailer({
      transport,
      hooks: {
        onSend: () => {
          throw new Error("hook blew up");
        },
      },
    });

    const result = await mailer.send(baseMessage);
    expect(result.messageId).toBe("<ok@test.com>");
    expect(warnSpy.length).toBeGreaterThan(0);
    warnSpy.restore();
  });

  test("throwing hook does not break send when process is undefined (edge runtime)", async () => {
    const originalProcess = globalThis.process;
    try {
      // @ts-expect-error — simulate CF Workers / edge where process may be absent
      delete globalThis.process;

      const mailer = await createMailer({
        transport: {
          send: async (): Promise<SendResult> => ({
            messageId: "<edge@test.com>",
            accepted: ["recipient@example.com"],
            rejected: [],
            response: "250 OK",
            envelope: { from: "sender@example.com", to: ["recipient@example.com"] },
          }),
        },
        hooks: {
          onSend: () => {
            throw new Error("hook blew up on edge");
          },
        },
      });

      const result = await mailer.send(baseMessage);
      expect(result.messageId).toBe("<edge@test.com>");
    } finally {
      globalThis.process = originalProcess;
    }
  });

  test("sendBulk batch path fires hooks once per message without double-firing", async () => {
    const sendEvents: string[] = [];
    const successEvents: string[] = [];

    const transport: Transport = {
      batchMax: 10,
      sendBatch: async (messages) =>
        messages.map((msg) => ({
          messageId: `<${msg.subject}@batch.com>`,
          accepted: ["recipient@example.com"],
          rejected: [],
          response: "OK",
          envelope: { from: "sender@example.com", to: ["recipient@example.com"] },
        })),
      send: async () => {
        throw new Error("send should not be called for batch path");
      },
    };

    const mailer = await createMailer({
      transport,
      hooks: {
        onSend: (ctx) => {
          sendEvents.push(ctx.subject);
        },
        onSuccess: (ctx) => {
          successEvents.push(ctx.subject);
        },
      },
    });

    await mailer.sendBulk([
      { ...baseMessage, subject: "One" },
      { ...baseMessage, subject: "Two" },
    ]);

    expect(sendEvents).toEqual(["One", "Two"]);
    expect(successEvents).toEqual(["One", "Two"]);
  });

  test("ResendTransport provider inferred in hook context", async () => {
    let provider = "";
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      Response.json({ id: "x" }, { status: 200 })) as typeof fetch;

    try {
      const mailer = await createMailer({
        transport: new ResendTransport({ apiKey: "re_test", rateDelta: 0 }),
        hooks: {
          onSend: (ctx) => {
            provider = ctx.provider;
          },
        },
      });
      await mailer.send(baseMessage);
      expect(provider).toBe("resend");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

function mockConsoleWarn(): { length: number; restore: () => void } {
  const original = console.warn;
  const calls: unknown[] = [];
  console.warn = (...args: unknown[]) => {
    calls.push(args);
  };
  return {
    get length() {
      return calls.length;
    },
    restore: () => {
      console.warn = original;
    },
  };
}
