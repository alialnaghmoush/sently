import { describe, expect, test } from "bun:test";
import type {
  WhatsAppHookContext,
  WhatsAppOptions,
  WhatsAppPlugin,
  WhatsAppSendResult,
  WhatsAppTemplateMessage,
  WhatsAppTextMessage,
  WhatsAppTransport,
} from "../src/core/whatsapp-types.js";
import { createWhatsAppSender } from "../src/whatsapp.js";

const textMessage: WhatsAppTextMessage = {
  to: "15551234567",
  text: "Hello",
};

const templateMessage: WhatsAppTemplateMessage = {
  to: "15551234567",
  template: {
    name: "hello_world",
    language: "en_US",
    components: [{ type: "body", parameters: [{ type: "text", text: "Ali" }] }],
  },
};

function mockTransport(overrides?: Partial<WhatsAppTransport>): WhatsAppTransport {
  return {
    provider: "mock-whatsapp",
    send: async (options) => ({
      messageId: "wamid.123",
      to: options.to,
      status: "accepted",
      response: "Message sent",
      provider: "mock-whatsapp",
    }),
    ...overrides,
  };
}

describe("createWhatsAppSender", () => {
  test("send() runs plugins before transport.send for text messages", async () => {
    const seen: WhatsAppOptions[] = [];
    const plugin: WhatsAppPlugin = (options) => {
      if ("text" in options) {
        return { ...options, text: `${options.text}!` };
      }
      return options;
    };

    const sender = createWhatsAppSender({
      transport: mockTransport({
        send: async (options) => {
          seen.push(options);
          return {
            messageId: "wamid.1",
            to: options.to,
            status: "accepted",
            response: "ok",
          };
        },
      }),
      plugins: [plugin],
    });

    await sender.send(textMessage);
    expect(seen).toHaveLength(1);
    expect(seen[0] && "text" in seen[0] ? seen[0].text : undefined).toBe("Hello!");
  });

  test("template messages go through the pipeline with hook to from options.to", async () => {
    let onSendCtx: WhatsAppHookContext | undefined;
    let result: WhatsAppSendResult | undefined;

    const sender = createWhatsAppSender({
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

    await sender.send(templateMessage);

    expect(onSendCtx).toEqual({
      to: "15551234567",
      provider: "mock-whatsapp",
    });
    expect(result?.messageId).toBe("wamid.123");
  });

  test("onError fires and error is rethrown unchanged", async () => {
    const original = new Error("wa failed");
    let caught: unknown;

    const sender = createWhatsAppSender({
      transport: mockTransport({
        send: async () => {
          throw original;
        },
      }),
    });

    try {
      await sender.send(textMessage);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBe(original);
  });

  test("verify() defaults when transport has no verify", async () => {
    const sender = createWhatsAppSender({ transport: mockTransport() });
    await expect(sender.verify()).resolves.toEqual({ ok: true, provider: "whatsapp" });
  });

  test("close() is a no-op when transport has no close", async () => {
    const sender = createWhatsAppSender({ transport: mockTransport() });
    await expect(sender.close()).resolves.toBeUndefined();
  });
});
