import { afterEach, describe, expect, test } from "bun:test";
import type { MailOptions } from "../../src/core/types.js";
import {
  HOSTINGER_API_BASE_URL,
  HOSTINGER_SMTP_HOST,
  HOSTINGER_SMTP_PORT_SSL,
  HOSTINGER_SMTP_PORT_STARTTLS,
  HostingerError,
  HostingerTransport,
  hostingerSmtpConfig,
} from "../../src/transports/hostinger.js";

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

const meResponse = {
  data: {
    orderResourceId: "ORD123",
    mailboxes: [
      { resourceId: "AC1a2b3c4d5e6f7g", address: "sender@example.com" },
      { resourceId: "AC9z8y7x6w5v4u3t", address: "other@example.com" },
    ],
  },
};

const config = { token: "hst_test", mailbox: "AC1a2b3c4d5e6f7g" };

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("HostingerTransport", () => {
  test("send() posts to the mailbox send endpoint with Bearer auth", async () => {
    const captured = installFetchMock(() => new Response(null, { status: 204 }));

    const transport = new HostingerTransport(config);
    await transport.send(baseMailOptions);

    expect(captured).toHaveLength(1);
    const { url, init } = captured[0] as CapturedRequest;
    expect(url).toBe(
      "https://api.mail.hostinger.com/api/v1/mailboxes/AC1a2b3c4d5e6f7g/send",
    );
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer hst_test");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  test("send() maps to, displayName, cc, bcc, subject, text, and html", async () => {
    const captured = installFetchMock(() => new Response(null, { status: 204 }));

    const transport = new HostingerTransport(config);
    await transport.send({
      ...baseMailOptions,
      cc: "copy@example.com",
      bcc: "hidden@example.com",
    });

    const body = JSON.parse(captured[0]?.init.body as string) as Record<string, unknown>;
    expect(body.to).toEqual(["recipient@example.com"]);
    expect(body.displayName).toBe("Sender");
    expect(body.cc).toEqual(["copy@example.com"]);
    expect(body.bcc).toEqual(["hidden@example.com"]);
    expect(body.subject).toBe("Test subject");
    expect(body.text).toBe("Plain body");
    expect(body.html).toBe("<p>HTML body</p>");
  });

  test("send() omits displayName when the sender has no name", async () => {
    const captured = installFetchMock(() => new Response(null, { status: 204 }));

    const transport = new HostingerTransport(config);
    await transport.send({ ...baseMailOptions, from: "sender@example.com" });

    const body = JSON.parse(captured[0]?.init.body as string) as Record<string, unknown>;
    expect("displayName" in body).toBe(false);
  });

  test("send() base64-encodes attachments with contentType and cid", async () => {
    const captured = installFetchMock(() => new Response(null, { status: 204 }));

    const transport = new HostingerTransport(config);
    await transport.send({
      ...baseMailOptions,
      attachments: [
        {
          filename: "hello.txt",
          content: new Uint8Array([104, 101, 108, 108, 111]),
          contentType: "text/plain",
        },
        {
          filename: "logo.png",
          content: "png-bytes",
          contentType: "image/png",
          contentId: "<logo>",
          inline: true,
        },
      ],
    });

    const body = JSON.parse(captured[0]?.init.body as string) as {
      attachments: Array<Record<string, unknown>>;
    };
    expect(body.attachments).toHaveLength(2);
    expect(body.attachments[0]).toEqual({
      filename: "hello.txt",
      content: "aGVsbG8=",
      contentType: "text/plain",
    });
    expect(body.attachments[1]).toEqual({
      filename: "logo.png",
      content: "cG5nLWJ5dGVz",
      contentType: "image/png",
      cid: "logo",
    });
  });

  test("send() returns a normalized SendResult on 204", async () => {
    installFetchMock(() => new Response(null, { status: 204 }));

    const transport = new HostingerTransport(config);
    const result = await transport.send({
      ...baseMailOptions,
      cc: "copy@example.com",
      messageId: "<msg@example.com>",
    });

    expect(result).toEqual({
      messageId: "<msg@example.com>",
      accepted: ["recipient@example.com"],
      rejected: [],
      response: "Message sent and saved to the Sent folder",
      envelope: {
        from: "sender@example.com",
        to: ["recipient@example.com", "copy@example.com"],
      },
    });
  });

  test("send() throws HostingerError with the API error envelope on 422", async () => {
    installFetchMock(() =>
      Response.json(
        { error: "Request payload failed validation", code: "VALIDATION_FAILED", params: { to: ["required"] } },
        { status: 422 },
      ),
    );

    const transport = new HostingerTransport(config);

    await expect(transport.send(baseMailOptions)).rejects.toMatchObject({
      name: "HostingerError",
      statusCode: 422,
      message: "Request payload failed validation",
    });
    await expect(transport.send(baseMailOptions)).rejects.toBeInstanceOf(HostingerError);
  });

  test("send() throws HostingerError on 403 without an envelope", async () => {
    installFetchMock(() => new Response("Forbidden", { status: 403 }));

    const transport = new HostingerTransport(config);

    await expect(transport.send(baseMailOptions)).rejects.toMatchObject({
      name: "HostingerError",
      statusCode: 403,
      message: "Hostinger API error (HTTP 403)",
    });
  });

  test("send() uses a custom baseUrl when provided", async () => {
    const captured = installFetchMock(() => new Response(null, { status: 204 }));

    const transport = new HostingerTransport({ ...config, baseUrl: "https://mail.example.test" });
    await transport.send(baseMailOptions);

    expect(captured[0]?.url).toBe(
      "https://mail.example.test/api/v1/mailboxes/AC1a2b3c4d5e6f7g/send",
    );
  });

  test("listMailboxes() returns the mailboxes in token scope", async () => {
    installFetchMock(() => Response.json(meResponse, { status: 200 }));

    const transport = new HostingerTransport(config);
    const mailboxes = await transport.listMailboxes();

    expect(mailboxes).toEqual(meResponse.data.mailboxes);
  });

  test("listMailboxes() throws HostingerError on 401", async () => {
    installFetchMock(() =>
      Response.json({ error: "Missing or invalid credentials", code: "UNAUTHORIZED" }, { status: 401 }),
    );

    const transport = new HostingerTransport({ ...config, token: "bad" });

    await expect(transport.listMailboxes()).rejects.toMatchObject({
      name: "HostingerError",
      statusCode: 401,
      message: "Missing or invalid credentials",
    });
  });

  test("verify() returns ok true when the configured mailbox is in scope", async () => {
    installFetchMock(() => Response.json(meResponse, { status: 200 }));

    const transport = new HostingerTransport(config);
    const result = await transport.verify();

    expect(result.ok).toBe(true);
    expect(result.provider).toBe("hostinger");
    expect(result.message).toBe("API token is valid — sending as sender@example.com");
  });

  test("verify() returns ok false when the mailbox is out of token scope", async () => {
    installFetchMock(() => Response.json(meResponse, { status: 200 }));

    const transport = new HostingerTransport({ ...config, mailbox: "AC000notinscope" });
    const result = await transport.verify();

    expect(result.ok).toBe(false);
    expect(result.provider).toBe("hostinger");
    expect(result.message).toBe('Mailbox "AC000notinscope" is not in this token\'s scope');
  });

  test("verify() returns ok false on 401 without throwing", async () => {
    installFetchMock(() =>
      Response.json({ error: "Missing or invalid credentials", code: "UNAUTHORIZED" }, { status: 401 }),
    );

    const transport = new HostingerTransport({ ...config, token: "bad" });
    const result = await transport.verify();

    expect(result.ok).toBe(false);
    expect(result.provider).toBe("hostinger");
    expect(result.message).toBe("Missing or invalid credentials");
  });

  test("verify() returns ok false on network failure without throwing", async () => {
    globalThis.fetch = (async () => {
      throw new Error("connection refused");
    }) as typeof fetch;

    const transport = new HostingerTransport(config);
    const result = await transport.verify();

    expect(result.ok).toBe(false);
    expect(result.provider).toBe("hostinger");
    expect(result.message).toBe("connection refused");
  });

  test("sendReply() posts inReplyTo folder + uid", async () => {
    const captured = installFetchMock(() => new Response(null, { status: 204 }));

    const transport = new HostingerTransport(config);
    await transport.sendReply(baseMailOptions, { folder: "INBOX", uid: 42 });

    const body = JSON.parse(captured[0]?.init.body as string) as Record<string, unknown>;
    expect(body.inReplyTo).toEqual({ folder: "INBOX", uid: 42 });
    expect("forwardOf" in body).toBe(false);
  });

  test("sendForward() posts forwardOf folder + uid", async () => {
    const captured = installFetchMock(() => new Response(null, { status: 204 }));

    const transport = new HostingerTransport(config);
    await transport.sendForward(baseMailOptions, { folder: "INBOX", uid: 7 });

    const body = JSON.parse(captured[0]?.init.body as string) as Record<string, unknown>;
    expect(body.forwardOf).toEqual({ folder: "INBOX", uid: 7 });
    expect("inReplyTo" in body).toBe(false);
  });

  test("defaults to the Hostinger Mail API base URL constant", () => {
    expect(HOSTINGER_API_BASE_URL).toBe("https://api.mail.hostinger.com");
  });
});

describe("hostingerSmtpConfig", () => {
  test("defaults to smtp.hostinger.com:465 with secure TLS", () => {
    expect(
      hostingerSmtpConfig({
        user: "you@yourdomain.com",
        pass: "secret",
      }),
    ).toEqual({
      host: HOSTINGER_SMTP_HOST,
      port: HOSTINGER_SMTP_PORT_SSL,
      secure: true,
      auth: { user: "you@yourdomain.com", pass: "secret" },
    });
  });

  test("port 587 enables STARTTLS (secure false)", () => {
    expect(
      hostingerSmtpConfig({
        user: "you@yourdomain.com",
        pass: "secret",
        port: HOSTINGER_SMTP_PORT_STARTTLS,
      }),
    ).toEqual({
      host: HOSTINGER_SMTP_HOST,
      port: 587,
      secure: false,
      auth: { user: "you@yourdomain.com", pass: "secret" },
    });
  });

  test("forwards pool options when set", () => {
    expect(
      hostingerSmtpConfig({
        user: "you@yourdomain.com",
        pass: "secret",
        pool: true,
        maxConnections: 3,
      }),
    ).toMatchObject({
      pool: true,
      maxConnections: 3,
    });
  });
});
