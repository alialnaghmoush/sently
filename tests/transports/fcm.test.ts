import { afterEach, describe, expect, test } from "bun:test";
import { FcmError, FcmTransport } from "../../src/transports/fcm.js";

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

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("FcmTransport", () => {
  test("send() posts HTTP v1 message with Bearer token", async () => {
    const captured = installFetchMock(() =>
      Response.json({
        name: "projects/demo/messages/0:1234567890",
      }),
    );

    const transport = new FcmTransport({
      projectId: "demo",
      clientEmail: "firebase-adminsdk@demo.iam.gserviceaccount.com",
      privateKey: "unused-when-override",
      getAccessToken: async () => "ya29.test-token",
    });

    const result = await transport.send({
      token: "device-token-abc",
      title: "Hello",
      body: "World",
      data: { orderId: 42 },
    });

    expect(captured).toHaveLength(1);
    expect(captured[0]?.url).toBe(
      "https://fcm.googleapis.com/v1/projects/demo/messages:send",
    );
    expect(captured[0]?.init.headers).toEqual({
      Authorization: "Bearer ya29.test-token",
      "Content-Type": "application/json",
    });

    const body = JSON.parse(String(captured[0]?.init.body));
    expect(body).toEqual({
      message: {
        token: "device-token-abc",
        notification: { title: "Hello", body: "World" },
        data: { orderId: "42" },
      },
    });

    expect(result).toMatchObject({
      messageId: "0:1234567890",
      status: "accepted",
      provider: "fcm",
    });
  });

  test("send() rejects Web Push options", async () => {
    const transport = new FcmTransport({
      projectId: "demo",
      clientEmail: "firebase-adminsdk@demo.iam.gserviceaccount.com",
      privateKey: "unused",
      getAccessToken: async () => "token",
    });

    await expect(
      transport.send({
        subscription: {
          endpoint: "https://fcm.googleapis.com/fcm/send/abc",
          keys: { p256dh: "x", auth: "y" },
        },
        title: "Hello",
        body: "World",
      }),
    ).rejects.toBeInstanceOf(FcmError);
  });

  test("send() throws FcmError on API failure", async () => {
    installFetchMock(() =>
      Response.json(
        {
          error: { message: "Requested entity was not found.", code: 404, status: "NOT_FOUND" },
        },
        { status: 404 },
      ),
    );

    const transport = new FcmTransport({
      projectId: "demo",
      clientEmail: "firebase-adminsdk@demo.iam.gserviceaccount.com",
      privateKey: "unused",
      getAccessToken: async () => "token",
    });

    await expect(
      transport.send({ token: "bad", title: "Hi", body: "There" }),
    ).rejects.toBeInstanceOf(FcmError);
  });
});
