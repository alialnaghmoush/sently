import { afterEach, describe, expect, test } from "bun:test";
import { encodeBase64 } from "../../src/core/base64.js";
import type { SocketAdapter, TLSOptions } from "../../src/core/types.js";
import {
  MAILPIT_DEFAULT_API_URL,
  MAILPIT_DEFAULT_HOST,
  MAILPIT_DEFAULT_PORT,
  MailpitError,
  MailpitTransport,
} from "../../src/transports/mailpit.js";

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

class MockAdapter implements SocketAdapter {
  readonly commands: Uint8Array[] = [];
  private readQueue: Uint8Array[][] = [];
  private readIndex = 0;
  _secure = false;
  _connected = false;
  connectHost = "";
  connectPort = 0;

  get secure(): boolean {
    return this._secure;
  }

  get connected(): boolean {
    return this._connected;
  }

  setResponses(responses: string[]) {
    this.readQueue = responses.map((r) => [new TextEncoder().encode(r)]);
    this.readIndex = 0;
  }

  async connect(host: string, port: number): Promise<void> {
    this.connectHost = host;
    this.connectPort = port;
    this._connected = true;
  }

  async startTLS(_options?: TLSOptions): Promise<void> {
    this._secure = true;
  }

  async write(data: Uint8Array): Promise<void> {
    this.commands.push(data);
  }

  async *read(): AsyncIterable<Uint8Array> {
    const chunks = this.readQueue[this.readIndex] ?? [];
    this.readIndex += 1;
    for (const chunk of chunks) {
      yield chunk;
    }
  }

  async close(): Promise<void> {
    this._connected = false;
  }
}

function plainSmtpResponses(): string[] {
  return [
    "220 mailpit ESMTP\r\n",
    "250-mailpit\r\n250 HELP\r\n",
    "250 Sender OK\r\n",
    "250 Recipient OK\r\n",
    "354 End data with <CR><LF>.<CR><LF>\r\n",
    "250 Message accepted\r\n",
    "221 Bye\r\n",
  ];
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("MailpitTransport", () => {
  test("exposes provider mailpit and local defaults", () => {
    const transport = new MailpitTransport();
    expect(transport.provider).toBe("mailpit");
    expect(transport.webUrl).toBe(MAILPIT_DEFAULT_API_URL);
    expect(MAILPIT_DEFAULT_HOST).toBe("localhost");
    expect(MAILPIT_DEFAULT_PORT).toBe(1025);
  });

  test("send() delivers via SMTP to localhost:1025 by default", async () => {
    const adapter = new MockAdapter();
    adapter.setResponses(plainSmtpResponses());

    const transport = new MailpitTransport({ adapter });
    const result = await transport.send({
      from: "dev@example.com",
      to: "you@example.com",
      subject: "Hello Mailpit",
      text: "Captured locally",
    });

    expect(adapter.connectHost).toBe("localhost");
    expect(adapter.connectPort).toBe(1025);
    expect(result.accepted).toContain("you@example.com");
    expect(result.messageId).toBeTruthy();
  });

  test("send() honors custom host/port", async () => {
    const adapter = new MockAdapter();
    adapter.setResponses(plainSmtpResponses());

    const transport = new MailpitTransport({
      host: "mailpit.internal",
      port: 2525,
      adapter,
    });
    await transport.send({
      from: "dev@example.com",
      to: "you@example.com",
      subject: "Custom",
      text: "ok",
    });

    expect(adapter.connectHost).toBe("mailpit.internal");
    expect(adapter.connectPort).toBe(2525);
  });

  test("verify() remaps provider to mailpit", async () => {
    const adapter = new MockAdapter();
    adapter.setResponses(["220 mailpit ESMTP\r\n", "250-mailpit\r\n250 HELP\r\n", "221 Bye\r\n"]);

    const transport = new MailpitTransport({ adapter });
    const result = await transport.verify();

    expect(result.ok).toBe(true);
    expect(result.provider).toBe("mailpit");
  });

  test("messages() calls Mailpit list API", async () => {
    const captured = installFetchMock(() =>
      Response.json({
        total: 1,
        unread: 1,
        count: 1,
        messages: [
          {
            ID: "abc",
            MessageID: "<msg@local>",
            From: { Name: "", Address: "dev@example.com" },
            To: [{ Name: "", Address: "you@example.com" }],
            Subject: "Hello",
            Created: "2026-08-01T12:00:00Z",
            Attachments: 0,
            Read: false,
            Snippet: "Captured",
          },
        ],
      }),
    );

    const transport = new MailpitTransport();
    const list = await transport.messages({ limit: 10, start: 0 });

    expect(captured[0]?.url).toBe("http://localhost:8025/api/v1/messages?limit=10&start=0");
    expect(list.total).toBe(1);
    expect(list.messages[0]?.Subject).toBe("Hello");
  });

  test("getMessage() fetches a full message", async () => {
    const captured = installFetchMock(() =>
      Response.json({
        ID: "abc",
        MessageID: "<msg@local>",
        From: { Name: "", Address: "dev@example.com" },
        To: [{ Name: "", Address: "you@example.com" }],
        Subject: "Hello",
        Text: "Captured locally",
        HTML: "<p>Captured</p>",
        Date: "2026-08-01T12:00:00Z",
        Attachments: 0,
      }),
    );

    const transport = new MailpitTransport({ apiUrl: "http://127.0.0.1:8025/" });
    const message = await transport.getMessage("abc");

    expect(captured[0]?.url).toBe("http://127.0.0.1:8025/api/v1/message/abc");
    expect(message.Text).toBe("Captured locally");
  });

  test("getMessage() rejects empty id", async () => {
    const transport = new MailpitTransport();
    await expect(transport.getMessage("")).rejects.toBeInstanceOf(MailpitError);
  });

  test("deleteAll() sends empty IDs to clear inbox", async () => {
    const captured = installFetchMock(() => new Response(null, { status: 200 }));

    const transport = new MailpitTransport();
    await transport.deleteAll();

    expect(captured[0]?.url).toBe("http://localhost:8025/api/v1/messages");
    expect(captured[0]?.init.method).toBe("DELETE");
    expect(JSON.parse(String(captured[0]?.init.body))).toEqual({ IDs: [] });
  });

  test("deleteMessages() sends specific IDs", async () => {
    const captured = installFetchMock(() => new Response(null, { status: 200 }));

    const transport = new MailpitTransport();
    await transport.deleteMessages(["a", "b"]);

    expect(JSON.parse(String(captured[0]?.init.body))).toEqual({ IDs: ["a", "b"] });
  });

  test("API helpers send Basic auth when apiAuth is set", async () => {
    const captured = installFetchMock(() =>
      Response.json({ total: 0, unread: 0, count: 0, messages: [] }),
    );

    const transport = new MailpitTransport({
      apiAuth: { user: "admin", pass: "secret" },
    });
    await transport.messages();

    const headers = captured[0]?.init.headers as Record<string, string>;
    const expected = `Basic ${encodeBase64("admin:secret").replace(/\r\n/g, "")}`;
    expect(headers.Authorization).toBe(expected);
  });

  test("messages() throws MailpitError on 4xx", async () => {
    installFetchMock(() => new Response("unauthorized", { status: 401 }));

    const transport = new MailpitTransport();
    await expect(transport.messages()).rejects.toMatchObject({
      name: "MailpitError",
      statusCode: 401,
      sentlyCode: "BAD_REQUEST",
    });
  });
});
