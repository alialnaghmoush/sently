import { afterEach, describe, expect, test } from "bun:test";
import type { MailOptions } from "../../src/core/types.js";
import { LoopsError, LoopsTransport } from "../../src/transports/loops.js";

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
  from: "noreply@example.com",
  to: "user@example.com",
  subject: "Ignored by Loops",
  html: "<p>Also ignored</p>",
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("LoopsTransport", () => {
  test("send() uses transactional endpoint with Bearer auth", async () => {
    const captured = installFetchMock(() =>
      Response.json({ success: true, id: "loops-1" }),
    );

    const transport = new LoopsTransport({ apiKey: "loops_test_key" });
    await transport.send({
      ...baseMailOptions,
      headers: { "x-loops-transactional-id": "cltemplate123" },
      data: { firstName: "Ada" },
    });

    expect(captured[0]?.url).toBe("https://app.loops.so/api/v1/transactional");
    const headers = captured[0]?.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer loops_test_key");

    const body = JSON.parse(String(captured[0]?.init.body));
    expect(body).toEqual({
      transactionalId: "cltemplate123",
      email: "user@example.com",
      dataVariables: { firstName: "Ada" },
    });
  });

  test("send() uses defaultTransactionalId from config", async () => {
    const captured = installFetchMock(() =>
      Response.json({ success: true, id: "loops-2" }),
    );

    const transport = new LoopsTransport({
      apiKey: "loops_test_key",
      defaultTransactionalId: "cldefault456",
    });
    await transport.send({
      ...baseMailOptions,
      data: { code: "1234" },
    });

    const body = JSON.parse(String(captured[0]?.init.body));
    expect(body.transactionalId).toBe("cldefault456");
    expect(body.dataVariables).toEqual({ code: "1234" });
  });

  test("send() throws LoopsError when transactionalId is missing", async () => {
    const transport = new LoopsTransport({ apiKey: "loops_test_key" });

    await expect(transport.send(baseMailOptions)).rejects.toMatchObject({
      name: "LoopsError",
      statusCode: 400,
      message: expect.stringContaining("transactional template ID"),
    });
    await expect(transport.send(baseMailOptions)).rejects.toBeInstanceOf(LoopsError);
  });

  test("send() throws LoopsError on 4xx API response", async () => {
    installFetchMock(() =>
      Response.json({ success: false, message: "Unauthorized" }, { status: 401 }),
    );

    const transport = new LoopsTransport({ apiKey: "loops_bad_key" });

    await expect(
      transport.send({
        ...baseMailOptions,
        headers: { "x-loops-transactional-id": "cltemplate123" },
      }),
    ).rejects.toBeInstanceOf(LoopsError);
  });

  test("verify() returns ok true without network call", async () => {
    let fetchCalled = false;
    globalThis.fetch = (async () => {
      fetchCalled = true;
      return Response.json({});
    }) as typeof fetch;

    const transport = new LoopsTransport({ apiKey: "loops_test_key" });
    const result = await transport.verify();

    expect(fetchCalled).toBe(false);
    expect(result).toEqual({
      ok: true,
      provider: "loops",
      message: "key not validated (no verify endpoint)",
    });
  });
});
