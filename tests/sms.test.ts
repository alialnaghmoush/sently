import { describe, expect, test } from "bun:test";
import type {
  SmsHookContext,
  SmsOptions,
  SmsPlugin,
  SmsSendResult,
  SmsTransport,
} from "../src/core/sms-types.js";
import type { VerifyResult } from "../src/core/types.js";
import { createSmsSender } from "../src/sms.js";

const baseOptions: SmsOptions = {
  to: "+15551234567",
  body: "Hello",
  from: "+15557654321",
};

function mockTransport(overrides?: Partial<SmsTransport>): SmsTransport {
  return {
    provider: "mock-sms",
    send: async () => ({
      messageId: "SM123",
      to: baseOptions.to,
      status: "queued",
      response: "queued",
      provider: "mock-sms",
    }),
    ...overrides,
  };
}

describe("createSmsSender", () => {
  test("send() runs plugins before transport.send", async () => {
    const seen: SmsOptions[] = [];
    const plugin: SmsPlugin = (options) => ({ ...options, body: `${options.body}!` });
    const transport = mockTransport({
      send: async (options) => {
        seen.push(options);
        return {
          messageId: "SM1",
          to: options.to,
          status: "queued",
          response: "queued",
        };
      },
    });

    const sender = createSmsSender({ transport, plugins: [plugin] });
    await sender.send(baseOptions);

    expect(seen).toHaveLength(1);
    expect(seen[0]?.body).toBe("Hello!");
  });

  test("hooks fire in order with SmsHookContext shape", async () => {
    const events: string[] = [];
    let onSendCtx: SmsHookContext | undefined;
    let onSuccessCtx: SmsHookContext | undefined;
    let resultArg: SmsSendResult | undefined;
    let duration: number | undefined;

    const sender = createSmsSender({
      transport: mockTransport(),
      hooks: {
        onSend: (ctx) => {
          events.push("onSend");
          onSendCtx = ctx;
        },
        onSuccess: (ctx, result, durationMs) => {
          events.push("onSuccess");
          onSuccessCtx = ctx;
          resultArg = result;
          duration = durationMs;
        },
      },
    });

    await sender.send({ ...baseOptions, messageId: "client-1" });

    expect(events).toEqual(["onSend", "onSuccess"]);
    expect(onSendCtx).toEqual({
      messageId: "client-1",
      to: "+15551234567",
      provider: "mock-sms",
    });
    expect(onSuccessCtx?.messageId).toBe("SM123");
    expect(resultArg?.messageId).toBe("SM123");
    expect(typeof duration).toBe("number");
  });

  test("onError fires and error is rethrown unchanged", async () => {
    const original = new Error("transport failed");
    let caught: unknown;
    let onErrorError: unknown;

    const sender = createSmsSender({
      transport: mockTransport({
        send: async () => {
          throw original;
        },
      }),
      hooks: {
        onError: (_ctx, error) => {
          onErrorError = error;
        },
      },
    });

    try {
      await sender.send(baseOptions);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBe(original);
    expect(onErrorError).toBe(original);
  });

  test("verify() delegates to transport.verify when present", async () => {
    const verifyResult: VerifyResult = { ok: true, provider: "mock-sms", message: "ok" };
    const sender = createSmsSender({
      transport: mockTransport({
        verify: async () => verifyResult,
      }),
    });

    await expect(sender.verify()).resolves.toEqual(verifyResult);
  });

  test("verify() defaults when transport has no verify", async () => {
    const sender = createSmsSender({ transport: mockTransport() });
    await expect(sender.verify()).resolves.toEqual({ ok: true, provider: "sms" });
  });

  test("close() delegates to transport.close when present", async () => {
    let closed = false;
    const sender = createSmsSender({
      transport: mockTransport({
        close: async () => {
          closed = true;
        },
      }),
    });

    await sender.close();
    expect(closed).toBe(true);
  });

  test("provider defaults to sms when transport.provider is unset", async () => {
    let provider: string | undefined;
    const transport: SmsTransport = {
      send: async () => ({
        messageId: "x",
        to: baseOptions.to,
        status: "ok",
        response: "ok",
      }),
    };

    const sender = createSmsSender({
      transport,
      hooks: {
        onSend: (ctx) => {
          provider = ctx.provider;
        },
      },
    });

    await sender.send(baseOptions);
    expect(provider).toBe("sms");
  });
});
