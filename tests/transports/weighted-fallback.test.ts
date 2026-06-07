import { describe, expect, test } from "bun:test";
import type { MailOptions, SendResult, Transport } from "../../src/core/types.js";
import { ResendError } from "../../src/transports/resend.js";
import { WeightedFallbackTransport } from "../../src/transports/weighted-fallback.js";

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
  const transport = { send: sendFn, ...extras };
  Object.defineProperty(transport, "constructor", {
    value: { name: `${name}Transport` },
  });
  return transport as Transport;
}

describe("WeightedFallbackTransport", () => {
  test("constructor throws when entries is empty", () => {
    expect(() => new WeightedFallbackTransport([])).toThrow(
      "WeightedFallbackTransport requires at least one entry",
    );
  });

  test("constructor throws when total weight is zero", () => {
    const transport = createNamedMockTransport("Resend", async () => successResult);
    expect(() => new WeightedFallbackTransport([{ transport, weight: 0 }])).toThrow(
      "WeightedFallbackTransport requires positive total weight",
    );
  });

  test("weighted primary is selected by random roll", async () => {
    const calls: string[] = [];
    const resend = createNamedMockTransport("Resend", async () => {
      calls.push("resend");
      return { ...successResult, messageId: "<resend@example.com>" };
    });
    const ses = createNamedMockTransport("Ses", async () => {
      calls.push("ses");
      return { ...successResult, messageId: "<ses@example.com>" };
    });

    const transport = new WeightedFallbackTransport(
      [
        { transport: resend, weight: 80 },
        { transport: ses, weight: 20 },
      ],
      { random: () => 0.1 },
    );

    const result = await transport.send(baseOptions);
    expect(calls).toEqual(["resend"]);
    expect(result.provider).toBe("resend");
    expect(result.providerIndex).toBe(0);
  });

  test("fails over to remaining providers on error", async () => {
    const resend = createNamedMockTransport("Resend", async () => {
      throw new ResendError("Service unavailable", 503, {});
    });
    const ses = createNamedMockTransport("Ses", async () => ({
      ...successResult,
      messageId: "<ses@example.com>",
    }));

    const transport = new WeightedFallbackTransport(
      [
        { transport: resend, weight: 80 },
        { transport: ses, weight: 20 },
      ],
      { random: () => 0.1 },
    );

    const result = await transport.send(baseOptions);
    expect(result.provider).toBe("ses");
    expect(result.providerIndex).toBe(1);
  });

  test("setMailerOnFallback receives provider labels on failover", async () => {
    const events: string[] = [];
    const resend = createNamedMockTransport("Resend", async () => {
      throw new ResendError("Service unavailable", 503, {});
    });
    const ses = createNamedMockTransport("Ses", async () => successResult);

    const transport = new WeightedFallbackTransport(
      [
        { transport: resend, weight: 1 },
        { transport: ses, weight: 1 },
      ],
      { random: () => 0 },
    );
    transport.setMailerOnFallback((failed, next) => {
      events.push(`${failed}->${next}`);
    });

    await transport.send(baseOptions);
    expect(events).toEqual(["resend->ses"]);
  });

  test("verifyAll checks every entry in definition order", async () => {
    const resend = createNamedMockTransport("Resend", async () => successResult, {
      verify: async () => ({ ok: true, provider: "resend", message: "ok" }),
    });
    const ses = createNamedMockTransport("Ses", async () => successResult, {
      verify: async () => ({ ok: false, provider: "ses", message: "bad key" }),
    });

    const transport = new WeightedFallbackTransport([
      { transport: resend, weight: 80 },
      { transport: ses, weight: 20 },
    ]);

    const all = await transport.verifyAll();
    expect(all.ok).toBe(true);
    expect(all.providers).toEqual([
      { provider: "resend", ok: true, message: "ok" },
      { provider: "ses", ok: false, message: "bad key" },
    ]);
  });

  test("close() closes every underlying transport", async () => {
    const closed: string[] = [];
    const resend = createNamedMockTransport("Resend", async () => successResult, {
      close: async () => {
        closed.push("resend");
      },
    });
    const ses = createNamedMockTransport("Ses", async () => successResult, {
      close: async () => {
        closed.push("ses");
      },
    });

    const transport = new WeightedFallbackTransport([
      { transport: resend, weight: 1 },
      { transport: ses, weight: 1 },
    ]);
    await transport.close();
    expect(closed.sort()).toEqual(["resend", "ses"]);
  });

  test("cooldown state is shared across sends", async () => {
    let now = 1000;
    let resendCalls = 0;
    let sesCalls = 0;

    const resend = createNamedMockTransport("Resend", async () => {
      resendCalls++;
      throw new ResendError("Service unavailable", 503, {});
    });
    const ses = createNamedMockTransport("Ses", async () => {
      sesCalls++;
      return successResult;
    });

    const transport = new WeightedFallbackTransport(
      [
        { transport: resend, weight: 50 },
        { transport: ses, weight: 50 },
      ],
      { random: () => 0, cooldownMs: 5000, now: () => now },
    );

    await transport.send(baseOptions);
    expect(resendCalls).toBe(1);
    expect(sesCalls).toBe(1);

    resendCalls = 0;
    sesCalls = 0;
    await transport.send(baseOptions);
    expect(resendCalls).toBe(0);
    expect(sesCalls).toBe(1);
  });
});
