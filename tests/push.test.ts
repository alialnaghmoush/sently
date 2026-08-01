import { describe, expect, test } from "bun:test";
import type {
  PushHookContext,
  PushOptions,
  PushPlugin,
  PushSendResult,
  PushTransport,
} from "../src/core/push-types.js";
import { createPushSender } from "../src/push.js";

const baseOptions: PushOptions = {
  subscription: {
    endpoint: "https://push.example.com/s/abc",
    keys: { p256dh: "p256dh-key", auth: "auth-key" },
  },
  title: "Hello",
  body: "World",
};

function mockTransport(overrides?: Partial<PushTransport>): PushTransport {
  return {
    provider: "mock-push",
    send: async () => ({
      messageId: "push-1",
      status: "accepted",
      response: "201",
      provider: "mock-push",
    }),
    ...overrides,
  };
}

describe("createPushSender", () => {
  test("send() runs plugins before transport.send", async () => {
    const seen: PushOptions[] = [];
    const plugin: PushPlugin = (options) => ({ ...options, title: `*${options.title}` });

    const sender = createPushSender({
      transport: mockTransport({
        send: async (options) => {
          seen.push(options);
          return {
            messageId: "p1",
            status: "accepted",
            response: "201",
          };
        },
      }),
      plugins: [plugin],
    });

    await sender.send(baseOptions);
    expect(seen[0]?.title).toBe("*Hello");
  });

  test("hooks receive redacted endpoint, not the full delivery token URL", async () => {
    let onSendCtx: PushHookContext | undefined;
    let result: PushSendResult | undefined;

    const sender = createPushSender({
      transport: mockTransport(),
      hooks: {
        onSend: (ctx) => {
          onSendCtx = ctx;
        },
        onSuccess: (_ctx, sendResult) => {
          result = sendResult;
        },
      },
    });

    await sender.send(baseOptions);

    expect(onSendCtx?.provider).toBe("mock-push");
    expect(onSendCtx?.endpoint.startsWith("https://push.example.com/#")).toBe(true);
    expect(onSendCtx?.endpoint).not.toContain("/s/abc");
    expect(result?.messageId).toBe("push-1");
  });

  test("onError fires and error is rethrown unchanged", async () => {
    const original = new Error("push failed");
    let caught: unknown;
    let onErrorError: unknown;

    const sender = createPushSender({
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

  test("verify() defaults when transport has no verify", async () => {
    const sender = createPushSender({ transport: mockTransport() });
    await expect(sender.verify()).resolves.toEqual({ ok: true, provider: "push" });
  });

  test("close() delegates when present", async () => {
    let closed = false;
    const sender = createPushSender({
      transport: mockTransport({
        close: async () => {
          closed = true;
        },
      }),
    });
    await sender.close();
    expect(closed).toBe(true);
  });
});
