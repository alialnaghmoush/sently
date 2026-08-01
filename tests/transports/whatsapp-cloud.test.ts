import { afterEach, describe, expect, test } from "bun:test";
import type {
  WhatsAppTemplateMessage,
  WhatsAppTextMessage,
} from "../../src/core/whatsapp-types.js";
import {
  WhatsAppCloudError,
  WhatsAppCloudTransport,
} from "../../src/transports/whatsapp-cloud.js";

const originalFetch = globalThis.fetch;

interface CapturedRequest {
  url: string;
  init: RequestInit;
}

function installFetchMock(
  handler: (req: CapturedRequest) => Response | Promise<Response>,
): CapturedRequest[] {
  const captured: CapturedRequest[] = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const request: CapturedRequest = { url, init: init ?? {} };
    captured.push(request);
    return handler(request);
  }) as typeof fetch;

  return captured;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("WhatsAppCloudTransport", () => {
  test("send() builds template message body", async () => {
    const captured = installFetchMock(() =>
      Response.json({ messages: [{ id: "wamid.template" }] }, { status: 200 }),
    );

    const transport = new WhatsAppCloudTransport({
      accessToken: "tok",
      phoneNumberId: "123",
    });

    const options: WhatsAppTemplateMessage = {
      to: "15551234567",
      template: {
        name: "hello_world",
        language: "en_US",
        components: [{ type: "body", parameters: [{ type: "text", text: "Ali" }] }],
      },
    };

    await transport.send(options);

    expect(captured[0]?.url).toBe("https://graph.facebook.com/v26.0/123/messages");
    expect(captured[0]?.init.headers).toEqual({
      Authorization: "Bearer tok",
      "Content-Type": "application/json",
    });

    const body = JSON.parse(String(captured[0]?.init.body));
    expect(body).toEqual({
      messaging_product: "whatsapp",
      to: "15551234567",
      type: "template",
      template: {
        name: "hello_world",
        language: { code: "en_US" },
        components: [{ type: "body", parameters: [{ type: "text", text: "Ali" }] }],
      },
    });
  });

  test("send() builds text message body", async () => {
    const captured = installFetchMock(() =>
      Response.json({ messages: [{ id: "wamid.text" }] }, { status: 200 }),
    );

    const transport = new WhatsAppCloudTransport({
      accessToken: "tok",
      phoneNumberId: "123",
      apiVersion: "v25.0",
    });

    const options: WhatsAppTextMessage = {
      to: "15551234567",
      text: "Hello",
    };

    const result = await transport.send(options);

    expect(captured[0]?.url).toBe("https://graph.facebook.com/v25.0/123/messages");
    const body = JSON.parse(String(captured[0]?.init.body));
    expect(body).toEqual({
      messaging_product: "whatsapp",
      to: "15551234567",
      type: "text",
      text: { body: "Hello" },
    });
    expect(result).toEqual({
      messageId: "wamid.text",
      to: "15551234567",
      status: "accepted",
      response: "Message sent",
      provider: "whatsapp-cloud",
    });
  });

  test("send() throws WhatsAppCloudError on 4xx", async () => {
    installFetchMock(() =>
      Response.json(
        {
          error: {
            message: "(#100) Invalid parameter",
            code: 100,
            error_subcode: 33,
            fbtrace_id: "abc",
          },
        },
        { status: 400 },
      ),
    );

    const transport = new WhatsAppCloudTransport({
      accessToken: "tok",
      phoneNumberId: "123",
    });

    await expect(
      transport.send({ to: "15551234567", text: "Hi" }),
    ).rejects.toMatchObject({
      name: "WhatsAppCloudError",
      statusCode: 400,
      message: "(#100) Invalid parameter",
    });
    await expect(
      transport.send({ to: "15551234567", text: "Hi" }),
    ).rejects.toBeInstanceOf(WhatsAppCloudError);
  });
});
