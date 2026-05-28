import { describe, expect, test } from "bun:test";
import { decodeUtf8 } from "../../src/core/base64.js";
import type { SocketAdapter, TLSOptions } from "../../src/core/types.js";
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

describe("SMTPTransport", () => {
  test("full send sequence with LOGIN auth", async () => {
    const adapter = new MockAdapter();
    adapter.setResponses([
      "220 smtp.example.com ESMTP\r\n",
      "250-smtp.example.com\r\n250 AUTH LOGIN PLAIN\r\n",
      "220 Ready to start TLS\r\n",
      "250-smtp.example.com\r\n250 AUTH LOGIN PLAIN\r\n",
      "334 VXNlcm5hbWU6\r\n",
      "334 UGFzc3dvcmQ6\r\n",
      "235 Authentication successful\r\n",
      "250 Sender OK\r\n",
      "250 Recipient OK\r\n",
      "354 End data with <CR><LF>.<CR><LF>\r\n",
      "250 Message accepted\r\n",
      "221 Bye\r\n",
    ]);

    const transport = new SMTPTransport({
      host: "smtp.example.com",
      port: 587,
      auth: { user: "user", pass: "pass", type: "LOGIN" },
      adapter,
    });

    const result = await transport.send({
      from: "sender@example.com",
      to: "recipient@example.com",
      subject: "Test",
      text: "Hello",
    });

    expect(result.accepted).toEqual(["recipient@example.com"]);
    expect(result.messageId).toMatch(/^<.+@sendx>$/);

    const dialog = adapter.commands.map((c) => decodeUtf8(c)).join("");
    expect(dialog).toContain("EHLO smtp.example.com");
    expect(dialog).toContain("STARTTLS");
    expect(dialog).toContain("AUTH LOGIN");
    expect(dialog).toContain("MAIL FROM:<sender@example.com>");
    expect(dialog).toContain("RCPT TO:<recipient@example.com>");
    expect(dialog).toContain("DATA");
    expect(dialog).toContain("QUIT");
  });
});
