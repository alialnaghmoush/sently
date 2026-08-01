import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { encodeBase64Url } from "../../src/core/base64.js";
import type { PushOptions } from "../../src/core/push-types.js";
import { WebPushError, WebPushTransport } from "../../src/transports/webpush.js";

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

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

let vapidPublicKey = "";
let vapidPrivateKey = "";
let subscriptionPublicKey = "";
let subscriptionAuth = "";

beforeAll(async () => {
  const vapid = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify",
  ]);
  const vapidPub = new Uint8Array(await crypto.subtle.exportKey("raw", vapid.publicKey));
  const vapidJwk = (await crypto.subtle.exportKey("jwk", vapid.privateKey)) as JsonWebKey;
  vapidPublicKey = encodeBase64Url(vapidPub);
  vapidPrivateKey = vapidJwk.d ?? "";

  const sub = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
    "deriveBits",
  ]);
  const subPub = new Uint8Array(await crypto.subtle.exportKey("raw", sub.publicKey));
  subscriptionPublicKey = encodeBase64Url(subPub);
  subscriptionAuth = encodeBase64Url(crypto.getRandomValues(new Uint8Array(16)));
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function baseOptions(): PushOptions {
  return {
    subscription: {
      endpoint: "https://fcm.googleapis.com/fcm/send/test-endpoint",
      keys: {
        p256dh: subscriptionPublicKey,
        auth: subscriptionAuth,
      },
    },
    title: "Hello",
    body: "World",
    data: { n: 1 },
  };
}

describe("WebPushTransport", () => {
  test("send() sets VAPID Authorization and aes128gcm headers", async () => {
    const captured = installFetchMock(() => new Response(null, { status: 201 }));

    const transport = new WebPushTransport({
      vapidPublicKey,
      vapidPrivateKey,
      subject: "mailto:you@example.com",
    });

    const result = await transport.send(baseOptions());

    expect(captured).toHaveLength(1);
    const { url, init } = captured[0] as CapturedRequest;
    expect(url).toBe("https://fcm.googleapis.com/fcm/send/test-endpoint");
    expect(init.method).toBe("POST");

    const headers = init.headers as Record<string, string>;
    expect(headers["Content-Encoding"]).toBe("aes128gcm");
    expect(headers.TTL).toBe("2419200");
    expect(headers["Content-Type"]).toBe("application/octet-stream");
    expect(headers.Authorization).toMatch(
      new RegExp(`^vapid t=[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+, k=${vapidPublicKey}$`),
    );

    const body = new Uint8Array(init.body as ArrayBuffer);
    expect(body.length).toBeGreaterThan(86);

    expect(result.status).toBe("accepted");
    expect(result.response).toBe("201");
    expect(result.provider).toBe("webpush");
    expect(result.messageId.length).toBeGreaterThan(0);
  });

  test("send() respects custom ttl", async () => {
    const captured = installFetchMock(() => new Response(null, { status: 202 }));

    const transport = new WebPushTransport({
      vapidPublicKey,
      vapidPrivateKey,
      subject: "https://example.com",
    });

    await transport.send({ ...baseOptions(), ttl: 60 });
    expect((captured[0]?.init.headers as Record<string, string>).TTL).toBe("60");
  });

  test("send() throws WebPushError on 404/410/401", async () => {
    const transport = new WebPushTransport({
      vapidPublicKey,
      vapidPrivateKey,
      subject: "mailto:you@example.com",
    });

    for (const status of [404, 410, 401]) {
      installFetchMock(() => new Response("gone", { status }));
      await expect(transport.send(baseOptions())).rejects.toMatchObject({
        name: "WebPushError",
        statusCode: status,
      });
      await expect(transport.send(baseOptions())).rejects.toBeInstanceOf(WebPushError);
    }
  });

  test("encrypted body starts with 16-byte salt and includes keyid length 65", async () => {
    const captured = installFetchMock(() => new Response(null, { status: 201 }));

    const transport = new WebPushTransport({
      vapidPublicKey,
      vapidPrivateKey,
      subject: "mailto:you@example.com",
    });

    await transport.send(baseOptions());

    const body = new Uint8Array(captured[0]?.init.body as ArrayBuffer);
    // salt(16) + rs(4) + idlen(1) + keyid(65) + ciphertext
    expect(body[20]).toBe(65);
    expect(body.length).toBeGreaterThan(16 + 4 + 1 + 65);
    expect(toArrayBuffer(body).byteLength).toBe(body.length);
  });

  test("send() rejects SSRF targets before fetch", async () => {
    let fetched = false;
    installFetchMock(() => {
      fetched = true;
      return new Response(null, { status: 201 });
    });

    const transport = new WebPushTransport({
      vapidPublicKey,
      vapidPrivateKey,
      subject: "mailto:you@example.com",
    });

    await expect(
      transport.send({
        ...baseOptions(),
        subscription: {
          ...baseOptions().subscription,
          endpoint: "http://169.254.169.254/latest/meta-data/",
        },
      }),
    ).rejects.toMatchObject({ name: "WebPushError", statusCode: 400 });

    await expect(
      transport.send({
        ...baseOptions(),
        subscription: {
          ...baseOptions().subscription,
          endpoint: "https://evil.example.com/push",
        },
      }),
    ).rejects.toMatchObject({ name: "WebPushError", statusCode: 400 });

    expect(fetched).toBe(false);
  });

  test("send() does not follow redirects", async () => {
    installFetchMock(
      () =>
        new Response(null, {
          status: 302,
          headers: { Location: "http://127.0.0.1/admin" },
        }),
    );

    const transport = new WebPushTransport({
      vapidPublicKey,
      vapidPrivateKey,
      subject: "mailto:you@example.com",
    });

    await expect(transport.send(baseOptions())).rejects.toMatchObject({
      name: "WebPushError",
      statusCode: 302,
    });
  });

  test("send() rejects oversized encrypted payloads", async () => {
    installFetchMock(() => new Response(null, { status: 201 }));

    const transport = new WebPushTransport({
      vapidPublicKey,
      vapidPrivateKey,
      subject: "mailto:you@example.com",
    });

    await expect(
      transport.send({
        ...baseOptions(),
        body: "x".repeat(5000),
      }),
    ).rejects.toMatchObject({ name: "WebPushError", statusCode: 413 });
  });

  test("send() allows extra hosts via allowedEndpointHosts", async () => {
    const captured = installFetchMock(() => new Response(null, { status: 201 }));

    const transport = new WebPushTransport({
      vapidPublicKey,
      vapidPrivateKey,
      subject: "mailto:you@example.com",
      allowedEndpointHosts: ["push.myrelay.example"],
    });

    await transport.send({
      ...baseOptions(),
      subscription: {
        ...baseOptions().subscription,
        endpoint: "https://push.myrelay.example/s/token",
      },
    });

    expect(captured[0]?.url).toBe("https://push.myrelay.example/s/token");
    expect(captured[0]?.init.redirect).toBe("manual");
  });
});
