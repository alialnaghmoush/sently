import { afterEach, describe, expect, test } from "bun:test";
import { encodeBase64 } from "../../src/core/base64.js";
import type { MailOptions } from "../../src/core/types.js";
import { MailerSendError, MailerSendTransport } from "../../src/transports/mailersend.js";

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

describe("MailerSendTransport", () => {
  test("send() sets Bearer auth and correct endpoint", async () => {
    const captured = installFetchMock(() =>
      new Response(null, { status: 202, headers: { "x-message-id": "ms-1" } }),
    );

    const transport = new MailerSendTransport({ apiToken: "mlsn.test-token" });
    await transport.send(baseMailOptions);

    expect(captured[0]?.url).toBe("https://api.mailersend.com/v1/email");
    const headers = captured[0]?.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer mlsn.test-token");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  test("send() maps to/cc/bcc addresses", async () => {
    const captured = installFetchMock(() =>
      new Response(null, { status: 202, headers: { "x-message-id": "ms-2" } }),
    );

    const transport = new MailerSendTransport({ apiToken: "mlsn.test-token" });
    await transport.send({
      ...baseMailOptions,
      to: "one@example.com",
      cc: "cc@example.com",
      bcc: "bcc@example.com",
    });

    const body = JSON.parse(String(captured[0]?.init.body));
    expect(body.to).toEqual([{ email: "one@example.com" }]);
    expect(body.cc).toEqual([{ email: "cc@example.com" }]);
    expect(body.bcc).toEqual([{ email: "bcc@example.com" }]);
  });

  test("send() base64-encodes attachments", async () => {
    const captured = installFetchMock(() =>
      new Response(null, { status: 202, headers: { "x-message-id": "ms-3" } }),
    );

    const transport = new MailerSendTransport({ apiToken: "mlsn.test-token" });
    await transport.send({
      ...baseMailOptions,
      attachments: [{ filename: "hello.txt", content: attachmentBytes }],
    });

    const body = JSON.parse(String(captured[0]?.init.body));
    expect(body.attachments).toEqual([
      { filename: "hello.txt", content: expectedAttachmentBase64, disposition: "attachment" },
    ]);
  });

  test("send() returns messageId from x-message-id header on 202", async () => {
    installFetchMock(() =>
      new Response(null, { status: 202, headers: { "x-message-id": "ms-header-id" } }),
    );

    const transport = new MailerSendTransport({ apiToken: "mlsn.test-token" });
    const result = await transport.send(baseMailOptions);

    expect(result.messageId).toBe("ms-header-id");
    expect(result.accepted).toEqual(["recipient@example.com"]);
  });

  test("send() throws MailerSendError on 4xx", async () => {
    installFetchMock(() =>
      Response.json({ message: "Unauthorized" }, { status: 401 }),
    );

    const transport = new MailerSendTransport({ apiToken: "mlsn.bad-token" });

    await expect(transport.send(baseMailOptions)).rejects.toMatchObject({
      name: "MailerSendError",
      statusCode: 401,
    });
    await expect(transport.send(baseMailOptions)).rejects.toBeInstanceOf(MailerSendError);
  });

  test("verify() returns ok true on 200", async () => {
    installFetchMock(() => Response.json({}, { status: 200 }));

    const transport = new MailerSendTransport({ apiToken: "mlsn.test-token" });
    const result = await transport.verify();

    expect(result.ok).toBe(true);
    expect(result.provider).toBe("mailersend");
  });

  test("verify() returns ok false on failure", async () => {
    installFetchMock(() => Response.json({ message: "Unauthorized" }, { status: 401 }));

    const transport = new MailerSendTransport({ apiToken: "mlsn.bad-token" });
    const result = await transport.verify();

    expect(result.ok).toBe(false);
    expect(result.provider).toBe("mailersend");
  });
});
