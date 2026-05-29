import { afterEach, describe, expect, test } from "bun:test";
import { encodeBase64 } from "../../src/core/base64.js";
import type { MailOptions } from "../../src/core/types.js";
import { BrevoError, BrevoTransport } from "../../src/transports/brevo.js";

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

const baseMailOptions: MailOptions = {
  from: "Sender <sender@example.com>",
  to: "recipient@example.com",
  subject: "Test subject",
  text: "Plain body",
  html: "<p>HTML body</p>",
};

const attachmentBytes = new Uint8Array([104, 101, 108, 108, 111]);
const expectedAttachmentBase64 = encodeBase64(attachmentBytes).replace(/\r\n/g, "");

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("BrevoTransport", () => {
  test("send() sets api-key header correctly", async () => {
    const captured = installFetchMock(() =>
      Response.json({ messageId: "brevo-1" }, { status: 201 }),
    );

    const transport = new BrevoTransport({ apiKey: "xkeysib-test-key" });
    await transport.send(baseMailOptions);

    const headers = captured[0]?.init.headers as Record<string, string>;
    expect(headers["api-key"]).toBe("xkeysib-test-key");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  test("send() maps sender from options.from", async () => {
    const captured = installFetchMock(() =>
      Response.json({ messageId: "brevo-2" }, { status: 201 }),
    );

    const transport = new BrevoTransport({ apiKey: "xkeysib-test-key" });
    await transport.send(baseMailOptions);

    const body = JSON.parse(String(captured[0]?.init.body));
    expect(body.sender).toEqual({ email: "sender@example.com", name: "Sender" });
  });

  test("send() maps multiple to addresses to array of objects", async () => {
    const captured = installFetchMock(() =>
      Response.json({ messageId: "brevo-3" }, { status: 201 }),
    );

    const transport = new BrevoTransport({ apiKey: "xkeysib-test-key" });
    await transport.send({
      ...baseMailOptions,
      to: ["one@example.com", "Two <two@example.com>"],
    });

    const body = JSON.parse(String(captured[0]?.init.body));
    expect(body.to).toEqual([
      { email: "one@example.com" },
      { email: "two@example.com", name: "Two" },
    ]);
  });

  test("send() puts BCC in body bcc array only", async () => {
    const captured = installFetchMock(() =>
      Response.json({ messageId: "brevo-4" }, { status: 201 }),
    );

    const transport = new BrevoTransport({ apiKey: "xkeysib-test-key" });
    await transport.send({
      ...baseMailOptions,
      bcc: "hidden@example.com",
    });

    const body = JSON.parse(String(captured[0]?.init.body));
    expect(body.bcc).toEqual([{ email: "hidden@example.com" }]);
  });

  test("send() base64-encodes attachments correctly", async () => {
    const captured = installFetchMock(() =>
      Response.json({ messageId: "brevo-5" }, { status: 201 }),
    );

    const transport = new BrevoTransport({ apiKey: "xkeysib-test-key" });
    await transport.send({
      ...baseMailOptions,
      attachments: [{ filename: "hello.txt", content: attachmentBytes }],
    });

    const body = JSON.parse(String(captured[0]?.init.body));
    expect(body.attachment).toEqual([{ name: "hello.txt", content: expectedAttachmentBase64 }]);
  });

  test("send() throws BrevoError on 4xx with code from response body", async () => {
    installFetchMock(() =>
      Response.json({ message: "Invalid API key", code: "invalid_key" }, { status: 401 }),
    );

    const transport = new BrevoTransport({ apiKey: "xkeysib-bad-key" });

    await expect(transport.send(baseMailOptions)).rejects.toMatchObject({
      name: "BrevoError",
      statusCode: 401,
      code: "invalid_key",
      message: "Invalid API key",
    });
    await expect(transport.send(baseMailOptions)).rejects.toBeInstanceOf(BrevoError);
  });

  test("send() treats HTTP 201 as success", async () => {
    installFetchMock(() =>
      Response.json({ messageId: "brevo-201" }, { status: 201 }),
    );

    const transport = new BrevoTransport({ apiKey: "xkeysib-test-key" });
    const result = await transport.send(baseMailOptions);

    expect(result.messageId).toBe("brevo-201");
    expect(result.accepted).toEqual(["recipient@example.com"]);
  });
});
