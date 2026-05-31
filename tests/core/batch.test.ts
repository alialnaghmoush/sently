import { afterEach, describe, expect, test } from "bun:test";
import type { MailOptions, SendResult, Transport } from "../../src/core/types.js";
import { createMailer } from "../../src/detect.js";
import { RESEND_BATCH_MAX, ResendTransport } from "../../src/transports/resend.js";
import { SendGridTransport } from "../../src/transports/sendgrid.js";

const originalFetch = globalThis.fetch;

function message(subject: string, withAttachment = false): MailOptions {
  return {
    from: "sender@example.com",
    to: "recipient@example.com",
    subject,
    text: "Body",
    ...(withAttachment
      ? { attachments: [{ filename: "a.txt", content: "hello" }] }
      : {}),
  };
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("sendBulk batch path", () => {
  test("Resend batch issues ceil(N/100) requests for attachment-free messages", async () => {
    let batchRequests = 0;

    globalThis.fetch = (async (input, init) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/emails/batch")) {
        batchRequests++;
        const bodies = JSON.parse(String(init?.body)) as unknown[];
        return Response.json(
          { data: bodies.map((_, i) => ({ id: `batch-${batchRequests}-${i}` })) },
          { status: 200 },
        );
      }
      return Response.json({ id: "single" }, { status: 200 });
    }) as typeof fetch;

    const transport = new ResendTransport({ apiKey: "re_test" });
    const mailer = await createMailer({ transport });

    const n = RESEND_BATCH_MAX + 5;
    const messages = Array.from({ length: n }, (_, i) => message(`Msg ${i}`));
    const result = await mailer.sendBulk(messages);

    expect(batchRequests).toBe(2);
    expect(result.total).toBe(n);
    expect(result.sent).toBe(n);
    expect(result.results.every((r) => r.status === "sent")).toBe(true);
  });

  test("mixed batch routes attachment message to single-send", async () => {
    const urls: string[] = [];

    globalThis.fetch = (async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      urls.push(url);
      if (url.endsWith("/emails/batch")) {
        return Response.json({ data: [{ id: "batch-1" }, { id: "batch-2" }] }, { status: 200 });
      }
      return Response.json({ id: "single-1" }, { status: 200 });
    }) as typeof fetch;

    const transport = new ResendTransport({ apiKey: "re_test" });
    const mailer = await createMailer({ transport });

    await mailer.sendBulk([
      message("A"),
      message("B"),
      message("With attachment", true),
    ]);

    expect(urls.filter((u) => u.endsWith("/emails/batch"))).toHaveLength(1);
    expect(urls.filter((u) => u.endsWith("/emails"))).toHaveLength(1);
  });

  test("SendGrid personalizations batch path", async () => {
    let body: Record<string, unknown> | undefined;

    globalThis.fetch = (async (_input, init) => {
      body = JSON.parse(String(init?.body));
      return new Response(null, { status: 202, headers: { "x-message-id": "sg-batch-1" } });
    }) as typeof fetch;

    const transport = new SendGridTransport({ apiKey: "SG.test" });
    const mailer = await createMailer({ transport });

    const result = await mailer.sendBulk([message("One"), message("Two")]);

    expect((body?.personalizations as unknown[]).length).toBe(2);
    expect(result.sent).toBe(2);
  });

  test("transport without sendBatch uses concurrent fallback", async () => {
    let calls = 0;
    const transport: Transport = {
      send: async (options) => {
        calls++;
        return {
          messageId: options.subject,
          accepted: ["recipient@example.com"],
          rejected: [],
          response: "ok",
          envelope: { from: "sender@example.com", to: ["recipient@example.com"] },
        };
      },
    };

    const mailer = await createMailer({ transport });
    const result = await mailer.sendBulk([message("A"), message("B")]);

    expect(calls).toBe(2);
    expect(result.sent).toBe(2);
  });

  test("stopOnError halts further sends", async () => {
    let calls = 0;
    const transport: Transport = {
      send: async (options) => {
        calls++;
        if (options.subject === "Fail") {
          throw new Error("fail");
        }
        return {
          messageId: options.subject,
          accepted: ["recipient@example.com"],
          rejected: [],
          response: "ok",
          envelope: { from: "sender@example.com", to: ["recipient@example.com"] },
        };
      },
    };

    const mailer = await createMailer({ transport });
    const result = await mailer.sendBulk(
      [message("OK"), message("Fail"), message("Never")],
      { stopOnError: true, concurrency: 1 },
    );

    expect(calls).toBeLessThanOrEqual(2);
    expect(result.failed).toBeGreaterThanOrEqual(1);
    const neverResult = result.results[2];
    expect(neverResult).toBeUndefined();
  });

  test("chunk 2 failure does not fail messages in chunks 1 and 3", async () => {
    let batchRequest = 0;

    globalThis.fetch = (async (input, init) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/emails/batch")) {
        batchRequest++;
        if (batchRequest === 2) {
          return Response.json({ message: "rate limited" }, { status: 429 });
        }
        const bodies = JSON.parse(String(init?.body)) as unknown[];
        return Response.json(
          { data: bodies.map((_, i) => ({ id: `chunk-${batchRequest}-${i}` })) },
          { status: 200 },
        );
      }
      return Response.json({ id: "single" }, { status: 200 });
    }) as typeof fetch;

    const transport = new ResendTransport({ apiKey: "re_test", rateDelta: 0 });
    const mailer = await createMailer({ transport });

    const n = RESEND_BATCH_MAX * 2 + 50;
    const messages = Array.from({ length: n }, (_, i) => message(`Msg ${i}`));
    const result = await mailer.sendBulk(messages, { rateDelta: 0 });

    expect(result.sent).toBe(RESEND_BATCH_MAX + 50);
    expect(result.failed).toBe(RESEND_BATCH_MAX);
    expect(result.results.filter((r) => r.status === "sent")).toHaveLength(RESEND_BATCH_MAX + 50);
    expect(result.results.filter((r) => r.status === "failed")).toHaveLength(RESEND_BATCH_MAX);
  });

  test("batch chunk requests are spaced by the rate limiter", async () => {
    const fetchTimes: number[] = [];

    globalThis.fetch = (async (input, init) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/emails/batch")) {
        fetchTimes.push(Date.now());
        const bodies = JSON.parse(String(init?.body)) as unknown[];
        return Response.json(
          { data: bodies.map((_, i) => ({ id: `id-${fetchTimes.length}-${i}` })) },
          { status: 200 },
        );
      }
      return Response.json({ id: "single" }, { status: 200 });
    }) as typeof fetch;

    const transport = new ResendTransport({ apiKey: "re_test", rateDelta: 1, rateLimit: 400 });
    const mailer = await createMailer({ transport });

    const n = RESEND_BATCH_MAX * 3;
    await mailer.sendBulk(Array.from({ length: n }, (_, i) => message(`Msg ${i}`)), {
      rateDelta: 1,
      rateLimit: 400,
    });

    expect(fetchTimes).toHaveLength(3);
    expect(fetchTimes[1]! - fetchTimes[0]!).toBeGreaterThanOrEqual(350);
    expect(fetchTimes[2]! - fetchTimes[1]!).toBeGreaterThanOrEqual(350);
  });

  test("partial batch item failure maps per message", async () => {
    globalThis.fetch = (async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/emails/batch")) {
        return Response.json(
          {
            data: [{ id: "ok-1" }, { error: "invalid recipient" }],
          },
          { status: 200 },
        );
      }
      return Response.json({ id: "single" }, { status: 200 });
    }) as typeof fetch;

    const transport = new ResendTransport({ apiKey: "re_test", rateDelta: 0 });
    const mailer = await createMailer({ transport });

    const result = await mailer.sendBulk([message("OK"), message("Bad")]);

    expect(result.sent).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.results[0]?.status).toBe("sent");
    expect(result.results[1]?.status).toBe("failed");
  });
});
