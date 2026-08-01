/**
 * Hero code tour — server-highlighted channel snippets for the homepage.
 * Snippets mirror get-started quick starts + fallback transport docs.
 */

import { highlight } from "fumadocs-core/highlight";
import type { ReactNode } from "react";
import { TabbedCodePanel, type CodeTourTab } from "@/components/landing/tabbed-code-panel";

type Snippet = {
  readonly id: string;
  readonly title: string;
  readonly footer: string;
  readonly code: string;
};

const SNIPPETS: ReadonlyArray<Snippet> = [
  {
    id: "email",
    title: "email.ts",
    footer: "Swap the transport — app code stays on sently.",
    code: `import { createMailer } from "sently/mailer";
import { ResendTransport } from "sently/transports/resend";

const mailer = await createMailer({
  transport: new ResendTransport({ apiKey: process.env.RESEND_API_KEY! }),
});

await mailer.send({
  from: "hello@example.com",
  to: "you@example.com",
  subject: "Welcome",
  html: "<p>Sent with sently.</p>",
});`,
  },
  {
    id: "sms",
    title: "sms.ts",
    footer: "Same sender contract — Twilio, Taqnyat, or Msegat.",
    code: `import { createSmsSender } from "sently/sms";
import { TwilioSmsTransport } from "sently/transports/twilio-sms";

const sms = createSmsSender({
  transport: new TwilioSmsTransport({
    accountSid: process.env.TWILIO_ACCOUNT_SID!,
    authToken: process.env.TWILIO_AUTH_TOKEN!,
    from: "+15557654321",
  }),
});

await sms.send({
  to: "+15551234567",
  body: "Your code is ready.",
});`,
  },
  {
    id: "whatsapp",
    title: "whatsapp.ts",
    footer: "Templates outside the customer-service window; text inside it.",
    code: `import { createWhatsAppSender } from "sently/whatsapp";
import { WhatsAppCloudTransport } from "sently/transports/whatsapp-cloud";

const whatsapp = createWhatsAppSender({
  transport: new WhatsAppCloudTransport({
    accessToken: process.env.WHATSAPP_TOKEN!,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!,
  }),
});

await whatsapp.send({
  to: "15551234567",
  template: { name: "welcome", language: "en_US" },
});`,
  },
  {
    id: "fallback",
    title: "fallback.ts",
    footer: "Resend first — SES if it fails. Same createMailer call site.",
    code: `import { createMailer } from "sently/mailer";
import { ResendTransport } from "sently/transports/resend";
import { SESTransport } from "sently/transports/ses";
import { FallbackTransport } from "sently/transports/fallback";

const transport = new FallbackTransport(
  [
    new ResendTransport({ apiKey: process.env.RESEND_API_KEY! }),
    new SESTransport({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      region: "us-east-1",
    }),
  ],
  { cooldownMs: 300_000 },
);

const mailer = await createMailer({ transport });

await mailer.send({
  from: "hello@example.com",
  to: "you@example.com",
  subject: "Welcome",
  text: "Primary fails over to SES.",
});`,
  },
];

/**
 * Pre-highlights channel snippets and mounts the tabbed hero panel.
 */
export async function HeroCodeTour(): Promise<ReactNode> {
  const tabs: CodeTourTab[] = await Promise.all(
    SNIPPETS.map(async (snippet) => ({
      id: snippet.id,
      title: snippet.title,
      footer: snippet.footer,
      code: await highlight(snippet.code, {
        lang: "ts",
        themes: { light: "github-light", dark: "github-dark" },
        defaultColor: false,
      }),
    })),
  );

  return <TabbedCodePanel tabs={tabs} />;
}
