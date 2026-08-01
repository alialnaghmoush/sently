import { afterEach, describe, expect, test } from "bun:test";
import { TaqnyatMailError, TaqnyatMailTransport } from "../../src/transports/taqnyat-mail.js";

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

describe("TaqnyatMailTransport", () => {
  test("send() posts form body to mailSend.php", async () => {
    const captured = installFetchMock(() =>
      Response.json(
        {
          status: 1,
          ResponseStatus: "success",
          Data: {
            msgId: 202,
            result: 1,
            MessageEn: "sent successfully",
            price: "0",
          },
          Error: null,
        },
        { status: 201 },
      ),
    );

    const transport = new TaqnyatMailTransport({
      bearerToken: "tok",
      campaignName: "transactional",
    });

    const result = await transport.send({
      from: "noreply@example.com",
      to: "a@example.com",
      subject: "Hi",
      html: "<b>test</b>",
    });

    expect(result.messageId).toBe("202");
    expect(result.provider).toBe("taqnyat-mail");
    expect(result.accepted).toEqual(["a@example.com"]);

    const { url, init } = captured[0] as CapturedRequest;
    expect(url).toBe("https://api.taqnyat.sa/mailSend.php");
    expect(init.headers).toEqual({
      Authorization: "Bearer tok",
      "Content-Type": "application/x-www-form-urlencoded",
    });
    const body = String(init.body);
    expect(body).toContain("bearerTokens=tok");
    expect(body).toContain("campaignName=transactional");
    expect(body).toContain("subject=Hi");
    // Docs use plain sender email, not MIME display-name form.
    expect(body).toContain("from=noreply%40example.com");
    expect(body).not.toContain("from=%22");
    expect(body).toContain("to=a%40example.com");
    expect(body).toContain("msg=%3Cb%3Etest%3C%2Fb%3E");
  });

  test("send() throws on ResponseStatus fail", async () => {
    installFetchMock(() =>
      Response.json(
        {
          status: 1,
          ResponseStatus: "fail",
          Data: null,
          Error: { ErrorCode: 104, MessageEn: "Invalid Bearer Tokens" },
        },
        { status: 200 },
      ),
    );

    const transport = new TaqnyatMailTransport({
      bearerToken: "bad",
      campaignName: "x",
    });

    await expect(
      transport.send({
        from: "a@example.com",
        to: "b@example.com",
        subject: "Hi",
        text: "hello",
      }),
    ).rejects.toMatchObject({
      name: "TaqnyatMailError",
      message: "Invalid Bearer Tokens",
      statusCode: 104,
    });
    await expect(
      transport.send({
        from: "a@example.com",
        to: "b@example.com",
        subject: "Hi",
        text: "hello",
      }),
    ).rejects.toBeInstanceOf(TaqnyatMailError);
  });
});
