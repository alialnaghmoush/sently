import { afterEach, describe, expect, test } from "bun:test";
import { encodeBase64 } from "../../src/core/base64.js";
import type { MailOptions } from "../../src/core/types.js";
import { PostmarkError, PostmarkTransport } from "../../src/transports/postmark.js";
import { ResendError, ResendTransport } from "../../src/transports/resend.js";
import { SendGridError, SendGridTransport } from "../../src/transports/sendgrid.js";

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

const attachmentBytes = new Uint8Array([104, 101, 108, 108, 111]); // "hello"
const expectedAttachmentBase64 = encodeBase64(attachmentBytes).replace(/\r\n/g, "");

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("ResendTransport", () => {
  test("send() builds the correct HTTP request", async () => {
    const captured = installFetchMock(() =>
      Response.json({ id: "resend-id-1", message: "Email sent" }, { status: 200 }),
    );

    const transport = new ResendTransport({ apiKey: "re_test_key" });
    await transport.send(baseMailOptions);

    expect(captured).toHaveLength(1);
    const { url, init } = captured[0] as CapturedRequest;

    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      Authorization: "Bearer re_test_key",
      "Content-Type": "application/json",
    });

    const body = JSON.parse(String(init.body));
    expect(body.from).toBe("Sender <sender@example.com>");
    expect(body.to).toEqual(["recipient@example.com"]);
    expect(body.subject).toBe("Test subject");
    expect(body.text).toBe("Plain body");
    expect(body.html).toBe("<p>HTML body</p>");
  });

  test("send() returns a normalized SendResult on 200 response", async () => {
    installFetchMock(() =>
      Response.json({ id: "resend-id-2", message: "Email sent" }, { status: 200 }),
    );

    const transport = new ResendTransport({ apiKey: "re_test_key" });
    const result = await transport.send(baseMailOptions);

    expect(result).toEqual({
      messageId: "resend-id-2",
      accepted: ["recipient@example.com"],
      rejected: [],
      response: "Email sent",
      envelope: {
        from: "sender@example.com",
        to: ["recipient@example.com"],
      },
    });
  });

  test("send() throws ResendError on 4xx/5xx response", async () => {
    installFetchMock(() =>
      Response.json({ message: "Invalid API key" }, { status: 401 }),
    );

    const transport = new ResendTransport({ apiKey: "re_bad_key" });

    await expect(transport.send(baseMailOptions)).rejects.toMatchObject({
      name: "ResendError",
      message: "Invalid API key",
      statusCode: 401,
    });

    try {
      await transport.send(baseMailOptions);
    } catch (error) {
      expect(error).toBeInstanceOf(ResendError);
      expect((error as ResendError).apiError).toEqual({ message: "Invalid API key" });
    }
  });

  test("send() base64-encodes Uint8Array attachments in request body", async () => {
    const captured = installFetchMock(() =>
      Response.json({ id: "resend-id-3" }, { status: 201 }),
    );

    const transport = new ResendTransport({ apiKey: "re_test_key" });
    await transport.send({
      ...baseMailOptions,
      attachments: [
        {
          filename: "hello.txt",
          content: attachmentBytes,
          contentType: "text/plain",
        },
      ],
    });

    const body = JSON.parse(String(captured[0]?.init.body));
    expect(body.attachments).toEqual([
      {
        filename: "hello.txt",
        content: expectedAttachmentBase64,
        content_type: "text/plain",
      },
    ]);
    expect(body.attachments[0].content).toBe("aGVsbG8=");
  });
});

