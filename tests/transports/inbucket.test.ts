import { afterEach, describe, expect, test } from "bun:test";
import type { SocketAdapter, TLSOptions } from "../../src/core/types.js";
import {
  INBUCKET_DEFAULT_API_URL,
  INBUCKET_DEFAULT_HOST,
  INBUCKET_DEFAULT_PORT,
  InbucketError,
  InbucketTransport,
} from "../../src/transports/inbucket.js";

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
    "220 inbucket ESMTP\r\n",
    "250-inbucket\r\n250 HELP\r\n",
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

describe("InbucketTransport", () => {
  test("exposes provider inbucket and local defaults", () => {
    const transport = new InbucketTransport();
    expect(transport.provider).toBe("inbucket");
    expect(transport.webUrl).toBe(INBUCKET_DEFAULT_API_URL);
    expect(INBUCKET_DEFAULT_HOST).toBe("localhost");
    expect(INBUCKET_DEFAULT_PORT).toBe(2500);
  });

  test("send() delivers via SMTP to localhost:2500 by default", async () => {
    const adapter = new MockAdapter();
    adapter.setResponses(plainSmtpResponses());

    const transport = new InbucketTransport({ adapter });
    const result = await transport.send({
      from: "dev@example.com",
      to: "you@example.com",
      subject: "Hello Inbucket",
      text: "Captured locally",
    });

    expect(adapter.connectHost).toBe("localhost");
    expect(adapter.connectPort).toBe(2500);
    expect(result.accepted).toContain("you@example.com");
    expect(result.messageId).toBeTruthy();
  });

  test("send() honors custom host/port", async () => {
    const adapter = new MockAdapter();
    adapter.setResponses(plainSmtpResponses());

    const transport = new InbucketTransport({
      host: "inbucket.internal",
      port: 2525,
      adapter,
    });
    await transport.send({
      from: "dev@example.com",
      to: "you@example.com",
      subject: "Custom",
      text: "ok",
    });

    expect(adapter.connectHost).toBe("inbucket.internal");
    expect(adapter.connectPort).toBe(2525);
  });

  test("verify() remaps provider to inbucket", async () => {
    const adapter = new MockAdapter();
    adapter.setResponses([
      "220 inbucket ESMTP\r\n",
      "250-inbucket\r\n250 HELP\r\n",
      "221 Bye\r\n",
    ]);

    const transport = new InbucketTransport({ adapter });
    const result = await transport.verify();

    expect(result.ok).toBe(true);
    expect(result.provider).toBe("inbucket");
  });

  test("mailboxForAddress() uses local naming by default", () => {
    const transport = new InbucketTransport();
    expect(transport.mailboxForAddress("You@Example.com")).toBe("you");
  });

  test("mailboxForAddress() supports full and domain naming", () => {
    expect(new InbucketTransport({ mailboxNaming: "full" }).mailboxForAddress("You@Example.com")).toBe(
      "you@example.com",
    );
    expect(
      new InbucketTransport({ mailboxNaming: "domain" }).mailboxForAddress("You@Example.com"),
    ).toBe("example.com");
  });

  test("mailboxForAddress() rejects invalid addresses", () => {
    const transport = new InbucketTransport();
    expect(() => transport.mailboxForAddress("")).toThrow(InbucketError);
    expect(() => transport.mailboxForAddress("nodomain")).toThrow(InbucketError);
  });

  test("listMailbox() calls Inbucket mailbox list API", async () => {
    const captured = installFetchMock(() =>
      Response.json([
        {
          mailbox: "you",
          id: "20260802T120000-0000",
          from: "dev@example.com",
          to: ["you@example.com"],
          subject: "Hello",
          date: "2026-08-02T12:00:00Z",
          "posix-millis": 1754136000000,
          size: 120,
          seen: false,
        },
      ]),
    );

    const transport = new InbucketTransport();
    const list = await transport.listMailbox("you");

    expect(captured[0]?.url).toBe("http://localhost:9000/api/v1/mailbox/you");
    expect(list[0]?.subject).toBe("Hello");
  });

  test("getMessage() fetches a full message", async () => {
    const captured = installFetchMock(() =>
      Response.json({
        mailbox: "you",
        id: "abc",
        from: "dev@example.com",
        to: ["you@example.com"],
        subject: "Hello",
        date: "2026-08-02T12:00:00Z",
        "posix-millis": 1754136000000,
        size: 120,
        seen: false,
        body: { text: "Captured locally", html: "<p>Captured</p>" },
        header: { Subject: ["Hello"] },
        attachments: [],
      }),
    );

    const transport = new InbucketTransport({ apiUrl: "http://127.0.0.1:9000/" });
    const message = await transport.getMessage("you", "abc");

    expect(captured[0]?.url).toBe("http://127.0.0.1:9000/api/v1/mailbox/you/abc");
    expect(message.body.text).toBe("Captured locally");
  });

  test("getMessage() rejects empty mailbox or id", async () => {
    const transport = new InbucketTransport();
    await expect(transport.getMessage("", "abc")).rejects.toBeInstanceOf(InbucketError);
    await expect(transport.getMessage("you", "")).rejects.toBeInstanceOf(InbucketError);
  });

  test("getSource() returns raw text/plain source", async () => {
    const captured = installFetchMock(
      () => new Response("From: dev@example.com\r\n\r\nHello", { status: 200 }),
    );

    const transport = new InbucketTransport();
    const source = await transport.getSource("you", "abc");

    expect(captured[0]?.url).toBe("http://localhost:9000/api/v1/mailbox/you/abc/source");
    expect(source).toContain("From: dev@example.com");
  });

  test("markSeen() PATCHes seen:true", async () => {
    const captured = installFetchMock(() => Response.json("OK"));

    const transport = new InbucketTransport();
    await transport.markSeen("you", "abc");

    expect(captured[0]?.url).toBe("http://localhost:9000/api/v1/mailbox/you/abc");
    expect(captured[0]?.init.method).toBe("PATCH");
    expect(JSON.parse(String(captured[0]?.init.body))).toEqual({ seen: true });
  });

  test("deleteMessage() DELETEs one message", async () => {
    const captured = installFetchMock(() => Response.json("OK"));

    const transport = new InbucketTransport();
    await transport.deleteMessage("you", "abc");

    expect(captured[0]?.url).toBe("http://localhost:9000/api/v1/mailbox/you/abc");
    expect(captured[0]?.init.method).toBe("DELETE");
  });

  test("purgeMailbox() DELETEs the mailbox", async () => {
    const captured = installFetchMock(() => Response.json("OK"));

    const transport = new InbucketTransport();
    await transport.purgeMailbox("you");

    expect(captured[0]?.url).toBe("http://localhost:9000/api/v1/mailbox/you");
    expect(captured[0]?.init.method).toBe("DELETE");
  });

  test("listMailbox() encodes mailbox names", async () => {
    const captured = installFetchMock(() => Response.json([]));

    const transport = new InbucketTransport();
    await transport.listMailbox("user/name");

    expect(captured[0]?.url).toBe("http://localhost:9000/api/v1/mailbox/user%2Fname");
  });

  test("listMailbox() throws InbucketError on 4xx", async () => {
    installFetchMock(() => new Response("not found", { status: 404 }));

    const transport = new InbucketTransport();
    await expect(transport.listMailbox("missing")).rejects.toMatchObject({
      name: "InbucketError",
      statusCode: 404,
    });
  });
});
