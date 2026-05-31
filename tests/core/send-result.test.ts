import { describe, expect, test } from "bun:test";
import type { SocketAdapter, TLSOptions } from "../../src/core/types.js";
import { ResendTransport } from "../../src/transports/resend.js";
import { SMTPTransport } from "../../src/transports/smtp.js";

class MockAdapter implements SocketAdapter {
  readonly commands: Uint8Array[] = [];
  private queue: Uint8Array[] = [];
  private readQueue: Uint8Array[][] = [];
  private readIndex = 0;
  _secure = false;
  _connected = false;

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

  async connect(_host: string, _port: number): Promise<void> {
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

describe("SendResult optional fields on single-send", () => {
  test("normal single-send leaves batchError and deduped undefined (SMTP + Resend)", async () => {
    const adapter = new MockAdapter();
    adapter.setResponses([
      "220 smtp.example.com ESMTP\r\n",
      "250-smtp.example.com\r\n250 AUTH PLAIN\r\n",
      "250 Sender OK\r\n",
      "250 Recipient OK\r\n",
      "354 End data with <CR><LF>.<CR><LF>\r\n",
      "250 Message accepted\r\n",
    ]);

    const smtp = await new SMTPTransport({
      host: "smtp.example.com",
      port: 25,
      secure: true,
      requireTLS: false,
      adapter,
    }).send({
      from: "sender@example.com",
      to: "recipient@example.com",
      subject: "Test",
      text: "Hello",
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      Response.json({ id: "re-1", message: "Email sent" }, { status: 200 })) as typeof fetch;

    try {
      const resend = await new ResendTransport({ apiKey: "re_test" }).send({
        from: "sender@example.com",
        to: "recipient@example.com",
        subject: "Test",
        text: "Hello",
      });

      expect(
        smtp.batchError === undefined &&
          smtp.deduped === undefined &&
          resend.batchError === undefined &&
          resend.deduped === undefined,
      ).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
