/**
 * Live Taqnyat SMS / Mail / WhatsApp checks — skipped unless explicitly opted in.
 *
 * Add to repo-root `.env` (gitignored; Bun loads it automatically):
 *
 * ```env
 * TAQNYAT_LIVE=1
 * TAQNYAT_TOKEN=...
 * TAQNYAT_SENDER=Taqnyat.sa
 * TAQNYAT_TO=+9665xxxxxxxx
 * TAQNYAT_MAIL_TOKEN=...
 * TAQNYAT_MAIL_FROM=you@example.com
 * TAQNYAT_MAIL_TO=you@example.com
 * TAQNYAT_MAIL_CAMPAIGN=sently
 * TAQNYAT_WHATSAPP_TOKEN=...
 * TAQNYAT_WHATSAPP_TO=+9665xxxxxxxx
 * TAQNYAT_WHATSAPP_TEMPLATE=demotest1_testr11
 * TAQNYAT_WHATSAPP_TEMPLATE_LANG=ar
 * ```
 *
 * Free preflight (balance / approved template) runs inside each paid send test
 * and refuses the send if readiness checks fail.
 *
 * Run: `TAQNYAT_LIVE=1 bun run test:live`
 * (`bun run verify` ignores `*.live.test.ts` and clears LIVE flags.)
 */
import { describe, expect, test } from "bun:test";
import { createMailer } from "../../src/mailer.js";
import { createSmsSender } from "../../src/sms.js";
import { TaqnyatMailTransport } from "../../src/transports/taqnyat-mail.js";
import { TaqnyatSmsTransport } from "../../src/transports/taqnyat-sms.js";
import { TaqnyatWhatsAppTransport } from "../../src/transports/taqnyat-whatsapp.js";
import { createWhatsAppSender } from "../../src/whatsapp.js";

const live = process.env.TAQNYAT_LIVE === "1";

const smsToken = process.env.TAQNYAT_TOKEN?.trim();
const smsSender = process.env.TAQNYAT_SENDER?.trim();
const smsTo = process.env.TAQNYAT_TO?.trim();

const mailToken = process.env.TAQNYAT_MAIL_TOKEN?.trim() || smsToken;
const mailFrom = process.env.TAQNYAT_MAIL_FROM?.trim();
const mailTo = process.env.TAQNYAT_MAIL_TO?.trim();
const mailCampaign = process.env.TAQNYAT_MAIL_CAMPAIGN?.trim() || "sently";

const waToken = process.env.TAQNYAT_WHATSAPP_TOKEN?.trim() || smsToken;
const waTo = process.env.TAQNYAT_WHATSAPP_TO?.trim();
const waTemplate = process.env.TAQNYAT_WHATSAPP_TEMPLATE?.trim();
const waLang = process.env.TAQNYAT_WHATSAPP_TEMPLATE_LANG?.trim();

const hasSmsCreds = live && Boolean(smsToken && smsSender);
const canSmsSend = hasSmsCreds && Boolean(smsTo);
const hasMailCreds = live && Boolean(mailToken && mailCampaign);
const canMailSend = hasMailCreds && Boolean(mailFrom && mailTo);
const hasWaCreds = live && Boolean(waToken);
const canWaSend = hasWaCreds && Boolean(waTo && waTemplate && waLang);

if (!live) {
  console.log("skip: Taqnyat live tests (set TAQNYAT_LIVE=1 with credentials)");
}

interface BalancePayload {
  statusCode?: number;
  accountStatus?: string;
  balance?: string;
  currency?: string;
  message?: string;
}

interface SenderRow {
  senderName?: string;
  status?: string;
}

interface TemplateRow {
  name?: string;
  language?: string;
  status?: string;
}

async function fetchBalance(bearerToken: string): Promise<BalancePayload> {
  const response = await fetch(
    `https://api.taqnyat.sa/account/balance?bearerTokens=${encodeURIComponent(bearerToken)}`,
  );
  return (await response.json()) as BalancePayload;
}

async function fetchSenders(bearerToken: string): Promise<SenderRow[]> {
  const response = await fetch(
    `https://api.taqnyat.sa/v1/messages/senders?bearerTokens=${encodeURIComponent(bearerToken)}`,
  );
  const payload = (await response.json()) as { senders?: SenderRow[] };
  return Array.isArray(payload.senders) ? payload.senders : [];
}

async function fetchTemplates(bearerToken: string): Promise<TemplateRow[]> {
  const response = await fetch("https://api.taqnyat.sa/wa/v2/templates/?limit=5000", {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      Accept: "application/json",
    },
  });
  const text = await response.text();
  let payload: { waba_templates?: TemplateRow[]; message?: string; reason?: string };
  try {
    payload = JSON.parse(text) as {
      waba_templates?: TemplateRow[];
      message?: string;
      reason?: string;
    };
  } catch {
    throw new Error(
      `Taqnyat templates response was not JSON (HTTP ${response.status}, ${text.length} bytes)`,
    );
  }
  if (!Array.isArray(payload.waba_templates)) {
    throw new Error(
      `Taqnyat templates missing waba_templates (HTTP ${response.status}): ${payload.reason ?? payload.message ?? text.slice(0, 200)}`,
    );
  }
  return payload.waba_templates;
}

function balanceOk(payload: BalancePayload): boolean {
  const value = Number(payload.balance);
  return payload.statusCode === 200 && Number.isFinite(value) && value > 0;
}

