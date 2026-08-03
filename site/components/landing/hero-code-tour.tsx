/**
 * Hero code tour — server-highlighted channel snippets for the homepage.
 * Eight tabs span the product channels (email · SMS · WhatsApp · push) with
 * Supported and live-verified transports, mirroring the hero signal map.
 * Snippets match channels and transports docs quick starts.
 */

import { highlight } from "fumadocs-core/highlight";
import type { ReactNode } from "react";
import { TabbedCodePanel, type CodeTourTab } from "@/components/landing/tabbed-code-panel";

type Snippet = {
  readonly id: string;
  readonly title: string;
  readonly footer: string;
  /** Transport class the snippet constructs — shown on the route strip. */
  readonly transport: string;
  readonly code: string;
};

const SNIPPETS: ReadonlyArray<Snippet> = [
  {
    id: "email",
    title: "email.ts",
    footer: "Swap the transport — app code stays on sently.",
    transport: "ResendTransport",
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
    id: "ses",
    title: "ses.ts",
    footer: "AWS SES v2 API — region defaults to us-east-1.",
    transport: "SESTransport",
    code: `import { createMailer } from "sently/mailer";
import { SESTransport } from "sently/transports/ses";

const mailer = await createMailer({
  transport: new SESTransport({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }),
});

await mailer.send({
  from: "hello@example.com",
  to: "you@example.com",
  subject: "Welcome",
  text: "Sent with sently.",
});`,
  },
  {
    id: "smtp",
    title: "smtp.ts",
    footer: "Host and port in — createSMTPMailer picks the runtime adapter.",
    transport: "SMTPTransport",
    code: `import { createSMTPMailer } from "sently/smtp";

const mailer = await createSMTPMailer({
  host: "smtp.example.com",
  port: 587,
  auth: { user: "you@example.com", pass: process.env.SMTP_PASSWORD! },
});

await mailer.send({
  from: "hello@example.com",
  to: "you@example.com",
  subject: "Welcome",
  text: "Sent with sently.",
});`,
  },
  {
    id: "sms",
    title: "sms.ts",
    footer: "Same sender contract — Twilio, Taqnyat, or Msegat.",
    transport: "TwilioSmsTransport",
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
    id: "taqnyat",
    title: "taqnyat.ts",
    footer: "Live-verified SMS — Taqnyat also carries email and WhatsApp.",
    transport: "TaqnyatSmsTransport",
    code: `import { createSmsSender } from "sently/sms";
import { TaqnyatSmsTransport } from "sently/transports/taqnyat-sms";

const sms = createSmsSender({
  transport: new TaqnyatSmsTransport({
    bearerToken: process.env.TAQNYAT_TOKEN!,
    sender: "Taqnyat.sa",
  }),
});

await sms.send({
  to: "+9665xxxxxxxx",
  body: "Hello from sently",
});`,
  },
  {
    id: "whatsapp",
    title: "whatsapp.ts",
    footer: "Templates outside the customer-service window; text inside it.",
    transport: "WhatsAppCloudTransport",
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
    transport: "WebPushTransport",
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
  {
    id: "fcm",
    title: "fcm.ts",
    footer: "Service-account JWT, no Google SDK — pass token, not subscription.",
    transport: "FcmTransport",
    code: `import { createPushSender } from "sently/push";
import { FcmTransport } from "sently/transports/fcm";

const push = createPushSender({
  transport: new FcmTransport({
    projectId: process.env.FCM_PROJECT_ID!,
    clientEmail: process.env.FCM_CLIENT_EMAIL!,
    privateKey: process.env.FCM_PRIVATE_KEY!,
  }),
});

await push.send({
  token: deviceRegistrationToken,
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
      transport: snippet.transport,
      code: await highlight(snippet.code, {
        lang: "ts",
        themes: { light: "github-light", dark: "github-dark" },
        defaultColor: false,
      }),
    })),
  );

  return <TabbedCodePanel tabs={tabs} />;
}