describe("SendGridTransport", () => {
  test("send() builds the correct HTTP request", async () => {
    const captured = installFetchMock(() =>
      new Response(null, {
        status: 202,
        headers: { "x-message-id": "sg-msg-1" },
      }),
    );

    const transport = new SendGridTransport({ apiKey: "SG.test_key" });
    await transport.send(baseMailOptions);

    expect(captured).toHaveLength(1);
    const { url, init } = captured[0] as CapturedRequest;

    expect(url).toBe("https://api.sendgrid.com/v3/mail/send");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      Authorization: "Bearer SG.test_key",
      "Content-Type": "application/json",
    });

    const body = JSON.parse(String(init.body));
    expect(body.personalizations).toEqual([
      {
        to: [{ email: "recipient@example.com", name: undefined }],
      },
    ]);
    expect(body.from).toEqual({ email: "sender@example.com", name: "Sender" });
    expect(body.subject).toBe("Test subject");
    expect(body.content).toEqual([
      { type: "text/plain", value: "Plain body" },
      { type: "text/html", value: "<p>HTML body</p>" },
    ]);
  });

  test("send() returns a normalized SendResult on 202 response", async () => {
    installFetchMock(() =>
      new Response(null, {
        status: 202,
        headers: { "x-message-id": "sg-msg-2" },
      }),
    );

    const transport = new SendGridTransport({ apiKey: "SG.test_key" });
    const result = await transport.send(baseMailOptions);

    expect(result).toEqual({
      messageId: "sg-msg-2",
      accepted: ["recipient@example.com"],
      rejected: [],
      response: "Accepted",
      envelope: {
        from: "sender@example.com",
        to: ["recipient@example.com"],
      },
    });
  });

  test("send() throws SendGridError on 4xx/5xx response", async () => {
    installFetchMock(() =>
      new Response('{"errors":[{"message":"Forbidden"}]}', {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const transport = new SendGridTransport({ apiKey: "SG.bad_key" });

    await expect(transport.send(baseMailOptions)).rejects.toMatchObject({
      name: "SendGridError",
      message: "SendGrid API error",
      statusCode: 403,
    });

    try {
      await transport.send(baseMailOptions);
    } catch (error) {
      expect(error).toBeInstanceOf(SendGridError);
      expect((error as SendGridError).apiError).toBe('{"errors":[{"message":"Forbidden"}]}');
    }
  });

  test("send() base64-encodes Uint8Array attachments in request body", async () => {
    const captured = installFetchMock(() =>
      new Response(null, { status: 202, headers: { "x-message-id": "sg-msg-3" } }),
    );

    const transport = new SendGridTransport({ apiKey: "SG.test_key" });
    await transport.send({
      ...baseMailOptions,
      attachments: [
        {
          filename: "hello.txt",
          content: attachmentBytes,
          contentType: "text/plain",
          contentId: "cid-hello",
          inline: true,
        },
      ],
    });

    const body = JSON.parse(String(captured[0]?.init.body));
    expect(body.attachments).toEqual([
      {
        filename: "hello.txt",
        type: "text/plain",
        content: expectedAttachmentBase64,
        content_id: "cid-hello",
        disposition: "inline",
      },
    ]);
    expect(body.attachments[0].content).toBe("aGVsbG8=");
  });
});

describe("PostmarkTransport", () => {
  test("send() builds the correct HTTP request", async () => {
    const captured = installFetchMock(() =>
      Response.json({ MessageID: "pm-msg-1", Message: "OK" }, { status: 200 }),
    );

    const transport = new PostmarkTransport({ serverToken: "pm-server-token" });
    await transport.send(baseMailOptions);

    expect(captured).toHaveLength(1);
    const { url, init } = captured[0] as CapturedRequest;

    expect(url).toBe("https://api.postmarkapp.com/email");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      "X-Postmark-Server-Token": "pm-server-token",
      "Content-Type": "application/json",
      Accept: "application/json",
    });

    const body = JSON.parse(String(init.body));
    expect(body.From).toBe("Sender <sender@example.com>");
    expect(body.To).toBe("recipient@example.com");
    expect(body.Subject).toBe("Test subject");
    expect(body.TextBody).toBe("Plain body");
    expect(body.HtmlBody).toBe("<p>HTML body</p>");
  });

  test("send() returns a normalized SendResult on 200 response", async () => {
    installFetchMock(() =>
      Response.json(
        { MessageID: "pm-msg-2", Message: "OK" },
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const transport = new PostmarkTransport({ serverToken: "pm-server-token" });
    const result = await transport.send(baseMailOptions);

    expect(result).toEqual({
      messageId: "pm-msg-2",
      accepted: ["recipient@example.com"],
      rejected: [],
      response: "OK",
      envelope: {
        from: "sender@example.com",
        to: ["recipient@example.com"],
      },
    });
  });

  test("send() throws PostmarkError on 4xx/5xx response", async () => {
    installFetchMock(() =>
      Response.json(
        { Message: "Invalid server token", ErrorCode: 10 },
        { status: 401, headers: { "Content-Type": "application/json" } },
      ),
    );

    const transport = new PostmarkTransport({ serverToken: "pm-bad-token" });

    await expect(transport.send(baseMailOptions)).rejects.toMatchObject({
      name: "PostmarkError",
      message: "Invalid server token",
      statusCode: 401,
    });

    try {
      await transport.send(baseMailOptions);
    } catch (error) {
      expect(error).toBeInstanceOf(PostmarkError);
      expect((error as PostmarkError).apiError).toEqual({
        Message: "Invalid server token",
        ErrorCode: 10,
      });
    }
  });

  test("send() base64-encodes Uint8Array attachments in request body", async () => {
    const captured = installFetchMock(() =>
      Response.json({ MessageID: "pm-msg-3", Message: "OK" }, { status: 200 }),
    );

    const transport = new PostmarkTransport({ serverToken: "pm-server-token" });
    await transport.send({
      ...baseMailOptions,
      attachments: [
        {
          filename: "hello.txt",
          content: attachmentBytes,
          contentType: "text/plain",
          contentId: "cid-hello",
        },
      ],
    });

    const body = JSON.parse(String(captured[0]?.init.body));
    expect(body.Attachments).toEqual([
      {
        Name: "hello.txt",
        Content: expectedAttachmentBase64,
        ContentType: "text/plain",
        ContentID: "cid-hello",
      },
    ]);
    expect(body.Attachments[0].Content).toBe("aGVsbG8=");
  });
});
