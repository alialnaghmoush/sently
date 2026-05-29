import { afterEach, describe, expect, test } from "bun:test";
import type { MailOptions } from "../../src/core/types.js";
import { SESError, SESTransport } from "../../src/transports/ses.js";

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

const sesConfig = {
  accessKeyId: "AKIAIOSFODNN7EXAMPLE",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  region: "us-west-2",
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("SESTransport", () => {
  test("send() uses correct region in request URL", async () => {
    const captured = installFetchMock(() =>
      Response.json({ MessageId: "ses-msg-1" }, { status: 200 }),
    );

    const transport = new SESTransport(sesConfig);
    await transport.send(baseMailOptions);

    expect(captured[0]?.url).toBe("https://email.us-west-2.amazonaws.com/v2/email/outbound-emails");
  });

  test("send() includes AWS4-HMAC-SHA256 Authorization header", async () => {
    const captured = installFetchMock(() =>
      Response.json({ MessageId: "ses-msg-2" }, { status: 200 }),
    );

    const transport = new SESTransport(sesConfig);
    await transport.send(baseMailOptions);

    const headers = captured[0]?.init.headers as Record<string, string>;
    expect(headers.Authorization).toMatch(/^AWS4-HMAC-SHA256/);
    expect(headers["x-amz-date"]).toBeDefined();
  });

  test("send() uses Content.Simple for messages without attachments", async () => {
    const captured = installFetchMock(() =>
      Response.json({ MessageId: "ses-msg-3" }, { status: 200 }),
    );

    const transport = new SESTransport(sesConfig);
    await transport.send(baseMailOptions);

    const body = JSON.parse(String(captured[0]?.init.body));
    expect(body.Content.Simple).toBeDefined();
    expect(body.Content.Simple.Subject.Data).toBe("Test subject");
    expect(body.Content.Simple.Body.Text.Data).toBe("Plain body");
    expect(body.Content.Simple.Body.Html.Data).toBe("<p>HTML body</p>");
    expect(body.Content.Raw).toBeUndefined();
  });

  test("send() uses Content.Raw.Data for messages with attachments", async () => {
    const captured = installFetchMock(() =>
      Response.json({ MessageId: "ses-msg-4" }, { status: 200 }),
    );

    const attachmentBytes = new Uint8Array([104, 101, 108, 108, 111]);
    const transport = new SESTransport(sesConfig);
    await transport.send({
      ...baseMailOptions,
      attachments: [{ filename: "hello.txt", content: attachmentBytes }],
    });

    const body = JSON.parse(String(captured[0]?.init.body));
    expect(body.Content.Raw).toBeDefined();
    expect(body.Content.Simple).toBeUndefined();
    expect(typeof body.Content.Raw.Data).toBe("string");
    expect(body.Content.Raw.Data.length).toBeGreaterThan(0);
  });

  test("send() puts BCC in Destination.BccAddresses", async () => {
    const captured = installFetchMock(() =>
      Response.json({ MessageId: "ses-msg-5" }, { status: 200 }),
    );

    const transport = new SESTransport(sesConfig);
    await transport.send({
      ...baseMailOptions,
      bcc: "hidden@example.com",
    });

    const body = JSON.parse(String(captured[0]?.init.body));
    expect(body.Destination.BccAddresses).toEqual(["hidden@example.com"]);
  });

  test("send() throws SESError on 4xx with requestId from response header", async () => {
    installFetchMock(() =>
      Response.json({ message: "Access denied", Code: "AccessDenied" }, {
        status: 403,
        headers: { "x-amzn-requestid": "req-abc-123" },
      }),
    );

    const transport = new SESTransport(sesConfig);

    await expect(transport.send(baseMailOptions)).rejects.toMatchObject({
      name: "SESError",
      statusCode: 403,
      code: "AccessDenied",
      requestId: "req-abc-123",
    });
    await expect(transport.send(baseMailOptions)).rejects.toBeInstanceOf(SESError);
  });
});
