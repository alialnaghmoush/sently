import { afterEach, describe, expect, test } from "bun:test";
import type { MailOptions } from "../../src/core/types.js";
import { SNDR_TEMPLATE_ID_HEADER, SndrError, SndrTransport } from "../../src/transports/sndr.js";

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
  from: "hello@yourdomain.com",
  to: "customer@example.com",
  subject: "Welcome aboard",
  html: "<p>Thanks for joining us.</p>",
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("SndrTransport", () => {
  test("send() posts to /v1/send with Bearer auth and JSON body", async () => {
    const captured = installFetchMock(() =>
      Response.json({ id: "em_1jfk2mq8s4r9wc", status: "queued" }, { status: 200 }),
    );

    const transport = new SndrTransport({ apiKey: "sndr_test_key" });
    const result = await transport.send(baseMailOptions);

    expect(captured).toHaveLength(1);
    expect(captured[0]?.url).toBe("https://api.sndr.sh/v1/send");
    expect(captured[0]?.init.method).toBe("POST");
    expect(captured[0]?.init.headers).toEqual({
      Authorization: "Bearer sndr_test_key",
      "Content-Type": "application/json",
      Accept: "application/json",
    });

    const body = JSON.parse(String(captured[0]?.init.body));
    expect(body).toEqual({
      from: "hello@yourdomain.com",
      to: ["customer@example.com"],
      subject: "Welcome aboard",
      html: "<p>Thanks for joining us.</p>",
    });

    expect(result).toEqual({
      messageId: "em_1jfk2mq8s4r9wc",
      accepted: ["customer@example.com"],
      rejected: [],
      response: "queued",
      envelope: { from: "hello@yourdomain.com", to: ["customer@example.com"] },
    });
  });

  test("send() maps cc/bcc/replyTo and Idempotency-Key", async () => {
    const captured = installFetchMock(() =>
      Response.json({ id: "em_abc", status: "queued" }, { status: 200 }),
    );

    const transport = new SndrTransport({ apiKey: "sndr_test_key" });
    await transport.send({
      ...baseMailOptions,
      from: "SNDR <hello@yourdomain.com>",
      cc: "cc@example.com",
      bcc: ["bcc@example.com"],
      replyTo: "Reply <support@yourdomain.com>",
      text: "plain",
      idempotencyKey: "order-42",
    });

    const headers = captured[0]?.init.headers as Record<string, string>;
    expect(headers["Idempotency-Key"]).toBe("order-42");

    const body = JSON.parse(String(captured[0]?.init.body));
    expect(body.from).toBe("SNDR <hello@yourdomain.com>");
    expect(body.cc).toEqual(["cc@example.com"]);
    expect(body.bcc).toEqual(["bcc@example.com"]);
    expect(body.reply_to).toBe("support@yourdomain.com");
    expect(body.text).toBe("plain");
  });

  test("send() supports template_id via header and variables from data", async () => {
    const captured = installFetchMock(() =>
      Response.json({ id: "em_tpl", status: "queued" }, { status: 200 }),
    );

    const transport = new SndrTransport({ apiKey: "sndr_test_key" });
    await transport.send({
      ...baseMailOptions,
      headers: { [SNDR_TEMPLATE_ID_HEADER]: "tpl_welcome", "X-Custom": "1" },
      data: { name: "Ada", code: 42 },
    });

    const body = JSON.parse(String(captured[0]?.init.body));
    expect(body.template_id).toBe("tpl_welcome");
    expect(body.variables).toEqual({ name: "Ada", code: 42 });
    expect(body.headers).toEqual({ "X-Custom": "1" });
    expect(body.headers[SNDR_TEMPLATE_ID_HEADER]).toBeUndefined();
  });

  test("send() throws SndrError with SNDR error envelope", async () => {
    installFetchMock(() =>
      Response.json(
        {
          error: {
            code: "validation_error",
            message: "from domain is not verified",
            request_id: "req_123",
          },
        },
        { status: 422 },
      ),
    );

    const transport = new SndrTransport({ apiKey: "sndr_test_key" });
    await expect(transport.send(baseMailOptions)).rejects.toMatchObject({
      name: "SndrError",
      statusCode: 422,
      message: "from domain is not verified",
    });
    await expect(transport.send(baseMailOptions)).rejects.toBeInstanceOf(SndrError);
  });

  test("verify() lists domains", async () => {
    const captured = installFetchMock(() => Response.json({ data: [] }));

    const transport = new SndrTransport({ apiKey: "sndr_test_key" });
    expect(await transport.verify()).toEqual({
      ok: true,
      provider: "sndr",
      message: "API key is valid",
    });
    expect(captured[0]?.url).toBe("https://api.sndr.sh/v1/domains");
    expect(captured[0]?.init.method ?? "GET").toBe("GET");
  });

  test("verify() returns ok:false on auth failure", async () => {
    installFetchMock(() => Response.json({ error: { message: "unauthorized" } }, { status: 401 }));

    const transport = new SndrTransport({ apiKey: "bad" });
    expect(await transport.verify()).toEqual({
      ok: false,
      provider: "sndr",
      message: "unauthorized",
    });
  });
});
