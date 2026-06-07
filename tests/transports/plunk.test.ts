import { afterEach, describe, expect, test } from "bun:test";
import type { MailOptions } from "../../src/core/types.js";
import { PlunkError, PlunkTransport } from "../../src/transports/plunk.js";

const originalFetch = globalThis.fetch;

interface CapturedRequest {
  url: string;
  init: RequestInit;
}

function installFetchMock(
  handler: (req: CapturedRequest, index: number) => Response | Promise<Response>,
): CapturedRequest[] {
  const captured: CapturedRequest[] = [];
  let callIndex = 0;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const request: CapturedRequest = { url, init: init ?? {} };
    captured.push(request);
    const response = await handler(request, callIndex);
    callIndex++;
    return response;
  }) as typeof fetch;

  return captured;
}

const baseMailOptions: MailOptions = {
  from: "sender@example.com",
  to: "recipient@example.com",
  subject: "Test subject",
  html: "<p>HTML body</p>",
  text: "Plain body",
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("PlunkTransport", () => {
  test("send() sets Bearer auth and correct endpoint", async () => {
    const captured = installFetchMock(() =>
      Response.json({ success: true, emails: [{ id: "plunk-1", email: "recipient@example.com" }] }),
    );

    const transport = new PlunkTransport({ apiKey: "sk_test_key" });
    await transport.send(baseMailOptions);

    expect(captured[0]?.url).toBe("https://api.useplunk.com/v1/send");
    const headers = captured[0]?.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer sk_test_key");
  });

  test("send() prefers html over text for body field", async () => {
    const captured = installFetchMock(() =>
      Response.json({ success: true, emails: [{ id: "plunk-2" }] }),
    );

    const transport = new PlunkTransport({ apiKey: "sk_test_key" });
    await transport.send(baseMailOptions);

    const body = JSON.parse(String(captured[0]?.init.body));
    expect(body.body).toBe("<p>HTML body</p>");
    expect(body.subscribed).toBe(false);
  });

  test("send() fires one request per recipient", async () => {
    const captured = installFetchMock((_req, index) =>
      Response.json({
        success: true,
        emails: [{ id: `plunk-${index}`, email: index === 0 ? "one@example.com" : "two@example.com" }],
      }),
    );

    const transport = new PlunkTransport({ apiKey: "sk_test_key" });
    const result = await transport.send({
      ...baseMailOptions,
      to: ["one@example.com", "two@example.com"],
    });

    expect(captured.length).toBe(2);
    expect(result.accepted).toEqual(["one@example.com", "two@example.com"]);
    expect(result.messageId).toBe("plunk-0,plunk-1");
  });

  test("send() throws PlunkError on 4xx", async () => {
    installFetchMock(() => Response.json({ message: "Unauthorized", success: false }, { status: 401 }));

    const transport = new PlunkTransport({ apiKey: "sk_bad_key" });

    await expect(transport.send(baseMailOptions)).rejects.toMatchObject({
      name: "PlunkError",
      statusCode: 401,
    });
    await expect(transport.send(baseMailOptions)).rejects.toBeInstanceOf(PlunkError);
  });

  test("verify() returns ok true without network call", async () => {
    let fetchCalled = false;
    globalThis.fetch = (async () => {
      fetchCalled = true;
      return Response.json({});
    }) as typeof fetch;

    const transport = new PlunkTransport({ apiKey: "sk_test_key" });
    const result = await transport.verify();

    expect(fetchCalled).toBe(false);
    expect(result).toEqual({
      ok: true,
      provider: "plunk",
      message: "no verify endpoint; key not validated",
    });
  });
});
