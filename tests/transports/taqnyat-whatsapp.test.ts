import { afterEach, describe, expect, test } from "bun:test";
import {
  TaqnyatWhatsAppError,
  TaqnyatWhatsAppTransport,
} from "../../src/transports/taqnyat-whatsapp.js";

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

describe("TaqnyatWhatsAppTransport", () => {
  test("send() posts template body and maps message_id", async () => {
    const captured = installFetchMock(() =>
      Response.json({
        type: "whatsapp",
        statuses: [{ message_id: "wamid.abc", recipient: "+966501234567" }],
      }),
    );

    const transport = new TaqnyatWhatsAppTransport({ bearerToken: "tok" });
    const result = await transport.send({
      to: "+966501234567",
      template: { name: "otp", language: "en" },
    });

    expect(result).toMatchObject({
      messageId: "wamid.abc",
      provider: "taqnyat-whatsapp",
      status: "accepted",
    });

    const { url, init } = captured[0] as CapturedRequest;
    expect(url).toBe("https://api.taqnyat.sa/wa/v2/messages/");
    expect(JSON.parse(String(init.body))).toEqual({
      to: "966501234567",
      type: "template",
      template: { name: "otp", language: { code: "en" } },
    });
  });

  test("send() posts session text body", async () => {
    const captured = installFetchMock(() =>
      Response.json({
        type: "text",
        statuses: [{ message_id: "wamid.txt", recipient: "966501234567" }],
      }),
    );

    const transport = new TaqnyatWhatsAppTransport({ bearerToken: "tok" });
    await transport.send({ to: "966501234567", text: "Hello" });

    expect(JSON.parse(String((captured[0] as CapturedRequest).init.body))).toEqual({
      to: "966501234567",
      type: "text",
      text: { body: "Hello" },
    });
  });

  test("send() accepts queued statuses PENDING without message_id", async () => {
    installFetchMock(() => Response.json({ type: "template", statuses: "PENDING" }));

    const transport = new TaqnyatWhatsAppTransport({ bearerToken: "tok" });
    const result = await transport.send({
      to: "+966501234567",
      template: { name: "demo", language: "ar" },
    });

    expect(result).toMatchObject({
      status: "accepted",
      response: "PENDING",
      provider: "taqnyat-whatsapp",
      messageId: "",
    });
  });

  test("send() throws on documented error shape", async () => {
    installFetchMock(() =>
      Response.json({ message: "100", reason: "The 'to' parameter is required" }, { status: 200 }),
    );

    const transport = new TaqnyatWhatsAppTransport({ bearerToken: "tok" });
    await expect(transport.send({ to: "+9665", text: "x" })).rejects.toMatchObject({
      name: "TaqnyatWhatsAppError",
      message: "The 'to' parameter is required",
      statusCode: 100,
    });
    await expect(transport.send({ to: "+9665", text: "x" })).rejects.toBeInstanceOf(
      TaqnyatWhatsAppError,
    );
  });

  test("listTemplates() maps waba_templates rows", async () => {
    installFetchMock(() =>
      Response.json({
        waba_templates: [
          {
            id: "t1",
            name: "demotest1_testr11",
            language: "ar",
            status: "approved",
            category: "MARKETING",
          },
        ],
      }),
    );

    const transport = new TaqnyatWhatsAppTransport({ bearerToken: "tok" });
    await expect(transport.listTemplates()).resolves.toEqual([
      {
        id: "t1",
        name: "demotest1_testr11",
        language: "ar",
        status: "approved",
        category: "MARKETING",
      },
    ]);
  });

  test("createTemplate() posts template body", async () => {
    const captured = installFetchMock(() =>
      Response.json({ id: "15", category: "UTILITY", statuses: "PENDING" }),
    );

    const transport = new TaqnyatWhatsAppTransport({ bearerToken: "tok" });
    const result = await transport.createTemplate({
      name: "sently_test",
      language: "ar",
      category: "UTILITY",
      components: [{ type: "BODY", text: "hi" }],
    });

    expect(result).toMatchObject({ id: "15", status: "PENDING", provider: "taqnyat-whatsapp" });
    expect(JSON.parse(String((captured[0] as CapturedRequest).init.body))).toMatchObject({
      name: "sently_test",
      language: "ar",
      allow_category_change: true,
      category: "UTILITY",
    });
  });

  test("optIn() POSTs normalized numbers", async () => {
    const captured = installFetchMock(() =>
      Response.json({ type: "Opt-In", statuses: [{ status: "success", state: "enable" }] }),
    );

    const transport = new TaqnyatWhatsAppTransport({ bearerToken: "tok" });
    await expect(transport.optIn("+966501234567")).resolves.toMatchObject({
      ok: true,
      numbers: ["966501234567"],
    });

    expect((captured[0] as CapturedRequest).url).toBe(
      "https://api.taqnyat.sa/wa/v1/provision/optin/",
    );
    expect((captured[0] as CapturedRequest).init.method).toBe("POST");
  });

  test("optOut() DELETEs numbers", async () => {
    const captured = installFetchMock(() =>
      Response.json({ type: "Opt-Out", statuses: [{ status: "success", state: "disable" }] }),
    );

    const transport = new TaqnyatWhatsAppTransport({ bearerToken: "tok" });
    await transport.optOut(["966501234567"]);
    expect((captured[0] as CapturedRequest).init.method).toBe("DELETE");
  });

  test("sendWithFailover() nests sms and mail branches", async () => {
    const captured = installFetchMock(() =>
      Response.json({
        type: "template",
        statuses: [{ message_id: "wamid.x", recipient: "966501234567" }],
      }),
    );

    const transport = new TaqnyatWhatsAppTransport({ bearerToken: "tok" });
    await transport.sendWithFailover(
      { to: "+966501234567", template: { name: "welcome", language: "ar" } },
      {
        sms: { sender: "Taqnyat.sa", campaign: "sently", body: "fallback sms" },
        mail: {
          from: "hi@example.com",
          to: "user@example.com",
          campaign: "sently",
          subject: "fallback",
          msg: "hello",
        },
      },
    );

    expect(JSON.parse(String((captured[0] as CapturedRequest).init.body))).toMatchObject({
      type: "template",
      sms: { sender: "Taqnyat.sa", campaign: "sently", body: "fallback sms" },
      mail: {
        from: "hi@example.com",
        to: "user@example.com",
        campaign: "sently",
        subject: "fallback",
        msg: "hello",
      },
    });
  });
});
