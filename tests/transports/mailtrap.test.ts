import { afterEach, describe, expect, test } from "bun:test";
import { encodeBase64 } from "../../src/core/base64.js";
import type { MailOptions } from "../../src/core/types.js";
import { MailtrapError, MailtrapTransport } from "../../src/transports/mailtrap.js";

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

describe("MailtrapTransport", () => {
  test("send() uses production endpoint and Bearer auth", async () => {
    const captured = installFetchMock(() =>
      Response.json({ success: true, message_ids: ["mt-1"] }),
    );

    const transport = new MailtrapTransport({ apiToken: "mt.test-token" });
    await transport.send(baseMailOptions);

    expect(captured[0]?.url).toBe("https://send.api.mailtrap.io/api/send");
    const headers = captured[0]?.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer mt.test-token");
  });

  test("send() uses sandbox endpoint when sandbox is true", async () => {
    const captured = installFetchMock(() =>
      Response.json({ success: true, message_ids: ["mt-sb-1"] }),
    );

    const transport = new MailtrapTransport({
      apiToken: "mt.test-token",
      sandbox: true,
      inboxId: "12345",
    });
    await transport.send(baseMailOptions);

    expect(captured[0]?.url).toBe("https://sandbox.api.mailtrap.io/api/send/12345");
  });

  test("send() throws when sandbox is true without inboxId", async () => {
    const transport = new MailtrapTransport({
      apiToken: "mt.test-token",
      sandbox: true,
    });

    await expect(transport.send(baseMailOptions)).rejects.toMatchObject({
      name: "MailtrapError",
      statusCode: 400,
    });
  });

  test("send() maps to/cc/bcc and base64-encodes attachments", async () => {
    const captured = installFetchMock(() =>
      Response.json({ success: true, message_ids: ["mt-2"] }),
    );

    const transport = new MailtrapTransport({ apiToken: "mt.test-token" });
    await transport.send({
      ...baseMailOptions,
      cc: "cc@example.com",
      bcc: "bcc@example.com",
      attachments: [{ filename: "hello.txt", content: attachmentBytes }],
    });

    const body = JSON.parse(String(captured[0]?.init.body));
    expect(body.cc).toEqual([{ email: "cc@example.com" }]);
    expect(body.bcc).toEqual([{ email: "bcc@example.com" }]);
    expect(body.attachments).toEqual([
      {
        filename: "hello.txt",
        content: expectedAttachmentBase64,
        type: "application/octet-stream",
      },
    ]);
  });

  test("send() throws MailtrapError on 4xx", async () => {
    installFetchMock(() =>
      Response.json({ success: false, message: "Unauthorized" }, { status: 401 }),
    );

    const transport = new MailtrapTransport({ apiToken: "mt.bad-token" });

    await expect(transport.send(baseMailOptions)).rejects.toBeInstanceOf(MailtrapError);
  });

  test("verify() returns ok true without network call", async () => {
    let fetchCalled = false;
    globalThis.fetch = (async () => {
      fetchCalled = true;
      return Response.json({});
    }) as typeof fetch;

    const transport = new MailtrapTransport({ apiToken: "mt.test-token" });
    const result = await transport.verify();

    expect(fetchCalled).toBe(false);
    expect(result).toEqual({
      ok: true,
      provider: "mailtrap",
      message: "key not validated (no verify endpoint)",
    });
  });
});
