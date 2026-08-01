import { describe, expect, test } from "bun:test";
import type { SmsOptions, SmsSendResult, SmsTransport } from "../../src/core/sms-types.js";
import { createSmsSender } from "../../src/sms.js";
import { FallbackTransport } from "../../src/transports/fallback.js";
import { RetryTransport } from "../../src/transports/retry.js";

const okResult: SmsSendResult = {
  messageId: "sms-1",
  to: "+15551234567",
  status: "accepted",
  response: "ok",
  provider: "primary",
};

function mockSms(
  provider: string,
  sendFn: (options: SmsOptions) => Promise<SmsSendResult>,
): SmsTransport {
  return { provider, send: sendFn };
}

describe("cross-channel RetryTransport / FallbackTransport", () => {
  test("RetryTransport retries SMS sends", async () => {
    let calls = 0;
    const inner = mockSms("primary", async () => {
      calls++;
      if (calls === 1) {
        throw Object.assign(new Error("rate limited"), { statusCode: 429 });
      }
      return okResult;
    });

    const transport = new RetryTransport(inner, { maxAttempts: 3 }, () => Promise.resolve());
    const result = await transport.send({ to: "+15551234567", body: "Hi" });

    expect(calls).toBe(2);
    expect(result.messageId).toBe("sms-1");
  });

  test("FallbackTransport fails over SMS providers and sets providerIndex", async () => {
    const primary = mockSms("primary", async () => {
      throw Object.assign(new Error("down"), { statusCode: 503 });
    });
    const secondary = mockSms("secondary", async () => ({
      ...okResult,
      provider: "secondary",
    }));

    const transport = new FallbackTransport([primary, secondary]);
    const result = await transport.send({ to: "+15551234567", body: "Hi" });

    expect(result.provider).toBe("secondary");
    expect(result.providerIndex).toBe(1);
  });

  test("createSmsSender wires onRetry for RetryTransport", async () => {
    const retries: number[] = [];
    let calls = 0;
    const inner = mockSms("primary", async () => {
      calls++;
      if (calls === 1) {
        throw Object.assign(new Error("transient"), { statusCode: 503 });
      }
      return okResult;
    });

    const sms = createSmsSender({
      transport: new RetryTransport(inner, { maxAttempts: 3 }, () => Promise.resolve()),
      hooks: {
        onRetry: (_ctx, attempt) => {
          retries.push(attempt);
        },
      },
    });

    await sms.send({ to: "+15551234567", body: "Hi" });
    expect(retries).toEqual([1]);
  });
});
