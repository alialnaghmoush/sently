import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { decodeBase64Url, encodeBase64Url } from "../../src/core/base64.js";
import type { PushOptions } from "../../src/core/push-types.js";
import {
  generateVapidKeys,
  WebPushError,
  WebPushTransport,
} from "../../src/transports/webpush.js";

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
  test("constructor accepts valid mailto: and https: subjects", () => {
    expect(
      () =>
        new WebPushTransport({
          vapidPublicKey,
          vapidPrivateKey,
          subject: "mailto:you@example.com",
        }),
    ).not.toThrow();

    expect(
      () =>
        new WebPushTransport({
          vapidPublicKey,
          vapidPrivateKey,
          subject: "https://example.com/contact",
        }),
    ).not.toThrow();
  });

  test("constructor rejects invalid subject synchronously", () => {
    for (const subject of ["@oke.local", "", "you@example.com", "http://example.com"]) {
      let thrown: unknown;
      try {
        new WebPushTransport({
          vapidPublicKey,
          vapidPrivateKey,
          subject,
        });
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(WebPushError);
      expect((thrown as WebPushError).message).toContain("WebPushConfig.subject");
      expect((thrown as WebPushError).message).toContain(JSON.stringify(subject));
      expect((thrown as WebPushError).statusCode).toBe(400);
    }
  });

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

  test("send() sets Urgency and Topic headers", async () => {
    const captured = installFetchMock(() => new Response(null, { status: 201 }));

    const transport = new WebPushTransport({
      vapidPublicKey,
      vapidPrivateKey,
      subject: "mailto:you@example.com",
    });

    await transport.send({
      ...baseOptions(),
      urgency: "high",
      topic: "order-42",
    });

    const headers = captured[0]?.init.headers as Record<string, string>;
    expect(headers.Urgency).toBe("high");
    expect(headers.Topic).toBe("order-42");
  });

  test("send() rejects invalid urgency and topic", async () => {
    const transport = new WebPushTransport({
      vapidPublicKey,
      vapidPrivateKey,
      subject: "mailto:you@example.com",
    });

    await expect(
      transport.send({ ...baseOptions(), urgency: "urgent" as "high" }),
    ).rejects.toMatchObject({ name: "WebPushError", statusCode: 400 });

    await expect(
      transport.send({ ...baseOptions(), topic: "has space" }),
    ).rejects.toMatchObject({ name: "WebPushError", statusCode: 400 });

    await expect(
      transport.send({ ...baseOptions(), topic: "x".repeat(33) }),
    ).rejects.toMatchObject({ name: "WebPushError", statusCode: 400 });
  });

  test("send() accepts rich notification fields", async () => {
    installFetchMock(() => new Response(null, { status: 201 }));

    const transport = new WebPushTransport({
      vapidPublicKey,
      vapidPrivateKey,
      subject: "mailto:you@example.com",
    });

    const result = await transport.send({
      ...baseOptions(),
      icon: "https://example.com/icon.png",
      badge: "https://example.com/badge.png",
      image: "https://example.com/hero.png",
      tag: "report-ready",
      requireInteraction: true,
      renotify: true,
      actions: [{ action: "open", title: "Open", icon: "https://example.com/open.png" }],
    });

    expect(result.status).toBe("accepted");
  });

  test("send() supports silent and data-only payloads", async () => {
    installFetchMock(() => new Response(null, { status: 201 }));

    const transport = new WebPushTransport({
      vapidPublicKey,
      vapidPrivateKey,
      subject: "mailto:you@example.com",
    });

    const { subscription } = baseOptions();

    await expect(
      transport.send({
        subscription,
        silent: true,
        data: { sync: true },
      }),
    ).resolves.toMatchObject({ status: "accepted", provider: "webpush" });

    await expect(
      transport.send({
        subscription,
        data: { ping: 1 },
      }),
    ).resolves.toMatchObject({ status: "accepted" });
  });

  test("send() rejects silent without data and partial visible fields", async () => {
    const transport = new WebPushTransport({
      vapidPublicKey,
      vapidPrivateKey,
      subject: "mailto:you@example.com",
    });

    const { subscription } = baseOptions();

    await expect(
      transport.send({ subscription, silent: true }),
    ).rejects.toMatchObject({ name: "WebPushError", statusCode: 400 });

    await expect(
      transport.send({ subscription, title: "Only title" }),
    ).rejects.toMatchObject({ name: "WebPushError", statusCode: 400 });

    await expect(transport.send({ subscription })).rejects.toMatchObject({
      name: "WebPushError",
      statusCode: 400,
    });
  });

  test("generateVapidKeys() returns raw web-push key lengths", async () => {
    const keys = await generateVapidKeys();
    const pub = decodeBase64Url(keys.publicKey);
    const priv = decodeBase64Url(keys.privateKey);
    expect(pub).toHaveLength(65);
    expect(pub[0]).toBe(0x04);
    expect(priv).toHaveLength(32);

    expect(
      () =>
        new WebPushTransport({
          vapidPublicKey: keys.publicKey,
          vapidPrivateKey: keys.privateKey,
          subject: "mailto:you@example.com",
        }),
    ).not.toThrow();
  });
});
