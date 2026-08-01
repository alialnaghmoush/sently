import { afterEach, describe, expect, test } from "bun:test";
import {
  TaqnyatWhatsAppError,
  TaqnyatWhatsAppTransport,
} from "../../src/transports/taqnyat-whatsapp.js";

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

describe("TaqnyatWhatsAppTransport", () => {
  test("send() posts template body and maps message_id", async () => {
    const captured = installFetchMock(() =>
      Response.json({
        type: "whatsapp",
        statuses: [{ message_id: "wamid.abc", recipient: "+966501234567" }],
      }),
    );

    const transport = new TaqnyatWhatsAppTransport({ bearerToken: "tok" });
    const result = await transport.send({
      to: "+966501234567",
      template: { name: "otp", language: "en" },
    });

    expect(result).toMatchObject({
      messageId: "wamid.abc",
      provider: "taqnyat-whatsapp",
      status: "accepted",
    });

    const { url, init } = captured[0] as CapturedRequest;
    expect(url).toBe("https://api.taqnyat.sa/wa/v2/messages/");
    expect(JSON.parse(String(init.body))).toEqual({
      to: "966501234567",
      type: "template",
      template: { name: "otp", language: { code: "en" } },
    });
  });

  test("send() posts session text body", async () => {
    const captured = installFetchMock(() =>
      Response.json({
        type: "text",
        statuses: [{ message_id: "wamid.txt", recipient: "966501234567" }],
      }),
    );

    const transport = new TaqnyatWhatsAppTransport({ bearerToken: "tok" });
    await transport.send({ to: "966501234567", text: "Hello" });

    expect(JSON.parse(String((captured[0] as CapturedRequest).init.body))).toEqual({
      to: "966501234567",
      type: "text",
      text: { body: "Hello" },
    });
  });

  test("send() throws on documented error shape", async () => {
    installFetchMock(() =>
      Response.json({ message: "100", reason: "The 'to' parameter is required" }, { status: 200 }),
    );

    const transport = new TaqnyatWhatsAppTransport({ bearerToken: "tok" });
    await expect(transport.send({ to: "+9665", text: "x" })).rejects.toMatchObject({
      name: "TaqnyatWhatsAppError",
      message: "The 'to' parameter is required",
      statusCode: 100,
    });
    await expect(transport.send({ to: "+9665", text: "x" })).rejects.toBeInstanceOf(
      TaqnyatWhatsAppError,
    );
  });
});
