import { describe, expect, test } from "bun:test";
import { SMTPError } from "../../src/core/smtp.js";
import type { MailOptions, SendResult, Transport } from "../../src/core/types.js";
import { ResendError } from "../../src/transports/resend.js";
import { RetryTransport } from "../../src/transports/retry.js";

const baseOptions: MailOptions = {
  from: "sender@example.com",
  to: "recipient@example.com",
  subject: "Test",
  text: "Body",
};

const successResult: SendResult = {
  messageId: "<test@example.com>",
  accepted: ["recipient@example.com"],
  rejected: [],
  response: "250 OK",
  envelope: { from: "sender@example.com", to: ["recipient@example.com"] },
};

function createMockTransport(sendFn: () => Promise<SendResult>): Transport {
  return { send: sendFn };
}

describe("RetryTransport", () => {
  test("succeeds on first attempt — inner.send called once", async () => {
    let calls = 0;
    const inner = createMockTransport(async () => {
      calls++;
      return successResult;
    });

    const transport = new RetryTransport(inner, undefined, () => Promise.resolve());
    const result = await transport.send(baseOptions);

    expect(calls).toBe(1);
    expect(result).toEqual(successResult);
  });

  test("fails once then succeeds — inner.send called twice", async () => {
    let calls = 0;
    const inner = createMockTransport(async () => {
      calls++;
      if (calls === 1) {
        throw new Error("transient failure");
      }
      return successResult;
    });

    const transport = new RetryTransport(inner, { maxAttempts: 3 }, () => Promise.resolve());
    const result = await transport.send(baseOptions);

    expect(calls).toBe(2);
    expect(result).toEqual(successResult);
  });

  test("fails maxAttempts times — throws last error", async () => {
    let calls = 0;
    const inner = createMockTransport(async () => {
      calls++;
      throw new Error("persistent failure");
    });

    const transport = new RetryTransport(inner, { maxAttempts: 3 }, () => Promise.resolve());

    await expect(transport.send(baseOptions)).rejects.toThrow("persistent failure");
    expect(calls).toBe(3);
  });

  test("retryOn 429 — retries on 429, throws immediately on 400", async () => {
    let calls429 = 0;
    const inner429 = createMockTransport(async () => {
      calls429++;
      if (calls429 === 1) {
        throw new ResendError("Rate limited", 429, "rate_limit");
      }
      return successResult;
    });

    const transport429 = new RetryTransport(
      inner429,
      { maxAttempts: 3, retryOn: [429] },
      () => Promise.resolve(),
    );
    await transport429.send(baseOptions);
    expect(calls429).toBe(2);

    let calls400 = 0;
    const inner400 = createMockTransport(async () => {
      calls400++;
      throw new ResendError("Bad request", 400, "bad_request");
    });

    const transport400 = new RetryTransport(
      inner400,
      { maxAttempts: 3, retryOn: [429] },
      () => Promise.resolve(),
    );
    await expect(transport400.send(baseOptions)).rejects.toThrow("Bad request");
    expect(calls400).toBe(1);
  });

  test("SMTPError code 535 — never retried", async () => {
    let calls = 0;
    const inner = createMockTransport(async () => {
      calls++;
      throw new SMTPError("Authentication failed", 535, "AUTH LOGIN", "535 Auth failed");
    });

    const transport = new RetryTransport(inner, { maxAttempts: 3 }, () => Promise.resolve());

    await expect(transport.send(baseOptions)).rejects.toThrow("Authentication failed");
    expect(calls).toBe(1);
  });

  test("exponential backoff delays: attempt 1 = 1s, 2 = 2s, 3 = 4s", async () => {
    const delays: number[] = [];
    let calls = 0;

    const inner = createMockTransport(async () => {
      calls++;
      throw new Error("fail");
    });

    const transport = new RetryTransport(
      inner,
      { maxAttempts: 4, backoff: "exponential", baseDelay: 1000 },
      async (ms) => {
        delays.push(ms);
      },
    );

    await expect(transport.send(baseOptions)).rejects.toThrow("fail");
    expect(calls).toBe(4);
    expect(delays).toEqual([1000, 2000, 4000]);
  });

  test("onRetry callback called with correct attempt number", async () => {
    const attempts: number[] = [];
    let calls = 0;

    const inner = createMockTransport(async () => {
      calls++;
      if (calls < 3) {
        throw new Error("retry me");
      }
      return successResult;
    });

    const transport = new RetryTransport(
      inner,
      {
        maxAttempts: 3,
        onRetry: (attempt) => {
          attempts.push(attempt);
        },
      },
      () => Promise.resolve(),
    );

    await transport.send(baseOptions);
    expect(attempts).toEqual([1, 2]);
  });
});
