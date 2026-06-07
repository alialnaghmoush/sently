import { afterEach, describe, expect, test } from "bun:test";
import { encodeBase64 } from "../../src/core/base64.js";
import type { MailOptions } from "../../src/core/types.js";
import { SparkPostError, SparkPostTransport } from "../../src/transports/sparkpost.js";

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

describe("SparkPostTransport", () => {
  test("send() uses raw Authorization header without Bearer prefix", async () => {
    const captured = installFetchMock(() =>
      Response.json({ results: { id: "sp-1", total_accepted_recipients: 1 } }),
    );

    const transport = new SparkPostTransport({ apiKey: "sparkpost-api-key" });
    await transport.send(baseMailOptions);

    expect(captured[0]?.url).toBe("https://api.sparkpost.com/api/v1/transmissions");
    const headers = captured[0]?.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("sparkpost-api-key");
    expect(headers.Authorization).not.toContain("Bearer");
  });

  test("send() uses EU endpoint when euRegion is true", async () => {
    const captured = installFetchMock(() =>
      Response.json({ results: { id: "sp-eu-1" } }),
    );

    const transport = new SparkPostTransport({ apiKey: "key", euRegion: true });
    await transport.send(baseMailOptions);

    expect(captured[0]?.url).toBe("https://api.eu.sparkpost.com/api/v1/transmissions");
  });

  test("send() puts to/cc/bcc in recipients array", async () => {
    const captured = installFetchMock(() =>
      Response.json({ results: { id: "sp-2" } }),
    );

    const transport = new SparkPostTransport({ apiKey: "key" });
    await transport.send({
      ...baseMailOptions,
      to: "to@example.com",
      cc: "cc@example.com",
      bcc: "bcc@example.com",
    });

    const body = JSON.parse(String(captured[0]?.init.body));
    expect(body.recipients).toEqual([
      { address: { email: "to@example.com" } },
      { address: { email: "cc@example.com" } },
      { address: { email: "bcc@example.com" } },
    ]);
  });

  test("send() base64-encodes attachments", async () => {
    const captured = installFetchMock(() =>
      Response.json({ results: { id: "sp-3" } }),
    );

    const transport = new SparkPostTransport({ apiKey: "key" });
    await transport.send({
      ...baseMailOptions,
      attachments: [{ filename: "hello.txt", content: attachmentBytes }],
    });

    const body = JSON.parse(String(captured[0]?.init.body));
    expect(body.content.attachments).toEqual([
      {
        type: "application/octet-stream",
        name: "hello.txt",
        data: expectedAttachmentBase64,
      },
    ]);
  });

  test("send() returns results.id on 200", async () => {
    installFetchMock(() =>
      Response.json({ results: { id: "transmission-abc", total_accepted_recipients: 1 } }),
    );

    const transport = new SparkPostTransport({ apiKey: "key" });
    const result = await transport.send(baseMailOptions);

    expect(result.messageId).toBe("transmission-abc");
    expect(result.accepted).toEqual(["recipient@example.com"]);
  });

  test("send() throws SparkPostError on 4xx", async () => {
    installFetchMock(() =>
      Response.json({ errors: [{ message: "Unauthorized" }] }, { status: 401 }),
    );

    const transport = new SparkPostTransport({ apiKey: "bad-key" });

    await expect(transport.send(baseMailOptions)).rejects.toMatchObject({
      name: "SparkPostError",
      statusCode: 401,
    });
    await expect(transport.send(baseMailOptions)).rejects.toBeInstanceOf(SparkPostError);
  });

  test("verify() returns ok true on 200", async () => {
    installFetchMock(() => Response.json({}, { status: 200 }));

    const transport = new SparkPostTransport({ apiKey: "key" });
    const result = await transport.verify();

    expect(result.ok).toBe(true);
    expect(result.provider).toBe("sparkpost");
  });
});
