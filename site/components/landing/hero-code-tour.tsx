/**
 * Hero code tour — server-highlighted channel snippets for the homepage.
 * Four tabs mirror the product channels (email · SMS · WhatsApp · push) and
 * the hero signal map. Snippets match channels docs quick starts.
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
    id: "push",
    title: "push.ts",
    footer: "Web Push (VAPID) or FCM — same createPushSender shape.",
    code: `import { createPushSender } from "sently/push";
import { WebPushTransport } from "sently/transports/webpush";

const push = createPushSender({
  transport: new WebPushTransport({
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY!,
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY!,
    subject: "mailto:you@example.com",
  }),
});

await push.send({
  subscription: {
    endpoint: "https://fcm.googleapis.com/fcm/send/example",
    keys: { p256dh: "browser-public-key", auth: "browser-auth-secret" },
  },
  title: "Report ready",
  body: "Your weekly report is ready to view.",
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
