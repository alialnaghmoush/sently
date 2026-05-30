import { afterEach, describe, expect, test } from "bun:test";
import type { MailOptions } from "../../src/core/types.js";
import { MailgunError, MailgunTransport } from "../../src/transports/mailgun.js";

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

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("MailgunTransport", () => {
  test("send() builds correct Authorization header (Basic auth format)", async () => {
    const captured = installFetchMock(() =>
      Response.json({ id: "<msg-id>", message: "Queued" }, { status: 200 }),
    );

    const transport = new MailgunTransport({
      apiKey: "key-test123",
      domain: "mg.example.com",
    });
    await transport.send(baseMailOptions);

    expect(captured).toHaveLength(1);
    const { init } = captured[0] as CapturedRequest;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Basic ${btoa("api:key-test123")}`);
  });

  test("send() uses EU endpoint when region is eu", async () => {
    const captured = installFetchMock(() =>
      Response.json({ id: "<msg-id>", message: "Queued" }, { status: 200 }),
    );

    const transport = new MailgunTransport({
      apiKey: "key-test123",
      domain: "mg.example.com",
      region: "eu",
    });
    await transport.send(baseMailOptions);

    expect(captured[0]?.url).toBe("https://api.eu.mailgun.net/v3/mg.example.com/messages");
  });

  test("send() form includes from, to, subject, html, and text", async () => {
    const captured = installFetchMock(() =>
      Response.json({ id: "<msg-id>", message: "Queued" }, { status: 200 }),
    );

    const transport = new MailgunTransport({
      apiKey: "key-test123",
      domain: "mg.example.com",
    });
    await transport.send(baseMailOptions);

    const form = captured[0]?.init.body as FormData;
    expect(form.get("from")).toBe("Sender <sender@example.com>");
    expect(form.get("to")).toBe("recipient@example.com");
    expect(form.get("subject")).toBe("Test subject");
    expect(form.get("text")).toBe("Plain body");
    expect(form.get("html")).toBe("<p>HTML body</p>");
  });

  test("send() puts BCC in form field, not in message headers", async () => {
    const captured = installFetchMock(() =>
      Response.json({ id: "<msg-id>", message: "Queued" }, { status: 200 }),
    );

    const transport = new MailgunTransport({
      apiKey: "key-test123",
      domain: "mg.example.com",
    });
    await transport.send({
      ...baseMailOptions,
      bcc: "hidden@example.com",
    });

    const form = captured[0]?.init.body as FormData;
    expect(form.get("bcc")).toBe("hidden@example.com");
    expect(form.get("h:Bcc")).toBeNull();
  });

  test("send() converts attachment to Blob correctly", async () => {
    const captured = installFetchMock(() =>
      Response.json({ id: "<msg-id>", message: "Queued" }, { status: 200 }),
    );

    const attachmentBytes = new Uint8Array([104, 101, 108, 108, 111]);
    const transport = new MailgunTransport({
      apiKey: "key-test123",
      domain: "mg.example.com",
    });
    await transport.send({
      ...baseMailOptions,
      attachments: [{ filename: "hello.txt", content: attachmentBytes, contentType: "text/plain" }],
    });

    const form = captured[0]?.init.body as FormData;
    const attachment = form.get("attachment") as File;
    expect(attachment).toBeInstanceOf(Blob);
    expect(attachment.name).toBe("hello.txt");
    expect(attachment.type.startsWith("text/plain")).toBe(true);
    const content = await attachment.arrayBuffer();
    expect(new Uint8Array(content)).toEqual(attachmentBytes);
  });

  test("send() throws MailgunError on 4xx/5xx", async () => {
    installFetchMock(() =>
      Response.json({ message: "Forbidden" }, { status: 403 }),
    );

    const transport = new MailgunTransport({
      apiKey: "key-bad",
      domain: "mg.example.com",
    });

    await expect(transport.send(baseMailOptions)).rejects.toMatchObject({
      name: "MailgunError",
      statusCode: 403,
      message: "Forbidden",
    });
    await expect(transport.send(baseMailOptions)).rejects.toBeInstanceOf(MailgunError);
  });

  test("verify() returns ok true on 200 response", async () => {
    installFetchMock(() => Response.json({ items: [] }, { status: 200 }));

    const transport = new MailgunTransport({
      apiKey: "key-test123",
      domain: "mg.example.com",
    });
    const result = await transport.verify();

    expect(result).toEqual({
      ok: true,
      provider: "mailgun",
      message: "API key is valid",
    });
  });

  test("verify() returns ok false on failure without throwing", async () => {
    installFetchMock(() => Response.json({ message: "Forbidden" }, { status: 403 }));

    const transport = new MailgunTransport({
      apiKey: "key-bad",
      domain: "mg.example.com",
    });
    const result = await transport.verify();

    expect(result.ok).toBe(false);
    expect(result.provider).toBe("mailgun");
    expect(result.message).toBe("Forbidden");
  });
});