async function preflightSms(): Promise<void> {
  const balance = await fetchBalance(smsToken!);
  console.log("[taqnyat-sms preflight] balance", balance);
  expect(balance.statusCode).toBe(200);
  expect(balanceOk(balance)).toBe(true);

  const senders = await fetchSenders(smsToken!);
  console.log("[taqnyat-sms preflight] senders count", senders.length);
  if (senders.length > 0) {
    const match = senders.find(
      (row) =>
        row.senderName === smsSender &&
        (row.status === undefined || row.status.toLowerCase() === "active"),
    );
    expect(match).toBeDefined();
  } else {
    // Trial accounts often return an empty list while portal sender Taqnyat.sa works.
    console.log(
      `[taqnyat-sms preflight] senders empty — continuing with configured sender ${smsSender}`,
    );
  }
}

async function preflightMail(): Promise<void> {
  const balance = await fetchBalance(mailToken!);
  console.log("[taqnyat-mail preflight] balance", balance);
  expect(balance.statusCode).toBe(200);
  expect(balanceOk(balance)).toBe(true);
}

async function preflightWhatsApp(): Promise<void> {
  console.log("[taqnyat-whatsapp preflight] looking for", {
    name: waTemplate,
    language: waLang,
  });
  const templates = await fetchTemplates(waToken!);
  console.log("[taqnyat-whatsapp preflight] templates loaded", templates.length);

  const match = templates.find(
    (row) =>
      row.name === waTemplate &&
      (row.language === waLang ||
        row.language?.replace("-", "_") === waLang?.replace("-", "_")),
  );
  console.log(
    "[taqnyat-whatsapp preflight] template",
    match
      ? { name: match.name, language: match.language, status: match.status }
      : "not found",
  );
  expect(match).toBeDefined();
  expect(match?.status?.toLowerCase()).toBe("approved");
}

describe("Taqnyat live API — SMS", () => {
  test.skipIf(!hasSmsCreds)("verify() accepts credentials", async () => {
    const transport = new TaqnyatSmsTransport({
      bearerToken: smsToken!,
      sender: smsSender!,
    });
    const result = await transport.verify();
    expect(result.ok).toBe(true);
    expect(result.provider).toBe("taqnyat-sms");
  });

  test.skipIf(!canSmsSend)("preflight then send() delivers a real SMS", async () => {
    await preflightSms();

    const transport = new TaqnyatSmsTransport({
      bearerToken: smsToken!,
      sender: smsSender!,
    });
    const sender = createSmsSender({ transport });
    const body = `sently Taqnyat SMS live ${new Date().toISOString()}`;

    const result = await sender.send({ to: smsTo!, body });
    console.log("[taqnyat-sms send]", result);

    expect(result.messageId.length).toBeGreaterThan(0);
    expect(result.provider).toBe("taqnyat-sms");
    expect(result.status).toBe("accepted");
  });
});

describe("Taqnyat live API — Mail", () => {
  test.skipIf(!hasMailCreds)("verify() accepts credentials", async () => {
    const transport = new TaqnyatMailTransport({
      bearerToken: mailToken!,
      campaignName: mailCampaign,
    });
    const result = await transport.verify();
    expect(result.ok).toBe(true);
    expect(result.provider).toBe("taqnyat-mail");
  });

  test.skipIf(!canMailSend)("preflight then send() delivers a real email", async () => {
    await preflightMail();

    const transport = new TaqnyatMailTransport({
      bearerToken: mailToken!,
      campaignName: mailCampaign,
    });
    const mailer = await createMailer({ transport });
    const stamp = new Date().toISOString();

    try {
      const result = await mailer.send({
        from: mailFrom!,
        to: mailTo!,
        subject: `sently Taqnyat mail live ${stamp}`,
        text: "Sent by tests/integration/taqnyat.live.test.ts",
        html: "<p>Sent by <code>tests/integration/taqnyat.live.test.ts</code></p>",
      });
      console.log("[taqnyat-mail send]", result);

      expect(result.messageId.length).toBeGreaterThan(0);
      expect(result.accepted).toContain(mailTo!);
      expect(result.provider).toBe("taqnyat-mail");
    } catch (error) {
      // Error 14 = sender email not accepted (portal Sender Approval / verified from).
      console.error("[taqnyat-mail send] FAILED", error);
      throw error;
    }
  });
});

describe("Taqnyat live API — WhatsApp", () => {
  test.skipIf(!hasWaCreds)("verify() accepts credentials", async () => {
    const transport = new TaqnyatWhatsAppTransport({ bearerToken: waToken! });
    const result = await transport.verify();
    expect(result.ok).toBe(true);
    expect(result.provider).toBe("taqnyat-whatsapp");
  });

  test.skipIf(!canWaSend)("preflight then send() delivers an approved template", async () => {
    await preflightWhatsApp();

    const transport = new TaqnyatWhatsAppTransport({ bearerToken: waToken! });
    const sender = createWhatsAppSender({ transport });

    const result = await sender.send({
      to: waTo!,
      template: { name: waTemplate!, language: waLang! },
    });
    console.log("[taqnyat-whatsapp send]", result);

    expect(result.provider).toBe("taqnyat-whatsapp");
    expect(result.status).toBe("accepted");
    expect(result.response.length).toBeGreaterThan(0);
    // Sandbox/queue responses may be `template` / `PENDING` without message_id yet.
    expect(result.messageId.length > 0 || /^(template|text|PENDING|Message sent)$/i.test(result.response)).toBe(
      true,
    );
  });
});
