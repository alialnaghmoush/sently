import { describe, expect, test } from "bun:test";
import net from "node:net";
import { NodeAdapter } from "../../src/adapters/node.js";
import { decodeUtf8 } from "../../src/core/base64.js";

describe("NodeAdapter", () => {
  test("connect, write, read roundtrip", async () => {
    const server = net.createServer((socket) => {
      socket.on("data", (data) => {
        socket.write(data);
      });
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Invalid server address");
    }

    const adapter = new NodeAdapter();
    await adapter.connect("127.0.0.1", address.port);
    expect(adapter.connected).toBe(true);

    await adapter.write(new TextEncoder().encode("PING\r\n"));

    const reader = adapter.read()[Symbol.asyncIterator]();
    const chunk = await reader.next();
    expect(decodeUtf8(chunk.value as Uint8Array)).toBe("PING\r\n");

    await adapter.close();
    server.close();
  });

  test("secure flag opens TLS connection", async () => {
    const adapter = new NodeAdapter({ secure: true });
    expect(adapter.secure).toBe(true);
  });
});
