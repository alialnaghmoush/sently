import { describe, expect, test } from "bun:test";
import { SMTPError } from "../../src/core/smtp.js";
import type { MailOptions, SendResult, Transport, VerifyResult } from "../../src/core/types.js";
import { ResendError } from "../../src/transports/resend.js";
import {
  FallbackError,
  FallbackTransport,
} from "../../src/transports/fallback.js";
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

function createNamedMockTransport(
  name: string,
  sendFn: () => Promise<SendResult>,
  extras?: Partial<Transport>,
): Transport {
  const transport = {
    send: sendFn,
    ...extras,
  };
  Object.defineProperty(transport, "constructor", {
    value: { name: `${name}Transport` },
  });
  return transport as Transport;
}

describe("FallbackTransport", () => {
  test("constructor throws when transports array is empty", () => {
    expect(() => new FallbackTransport([])).toThrow(
      "FallbackTransport requires at least one transport",
    );
  });

  test("first transport succeeds — second never called", async () => {
    let secondCalls = 0;
    const first = createNamedMockTransport("Resend", async () => successResult);
    const second = createNamedMockTransport("Ses", async () => {
      secondCalls++;
      return successResult;
    });

    const transport = new FallbackTransport([first, second]);
    const result = await transport.send(baseOptions);

    expect(secondCalls).toBe(0);
    expect(result.provider).toBe("resend");
    expect(result.providerIndex).toBe(0);
    expect(result.messageId).toBe(successResult.messageId);
  });

  test("first fails (503), second succeeds — onFallback fired once", async () => {
    const fallbackEvents: Array<{ index: number; error: unknown }> = [];
    const first = createNamedMockTransport("Resend", async () => {
      throw new ResendError("Service unavailable", 503, {});
    });
    const second = createNamedMockTransport("Ses", async () => ({
      ...successResult,
      messageId: "<ses@example.com>",
    }));

    const transport = new FallbackTransport([first, second], {
      onFallback: (index, error) => {
        fallbackEvents.push({ index, error });
      },
    });

    const result = await transport.send(baseOptions);

    expect(fallbackEvents).toEqual([
      { index: 0, error: expect.any(ResendError) },
    ]);
    expect(result.provider).toBe("ses");
    expect(result.providerIndex).toBe(1);
    expect(result.messageId).toBe("<ses@example.com>");
  });

  test("all fail — throws FallbackError with ordered attempts", async () => {
    const resendErr = new ResendError("Service unavailable", 503, {});
    const sesErr = new ResendError("Gateway timeout", 504, {});

    const first = createNamedMockTransport("Resend", async () => {
      throw resendErr;
    });
    const second = createNamedMockTransport("Ses", async () => {
      throw sesErr;
    });

    const transport = new FallbackTransport([first, second]);

    try {
      await transport.send(baseOptions);
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(FallbackError);
      const fallbackErr = err as FallbackError;
      expect(fallbackErr.attempts).toEqual([
        { provider: "resend", error: resendErr },
        { provider: "ses", error: sesErr },
      ]);
    }
  });

  test("permanent error (400) on first — throws immediately, second not called", async () => {
    let secondCalls = 0;
    const first = createNamedMockTransport("Resend", async () => {
      throw new ResendError("Bad request", 400, {});
    });
    const second = createNamedMockTransport("Ses", async () => {
      secondCalls++;
      return successResult;
    });

    const transport = new FallbackTransport([first, second]);

    await expect(transport.send(baseOptions)).rejects.toMatchObject({
      name: "ResendError",
      statusCode: 400,
    });
    expect(secondCalls).toBe(0);
  });

  test("custom shouldFallback overrides default", async () => {
    let secondCalls = 0;
    const first = createNamedMockTransport("Resend", async () => {
      throw new ResendError("Bad request", 400, {});
    });
    const second = createNamedMockTransport("Ses", async () => {
      secondCalls++;
      return successResult;
    });

    const transport = new FallbackTransport([first, second], {
      shouldFallback: () => true,
    });

    const result = await transport.send(baseOptions);
    expect(secondCalls).toBe(1);
    expect(result.providerIndex).toBe(1);
  });

  test("verify() returns first ok transport; all-fail returns ok:false", async () => {
    const first = createNamedMockTransport("Resend", async () => successResult, {
      verify: async (): Promise<VerifyResult> => ({
        ok: true,
        provider: "resend",
        message: "verified",
      }),
    });
    const second = createNamedMockTransport("Ses", async () => successResult, {
      verify: async (): Promise<VerifyResult> => ({
        ok: false,
        provider: "ses",
        message: "invalid key",
      }),
    });

    const transport = new FallbackTransport([first, second]);
    const okResult = await transport.verify();
    expect(okResult).toEqual({
      ok: true,
      provider: "resend",
      message: "verified",
    });

    const allFailFirst = createNamedMockTransport("Resend", async () => successResult, {
      verify: async (): Promise<VerifyResult> => ({
        ok: false,
        provider: "resend",
      }),
    });
    const allFailSecond = createNamedMockTransport("Ses", async () => successResult, {
      verify: async (): Promise<VerifyResult> => ({
        ok: false,
        provider: "ses",
      }),
    });

    const allFailTransport = new FallbackTransport([allFailFirst, allFailSecond]);
    const failResult = await allFailTransport.verify();
    expect(failResult).toEqual({
      ok: false,
      provider: "fallback",
      message: "no transport verified",
    });
  });

  test("close() calls close on all transports even if one throws", async () => {
    const closed: string[] = [];
    const first = createNamedMockTransport("Resend", async () => successResult, {
      close: async () => {
        closed.push("resend");
        throw new Error("close failed");
      },
    });
    const second = createNamedMockTransport("Ses", async () => successResult, {
      close: async () => {
        closed.push("ses");
      },
    });

    const transport = new FallbackTransport([first, second]);
    await transport.close();

    expect(closed).toEqual(["resend", "ses"]);
  });

  test("SMTP 535 on first — does not fail over", async () => {
    let secondCalls = 0;
    const first = createNamedMockTransport("Smtp", async () => {
      throw new SMTPError("Authentication failed", 535, "AUTH LOGIN", "535 Auth failed");
    });
    const second = createNamedMockTransport("Ses", async () => {
      secondCalls++;
      return successResult;
    });

    const transport = new FallbackTransport([first, second]);

    await expect(transport.send(baseOptions)).rejects.toThrow("Authentication failed");
    expect(secondCalls).toBe(0);
  });

  test("cooldownMs skips unhealthy provider until expiry", async () => {
    let now = 1000;
    let resendCalls = 0;
    let sesCalls = 0;

    const first = createNamedMockTransport("Resend", async () => {
      resendCalls++;
      throw new ResendError("Service unavailable", 503, {});
    });
    const second = createNamedMockTransport("Ses", async () => {
      sesCalls++;
      return successResult;
    });

    const transport = new FallbackTransport([first, second], {
      cooldownMs: 5000,
      now: () => now,
    });

    await transport.send(baseOptions);
    expect(resendCalls).toBe(1);
    expect(sesCalls).toBe(1);

    resendCalls = 0;
    sesCalls = 0;
    await transport.send(baseOptions);
    expect(resendCalls).toBe(0);
    expect(sesCalls).toBe(1);

    now = 7000;
    resendCalls = 0;
    await transport.send(baseOptions);
    expect(resendCalls).toBe(1);
  });

  test("verifyAll returns per-provider results", async () => {
    const first = createNamedMockTransport("Resend", async () => successResult, {
      verify: async (): Promise<VerifyResult> => ({
        ok: true,
        provider: "resend",
        message: "verified",
      }),
    });
    const second = createNamedMockTransport("Ses", async () => successResult, {
      verify: async (): Promise<VerifyResult> => ({
        ok: false,
        provider: "ses",
        message: "invalid key",
      }),
    });

    const transport = new FallbackTransport([first, second]);
    const all = await transport.verifyAll();

    expect(all.ok).toBe(true);
    expect(all.providers).toEqual([
      { provider: "resend", ok: true, message: "verified" },
      { provider: "ses", ok: false, message: "invalid key" },
    ]);
  });

  test("setMailerOnFallback fires with provider labels", async () => {
    const events: string[] = [];
    const first = createNamedMockTransport("Resend", async () => {
      throw new ResendError("Service unavailable", 503, {});
    });
    const second = createNamedMockTransport("Ses", async () => successResult);

    const transport = new FallbackTransport([first, second]);
    transport.setMailerOnFallback((failed, next) => {
      events.push(`${failed}->${next}`);
    });

    await transport.send(baseOptions);
    expect(events).toEqual(["resend->ses"]);
  });

  test("all providers in cooldown throws FallbackError with skip entries", async () => {
    let now = 1000;
    const outage = new ResendError("Service unavailable", 503, {});
    const first = createNamedMockTransport("Resend", async () => {
      throw outage;
    });
    const second = createNamedMockTransport("Ses", async () => {
      throw outage;
    });

    const transport = new FallbackTransport([first, second], {
      cooldownMs: 10_000,
      now: () => now,
    });

    await expect(transport.send(baseOptions)).rejects.toBeInstanceOf(FallbackError);

    try {
      await transport.send(baseOptions);
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(FallbackError);
      const fallbackErr = err as FallbackError;
      expect(fallbackErr.attempts).toHaveLength(2);
      expect(
        fallbackErr.attempts.every((attempt) =>
          (attempt.error as Error).message.includes("cooldown"),
        ),
      ).toBe(true);
    }
  });

  test("verifyAll returns ok:false when every provider fails verify", async () => {
    const first = createNamedMockTransport("Resend", async () => successResult, {
      verify: async (): Promise<VerifyResult> => ({ ok: false, provider: "resend" }),
    });
    const second = createNamedMockTransport("Ses", async () => successResult, {
      verify: async (): Promise<VerifyResult> => ({ ok: false, provider: "ses" }),
    });

    const transport = new FallbackTransport([first, second]);
    const all = await transport.verifyAll();

    expect(all.ok).toBe(false);
    expect(all.providers).toEqual([
      { provider: "resend", ok: false },
      { provider: "ses", ok: false },
    ]);
  });

  test("verifyAll marks transports without verify() as not ok", async () => {
    const noVerify = createNamedMockTransport("Resend", async () => successResult);
    const transport = new FallbackTransport([noVerify]);

    const all = await transport.verifyAll();
    expect(all.providers[0]).toEqual({
      provider: "resend",
      ok: false,
      message: "no verify() method",
    });
  });

  test("prefers Transport.provider over constructor name for labels", async () => {
    const labeled: Transport = {
      provider: "primary-api",
      send: async () => successResult,
    };
    const transport = new FallbackTransport([labeled]);
    const result = await transport.send(baseOptions);
    expect(result.provider).toBe("primary-api");
  });

  test("RetryTransport exhausts retries then fails over to next provider", async () => {
    let innerCalls = 0;
    const inner = createNamedMockTransport("Resend", async () => {
      innerCalls++;
      throw new ResendError("Service unavailable", 503, {});
    });
    const retryInner = new RetryTransport(
      inner,
      { maxAttempts: 2, backoff: "fixed", baseDelay: 0 },
      () => Promise.resolve(),
    );

    let sesCalls = 0;
    const ses = createNamedMockTransport("Ses", async () => {
      sesCalls++;
      return { ...successResult, messageId: "<ses-failover@example.com>" };
    });

    const transport = new FallbackTransport([retryInner, ses]);
    const result = await transport.send(baseOptions);

    expect(innerCalls).toBe(2);
    expect(sesCalls).toBe(1);
    expect(result.provider).toBe("ses");
    expect(result.providerIndex).toBe(1);
    expect(result.messageId).toBe("<ses-failover@example.com>");
  });
});
